import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { parseLogFile } from '../src/server/pipeline/logParser.js';
import { filterByTimeWindow } from '../src/server/pipeline/timeWindow.js';
import { trackPidLifecycles } from '../src/server/pipeline/pidTracker.js';
import { analyzeTags } from '../src/server/pipeline/tagAnalyzer.js';
import { extractSystemEvents } from '../src/server/pipeline/systemEventExtractor.js';
import { buildTimeline } from '../src/server/pipeline/timelineBuilder.js';
import { buildTriageReportInput } from '../src/server/ai/reportInputBuilder.js';
import type { TimeWindow } from '../src/shared/types.js';

const FIXTURES = path.resolve(__dirname, 'fixtures');
const FULL_WINDOW: TimeWindow = {
  start: '05-20 00:00:00.000',
  end: '05-20 23:59:59.999',
};

function loadAndAnalyze(name: string, packages: string[]) {
  const events = parseLogFile(readFileSync(path.join(FIXTURES, name), 'utf-8')).events;
  const windowed = filterByTimeWindow(events, FULL_WINDOW);
  const { lifecycles } = trackPidLifecycles(windowed, packages, FULL_WINDOW);
  const tagAnalysis = analyzeTags(windowed, lifecycles);
  const systemEvents = extractSystemEvents(windowed, { lifecycles });
  const timeline = buildTimeline(windowed, lifecycles, systemEvents);
  return { events: windowed, lifecycles, tagAnalysis, timeline };
}

describe('buildTriageReportInput - core shape', () => {
  it('assembles a TriageReportInput with all required fields', () => {
    const { events, lifecycles, tagAnalysis, timeline } = loadAndAnalyze(
      'tag_timeline.log',
      ['com.example.app', 'com.example.helper']
    );

    const result = buildTriageReportInput({
      bugSummary: '点击按钮后应用 ANR',
      packages: ['com.example.app', 'com.example.helper'],
      timeWindow: FULL_WINDOW,
      lifecycles,
      tagAnalysis,
      timeline,
      windowedEvents: events,
    });

    expect(result.bug_summary).toBe('点击按钮后应用 ANR');
    expect(result.packages).toEqual(['com.example.app', 'com.example.helper']);
    expect(result.time_window).toBe(`${FULL_WINDOW.start} ~ ${FULL_WINDOW.end}`);
    expect(result.pid_lifecycles).toBe(lifecycles);
    expect(result.tag_statistics).toBe(tagAnalysis.statistics);
    expect(result.timeline).toBe(timeline);
    expect(result.key_log_evidence).toBeInstanceOf(Array);
  });

  it('falls back to a neutral default bug_summary when user provides none', () => {
    const { events, lifecycles, tagAnalysis, timeline } = loadAndAnalyze(
      'tag_timeline.log',
      ['com.example.app']
    );

    const result = buildTriageReportInput({
      bugSummary: '',
      packages: ['com.example.app'],
      timeWindow: FULL_WINDOW,
      lifecycles,
      tagAnalysis,
      timeline,
      windowedEvents: events,
    });

    // 默认值不应该包含"根因 / root cause"等强结论用语
    expect(result.bug_summary.length).toBeGreaterThan(0);
    expect(result.bug_summary).not.toMatch(/根因|root cause/i);
  });
});

describe('buildTriageReportInput - key_log_evidence selection', () => {
  it('includes the original LogEvent backing each system event in timeline', () => {
    const { events, lifecycles, tagAnalysis, timeline } = loadAndAnalyze(
      'tag_timeline.log',
      ['com.example.app', 'com.example.helper']
    );

    const result = buildTriageReportInput({
      bugSummary: 'x',
      packages: ['com.example.app', 'com.example.helper'],
      timeWindow: FULL_WINDOW,
      lifecycles,
      tagAnalysis,
      timeline,
      windowedEvents: events,
    });

    const systemLineNos = timeline
      .filter((e) => e.is_system_event)
      .map((e) => e.line_no);
    const evidenceLineNos = result.key_log_evidence.map((e) => e.line_no);
    for (const lineNo of systemLineNos) {
      expect(evidenceLineNos).toContain(lineNo);
    }
  });

  it('includes sample E-level events from anomalous tags', () => {
    const { events, lifecycles, tagAnalysis, timeline } = loadAndAnalyze(
      'tag_timeline.log',
      ['com.example.app', 'com.example.helper']
    );

    const result = buildTriageReportInput({
      bugSummary: 'x',
      packages: ['com.example.app', 'com.example.helper'],
      timeWindow: FULL_WINDOW,
      lifecycles,
      tagAnalysis,
      timeline,
      windowedEvents: events,
    });

    // AppCore 是异常 Tag（5 个 E）；evidence 应至少含 1 个 AppCore E
    const appCoreErrors = result.key_log_evidence.filter(
      (e) => e.tag === 'AppCore' && e.level === 'E'
    );
    expect(appCoreErrors.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty evidence when no system events and no anomalous tags', () => {
    // 只取一个不含系统事件的窄窗口，且单包名 PID 没有 E 等级
    const events = parseLogFile(
      readFileSync(path.join(FIXTURES, 'pid_single.log'), 'utf-8')
    ).events;
    const { lifecycles } = trackPidLifecycles(events, ['com.example.app'], FULL_WINDOW);
    const tagAnalysis = analyzeTags(events, lifecycles);
    const timeline = buildTimeline(events, lifecycles, []);

    const result = buildTriageReportInput({
      bugSummary: 'x',
      packages: ['com.example.app'],
      timeWindow: FULL_WINDOW,
      lifecycles,
      tagAnalysis,
      timeline,
      windowedEvents: events,
    });

    // pid_single.log 里 anomalous_tags 应为空（无 ≥3 个 E）
    expect(tagAnalysis.anomalous_tags).toHaveLength(0);
    // 没有系统事件 + 没有异常 Tag → evidence 应为空
    expect(result.key_log_evidence).toEqual([]);
  });

  it('caps key_log_evidence to keep model input token-bounded', () => {
    // 构造一个超大规模异常 Tag 的合成场景
    const events = Array.from({ length: 200 }, (_, i) => ({
      line_no: i + 1,
      timestamp: `05-20 10:00:${String(Math.floor(i / 60)).padStart(2, '0')}.${String((i % 60) * 16).padStart(3, '0')}`,
      pid: '5000',
      tid: '5000',
      level: 'E',
      tag: 'SpamTag',
      message: `error ${i}`,
    }));
    const lifecycles = [
      {
        package_name: 'com.spam.app',
        segments: [
          { pid: '5000', start_time: '05-20 10:00:00.000', end_time: '05-20 10:30:00.000' },
        ],
      },
    ];
    const tagAnalysis = analyzeTags(events, lifecycles);
    const timeline = buildTimeline(events, lifecycles, []);

    const result = buildTriageReportInput({
      bugSummary: 'x',
      packages: ['com.spam.app'],
      timeWindow: FULL_WINDOW,
      lifecycles,
      tagAnalysis,
      timeline,
      windowedEvents: events,
    });

    expect(tagAnalysis.anomalous_tags).toContain('SpamTag');
    // 即便有 200 条 E，evidence 也不会失控 — 应该 <= 50
    expect(result.key_log_evidence.length).toBeLessThanOrEqual(50);
  });
});
