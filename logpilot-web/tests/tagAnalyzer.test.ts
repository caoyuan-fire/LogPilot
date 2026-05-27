import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { parseLogFile } from '../src/server/pipeline/logParser.js';
import { filterByTimeWindow } from '../src/server/pipeline/timeWindow.js';
import { trackPidLifecycles } from '../src/server/pipeline/pidTracker.js';
import { analyzeTags } from '../src/server/pipeline/tagAnalyzer.js';
import type { TimeWindow } from '../src/shared/types.js';

const FIXTURES = path.resolve(__dirname, 'fixtures');

function loadEvents(name: string) {
  const content = readFileSync(path.join(FIXTURES, name), 'utf-8');
  return parseLogFile(content).events;
}

const FULL_WINDOW: TimeWindow = {
  start: '05-20 00:00:00.000',
  end: '05-20 23:59:59.999',
};

describe('analyzeTags - basic frequency and level distribution', () => {
  it('counts tags per (package, pid) and reports level distribution', () => {
    const events = loadEvents('tag_timeline.log');
    const { lifecycles } = trackPidLifecycles(
      events,
      ['com.example.app', 'com.example.helper'],
      FULL_WINDOW
    );
    const result = analyzeTags(events, lifecycles);

    const appCore = result.statistics.find(
      (s) => s.package_name === 'com.example.app' && s.tag === 'AppCore'
    );
    expect(appCore).toBeDefined();
    expect(appCore!.pid).toBe('2100');
    expect(appCore!.count).toBe(11);
    expect(appCore!.levels.D).toBe(5);
    expect(appCore!.levels.W).toBe(1);
    expect(appCore!.levels.E).toBe(5);
    expect(appCore!.first_seen).toBe('05-20 10:00:01.000');
    expect(appCore!.last_seen).toBe('05-20 10:00:04.800');
  });

  it('keeps statistics isolated per package and PID', () => {
    const events = loadEvents('tag_timeline.log');
    const { lifecycles } = trackPidLifecycles(
      events,
      ['com.example.app', 'com.example.helper'],
      FULL_WINDOW
    );
    const result = analyzeTags(events, lifecycles);

    const helperCore = result.statistics.find(
      (s) => s.package_name === 'com.example.helper' && s.tag === 'HelperCore'
    );
    expect(helperCore).toBeDefined();
    expect(helperCore!.pid).toBe('3500');
    expect(helperCore!.count).toBe(2);
    expect(helperCore!.levels.D).toBe(1);
    expect(helperCore!.levels.W).toBe(1);
    // helper events must not leak into app stats
    const appTagsOnly = result.statistics.filter((s) => s.package_name === 'com.example.app');
    expect(appTagsOnly.every((s) => s.pid === '2100')).toBe(true);
  });

  it('produces one statistic row per PID across restarts of the same package', () => {
    const events = loadEvents('pid_restart.log');
    const { lifecycles } = trackPidLifecycles(events, ['com.example.app'], FULL_WINDOW);
    const result = analyzeTags(events, lifecycles);

    const appRows = result.statistics.filter(
      (s) => s.package_name === 'com.example.app' && s.tag === 'com.example.app'
    );
    const pids = new Set(appRows.map((r) => r.pid));
    expect(pids.has('2100')).toBe(true);
    expect(pids.has('3300')).toBe(true);
  });

  it('flags anomaly-dense tags (>=3 ERROR/FATAL events)', () => {
    const events = loadEvents('tag_timeline.log');
    const { lifecycles } = trackPidLifecycles(
      events,
      ['com.example.app', 'com.example.helper'],
      FULL_WINDOW
    );
    const result = analyzeTags(events, lifecycles);

    expect(result.anomalous_tags).toContain('AppCore');
    // HelperCore has only D/W, must not be flagged
    expect(result.anomalous_tags).not.toContain('HelperCore');
  });

  it('returns empty result when no lifecycles match', () => {
    const events = loadEvents('tag_timeline.log');
    const result = analyzeTags(events, []);
    expect(result.statistics).toHaveLength(0);
    expect(result.anomalous_tags).toHaveLength(0);
  });

  it('honors the lifecycle segment time bounds (drops events outside segments)', () => {
    const events = loadEvents('tag_timeline.log');
    // Use a narrow lifecycle that only covers the first 2 seconds for com.example.app
    const lifecycles = [
      {
        package_name: 'com.example.app',
        segments: [
          { pid: '2100', start_time: '05-20 10:00:00.000', end_time: '05-20 10:00:02.000' },
        ],
      },
    ];
    const windowed = filterByTimeWindow(events, FULL_WINDOW);
    const result = analyzeTags(windowed, lifecycles);

    const appCore = result.statistics.find((s) => s.tag === 'AppCore');
    expect(appCore).toBeDefined();
    // Within [10:00:00.000, 10:00:02.000] inclusive there are 5 D events + 1 W event = 6
    expect(appCore!.count).toBe(6);
    expect(appCore!.levels.D).toBe(5);
    expect(appCore!.levels.W).toBe(1);
    expect(appCore!.levels.E).toBeUndefined();
  });
});
