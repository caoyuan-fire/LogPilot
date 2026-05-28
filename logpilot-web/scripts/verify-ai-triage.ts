/**
 * JOB-004 自动化验证脚本
 *
 * 不依赖 HTTP 服务，直接组装 TriageReportInput 喂给 MockAiProvider，
 * 覆盖 JOB-004 验收条目中可自动化的部分：
 *   - mock provider 无 key 可跑
 *   - DeepSeek 缺 key 报错
 *   - 报告含 facts / hypotheses / missing / jira 四段
 *   - 推测必须引用证据
 *   - 证据严重不足时退化（不下推测）
 *   - 报告/Jira 评论不出现"根因 / root cause"等强结论用语
 *
 * 运行方式：
 *   npx tsx scripts/verify-ai-triage.ts
 */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseLogFile } from '../src/server/pipeline/logParser.js';
import { filterByTimeWindow } from '../src/server/pipeline/timeWindow.js';
import { trackPidLifecycles } from '../src/server/pipeline/pidTracker.js';
import { analyzeTags } from '../src/server/pipeline/tagAnalyzer.js';
import { extractSystemEvents } from '../src/server/pipeline/systemEventExtractor.js';
import { buildTimeline } from '../src/server/pipeline/timelineBuilder.js';
import { buildTriageReportInput } from '../src/server/ai/reportInputBuilder.js';
import { MockAiProvider } from '../src/server/ai/mockProvider.js';
import { createAiProvider } from '../src/server/ai/aiProvider.js';
import type { TimeWindow, TriageReportInput } from '../src/shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '../tests/fixtures');
const FULL_WINDOW: TimeWindow = {
  start: '05-20 00:00:00.000',
  end: '05-20 23:59:59.999',
};

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${label}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

// ── 条目 1：MockAiProvider 无 key 可生成报告 ──────────────────────────────────

console.log('\n[条目1] AI_PROVIDER=mock 时无需 key 即可跑通 Demo');
{
  delete process.env.AI_PROVIDER;
  delete process.env.AI_API_KEY;
  const provider = createAiProvider();
  assert('createAiProvider() 默认返回 mock', provider.name === 'mock');
}

// ── 条目 2：DeepSeek 缺 key 时明确报错 ──────────────────────────────────────

console.log('\n[条目2] AI_PROVIDER=deepseek 但未配置 AI_API_KEY 时清晰报错');
{
  process.env.AI_PROVIDER = 'deepseek';
  delete process.env.AI_API_KEY;
  let errMsg = '';
  try {
    createAiProvider();
  } catch (e) {
    errMsg = e instanceof Error ? e.message : String(e);
  }
  assert('抛出包含 AI_API_KEY 的错误', errMsg.includes('AI_API_KEY'), `实际: ${errMsg}`);
  assert('错误提示包含 .env.local', errMsg.includes('.env.local'));
  // 还原
  delete process.env.AI_PROVIDER;
}

// ── 条目 3：基于真实流水线产物生成报告 ─────────────────────────────────────

console.log('\n[条目3] 基于 tag_timeline.log 生成完整 mock 报告');
const richInput: TriageReportInput = (() => {
  const events = parseLogFile(
    readFileSync(path.join(FIXTURES, 'tag_timeline.log'), 'utf-8')
  ).events;
  const windowed = filterByTimeWindow(events, FULL_WINDOW);
  const { lifecycles } = trackPidLifecycles(
    windowed,
    ['com.example.app', 'com.example.helper'],
    FULL_WINDOW
  );
  const tagAnalysis = analyzeTags(windowed, lifecycles);
  const systemEvents = extractSystemEvents(windowed, { lifecycles });
  const timeline = buildTimeline(windowed, lifecycles, systemEvents);
  return buildTriageReportInput({
    bugSummary: '点击后应用 ANR',
    packages: ['com.example.app', 'com.example.helper'],
    timeWindow: FULL_WINDOW,
    lifecycles,
    tagAnalysis,
    timeline,
    windowedEvents: windowed,
  });
})();

{
  const mock = new MockAiProvider();
  // generateTriageReport returns a Promise — we await it via a synchronous trick (top-level await unsupported here)
  // Use .then for assertion
}

// Top-level async wrapper
(async () => {
  const mock = new MockAiProvider();
  const result = await mock.generateTriageReport(richInput);

  assert('provider = mock', result.provider === 'mock');
  assert('model 非空', !!result.model);
  assert('report_markdown 包含 "事实"', result.report_markdown.includes('事实'));
  assert('report_markdown 包含 "推测"', result.report_markdown.includes('推测'));
  assert('report_markdown 包含 "待补充信息"', result.report_markdown.includes('待补充信息'));
  assert('facts 数组非空', result.facts.length > 0);
  assert('hypotheses 数组非空（有证据）', result.hypotheses.length > 0);

  // R3 红线
  assert(
    'report_markdown 不出现"根因 / root cause"',
    !/根因|root cause/i.test(result.report_markdown)
  );
  assert(
    'jira_comment_markdown 不出现"根因 / root cause"',
    !/根因|root cause/i.test(result.jira_comment_markdown)
  );

  // 每条推测必须能找到证据引用
  let evidenceOk = 0;
  for (const h of result.hypotheses) {
    if (/line_no=|evidence|tag_statistics|pid_lifecycles|at \d/.test(h)) evidenceOk++;
  }
  assert(
    `每条 hypothesis 都引用 evidence (${evidenceOk}/${result.hypotheses.length})`,
    evidenceOk === result.hypotheses.length
  );

  // 系统事件不能被强行归因
  const hasSystemBlame = result.hypotheses.some(
    (h) => /目标 App.*触发|是.*导致|根本原因/.test(h)
  );
  assert('系统事件未被无证据归因到目标 App', !hasSystemBlame);

  // Jira 评论包含核心字段
  assert('jira 评论包含 包名', result.jira_comment_markdown.includes('com.example.app'));
  assert('jira 评论包含 时间窗口', result.jira_comment_markdown.includes('时间窗口'));

  // ── 条目 4：证据严重不足时降级 ────────────────────────────────────────────
  console.log('\n[条目4] 证据严重不足时退化为 missing_information，不写强结论');
  const emptyInput: TriageReportInput = {
    bug_summary: '',
    packages: ['com.demo.app'],
    time_window: '14:27:00 ~ 14:37:00',
    pid_lifecycles: [],
    tag_statistics: [],
    timeline: [],
    key_log_evidence: [],
  };
  const emptyReport = await mock.generateTriageReport(emptyInput);
  assert('hypotheses 为空数组', emptyReport.hypotheses.length === 0);
  assert('missing_information 至少 3 条', emptyReport.missing_information.length >= 3);
  assert(
    'report_markdown 提示证据不足',
    /证据不足|信息不足/.test(emptyReport.report_markdown)
  );

  // ── 条目 5：报告输入构造 ────────────────────────────────────────────────
  console.log('\n[条目5] reportInputBuilder 装配契约');
  assert('time_window 格式正确', /^\d{2}-\d{2}.*~.*\d{2}-\d{2}/.test(richInput.time_window));
  assert('packages 透传', richInput.packages.includes('com.example.app'));
  assert('pid_lifecycles 非空', richInput.pid_lifecycles.length > 0);
  assert('key_log_evidence 非空', richInput.key_log_evidence.length > 0);
  assert('key_log_evidence ≤ 50 (token-bounded)', richInput.key_log_evidence.length <= 50);

  // ── 汇总 ────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`结果：${passed} passed，${failed} failed`);
  if (failed > 0) process.exit(1);
})();
