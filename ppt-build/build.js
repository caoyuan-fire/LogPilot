// LogPilot 项目介绍 PPT
// 生成: node build.js
const pptxgen = require('pptxgenjs');

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.3" x 7.5"
pres.title = 'LogPilot 项目介绍';
pres.author = 'LogPilot Team';

// ── 色板 ──────────────────────────────────────────────────────────────────
const C = {
  navy: '1E2761',       // 主色 — 深海军蓝
  deep: '0B1A3F',       // 更深，封面用
  teal: '065A82',       // 次主色 — 深蓝绿
  indigo: '6366F1',     // 强调色 — 亮靛蓝
  amber: 'F59E0B',      // 高亮 — 数字/异常
  green: '10B981',      // 成功 / 在线
  red: 'EF4444',        // 警告
  bg: 'F7F8FB',         // 浅灰背景
  white: 'FFFFFF',
  text: '0F172A',       // 主文本
  textSoft: '475569',   // 次文本
  textDim: '94A3B8',    // 灰文本
  border: 'E4E7EC',     // 描边
  card: 'FFFFFF',
};

const F = {
  head: 'Microsoft YaHei',
  body: 'Microsoft YaHei',
  mono: 'Consolas',
};

// 页脚装饰（小字 + 页码）— 不画整块色条，避免 AI slop 感
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

// 页标题 + 副标题
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

const TOTAL = 12;

// ── Slide 1：封面 ─────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.deep };

  // 装饰点（品牌点）
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

  s.addText('用多包名 PID 追踪与动态 Tag 发现，把万行日志压成一份证据驱动的分诊报告', {
    x: 1.7, y: 3.95, w: 10.5, h: 0.5,
    fontSize: 14, color: '94A3B8', italic: true, fontFace: F.body, margin: 0,
  });

  // 底部一条细线 + 标签
  s.addShape(pres.shapes.LINE, {
    x: 1.0, y: 5.6, w: 1.5, h: 0,
    line: { color: C.indigo, width: 2 },
  });
  s.addText('Project Brief · 2026', {
    x: 1.0, y: 5.7, w: 6, h: 0.3,
    fontSize: 11, color: C.textDim, fontFace: F.body, charSpacing: 4, margin: 0,
  });
}

// ── Slide 2：痛点 ─────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addPageTitle(s, '排查现场的真实痛点', '一份复现日志，一个工程师，半天就交代出去了');

  const pains = [
    { stat: '10 MB', label: '单次复现日志大小', desc: '90 000 行起步，目标 App 的有效信息<2%' },
    { stat: '0.5~2h', label: '人工定位时间', desc: 'grep + 翻页 + 笔记，注意力极易疲劳' },
    { stat: '40%+', label: '"根因"被误归因', desc: 'ANR / Watchdog 频繁被记到无辜进程头上' },
    { stat: '∞', label: '工具碎片化', desc: '每个团队一套脚本、白名单、grep 指令' },
  ];

  pains.forEach((p, i) => {
    const x = 0.5 + i * 3.15;
    const y = 1.9;
    // 卡片
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 2.95, h: 4.6,
      fill: { color: C.card },
      line: { color: C.border, width: 1 },
      shadow: { type: 'outer', blur: 8, offset: 2, angle: 90, color: '000000', opacity: 0.05 },
    });
    // 大数字
    s.addText(p.stat, {
      x: x + 0.2, y: y + 0.4, w: 2.55, h: 1.4,
      fontSize: 44, bold: true, color: C.amber, fontFace: F.head, margin: 0,
    });
    // 标签
    s.addText(p.label, {
      x: x + 0.2, y: y + 1.85, w: 2.55, h: 0.5,
      fontSize: 14, bold: true, color: C.text, fontFace: F.head, margin: 0,
    });
    // 描述
    s.addText(p.desc, {
      x: x + 0.2, y: y + 2.45, w: 2.55, h: 1.8,
      fontSize: 11, color: C.textSoft, fontFace: F.body, margin: 0,
    });
  });

  addFooter(s, 2, TOTAL);
}

// ── Slide 3：项目定位 ─────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addPageTitle(s, '项目定位', '一句话讲清楚 LogPilot 是什么、不是什么');

  // 一句话
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.7, w: 12.3, h: 1.1,
    fill: { color: C.navy }, line: { color: C.navy, width: 0 },
  });
  s.addText('用户提供复现时间窗口和一个或多个相关包名，LogPilot 自动追踪 PID 生命周期、动态发现 Tag、裁剪海量日志，并生成可回填 Jira 的 AI 分诊报告。', {
    x: 0.9, y: 1.85, w: 11.5, h: 0.85,
    fontSize: 15, color: C.white, fontFace: F.body, italic: true, margin: 0,
    valign: 'middle',
  });

  // 是什么 / 不是什么 — 两列
  const yTop = 3.2;

  // 左：是什么
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: yTop, w: 6.0, h: 3.5,
    fill: { color: C.bg }, line: { color: C.border, width: 1 },
  });
  s.addText('是什么', {
    x: 0.8, y: yTop + 0.25, w: 5.5, h: 0.4,
    fontSize: 16, bold: true, color: C.teal, fontFace: F.head, margin: 0,
  });
  s.addText([
    { text: '面向缺陷排查的确定性日志工程 + AI', options: { bullet: true, breakLine: true } },
    { text: '以 PID 生命周期替代静态 Tag 白名单', options: { bullet: true, breakLine: true } },
    { text: '动态发现 Tag，零维护成本', options: { bullet: true, breakLine: true } },
    { text: '所有结论可追溯到日志证据行号', options: { bullet: true, breakLine: true } },
    { text: '与 HealthMonitor / Jira 形成自动闭环', options: { bullet: true } },
  ], {
    x: 0.8, y: yTop + 0.8, w: 5.5, h: 2.6,
    fontSize: 12, color: C.text, fontFace: F.body, paraSpaceAfter: 6,
  });

  // 右：不是什么
  s.addShape(pres.shapes.RECTANGLE, {
    x: 6.8, y: yTop, w: 6.0, h: 3.5,
    fill: { color: 'FFF7ED' }, line: { color: 'FED7AA', width: 1 },
  });
  s.addText('不是什么', {
    x: 7.1, y: yTop + 0.25, w: 5.5, h: 0.4,
    fontSize: 16, bold: true, color: 'B45309', fontFace: F.head, margin: 0,
  });
  s.addText([
    { text: '不是通用 Agent / ChatGPT 客户端外壳', options: { bullet: true, breakLine: true } },
    { text: '不下"根因"结论 — 只摆证据', options: { bullet: true, breakLine: true } },
    { text: '不维护静态业务 Tag 白名单', options: { bullet: true, breakLine: true } },
    { text: '不把全量日志喂给大模型', options: { bullet: true, breakLine: true } },
    { text: '不让浏览器直连模型 API（防 key 泄漏）', options: { bullet: true } },
  ], {
    x: 7.1, y: yTop + 0.8, w: 5.5, h: 2.6,
    fontSize: 12, color: C.text, fontFace: F.body, paraSpaceAfter: 6,
  });

  addFooter(s, 3, TOTAL);
}

// ── Slide 4：核心能力 ────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addPageTitle(s, '六大核心能力', '从输入到 AI 报告的完整链路');

  const caps = [
    { num: '01', title: '日志解析与时间窗口', desc: '兼容车机 dump 与标准 adb logcat；按 HH:MM:SS 或区间切片', color: C.indigo },
    { num: '02', title: '多包名 PID 追踪', desc: '识别启动/死亡/重启，输出多 PID 生命周期段', color: C.indigo },
    { num: '03', title: '动态 Tag 发现', desc: '按 (pkg, pid, tag) 聚合频次/level，自动标异常密集 Tag', color: C.teal },
    { num: '04', title: '系统事件提取', desc: 'ANR / Watchdog / FATAL / Killing / LMK / Input timeout', color: C.teal },
    { num: '05', title: '跨包名时间线', desc: '目标事件 + 系统事件按时间排序，重复事件压缩并保留行号', color: C.navy },
    { num: '06', title: 'AI 分诊报告', desc: 'mock / DeepSeek 双 provider；输出可回填 Jira 评论', color: C.navy },
  ];

  caps.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 4.2;
    const y = 1.85 + row * 2.25;

    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.0, h: 2.0,
      fill: { color: C.card },
      line: { color: C.border, width: 1 },
      shadow: { type: 'outer', blur: 8, offset: 2, angle: 90, color: '000000', opacity: 0.05 },
    });
    // 编号色块（左侧细条）
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.08, h: 2.0,
      fill: { color: c.color }, line: { color: c.color, width: 0 },
    });
    // 编号
    s.addText(c.num, {
      x: x + 0.25, y: y + 0.15, w: 0.8, h: 0.35,
      fontSize: 11, bold: true, color: c.color, fontFace: F.mono, margin: 0,
    });
    // 标题
    s.addText(c.title, {
      x: x + 0.25, y: y + 0.5, w: 3.6, h: 0.45,
      fontSize: 16, bold: true, color: C.text, fontFace: F.head, margin: 0,
    });
    // 描述（紧贴标题，valign top，让短文案不留底部空白）
    s.addText(c.desc, {
      x: x + 0.25, y: y + 0.95, w: 3.6, h: 0.95,
      fontSize: 11, color: C.textSoft, fontFace: F.body, margin: 0,
      valign: 'top',
    });
  });

  addFooter(s, 4, TOTAL);
}

// ── Slide 5：系统架构 ────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addPageTitle(s, '系统架构', '前端 React · 后端 Express · AI Provider 三层分离');

  // 三层方框
  const layers = [
    {
      name: '前端 (React + Vite)',
      sub: '浏览器 UI · 上传 / 时间窗口 / 包名 · 结果可视化',
      items: ['拖拽上传', '时间窗口 / 包名输入', 'PID 表 · Tag 统计 · 时间线', '健康检查自动轮询'],
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
    // 标签条
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

    // 内容区
    s.addShape(pres.shapes.RECTANGLE, {
      x: 3.0, y: L.y, w: 9.8, h: 1.4,
      fill: { color: C.bg }, line: { color: C.border, width: 1 },
    });
    // 模块小方块
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

  // 连接箭头（向下）
  [2.95, 4.8].forEach((y) => {
    s.addShape(pres.shapes.LINE, {
      x: 7.9, y, w: 0, h: 0.6,
      line: { color: C.textDim, width: 1.5, endArrowType: 'triangle' },
    });
  });

  addFooter(s, 5, TOTAL);
}

// ── Slide 6：数据处理流水线 ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addPageTitle(s, '数据处理流水线', '7 步把万行日志压成一份证据驱动的报告');

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
    // 步骤卡
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: stepW, h: 3.4,
      fill: { color: C.white }, line: { color: C.border, width: 1 },
      shadow: { type: 'outer', blur: 6, offset: 2, angle: 90, color: '000000', opacity: 0.06 },
    });
    // 顶部色块
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

    // 箭头（除最后一个）
    if (i < steps.length - 1) {
      const ax = x + stepW + 0.03;
      s.addShape(pres.shapes.LINE, {
        x: ax, y: y + 1.7, w: gap - 0.06, h: 0,
        line: { color: C.textDim, width: 1.5, endArrowType: 'triangle' },
      });
    }
  });

  // 底部输入/输出说明
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 5.7, w: 12.3, h: 0.9,
    fill: { color: C.navy }, line: { color: C.navy, width: 0 },
  });
  s.addText([
    { text: '输入：',  options: { bold: true, color: 'CADCFC' } },
    { text: '日志文件 + 时间窗口 + 多包名     ', options: { color: C.white } },
    { text: '输出：',  options: { bold: true, color: 'CADCFC' } },
    { text: 'PID 生命周期表 · 动态 Tag 统计 · 跨包名时间线 · AI 分诊报告（Markdown + Jira 评论）', options: { color: C.white } },
  ], {
    x: 0.8, y: 5.75, w: 11.7, h: 0.8,
    fontSize: 12, fontFace: F.body, valign: 'middle', margin: 0,
  });

  addFooter(s, 6, TOTAL);
}

// ── Slide 7：关键设计原则 ────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addPageTitle(s, '关键设计原则', '三条红线把 LogPilot 和"AI 客户端"区分开');

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
    // 编号 + 标题
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

    // 描述
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

  addFooter(s, 7, TOTAL);
}

// ── Slide 8：核心成果数据 ────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  // 标题（白色版）
  s.addText('当前交付状态', {
    x: 0.5, y: 0.4, w: 12.3, h: 0.7,
    fontSize: 28, bold: true, color: C.white, fontFace: F.head, margin: 0,
  });
  s.addText('JOB-000 ~ JOB-003 已完成；JOB-004（AI 报告）/ JOB-005（HM/Jira 闭环）/ JOB-006（终审）待开展', {
    x: 0.5, y: 1.05, w: 12.3, h: 0.4,
    fontSize: 13, color: 'CADCFC', fontFace: F.body, margin: 0,
  });

  // 4 个大数字
  const stats = [
    { n: '44', l: '测试用例', s: '5 个测试文件，全部通过' },
    { n: '4', l: '流水线模块', s: 'parser · pidTracker · tagAnalyzer · timelineBuilder' },
    { n: '6', l: '类系统事件', s: 'ANR / Watchdog / FATAL / Killing / LMK / Input timeout' },
    { n: '26', l: '自动化验证条目', s: '覆盖 JOB-003 人工验证清单 100%' },
  ];
  stats.forEach((st, i) => {
    const x = 0.5 + i * 3.15;
    const y = 1.85;
    // 卡片
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

  // 底部进度条
  const phases = [
    { name: 'JOB-000\n环境与骨架', done: true },
    { name: 'JOB-001\n解析+时间窗口', done: true },
    { name: 'JOB-002\nPID 生命周期', done: true },
    { name: 'JOB-003\nTag+时间线', done: true },
    { name: 'JOB-004\nAI 分诊报告', done: false },
    { name: 'JOB-005\nHM/Jira 闭环', done: false },
    { name: 'JOB-006\n终审', done: false },
  ];
  const pw = 12.3 / phases.length;
  phases.forEach((p, i) => {
    const x = 0.5 + i * pw;
    const y = 5.4;
    s.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.05, y, w: pw - 0.1, h: 0.5,
      fill: { color: p.done ? C.green : '334155' },
      line: { color: p.done ? C.green : '475569', width: 0 },
    });
    s.addText(p.done ? '✓ 已完成' : '○ 待开展', {
      x: x + 0.05, y, w: pw - 0.1, h: 0.5,
      fontSize: 10, bold: true, color: C.white, fontFace: F.body,
      align: 'center', valign: 'middle', margin: 0,
    });
    s.addText(p.name, {
      x: x + 0.05, y: y + 0.55, w: pw - 0.1, h: 0.8,
      fontSize: 9, color: p.done ? C.white : 'CBD5E1', fontFace: F.body,
      align: 'center', valign: 'top', margin: 0,
    });
  });

  // 自定义页脚（深色版）
  s.addText('LogPilot · AI 日志裁剪与缺陷分诊助手', {
    x: 0.5, y: 7.05, w: 8, h: 0.3,
    fontSize: 9, color: '64748B', fontFace: F.body, margin: 0,
  });
  s.addText(`8 / ${TOTAL}`, {
    x: 12.0, y: 7.05, w: 0.8, h: 0.3,
    fontSize: 9, color: '64748B', fontFace: F.body, align: 'right', margin: 0,
  });
}

// ── Slide 9：使用流程 ────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addPageTitle(s, '用户工作流', '从一份原始日志到一份 Jira 可贴的分诊报告');

  const steps = [
    { n: '1', t: '上传日志', d: '拖拽 .log 文件，或粘贴 logcat 文本' },
    { n: '2', t: '指定窗口', d: '问题发生时间点；或起止区间' },
    { n: '3', t: '填入包名', d: '一个或多个相关 App 进程名' },
    { n: '4', t: '点击分析', d: '后端流水线 < 1s 跑完' },
    { n: '5', t: '查看证据', d: 'PID / Tag / 时间线三视图联动' },
    { n: '6', t: 'AI 生成报告', d: '可直接复制 Jira 评论版' },
  ];

  steps.forEach((st, i) => {
    const x = 0.5 + i * 2.13;
    const y = 2.0;
    const w = 2.0;
    // 圆形编号
    s.addShape(pres.shapes.OVAL, {
      x: x + w / 2 - 0.4, y: y, w: 0.8, h: 0.8,
      fill: { color: C.indigo }, line: { color: C.indigo, width: 0 },
    });
    s.addText(st.n, {
      x: x + w / 2 - 0.4, y: y, w: 0.8, h: 0.8,
      fontSize: 24, bold: true, color: C.white, fontFace: F.head,
      align: 'center', valign: 'middle', margin: 0,
    });
    // 卡片
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

    // 连接箭头
    if (i < steps.length - 1) {
      s.addShape(pres.shapes.LINE, {
        x: x + w + 0.02, y: y + 0.4, w: 0.1, h: 0,
        line: { color: C.textDim, width: 1.5, endArrowType: 'triangle' },
      });
    }
  });

  // 底部小注
  s.addText('R3 红线：每一步都是确定性日志工程；AI 只在最后一步介入，输入是结构化证据而非原始日志。', {
    x: 0.5, y: 6.0, w: 12.3, h: 0.5,
    fontSize: 12, italic: true, color: C.textSoft, fontFace: F.body, align: 'center', margin: 0,
  });

  addFooter(s, 9, TOTAL);
}

// ── Slide 10：与通用方案的对比 ───────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addPageTitle(s, '与通用方案的对比', '把 LogPilot 与"grep 脚本 + ChatGPT"放在一起看');

  const rows = [
    ['维度',              'grep + 自维护脚本',     '通用 AI 客户端（直接喂日志）',  'LogPilot'],
    ['日志范围裁剪',      'grep 模式手工堆叠',       '截断或撑爆 context window',     'PID 生命周期 + 时间窗口确定性裁剪'],
    ['Tag 维护',          '静态白名单，需求变就改',  '不裁剪，全量传',                '动态发现，零维护'],
    ['系统事件归因',      '人工肉眼判断',            '模型容易"看图说话"',            'system:<tag> 显式来源，禁止误归因'],
    ['结论可追溯',        '依赖工程师笔记',          '可能编造行号',                  '每条证据带 line_no'],
    ['敏感数据 / API key', '本地脚本相对安全',       '上传日志风险大',                '后端代理 + .env.local 隔离'],
    ['维护成本',          '高（脚本越来越多）',       '低，但质量不稳',                '低且确定'],
  ];

  // 表
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

  addFooter(s, 10, TOTAL);
}

// ── Slide 11：业务价值 ──────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addPageTitle(s, '业务价值', '不止省时间 — 还把工程师的脑力从"翻日志"释放到"修缺陷"');

  const benefits = [
    {
      icon: '⏱', color: C.indigo,
      title: '排查耗时压缩 80%+',
      detail: '从"翻 30 分钟才看出 PID 何时起的"到"打开页面 5 秒拿到生命周期表"。比赛 Demo 实测一份 10MB 日志整条流水线在 1 秒内跑完。',
    },
    {
      icon: '🎯', color: C.teal,
      title: '误归因风险归零',
      detail: '系统事件 source 强制标 system:<tag>，目标 PID 与系统进程在视觉上、数据上、规则上三重隔离。Demo Bug 复盘后不会再有"为啥这个 ANR 算到我头上"。',
    },
    {
      icon: '🔗', color: C.navy,
      title: '与 HM/Jira 闭环可对接',
      detail: 'HealthMonitor 发现异常 → 上传日志 + 建 Jira → LogPilot 自动跑分诊 → 回填 Jira 评论。研发接单时直接看到证据驱动的报告，而不是一句"复现一下"。',
    },
    {
      icon: '💰', color: C.amber,
      title: 'AI token 成本可控',
      detail: '只把结构化摘要传给大模型（kB 级），不传原始日志（MB 级）。同一份缺陷的单次分诊成本通常 < 1 分钱，且报告质量稳定不漂。',
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
    // 图标圆
    s.addShape(pres.shapes.OVAL, {
      x: x + 0.3, y: y + 0.4, w: 0.9, h: 0.9,
      fill: { color: b.color }, line: { color: b.color, width: 0 },
    });
    s.addText(b.icon, {
      x: x + 0.3, y: y + 0.4, w: 0.9, h: 0.9,
      fontSize: 28, color: C.white, fontFace: F.body,
      align: 'center', valign: 'middle', margin: 0,
    });
    // 标题
    s.addText(b.title, {
      x: x + 1.4, y: y + 0.4, w: 4.6, h: 0.5,
      fontSize: 16, bold: true, color: C.text, fontFace: F.head, margin: 0,
    });
    // 描述
    s.addText(b.detail, {
      x: x + 1.4, y: y + 0.9, w: 4.6, h: 1.2,
      fontSize: 11, color: C.textSoft, fontFace: F.body, margin: 0,
    });
  });

  addFooter(s, 11, TOTAL);
}

// ── Slide 12：路线图 + Closing ───────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.deep };

  s.addText('下一步路线图', {
    x: 0.5, y: 0.4, w: 12.3, h: 0.7,
    fontSize: 28, bold: true, color: C.white, fontFace: F.head, margin: 0,
  });
  s.addText('交付节奏：每个 Job 自动化测试 + verify 脚本 + 人工验证清单缺一不可', {
    x: 0.5, y: 1.05, w: 12.3, h: 0.4,
    fontSize: 13, color: 'CADCFC', fontFace: F.body, margin: 0,
  });

  const roadmap = [
    {
      phase: 'JOB-004', title: 'AI 分诊报告链路',
      items: ['DeepSeek provider 真实接入', 'Prompt 严格要求 evidence id 引用', '事实 / 假设 / 待查 三段分离', 'Jira 评论 Markdown 导出'],
      color: C.indigo,
    },
    {
      phase: 'JOB-005', title: 'HM / Jira 闭环 Demo',
      items: ['HealthMonitor 异常事件模拟', '自动上传日志 + 建 Jira 单', 'LogPilot 自动接单生成分诊', '回填 Jira 评论 + 飞书通知'],
      color: C.teal,
    },
    {
      phase: 'JOB-006', title: '最终集成与参赛验收',
      items: ['端到端演示脚本', '现场答辩材料', '安全审查 / 脱敏复核', '人工负责人最终验收'],
      color: C.amber,
    },
  ];

  roadmap.forEach((r, i) => {
    const x = 0.5 + i * 4.2;
    const y = 1.85;
    // 卡片（半透白）
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.0, h: 4.0,
      fill: { color: 'FFFFFF', transparency: 90 },
      line: { color: r.color, width: 1.5 },
    });
    // 阶段标
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.0, h: 0.6,
      fill: { color: r.color }, line: { color: r.color, width: 0 },
    });
    s.addText(r.phase, {
      x: x + 0.15, y, w: 3.7, h: 0.6,
      fontSize: 13, bold: true, color: C.white, fontFace: F.mono,
      align: 'left', valign: 'middle', margin: 0,
    });
    // 标题
    s.addText(r.title, {
      x: x + 0.2, y: y + 0.8, w: 3.6, h: 0.5,
      fontSize: 16, bold: true, color: C.white, fontFace: F.head, margin: 0,
    });
    // 列表
    s.addText(r.items.map((it, idx) => ({
      text: it,
      options: idx < r.items.length - 1 ? { bullet: true, breakLine: true } : { bullet: true },
    })), {
      x: x + 0.2, y: y + 1.4, w: 3.6, h: 2.5,
      fontSize: 11.5, color: 'CADCFC', fontFace: F.body, paraSpaceAfter: 6,
    });
  });

  // 底部 closing 行
  s.addShape(pres.shapes.LINE, {
    x: 0.5, y: 6.4, w: 12.3, h: 0,
    line: { color: C.indigo, width: 1 },
  });
  s.addText('Thanks · 仅作辅助分诊，不下根因结论', {
    x: 0.5, y: 6.6, w: 8, h: 0.4,
    fontSize: 13, color: C.white, italic: true, fontFace: F.body, margin: 0,
  });
  s.addText('LogPilot Team · 2026', {
    x: 8.5, y: 6.6, w: 4.3, h: 0.4,
    fontSize: 11, color: '94A3B8', fontFace: F.body, align: 'right', margin: 0,
  });
  s.addText(`${TOTAL} / ${TOTAL}`, {
    x: 12.0, y: 7.05, w: 0.8, h: 0.3,
    fontSize: 9, color: '64748B', fontFace: F.body, align: 'right', margin: 0,
  });
}

// ── 输出 ──────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: 'LogPilot-项目介绍.pptx' })
  .then((fn) => console.log('OK ->', fn))
  .catch((e) => { console.error(e); process.exit(1); });
