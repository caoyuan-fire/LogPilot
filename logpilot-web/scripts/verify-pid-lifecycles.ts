/**
 * JOB-002 自动化验证脚本
 *
 * 直接调用 trackPidLifecycles 核心函数，覆盖所有可自动化的人工验证条目，
 * 无需启动 HTTP 服务。
 *
 * 运行方式：
 *   npx tsx scripts/verify-pid-lifecycles.ts
 */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseLogFile } from '../src/server/pipeline/logParser.js';
import { filterByTimeWindow } from '../src/server/pipeline/timeWindow.js';
import { trackPidLifecycles } from '../src/server/pipeline/pidTracker.js';
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

// ── 验证条目 1：单包名单 PID，能返回该包名对应 PID 及起止时间 ──────────────────

console.log('\n[条目1] 单包名单 PID — 展示 PID 及起止时间');
{
  const parsed = loadFixture('pid_single.log');
  const result = trackPidLifecycles(parsed.events, ['com.example.app'], FULL_WINDOW);

  assert('lifecycles 长度为 1', result.lifecycles.length === 1);
  assert('not_found 为空', result.not_found.length === 0);

  const seg = result.lifecycles[0]?.segments[0];
  assert('package_name 正确', result.lifecycles[0]?.package_name === 'com.example.app');
  assert('PID 为 2100', seg?.pid === '2100', `实际: ${seg?.pid}`);
  assert('start_time 正确', seg?.start_time === '05-20 10:00:00.000', `实际: ${seg?.start_time}`);
  assert('end_time 正确（has died 时间）', seg?.end_time === '05-20 10:00:05.000', `实际: ${seg?.end_time}`);

  console.log(`  → PID: ${seg?.pid}  start: ${seg?.start_time}  end: ${seg?.end_time}`);
}

// ── 验证条目 2：进程重启 — 同一包名展示两个 PID 片段 ────────────────────────────

console.log('\n[条目2] 进程重启 — 同一包名出现两个 PID 片段');
{
  const parsed = loadFixture('pid_restart.log');
  const result = trackPidLifecycles(parsed.events, ['com.example.app'], FULL_WINDOW);

  assert('lifecycles 长度为 1', result.lifecycles.length === 1);
  const segs = result.lifecycles[0]?.segments ?? [];
  assert('片段数量为 2', segs.length === 2, `实际: ${segs.length}`);
  assert('第一段 PID 为 2100', segs[0]?.pid === '2100', `实际: ${segs[0]?.pid}`);
  assert('第二段 PID 为 3300', segs[1]?.pid === '3300', `实际: ${segs[1]?.pid}`);
  assert('第一段 end_time 正确', segs[0]?.end_time === '05-20 10:00:03.000', `实际: ${segs[0]?.end_time}`);
  assert('第二段 start_time 正确', segs[1]?.start_time === '05-20 10:00:05.000', `实际: ${segs[1]?.start_time}`);

  for (const s of segs) {
    console.log(`  → PID: ${s.pid}  start: ${s.start_time}  end: ${s.end_time}`);
  }
}

// ── 验证条目 3：两个包名各自独立展示，不混淆 ────────────────────────────────────

console.log('\n[条目3] 两个包名 — 各自独立，不混淆');
{
  const parsed = loadFixture('pid_multi_package.log');
  const result = trackPidLifecycles(
    parsed.events,
    ['com.example.app', 'com.example.helper'],
    FULL_WINDOW
  );

  assert('lifecycles 长度为 2', result.lifecycles.length === 2);
  assert('not_found 为空', result.not_found.length === 0);

  const appLc = result.lifecycles.find(l => l.package_name === 'com.example.app');
  const helperLc = result.lifecycles.find(l => l.package_name === 'com.example.helper');

  assert('app 存在', !!appLc);
  assert('helper 存在', !!helperLc);
  assert('app PID 为 2100', appLc?.segments[0]?.pid === '2100', `实际: ${appLc?.segments[0]?.pid}`);
  assert('helper PID 为 3500', helperLc?.segments[0]?.pid === '3500', `实际: ${helperLc?.segments[0]?.pid}`);
  assert('两包名 PID 不相同', appLc?.segments[0]?.pid !== helperLc?.segments[0]?.pid);

  for (const lc of result.lifecycles) {
    console.log(`  → ${lc.package_name}  PID: ${lc.segments[0]?.pid}  end: ${lc.segments[0]?.end_time}`);
  }
}

// ── 验证条目 4：不存在的包名 — not_found 列表，不崩溃 ───────────────────────────

console.log('\n[条目4] 不存在的包名 — not_found 可读提示，不崩溃');
{
  const parsed = loadFixture('pid_single.log');
  const result = trackPidLifecycles(parsed.events, ['com.nonexistent.pkg'], FULL_WINDOW);

  assert('不崩溃（正常返回）', true);
  assert('lifecycles 为空', result.lifecycles.length === 0);
  assert('not_found 包含该包名', result.not_found.includes('com.nonexistent.pkg'));

  const hint = result.not_found.length > 0
    ? `未找到 PID：${result.not_found.join(', ')} — 请补充进程名或扩大时间窗口`
    : '';
  assert('可生成可读提示', hint.length > 0, hint);
  console.log(`  → ${hint}`);
}

// ── 验证条目 5：window.end 兜底 — 进程在窗口内仍存活 ────────────────────────────

console.log('\n[条目5] 窗口结束时进程仍存活 — end_time 使用 window.end');
{
  const parsed = loadFixture('pid_single.log');
  const narrowWindow: TimeWindow = {
    start: '05-20 10:00:00.000',
    end: '05-20 10:00:04.000',   // 早于 has died 行
  };
  const windowed = filterByTimeWindow(parsed.events, narrowWindow);
  const result = trackPidLifecycles(windowed, ['com.example.app'], narrowWindow);

  const seg = result.lifecycles[0]?.segments[0];
  assert('有生命周期片段', !!seg);
  assert('end_time 为 window.end', seg?.end_time === '05-20 10:00:04.000', `实际: ${seg?.end_time}`);
  console.log(`  → end_time（兜底）: ${seg?.end_time}`);
}

// ── 汇总 ──────────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`结果：${passed} passed，${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
