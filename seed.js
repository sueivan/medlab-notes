/* medlab-notes —— 种子数据（内置 SOP / 药物配伍 / 镜下图谱）
   说明：本文件数据仅供教学与复习参考，用药与操作须以最新药品说明书、教材及带教老师要求为准。 */
(function (global) {
  const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9);

  // ---------------- 操作 SOP ----------------
  const SOPS = [
    {
      id: 'sop_venipuncture',
      title: '静脉采血（真空采血管）',
      category: '临床操作',
      steps: [
        '核对医嘱与患者信息，确认采血管种类与顺序。',
        '协助患者取舒适体位，暴露肘正中/贵要静脉，扎止血带（距穿刺点上方 5–10 cm）。',
        '消毒穿刺点（直径 ≥5 cm，待干），戴手套。',
        '绷紧皮肤，针头斜面向上与皮肤呈 15°–30° 进针，见回血后固定。',
        '按顺序插入采血管（血培养→枸橼酸钠→血清/促凝→肝素→EDTA→糖酵解抑制管）。',
        '采毕松止血带、拔针，嘱患者按压穿刺点 3–5 分钟至不出血。',
        '核对标签、标本与申请单，立即送检；锐器放入锐器盒。'
      ]
    },
    {
      id: 'sop_aseptic',
      title: '无菌技术操作',
      category: '无菌与感染控制',
      steps: [
        '操作前洗手、戴口罩帽子，评估环境清洁宽敞、避开人流。',
        '无菌物品与非无菌物品分开放置，无菌包在有效期内、包布干燥。',
        '取无菌物品用无菌持物钳，钳端始终向下，不可跨越无菌区。',
        '铺无菌盘时手臂不跨越，边缘内视为无菌区（边缘外 5 cm 视为污染）。',
        '一份无菌物品仅供一位患者使用，疑污染即弃用。',
        '操作中保持无菌物品干燥，掉落或触碰即视为污染。'
      ]
    },
    {
      id: 'sop_cpr',
      title: '成人心肺复苏（CPR）',
      category: '急救',
      steps: [
        '判断意识与呼吸：拍肩呼叫，观察胸廓 5–10 秒，无呼吸/仅有濒死喘息即开始。',
        '呼叫求助并取来 AED，患者仰卧于硬板/地面。',
        '按压部位：两乳头连线中点（胸骨下半段），双手交叠、肩肘垂直。',
        '深度 5–6 cm，频率 100–120 次/分，每次按压后充分回弹。',
        '按压:通气 = 30:2，球囊面罩或口对口每次吹气 1 秒见胸廓起伏。',
        '尽量减少中断（<10 秒），AED 到达立即分析并按提示除颤。',
        '持续进行直至患者恢复自主循环/呼吸、交由专业人员或筋疲力尽。'
      ]
    },
    {
      id: 'sop_id',
      title: '皮内注射（青霉素皮试）',
      category: '临床操作',
      steps: [
        '询问过敏史，备好肾上腺素等抢救物品。',
        '核对皮试液浓度与有效期，前臂掌侧下段为注射部位。',
        '75% 酒精消毒（禁用碘伏，以免影响结果观察），待干。',
        '针头斜面向上，与皮肤呈 5° 进针，推注 0.02–0.05 mL 成皮丘。',
        '拔针不按压，计时 20 分钟，观察红晕/硬结直径。',
        '阴性：红晕 < 0.5 cm 无伪足；阳性：红晕 ≥ 0.5 cm 或伴伪足/痒感，禁用并记录。'
      ]
    },
    {
      id: 'sop_gram',
      title: '细菌涂片革兰染色',
      category: '医检技术',
      steps: [
        '涂片：取标本均匀涂布于载玻片，自然干燥后火焰固定。',
        '结晶紫初染 1 分钟，流水轻冲。',
        '卢戈碘液媒染 1 分钟，流水冲洗。',
        '95% 乙醇脱色 10–30 秒（关键步骤，控制时间），立即水洗。',
        '沙黄/复红复染 30–60 秒，水洗、吸干、镜检。',
        '结果：G⁺ 紫蓝色，G⁻ 红色；结合形态与排列报告。'
      ]
    },
    {
      id: 'sop_bp',
      title: '血压测量（听诊法）',
      category: '临床操作',
      steps: [
        '被测者坐位安静休息 5 分钟，手臂与心脏同高，袖带下缘距肘窝 2–3 cm。',
        '触诊肱动脉，将听诊器胸件置于其上，不塞入袖带下。',
        '袖带充气压至桡动脉搏动消失后再升 20–30 mmHg。',
        '缓慢放气（2–3 mmHg/秒），听到第一声为收缩压，搏动消失为舒张压。',
        '间隔 1–2 分钟复测，取两次均值；双侧或上下肢差异明显需记录。'
      ]
    },
    {
      id: 'sop_handwash',
      title: '外科手消毒',
      category: '无菌与感染控制',
      steps: [
        '修剪指甲、摘除饰物，用流动水润湿双手至肘上 1/3。',
        '取洗手液，按七步洗手法揉搓 3 分钟（内外夹弓大立腕）。',
        '流水由手向肘部冲洗，勿反流。',
        '无菌巾擦干（从手到肘），再取手消毒剂涂抹至肘上，自然干燥。',
        '保持拱手姿势，手臂高于肘部，进入无菌区。'
      ]
    },
    {
      id: 'sop_oxygen',
      title: '鼻导管吸氧术',
      category: '临床操作',
      steps: [
        '核对医嘱氧流量，检查供氧装置与湿化瓶水位。',
        '向患者解释，清洁鼻腔，连接鼻导管并检查通畅。',
        '导管插入鼻腔约 1 cm，固定于耳后及面颊。',
        '调节流量：轻度 1–2 L/min，中度 2–4 L/min，重度 4–6 L/min（遵医嘱）。',
        '观察患者缺氧改善情况、黏膜干燥，记录氧流量与时间。'
      ]
    }
  ];

  // ---------------- 药物配伍查询（教学参考） ----------------
  // result: 禁忌 / 慎用 / 可配伍 / 需冲管
  const COMPAT = [
    { a: '青霉素钠', b: '硫酸庆大霉素(氨基糖苷类)', result: '禁忌', note: 'β-内酰胺类与氨基糖苷类在同一容器内可相互灭活，应分别给药。' },
    { a: '头孢曲松', b: '葡萄糖酸钙/林格氏液(含钙)', result: '禁忌', note: '可与钙生成头孢曲松钙沉淀，严禁同瓶输注。' },
    { a: '氨茶碱', b: '葡萄糖酸钙', result: '禁忌', note: '存在配伍禁忌，易生成沉淀，应避免同路。' },
    { a: '维生素C', b: '维生素B12', result: '慎用', note: '维生素C可破坏维生素B12，不宜同瓶长期混合。' },
    { a: '盐酸多巴胺', b: '碳酸氢钠', result: '禁忌', note: '碱性环境使多巴胺失活，禁忌同瓶。' },
    { a: '呋塞米(速尿)', b: '氨基糖苷类', result: '慎用', note: '耳毒性与肾毒性可叠加，合用时监测听力和肾功能。' },
    { a: '盐酸多巴胺', b: '呋塞米', result: '需冲管', note: '存在配伍禁忌，序贯输注时需用生理盐水冲管。' },
    { a: '地西泮(安定)', b: '0.9%氯化钠(生理盐水)', result: '慎用', note: '地西泮在生理盐水中易析出结晶，宜用专用溶剂/葡萄糖。' },
    { a: '注射用阿奇霉素', b: '头孢曲松(β-内酰胺类)', result: '需冲管', note: '同路序贯时建议冲管，避免理化不相容。' },
    { a: '氯化钾', b: '胰岛素(极化液 GIK)', result: '可配伍', note: '临床常用 GIK 配方（葡萄糖+胰岛素+氯化钾），须控制浓度与速度。' },
    { a: '肝素钠', b: '鱼精蛋白', result: '可配伍', note: '鱼精蛋白用于中和肝素，但需缓慢静注并监测。' },
    { a: '地塞米松磷酸钠', b: '葡萄糖酸钙', result: '需冲管', note: '存在配伍禁忌报告，序贯时冲管。' }
  ];

  // ---------------- 医检镜下图谱（真实照片，来源：CDC PHIL，公有领域） ----------------
  const ATLAS = [
    {
      id: "atlas_phil_30416", cat: "血液学", name: "外周血涂片（染色）",
      keyword: "blood smear", philId: "30416",
      img: "assets/atlas/phil_30416.jpg", thumb: "assets/atlas/phil_30416_t.jpg",
      desc: "染色后外周血涂片的显微镜照片，可见大量红细胞及散在白细胞，用于形态学初步筛查。", lookFor: "红细胞双凹圆盘、无核；白细胞体积更大、有核；注意大小不均、畸形、异型淋巴细胞。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 30416"
    },
    {
      id: "atlas_phil_29289", cat: "血液学", name: "外周血涂片（染色）",
      keyword: "blood smear", philId: "29289",
      img: "assets/atlas/phil_29289.jpg", thumb: "assets/atlas/phil_29289_t.jpg",
      desc: "染色后外周血涂片的显微镜照片，可见大量红细胞及散在白细胞，用于形态学初步筛查。", lookFor: "红细胞双凹圆盘、无核；白细胞体积更大、有核；注意大小不均、畸形、异型淋巴细胞。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29289"
    },
    {
      id: "atlas_phil_29093", cat: "血液学", name: "外周血涂片（染色）",
      keyword: "blood smear", philId: "29093",
      img: "assets/atlas/phil_29093.jpg", thumb: "assets/atlas/phil_29093_t.jpg",
      desc: "染色后外周血涂片的显微镜照片，可见大量红细胞及散在白细胞，用于形态学初步筛查。", lookFor: "红细胞双凹圆盘、无核；白细胞体积更大、有核；注意大小不均、畸形、异型淋巴细胞。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29093"
    },
    {
      id: "atlas_phil_29092", cat: "血液学", name: "外周血涂片（染色）",
      keyword: "blood smear", philId: "29092",
      img: "assets/atlas/phil_29092.jpg", thumb: "assets/atlas/phil_29092_t.jpg",
      desc: "染色后外周血涂片的显微镜照片，可见大量红细胞及散在白细胞，用于形态学初步筛查。", lookFor: "红细胞双凹圆盘、无核；白细胞体积更大、有核；注意大小不均、畸形、异型淋巴细胞。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29092"
    },
    {
      id: "atlas_phil_29091", cat: "血液学", name: "外周血涂片（染色）",
      keyword: "blood smear", philId: "29091",
      img: "assets/atlas/phil_29091.jpg", thumb: "assets/atlas/phil_29091_t.jpg",
      desc: "染色后外周血涂片的显微镜照片，可见大量红细胞及散在白细胞，用于形态学初步筛查。", lookFor: "红细胞双凹圆盘、无核；白细胞体积更大、有核；注意大小不均、畸形、异型淋巴细胞。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29091"
    },
    {
      id: "atlas_phil_29090", cat: "血液学", name: "外周血涂片（染色）",
      keyword: "blood smear", philId: "29090",
      img: "assets/atlas/phil_29090.jpg", thumb: "assets/atlas/phil_29090_t.jpg",
      desc: "染色后外周血涂片的显微镜照片，可见大量红细胞及散在白细胞，用于形态学初步筛查。", lookFor: "红细胞双凹圆盘、无核；白细胞体积更大、有核；注意大小不均、畸形、异型淋巴细胞。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29090"
    },
    {
      id: "atlas_phil_27370", cat: "血液学", name: "红细胞（RBC）",
      keyword: "red blood cells", philId: "27370",
      img: "assets/atlas/phil_27370.jpg", thumb: "assets/atlas/phil_27370_t.jpg",
      desc: "成熟红细胞呈双凹圆盘状、直径约 7–8 μm、淡红色、无核。", lookFor: "中央染色较浅的双凹圆盘；增多/减少、大小不均、畸形可见于贫血等。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 27370"
    },
    {
      id: "atlas_phil_29399", cat: "血液学", name: "白细胞（WBC）",
      keyword: "leukocyte", philId: "29399",
      img: "assets/atlas/phil_29399.jpg", thumb: "assets/atlas/phil_29399_t.jpg",
      desc: "外周血中各类白细胞（粒细胞、淋巴细胞、单核细胞等）的显微镜照片。", lookFor: "有核、胞体大于红细胞；依核形与胞质颗粒区分亚型。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29399"
    },
    {
      id: "atlas_phil_29385", cat: "血液学", name: "白细胞（WBC）",
      keyword: "leukocyte", philId: "29385",
      img: "assets/atlas/phil_29385.jpg", thumb: "assets/atlas/phil_29385_t.jpg",
      desc: "外周血中各类白细胞（粒细胞、淋巴细胞、单核细胞等）的显微镜照片。", lookFor: "有核、胞体大于红细胞；依核形与胞质颗粒区分亚型。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29385"
    },
    {
      id: "atlas_phil_29384", cat: "血液学", name: "白细胞（WBC）",
      keyword: "leukocyte", philId: "29384",
      img: "assets/atlas/phil_29384.jpg", thumb: "assets/atlas/phil_29384_t.jpg",
      desc: "外周血中各类白细胞（粒细胞、淋巴细胞、单核细胞等）的显微镜照片。", lookFor: "有核、胞体大于红细胞；依核形与胞质颗粒区分亚型。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29384"
    },
    {
      id: "atlas_phil_29378", cat: "血液学", name: "白细胞（WBC）",
      keyword: "leukocyte", philId: "29378",
      img: "assets/atlas/phil_29378.jpg", thumb: "assets/atlas/phil_29378_t.jpg",
      desc: "外周血中各类白细胞（粒细胞、淋巴细胞、单核细胞等）的显微镜照片。", lookFor: "有核、胞体大于红细胞；依核形与胞质颗粒区分亚型。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29378"
    },
    {
      id: "atlas_phil_29377", cat: "血液学", name: "白细胞（WBC）",
      keyword: "leukocyte", philId: "29377",
      img: "assets/atlas/phil_29377.jpg", thumb: "assets/atlas/phil_29377_t.jpg",
      desc: "外周血中各类白细胞（粒细胞、淋巴细胞、单核细胞等）的显微镜照片。", lookFor: "有核、胞体大于红细胞；依核形与胞质颗粒区分亚型。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29377"
    },
    {
      id: "atlas_phil_29375", cat: "血液学", name: "白细胞（WBC）",
      keyword: "leukocyte", philId: "29375",
      img: "assets/atlas/phil_29375.jpg", thumb: "assets/atlas/phil_29375_t.jpg",
      desc: "外周血中各类白细胞（粒细胞、淋巴细胞、单核细胞等）的显微镜照片。", lookFor: "有核、胞体大于红细胞；依核形与胞质颗粒区分亚型。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29375"
    },
    {
      id: "atlas_phil_27223", cat: "血液学", name: "中性粒细胞",
      keyword: "neutrophil", philId: "27223",
      img: "assets/atlas/phil_27223.jpg", thumb: "assets/atlas/phil_27223_t.jpg",
      desc: "胞核分叶（2–5 叶）、胞质含淡粉色颗粒；急性细菌感染时增多、核左移。", lookFor: "分叶核 + 淡粉颗粒；核左移提示感染/应激。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 27223"
    },
    {
      id: "atlas_phil_27222", cat: "血液学", name: "中性粒细胞",
      keyword: "neutrophil", philId: "27222",
      img: "assets/atlas/phil_27222.jpg", thumb: "assets/atlas/phil_27222_t.jpg",
      desc: "胞核分叶（2–5 叶）、胞质含淡粉色颗粒；急性细菌感染时增多、核左移。", lookFor: "分叶核 + 淡粉颗粒；核左移提示感染/应激。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 27222"
    },
    {
      id: "atlas_phil_26108", cat: "血液学", name: "中性粒细胞",
      keyword: "neutrophil", philId: "26108",
      img: "assets/atlas/phil_26108.jpg", thumb: "assets/atlas/phil_26108_t.jpg",
      desc: "胞核分叶（2–5 叶）、胞质含淡粉色颗粒；急性细菌感染时增多、核左移。", lookFor: "分叶核 + 淡粉颗粒；核左移提示感染/应激。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 26108"
    },
    {
      id: "atlas_phil_22348", cat: "血液学", name: "中性粒细胞",
      keyword: "neutrophil", philId: "22348",
      img: "assets/atlas/phil_22348.jpg", thumb: "assets/atlas/phil_22348_t.jpg",
      desc: "胞核分叶（2–5 叶）、胞质含淡粉色颗粒；急性细菌感染时增多、核左移。", lookFor: "分叶核 + 淡粉颗粒；核左移提示感染/应激。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 22348"
    },
    {
      id: "atlas_phil_20813", cat: "血液学", name: "中性粒细胞",
      keyword: "neutrophil", philId: "20813",
      img: "assets/atlas/phil_20813.jpg", thumb: "assets/atlas/phil_20813_t.jpg",
      desc: "胞核分叶（2–5 叶）、胞质含淡粉色颗粒；急性细菌感染时增多、核左移。", lookFor: "分叶核 + 淡粉颗粒；核左移提示感染/应激。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 20813"
    },
    {
      id: "atlas_phil_29239", cat: "血液学", name: "血小板",
      keyword: "platelets", philId: "29239",
      img: "assets/atlas/phil_29239.jpg", thumb: "assets/atlas/phil_29239_t.jpg",
      desc: "巨核细胞脱落的无核胞质碎片，体积小、常聚集成簇，参与止血凝血。", lookFor: "无核小碎片、成簇；减少见于血小板减少症。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29239"
    },
    {
      id: "atlas_phil_29238", cat: "血液学", name: "血小板",
      keyword: "platelets", philId: "29238",
      img: "assets/atlas/phil_29238.jpg", thumb: "assets/atlas/phil_29238_t.jpg",
      desc: "巨核细胞脱落的无核胞质碎片，体积小、常聚集成簇，参与止血凝血。", lookFor: "无核小碎片、成簇；减少见于血小板减少症。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29238"
    },
    {
      id: "atlas_phil_29071", cat: "血液学", name: "血小板",
      keyword: "platelets", philId: "29071",
      img: "assets/atlas/phil_29071.jpg", thumb: "assets/atlas/phil_29071_t.jpg",
      desc: "巨核细胞脱落的无核胞质碎片，体积小、常聚集成簇，参与止血凝血。", lookFor: "无核小碎片、成簇；减少见于血小板减少症。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29071"
    },
    {
      id: "atlas_phil_25924", cat: "血液学", name: "血小板",
      keyword: "platelets", philId: "25924",
      img: "assets/atlas/phil_25924.jpg", thumb: "assets/atlas/phil_25924_t.jpg",
      desc: "巨核细胞脱落的无核胞质碎片，体积小、常聚集成簇，参与止血凝血。", lookFor: "无核小碎片、成簇；减少见于血小板减少症。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 25924"
    },
    {
      id: "atlas_phil_25923", cat: "血液学", name: "血小板",
      keyword: "platelets", philId: "25923",
      img: "assets/atlas/phil_25923.jpg", thumb: "assets/atlas/phil_25923_t.jpg",
      desc: "巨核细胞脱落的无核胞质碎片，体积小、常聚集成簇，参与止血凝血。", lookFor: "无核小碎片、成簇；减少见于血小板减少症。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 25923"
    },
    {
      id: "atlas_phil_24791", cat: "血液学", name: "血小板",
      keyword: "platelets", philId: "24791",
      img: "assets/atlas/phil_24791.jpg", thumb: "assets/atlas/phil_24791_t.jpg",
      desc: "巨核细胞脱落的无核胞质碎片，体积小、常聚集成簇，参与止血凝血。", lookFor: "无核小碎片、成簇；减少见于血小板减少症。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 24791"
    },
    {
      id: "atlas_phil_25020", cat: "血液学", name: "骨髓涂片",
      keyword: "bone marrow", philId: "25020",
      img: "assets/atlas/phil_25020.jpg", thumb: "assets/atlas/phil_25020_t.jpg",
      desc: "骨髓涂片显微镜照片，显示造血细胞与脂肪间隙；用于贫血、白血病等评估。", lookFor: "各阶段造血细胞；注意粒/红比例与异常原始细胞。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 25020"
    },
    {
      id: "atlas_phil_24670", cat: "血液学", name: "骨髓涂片",
      keyword: "bone marrow", philId: "24670",
      img: "assets/atlas/phil_24670.jpg", thumb: "assets/atlas/phil_24670_t.jpg",
      desc: "骨髓涂片显微镜照片，显示造血细胞与脂肪间隙；用于贫血、白血病等评估。", lookFor: "各阶段造血细胞；注意粒/红比例与异常原始细胞。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 24670"
    },
    {
      id: "atlas_phil_21120", cat: "血液学", name: "骨髓涂片",
      keyword: "bone marrow", philId: "21120",
      img: "assets/atlas/phil_21120.jpg", thumb: "assets/atlas/phil_21120_t.jpg",
      desc: "骨髓涂片显微镜照片，显示造血细胞与脂肪间隙；用于贫血、白血病等评估。", lookFor: "各阶段造血细胞；注意粒/红比例与异常原始细胞。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 21120"
    },
    {
      id: "atlas_phil_19468", cat: "血液学", name: "骨髓涂片",
      keyword: "bone marrow", philId: "19468",
      img: "assets/atlas/phil_19468.jpg", thumb: "assets/atlas/phil_19468_t.jpg",
      desc: "骨髓涂片显微镜照片，显示造血细胞与脂肪间隙；用于贫血、白血病等评估。", lookFor: "各阶段造血细胞；注意粒/红比例与异常原始细胞。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 19468"
    },
    {
      id: "atlas_phil_19467", cat: "血液学", name: "骨髓涂片",
      keyword: "bone marrow", philId: "19467",
      img: "assets/atlas/phil_19467.jpg", thumb: "assets/atlas/phil_19467_t.jpg",
      desc: "骨髓涂片显微镜照片，显示造血细胞与脂肪间隙；用于贫血、白血病等评估。", lookFor: "各阶段造血细胞；注意粒/红比例与异常原始细胞。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 19467"
    },
    {
      id: "atlas_phil_30263", cat: "微生物学", name: "革兰染色涂片",
      keyword: "Gram stain", philId: "30263",
      img: "assets/atlas/phil_30263.jpg", thumb: "assets/atlas/phil_30263_t.jpg",
      desc: "革兰染色：紫蓝色为革兰阳性、红色为革兰阴性；观察菌体形态与排列。", lookFor: "G⁺ 紫蓝、G⁻ 红；结合形态（球菌/杆菌）与排列初步鉴定。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 30263"
    },
    {
      id: "atlas_phil_29266", cat: "微生物学", name: "革兰染色涂片",
      keyword: "Gram stain", philId: "29266",
      img: "assets/atlas/phil_29266.jpg", thumb: "assets/atlas/phil_29266_t.jpg",
      desc: "革兰染色：紫蓝色为革兰阳性、红色为革兰阴性；观察菌体形态与排列。", lookFor: "G⁺ 紫蓝、G⁻ 红；结合形态（球菌/杆菌）与排列初步鉴定。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29266"
    },
    {
      id: "atlas_phil_28744", cat: "微生物学", name: "革兰染色涂片",
      keyword: "Gram stain", philId: "28744",
      img: "assets/atlas/phil_28744.jpg", thumb: "assets/atlas/phil_28744_t.jpg",
      desc: "革兰染色：紫蓝色为革兰阳性、红色为革兰阴性；观察菌体形态与排列。", lookFor: "G⁺ 紫蓝、G⁻ 红；结合形态（球菌/杆菌）与排列初步鉴定。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 28744"
    },
        {
      id: "atlas_phil_24058", cat: "微生物学", name: "革兰染色涂片",
      keyword: "Gram stain", philId: "24058",
      img: "assets/atlas/phil_24058.jpg", thumb: "assets/atlas/phil_24058_t.jpg",
      desc: "革兰染色：紫蓝色为革兰阳性、红色为革兰阴性；观察菌体形态与排列。", lookFor: "G⁺ 紫蓝、G⁻ 红；结合形态（球菌/杆菌）与排列初步鉴定。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 24058"
    },
    {
      id: "atlas_phil_30264", cat: "微生物学", name: "念珠菌",
      keyword: "Candida", philId: "30264",
      img: "assets/atlas/phil_30264.jpg", thumb: "assets/atlas/phil_30264_t.jpg",
      desc: "念珠菌镜检可见酵母样孢子与假菌丝；常见于黏膜/阴道拭子及血流感染。", lookFor: "芽生孢子 + 假菌丝；需结合培养与临床。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 30264"
    },
    {
      id: "atlas_phil_28760", cat: "微生物学", name: "念珠菌",
      keyword: "Candida", philId: "28760",
      img: "assets/atlas/phil_28760.jpg", thumb: "assets/atlas/phil_28760_t.jpg",
      desc: "念珠菌镜检可见酵母样孢子与假菌丝；常见于黏膜/阴道拭子及血流感染。", lookFor: "芽生孢子 + 假菌丝；需结合培养与临床。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 28760"
    },
    {
      id: "atlas_phil_30708", cat: "微生物学", name: "真菌（菌丝/孢子）",
      keyword: "fungus", philId: "30708",
      img: "assets/atlas/phil_30708.jpg", thumb: "assets/atlas/phil_30708_t.jpg",
      desc: "真菌镜下照片：分隔菌丝与孢子；不同菌种形态差异大。", lookFor: "蓝色分隔菌丝 + 孢子；酵母/丝状菌形态各异，谨慎鉴别。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 30708"
    },
    {
      id: "atlas_phil_30707", cat: "微生物学", name: "真菌（菌丝/孢子）",
      keyword: "fungus", philId: "30707",
      img: "assets/atlas/phil_30707.jpg", thumb: "assets/atlas/phil_30707_t.jpg",
      desc: "真菌镜下照片：分隔菌丝与孢子；不同菌种形态差异大。", lookFor: "蓝色分隔菌丝 + 孢子；酵母/丝状菌形态各异，谨慎鉴别。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 30707"
    },
                                {
      id: "atlas_phil_29240", cat: "寄生虫学", name: "蓝氏贾第鞭毛虫",
      keyword: "Giardia", philId: "29240",
      img: "assets/atlas/phil_29240.jpg", thumb: "assets/atlas/phil_29240_t.jpg",
      desc: "十二指肠/粪便涂片可见滋养体（梨形、双核）与包囊。", lookFor: "梨形滋养体、双核；包囊椭圆、含轴丝；腹泻患者送检。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29240"
    },
    {
      id: "atlas_phil_28677", cat: "寄生虫学", name: "蓝氏贾第鞭毛虫",
      keyword: "Giardia", philId: "28677",
      img: "assets/atlas/phil_28677.jpg", thumb: "assets/atlas/phil_28677_t.jpg",
      desc: "十二指肠/粪便涂片可见滋养体（梨形、双核）与包囊。", lookFor: "梨形滋养体、双核；包囊椭圆、含轴丝；腹泻患者送检。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 28677"
    },
    {
      id: "atlas_phil_26772", cat: "寄生虫学", name: "蓝氏贾第鞭毛虫",
      keyword: "Giardia", philId: "26772",
      img: "assets/atlas/phil_26772.jpg", thumb: "assets/atlas/phil_26772_t.jpg",
      desc: "十二指肠/粪便涂片可见滋养体（梨形、双核）与包囊。", lookFor: "梨形滋养体、双核；包囊椭圆、含轴丝；腹泻患者送检。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 26772"
    },
    {
      id: "atlas_phil_24603", cat: "寄生虫学", name: "蓝氏贾第鞭毛虫",
      keyword: "Giardia", philId: "24603",
      img: "assets/atlas/phil_24603.jpg", thumb: "assets/atlas/phil_24603_t.jpg",
      desc: "十二指肠/粪便涂片可见滋养体（梨形、双核）与包囊。", lookFor: "梨形滋养体、双核；包囊椭圆、含轴丝；腹泻患者送检。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 24603"
    },
            {
      id: "atlas_phil_29256", cat: "寄生虫学", name: "原虫（镜下）",
      keyword: "protozoa", philId: "29256",
      img: "assets/atlas/phil_29256.jpg", thumb: "assets/atlas/phil_29256_t.jpg",
      desc: "原虫镜下照片（如阿米巴、鞭毛虫等）；依种别形态差异大。", lookFor: "注意运动方式、核数与包囊结构；结合粪便/组织标本。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29256"
    },
    {
      id: "atlas_phil_29255", cat: "寄生虫学", name: "原虫（镜下）",
      keyword: "protozoa", philId: "29255",
      img: "assets/atlas/phil_29255.jpg", thumb: "assets/atlas/phil_29255_t.jpg",
      desc: "原虫镜下照片（如阿米巴、鞭毛虫等）；依种别形态差异大。", lookFor: "注意运动方式、核数与包囊结构；结合粪便/组织标本。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29255"
    },
    {
      id: "atlas_phil_25731", cat: "组织学", name: "组织切片（组织学）",
      keyword: "histology", philId: "25731",
      img: "assets/atlas/phil_25731.jpg", thumb: "assets/atlas/phil_25731_t.jpg",
      desc: "组织学切片（常规染色）显微镜照片；显示器官组织结构。", lookFor: "辨认上皮、腺体、血管、间质等结构；注意层次与排列。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 25731"
    },
    {
      id: "atlas_phil_14973", cat: "组织学", name: "组织切片（组织学）",
      keyword: "histology", philId: "14973",
      img: "assets/atlas/phil_14973.jpg", thumb: "assets/atlas/phil_14973_t.jpg",
      desc: "组织学切片（常规染色）显微镜照片；显示器官组织结构。", lookFor: "辨认上皮、腺体、血管、间质等结构；注意层次与排列。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 14973"
    },
    {
      id: "atlas_phil_29472", cat: "组织学", name: "组织切片（H&E）",
      keyword: "tissue section", philId: "29472",
      img: "assets/atlas/phil_29472.jpg", thumb: "assets/atlas/phil_29472_t.jpg",
      desc: "组织切片 H&E 染色照片；细胞核蓝紫、胞质粉红。", lookFor: "核（蓝紫）与胞质（粉红）对比；观察细胞排列与间质。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29472"
    },
    {
      id: "atlas_phil_29471", cat: "组织学", name: "组织切片（H&E）",
      keyword: "tissue section", philId: "29471",
      img: "assets/atlas/phil_29471.jpg", thumb: "assets/atlas/phil_29471_t.jpg",
      desc: "组织切片 H&E 染色照片；细胞核蓝紫、胞质粉红。", lookFor: "核（蓝紫）与胞质（粉红）对比；观察细胞排列与间质。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29471"
    },
    {
      id: "atlas_phil_29383", cat: "组织学", name: "组织切片（H&E）",
      keyword: "tissue section", philId: "29383",
      img: "assets/atlas/phil_29383.jpg", thumb: "assets/atlas/phil_29383_t.jpg",
      desc: "组织切片 H&E 染色照片；细胞核蓝紫、胞质粉红。", lookFor: "核（蓝紫）与胞质（粉红）对比；观察细胞排列与间质。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29383"
    },
    {
      id: "atlas_phil_29382", cat: "组织学", name: "组织切片（H&E）",
      keyword: "tissue section", philId: "29382",
      img: "assets/atlas/phil_29382.jpg", thumb: "assets/atlas/phil_29382_t.jpg",
      desc: "组织切片 H&E 染色照片；细胞核蓝紫、胞质粉红。", lookFor: "核（蓝紫）与胞质（粉红）对比；观察细胞排列与间质。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29382"
    },
    {
      id: "atlas_phil_29381", cat: "组织学", name: "组织切片（H&E）",
      keyword: "tissue section", philId: "29381",
      img: "assets/atlas/phil_29381.jpg", thumb: "assets/atlas/phil_29381_t.jpg",
      desc: "组织切片 H&E 染色照片；细胞核蓝紫、胞质粉红。", lookFor: "核（蓝紫）与胞质（粉红）对比；观察细胞排列与间质。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29381"
    },
    {
      id: "atlas_phil_29281", cat: "组织学", name: "组织切片（H&E）",
      keyword: "tissue section", philId: "29281",
      img: "assets/atlas/phil_29281.jpg", thumb: "assets/atlas/phil_29281_t.jpg",
      desc: "组织切片 H&E 染色照片；细胞核蓝紫、胞质粉红。", lookFor: "核（蓝紫）与胞质（粉红）对比；观察细胞排列与间质。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29281"
    },
    {
      id: "atlas_phil_18898", cat: "细胞学", name: "细胞病理学涂片",
      keyword: "cytopathology", philId: "18898",
      img: "assets/atlas/phil_18898.jpg", thumb: "assets/atlas/phil_18898_t.jpg",
      desc: "细胞病理学涂片（如宫颈/痰液）显微镜照片；用于癌前病变与肿瘤筛查。", lookFor: "细胞大小、核质比、染色质与核仁异常；结合 TBS 等报告系统。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 18898"
    },
    {
      id: "atlas_phil_16203", cat: "细胞学", name: "细胞病理学涂片",
      keyword: "cytopathology", philId: "16203",
      img: "assets/atlas/phil_16203.jpg", thumb: "assets/atlas/phil_16203_t.jpg",
      desc: "细胞病理学涂片（如宫颈/痰液）显微镜照片；用于癌前病变与肿瘤筛查。", lookFor: "细胞大小、核质比、染色质与核仁异常；结合 TBS 等报告系统。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 16203"
    },
        {
      id: "atlas_phil_27007", cat: "细胞学", name: "精子（精液涂片）",
      keyword: "sperm", philId: "27007",
      img: "assets/atlas/phil_27007.jpg", thumb: "assets/atlas/phil_27007_t.jpg",
      desc: "精液涂片中精子显微镜照片；用于数量、形态与活动力评估。", lookFor: "蝌蚪形、有尾；注意头部形态异常比例（畸形率）。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 27007"
    },
    {
      id: "atlas_phil_27006", cat: "细胞学", name: "精子（精液涂片）",
      keyword: "sperm", philId: "27006",
      img: "assets/atlas/phil_27006.jpg", thumb: "assets/atlas/phil_27006_t.jpg",
      desc: "精液涂片中精子显微镜照片；用于数量、形态与活动力评估。", lookFor: "蝌蚪形、有尾；注意头部形态异常比例（畸形率）。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 27006"
    },
    {
      id: "atlas_phil_26572", cat: "细胞学", name: "精子（精液涂片）",
      keyword: "sperm", philId: "26572",
      img: "assets/atlas/phil_26572.jpg", thumb: "assets/atlas/phil_26572_t.jpg",
      desc: "精液涂片中精子显微镜照片；用于数量、形态与活动力评估。", lookFor: "蝌蚪形、有尾；注意头部形态异常比例（畸形率）。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 26572"
    },
    {
      id: "atlas_phil_26571", cat: "细胞学", name: "精子（精液涂片）",
      keyword: "sperm", philId: "26571",
      img: "assets/atlas/phil_26571.jpg", thumb: "assets/atlas/phil_26571_t.jpg",
      desc: "精液涂片中精子显微镜照片；用于数量、形态与活动力评估。", lookFor: "蝌蚪形、有尾；注意头部形态异常比例（畸形率）。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 26571"
    },
    {
      id: "atlas_phil_26570", cat: "细胞学", name: "精子（精液涂片）",
      keyword: "sperm", philId: "26570",
      img: "assets/atlas/phil_26570.jpg", thumb: "assets/atlas/phil_26570_t.jpg",
      desc: "精液涂片中精子显微镜照片；用于数量、形态与活动力评估。", lookFor: "蝌蚪形、有尾；注意头部形态异常比例（畸形率）。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 26570"
    },
    {
      id: "atlas_phil_24130", cat: "体液", name: "尿沉渣",
      keyword: "urine sediment", philId: "24130",
      img: "assets/atlas/phil_24130.jpg", thumb: "assets/atlas/phil_24130_t.jpg",
      desc: "尿沉渣显微镜照片；可见红细胞、白细胞、管型、结晶等。", lookFor: "红细胞/白细胞、透明/颗粒管型、结晶；辅助泌尿系统疾病判断。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 24130"
    },
    {
      id: "atlas_phil_29200", cat: "体液", name: "脑脊液（细胞学）",
      keyword: "cerebrospinal fluid", philId: "29200",
      img: "assets/atlas/phil_29200.jpg", thumb: "assets/atlas/phil_29200_t.jpg",
      desc: "脑脊液细胞学涂片显微镜照片；用于中枢感染与脑膜病变评估。", lookFor: "单个核细胞/中性粒细胞/异常细胞；结合生化与培养。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29200"
    },
    {
      id: "atlas_phil_29187", cat: "体液", name: "脑脊液（细胞学）",
      keyword: "cerebrospinal fluid", philId: "29187",
      img: "assets/atlas/phil_29187.jpg", thumb: "assets/atlas/phil_29187_t.jpg",
      desc: "脑脊液细胞学涂片显微镜照片；用于中枢感染与脑膜病变评估。", lookFor: "单个核细胞/中性粒细胞/异常细胞；结合生化与培养。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29187"
    },
    {
      id: "atlas_phil_29186", cat: "体液", name: "脑脊液（细胞学）",
      keyword: "cerebrospinal fluid", philId: "29186",
      img: "assets/atlas/phil_29186.jpg", thumb: "assets/atlas/phil_29186_t.jpg",
      desc: "脑脊液细胞学涂片显微镜照片；用于中枢感染与脑膜病变评估。", lookFor: "单个核细胞/中性粒细胞/异常细胞；结合生化与培养。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29186"
    },
    {
      id: "atlas_phil_29185", cat: "体液", name: "脑脊液（细胞学）",
      keyword: "cerebrospinal fluid", philId: "29185",
      img: "assets/atlas/phil_29185.jpg", thumb: "assets/atlas/phil_29185_t.jpg",
      desc: "脑脊液细胞学涂片显微镜照片；用于中枢感染与脑膜病变评估。", lookFor: "单个核细胞/中性粒细胞/异常细胞；结合生化与培养。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29185"
    },
    {
      id: "atlas_phil_29184", cat: "体液", name: "脑脊液（细胞学）",
      keyword: "cerebrospinal fluid", philId: "29184",
      img: "assets/atlas/phil_29184.jpg", thumb: "assets/atlas/phil_29184_t.jpg",
      desc: "脑脊液细胞学涂片显微镜照片；用于中枢感染与脑膜病变评估。", lookFor: "单个核细胞/中性粒细胞/异常细胞；结合生化与培养。",
      source: "美国 CDC 公共卫生图像库（PHIL）", license: "Public Domain · 美国联邦政府作品，可商用，无需署名", credit: "Source: CDC / PHIL, ID 29184"
    },
  ];

  // ---------------- 复习库示例题库（演示用，用户可删除后自建） ----------------
  // 首次打开「复习库」且为空时自动载入，供师生先看样例、再自行上传题目。
  const LIB = [
    { id: 'lib_demo_cat_pharm', type: 'cat', name: '药理学', desc: '作用于各系统的代表药物', cover: '' },
    { id: 'lib_demo_item_atropine', type: 'item', catId: 'lib_demo_cat_pharm',
      question: '阿托品属于哪一类药？其主要药理作用与典型临床应用有哪些？',
      answer: 'M 胆碱受体阻断药（抗胆碱药）。\n核心作用：抑制腺体分泌、散瞳、松弛内脏平滑肌（解痉）、加快心率、大剂量扩张血管。\n临床：麻醉前给药、缓慢性心律失常、内脏绞痛、有机磷中毒解救、散瞳验光。',
      photos: [], box: 1, due: Date.now(), createdAt: Date.now() },
    { id: 'lib_demo_item_penicillin', type: 'item', catId: 'lib_demo_cat_pharm',
      question: '青霉素最主要的不良反应是什么？过敏性休克应怎样抢救？',
      answer: '最主要且最危险的是变态反应，严重者发生过敏性休克。\n抢救：立即停用，肌注/皮下注射肾上腺素（首选），保持气道通畅、给氧，必要时糖皮质激素与抗组胺药，静脉补液并监测血压心率。用药前须询问过敏史并皮试。',
      photos: [], box: 1, due: Date.now(), createdAt: Date.now() },
    { id: 'lib_demo_item_nitro', type: 'item', catId: 'lib_demo_cat_pharm',
      question: '硝酸甘油抗心绞痛的主要作用机制是什么？',
      answer: '在血管内皮与平滑肌释放 NO，激活鸟苷酸环化酶，松弛血管平滑肌；以扩张静脉（容量血管）为主，减少回心血量（前负荷），并扩张冠脉，缓解心肌缺血。舌下含服起效快。',
      photos: [], box: 1, due: Date.now(), createdAt: Date.now() },

    { id: 'lib_demo_cat_internal', type: 'cat', name: '内科学', desc: '常见疾病的识别与处理', cover: '' },
    { id: 'lib_demo_item_mi', type: 'item', catId: 'lib_demo_cat_internal',
      question: '急性心肌梗死的胸痛有何典型特征？',
      answer: '胸骨后或心前区剧烈压榨样、闷胀样疼痛，可放射至左肩、左臂、下颌；持续 >20–30 分钟，含服硝酸甘油多不缓解；常伴大汗、恶心、濒死感。需立即就医、心电图与心肌酶检查。',
      photos: [], box: 1, due: Date.now(), createdAt: Date.now() },
    { id: 'lib_demo_item_t2dm', type: 'item', catId: 'lib_demo_cat_internal',
      question: '2 型糖尿病口服药物治疗的一线首选是什么？',
      answer: '若无禁忌，二甲双胍（metformin）为一线首选：改善外周胰岛素敏感性、抑制肝糖输出，不增加体重、单用较少引起低血糖。须配合饮食与运动。',
      photos: [], box: 1, due: Date.now(), createdAt: Date.now() },

    { id: 'lib_demo_cat_surg', type: 'cat', name: '外科学', desc: '无菌观念与术后管理', cover: '' },
    { id: 'lib_demo_item_aseptic', type: 'item', catId: 'lib_demo_cat_surg',
      question: '外科手术中"无菌术"的核心原则有哪些？',
      answer: '灭菌（杀灭包括芽孢在内的全部微生物）、严格无菌观念；已灭菌物品与未灭菌物品分开放置、不可交叉；操作中手与无菌区不得接触有菌区；一经污染或疑污染即视为有菌。',
      photos: [], box: 1, due: Date.now(), createdAt: Date.now() },
    { id: 'lib_demo_item_ssi', type: 'item', catId: 'lib_demo_cat_surg',
      question: '术后手术部位感染（SSI）最常见的致病菌是什么？',
      answer: '以金黄色葡萄球菌（含 MRSA）最常见；也可由大肠埃希菌、铜绿假单胞菌等引起。预防靠无菌操作、围术期预防性抗生素、血糖与体温管理。',
      photos: [], box: 1, due: Date.now(), createdAt: Date.now() },

    { id: 'lib_demo_cat_para', type: 'cat', name: '寄生虫学', desc: '与镜下图谱对应的常见寄生虫', cover: '' },
    { id: 'lib_demo_item_cerebral', type: 'item', catId: 'lib_demo_cat_para',
      question: '恶性疟原虫为什么会引起脑型疟？',
      answer: '感染红细胞表面表达 PfEMP1 等黏附分子，黏附于脑微血管内皮，造成微血管阻塞、脑组织缺血缺氧及炎症反应，出现意识障碍、惊厥等脑型疟表现。',
      photos: [], box: 1, due: Date.now(), createdAt: Date.now() },
    { id: 'lib_demo_item_ascaris', type: 'item', catId: 'lib_demo_cat_para',
      question: '蛔虫（Ascaris lumbricoides）的主要感染途径是什么？',
      answer: '经口感染：食入被感染性虫卵污染的手、食物或水，虫卵在小肠孵化为幼虫，移行至肺再回肠腔发育为成虫。注意个人卫生与饮食卫生是关键预防。',
      photos: [], box: 1, due: Date.now(), createdAt: Date.now() }
  ];

  global.SEED = { SOPS: SOPS.map((s) => ({ ...s, builtin: true, id: s.id })), COMPAT, ATLAS, LIB, uid };
})(window);
