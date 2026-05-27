/**
 * JOB-003 自动化验证脚本
 *
 * 直接调用 analyzeTags / extractSystemEvents / buildTimeline 核心函数，
 * 覆盖 JOB-003 人工验证清单中所有可自动化的条目。
 *
 * 运行方式：
 *   npx tsx scripts/verify-tag-timeline.ts
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
import type { TimeWindow } from '../src/shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '../tests/fixtures');

// ── helpers ───────────────────────────────────────────────────────────────────

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

function loadFixture(name: string) {
  const content = readFileSync(path.join(FIXTURES, name), 'utf-8');
  return parseLogFile(content);
}

const FULL_WINDOW: TimeWindow = {
  start: '05-20 00:00:00.000',
  end: '05-20 23:59:59.999',
};

// ── 通用准备：tag_timeline.log + 两个目标包名 ────────────────────────────────

const parsed = loadFixture('tag_timeline.log');
const windowedEvents = filterByTimeWindow(parsed.events, FULL_WINDOW);
const { lifecycles } = trackPidLifecycles(
  windowedEvents,
  ['com.example.app', 'com.example.helper'],
  FULL_WINDOW
);

// ── 条目 1：动态 Tag 清单和频次 ──────────────────────────────────────────────

console.log('\n[条目1] 使用目标 PID 样例，输出动态 Tag 清单和频次');
{
  const result = analyzeTags(windowedEvents, lifecycles);
  const appCore = result.statistics.find(
    (s) => s.package_name === 'com.example.app' && s.tag === 'AppCore'
  );
  assert('AppCore 出现在统计中', !!appCore);
  assert('AppCore 频次 = 11', appCore?.count === 11, `实际: ${appCore?.count}`);
  const helperCore = result.statistics.find(
    (s) => s.package_name === 'com.example.helper' && s.tag === 'HelperCore'
  );
  assert('HelperCore 出现在统计中', !!helperCore);
  assert('HelperCore 频次 = 2', helperCore?.count === 2, `实际: ${helperCore?.count}`);
  console.log(`  → 总 Tag 行数: ${result.statistics.length}`);
  console.log(`  → 异常密集 Tag: ${result.anomalous_tags.join(', ') || '(无)'}`);
}

// ── 条目 2：level 分布 (ERROR/WARN/INFO) ─────────────────────────────────────

console.log('\n[条目2] Tag 统计中能看到 ERROR/WARN/INFO 等 level 分布');
{
  const result = analyzeTags(windowedEvents, lifecycles);
  const appCore = result.statistics.find(
    (s) => s.package_name === 'com.example.app' && s.tag === 'AppCore'
  );
  assert('AppCore D 计数 = 5', appCore?.levels.D === 5, `实际: ${appCore?.levels.D}`);
  assert('AppCore W 计数 = 1', appCore?.levels.W === 1, `实际: ${appCore?.levels.W}`);
  assert('AppCore E 计数 = 5', appCore?.levels.E === 5, `实际: ${appCore?.levels.E}`);
  assert(
    '至少有一个 Tag 出现 I/INFO 级别',
    result.statistics.some((s) => (s.levels.I ?? 0) >= 1)
  );
}

// ── 条目 3：ANR / Watchdog / Killing 等系统关键事件 ──────────────────────────

console.log('\n[条目3] ANR / timeout 等系统关键事件出现在时间线');
{
  const systemEvents = extractSystemEvents(windowedEvents, { lifecycles });
  const messages = systemEvents.map((e) => e.message).join(' | ');
  assert('包含 ANR', /ANR in com\.example\.app/.test(messages));
  assert('包含 Watchdog / !@Sync', /Watchdog|!@Sync/.test(messages));
  assert('包含 Killing', /Killing\s+\d+:com\.example\.helper/.test(messages));
  assert('包含 FATAL EXCEPTION', /FATAL EXCEPTION/.test(messages));
  assert('包含 Input dispatching timed out', /Input dispatching timed out/.test(messages));
  assert(
    '所有系统事件 is_system_event=true',
    systemEvents.every((e) => e.is_system_event === true)
  );
  console.log(`  → 系统事件数: ${systemEvents.length}`);
}

// ── 条目 4：跨包名事件按时间顺序合并展示 ──────────────────────────────────────

console.log('\n[条目4] 多个包名 — 时间线按时间顺序跨包名展示');
{
  const systemEvents = extractSystemEvents(windowedEvents, { lifecycles });
  const timeline = buildTimeline(windowedEvents, lifecycles, systemEvents);

  let sorted = true;
  for (let i = 1; i < timeline.length; i++) {
    if (timeline[i - 1].timestamp > timeline[i].timestamp) {
      sorted = false;
      break;
    }
  }
  assert('时间线按 timestamp 升序', sorted);

  const sources = new Set(timeline.map((e) => e.source));
  assert('包含 com.example.app:2100 来源', sources.has('com.example.app:2100'));
  assert('包含 com.example.helper:3500 来源', sources.has('com.example.helper:3500'));
  console.log(`  → 时间线总条数: ${timeline.length}`);
  console.log(`  → 来源种类: ${Array.from(sources).join(', ')}`);
}

// ── 条目 5：系统事件必须标明来源，不得归因到目标 App ─────────────────────────

console.log('\n[条目5] 系统关键事件必须标明来源，不得无证据归因到目标 App');
{
  const systemEvents = extractSystemEvents(windowedEvents, { lifecycles });
  const timeline = buildTimeline(windowedEvents, lifecycles, systemEvents);
  const sysSlice = timeline.filter((e) => e.is_system_event);

  assert('每条系统事件都标明来源', sysSlice.every((e) => !!e.source && e.source.length > 0));
  assert(
    '系统事件 source 以 system: 前缀开头',
    sysSlice.every((e) => e.source.startsWith('system:'))
  );
  assert(
    '系统事件 source 不会包含目标包名',
    sysSlice.every(
      (e) => !e.source.includes('com.example.app') && !e.source.includes('com.example.helper')
    )
  );
  const targetPids = new Set(
    lifecycles.flatMap((l) => l.segments.map((s) => s.pid))
  );
  assert(
    '系统事件 pid 不会等于任一目标 PID',
    sysSlice.every((e) => !e.pid || !targetPids.has(e.pid))
  );
}

// ── 条目 6：异常密集 Tag 输出 ────────────────────────────────────────────────

console.log('\n[条目6] 输出异常密集 Tag (ERROR/FATAL ≥ 3 的标记为异常)');
{
  const result = analyzeTags(windowedEvents, lifecycles);
  assert('AppCore 被标记为异常密集', result.anomalous_tags.includes('AppCore'));
  assert(
    'HelperCore 未被错误地标记为异常',
    !result.anomalous_tags.includes('HelperCore')
  );
}

// ── 条目 7：压缩重复事件保留首样例行号 ───────────────────────────────────────

console.log('\n[条目7] 高频重复日志被压缩，但保留样例行号');
{
  const synthetic = Array.from({ length: 7 }, (_, i) => ({
    line_no: 500 + i,
    timestamp: `05-20 12:00:0${i}.000`,
    pid: '9999',
    tid: '9999',
    level: 'E',
    tag: 'BurstTag',
    message: 'identical burst',
  }));
  const fakeLifecycles = [
    {
      package_name: 'com.example.burst',
      segments: [
        { pid: '9999', start_time: '05-20 12:00:00.000', end_time: '05-20 12:00:20.000' },
      ],
    },
  ];
  const timeline = buildTimeline(synthetic, fakeLifecycles, []);
  const folded = timeline.filter((e) => e.tag === 'BurstTag');
  assert('压缩后只剩 1 条', folded.length === 1, `实际: ${folded.length}`);
  assert('compressed_count = 7', folded[0]?.compressed_count === 7, `实际: ${folded[0]?.compressed_count}`);
  assert('line_no 为首样例 (500)', folded[0]?.line_no === 500, `实际: ${folded[0]?.line_no}`);
}

// ── 汇总 ──────────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`结果：${passed} passed，${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
