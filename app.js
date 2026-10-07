/* 医学生实训笔记助手 —— 主逻辑（本地优先 PWA） */
(function () {
  'use strict';
  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  let toastTimer = null;

  // ---------------- 工具函数 ----------------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }
  // 药物名归一化：去括号内容、空格、连字符，转小写，用于模糊匹配
  function normDrug(s) { return String(s || '').toLowerCase().replace(/[（()）\s\-·]/g, ''); }
  function drugMatch(dbName, q) {
    const a = normDrug(dbName), b = normDrug(q);
    return !!a && !!b && (a.includes(b) || b.includes(a));
  }
  function today() { return new Date().toISOString().slice(0, 10); }
  function uid(p) { return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }
  function compressImage(file, max) {
    max = max || 1024;
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const sc = Math.min(1, max / Math.max(img.width, img.height));
          const w = Math.round(img.width * sc), h = Math.round(img.height * sc);
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          res(c.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = rej; img.src = fr.result;
      };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }
  async function fileToDataURL(file) { return compressImage(file, 1280); }
  // 由 dataURL 生成更小的缩略图（用于图谱网格，省流量）
  function resizeDataURL(src, max, q) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * sc), h = Math.round(img.height * sc);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        res(c.toDataURL('image/jpeg', q || 0.72));
      };
      img.onerror = () => res(src);
      img.src = src;
    });
  }

  // ---------------- 数据初始化（首次播种内置内容） ----------------
  async function ensureSeed() {
    // 幂等播种：按存储是否为空判断，避免重复插入（内置 SOP 用固定 id 可覆盖）
    if ((await DB.count('sops')) === 0) await DB.bulk('sops', SEED.SOPS.map((s) => ({ ...s })));
    if ((await DB.count('compat')) === 0) await DB.bulk('compat', SEED.COMPAT.map((c) => ({ ...c, id: uid('cp') })));
    // 图谱数据版本：换成真实照片、并剔除错配图后必须刷新本地缓存；同时保留学生自建条目
    const atlasV = ((await DB.get('meta', 'atlasV')) || {}).value || 0;
    if (atlasV < 3) {
      const existing = await DB.getAll('atlas');
      const mine = existing.filter((a) => a.mine);
      await DB.clear('atlas');
      await DB.bulk('atlas', SEED.ATLAS.map((a) => ({ ...a })));
      if (mine.length) await DB.bulk('atlas', mine);
      await DB.put('meta', { key: 'atlasV', value: 3 });
    }
    // 复习库示例题库：首次（library 为空）自动载入，供师生先看样例再自建
    if ((await DB.count('library')) === 0 && SEED.LIB && SEED.LIB.length) {
      await DB.bulk('library', SEED.LIB.map((x) => ({ ...x, createdAt: Date.now() })));
      await DB.put('meta', { key: 'libDemo', value: 1 });
    }
  }

  // 手动载入示例题库（清空后再看样例时用）
  async function loadLibDemo() {
    if (!SEED.LIB || !SEED.LIB.length) return;
    if ((await DB.count('library')) > 0) { toast('题库已有内容，未重复载入'); return; }
    await DB.bulk('library', SEED.LIB.map((x) => ({ ...x, createdAt: Date.now() })));
    await DB.put('meta', { key: 'libDemo', value: 1 });
  }

  // ---------------- 顶部与导航 ----------------
  const TITLES = {
    records: ['实训记录', '课堂与实训的随身笔记'], specimens: ['标本归档', '按系统整理实训标本'],
    tools: ['实训工具箱', 'SOP · 配伍 · 图谱'], review: ['考前复习', '卡片测验与间隔记忆'],
    lib: ['复习库', '自建学科分类与题库'], me: ['我的', '数据管理与关于']
  };
  // 构建号：从自身 <script src="app.js?v=N"> 自动读取，无需手改（用于确认手机是否已加载新版本）
  const BUILD = (function () {
    try {
      const s = document.currentScript;
      const m = s && s.src && s.src.match(/[?&]v=(\d+)/);
      if (m) return 'v' + m[1];
    } catch (e) {}
    return 'dev';
  })();
  function header(title, sub) {
    return `<header class="top"><div><h1>${esc(title)}</h1><div class="sub" id="hdsub">${esc(sub || '')}</div></div></header>`;
  }
  // 顶栏副标题实时刷新：让「待复习 / 剩余」计数随答题立刻递减（无需退出重进）
  function setSub(text) {
    const el = document.getElementById('hdsub');
    const t = String(text == null ? '' : text);
    if (el && el.textContent !== t) el.textContent = t;
  }
  function setNav(active) {
    document.querySelectorAll('#nav a').forEach((a) => {
      a.classList.toggle('active', a.getAttribute('data-nav') === active);
    });
  }
  function fab(html) { return `<div class="fab" id="fab">${html || '+'}</div>`; }

  // ---------------- 路由 ----------------
  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const p = raw.split('/').filter(Boolean);
    const norm = { record: 'records', specimen: 'specimens' };
    const base = norm[p[0]] || p[0] || 'records';
    return { base, a: p[1], b: p[2], c: p[3] };
  }
  function go(hash) { location.hash = hash; }

  async function route() {
    const { base, a, b, c } = parseHash();
    try {
      if (base === 'records') {
        if (a === 'new' || a === 'edit') { setNav('records'); await renderRecordForm(b); }
        else { setNav('records'); await renderList('records'); }
      } else if (base === 'specimens') {
        if (a === 'new' || a === 'edit') { setNav('specimens'); await renderSpecimenForm(b); }
        else { setNav('specimens'); await renderList('specimens'); }
      } else if (base === 'tools') { setNav('tools'); renderTools(); }
      else if (base === 'sop') {
        if (a === 'new' || a === 'edit') { setNav('tools'); await renderSopForm(b); }
        else { setNav('tools'); await renderSop(); }
      } else if (base === 'compat') { setNav('tools'); await renderCompat(); }
      else if (base === 'atlas') {
        if (a === 'detail') { setNav('tools'); await renderAtlasDetail(b); }
        else if (a === 'new' || a === 'edit') { setNav('tools'); await renderAtlasForm(b); }
        else { setNav('tools'); await renderAtlas(); }
      } else if (base === 'review') { setNav('review'); await renderReview(); }
      else if (base === 'lib') {
        setNav('lib');
        if (a === 'cat') {
          if (b === 'new' || b === 'edit') await renderLibCatForm(b === 'edit' ? c : null);
          else if (b) await renderLibCat(b);
          else go('#/lib');
        } else if (a === 'item') {
          if (b === 'new') await renderLibItemForm(null, c);
          else if (b === 'edit') await renderLibItemForm(c, null);
          else go('#/lib');
        } else if (a === 'quiz') { await renderLibQuiz(b); }
        else if (a === 'import') { await renderLibImport(); }
        else if (a === 'drill') { await renderLibDrill(b, c); }
        else if (a === 'ai') { await renderLibAI(b, c); }
        else { await renderLib(); }
      }
      else if (base === 'auth') { setNav('me'); await renderAuth(); }
      else if (base === 'me') { setNav('me'); if (a === 'ai') await renderAISettings(); else renderMe(); }
      else { setNav('records'); await renderList('records'); }
    } catch (e) {
      const storeMissing = /object ?store|not found/i.test(e.message || '');
      app.innerHTML =
        `<div class="empty"><div class="big">⚠️</div><p>出错了：${esc(e.message)}</p>` +
        (storeMissing
          ? `<p class="muted" style="font-size:13px;margin-top:6px">本地数据库缺少新版存储（通常是缓存未更新或旧页面仍占用）。点下面按钮修复即可，已有数据不会丢。</p>
             <button class="btn-ghost" id="fixdb" style="margin-top:12px">修复本地数据库并重试</button>`
          : '') +
        `</div>` + navFooter();
      const fx = document.getElementById('fixdb');
      if (fx)
        fx.onclick = async () => {
          fx.disabled = true;
          fx.textContent = '正在修复…';
          try {
            await repairLocalDB();
            toast('已修复，正在重新载入…');
            setTimeout(() => location.reload(), 600);
          } catch (err) {
            toast('修复失败：' + (err && err.message ? err.message : err));
            fx.disabled = false;
            fx.textContent = '再试一次';
          }
        };
    }
    window.scrollTo(0, 0);
  }
  function navFooter() { return ''; }

  // 抢救用：直接用原生 IndexedDB 把代码需要的存储补全（不依赖已加载的 db.js 版本）
  function repairLocalDB() {
    const need = (typeof DB !== 'undefined' && DB.STORES) || [
      'records', 'specimens', 'sops', 'compat', 'atlas', 'atlasShots', 'cards', 'library', 'meta'
    ];
    const NAME = 'medlab_notes';
    const kpOf = (s) => (s === 'meta' ? 'key' : 'id');
    return new Promise((resolve, reject) => {
      const r = indexedDB.open(NAME);
      r.onerror = () => reject(r.error || new Error('打不开本地数据库'));
      r.onsuccess = () => {
        const db = r.result;
        const missing = need.filter((s) => !db.objectStoreNames.contains(s));
        if (!missing.length) { db.close(); resolve(true); return; }
        const next = db.version + 1;
        db.close();
        const r2 = indexedDB.open(NAME, next);
        r2.onupgradeneeded = (e) => {
          const d = e.target.result;
          need.forEach((s) => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: kpOf(s) }); });
        };
        r2.onblocked = () => reject(new Error('数据库被其它窗口占用，请关掉其它标签/后台 App 后重试'));
        r2.onerror = () => reject(r2.error || new Error('升级失败'));
        r2.onsuccess = () => { r2.result.close(); resolve(true); };
      };
    });
  }

  // ---------------- 列表：记录 / 标本 ----------------
  async function renderList(kind) {
    const items = (await Cloud.store.list(kind)).sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0));
    const isRec = kind === 'records';
    const t = TITLES[kind];
    let html = header(t[0], t[1]);
    html += `<div class="container">`;
    if (items.length === 0) {
      html += `<div class="empty"><div class="big">🗒️</div><p>还没有${isRec ? '实训记录' : '归档标本'}，点右下角 + 新建</p></div>`;
    } else {
      items.forEach((it) => {
        const thumb = (it.photos && it.photos[0]) ? `<img class="thumb" src="${it.photos[0]}" alt="">` : `<div class="thumb"></div>`;
        const meta = isRec
          ? `${esc(it.course || '未分类')} · ${esc(it.date || '')}`
          : `${esc(it.category || '未分类')}`;
        const tags = isRec && it.tags ? it.tags.map((x) => `<span class="tag">${esc(x)}</span>`).join('') : '';
        html += `<div class="list-item" data-open="${kind}:${it.id}">
          ${thumb}
          <div class="grow">
            <div class="tt">${esc(it.title)}</div>
            <div class="mm">${esc(meta)}</div>
            <div>${tags}</div>
          </div>
          <button class="icon-btn del" data-del="${kind}:${it.id}" title="删除">🗑</button>
          <div class="muted chev">›</div>
        </div>`;
      });
    }
    html += `</div>`;
    html += `<p class="list-hint">点卡片＝编辑 · 点 🗑＝删除</p>`;
    html += fab('+');
    app.innerHTML = html;
    bindListOpen(kind);
    bindListDel(kind);
    const fabEl = document.getElementById('fab');
    if (fabEl) fabEl.onclick = () => go(`#/${kind}/new`);
  }
  function bindListOpen(kind) {
    app.querySelectorAll('[data-open]').forEach((el) => {
      el.onclick = () => {
        const [k, id] = el.getAttribute('data-open').split(':');
        go(`#/${k === 'records' ? 'record' : 'specimen'}/edit/${id}`);
      };
    });
  }
  function bindListDel(kind) {
    app.querySelectorAll('[data-del]').forEach((el) => {
      el.onclick = async (e) => {
        e.stopPropagation();
        const [k, id] = el.getAttribute('data-del').split(':');
        const store = k === 'records' ? 'records' : 'specimens';
        if (confirm('确定删除这条' + (kind === 'records' ? '记录' : '标本') + '？此操作不可恢复。')) {
          await Cloud.store.del(store, id);
          toast('已删除');
          await renderList(kind);
        }
      };
    });
  }

  // ---------------- 表单：实训记录 ----------------
  async function renderRecordForm(id) {
    let rec = { title: '', course: '', date: today(), tags: [], body: '', photos: [] };
    if (id) { const f = await Cloud.store.get('records', id); if (f) rec = f; }
    let tmpPhotos = rec.photos ? rec.photos.slice() : [];
    const t = TITLES.records;
    app.innerHTML = header(id ? '编辑记录' : '新建记录', '') +
      `<div class="container">
        <div class="card">
          <input id="f-title" placeholder="标题（如：静脉采血实操）" value="${esc(rec.title)}">
          <input id="f-course" placeholder="课程 / 科目（如：内科护理）" value="${esc(rec.course)}">
          <input id="f-date" type="date" value="${esc(rec.date)}">
          <input id="f-tags" placeholder="标签，用逗号分隔（如：穿刺,无菌）" value="${esc((rec.tags || []).join(','))}">
          <textarea id="f-body" placeholder="实训要点、老师强调、自己的体会……">${esc(rec.body)}</textarea>
          <div class="section-title">操作照片 / 标本照片</div>
          <input type="file" id="f-photo" accept="image/*" capture="environment" multiple>
          <div class="photo-grid" id="f-previews" style="margin-top:8px"></div>
        </div>
        <button class="btn-primary" id="f-save">保存</button>
        ${id ? '<button class="btn-danger" id="f-del" style="width:100%;margin-top:8px">删除此记录</button>' : ''}
        <button class="btn-ghost" id="f-back" style="width:100%;margin-top:8px">返回</button>
      </div>`;

    const prev = document.getElementById('f-previews');
    function renderPreviews() {
      prev.innerHTML = tmpPhotos.map((p, i) =>
        `<div style="position:relative"><img src="${p}" alt=""><div class="badge b-danger" style="position:absolute;top:2px;right:2px;cursor:pointer" data-rm="${i}">✕</div></div>`
      ).join('');
      prev.querySelectorAll('[data-rm]').forEach((b) => {
        b.onclick = () => { tmpPhotos.splice(+b.getAttribute('data-rm'), 1); renderPreviews(); };
      });
    }
    renderPreviews();
    document.getElementById('f-photo').onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      for (const f of files) { try { tmpPhotos.push(await fileToDataURL(f)); } catch (_) {} }
      renderPreviews(); e.target.value = '';
    };
    document.getElementById('f-save').onclick = async () => {
      const title = document.getElementById('f-title').value.trim();
      if (!title) { toast('请填写标题'); return; }
      const tags = document.getElementById('f-tags').value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
      const data = {
        id: rec.id || uid('rec'), title,
        course: document.getElementById('f-course').value.trim(),
        date: document.getElementById('f-date').value,
        tags, body: document.getElementById('f-body').value,
        photos: tmpPhotos, createdAt: rec.createdAt || Date.now()
      };
      await Cloud.store.save('records', data);
      toast('已保存'); go('#/records');
    };
    if (id) document.getElementById('f-del').onclick = async () => {
      if (confirm('确定删除这条记录？')) { await Cloud.store.del('records', id); toast('已删除'); go('#/records'); }
    };
    document.getElementById('f-back').onclick = () => go('#/records');
  }

  // ---------------- 表单：标本归档 ----------------
  const SPEC_CATS = ['循环系统', '呼吸系统', '消化系统', '泌尿系统', '神经系统', '运动系统', '生殖系统', '内分泌', '其他'];
  async function renderSpecimenForm(id) {
    let sp = { title: '', category: '其他', description: '', photos: [] };
    if (id) { const f = await Cloud.store.get('specimens', id); if (f) sp = f; }
    let tmpPhotos = sp.photos ? sp.photos.slice() : [];
    const t = TITLES.specimens;
    app.innerHTML = header(id ? '编辑标本' : '归档标本', '') +
      `<div class="container">
        <div class="card">
          <input id="s-name" placeholder="标本名称（如：心脏标本）" value="${esc(sp.title)}">
          <select id="s-cat">${SPEC_CATS.map((c) => `<option ${c === sp.category ? 'selected' : ''}>${c}</option>`).join('')}</select>
          <textarea id="s-desc" placeholder="来源、结构要点、辨识特征……">${esc(sp.description)}</textarea>
          <div class="section-title">标本照片</div>
          <input type="file" id="s-photo" accept="image/*" capture="environment" multiple>
          <div class="photo-grid" id="s-previews" style="margin-top:8px"></div>
        </div>
        <button class="btn-primary" id="s-save">保存</button>
        ${id ? '<button class="btn-danger" id="s-del" style="width:100%;margin-top:8px">删除此标本</button>' : ''}
        <button class="btn-ghost" id="s-back" style="width:100%;margin-top:8px">返回</button>
      </div>`;
    const prev = document.getElementById('s-previews');
    function renderPreviews() {
      prev.innerHTML = tmpPhotos.map((p, i) =>
        `<div style="position:relative"><img src="${p}" alt=""><div class="badge b-danger" style="position:absolute;top:2px;right:2px;cursor:pointer" data-rm="${i}">✕</div></div>`
      ).join('');
      prev.querySelectorAll('[data-rm]').forEach((b) => {
        b.onclick = () => { tmpPhotos.splice(+b.getAttribute('data-rm'), 1); renderPreviews(); };
      });
    }
    renderPreviews();
    document.getElementById('s-photo').onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      for (const f of files) { try { tmpPhotos.push(await fileToDataURL(f)); } catch (_) {} }
      renderPreviews(); e.target.value = '';
    };
    document.getElementById('s-save').onclick = async () => {
      const name = document.getElementById('s-name').value.trim();
      if (!name) { toast('请填写标本名称'); return; }
      const data = {
        id: sp.id || uid('sp'), title: name,
        category: document.getElementById('s-cat').value,
        description: document.getElementById('s-desc').value,
        photos: tmpPhotos, createdAt: sp.createdAt || Date.now()
      };
      await Cloud.store.save('specimens', data);
      toast('已归档'); go('#/specimens');
    };
    if (id) document.getElementById('s-del').onclick = async () => {
      if (confirm('确定删除这个标本？')) { await Cloud.store.del('specimens', id); toast('已删除'); go('#/specimens'); }
    };
    document.getElementById('s-back').onclick = () => go('#/specimens');
  }

  // ---------------- 工具箱首页 ----------------
  function renderTools() {
    app.innerHTML = header('实训工具箱', 'SOP · 配伍 · 图谱') +
      `<div class="container">
        <div class="grid3">
          <div class="tile" data-go="#/sop"><div class="emoji">📋</div><div class="t">操作SOP</div><div class="d">内置常见操作</div></div>
          <div class="tile" data-go="#/compat"><div class="emoji">💊</div><div class="t">药物配伍</div><div class="d">两药能否同瓶</div></div>
          <div class="tile" data-go="#/atlas"><div class="emoji">🔎</div><div class="t">镜下图谱</div><div class="d">医检对照</div></div>
        </div>
        <div class="card" style="margin-top:14px">
          <div class="section-title">使用建议</div>
          <p class="muted" style="margin:4px 0">· 实训课在实验室常无信号，本 App 离线可用，数据存在本机。<br>
          · SOP 与配伍为教学参考，实际操作与用药须以教材、药品说明书及带教老师要求为准。<br>
          · 镜下图谱均为真实显微照片（来源：美国 CDC 公共卫生图像库 PHIL，公有领域），可用"对照"功能拍下你自己的镜下照片与之比对。</p>
        </div>
      </div>`;
    app.querySelectorAll('[data-go]').forEach((el) => el.onclick = () => go(el.getAttribute('data-go')));
  }

  // ---------------- 操作 SOP ----------------
  async function renderSop() {
    const all = await DB.getAll('sops');
    const builtin = all.filter((s) => s.builtin);
    const custom = all.filter((s) => !s.builtin);
    const cats = [...new Set(all.map((s) => s.category))];
    app.innerHTML = header('操作 SOP', '内置 + 自定义') +
      `<div class="container">
        <div class="search"><span class="si">🔍</span><input id="sop-q" placeholder="搜索操作名称 / 分类"></div>
        <div id="sop-list"></div>
      </div>` + fab('+');
    const box = document.getElementById('sop-list');
    function draw(q) {
      q = (q || '').trim().toLowerCase();
      const list = all.filter((s) => !q || (s.title + s.category).toLowerCase().includes(q));
      if (list.length === 0) { box.innerHTML = `<div class="empty"><div class="big">🔍</div><p>无匹配 SOP</p></div>`; return; }
      box.innerHTML = list.map((s) => `<div class="list-item" data-id="${s.id}">
        <div class="grow"><div class="tt">${esc(s.title)}</div><div class="mm">${esc(s.category)} ${s.builtin ? '' : '· 自定义'}</div></div>
        <div class="muted">›</div></div>`).join('');
      box.querySelectorAll('[data-id]').forEach((el) => el.onclick = () => go(`#/sop/${el.getAttribute('data-id')}`));
    }
    draw('');
    document.getElementById('sop-q').oninput = (e) => draw(e.target.value);
    document.getElementById('fab').onclick = () => go('#/sop/new');
  }

  async function renderSopDetail(id) {
    const s = await DB.get('sops', id);
    if (!s) { go('#/sop'); return; }
    app.innerHTML = header(s.title, s.category) +
      `<div class="container"><div class="card">
        <ol class="steps">${s.steps.map((x) => `<li>${nl2br(x)}</li>`).join('')}</ol>
        ${s.builtin ? '' : '<button class="btn-danger" id="del" style="width:100%;margin-top:10px">删除自定义 SOP</button>'}
        <button class="btn-ghost" id="back" style="width:100%;margin-top:8px">返回</button>
      </div></div>`;
    if (!s.builtin) document.getElementById('del').onclick = async () => {
      if (confirm('删除该自定义 SOP？')) { await DB.del('sops', id); toast('已删除'); go('#/sop'); }
    };
    document.getElementById('back').onclick = () => go('#/sop');
  }

  async function renderSopForm(id) {
    let s = { title: '', category: '临床操作', steps: [] };
    if (id) { const f = await DB.get('sops', id); if (f) s = f; }
    const stepText = (s.steps || []).join('\n');
    app.innerHTML = header(id ? '编辑 SOP' : '新建 SOP', '') +
      `<div class="container"><div class="card">
        <input id="t" placeholder="操作名称（如：无菌换药）" value="${esc(s.title)}">
        <input id="c" placeholder="分类（如：临床操作）" value="${esc(s.category)}">
        <textarea id="st" placeholder="每一步写一行">${esc(stepText)}</textarea>
        <button class="btn-primary" id="save">保存</button>
        <button class="btn-ghost" id="back" style="width:100%;margin-top:8px">返回</button>
      </div></div>`;
    document.getElementById('save').onclick = async () => {
      const title = document.getElementById('t').value.trim();
      if (!title) { toast('请填写名称'); return; }
      const steps = document.getElementById('st').value.split('\n').map((x) => x.trim()).filter(Boolean);
      if (steps.length === 0) { toast('至少写一步'); return; }
      await DB.put('sops', { id: s.id || uid('sop'), title, category: document.getElementById('c').value.trim() || '未分类', steps, builtin: false, createdAt: s.createdAt || Date.now() });
      toast('已保存'); go('#/sop');
    };
    document.getElementById('back').onclick = () => go('#/sop');
  }

  // ---------------- 药物配伍查询 ----------------
  async function renderCompat() {
    const all = await DB.getAll('compat');
    app.innerHTML = header('药物配伍查询', '两药能否同瓶 / 同路') +
      `<div class="container">
        <div class="card">
          <div class="section-title">两药配伍速查</div>
          <input id="a" placeholder="药物 A（如：青霉素钠）">
          <input id="b" placeholder="药物 B（如：庆大霉素）">
          <button class="btn-primary" id="lookup">查询配伍</button>
          <div id="res" style="margin-top:10px"></div>
        </div>
        <div class="card">
          <div class="section-title">自定义配伍记录</div>
          <input id="ca" placeholder="药物 A">
          <input id="cb" placeholder="药物 B">
          <select id="cr">${['禁忌', '慎用', '需冲管', '可配伍'].map((x) => `<option>${x}</option>`).join('')}</select>
          <textarea id="cn" placeholder="注意事项 / 依据"></textarea>
          <button class="btn-ghost" id="cadd">添加到我的配伍库</button>
        </div>
        <div class="search" style="margin:6px 0"><span class="si">🔍</span><input id="q" placeholder="搜索已收录配伍"></div>
        <div id="list"></div>
        <p class="muted" style="font-size:12px">⚠️ 内置与自定义数据均为教学参考，临床用药须以最新药品说明书及药师核对为准。</p>
      </div>`;

    function badge(r) {
      const m = { '禁忌': 'b-danger', '慎用': 'b-warn', '需冲管': 'b-info', '可配伍': 'b-ok' };
      return `<span class="badge ${m[r] || 'b-info'}">${esc(r)}</span>`;
    }
    function drawList(q) {
      q = (q || '').trim();
      const list = all.filter((c) => !q || drugMatch(c.a, q) || drugMatch(c.b, q));
      const box = document.getElementById('list');
      if (list.length === 0) { box.innerHTML = `<div class="empty"><div class="big">💊</div><p>暂无记录</p></div>`; return; }
      box.innerHTML = list.map((c) => `<div class="list-item" data-pair="${esc(c.a)}|${esc(c.b)}">
        <div class="grow"><div class="tt">${esc(c.a)} + ${esc(c.b)}</div><div class="mm">${badge(c.result)} ${esc(c.note || '')}</div></div></div>`).join('');
      box.querySelectorAll('[data-pair]').forEach((el) => el.onclick = () => {
        const [x, y] = el.getAttribute('data-pair').split('|');
        document.getElementById('a').value = x; document.getElementById('b').value = y;
        doLookup();
      });
    }
    function doLookup() {
      const A = document.getElementById('a').value.trim();
      const B = document.getElementById('b').value.trim();
      const res = document.getElementById('res');
      if (!A || !B) { res.innerHTML = `<p class="muted">请填写两种药物</p>`; return; }
      const hit = all.find((c) => (drugMatch(c.a, A) && drugMatch(c.b, B)) || (drugMatch(c.a, B) && drugMatch(c.b, A)));
      if (hit) {
        res.innerHTML = `<div class="card" style="margin:0"><div class="row between"><b>${esc(hit.a)} + ${esc(hit.b)}</b>${badge(hit.result)}</div><p class="muted" style="margin:8px 0 0">${esc(hit.note || '')}</p></div>`;
      } else {
        const rel = all.filter((c) => drugMatch(c.a, A) || drugMatch(c.b, A) || drugMatch(c.a, B) || drugMatch(c.b, B));
        let extra = '';
        if (rel.length) {
          extra = `<div class="section-title" style="margin-top:10px">相关记录（同类 / 同药）</div>` +
            rel.slice(0, 8).map((c) => `<div style="margin:6px 0">${esc(c.a)} + ${esc(c.b)} ${badge(c.result)}<div class="muted" style="font-size:12px">${esc(c.note || '')}</div></div>`).join('');
        }
        res.innerHTML = `<div class="card" style="margin:0"><p>未收录该组合。<br><span class="muted">建议遵药品说明书、咨询药师，必要时分开输注并冲管。</span></p>${extra}</div>`;
      }
    }
    document.getElementById('lookup').onclick = doLookup;
    document.getElementById('cadd').onclick = async () => {
      const ca = document.getElementById('ca').value.trim(), cb = document.getElementById('cb').value.trim();
      if (!ca || !cb) { toast('请填写两药'); return; }
      await DB.put('compat', { id: uid('cp'), a: ca, b: cb, result: document.getElementById('cr').value, note: document.getElementById('cn').value.trim() });
      toast('已添加'); location.reload();
    };
    document.getElementById('q').oninput = (e) => drawList(e.target.value);
    drawList('');
  }

  // ---------------- 镜下图谱 ----------------
  async function renderAtlas() {
    const all = await DB.getAll('atlas');
    const mine = all.filter((a) => a.mine);
    const builtin = all.filter((a) => !a.mine);
    const cats = ['全部', '我的', ...new Set(builtin.map((a) => a.cat))];
    app.innerHTML = header('镜下图谱', '医检对照 · 真实照片') +
      `<div class="container">
        <div class="row" id="cats" style="flex-wrap:wrap;gap:6px"></div>
        <div class="grid2" id="grid" style="margin-top:10px"></div>
      </div>`;
    const catsBox = document.getElementById('cats');
    function drawCats(active) {
      catsBox.innerHTML = cats.map((c) => `<span class="tag" data-c="${esc(c)}" style="${c === active ? 'background:var(--brand);color:#fff' : ''}">${esc(c)}</span>`).join('');
      catsBox.querySelectorAll('[data-c]').forEach((el) => el.onclick = () => { drawCats(el.getAttribute('data-c')); drawGrid(el.getAttribute('data-c')); });
    }
    function drawGrid(cat) {
      let list;
      if (cat === '我的') list = mine;
      else if (cat === '全部') list = [...mine, ...builtin];
      else list = builtin.filter((a) => a.cat === cat);
      const tiles = list.map((a) => `<div class="tile" data-id="${a.id}">
        <img src="${a.thumb || a.img}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px;margin:0 auto;display:block">
        <div class="t" style="font-size:14px">${esc(a.name)}</div><div class="d">${esc(a.cat)}${a.mine ? ' · 我的' : ''}</div></div>`).join('');
      const addTile = `<div class="tile tile-add" id="atlasAdd">
        <div style="font-size:30px;line-height:1.1">＋</div><div class="t" style="font-size:14px">新建标本</div><div class="d">拍我的镜下照片</div></div>`;
      document.getElementById('grid').innerHTML = tiles + addTile;
      document.getElementById('grid').querySelectorAll('[data-id]').forEach((el) => el.onclick = () => go(`#/atlas/detail/${el.getAttribute('data-id')}`));
      const add = document.getElementById('atlasAdd');
      if (add) add.onclick = () => go('#/atlas/new');
    }
    drawCats('全部'); drawGrid('全部');
  }

  async function renderAtlasDetail(id) {
    const a = await DB.get('atlas', id);
    if (!a) { go('#/atlas'); return; }
    const shots = (await DB.getAll('atlasShots')).filter((s) => s.atlasId === id).sort((x, y) => y.createdAt - x.createdAt);
    app.innerHTML = header(a.name, a.cat) +
      `<div class="container">
        <div class="compare">
          <div class="box"><img src="${a.img}" alt="" style="width:100%;border-radius:8px;display:block"><div class="cap">${a.mine ? '我的标本照片' : '标准照片（来源：CDC PHIL）'}</div></div>
          <div class="box" id="shotBox">
            ${shots[0] ? `<img src="${shots[0].photo}" alt="">` : '<div style="color:var(--sub)">暂无对照</div>'}
            <div class="cap">我的镜下照</div>
          </div>
        </div>
        <div class="card" style="margin-top:12px">
          <div class="section-title">形态描述</div>
          <p style="margin:4px 0">${nl2br(a.desc)}</p>
          <div class="section-title">观察要点</div>
          <p style="margin:4px 0">${nl2br(a.lookFor)}</p>
        </div>
        ${a.mine ? '' : `<div class="card">
          <div class="section-title">图片来源与许可</div>
          <p style="margin:4px 0;font-size:13px">${esc(a.source)}<br>${esc(a.license)}<br><span class="muted">${esc(a.credit)}</span></p>
        </div>`}
        <div class="card">
          <div class="section-title">对照照片（可拍多张）</div>
          <input type="file" id="shot" accept="image/*" capture="environment" multiple>
          <div class="photo-grid" id="shots" style="margin-top:8px">
            ${shots.map((s) => `<div style="position:relative"><img src="${s.photo}" alt=""><div class="badge b-danger" style="position:absolute;top:2px;right:2px;cursor:pointer" data-rm="${s.id}">✕</div></div>`).join('')}
          </div>
        </div>
        ${a.mine ? '<button class="btn-ghost" id="aedit" style="width:100%;margin-top:8px">编辑此标本</button>' : ''}
        <button class="btn-ghost" id="back" style="width:100%">返回</button>
      </div>`;
    if (a.mine) document.getElementById('aedit').onclick = () => go(`#/atlas/edit/${id}`);
    document.getElementById('shot').onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      for (const f of files) {
        try { const d = await fileToDataURL(f); await DB.put('atlasShots', { id: uid('sh'), atlasId: id, photo: d, createdAt: Date.now() }); } catch (_) {}
      }
      toast('已保存对照'); renderAtlasDetail(id);
    };
    document.getElementById('shots').querySelectorAll('[data-rm]').forEach((b) => {
      b.onclick = async () => { await DB.del('atlasShots', b.getAttribute('data-rm')); renderAtlasDetail(id); };
    });
    document.getElementById('back').onclick = () => go('#/atlas');
  }

  // ---------------- 表单：学生自建标本 ----------------
  async function renderAtlasForm(id) {
    let a = { name: '', cat: '', desc: '', lookFor: '', photos: [], mine: true };
    if (id) { const f = await DB.get('atlas', id); if (f) a = f; }
    let tmpPhotos = a.photos ? a.photos.slice() : [];
    const builtinCats = [...new Set(SEED.ATLAS.map((x) => x.cat))];
    const customCat = (a.cat && !builtinCats.includes(a.cat)) ? a.cat : '';
    app.innerHTML = header(id ? '编辑我的标本' : '新建我的标本', '拍下你的镜下照片') +
      `<div class="container">
        <div class="card">
          <input id="a-name" placeholder="标本名称（如：我的血涂片·疟原虫）" value="${esc(a.name)}">
          <select id="a-cat">
            <option value="">选择分类…</option>
            ${builtinCats.map((c) => `<option ${c === a.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}
            <option value="__custom__" ${customCat ? 'selected' : ''}>＋ 自定义分类</option>
          </select>
          <input id="a-custom" placeholder="输入自定义分类，如：药理学" value="${esc(customCat)}" style="${customCat ? '' : 'display:none'}">
          <textarea id="a-desc" placeholder="形态描述 / 来源 / 辨识要点……">${esc(a.desc)}</textarea>
          <textarea id="a-look" placeholder="观察要点（复习时重点看什么）">${esc(a.lookFor)}</textarea>
          <div class="section-title">标本照片（可拍多张）</div>
          <input type="file" id="a-photo" accept="image/*" capture="environment" multiple>
          <div class="photo-grid" id="a-previews" style="margin-top:8px"></div>
        </div>
        <button class="btn-primary" id="a-save">保存</button>
        ${id ? '<button class="btn-danger" id="a-del" style="width:100%;margin-top:8px">删除此标本</button>' : ''}
        <button class="btn-ghost" id="a-back" style="width:100%;margin-top:8px">返回</button>
      </div>`;

    function renderPreviews() {
      const prev = document.getElementById('a-previews');
      prev.innerHTML = tmpPhotos.map((p, i) =>
        `<div style="position:relative"><img src="${p}" alt=""><div class="badge b-danger" style="position:absolute;top:2px;right:2px;cursor:pointer" data-rm="${i}">✕</div></div>`
      ).join('');
      prev.querySelectorAll('[data-rm]').forEach((b) => {
        b.onclick = () => { tmpPhotos.splice(+b.getAttribute('data-rm'), 1); renderPreviews(); };
      });
    }
    renderPreviews();
    document.getElementById('a-cat').onchange = (e) => {
      document.getElementById('a-custom').style.display = (e.target.value === '__custom__') ? '' : 'none';
    };
    document.getElementById('a-photo').onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      for (const f of files) { try { tmpPhotos.push(await fileToDataURL(f)); } catch (_) {} }
      renderPreviews(); e.target.value = '';
    };
    document.getElementById('a-save').onclick = async () => {
      const name = document.getElementById('a-name').value.trim();
      if (!name) { toast('请填写标本名称'); return; }
      let cat = document.getElementById('a-cat').value;
      if (cat === '__custom__' || !cat) cat = document.getElementById('a-custom').value.trim();
      if (!cat) { toast('请选择或填写分类'); return; }
      if (tmpPhotos.length === 0) { toast('请至少上传一张照片'); return; }
      const first = tmpPhotos[0];
      const thumb = await resizeDataURL(first, 240, 0.7);
      const data = {
        id: a.id || uid('atlas'),
        name, cat,
        desc: document.getElementById('a-desc').value,
        lookFor: document.getElementById('a-look').value,
        photos: tmpPhotos,
        img: first,
        thumb,
        mine: true,
        source: '学生自建',
        license: '',
        credit: '',
        createdAt: a.createdAt || Date.now()
      };
      await DB.put('atlas', data);
      toast('已保存'); go('#/atlas');
    };
    if (id) document.getElementById('a-del').onclick = async () => {
      if (confirm('确定删除这个自建标本？相关对照照片也会一并删除。')) {
        const shots = (await DB.getAll('atlasShots')).filter((s) => s.atlasId === id);
        for (const s of shots) await DB.del('atlasShots', s.id);
        await DB.del('atlas', id);
        toast('已删除'); go('#/atlas');
      }
    };
    document.getElementById('a-back').onclick = () => go('#/atlas');
  }

  // ---------------- 复习库（独立模块：学科分类 + 自建题库 + 抽卡复习） ----------------
  async function renderLib() {
    const all = await DB.getAll('library');
    const cats = all.filter((x) => x.type === 'cat');
    const items = all.filter((x) => x.type === 'item');
    app.innerHTML = header('复习库', '自建学科分类与题库') +
      `<div class="container">
        <div class="row" style="gap:8px;margin-bottom:10px">
          <button class="btn-primary btn-sm" id="import" style="flex:1">📥 导入题库</button>
        </div>
        <div class="muted" style="margin:2px 0 10px">按学科建分类（如 药理学 / 内科 / 外科 / 有机化学考研），可导入自己的题库文档，刷题、看考频、让 AI 押题。数据存本机，登录后随账号同步。</div>
        <div class="grid2" id="grid"></div>
      </div>` + fab('+');
    document.getElementById('import').onclick = () => go('#/lib/import');
    const grid = document.getElementById('grid');
    if (cats.length === 0) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/3"><div class="big">📚</div><p>还没有分类，点右下角 ＋ 新建学科分类</p>
        <button class="btn-ghost" id="loadDemo" style="margin-top:12px">载入示例题库看看</button></div>`;
      const d = document.getElementById('loadDemo');
      if (d) d.onclick = async () => { d.disabled = true; d.textContent = '正在载入…'; await loadLibDemo(); toast('已载入示例题库'); renderLib(); };
    } else {
      grid.innerHTML = cats.map((c) => {
        const n = items.filter((i) => i.catId === c.id).length;
        return `<div class="tile" data-id="${c.id}" style="text-align:left">
          ${c.cover ? `<img src="${c.cover}" style="width:100%;height:90px;object-fit:cover;border-radius:10px;margin-bottom:8px">` : `<div style="height:90px;border-radius:10px;background:#eef3f7;display:flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:8px">📂</div>`}
          <div class="t" style="font-size:16px">${esc(c.name)}</div>
          <div class="d">${n} 题 ${c.desc ? '· ' + esc(c.desc) : ''}</div>
          <div class="row" style="margin-top:10px;gap:8px">
            <button class="btn-primary btn-sm" data-quiz="${c.id}" style="flex:1">复习</button>
            <button class="btn-ghost btn-sm" data-edit="${c.id}" style="flex:1">编辑</button>
          </div>
        </div>`;
      }).join('');
      grid.querySelectorAll('[data-id]').forEach((el) => el.onclick = (ev) => {
        if (ev.target.closest('[data-quiz]') || ev.target.closest('[data-edit]')) return;
        go(`#/lib/cat/${el.getAttribute('data-id')}`);
      });
      grid.querySelectorAll('[data-quiz]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); go(`#/lib/quiz/${b.getAttribute('data-quiz')}`); });
      grid.querySelectorAll('[data-edit]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); go(`#/lib/cat/edit/${b.getAttribute('data-edit')}`); });
    }
    document.getElementById('fab').onclick = () => go('#/lib/cat/new');
  }

  async function renderLibCatForm(id) {
    let c = { name: '', desc: '', cover: '' };
    if (id) { const f = await DB.get('library', id); if (f) c = f; }
    let cover = c.cover || '';
    app.innerHTML = header(id ? '编辑分类' : '新建学科分类', '') +
      `<div class="container"><div class="card">
        <input id="c-name" placeholder="分类名称（如：药理学）" value="${esc(c.name)}">
        <input id="c-desc" placeholder="简短说明（如：作用于 CNS 的药物）" value="${esc(c.desc)}">
        <div class="section-title">封面（可选 · 仅限图片）</div>
        <input type="file" id="c-cover" accept="image/*">
        <div class="muted" style="font-size:12px">这里选的是分类的<b>封面图片</b>（jpg / png），<b>不是题库文档</b>。<br>要导入题库：返回题库首页 → 点顶部「📥 导入题库」。</div>
        <div class="photo-grid" id="c-prev" style="margin-top:8px">${cover ? `<div><img src="${cover}"></div>` : ''}</div>
        <button class="btn-primary" id="c-save">保存</button>
        ${id ? '<button class="btn-danger" id="c-del" style="width:100%;margin-top:8px">删除该分类（含其题目）</button>' : ''}
        <button class="btn-ghost" id="c-back" style="width:100%;margin-top:8px">返回</button>
      </div></div>`;
    const prev = document.getElementById('c-prev');
    document.getElementById('c-cover').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (!/^image\//i.test(f.type || '')) {
        toast('封面只能选图片（jpg / png）——题库文档请用「📥 导入题库」');
        e.target.value = '';
        return;
      }
      try { cover = await fileToDataURL(f); prev.innerHTML = `<div><img src="${cover}"></div>`; } catch (_) {}
      e.target.value = '';
    };
    document.getElementById('c-save').onclick = async () => {
      const name = document.getElementById('c-name').value.trim();
      if (!name) { toast('请填写分类名称'); return; }
      const data = { id: c.id || uid('cat'), type: 'cat', name, desc: document.getElementById('c-desc').value.trim(), cover, createdAt: c.createdAt || Date.now() };
      await DB.put('library', data);
      toast('已保存'); go('#/lib');
    };
    if (id) document.getElementById('c-del').onclick = async () => {
      if (confirm('删除该分类会同时删除其下全部题目，确定？')) {
        const its = (await DB.getAll('library')).filter((x) => x.type === 'item' && x.catId === id);
        for (const it of its) await DB.del('library', it.id);
        await DB.del('library', id);
        toast('已删除'); go('#/lib');
      }
    };
    document.getElementById('c-back').onclick = () => go('#/lib');
  }

  async function renderLibCat(catId) {
    const cat = await DB.get('library', catId);
    if (!cat) { go('#/lib'); return; }
    const all = await DB.getAll('library');
    let items = all.filter((x) => x.type === 'item' && x.catId === catId).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    app.innerHTML = header(cat.name, cat.desc || '分类题库') +
      `<div class="container">
        <div class="row" style="gap:8px;margin-bottom:8px">
          <button class="btn-primary btn-sm" id="drill" style="flex:1">📝 刷题（${items.length}）</button>
          <button class="btn-ghost btn-sm" id="quiz" style="flex:1">▶ 间隔复习</button>
        </div>
        <div class="row" style="gap:8px;margin-bottom:10px">
          <button class="btn-ghost btn-sm" id="ai" style="flex:1">🤖 AI 考点分析</button>
          <button class="btn-ghost btn-sm" id="predict" style="flex:1">🎯 AI 押题</button>
        </div>
        <button class="btn-ghost" id="add" style="width:100%;margin-bottom:10px">➕ 添加题目</button>
        <div id="list"></div>
      </div>` + fab('+');
    const list = document.getElementById('list');
    function draw() {
      if (items.length === 0) { list.innerHTML = `<div class="empty"><div class="big">📝</div><p>还没有题目，点右下角 ＋ 添加</p></div>`; return; }
      list.innerHTML = items.map((it) => `<div class="list-item" data-id="${it.id}">
        <div class="grow">
          <div class="tt">${esc(it.question || '(未命名题目)')}</div>
          <div class="mm">${it.photos && it.photos.length ? '🖼 ' + it.photos.length + ' 张图 · ' : ''}第 ${it.box || 1} 盒</div>
        </div>
        <button class="icon-btn del" data-del="${it.id}" title="删除">🗑</button>
        <div class="muted chev">›</div>
      </div>`).join('');
      list.querySelectorAll('[data-id]').forEach((el) => el.onclick = () => go(`#/lib/item/edit/${el.getAttribute('data-id')}`));
      list.querySelectorAll('[data-del]').forEach((b) => b.onclick = async (e) => {
        e.stopPropagation();
        if (confirm('删除这道题目？')) { await DB.del('library', b.getAttribute('data-del')); toast('已删除'); items = items.filter((x) => x.id !== b.getAttribute('data-del')); draw(); }
      });
    }
    draw();
    document.getElementById('quiz').onclick = () => go(`#/lib/quiz/${catId}`);
    document.getElementById('drill').onclick = () => go(`#/lib/drill/${catId}/all`);
    document.getElementById('ai').onclick = () => go(`#/lib/ai/${catId}/analyze`);
    document.getElementById('predict').onclick = () => go(`#/lib/ai/${catId}/predict`);
    document.getElementById('add').onclick = () => go(`#/lib/item/new/${catId}`);
    document.getElementById('fab').onclick = () => go(`#/lib/item/new/${catId}`);
  }

  async function renderLibItemForm(id, catId) {
    let it = { question: '', answer: '', catId: catId || '', photos: [], box: 1, due: Date.now() };
    if (id) { const f = await DB.get('library', id); if (f) it = f; }
    if (!it.catId) { toast('缺少所属分类'); go('#/lib'); return; }
    let tmpPhotos = it.photos ? it.photos.slice() : [];
    const cat = await DB.get('library', it.catId);
    app.innerHTML = header(id ? '编辑题目' : '新建题目', cat ? cat.name : '') +
      `<div class="container"><div class="card">
        <textarea id="q" placeholder="题目 / 知识点（如：阿托品的药理作用？）" style="min-height:80px">${esc(it.question)}</textarea>
        <textarea id="a" placeholder="答案 / 解析（支持多行）" style="min-height:140px">${esc(it.answer)}</textarea>
        <div class="section-title">配图（可选，可多张）</div>
        <input type="file" id="p" accept="image/*" capture="environment" multiple>
        <div class="photo-grid" id="prev" style="margin-top:8px"></div>
        <button class="btn-primary" id="save">保存</button>
        ${id ? '<button class="btn-danger" id="del" style="width:100%;margin-top:8px">删除此题</button>' : ''}
        <button class="btn-ghost" id="back" style="width:100%;margin-top:8px">返回</button>
      </div></div>`;
    const prev = document.getElementById('prev');
    function renderPreviews() {
      prev.innerHTML = tmpPhotos.map((p, i) => `<div style="position:relative"><img src="${p}" alt=""><div class="badge b-danger" style="position:absolute;top:2px;right:2px;cursor:pointer" data-rm="${i}">✕</div></div>`).join('');
      prev.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { tmpPhotos.splice(+b.getAttribute('data-rm'), 1); renderPreviews(); });
    }
    renderPreviews();
    document.getElementById('p').onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      for (const f of files) { try { tmpPhotos.push(await fileToDataURL(f)); } catch (_) {} }
      renderPreviews(); e.target.value = '';
    };
    document.getElementById('save').onclick = async () => {
      const q = document.getElementById('q').value.trim();
      if (!q) { toast('请填写题目'); return; }
      const data = {
        id: it.id || uid('item'), type: 'item', catId: it.catId,
        question: q, answer: document.getElementById('a').value,
        photos: tmpPhotos, box: it.box || 1, due: it.due || Date.now(),
        createdAt: it.createdAt || Date.now()
      };
      await DB.put('library', data);
      toast('已保存'); go(`#/lib/cat/${it.catId}`);
    };
    if (id) document.getElementById('del').onclick = async () => {
      if (confirm('删除这道题目？')) { await DB.del('library', id); toast('已删除'); go(`#/lib/cat/${it.catId}`); }
    };
    document.getElementById('back').onclick = () => go(`#/lib/cat/${it.catId}`);
  }

  async function renderLibQuiz(catId) {
    const cat = await DB.get('library', catId);
    if (!cat) { go('#/lib'); return; }
    const items = (await DB.getAll('library')).filter((x) => x.type === 'item' && x.catId === catId);
    if (items.length === 0) {
      app.innerHTML = header(cat.name, '复习') + `<div class="container"><div class="empty"><div class="big">📝</div><p>该分类还没有题目</p></div><button class="btn-ghost" id="back" style="width:100%">返回</button></div>`;
      document.getElementById('back').onclick = () => go(`#/lib/cat/${catId}`); return;
    }
    const due = items.filter((c) => (c.due || 0) <= Date.now());
    const queue = (due.length ? due : items).slice();
    const totalQ = items.length;
    let i = 0;
    // 顶栏「待复习」= 本轮还剩多少题没复习，随答题即时递减
    function updSub() { setSub('共 ' + totalQ + ' 题 · 待复习 ' + Math.max(0, queue.length - i) + ' 题'); }
    app.innerHTML = header('复习 · ' + cat.name, `共 ${totalQ} 题 · 待复习 ${queue.length} 题`) + `<div class="container" id="rv"></div>`;
    const box = document.getElementById('rv');
    if (queue.length === 0) { box.innerHTML = `<div class="empty"><div class="big">🎉</div><p>暂无可复习题目</p></div>`; return; }
    function show() {
      updSub();
      if (i >= queue.length) {
        box.innerHTML = `<div class="empty"><div class="big">✅</div><p>本轮复习完成！</p><button class="btn-ghost" id="again" style="width:100%">再来一轮</button></div>`;
        document.getElementById('again').onclick = () => renderLibQuiz(catId);
        return;
      }
      const c = queue[i];
      const imgs = (c.photos || []).map((p) => `<img src="${p}" style="width:100%;border-radius:8px;margin-top:8px;max-height:220px;object-fit:contain">`).join('');
      box.innerHTML = `<div class="card">
        <div class="quiz-card">${esc(c.question)}</div>
        ${imgs ? '<div id="imgs" style="display:none">' + imgs + '</div>' : ''}
        <button class="btn-ghost" id="rev" style="width:100%">显示答案</button>
        <div id="ans" style="display:none;margin-top:12px" class="card">${nl2br(c.answer)}</div>
        <div id="ctr" style="display:none;margin-top:10px" class="row">
          <button class="btn-danger btn-sm" id="forget" style="flex:1">忘了</button>
          <button class="btn-primary btn-sm" id="know" style="flex:1">记得</button>
        </div>
        <div class="muted" style="text-align:center;margin-top:8px">${i + 1} / ${queue.length}</div>
      </div>`;
      document.getElementById('rev').onclick = () => {
        document.getElementById('ans').style.display = 'block';
        const im = document.getElementById('imgs'); if (im) im.style.display = 'block';
        document.getElementById('ctr').style.display = 'flex';
      };
      document.getElementById('forget').onclick = async () => { c.box = 1; c.due = Date.now(); await DB.put('library', c); i++; show(); };
      document.getElementById('know').onclick = async () => { c.box = Math.min(5, (c.box || 1) + 1); c.due = dueOf(c.box); await DB.put('library', c); i++; show(); };
    }
    show();
  }

  // ---- 题库文档解析（txt / md / csv / pdf）----
  function isCSV(text) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return false;
    const head = lines[0].toLowerCase();
    if (/question|题目|题干/.test(head) && /answer|答案/.test(head)) return true;
    const mode = lines[0].split(',').length;
    if (mode < 2) return false;
    return lines.filter((l) => l.split(',').length === mode).length > lines.length * 0.6;
  }
  function parseCSVBank(text) {
    const lines = text.split('\n').filter((l) => l.trim());
    const cols = lines.shift().toLowerCase().split(',').map((s) => s.trim());
    const qi = cols.findIndex((c) => /question|题目|题干/.test(c));
    const ai = cols.findIndex((c) => /answer|答案|解析/.test(c));
    const oi = cols.findIndex((c) => /option|选项/.test(c));
    const out = [];
    for (const ln of lines) {
      const p = ln.split(',');
      let q = qi >= 0 ? p[qi] : p[0];
      let a = ai >= 0 ? p[ai] : (p[1] || '');
      if (oi >= 0 && p[oi]) q = q + '\n' + p[oi];
      if (q && q.trim()) out.push({ question: q.trim(), answer: (a || '').trim() });
    }
    return out;
  }
  function splitQA(block) {
    const ansRe = /(?:^|\n)\s*(?:答案|答\s*案|解析|标准答案|参考答案|正确选项|解答)\s*[:：]?\s*/;
    const am = block.split(ansRe);
    if (am.length >= 2) {
      return { q: am[0].trim(), a: am.slice(1).join('').trim() };
    }
    const qa = block.match(/^(问|题|Q)[:：]([\s\S]*?)\n(答|案|A)[:：]([\s\S]*)$/i);
    if (qa) return { q: qa[2].trim(), a: qa[4].trim() };
    return { q: block.trim(), a: '' };
  }
  // 章节标题行，如「单选题（80题）」「多选题 (10题)」——解析前剔除，避免混入答案
  const SECTION_RE = /^\s*[\u4e00-\u9fa5A-Za-z]{2,10}\s*[（(]\s*\d+\s*题\s*[)）]\s*$/;
  function parseQABank(text) {
    text = (text || '').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
    // 逐行去首尾空白 + 剔除章节标题行
    text = text.split('\n')
      .filter((l) => !SECTION_RE.test(l))
      .map((l) => l.trim())
      .join('\n').trim();
    if (!text) return [];
    if (isCSV(text)) return parseCSVBank(text);
    let chunks = text.split(/(?=\n\s*(?:问|题|Q)[:：])/i);
    if (chunks.length <= 1) chunks = text.split(/\n(?=\s*\d+[\.、)．]\s*)/);
    if (chunks.length <= 1) {
      // 仅当能切成 ≥2 段时才用「空行分隔」；否则整篇会被当成 1 道伪题目（选中非题库文档时的典型症状）
      const byBlank = text.split(/\n\s*\n/).filter((x) => x.trim());
      if (byBlank.length >= 2) chunks = byBlank;
    }
    const out = [];
    for (let blk of chunks) {
      blk = blk.replace(/^\s*\d+[\.、)．]\s*/, '').trim();
      if (!blk) continue;
      const { q, a } = splitQA(blk);
      if (q && q.length >= 2) out.push({ question: q, answer: a });
    }
    return out;
  }
  let _pdfLoading = null;
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve();
    if (_pdfLoading) return _pdfLoading;
    _pdfLoading = new Promise((resolve, reject) => {
      const v = '3.11.174';
      const s = document.createElement('script');
      s.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.min.js`;
      s.onload = () => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.worker.min.js`;
        resolve();
      };
      s.onerror = () => reject(new Error('PDF 解析库加载失败（请检查网络）'));
      document.head.appendChild(s);
    });
    return _pdfLoading;
  }
  async function extractPdfText(file) {
    await loadPdfJs();
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let s = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      s += tc.items.map((i) => i.str).join(' ') + '\n\n';
    }
    return s;
  }

  // ---- 导入题库 ----
  async function renderLibImport() {
    const cats = (await DB.getAll('library')).filter((x) => x.type === 'cat');
    app.innerHTML = header('导入题库', '支持 txt / md / csv / pdf / docx（文档形式题库）') +
      `<div class="container"><div class="card">
        <div class="section-title">① 选择题库文件</div>
        <input type="file" id="f" multiple>
        <div class="muted" style="font-size:12px">支持 <b>.txt / .md / .csv / .pdf / .docx</b>。此处<b>不限制文件类型</b>（任何文件都能选中），选错格式会在下方给出提示，不会再点不动。可多选。</div>
        <div id="preview" style="margin-top:10px"></div>
        <div class="section-title" style="margin-top:12px">② 导入到分类</div>
        <select id="cat"><option value="">— 选择已有分类 —</option>${cats.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
        <input id="newcat" placeholder="或输入新分类名（如：有机化学考研）" style="margin-top:8px">
        <button class="btn-primary" id="imp" disabled style="margin-top:12px">先选择文件</button>
        <button class="btn-ghost" id="back" style="width:100%;margin-top:8px">返回</button>
      </div></div>`;
    let parsed = [];
    const prev = document.getElementById('preview');
    document.getElementById('f').onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      const btn = document.getElementById('imp');
      if (!files.length) { btn.disabled = true; btn.textContent = '先选择文件'; prev.innerHTML = ''; return; }
      btn.disabled = true; btn.textContent = '解析中…';
      try {
        parsed = [];
        const skipped = [];
        for (const f of files) {
          let txt;
          if (/\.pdf$/i.test(f.name)) txt = await extractPdfText(f);
          else if (/\.docx$/i.test(f.name)) {
            if (!window.DocxText) throw new Error('docx 解析模块未加载，请刷新页面后重试');
            txt = await DocxText.extractDocxText(f);
          } else if (/\.doc$/i.test(f.name)) {
            throw new Error('旧版 .doc 无法直接解析，请用 Word 另存为 .docx 或 .txt 后再导入');
          } else if (/\.(txt|md|csv)$/i.test(f.name)) txt = await f.text();
          else throw new Error(`「${f.name}」不是题库文档。本题库只认这五种格式：txt / md / csv / pdf / docx。`);
          const arr = parseQABank(txt);
          // 反误判①：源码 / 说明书类文档
          const nospace = txt.replace(/\s/g, '').length;
          const ansCount = arr.filter((x) => x.answer && x.answer.trim()).length;
          // 反误判②：整篇只析出 1~2 组、且一组答案都没有、正文又不短 → 是通知/散文，不是题库
          const suspicious = arr.length > 0 && arr.length <= 2 && ansCount === 0 && nospace >= 600;
          if (!arr.length || suspicious) {
            const head = txt.slice(0, 4000);
            if (/<!DOCTYPE html>|<div class=|function\s+\w+\s*\(|软件说明书|源程序/i.test(head)) {
              throw new Error(`「${f.name}」是网页源码 / 说明书类文档，里面没有题目，无法导入。请改选含「题干 + 答案」的题库文件。`);
            }
            if (suspicious) {
              throw new Error(`「${f.name}」不像题库：全文约 ${nospace} 字，既没有题号、也没识别出任何「答案：」。它可能是通知、说明或其它文档，请改选正确的题库文件。`);
            }
            skipped.push(f.name);
            continue;
          }
          parsed = parsed.concat(arr.map((x) => ({ ...x, src: f.name })));
        }
        if (!parsed.length) throw new Error('没从所选文件里识别出题目。请确认文件内容是「题干 + 答案」形式（例：\n1. 信息论的奠基者是谁？\n答案：香农）。');
        prev.innerHTML = `<div class="card" style="background:#eef7ee">已解析 <b>${parsed.length}</b> 道题（来自 ${files.length} 个文件）。${skipped.length ? `<br><span class="muted" style="font-size:12px">未识别出题目的文件：${skipped.map(esc).join('、')}</span>` : ''}</div>`;
        btn.disabled = false; btn.textContent = `导入 ${parsed.length} 题`;
      } catch (err) {
        prev.innerHTML = `<div class="card" style="background:#fdeeee">解析失败：${esc(err.message)}</div>`;
        btn.disabled = true; btn.textContent = '解析失败';
      }
    };
    document.getElementById('imp').onclick = async () => {
      if (!parsed.length) return;
      const catId = document.getElementById('cat').value;
      const catName = document.getElementById('newcat').value.trim();
      if (!catId && !catName) { toast('请选择或新建分类'); return; }
      const btn = document.getElementById('imp'); btn.disabled = true; btn.textContent = '导入中…';
      let cid = catId;
      if (!cid) { const c = { id: uid('cat'), type: 'cat', name: catName, desc: '导入题库', cover: '', createdAt: Date.now() }; await DB.put('library', c); cid = c.id; }
      const items = parsed.map((x) => ({ id: uid('item'), type: 'item', catId: cid, question: x.question, answer: x.answer, photos: [], box: 1, due: Date.now(), createdAt: Date.now(), stats: { times: 0, correct: 0, wrong: 0, src: x.src || '' } }));
      await DB.bulk('library', items);
      toast(`已导入 ${items.length} 题`); go(`#/lib/cat/${cid}`);
    };
    document.getElementById('back').onclick = () => go('#/lib');
  }

  // ---- 刷题模式（进度% / 乱序 / 错题本）----
  async function renderLibDrill(catId, mode) {
    mode = mode || 'all';
    const cat = await DB.get('library', catId);
    if (!cat) { go('#/lib'); return; }
    let items = (await DB.getAll('library')).filter((x) => x.type === 'item' && x.catId === catId);
    if (mode === 'wrong') items = items.filter((x) => (x.stats && x.stats.wrong > 0));
    if (mode === 'unseen') items = items.filter((x) => !(x.stats && x.stats.times > 0));
    if (items.length === 0) {
      app.innerHTML = header('刷题 · ' + cat.name, '') + `<div class="container"><div class="empty"><div class="big">📭</div><p>${mode === 'wrong' ? '没有错题' : mode === 'unseen' ? '没有未做过的题' : '该分类还没有题目'}</p></div><button class="btn-ghost" id="back" style="width:100%">返回</button></div>`;
      document.getElementById('back').onclick = () => go(`#/lib/cat/${catId}`); return;
    }
    const total = items.length;
    let order = 'seq', queue = items.slice(), i = 0, correct = 0, wrong = 0;
    app.innerHTML = header('刷题 · ' + cat.name, `共 ${total} 题 · 剩余 ${queue.length} 题`) +
      `<div class="container" id="dv">
        <div class="row" style="gap:8px;margin-bottom:10px">
          <button class="btn-ghost btn-sm" id="shuffle">🔀 切乱序</button>
          <button class="btn-ghost btn-sm" id="retry">🔁 仅错题</button>
          <button class="btn-ghost btn-sm" id="unseen">🌱 未做过</button>
        </div>
        <div class="progress"><div class="bar" id="bar" style="width:0%"></div></div>
        <div id="card"></div>
      </div>`;
    function shuffle(a) { for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; }
    function buildQueue() { queue = order === 'shuffle' ? shuffle(items.slice()) : items.slice(); i = 0; correct = 0; wrong = 0; }
    function updateBar() { const bar = document.getElementById('bar'); if (bar) bar.style.width = Math.round((i / total) * 100) + '%'; }
    // 顶栏「剩余」随答题即时递减（不用退出重进）
    function updSub() { setSub('共 ' + total + ' 题 · 剩余 ' + Math.max(0, queue.length - i) + ' 题'); }
    async function record(c, ok) {
      c.stats = c.stats || { times: 0, correct: 0, wrong: 0 };
      c.stats.times++; if (ok) c.stats.correct++; else c.stats.wrong++;
      await DB.put('library', c);
      if (ok) correct++; else wrong++;
    }
    function show() {
      updSub();
      if (i >= queue.length) { finish(); return; }
      const c = queue[i];
      const imgs = (c.photos || []).map((p) => `<img src="${p}" style="width:100%;border-radius:8px;margin-top:8px;max-height:220px;object-fit:contain">`).join('');
      document.getElementById('card').innerHTML = `<div class="card">
        <div class="quiz-card">${esc(c.question)}</div>
        ${imgs ? `<div id="imgs" style="display:none">${imgs}</div>` : ''}
        <button class="btn-ghost" id="rev" style="width:100%">显示答案</button>
        <div id="ans" style="display:none;margin-top:12px" class="card">${nl2br(c.answer || '(无答案)')}</div>
        <div id="ctr" style="display:none;margin-top:10px" class="row">
          <button class="btn-danger btn-sm" id="wrong" style="flex:1">答错</button>
          <button class="btn-primary btn-sm" id="right" style="flex:1">答对</button>
        </div>
        <div class="muted" style="text-align:center;margin-top:8px">${i + 1} / ${total}</div>
      </div>`;
      updateBar();
      document.getElementById('rev').onclick = () => { document.getElementById('ans').style.display = 'block'; const im = document.getElementById('imgs'); if (im) im.style.display = 'block'; document.getElementById('ctr').style.display = 'flex'; };
      document.getElementById('wrong').onclick = async () => { await record(c, false); i++; show(); };
      document.getElementById('right').onclick = async () => { await record(c, true); i++; show(); };
    }
    function finish() {
      const acc = total ? Math.round((correct / total) * 100) : 0;
      document.getElementById('card').innerHTML = `<div class="empty"><div class="big">✅</div><p>本轮完成</p><p class="muted">答对 ${correct} · 答错 ${wrong} · 正确率 ${acc}%</p>
        <button class="btn-primary" id="again" style="width:100%;margin-top:10px">再来一轮（乱序）</button>
        <button class="btn-ghost" id="back" style="width:100%;margin-top:8px">返回分类</button></div>`;
      document.getElementById('again').onclick = () => { order = 'shuffle'; buildQueue(); show(); };
      document.getElementById('back').onclick = () => go(`#/lib/cat/${catId}`);
    }
    document.getElementById('shuffle').onclick = () => { order = order === 'shuffle' ? 'seq' : 'shuffle'; toast(order === 'shuffle' ? '已切乱序' : '已切顺序'); };
    document.getElementById('retry').onclick = () => go(`#/lib/drill/${catId}/wrong`);
    document.getElementById('unseen').onclick = () => go(`#/lib/drill/${catId}/unseen`);
    buildQueue(); show();
  }

  // ---- AI 考点分析 / 押题 ----
  async function askAI(system, user) {
    const cfg = ((await DB.get('meta', 'aiConfig')) || {}).value || {};
    if (!cfg.endpoint || !cfg.apiKey) throw new Error('未配置 AI：请在「我的 → AI 设置」填入接口地址与密钥');
    const r = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({ model: cfg.model || 'glm-4.7-flash', messages: [{ role: 'system', content: system }, { role: 'user', content: user }] })
    });
    if (!r.ok) throw new Error('AI 接口错误 ' + r.status);
    const j = await r.json();
    return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || JSON.stringify(j);
  }
  async function renderLibAI(catId, mode) {
    const cat = await DB.get('library', catId);
    if (!cat) { go('#/lib'); return; }
    const items = (await DB.getAll('library')).filter((x) => x.type === 'item' && x.catId === catId);
    const isPredict = mode === 'predict';
    app.innerHTML = header((isPredict ? '押题分析' : 'AI 考点分析') + ' · ' + cat.name, isPredict ? '导入往年卷越多，押题越准' : '考频 / 重点 / 扩展 / 关联') +
      `<div class="container"><div class="card" id="panel">
        <p class="muted">${isPredict ? '把历年真题导入同一分类（或命名「XX 往年卷」），AI 会比对考点分布，预测今年最可能考的题，并说明「押题率」。' : '将本分类题目交给 AI，分析考频最高的知识点、重点、可扩展考点，以及关联高校考研常见考法。'}</p>
        <button class="btn-primary" id="run">开始分析</button>
        <button class="btn-ghost" id="cfg" style="width:100%;margin-top:8px">AI 设置（填接口密钥）</button>
        <div id="out" style="margin-top:12px;white-space:pre-wrap;font-size:14px;line-height:1.7"></div>
      </div><button class="btn-ghost" id="back" style="width:100%;margin-top:8px">返回</button></div>`;
    document.getElementById('cfg').onclick = () => go('#/me/ai');
    document.getElementById('back').onclick = () => go(`#/lib/cat/${catId}`);
    document.getElementById('run').onclick = async () => {
      if (items.length === 0) { toast('该分类还没有题目'); return; }
      const btn = document.getElementById('run'); btn.disabled = true; btn.textContent = '分析中…（可能数十秒）';
      const out = document.getElementById('out'); out.textContent = '思考中…';
      try {
        const list = items.map((x, idx) => `${idx + 1}. 题：${x.question}\n   答：${x.answer || '(无)'}`).join('\n');
        const system = isPredict
          ? '你是考研/考公辅导专家。基于提供的历年真题题目，预测今年最可能出现的考点与具体题目方向。给出：① 高频必考知识点 Top 清单；② 今年可能新增/变化的考点；③ 预测 3-5 道「最像今年会考」的模拟题；④ 说明「押题率」含义（预测卷与实际试卷重合度）及提高方法。用中文、分点、可操作。'
          : '你是医学/考试辅导专家。基于题库存的题目，分析：① 考频最高的知识点；② 重点与难点；③ 可向外扩展的相关知识点；④ 关联高校考研/考公常见考法。用中文、分点、可操作。';
        const user = `分类：${cat.name}\n题目列表（共 ${items.length} 题）：\n${list}`;
        out.textContent = await askAI(system, user);
      } catch (err) { out.textContent = '⚠️ ' + err.message; }
      finally { btn.disabled = false; btn.textContent = '重新分析'; }
    };
  }
  async function renderAISettings() {
    const cfg = ((await DB.get('meta', 'aiConfig')) || {}).value || {};
    const PRESETS = [
      { name: '智谱 GLM（免费）', endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4.7-flash' },
      { name: 'DeepSeek', endpoint: 'https://api.deepseek.com/chat/completions', model: 'deepseek-flash' },
      { name: '通义千问', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
      { name: 'Kimi', endpoint: 'https://api.moonshot.cn/v1/chat/completions', model: 'kimi-k3' },
      { name: '豆包', endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-seed-2-1-pro-260628' },
      { name: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
    ];
    app.innerHTML = header('AI 设置', '填入你自己的大模型接口（密钥仅存本机，不上传）') +
      `<div class="container"><div class="card">
        <div class="section-title">快速选择服务商</div>
        <div class="chips" id="presets">${PRESETS.map((p) => `<span class="chip" data-ep="${esc(p.endpoint)}" data-m="${esc(p.model)}">${esc(p.name)}</span>`).join('')}</div>
        <div class="section-title" style="margin-top:10px">接口地址（OpenAI 兼容 /chat/completions）</div>
        <input id="ep" placeholder="https://api.openai.com/v1/chat/completions" value="${esc(cfg.endpoint || '')}">
        <div class="section-title" style="margin-top:10px">API Key</div>
        <input id="key" type="password" placeholder="粘贴你的密钥" value="${esc(cfg.apiKey || '')}">
        <div class="section-title" style="margin-top:10px">模型名</div>
        <input id="model" placeholder="glm-4.7-flash" value="${esc(cfg.model || '')}">
        <div class="muted" style="font-size:12px;margin-top:8px">支持任意 OpenAI 兼容端点。点上方芯片即自动填好「接口地址 + 模型名」，只差你的 Key。<b>想零成本就用「智谱 GLM（免费）」</b>——<code>glm-4.7-flash</code> 目前免费、无需充值；DeepSeek、通义千问（阿里云百炼）、Kimi、豆包（火山方舟）均已按 2026 年最新模型名填好。<b>豆包</b>若报 model not found，请把「模型名」改成火山方舟「推理接入点」的 <code>ep-...</code> ID。未配置时 AI 按钮会提示来这里填。</div>
        <button class="btn-primary" id="save" style="margin-top:12px">保存</button>
        <button class="btn-ghost" id="back" style="width:100%;margin-top:8px">返回</button>
      </div></div>`;
    document.getElementById('presets').querySelectorAll('.chip').forEach((ch) => {
      ch.onclick = () => { document.getElementById('ep').value = ch.dataset.ep; document.getElementById('model').value = ch.dataset.m; toast('已填入「' + ch.textContent + '」接口，再贴 Key 即可'); };
    });
    document.getElementById('save').onclick = async () => {
      const v = { endpoint: document.getElementById('ep').value.trim(), apiKey: document.getElementById('key').value.trim(), model: document.getElementById('model').value.trim() };
      if (!v.endpoint || !v.apiKey) { toast('接口地址和 Key 都要填'); return; }
      await DB.put('meta', { key: 'aiConfig', value: v }); toast('已保存'); go('#/me');
    };
    document.getElementById('back').onclick = () => go('#/me');
  }

  // ---------------- 考前复习（卡片 + 间隔记忆） ----------------
  function dueOf(box) { const d = [0, 0, 1, 3, 7, 16]; return Date.now() + (d[box] || 0) * 86400000; }
  async function ensureCards() {
    const existing = await DB.getAll('cards');
    if (existing.length > 0) return;
    const recs = await Cloud.store.list('records');
    const sops = await DB.getAll('sops');
    const atlas = await DB.getAll('atlas');
    const cards = [];
    recs.forEach((r) => cards.push({ id: uid('cd'), front: r.title, back: `${r.course || ''}\n标签: ${(r.tags || []).join(',')}\n${r.body || ''}`.trim(), box: 1, due: Date.now(), source: 'record' }));
    sops.forEach((s) => cards.push({ id: uid('cd'), front: 'SOP：' + s.title, back: s.steps.join('\n'), box: 1, due: Date.now(), source: 'sop' }));
    atlas.forEach((a) => cards.push({ id: uid('cd'), front: '镜下：' + a.name, back: a.desc, box: 1, due: Date.now(), source: 'atlas' }));
    if (cards.length) await DB.bulk('cards', cards);
  }
  async function renderReview() {
    await ensureCards();
    let cards = (await DB.getAll('cards')).sort((x, y) => x.due - y.due);
    const due = cards.filter((c) => c.due <= Date.now());
    const queue = (due.length ? due : cards);
    const totalC = cards.length;
    let i = 0;
    // 顶栏「待复习」= 本轮还剩多少张卡片没复习，随答题即时递减
    function updSub() { setSub('共 ' + totalC + ' 张 · 待复习 ' + Math.max(0, queue.length - i) + ' 张'); }
    app.innerHTML = header('考前复习', `共 ${totalC} 张 · 待复习 ${queue.length} 张`) +
      `<div class="container" id="rv"></div>`;
    const box = document.getElementById('rv');
    if (queue.length === 0) { box.innerHTML = `<div class="empty"><div class="big">🎉</div><p>暂无可复习卡片</p></div>`; return; }
    function show() {
      updSub();
      if (i >= queue.length) {
        box.innerHTML = `<div class="empty"><div class="big">✅</div><p>本轮复习完成！</p><button class="btn-ghost" id="again" style="width:100%">再来一轮</button></div>`;
        document.getElementById('again').onclick = () => renderReview();
        return;
      }
      const c = queue[i];
      box.innerHTML = `<div class="card">
        <div class="quiz-card">${esc(c.front)}</div>
        <button class="btn-ghost" id="rev" style="width:100%">显示答案</button>
        <div id="ans" style="display:none;margin-top:12px" class="card" >${nl2br(c.back)}</div>
        <div id="ctr" style="display:none;margin-top:10px" class="row" style="gap:10px">
          <button class="btn-danger btn-sm" id="forget" style="flex:1">忘了</button>
          <button class="btn-primary btn-sm" id="know" style="flex:1">记得</button>
        </div>
        <div class="muted" style="text-align:center;margin-top:8px">${i + 1} / ${queue.length}</div>
      </div>`;
      document.getElementById('rev').onclick = () => {
        document.getElementById('ans').style.display = 'block';
        document.getElementById('ctr').style.display = 'flex';
      };
      document.getElementById('forget').onclick = async () => { c.box = 1; c.due = Date.now(); await DB.put('cards', c); i++; show(); };
      document.getElementById('know').onclick = async () => { c.box = Math.min(5, c.box + 1); c.due = dueOf(c.box); await DB.put('cards', c); i++; show(); };
    }
    show();
  }

  // ---------------- 我的 ----------------
  function renderMe() {
    const user = Cloud.currentUser();
    let accountHtml;
    if (user) {
      accountHtml = `<div class="card" style="margin-top:14px">
        <div class="section-title">云端账号</div>
        <p style="margin:4px 0">已登录：<b>${esc(user.email || user.id)}</b></p>
        <p class="muted" style="font-size:12px;margin:4px 0">登录后，实训记录与标本自动同步云端，可在任意设备访问（按账号隔离）。</p>
        <button class="btn-ghost" id="logout" style="width:100%;margin-top:6px">退出登录</button>
      </div>`;
    } else {
      accountHtml = `<div class="card" style="margin-top:14px">
        <div class="section-title">云端账号</div>
        <p class="muted" style="margin:4px 0">${Cloud.isReady() ? '登录后开启云端同步（多设备、换手机不丢失）。' : '云服务暂不可用，当前仅本机离线存储。'}</p>
        <button class="btn-primary" id="login" style="width:100%;margin-top:6px">登录 / 注册</button>
      </div>`;
    }
    app.innerHTML = header('我的', '数据管理与关于') +
      `<div class="container">
        ${accountHtml}
        <div class="card" style="margin-top:14px">
          <div class="section-title">数据备份与恢复（本机）</div>
          <button class="btn-ghost" id="exp" style="width:100%;margin:6px 0">导出数据备份</button>
          <button class="btn-ghost" id="imp" style="width:100%;margin:6px 0">从备份文件恢复</button>
          <p class="muted" style="font-size:12px;margin:2px 0 10px">把全部笔记 / 标本 / 图谱存成一个备份文件（换手机或清缓存前建议先备份）；需要找回时，点"从备份文件恢复"选中该文件即可。</p>
          <input type="file" id="impFile" accept="application/json,.json" style="display:none">
          <button class="btn-danger" id="clr" style="width:100%;margin:6px 0">清空全部数据</button>
        </div>
        <div class="card" style="margin-top:14px">
          <div class="section-title">AI 能力（可选）</div>
          <p class="muted" style="margin:4px 0">考点分析、押题、考频统计需接入你自己的大模型。填入接口密钥后，刷题时即可用 AI。</p>
          <button class="btn-ghost" id="ai" style="width:100%;margin-top:6px">AI 设置（填接口密钥）</button>
        </div>
        <div class="card" style="margin-top:14px">
          <div class="section-title">关于</div>
          <p class="muted" style="margin:4px 0">医学生实训笔记助手 · 离线 PWA<br>
          面向医学生实训课：记录、标本归档、操作 SOP、药物配伍、镜下图谱对照、考前复习。<br>
          数据默认存本机；登录后实训记录与标本同步云端（按账号隔离）。<br>
          <b>免责声明：</b>SOP、配伍与图谱均为教学参考，实际操作、用药与诊断须以教材、最新药品说明书、带教老师及临床规范为准；本工具不构成医疗建议。</p>
          <p class="muted" style="margin:4px 0;font-size:12px">当前构建：<b>${BUILD}</b>　（若此处未显示构建号，或构建号落后于最新版本，请在浏览器中对本页「强制刷新」一次以清除缓存）</p>
          <div class="credits" style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--line,#e0e0e0)">
            <div style="font-size:13px;line-height:1.9">
              <span class="muted">软件开发：</span>苏裕盛 教授 / 医学博士<br>
              <span class="muted">创意发想：</span>陈欣怡 同学<br>
              <span class="muted">镜图来源：</span>美国 CDC 公共卫生图像库（CDC PHIL，公有领域）<br>
              <span class="muted">支持单位：</span>宁德师范学院医学院
            </div>
          </div>
        </div>
      </div>`;
    document.getElementById('exp').onclick = exportData;
    document.getElementById('imp').onclick = () => document.getElementById('impFile').click();
    document.getElementById('impFile').onchange = importData;
    document.getElementById('clr').onclick = async () => {
      if (confirm('将删除全部记录、标本、自定义SOP、配伍与复习卡片，且不可恢复。确定？')) {
        for (const s of DB.STORES) if (s !== 'meta') await DB.clear(s);
        toast('已清空'); route();
      }
    };
    if (user) document.getElementById('logout').onclick = async () => { await Cloud.signOut(); toast('已退出'); route(); };
    else if (Cloud.isReady()) document.getElementById('login').onclick = () => go('#/auth');
    document.getElementById('ai').onclick = () => go('#/me/ai');
  }

  // ---------------- 登录 / 注册 ----------------
  async function renderAuth() {
    app.innerHTML = header('登录 / 注册', '云端账号 · 邮箱') +
      `<div class="container">
        <div class="card">
          <div class="row" id="tabs" style="gap:6px;margin-bottom:10px">
            <span class="tag" data-t="pw" style="background:var(--brand);color:#fff">密码登录</span>
            <span class="tag" data-t="signup">注册</span>
            <span class="tag" data-t="otp">验证码登录</span>
            <span class="tag" data-t="reset">找回密码</span>
          </div>
          <input id="email" placeholder="邮箱（如：you@example.com）">
          <div id="pwBox"><input id="pw" type="password" placeholder="密码（注册需≥6位）"></div>
          <div id="codeBox" style="display:none"><input id="code" placeholder="邮箱验证码"><button class="btn-ghost" id="send" style="width:100%;margin-top:6px">获取验证码</button></div>
          <button class="btn-primary" id="submit" style="width:100%;margin-top:8px">登录</button>
          <p id="msg" class="muted" style="font-size:12px;margin:8px 0 0"></p>
        </div>
        <button class="btn-ghost" id="back" style="width:100%">返回</button>
      </div>`;
    let mode = 'pw';
    let pending = null;
    const msg = (t) => { document.getElementById('msg').textContent = t; };
    function setMode(m) {
      mode = m;
      document.querySelectorAll('#tabs .tag').forEach((el) => {
        const on = el.getAttribute('data-t') === m;
        el.style.background = on ? 'var(--brand)' : '';
        el.style.color = on ? '#fff' : '';
      });
      document.getElementById('pwBox').style.display = (m === 'pw' || m === 'signup') ? '' : 'none';
      document.getElementById('codeBox').style.display = (m === 'signup' || m === 'otp') ? '' : 'none';
      document.getElementById('submit').textContent =
        m === 'pw' ? '登录' : m === 'signup' ? '注册' : m === 'otp' ? '验证码登录' : '发送重置邮件';
    }
    document.querySelectorAll('#tabs .tag').forEach((el) => el.onclick = () => setMode(el.getAttribute('data-t')));
    document.getElementById('send').onclick = async () => {
      const email = document.getElementById('email').value.trim();
      if (!email) { msg('请先填写邮箱'); return; }
      const r = await Cloud.sendEmailCode(email);
      if (r.error) { msg(r.error.message || '发送失败'); return; }
      pending = { email, verificationId: r.data.verificationId, isExistingUser: r.data.isExistingUser };
      msg('验证码已发送，请查收邮箱');
    };
    document.getElementById('submit').onclick = async () => {
      const email = document.getElementById('email').value.trim();
      if (!email) { msg('请填写邮箱'); return; }
      try {
        if (mode === 'pw') {
          const r = await Cloud.signInPassword(email, document.getElementById('pw').value);
          if (r.error) { msg(r.error.message || '登录失败'); return; }
        } else if (mode === 'signup') {
          if (!pending || pending.email !== email) { msg('请先获取验证码'); return; }
          const r = await Cloud.verifyEmailOtp(email, pending.verificationId, pending.isExistingUser, document.getElementById('code').value, document.getElementById('pw').value);
          if (r.error) { msg(r.error.message || '注册失败'); return; }
        } else if (mode === 'otp') {
          if (!pending || pending.email !== email) { msg('请先获取验证码'); return; }
          const r = await Cloud.verifyEmailOtp(email, pending.verificationId, pending.isExistingUser, document.getElementById('code').value);
          if (r.error) { msg(r.error.message || '登录失败'); return; }
        } else if (mode === 'reset') {
          const r = await Cloud.resetPassword(email);
          if (r.error) { msg(r.error.message || '发送失败'); return; }
          msg('重置邮件已发送，请查收'); return;
        }
        toast('登录成功'); go('#/me');
      } catch (e) { msg(e.message || '出错了'); }
    };
    document.getElementById('back').onclick = () => go('#/me');
    setMode('pw');
  }
  async function exportData() {
    const out = {};
    for (const s of DB.STORES) out[s] = await DB.getAll(s);
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'medlab-backup-' + today() + '.json';
    a.click();
    toast('已导出');
  }
  async function importData(e) {
    const file = e.target.files[0]; if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      for (const s of DB.STORES) if (data[s] && Array.isArray(data[s])) await DB.bulk(s, data[s]);
      toast('导入完成'); route();
    } catch (err) { toast('导入失败：格式错误'); }
  }

  // ---------------- SOP 详情路由桥接 ----------------
  // 在 route 中 sop 详情通过 #/sop/ID 进入，这里补充处理
  const _route = route;
  route = async function () {
    const { base, a, b } = parseHash();
    if (base === 'sop' && a && a !== 'new' && a !== 'edit') { setNav('tools'); await renderSopDetail(a); window.scrollTo(0, 0); return; }
    await _route();
  };

  // ---------------- 启动 ----------------
  async function start() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      try {
        // 带版本号注册：脚本 URL 变化会触发浏览器立即安装新 SW（清除旧缓存锁死）
        navigator.serviceWorker.register('sw.js?v=18').catch(() => {});
        // 新 SW 接管后自动刷新一次，避免用户"要刷两次才生效"
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!sessionStorage.getItem('__swReloaded')) {
            sessionStorage.setItem('__swReloaded', '1');
            location.reload();
          }
        });
      } catch (_) {}
    }
    try { if (window.Cloud && Cloud.init()) await Cloud.refreshSession(); } catch (e) { console.warn('cloud init failed', e); }
    try { await ensureSeed(); } catch (e) { console.warn('seed failed', e); }
    window.addEventListener('hashchange', route);
    if (!location.hash) location.hash = '#/records';
    else route();
  }
  start();
})();
