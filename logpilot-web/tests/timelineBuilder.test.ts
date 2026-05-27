import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { parseLogFile } from '../src/server/pipeline/logParser.js';
import { trackPidLifecycles } from '../src/server/pipeline/pidTracker.js';
import { extractSystemEvents } from '../src/server/pipeline/systemEventExtractor.js';
import { buildTimeline } from '../src/server/pipeline/timelineBuilder.js';
import type { LogEvent, TimeWindow } from '../src/shared/types.js';

const FIXTURES = path.resolve(__dirname, 'fixtures');

function loadEvents(name: string) {
  return parseLogFile(readFileSync(path.join(FIXTURES, name), 'utf-8')).events;
}

const FULL_WINDOW: TimeWindow = {
  start: '05-20 00:00:00.000',
  end: '05-20 23:59:59.999',
};

describe('buildTimeline - target PID key events', () => {
  it('includes W/E/F events from target PIDs within their lifecycle segments', () => {
    const events = loadEvents('tag_timeline.log');
    const { lifecycles } = trackPidLifecycles(
      events,
      ['com.example.app', 'com.example.helper'],
      FULL_WINDOW
    );
    const systemEvents = extractSystemEvents(events, { lifecycles });
    const timeline = buildTimeline(events, lifecycles, systemEvents);

    const appWarn = timeline.find(
      (e) => e.pid === '2100' && e.level === 'W' && e.tag === 'AppCore'
    );
    expect(appWarn).toBeDefined();
    expect(appWarn!.is_system_event).toBe(false);
    expect(appWarn!.source).toBe('com.example.app:2100');

    // I-level events from target PID should NOT be promoted to the timeline
    const onCreate = timeline.find((e) => e.message === 'onCreate');
    expect(onCreate).toBeUndefined();
  });
});

describe('buildTimeline - system events', () => {
  it('includes ANR / Watchdog / FATAL / Killing / LMK / Input timeout, all marked as system', () => {
    const events = loadEvents('tag_timeline.log');
    const { lifecycles } = trackPidLifecycles(
      events,
      ['com.example.app', 'com.example.helper'],
      FULL_WINDOW
    );
    const systemEvents = extractSystemEvents(events, { lifecycles });
    const timeline = buildTimeline(events, lifecycles, systemEvents);

    const systemSlice = timeline.filter((e) => e.is_system_event);
    const messages = systemSlice.map((e) => e.message).join(' | ');

    expect(messages).toMatch(/ANR in com\.example\.app/);
    expect(messages).toMatch(/Watchdog|!@Sync/);
    expect(messages).toMatch(/FATAL EXCEPTION/);
    expect(messages).toMatch(/Killing 3500:com\.example\.helper/);
    expect(messages).toMatch(/Input dispatching timed out/);

    // System sources must explicitly NOT be the target package
    for (const ev of systemSlice) {
      expect(ev.source.startsWith('system:')).toBe(true);
      expect(ev.source).not.toContain('com.example.app');
      expect(ev.source).not.toContain('com.example.helper');
    }
  });
});

describe('buildTimeline - sorting across packages', () => {
  it('sorts the merged timeline strictly by timestamp ascending', () => {
    const events = loadEvents('tag_timeline.log');
    const { lifecycles } = trackPidLifecycles(
      events,
      ['com.example.app', 'com.example.helper'],
      FULL_WINDOW
    );
    const systemEvents = extractSystemEvents(events, { lifecycles });
    const timeline = buildTimeline(events, lifecycles, systemEvents);

    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i - 1].timestamp <= timeline[i].timestamp).toBe(true);
    }

    // First entries must include events from BOTH packages (cross-package interleaving)
    const sourcesSeen = new Set(timeline.map((e) => e.source));
    expect(sourcesSeen.has('com.example.app:2100')).toBe(true);
    expect(sourcesSeen.has('com.example.helper:3500')).toBe(true);
  });
});

describe('buildTimeline - compression of repeated events', () => {
  it('folds adjacent identical (pid, tag, level, message) events and keeps the first line_no', () => {
    const repeated: LogEvent[] = [];
    for (let i = 0; i < 5; i++) {
      repeated.push({
        line_no: 100 + i,
        timestamp: `05-20 11:00:0${i}.000`,
        pid: '4242',
        tid: '4242',
        level: 'E',
        tag: 'SpamTag',
        message: 'identical error',
      });
    }
    const lifecycles = [
      {
        package_name: 'com.example.spam',
        segments: [
          { pid: '4242', start_time: '05-20 11:00:00.000', end_time: '05-20 11:00:10.000' },
        ],
      },
    ];

    const timeline = buildTimeline(repeated, lifecycles, []);
    const folded = timeline.filter((e) => e.tag === 'SpamTag');
    expect(folded).toHaveLength(1);
    expect(folded[0].compressed_count).toBe(5);
    expect(folded[0].line_no).toBe(100);
  });

  it('does not fold when message differs', () => {
    const distinct: LogEvent[] = ['a', 'b', 'c'].map((m, i) => ({
      line_no: 200 + i,
      timestamp: `05-20 11:00:0${i}.000`,
      pid: '4242',
      tid: '4242',
      level: 'E',
      tag: 'OtherTag',
      message: `error ${m}`,
    }));
    const lifecycles = [
      {
        package_name: 'com.example.x',
        segments: [
          { pid: '4242', start_time: '05-20 11:00:00.000', end_time: '05-20 11:00:10.000' },
        ],
      },
    ];

    const timeline = buildTimeline(distinct, lifecycles, []);
    const rows = timeline.filter((e) => e.tag === 'OtherTag');
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.compressed_count === undefined || r.compressed_count === 1)).toBe(true);
  });
});

describe('buildTimeline - empty inputs', () => {
  it('returns an empty timeline when no lifecycles and no system events', () => {
    expect(buildTimeline([], [], [])).toEqual([]);
  });
});
