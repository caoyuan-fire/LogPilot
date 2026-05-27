import type { LogEvent, TimeWindow } from '../../shared/types.js';

/**
 * Compare two timestamp strings in format "MM-DD HH:MM:SS.mmm".
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
function compareTimestamps(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Filter log events to only include those within the specified time window (inclusive).
 */
export function filterByTimeWindow(events: LogEvent[], window: TimeWindow): LogEvent[] {
  return events.filter((event) => {
    return (
      compareTimestamps(event.timestamp, window.start) >= 0 &&
      compareTimestamps(event.timestamp, window.end) <= 0
    );
  });
}

/**
 * Parse user time input into a TimeWindow.
 *
 * Supported formats:
 *   Range:  "18:45:00~18:46:00" or "18:45:00 ~ 18:46:00"
 *   Point:  "18:45:30" (auto-expands to ±5 minutes)
 *
 * datePrefix: the "MM-DD " prefix inferred from log data (e.g. "05-20 ")
 */
export function parseTimeInput(input: string, datePrefix: string): TimeWindow {
  const trimmed = input.trim();

  // Range format: contains ~
  if (trimmed.includes('~')) {
    const parts = trimmed.split('~').map(p => p.trim());
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(`时间窗口格式错误: "${input}"。期望格式: "HH:MM:SS~HH:MM:SS" 或 "HH:MM:SS"`);
    }
    return {
      start: normalizeTimestamp(parts[0], datePrefix),
      end: normalizeTimestamp(parts[1], datePrefix),
    };
  }

  // Single time point: expand ±5 minutes
  const centerMs = timeToMs(trimmed);
  const fiveMin = 5 * 60 * 1000;
  return {
    start: datePrefix + msToTime(Math.max(0, centerMs - fiveMin)),
    end: datePrefix + msToTime(centerMs + fiveMin),
  };
}

function normalizeTimestamp(time: string, datePrefix: string): string {
  // If already has date prefix (MM-DD ...), use as-is
  if (/^\d{2}-\d{2}\s/.test(time)) {
    return time;
  }
  // Append .000 if no milliseconds
  const withMs = /\.\d{3}$/.test(time) ? time : time + '.000';
  return datePrefix + withMs;
}

function timeToMs(time: string): number {
  // Parse HH:MM:SS or HH:MM:SS.mmm
  const match = time.match(/^(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?$/);
  if (!match) {
    throw new Error(`时间格式错误: "${time}"。期望格式: HH:MM:SS 或 HH:MM:SS.mmm`);
  }
  const [, h, m, s, ms] = match;
  return Number(h) * 3600000 + Number(m) * 60000 + Number(s) * 1000 + Number(ms || 0);
}

function msToTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}
