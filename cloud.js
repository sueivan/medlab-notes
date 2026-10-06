/* 医学生实训笔记助手 —— 云服务接入层
 * 纯前端（CDN 全局 WorkBuddyCloud）。登录后在云端读写 records / specimens，
 * 未登录或离线时自动回退到本机 IndexedDB，保持离线可用。
 */
(function () {
  'use strict';
  const cfg = window.CLOUD_CONFIG;
  let cloud = null;
  let session = null;
  let ready = false;
  let online = false; // cloud 已初始化且已登录

  function init() {
    if (!cfg || !window.WorkBuddyCloud) { ready = false; return false; }
    try {
      cloud = window.WorkBuddyCloud.createWorkBuddyCloud({
        endpoint: cfg.endpoint,
        publishableKey: cfg.publishableKey,
      });
      ready = true;
      return true;
    } catch (e) { console.warn('[cloud] init failed', e); ready = false; return false; }
  }

  async function refreshSession() {
    if (!cloud) { online = false; return null; }
    try {
      const { data, error } = await cloud.auth.getSession();
      session = (error || !data) ? null : data;
    } catch (e) { session = null; }
    online = !!(cloud && session);
    return session;
  }

  function isOnline() { return ready && online && (navigator.onLine !== false); }
  function isReady() { return ready; }
  function currentUser() { return session ? (session.user || null) : null; }

  // ---------------- 认证 ----------------
  async function signInPassword(email, password) {
    if (!cloud) return { error: { message: '云服务不可用' } };
    const { data, error } = await cloud.auth.signInWithPassword({ email, password });
    if (error) return { error };
    await refreshSession();
    return { data };
  }
  async function sendEmailCode(email) {
    if (!cloud) return { error: { message: '云服务不可用' } };
    const { data, error } = await cloud.auth.sendOtp({ email });
    if (error) return { error };
    return { data };
  }
  async function verifyEmailOtp(email, verificationId, isExistingUser, token, password) {
    if (!cloud) return { error: { message: '云服务不可用' } };
    const { data, error } = await cloud.auth.verifyOtp({
      email, verificationId, isExistingUser, token,
      password: isExistingUser ? undefined : password,
    });
    if (error) return { error };
    await refreshSession();
    return { data };
  }
  async function resetPassword(email) {
    if (!cloud) return { error: { message: '云服务不可用' } };
    const { data, error } = await cloud.auth.resetPasswordForEmail(email);
    if (error) return { error };
    return { data };
  }
  async function signOut() {
    if (!cloud) return;
    try { await cloud.auth.signOut(); } catch (e) {}
    session = null; online = false;
  }

  // ---------------- 存储：照片上云 ----------------
  function dataURLtoBlob(dataURL) {
    const m = dataURL.match(/^data:(.*?);base64,(.*)$/);
    const mime = m ? m[1] : 'image/png';
    const bin = atob(m ? m[2] : '');
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
  async function uploadDataURL(dataURL) {
    if (!isOnline() || !session) return dataURL;
    const ext = /image\/(png|jpeg|jpg|webp|gif)/.test(dataURL) ? 'jpg' : 'png';
    const path = cloud.storage.userPath(
      session.user.id,
      `photos/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
    );
    const blob = dataURLtoBlob(dataURL);
    const up = await cloud.storage.upload(path, blob, { contentType: blob.type });
    if (up.error) throw up.error;
    const url = await cloud.storage.createSignedUrl(path, 3600);
    if (url.error) throw url.error;
    return (url.data && (url.data.signedUrl || url.data.url)) || dataURL;
  }
  async function uploadPhotosIfNeeded(photos) {
    if (!isOnline()) return photos || [];
    const out = [];
    for (const p of (photos || [])) {
      if (typeof p === 'string' && p.startsWith('data:')) {
        try { out.push(await uploadDataURL(p)); } catch (e) { out.push(p); }
      } else out.push(p);
    }
    return out;
  }

  // ---------------- 数据库：记录 / 标本 ----------------
  function isCloudId(id) { return !!id && /^\d+$/.test(String(id)); }
  function mapRow(kind, row) {
    if (kind === 'records') {
      return {
        id: String(row.id),
        title: row.title || '', course: row.course || '', date: row.date || '',
        tags: Array.isArray(row.tags) ? row.tags : [],
        body: row.body || '',
        photos: Array.isArray(row.photos) ? row.photos : [],
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      };
    }
    return {
      id: String(row.id),
      title: row.title || '', category: row.category || '',
      description: row.description || '',
      photos: Array.isArray(row.photos) ? row.photos : [],
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    };
  }
  function toRow(kind, obj, isUpdate) {
    const row = {};
    if (kind === 'records') {
      row.title = obj.title || ''; row.course = obj.course || '';
      row.date = obj.date || ''; row.tags = obj.tags || [];
      row.body = obj.body || ''; row.photos = obj.photos || [];
    } else {
      row.title = obj.title || ''; row.category = obj.category || '';
      row.description = obj.description || ''; row.photos = obj.photos || [];
    }
    if (isUpdate && isCloudId(obj.id)) row.id = Number(obj.id);
    return row;
  }
  async function list(kind) {
    if (isOnline()) {
      try {
        const { data, error } = await cloud.database.from(kind)
          .select('*').order('created_at', { ascending: false });
        if (!error && data) return data.map((r) => mapRow(kind, r));
      } catch (e) { console.warn('[cloud] list failed', e); }
    }
    return await DB.getAll(kind);
  }
  async function get(kind, id) {
    if (isOnline() && isCloudId(id)) {
      try {
        const { data, error } = await cloud.database.from(kind)
          .select('*').eq('id', Number(id)).single();
        if (!error && data) return mapRow(kind, data);
      } catch (e) {}
    }
    return await DB.get(kind, id);
  }
  async function save(kind, obj) {
    const photos = await uploadPhotosIfNeeded(obj.photos);
    const clean = Object.assign({}, obj, { photos });
    if (isOnline()) {
      try {
        const isUpdate = isCloudId(clean.id);
        const row = toRow(kind, clean, isUpdate);
        if (isUpdate) {
          const { data, error } = await cloud.database.from(kind)
            .update(row).eq('id', Number(clean.id)).select();
          if (error) throw error;
          if (Array.isArray(data) && data.length === 0) throw new Error('无权限或未找到该行');
        } else {
          const { data, error } = await cloud.database.from(kind).insert(row).select();
          if (error) throw error;
          if (Array.isArray(data) && data[0]) clean.id = String(data[0].id);
        }
        await DB.put(kind, clean); // 本地缓存，离线可读
        return clean;
      } catch (e) { console.warn('[cloud] save failed, fallback local', e); }
    }
    await DB.put(kind, clean);
    return clean;
  }
  async function del(kind, id) {
    if (isOnline() && isCloudId(id)) {
      try {
        const { data, error } = await cloud.database.from(kind)
          .delete().eq('id', Number(id)).select();
        if (error) throw error;
      } catch (e) { console.warn('[cloud] del failed', e); }
    }
    return await DB.del(kind, id);
  }

  window.Cloud = {
    init, refreshSession, isOnline, isReady, currentUser,
    signInPassword, sendEmailCode, verifyEmailOtp, resetPassword, signOut,
    uploadPhotosIfNeeded,
    store: { list, get, save, del },
  };
})();
