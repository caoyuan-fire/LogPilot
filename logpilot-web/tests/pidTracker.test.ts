import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { parseLogFile } from '../src/server/pipeline/logParser.js';
import { filterByTimeWindow } from '../src/server/pipeline/timeWindow.js';
import { trackPidLifecycles } from '../src/server/pipeline/pidTracker.js';
import type { TimeWindow } from '../src/shared/types.js';

const FIXTURES = path.resolve(__dirname, 'fixtures');

function loadFixture(name: string) {
  const content = readFileSync(path.join(FIXTURES, name), 'utf-8');
  return parseLogFile(content).events;
}

const FULL_WINDOW: TimeWindow = {
  start: '05-20 00:00:00.000',
  end: '05-20 23:59:59.999',
};

// ─────────────────────────────────────────────────────────────────────────────
// 场景 1：单包名单 PID
// ─────────────────────────────────────────────────────────────────────────────
describe('trackPidLifecycles - single package single PID', () => {
  it('finds one PID segment for the requested package', () => {
    const events = loadFixture('pid_single.log');
    const result = trackPidLifecycles(events, ['com.example.app'], FULL_WINDOW);

    expect(result.not_found).toHaveLength(0);
    expect(result.lifecycles).toHaveLength(1);

    const lc = result.lifecycles[0];
    expect(lc.package_name).toBe('com.example.app');
    expect(lc.segments).toHaveLength(1);
    expect(lc.segments[0].pid).toBe('2100');
    expect(lc.segments[0].start_time).toBe('05-20 10:00:00.000');
    expect(lc.segments[0].end_time).toBe('05-20 10:00:05.000');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 场景 2：同一包名进程重启 → 两个 PID 片段
// ─────────────────────────────────────────────────────────────────────────────
describe('trackPidLifecycles - process restart produces two segments', () => {
  it('returns two segments for the same package after a restart', () => {
    const events = loadFixture('pid_restart.log');
    const result = trackPidLifecycles(events, ['com.example.app'], FULL_WINDOW);

    expect(result.not_found).toHaveLength(0);
    const lc = result.lifecycles[0];
    expect(lc.segments).toHaveLength(2);

    // First segment: pid 2100
    expect(lc.segments[0].pid).toBe('2100');
    expect(lc.segments[0].start_time).toBe('05-20 10:00:00.000');
    expect(lc.segments[0].end_time).toBe('05-20 10:00:03.000');

    // Second segment: pid 3300
    expect(lc.segments[1].pid).toBe('3300');
    expect(lc.segments[1].start_time).toBe('05-20 10:00:05.000');
    expect(lc.segments[1].end_time).toBe('05-20 10:00:10.000');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 场景 3：两个包名各自独立追踪
// ─────────────────────────────────────────────────────────────────────────────
describe('trackPidLifecycles - two packages tracked independently', () => {
  it('returns separate lifecycles for each package without mixing', () => {
    const events = loadFixture('pid_multi_package.log');
    const result = trackPidLifecycles(
      events,
      ['com.example.app', 'com.example.helper'],
      FULL_WINDOW
    );

    expect(result.not_found).toHaveLength(0);
    expect(result.lifecycles).toHaveLength(2);

    const appLc = result.lifecycles.find((l) => l.package_name === 'com.example.app');
    const helperLc = result.lifecycles.find((l) => l.package_name === 'com.example.helper');

    expect(appLc).toBeDefined();
    expect(helperLc).toBeDefined();

    expect(appLc!.segments).toHaveLength(1);
    expect(appLc!.segments[0].pid).toBe('2100');
    expect(appLc!.segments[0].end_time).toBe('05-20 10:00:05.000');

    expect(helperLc!.segments).toHaveLength(1);
    expect(helperLc!.segments[0].pid).toBe('3500');
    expect(helperLc!.segments[0].end_time).toBe('05-20 10:00:06.000');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 场景 4：包名不存在 → not_found 返回可读提示
// ─────────────────────────────────────────────────────────────────────────────
describe('trackPidLifecycles - package not found', () => {
  it('puts missing packages in not_found list, not lifecycles', () => {
    const events = loadFixture('pid_single.log');
    const result = trackPidLifecycles(events, ['com.nonexistent.pkg'], FULL_WINDOW);

    expect(result.lifecycles).toHaveLength(0);
    expect(result.not_found).toContain('com.nonexistent.pkg');
  });

  it('handles mixed: one found, one not found', () => {
    const events = loadFixture('pid_single.log');
    const result = trackPidLifecycles(
      events,
      ['com.example.app', 'com.nonexistent.pkg'],
      FULL_WINDOW
    );

    expect(result.lifecycles).toHaveLength(1);
    expect(result.not_found).toContain('com.nonexistent.pkg');
    expect(result.not_found).not.toContain('com.example.app');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 场景 5：窗口结束时仍在运行 → end_time 使用 window.end
// ─────────────────────────────────────────────────────────────────────────────
describe('trackPidLifecycles - open segment closed by window end', () => {
  it('uses window.end as end_time when process is still alive at window end', () => {
    const events = loadFixture('pid_single.log');
    // Use a window that ends BEFORE the "has died" log line
    const narrowWindow: TimeWindow = {
      start: '05-20 10:00:00.000',
      end: '05-20 10:00:04.000',
    };
    const windowedEvents = filterByTimeWindow(events, narrowWindow);
    const result = trackPidLifecycles(windowedEvents, ['com.example.app'], narrowWindow);

    expect(result.lifecycles).toHaveLength(1);
    expect(result.lifecycles[0].segments[0].end_time).toBe('05-20 10:00:04.000');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 场景 6：空包名列表
// ─────────────────────────────────────────────────────────────────────────────
describe('trackPidLifecycles - empty packages input', () => {
  it('returns empty result for empty packages array', () => {
    const events = loadFixture('pid_single.log');
    const result = trackPidLifecycles(events, [], FULL_WINDOW);
    expect(result.lifecycles).toHaveLength(0);
    expect(result.not_found).toHaveLength(0);
  });
});
