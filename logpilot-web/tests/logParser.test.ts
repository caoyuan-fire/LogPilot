import { describe, it, expect } from 'vitest';
import { parseLogLine, parseLogFile } from '../src/server/pipeline/logParser.js';
import { filterByTimeWindow, parseTimeInput } from '../src/server/pipeline/timeWindow.js';
import type { LogEvent } from '../src/shared/types.js';
import { readFileSync } from 'fs';
import path from 'path';

describe('parseLogLine', () => {
  it('parses a standard logcat line with hex prefix', () => {
    const line = 'M081600  05-20 18:44:46.791  1048  1328 E GnssCallbckJni: gnssNmeaCb: NMEA:$GPGSV';
    const result = parseLogLine(line, 1);

    expect(result).not.toBeNull();
    const event = result as LogEvent;
    expect(event.line_no).toBe(1);
    expect(event.timestamp).toBe('05-20 18:44:46.791');
    expect(event.pid).toBe('1048');
    expect(event.tid).toBe('1328');
    expect(event.level).toBe('E');
    expect(event.tag).toBe('GnssCallbckJni');
    expect(event.message).toBe('gnssNmeaCb: NMEA:$GPGSV');
  });

  it('parses a line with S prefix', () => {
    const line = 'S081608  05-20 18:44:47.028   594 24488 E TboxTest: handleSomeipCallback';
    const result = parseLogLine(line, 12);

    expect(result).not.toBeNull();
    const event = result as LogEvent;
    expect(event.pid).toBe('594');
    expect(event.tid).toBe('24488');
    expect(event.tag).toBe('TboxTest');
    expect(event.message).toBe('handleSomeipCallback');
  });

  it('parses a line with tag that has trailing spaces', () => {
    const line = 'M081617  05-20 18:44:47.082  2465 27477 W adbd    : timed out while waiting';
    const result = parseLogLine(line, 5);

    expect(result).not.toBeNull();
    const event = result as LogEvent;
    expect(event.tag).toBe('adbd');
    expect(event.level).toBe('W');
    expect(event.message).toBe('timed out while waiting');
  });

  it('parses a line with 5-digit PID and TID', () => {
    const line = 'M08163B  05-20 18:44:47.786 13161 17218 E LocationManager: getGpsStatus';
    const result = parseLogLine(line, 10);

    expect(result).not.toBeNull();
    const event = result as LogEvent;
    expect(event.pid).toBe('13161');
    expect(event.tid).toBe('17218');
  });

  it('returns null for unparseable lines', () => {
    const result = parseLogLine('this is an unparseable line', 99);
    expect(result).toBeNull();
  });

  it('returns null for empty lines', () => {
    const result = parseLogLine('', 1);
    expect(result).toBeNull();
  });

  // ─── adb logcat -v threadtime (no hex prefix) ───────────────────────────────
  it('parses a standard adb logcat -v threadtime line without hex prefix', () => {
    const line = '01-01 00:00:05.801   321   321 I lowmemorykiller: unisoc update props done';
    const result = parseLogLine(line, 1);

    expect(result).not.toBeNull();
    const event = result as LogEvent;
    expect(event.timestamp).toBe('01-01 00:00:05.801');
    expect(event.pid).toBe('321');
    expect(event.tid).toBe('321');
    expect(event.level).toBe('I');
    expect(event.tag).toBe('lowmemorykiller');
    expect(event.message).toBe('unisoc update props done');
  });

  it('parses adb logcat E-level line with multi-word tag', () => {
    const line = '05-27 16:55:10.123  1234  5678 E ActivityManager: ANR in com.example.foo (pid 9999)';
    const result = parseLogLine(line, 7);

    expect(result).not.toBeNull();
    const event = result as LogEvent;
    expect(event.pid).toBe('1234');
    expect(event.tag).toBe('ActivityManager');
    expect(event.level).toBe('E');
    expect(event.message).toBe('ANR in com.example.foo (pid 9999)');
  });

  it('does NOT misparse the logcat banner line', () => {
    const result = parseLogLine('--------- beginning of main', 1);
    expect(result).toBeNull();
  });
});

describe('parseLogFile', () => {
  it('parses a fixture file and reports counts correctly', () => {
    const fixturePath = path.resolve(__dirname, 'fixtures/basic_logcat.log');
    const content = readFileSync(fixturePath, 'utf-8');
    const result = parseLogFile(content);

    expect(result.total_lines).toBe(15);
    expect(result.events.length).toBe(13);
    expect(result.unparsed.length).toBe(2);
  });

  it('preserves unparsed lines with their line numbers', () => {
    const content = 'good line should fail\nbad line too\nM081600  05-20 18:44:46.791  1048  1328 E Tag: msg';
    const result = parseLogFile(content);

    expect(result.unparsed.length).toBe(2);
    expect(result.unparsed[0].line_no).toBe(1);
    expect(result.unparsed[0].raw).toBe('good line should fail');
    expect(result.unparsed[1].line_no).toBe(2);
    expect(result.events.length).toBe(1);
    expect(result.events[0].line_no).toBe(3);
  });
});

describe('filterByTimeWindow', () => {
  const events: LogEvent[] = [
    { line_no: 1, timestamp: '05-20 18:44:46.000', pid: '100', tid: '100', level: 'E', tag: 'A', message: 'before' },
    { line_no: 2, timestamp: '05-20 18:44:47.000', pid: '100', tid: '100', level: 'E', tag: 'A', message: 'start edge' },
    { line_no: 3, timestamp: '05-20 18:44:48.000', pid: '100', tid: '100', level: 'E', tag: 'A', message: 'middle' },
    { line_no: 4, timestamp: '05-20 18:44:49.000', pid: '100', tid: '100', level: 'E', tag: 'A', message: 'end edge' },
    { line_no: 5, timestamp: '05-20 18:44:50.000', pid: '100', tid: '100', level: 'E', tag: 'A', message: 'after' },
  ];

  it('includes events within start and end inclusive', () => {
    const filtered = filterByTimeWindow(events, {
      start: '05-20 18:44:47.000',
      end: '05-20 18:44:49.000',
    });

    expect(filtered.length).toBe(3);
    expect(filtered[0].message).toBe('start edge');
    expect(filtered[1].message).toBe('middle');
    expect(filtered[2].message).toBe('end edge');
  });

  it('returns empty array when no events match', () => {
    const filtered = filterByTimeWindow(events, {
      start: '05-20 19:00:00.000',
      end: '05-20 19:01:00.000',
    });

    expect(filtered.length).toBe(0);
  });

  it('handles time point with default +/- 5 minutes window', () => {
    const filtered = filterByTimeWindow(events, {
      start: '05-20 18:44:45.000',
      end: '05-20 18:44:55.000',
    });

    expect(filtered.length).toBe(5);
  });
});

describe('parseTimeInput', () => {
  const datePrefix = '05-20 ';

  it('parses range format with ~', () => {
    const window = parseTimeInput('18:45:00~18:46:00', datePrefix);
    expect(window.start).toBe('05-20 18:45:00.000');
    expect(window.end).toBe('05-20 18:46:00.000');
  });

  it('parses range format with spaces around ~', () => {
    const window = parseTimeInput('18:45:00 ~ 18:46:00', datePrefix);
    expect(window.start).toBe('05-20 18:45:00.000');
    expect(window.end).toBe('05-20 18:46:00.000');
  });

  it('parses range with milliseconds', () => {
    const window = parseTimeInput('18:45:00.100~18:46:00.900', datePrefix);
    expect(window.start).toBe('05-20 18:45:00.100');
    expect(window.end).toBe('05-20 18:46:00.900');
  });

  it('expands single time point by ±5 minutes', () => {
    const window = parseTimeInput('18:45:30', datePrefix);
    expect(window.start).toBe('05-20 18:40:30.000');
    expect(window.end).toBe('05-20 18:50:30.000');
  });

  it('throws on invalid format', () => {
    expect(() => parseTimeInput('not-a-time', datePrefix)).toThrow('时间格式错误');
  });
});
