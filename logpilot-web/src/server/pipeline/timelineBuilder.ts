import type {
  LogEvent,
  PidLifecycle,
  TimelineEvent,
} from '../../shared/types.js';

/**
 * Levels that are surfaced as target-PID "key events" in the timeline.
 * Lower-severity logs stay in the raw event stream and the AI report
 * input — they are not promoted to the operator-facing timeline.
 */
const KEY_LEVELS = new Set(['W', 'E', 'F']);

/**
 * Build a chronologically-sorted timeline of key events for the operator.
 *
 * Inputs:
 *   events       – windowed LogEvent stream
 *   lifecycles   – PID lifecycle segments for the target packages
 *   systemEvents – pre-extracted system-level TimelineEvents (ANR, Watchdog, …)
 *
 * Behavior:
 *   - For each (pid, segment) in lifecycles, include log events whose level
 *     is in KEY_LEVELS and whose timestamp falls inside the segment.
 *   - Adjacent identical events (same pid+tag+level+message) are folded
 *     into one TimelineEvent with `compressed_count` = N; the kept line_no
 *     is that of the FIRST sample so evidence stays traceable.
 *   - Target events are merged with systemEvents and sorted by timestamp.
 *   - Target events carry source="<pkg>:<pid>" and is_system_event=false;
 *     systemEvents are passed through unchanged.
 */
export function buildTimeline(
  events: LogEvent[],
  lifecycles: PidLifecycle[],
  systemEvents: TimelineEvent[]
): TimelineEvent[] {
  const pidIndex = new Map<string, Array<{ pkg: string; start: string; end: string }>>();
  for (const lc of lifecycles) {
    for (const seg of lc.segments) {
      if (!pidIndex.has(seg.pid)) pidIndex.set(seg.pid, []);
      pidIndex.get(seg.pid)!.push({
        pkg: lc.package_name,
        start: seg.start_time,
        end: seg.end_time,
      });
    }
  }

  const targetEvents: TimelineEvent[] = [];

  for (const ev of events) {
    if (!KEY_LEVELS.has(ev.level)) continue;
    const segments = pidIndex.get(ev.pid);
    if (!segments) continue;

    for (const seg of segments) {
      if (ev.timestamp < seg.start || ev.timestamp > seg.end) continue;

      const last = targetEvents[targetEvents.length - 1];
      if (
        last &&
        last.pid === ev.pid &&
        last.tag === ev.tag &&
        last.level === ev.level &&
        last.message === ev.message &&
        last.source === `${seg.pkg}:${ev.pid}`
      ) {
        last.compressed_count = (last.compressed_count ?? 1) + 1;
      } else {
        targetEvents.push({
          timestamp: ev.timestamp,
          source: `${seg.pkg}:${ev.pid}`,
          pid: ev.pid,
          level: ev.level,
          tag: ev.tag,
          message: ev.message,
          line_no: ev.line_no,
          is_system_event: false,
        });
      }
      break;
    }
  }

  const merged = [...targetEvents, ...systemEvents];
  merged.sort((a, b) => {
    if (a.timestamp < b.timestamp) return -1;
    if (a.timestamp > b.timestamp) return 1;
    return a.line_no - b.line_no;
  });

  return merged;
}
