// LogPilot 产品发布 PPT
// 生成: node build.js
const pptxgen = require('pptxgenjs');

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.3" x 7.5"
pres.title = 'LogPilot — AI 日志裁剪与缺陷分诊助手';
pres.author = 'LogPilot Team';

// ── 色板 ──────────────────────────────────────────────────────────────────
const C = {
  navy: '1E2761',
  deep: '0B1A3F',
  teal: '065A82',
  indigo: '6366F1',
  amber: 'F59E0B',
  green: '10B981',
  red: 'EF4444',
  bg: 'F7F8FB',
  white: 'FFFFFF',
  text: '0F172A',
  textSoft: '475569',
  textDim: '94A3B8',
  border: 'E4E7EC',
  card: 'FFFFFF',
};

const F = {
  head: 'Microsoft YaHei',
  body: 'Microsoft YaHei',
  mono: 'Consolas',
};

const TOTAL = 14;

function addFooter(slide, pageNo, total) {
  slide.addText('LogPilot · AI 日志裁剪与缺陷分诊助手', {
    x: 0.5, y: 7.05, w: 8, h: 0.3,
    fontSize: 9, color: C.textDim, fontFace: F.body, margin: 0,
  });
  slide.addText(`${pageNo} / ${total}`, {
    x: 12.0, y: 7.05, w: 0.8, h: 0.3,
    fontSize: 9, color: C.textDim, fontFace: F.body, align: 'right', margin: 0,
  });
}

function addPageTitle(slide, title, subtitle) {
  slide.addText(title, {
    x: 0.5, y: 0.4, w: 12.3, h: 0.7,
    fontSize: 28, bold: true, color: C.navy, fontFace: F.head, margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 1.05, w: 12.3, h: 0.4,
      fontSize: 13, color: C.textSoft, fontFace: F.body, margin: 0,
    });
  }
}

function addDarkFooter(slide, pageNo, total) {
  slide.addText('LogPilot · AI 日志裁剪与缺陷分诊助手', {
    x: 0.5, y: 7.05, w: 8, h: 0.3,
    fontSize: 9, color: '64748B', fontFace: F.body, margin: 0,
  });
  slide.addText(`${pageNo} / ${total}`, {
    x: 12.0, y: 7.05, w: 0.8, h: 0.3,
    fontSize: 9, color: '64748B', fontFace: F.body, align: 'right', margin: 0,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Slide 1：封面
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.deep };

  s.addShape(pres.shapes.OVAL, {
    x: 1.0, y: 2.5, w: 0.45, h: 0.45,
    fill: { color: C.indigo }, line: { color: C.indigo, width: 0 },
  });
  s.addShape(pres.shapes.OVAL, {
    x: 0.92, y: 2.42, w: 0.6, h: 0.6,
    fill: { color: 'FFFFFF', transparency: 90 }, line: { color: C.indigo, width: 0 },
  });

  s.addText('LogPilot', {
    x: 1.7, y: 2.3, w: 10, h: 1.0,
    fontSize: 64, bold: true, color: C.white, fontFace: F.head, margin: 0,
  });
  s.addText('AI 日志裁剪与缺陷分诊助手', {
    x: 1.7, y: 3.35, w: 10, h: 0.5,
    fontSize: 22, color: 'CADCFC', fontFace: F.body, margin: 0,
  });
  s.addText('万行日志 → 证据驱动的分诊报告，5 秒出结果', {
    x: 1.7, y: 3.95, w: 10.5, h: 0.5,
    fontSize: 14, color: '94A3B8', italic: true, fontFace: F.body, margin: 0,
  });

  s.addShape(pres.shapes.LINE, {
    x: 1.0, y: 5.6, w: 1.5, h: 0,
    line: { color: C.indigo, width: 2 },
  });
  s.addText('产品发布 · 2026', {
    x: 1.0, y: 5.7, w: 6, h: 0.3,
    fontSize: 11, color: C.textDim, fontFace: F.body, charSpacing: 4, margin: 0,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Slide 2：场景 — 一个真实的排查故事
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addPageTitle(s, '一个真实的排查故事', '每个做车机/App 的工程师都经历过');

  const story = [
    { time: '14:27', event: '测试提单：导出功能点击后页面卡死', color: C.amber },
    { time: '14:28', event: '研发要来复现日志 — 10 MB，87 000 行', color: C.textSoft },
    { time: '14:30', event: '开始 grep 包名 → 找到 2000 行 → 哪段是卡死那一次？', color: C.textSoft },
    { time: '14:45', event: '终于找到 PID → 又发现进程中间重启过，哪次才是？', color: C.textSoft },
    { time: '15:10', event: '发现 ANR 日志 → 但 ANR 是系统打的，归谁？', color: C.red },
    { time: '15:30', event: '写到 Jira："复现一下" — 1 小时过去了，结论 0 条', color: C.red },
  ];

  story.forEach((item, i) => {
    const y = 1.8 + i * 0.85;
    // 时间轴圆点
    s.addShape(pres.shapes.OVAL, {
      x: 1.0, y: y + 0.15, w: 0.25, h: 0.25,
      fill: { color: item.color }, line: { color: item.color, width: 0 },
    });
    if (i < story.length - 1) {
      s.addShape(pres.shapes.LINE, {
        x: 1.11, y: y + 0.4, w: 0, h: 0.45,
        line: { color: C.border, width: 1.5 },
      });
    }
    // 时间
    s.addText(item.time, {
      x: 1.5, y, w: 1.0, h: 0.55,
      fontSize: 14, bold: true, color: C.text, fontFace: F.mono, margin: 0,
    });
    // 事件
    s.addText(item.event, {
      x: 2.7, y, w: 9.5, h: 0.55,
      fontSize: 13, color: item.color, fontFace: F.body, margin: 0,
    });
  });

  // 底部总结
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 6.2, w: 12.3, h: 0.6,
    fill: { color: 'FEF2F2' }, line: { color: 'FECACA', width: 1 },
  });
  s.addText('1 小时排查，0 条证据级结论 — 日志不是没有信息，是人的注意力撑不住 90 000 行', {
    x: 0.8, y: 6.25, w: 11.7, h: 0.5,
    fontSize: 13, bold: true, color: C.red, fontFace: F.body, valign: 'middle', margin: 0,
  });

  addFooter(s, 2, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// Slide 3：痛点量化
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addPageTitle(s, '排查现场的真实痛点', '这不是个例 — 是每天都在发生的团队级浪费');

  const pains = [
    { stat: '10 MB', label: '单次复现日志', desc: '87 000 行起步，目标 App 有效信息不到 2%' },
    { stat: '0.5~2h', label: '人工定位耗时', desc: 'grep + 翻页 + 笔记，注意力极易疲劳' },
    { stat: '40%+', label: '根因被误归因', desc: 'ANR / Watchdog 频繁被记到无辜进程头上' },
    { stat: '∞', label: '工具碎片化', desc: '每个团队各一套脚本、白名单、grep 指令' },
  ];

  pains.forEach((p, i) => {
    const x = 0.5 + i * 3.15;
    const y = 1.9;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 2.95, h: 4.6,
      fill: { color: C.card },
      line: { color: C.border, width: 1 },
      shadow: { type: 'outer', blur: 8, offset: 2, angle: 90, color: '000000', opacity: 0.05 },
    });
    s.addText(p.stat, {
      x: x + 0.2, y: y + 0.4, w: 2.55, h: 1.4,
      fontSize: 44, bold: true, color: C.amber, fontFace: F.head, margin: 0,
    });
    s.addText(p.label, {
      x: x + 0.2, y: y + 1.85, w: 2.55, h: 0.5,
      fontSize: 14, bold: true, color: C.text, fontFace: F.head, margin: 0,
    });
    s.addText(p.desc, {
      x: x + 0.2, y: y + 2.45, w: 2.55, h: 1.8,
      fontSize: 11, color: C.textSoft, fontFace: F.body, margin: 0,
    });
  });

  addFooter(s, 3, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// Slide 4：产品愿景 — 一句话
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addPageTitle(s, 'LogPilot 要做的事', '把 1 小时的日志翻阅，变成 5 秒的证据呈现');

  // 核心愿景条
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.7, w: 12.3, h: 1.3,
    fill: { color: C.navy }, line: { color: C.navy, width: 0 },
  });
  s.addText('用户提供复现时间窗口 + 相关包名\nLogPilot 自动追踪 PID 生命周期 → 动态发现 Tag → 裁剪万行日志 → AI 生成可回填 Jira 的分诊报告', {
    x: 0.9, y: 1.85, w: 11.5, h: 1.0,
    fontSize: 15, color: C.white, fontFace: F.body, italic: true, margin: 0,
    valign: 'middle',
  });

  // 三个关键词
  const keys = [
    { num: '01', title: '确定性日志工程', desc: 'PID 生命周期追踪替代静态白名单\n系统事件强制标注来源，禁止误归因\n每条结论可追溯到日志行号', color: C.indigo },
    { num: '02', title: '动态 Tag 发现', desc: '不维护任何业务 Tag 白名单\n按 (pkg, pid, tag) 聚合频次与级别\n新业务模块上线零改动即可分析', color: C.teal },
    { num: '03', title: 'AI 分诊报告', desc: '只传结构化摘要（kB），不传原始日志\n事实 / 推测 / 待查 三段分离\n一键复制 Jira 评论版', color: C.navy },
  ];

  keys.forEach((k, i) => {
    const x = 0.5 + i * 4.2;
    const y = 3.4;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.0, h: 3.0,
      fill: { color: C.bg }, line: { color: C.border, width: 1 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.08, h: 3.0,
      fill: { color: k.color }, line: { color: k.color, width: 0 },
    });
    s.addText(k.num, {
      x: x + 0.25, y: y + 0.2, w: 0.6, h: 0.35,
      fontSize: 11, bold: true, color: k.color, fontFace: F.mono, margin: 0,
    });
    s.addText(k.title, {
      x: x + 0.25, y: y + 0.6, w: 3.5, h: 0.5,
      fontSize: 18, bold: true, color: C.text, fontFace: F.head, margin: 0,
    });
    s.addText(k.desc, {
      x: x + 0.25, y: y + 1.2, w: 3.5, h: 1.6,
      fontSize: 11, color: C.textSoft, fontFace: F.body, valign: 'top', margin: 0,
      paraSpaceAfter: 3,
    });
  });

  addFooter(s, 4, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// Slide 5：用户工作流 — 6 步出报告
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addPageTitle(s, '从原始日志到 Jira 报告，6 步完成', '全程 < 10 秒，人工只做第一步和最后一步');

  const steps = [
    { n: '1', t: '上传日志', d: '拖拽 .log 文件\n或粘贴 logcat 文本' },
    { n: '2', t: '指定窗口', d: '问题发生时间点\n或起止区间' },
    { n: '3', t: '填入包名', d: '一个或多个\n相关 App 进程名' },
    { n: '4', t: '点击分析', d: '后端流水线 < 1s\n自动跑完全链路' },
    { n: '5', t: '查看证据', d: 'PID / Tag / 时间线\n三视图联动' },
    { n: '6', t: 'AI 报告', d: '一键复制\nJira 评论版' },
  ];

  steps.forEach((st, i) => {
    const x = 0.5 + i * 2.13;
    const y = 2.0;
    const w = 2.0;
    s.addShape(pres.shapes.OVAL, {
      x: x + w / 2 - 0.4, y, w: 0.8, h: 0.8,
      fill: { color: C.indigo }, line: { color: C.indigo, width: 0 },
    });
    s.addText(st.n, {
      x: x + w / 2 - 0.4, y, w: 0.8, h: 0.8,
      fontSize: 24, bold: true, color: C.white, fontFace: F.head,
      align: 'center', valign: 'middle', margin: 0,
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: y + 1.0, w, h: 2.0,
      fill: { color: C.white }, line: { color: C.border, width: 1 },
      shadow: { type: 'outer', blur: 6, offset: 2, angle: 90, color: '000000', opacity: 0.05 },
    });
    s.addText(st.t, {
      x, y: y + 1.15, w, h: 0.5,
      fontSize: 15, bold: true, color: C.navy, fontFace: F.head, align: 'center', margin: 0,
    });
    s.addText(st.d, {
      x: x + 0.15, y: y + 1.7, w: w - 0.3, h: 1.2,
      fontSize: 10.5, color: C.textSoft, fontFace: F.body, align: 'center', margin: 0,
    });

    if (i < steps.length - 1) {
      s.addShape(pres.shapes.LINE, {
        x: x + w + 0.02, y: y + 0.4, w: 0.1, h: 0,
        line: { color: C.textDim, width: 1.5, endArrowType: 'triangle' },
      });
    }
  });

  s.addText('步骤 1~3 人工输入，步骤 4~6 自动完成。AI 只在最后一步介入，输入是结构化证据而非原始日志。', {
    x: 0.5, y: 6.0, w: 12.3, h: 0.5,
    fontSize: 12, italic: true, color: C.textSoft, fontFace: F.body, align: 'center', margin: 0,
  });

  addFooter(s, 5, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// Slide 6：Demo 截图 / 场景演示 — 用文字模拟界面
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addPageTitle(s, 'Demo：一份 10MB 日志的分析全过程', '从上传到出报告，全程不到 10 秒');

  // 左侧：输入
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.7, w: 5.8, h: 5.0,
    fill: { color: C.bg }, line: { color: C.border, width: 1 },
  });
  s.addText('输入', {
    x: 0.8, y: 1.85, w: 2.0, h: 0.4,
    fontSize: 14, bold: true, color: C.indigo, fontFace: F.head, margin: 0,
  });
  const inputLines = [
    { label: '日志文件', value: 'bug_export_0520.log  (87 432 行)', mono: false },
    { label: '时间窗口', value: '10:00:00 — 10:05:00', mono: false },
    { label: '包名', value: 'com.example.app, com.example.helper', mono: false },
    { label: '问题描述', value: '点击导出按钮后页面卡死', mono: false },
  ];
  inputLines.forEach((il, i) => {
    const y = 2.5 + i * 0.65;
    s.addText(il.label, {
      x: 0.8, y, w: 1.8, h: 0.35,
      fontSize: 11, bold: true, color: C.text, fontFace: F.body, margin: 0,
    });
    s.addText(il.value, {
      x: 2.6, y, w: 3.5, h: 0.35,
      fontSize: 11, color: C.textSoft, fontFace: F.body, margin: 0,
    });
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y: 5.3, w: 5.2, h: 1.1,
    fill: { color: C.navy }, line: { color: C.navy, width: 0 },
  });
  s.addText('点击「开始分析」', {
    x: 0.8, y: 5.3, w: 5.2, h: 1.1,
    fontSize: 20, bold: true, color: C.white, fontFace: F.head,
    align: 'center', valign: 'middle', margin: 0,
  });

  // 右侧：输出
  s.addShape(pres.shapes.RECTANGLE, {
    x: 6.8, y: 1.7, w: 6.0, h: 5.0,
    fill: { color: C.bg }, line: { color: C.border, width: 1 },
  });
  s.addText('输出（< 1 秒完成）', {
    x: 7.1, y: 1.85, w: 4.0, h: 0.4,
    fontSize: 14, bold: true, color: C.green, fontFace: F.head, margin: 0,
  });

  const outputItems = [
    { tag: 'PID', text: 'app: PID 2100 (10:00:00 → 10:00:05 has died)\n         PID 3300 重启 (10:00:05 → 窗口结束)\nhelper: PID 3500 (10:00:01 → 10:00:06 Killing)' },
    { tag: 'Tag', text: 'AppCore — 11 次 (D:5 W:1 E:5) ⚠ 异常密集\nHelperCore — 2 次 (D:1 I:1)' },
    { tag: '时间线', text: '13 个事件（6 系统事件 + 7 目标事件）\nANR / Watchdog / Input timeout → 来源: system:*\n×7 重复事件压缩为 1 条，保留行号 500' },
    { tag: 'AI', text: '事实：PID 重启 1 次、AppCore 异常密集\n假设：可能存在资源竞争 [→ line 500]\n待查：是否有用户操作日志\nJira 评论：已生成，一键复制' },
  ];
  outputItems.forEach((oi, i) => {
    const y = 2.45 + i * 1.05;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 7.0, y, w: 0.7, h: 0.35,
      fill: { color: C.indigo }, line: { color: C.indigo, width: 0 },
    });
    s.addText(oi.tag, {
      x: 7.0, y, w: 0.7, h: 0.35,
      fontSize: 9, bold: true, color: C.white, fontFace: F.mono,
      align: 'center', valign: 'middle', margin: 0,
    });
    s.addText(oi.text, {
      x: 7.85, y: y - 0.05, w: 4.8, h: 0.95,
      fontSize: 9.5, color: C.text, fontFace: F.mono, valign: 'top', margin: 0,
    });
  });

  addFooter(s, 6, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// Slide 7：核心能力详解 — 数据处理流水线
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addPageTitle(s, '7 步数据处理流水线', '万行日志如何被压成一份证据驱动的报告');

  const steps = [
    { t: '1. 日志解析',        d: '兼容车机 dump\n+ 标准 adb logcat\n保留无法解析行', col: C.indigo },
    { t: '2. 时间窗口',        d: 'HH:MM:SS 区间\n单点默认 ±5min\n过滤窗口外', col: C.indigo },
    { t: '3. PID 生命周期',    d: '启动 / 重启 / 死亡\n多 PID 片段\n窗口边界兜底', col: C.teal },
    { t: '4. Tag 分析',        d: '频次 / level / 起止\n动态 Tag 发现\n≥3 错误标异常', col: C.teal },
    { t: '5. 系统事件',        d: 'ANR / Watchdog\nFATAL / Killing\n不归因目标 PID', col: C.navy },
    { t: '6. 时间线',          d: '按时间排序合并\n相邻重复事件压缩\n保留首样例行号', col: C.navy },
    { t: '7. AI 分诊',         d: '事实 / 假设 / 待查\n证据带 line_no\n生成 Jira 评论', col: C.amber },
  ];

  const totalW = 12.3;
  const gap = 0.3;
  const stepW = (totalW - gap * 6) / 7;
  steps.forEach((s2, i) => {
    const x = 0.5 + i * (stepW + gap);
    const y = 2.0;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: stepW, h: 3.4,
      fill: { color: C.white }, line: { color: C.border, width: 1 },
      shadow: { type: 'outer', blur: 6, offset: 2, angle: 90, color: '000000', opacity: 0.06 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: stepW, h: 0.55,
      fill: { color: s2.col }, line: { color: s2.col, width: 0 },
    });
    s.addText(s2.t, {
      x: x + 0.05, y: y + 0.05, w: stepW - 0.1, h: 0.45,
      fontSize: 11, bold: true, color: C.white, fontFace: F.head,
      align: 'center', valign: 'middle', margin: 0,
    });
    s.addText(s2.d, {
      x: x + 0.1, y: y + 0.7, w: stepW - 0.2, h: 2.6,
      fontSize: 11, color: C.text, fontFace: F.body,
      align: 'center', valign: 'top', margin: 0,
      paraSpaceAfter: 4,
    });

    if (i < steps.length - 1) {
      const ax = x + stepW + 0.03;
      s.addShape(pres.shapes.LINE, {
        x: ax, y: y + 1.7, w: gap - 0.06, h: 0,
        line: { color: C.textDim, width: 1.5, endArrowType: 'triangle' },
      });
    }
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 5.7, w: 12.3, h: 0.9,
    fill: { color: C.navy }, line: { color: C.navy, width: 0 },
  });
  s.addText([
    { text: '输入：',  options: { bold: true, color: 'CADCFC' } },
    { text: '日志文件 + 时间窗口 + 多包名     ', options: { color: C.white } },
    { text: '输出：',  options: { bold: true, color: 'CADCFC' } },
    { text: 'PID 生命周期 · Tag 统计 · 跨包名时间线 · AI 分诊报告', options: { color: C.white } },
  ], {
    x: 0.8, y: 5.75, w: 11.7, h: 0.8,
    fontSize: 12, fontFace: F.body, valign: 'middle', margin: 0,
  });

  addFooter(s, 7, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// Slide 8：技术亮点 — 和通用方案的差异
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addPageTitle(s, '为什么不用 grep + ChatGPT？', '把 LogPilot 与"直接把日志丢给 AI"放在一起看');

  const rows = [
    ['维度',              'grep + 脚本',           '通用 AI（直接喂日志）',    'LogPilot'],
    ['日志范围裁剪',      'grep 模式手工堆叠',       '截断或撑爆 context',     'PID 生命周期 + 时间窗口确定性裁剪'],
    ['Tag 维护',          '静态白名单，需求变就改',  '不裁剪，全量传',           '动态发现，零维护'],
    ['系统事件归因',      '人工肉眼判断',            '模型容易"看图说话"',      'system:<tag> 显式来源，禁止误归因'],
    ['结论可追溯',        '依赖工程师笔记',          '可能编造行号',            '每条证据带 line_no'],
    ['敏感数据 / API key', '本地脚本相对安全',       '上传日志风险大',          '后端代理 + .env.local 隔离'],
    ['维护成本',          '高（脚本越来越多）',       '低，但质量不稳',          '低且确定'],
  ];

  const tableX = 0.5, tableY = 1.7;
  const colW = [2.4, 3.3, 3.3, 3.3];
  const rowH = 0.6;
  rows.forEach((r, ri) => {
    let cx = tableX;
    r.forEach((cell, ci) => {
      const isHead = ri === 0;
      const isLpCol = ci === 3;
      let fillColor = isHead ? C.navy : (ri % 2 === 0 ? C.bg : C.white);
      if (isLpCol && !isHead) fillColor = 'EEF2FF';
      s.addShape(pres.shapes.RECTANGLE, {
        x: cx, y: tableY + ri * rowH, w: colW[ci], h: rowH,
        fill: { color: fillColor }, line: { color: C.border, width: 0.75 },
      });
      s.addText(cell, {
        x: cx + 0.1, y: tableY + ri * rowH, w: colW[ci] - 0.2, h: rowH,
        fontSize: isHead ? 12 : 11,
        bold: isHead || (isLpCol && !isHead) || ci === 0,
        color: isHead ? C.white : (isLpCol && !isHead ? C.indigo : C.text),
        fontFace: F.body, valign: 'middle', margin: 0,
      });
      cx += colW[ci];
    });
  });

  addFooter(s, 8, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// Slide 9：三条红线
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addPageTitle(s, '三条红线', '把 LogPilot 和"AI 客户端"区分开的核心规则');

  const rules = [
    {
      tag: 'R3', title: '不下根因结论',
      desc: 'AI 输出只能区分"事实 / 假设 / 缺失信息"。系统事件 source 强制标 system:<tag>，绝不无证据归因到目标 App。',
      ex: '✗  AI 说："根因是 com.demo.musicapp 内存泄漏"\n✓  AI 说："事实：5 次 Network timeout / 假设：网络栈问题 / 待查：底层无线日志"',
    },
    {
      tag: 'R6', title: '动态 Tag 发现',
      desc: '不维护任何业务 Tag 白名单。Tag 是日志数据驱动的，新业务模块上线无需改一行代码即可分析。',
      ex: '维护成本：0\n覆盖范围：随日志输入自动扩展',
    },
    {
      tag: 'R7', title: '可解释 / 证据可追溯',
      desc: '每条 Tag 统计有 first_seen / last_seen；时间线每条带 line_no；压缩后的重复事件保留首样例行号 — 永远能跳回原日志。',
      ex: '点击时间线任意一条 → 可定位到具体行号\n压缩×5 的事件 → 仍能看到首个证据样例',
    },
  ];

  rules.forEach((r, i) => {
    const y = 1.7 + i * 1.75;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 1.5, h: 1.5,
      fill: { color: C.navy }, line: { color: C.navy, width: 0 },
    });
    s.addText(r.tag, {
      x: 0.5, y: y + 0.25, w: 1.5, h: 0.5,
      fontSize: 28, bold: true, color: C.amber, fontFace: F.head,
      align: 'center', margin: 0,
    });
    s.addText(r.title, {
      x: 0.5, y: y + 0.85, w: 1.5, h: 0.5,
      fontSize: 11, color: C.white, fontFace: F.body, align: 'center', margin: 0,
    });

    s.addShape(pres.shapes.RECTANGLE, {
      x: 2.1, y, w: 10.7, h: 1.5,
      fill: { color: C.bg }, line: { color: C.border, width: 1 },
    });
    s.addText(r.desc, {
      x: 2.35, y: y + 0.15, w: 10.2, h: 0.7,
      fontSize: 12, color: C.text, fontFace: F.body, margin: 0,
    });
    s.addText(r.ex, {
      x: 2.35, y: y + 0.85, w: 10.2, h: 0.6,
      fontSize: 10, color: C.textSoft, fontFace: F.mono, italic: true, margin: 0,
    });
  });

  addFooter(s, 9, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// Slide 10：系统架构
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addPageTitle(s, '系统架构', '前端 React · 后端 Express · AI Provider 三层分离');

  const layers = [
    {
      name: '前端 (React + Vite)',
      sub: '浏览器 UI · 上传 / 时间窗口 / 包名 · 结果可视化',
      items: ['拖拽上传', '时间窗口 / 包名', 'PID / Tag / 时间线视图', 'AI 报告 + Jira 复制'],
      color: C.indigo, y: 1.8,
    },
    {
      name: '后端 (Node.js + Express)',
      sub: '日志处理流水线 · AI Provider 代理（保护 API key）',
      items: ['logParser', 'pidTracker / tagAnalyzer', 'systemEventExtractor / timelineBuilder', 'AiProvider (mock / DeepSeek)'],
      color: C.teal, y: 3.65,
    },
    {
      name: 'AI Provider',
      sub: '本地 mock 默认开启 · DeepSeek API 经后端代理，key 留 .env.local',
      items: ['mock 默认开启', '统一抽象接口', 'DeepSeek API'],
      color: C.navy, y: 5.5,
    },
  ];

  layers.forEach((L) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: L.y, w: 2.5, h: 1.4,
      fill: { color: L.color }, line: { color: L.color, width: 0 },
    });
    s.addText(L.name, {
      x: 0.65, y: L.y + 0.25, w: 2.3, h: 0.5,
      fontSize: 14, bold: true, color: C.white, fontFace: F.head, margin: 0,
    });
    s.addText(L.sub, {
      x: 0.65, y: L.y + 0.75, w: 2.3, h: 0.6,
      fontSize: 9.5, color: 'CADCFC', fontFace: F.body, margin: 0,
    });

    s.addShape(pres.shapes.RECTANGLE, {
      x: 3.0, y: L.y, w: 9.8, h: 1.4,
      fill: { color: C.bg }, line: { color: C.border, width: 1 },
    });
    L.items.forEach((it, i) => {
      const bw = 9.4 / L.items.length;
      const bx = 3.2 + i * bw;
      s.addShape(pres.shapes.RECTANGLE, {
        x: bx, y: L.y + 0.3, w: bw - 0.2, h: 0.8,
        fill: { color: C.white }, line: { color: L.color, width: 1.5 },
      });
      s.addText(it, {
        x: bx + 0.05, y: L.y + 0.3, w: bw - 0.3, h: 0.8,
        fontSize: 10, color: C.text, fontFace: F.mono, align: 'center', valign: 'middle', margin: 0,
      });
    });
  });

  [2.95, 4.8].forEach((y) => {
    s.addShape(pres.shapes.LINE, {
      x: 7.9, y, w: 0, h: 0.6,
      line: { color: C.textDim, width: 1.5, endArrowType: 'triangle' },
    });
  });

  addFooter(s, 10, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// Slide 11：交付成果
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  s.addText('交付成果', {
    x: 0.5, y: 0.4, w: 12.3, h: 0.7,
    fontSize: 28, bold: true, color: C.white, fontFace: F.head, margin: 0,
  });
  s.addText('全链路功能已完整交付，自动化验证 105 项全部通过', {
    x: 0.5, y: 1.05, w: 12.3, h: 0.4,
    fontSize: 13, color: 'CADCFC', fontFace: F.body, margin: 0,
  });

  const stats = [
    { n: '57', l: '单元测试', s: '7 个测试文件，全部通过' },
    { n: '105', l: '自动化验证条目', s: '覆盖全部人工验证清单' },
    { n: '7', l: '流水线模块', s: 'parser · pidTracker · tagAnalyzer\nsystemEvent · timeline · reportInput · AI' },
    { n: '6', l: '类系统事件', s: 'ANR / Watchdog / FATAL\nKilling / LMK / Input timeout' },
  ];
  stats.forEach((st, i) => {
    const x = 0.5 + i * 3.15;
    const y = 1.85;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 2.95, h: 2.6,
      fill: { color: 'FFFFFF', transparency: 92 },
      line: { color: C.indigo, width: 1 },
    });
    s.addText(st.n, {
      x, y: y + 0.25, w: 2.95, h: 1.3,
      fontSize: 72, bold: true, color: C.amber, fontFace: F.head,
      align: 'center', margin: 0,
    });
    s.addText(st.l, {
      x: x + 0.1, y: y + 1.55, w: 2.75, h: 0.4,
      fontSize: 14, bold: true, color: C.white, fontFace: F.head, align: 'center', margin: 0,
    });
    s.addText(st.s, {
      x: x + 0.1, y: y + 1.95, w: 2.75, h: 0.6,
      fontSize: 10, color: 'CADCFC', fontFace: F.body, align: 'center', margin: 0,
    });
  });

  // 功能模块交付进度条
  const phases = [
    { name: '环境与\n工程骨架', done: true },
    { name: '日志解析\n时间窗口', done: true },
    { name: 'PID\n生命周期', done: true },
    { name: '动态 Tag\n事件时间线', done: true },
    { name: 'AI\n分诊报告', done: true },
    { name: 'HM/Jira\n闭环 Demo', done: true },
    { name: '集成验收\n端到端', done: true },
  ];
  const pw = 12.3 / phases.length;
  phases.forEach((p, i) => {
    const x = 0.5 + i * pw;
    const y = 5.4;
    s.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.05, y, w: pw - 0.1, h: 0.5,
      fill: { color: C.green },
      line: { color: C.green, width: 0 },
    });
    s.addText('✓ 已完成', {
      x: x + 0.05, y, w: pw - 0.1, h: 0.5,
      fontSize: 10, bold: true, color: C.white, fontFace: F.body,
      align: 'center', valign: 'middle', margin: 0,
    });
    s.addText(p.name, {
      x: x + 0.05, y: y + 0.55, w: pw - 0.1, h: 0.8,
      fontSize: 9, color: C.white, fontFace: F.body,
      align: 'center', valign: 'top', margin: 0,
    });
  });

  addDarkFooter(s, 11, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// Slide 12：业务价值
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addPageTitle(s, '业务价值', '不止省时间 — 把工程师的脑力从"翻日志"释放到"修缺陷"');

  const benefits = [
    {
      icon: '⏱', color: C.indigo,
      title: '排查耗时压缩 80%+',
      detail: '从"翻 30 分钟才看出 PID 何时起的"到"打开页面 5 秒拿到生命周期表"。一份 10MB 日志整条流水线 < 1 秒跑完。',
    },
    {
      icon: '🎯', color: C.teal,
      title: '误归因风险归零',
      detail: '系统事件 source 强制标 system:<tag>，目标 PID 与系统进程在视觉上、数据上、规则上三重隔离。',
    },
    {
      icon: '🔗', color: C.navy,
      title: 'HM/Jira 闭环对接',
      detail: 'HealthMonitor 发现异常 → 上传日志 + 建 Jira → LogPilot 自动跑分诊 → 回填 Jira 评论。研发接单时直接看到证据报告。',
    },
    {
      icon: '💰', color: C.amber,
      title: 'AI token 成本可控',
      detail: '只把结构化摘要传给大模型（kB 级），不传原始日志（MB 级）。单次分诊成本 < 1 分钱，且报告质量稳定。',
    },
  ];

  benefits.forEach((b, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 6.3;
    const y = 1.85 + row * 2.45;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 6.1, h: 2.2,
      fill: { color: C.card }, line: { color: C.border, width: 1 },
      shadow: { type: 'outer', blur: 8, offset: 2, angle: 90, color: '000000', opacity: 0.06 },
    });
    s.addShape(pres.shapes.OVAL, {
      x: x + 0.3, y: y + 0.4, w: 0.9, h: 0.9,
      fill: { color: b.color }, line: { color: b.color, width: 0 },
    });
    s.addText(b.icon, {
      x: x + 0.3, y: y + 0.4, w: 0.9, h: 0.9,
      fontSize: 28, color: C.white, fontFace: F.body,
      align: 'center', valign: 'middle', margin: 0,
    });
    s.addText(b.title, {
      x: x + 1.4, y: y + 0.4, w: 4.6, h: 0.5,
      fontSize: 16, bold: true, color: C.text, fontFace: F.head, margin: 0,
    });
    s.addText(b.detail, {
      x: x + 1.4, y: y + 0.9, w: 4.6, h: 1.2,
      fontSize: 11, color: C.textSoft, fontFace: F.body, margin: 0,
    });
  });

  addFooter(s, 12, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// Slide 13：安全与合规
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addPageTitle(s, '安全与合规', '生产环境可信任的三道防线');

  const sec = [
    {
      title: 'API key 不出后端',
      desc: '模型调用只发生在 Node.js 后端进程，前端浏览器不接触任何密钥。.env.local 被 .gitignore 排除，永远不入仓库。',
      detail: '浏览器 Network 面板看不到 API key\n前端代码中不存在密钥逻辑',
      color: C.indigo,
    },
    {
      title: '原始日志不出本机',
      desc: '传给大模型的只有结构化摘要（PID 表、Tag 统计、时间线），不是原始日志。敏感信息不会离开你的机器。',
      detail: 'AI 输入 = kB 级摘要\n原始日志 = MB 级，留在本地',
      color: C.teal,
    },
    {
      title: 'AI 推测 ≠ 根因结论',
      desc: '系统事件 source 强制标 system:<tag>，禁止无证据归因。AI 输出分三段：事实 / 推测 / 待查，每条推测必须引用 evidence id。',
      detail: '不存在"AI 说是它就是它"的情况\n所有结论可追溯到日志行号',
      color: C.navy,
    },
  ];

  sec.forEach((item, i) => {
    const x = 0.5 + i * 4.2;
    const y = 1.85;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.0, h: 4.8,
      fill: { color: C.bg }, line: { color: C.border, width: 1 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.0, h: 0.08,
      fill: { color: item.color }, line: { color: item.color, width: 0 },
    });
    // 编号盾牌
    s.addShape(pres.shapes.OVAL, {
      x: x + 1.5, y: y + 0.4, w: 1.0, h: 1.0,
      fill: { color: item.color }, line: { color: item.color, width: 0 },
    });
    s.addText(`${i + 1}`, {
      x: x + 1.5, y: y + 0.4, w: 1.0, h: 1.0,
      fontSize: 32, bold: true, color: C.white, fontFace: F.head,
      align: 'center', valign: 'middle', margin: 0,
    });
    s.addText(item.title, {
      x: x + 0.2, y: y + 1.6, w: 3.6, h: 0.5,
      fontSize: 15, bold: true, color: C.text, fontFace: F.head, align: 'center', margin: 0,
    });
    s.addText(item.desc, {
      x: x + 0.2, y: y + 2.2, w: 3.6, h: 1.4,
      fontSize: 11, color: C.text, fontFace: F.body, align: 'center', valign: 'top', margin: 0,
    });
    s.addText(item.detail, {
      x: x + 0.2, y: y + 3.6, w: 3.6, h: 1.0,
      fontSize: 10, color: C.textSoft, fontFace: F.mono, align: 'center', valign: 'top', margin: 0,
    });
  });

  addFooter(s, 13, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// Slide 14：结尾
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.deep };

  s.addText('LogPilot', {
    x: 1.7, y: 1.8, w: 10, h: 1.0,
    fontSize: 56, bold: true, color: C.white, fontFace: F.head, margin: 0,
  });
  s.addText('万行日志，5 秒出证据', {
    x: 1.7, y: 2.9, w: 10, h: 0.6,
    fontSize: 24, color: 'CADCFC', fontFace: F.body, margin: 0,
  });

  s.addShape(pres.shapes.LINE, {
    x: 1.7, y: 3.8, w: 2.0, h: 0,
    line: { color: C.indigo, width: 2 },
  });

  const summary = [
    '确定性日志工程 — PID 生命周期追踪，不靠白名单',
    '动态 Tag 发现 — 零维护成本，新模块上线即分析',
    'AI 分诊报告 — 事实/推测/待查三段分离，可回填 Jira',
    '安全合规 — key 不出后端，日志不出本机，推测不冒充根因',
  ];
  summary.forEach((line, i) => {
    s.addText(line, {
      x: 1.7, y: 4.1 + i * 0.5, w: 10, h: 0.45,
      fontSize: 14, color: C.white, fontFace: F.body, margin: 0,
    });
  });

  s.addShape(pres.shapes.LINE, {
    x: 0.5, y: 6.4, w: 12.3, h: 0,
    line: { color: C.indigo, width: 1 },
  });
  s.addText('仅作辅助分诊，不下根因结论', {
    x: 0.5, y: 6.6, w: 6, h: 0.4,
    fontSize: 13, color: C.white, italic: true, fontFace: F.body, margin: 0,
  });
  s.addText('LogPilot Team · 2026', {
    x: 8.5, y: 6.6, w: 4.3, h: 0.4,
    fontSize: 11, color: '94A3B8', fontFace: F.body, align: 'right', margin: 0,
  });

  addDarkFooter(s, 14, TOTAL);
}

// ── 输出 ──────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: 'LogPilot-项目介绍.pptx' })
  .then((fn) => console.log('OK ->', fn))
  .catch((e) => { console.error(e); process.exit(1); });
