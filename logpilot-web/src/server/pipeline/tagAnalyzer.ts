import type {
  LogEvent,
  PidLifecycle,
  TagAnalysisResult,
  TagStatistic,
} from '../../shared/types.js';

/**
 * Analyze tag frequency, level distribution and first/last-seen for each
 * (package, pid, tag) tuple inside the given PID lifecycle segments.
 *
 * Inputs:
 *   events     – log events already restricted to the user time window
 *   lifecycles – PID lifecycle segments produced by trackPidLifecycles
 *
 * Tag whitelist is intentionally NOT used: every tag that shows up under a
 * target PID counts, no matter the business meaning. This is by design
 * (R6 — dynamic tag discovery).
 */
export function analyzeTags(
  events: LogEvent[],
  lifecycles: PidLifecycle[]
): TagAnalysisResult {
  if (lifecycles.length === 0) {
    return { statistics: [], anomalous_tags: [] };
  }

  // Index segments by PID → list of { package, start, end }
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

  // Aggregate per (package + pid + tag)
  const acc = new Map<string, TagStatistic>();

  for (const ev of events) {
    const segments = pidIndex.get(ev.pid);
    if (!segments) continue;

    for (const seg of segments) {
      if (ev.timestamp < seg.start || ev.timestamp > seg.end) continue;

      const key = `${seg.pkg}|${ev.pid}|${ev.tag}`;
      let stat = acc.get(key);
      if (!stat) {
        stat = {
          package_name: seg.pkg,
          pid: ev.pid,
          tag: ev.tag,
          count: 0,
          levels: {},
          first_seen: ev.timestamp,
          last_seen: ev.timestamp,
        };
        acc.set(key, stat);
      }
      stat.count += 1;
      stat.levels[ev.level] = (stat.levels[ev.level] ?? 0) + 1;
      if (ev.timestamp < stat.first_seen) stat.first_seen = ev.timestamp;
      if (ev.timestamp > stat.last_seen) stat.last_seen = ev.timestamp;
      break; // event already attributed to a segment
    }
  }

  const statistics = Array.from(acc.values()).sort((a, b) => b.count - a.count);

  const anomalous_tags = Array.from(
    new Set(statistics.filter(isAnomalous).map((s) => s.tag))
  );

  return { statistics, anomalous_tags };
}

/**
 * A tag is "anomaly-dense" when it has at least 3 ERROR/FATAL events under
 * the same PID, or when its total count is unusually large (>=50). The
 * threshold is conservative and tuned for Demo log sizes.
 */
function isAnomalous(stat: TagStatistic): boolean {
  const errors = (stat.levels.E ?? 0) + (stat.levels.F ?? 0);
  if (errors >= 3) return true;
  if (stat.count >= 50) return true;
  return false;
}
