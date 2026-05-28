/**
 * JOB-005 自动化验证脚本
 *
 * 验证 HM/Jira 闭环 Demo 的可自动化部分：
 *   - HM 样例文件可解析
 *   - listHmEvents 返回至少 1 条
 *   - loadHmEvent 能装回完整事件 + 日志
 *   - log_path 安全约束（绝对路径 / 越界 / 不存在均拒绝）
 *   - 从 HM 样例端到端跑到 AI 报告（mock provider）
 *   - AI 报告不出现"根因/root cause"字样
 *   - Jira 评论 markdown 含必要字段
 *
 * 运行方式：
 *   npx tsx scripts/verify-hm-demo.ts
 */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  listHmEvents,
  loadHmEvent,
  HmEventNotFoundError,
  HmEventPathError,
} from '../src/server/demoWorkflow.js';
import { parseLogFile } from '../src/server/pipeline/logParser.js';
import { filterByTimeWindow, parseTimeInput } from '../src/server/pipeline/timeWindow.js';
import { trackPidLifecycles } from '../src/server/pipeline/pidTracker.js';
import { analyzeTags } from '../src/server/pipeline/tagAnalyzer.js';
import { extractSystemEvents } from '../src/server/pipeline/systemEventExtractor.js';
import { buildTimeline } from '../src/server/pipeline/timelineBuilder.js';
import { buildTriageReportInput } from '../src/server/ai/reportInputBuilder.js';
import { MockAiProvider } from '../src/server/ai/mockProvider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_PATH = path.resolve(__dirname, '../demo/hm_event_sample.json');
const JIRA_SAMPLE_PATH = path.resolve(__dirname, '../demo/jira_comment_sample.md');
const DEMO_SCRIPT_PATH = path.resolve(__dirname, '../docs/demo_script.md');

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

// ── 条目 1：HM 样例文件结构 ──────────────────────────────────────────────

console.log('\n[条目1] demo/hm_event_sample.json 结构正确');
{
  const raw = readFileSync(SAMPLE_PATH, 'utf-8');
  const parsed = JSON.parse(raw);
  assert('events 字段是数组', Array.isArray(parsed.events));
  assert('至少 1 个样例事件', parsed.events.length >= 1);
  assert('含 _note 标明合成数据', typeof parsed._note === 'string' && parsed._note.includes('合成'));
}

// ── 条目 2：listHmEvents 契约 ────────────────────────────────────────────

console.log('\n[条目2] listHmEvents 返回前端可渲染的概要');
{
  const list = listHmEvents();
  assert('list 非空', list.length > 0);
  for (const e of list) {
    assert(
      `${e.hm_event_id} 含 jira_key / packages`,
      typeof e.jira_key === 'string' && Array.isArray(e.packages)
    );
  }
  assert(
    '包含 HM-20260520-001 这条经典样例',
    list.some((e) => e.hm_event_id === 'HM-20260520-001')
  );
}

// ── 条目 3：loadHmEvent 完整装回 + 日志内嵌 ──────────────────────────────

console.log('\n[条目3] loadHmEvent 完整装回 + 日志内嵌');
let loaded: ReturnType<typeof loadHmEvent>;
{
  loaded = loadHmEvent('HM-20260520-001');
  assert('event.hm_event_id 正确', loaded.event.hm_event_id === 'HM-20260520-001');
  assert('jira.key 正确', loaded.event.jira.key === 'COCKPIT-1234');
  assert('packages 含 com.example.app', loaded.event.packages.includes('com.example.app'));
  assert('log_content 非空', loaded.log_content.length > 0);
  assert('log_content 含 com.example.app', loaded.log_content.includes('com.example.app'));
}

// ── 条目 4：log_path 安全约束 ────────────────────────────────────────────

console.log('\n[条目4] log_path 安全约束（防越界 / 绝对路径 / 不存在）');
{
  let absRejected = false;
  try {
    loadHmEvent('HM-EVIL', { override_log_path: '/etc/passwd' });
  } catch (e) { absRejected = e instanceof HmEventPathError; }
  assert('绝对路径被拒绝', absRejected);

  let traversalRejected = false;
  try {
    loadHmEvent('HM-EVIL', { override_log_path: '../../../etc/passwd' });
  } catch (e) { traversalRejected = e instanceof HmEventPathError; }
  assert('.. 越界被拒绝', traversalRejected);

  let missingRejected = false;
  try {
    loadHmEvent('HM-EVIL', { override_log_path: 'tests/fixtures/nope.log' });
  } catch (e) { missingRejected = e instanceof HmEventPathError; }
  assert('不存在文件被拒绝', missingRejected);

  let nfRejected = false;
  try {
    loadHmEvent('HM-DOES-NOT-EXIST');
  } catch (e) { nfRejected = e instanceof HmEventNotFoundError; }
  assert('未知 id 抛 HmEventNotFoundError', nfRejected);
}

// ── 条目 5：端到端跑通到 AI 报告 ─────────────────────────────────────────

console.log('\n[条目5] HM 样例 → 流水线 → AI 报告 端到端');

(async () => {
  // 解析时间窗口
  const events = parseLogFile(loaded.log_content).events;
  const datePrefix = events.length > 0 ? events[0].timestamp.slice(0, 6) : '05-20 ';
  const win = parseTimeInput(loaded.event.time_window, datePrefix);
  const windowed = filterByTimeWindow(events, win);
  const { lifecycles } = trackPidLifecycles(windowed, loaded.event.packages, win);
  const tagAnalysis = analyzeTags(windowed, lifecycles);
  const systemEvents = extractSystemEvents(windowed, { lifecycles });
  const timeline = buildTimeline(windowed, lifecycles, systemEvents);

  assert('PID 生命周期非空', lifecycles.length > 0);
  assert('时间线非空', timeline.length > 0);
  assert('包含系统事件', systemEvents.length > 0);

  const triageInput = buildTriageReportInput({
    bugSummary: loaded.event.bug_summary,
    packages: loaded.event.packages,
    timeWindow: win,
    lifecycles,
    tagAnalysis,
    timeline,
    windowedEvents: windowed,
  });

  const report = await new MockAiProvider().generateTriageReport(triageInput);

  // ── 条目 6：报告契约 + R3 红线 ─────────────────────────────────────────
  console.log('\n[条目6] AI 报告契约 + R3 红线');
  assert('report_markdown 非空', report.report_markdown.length > 0);
  assert('facts 非空', report.facts.length > 0);
  assert('hypotheses 非空（有证据）', report.hypotheses.length > 0);
  assert(
    'report_markdown 不出现"根因 / root cause"',
    !/根因|root cause/i.test(report.report_markdown)
  );
  assert(
    'jira_comment_markdown 不出现"根因 / root cause"',
    !/根因|root cause/i.test(report.jira_comment_markdown)
  );
  // 每条推测都带 evidence
  const allCited = report.hypotheses.every((h) =>
    /line_no=|evidence|tag_statistics|pid_lifecycles|at \d/.test(h)
  );
  assert('每条 hypothesis 都引用 evidence', allCited);

  // ── 条目 7：Jira 评论字段 ──────────────────────────────────────────────
  console.log('\n[条目7] Jira 评论包含必要字段');
  assert('Jira 评论含 包名', report.jira_comment_markdown.includes('com.example.app'));
  assert('Jira 评论含 时间窗口', report.jira_comment_markdown.includes('时间窗口'));
  assert('Jira 评论含 provider 标识', report.jira_comment_markdown.includes('LogPilot'));

  // ── 条目 8：文档存在 ───────────────────────────────────────────────────
  console.log('\n[条目8] Demo 配套文档存在');
  let jiraSampleOk = false;
  try {
    const j = readFileSync(JIRA_SAMPLE_PATH, 'utf-8');
    jiraSampleOk = j.includes('真实接入') && j.includes('权限');
  } catch {}
  assert('jira_comment_sample.md 存在且包含"真实接入 ... 权限"说明', jiraSampleOk);

  let demoScriptOk = false;
  try {
    const d = readFileSync(DEMO_SCRIPT_PATH, 'utf-8');
    demoScriptOk = d.includes('HM') && d.includes('演示') && d.includes('模拟闭环');
  } catch {}
  assert('docs/demo_script.md 存在且明确标"模拟闭环"', demoScriptOk);

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`结果：${passed} passed，${failed} failed`);
  if (failed > 0) process.exit(1);
})();
