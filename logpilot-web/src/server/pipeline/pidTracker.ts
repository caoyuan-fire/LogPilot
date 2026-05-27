import type { LogEvent, PidLifecycle, PidSegment, TimeWindow } from '../../shared/types.js';

/**
 * Patterns for detecting process start in ActivityManager logs.
 *
 * Android logcat examples:
 *   ActivityManager: Start proc 1234:com.example.app/u0a56 for ...
 *   ActivityManager: Start proc com.example.app for ...  (older format, no PID in tag)
 */
const START_PROC_REGEX = /Start proc\s+(\d+):([^/\s]+)/;
const START_PROC_NO_PID_REGEX = /Start proc\s+([a-zA-Z][a-zA-Z0-9._]+)\s+for/;

/**
 * Patterns for detecting process death.
 *
 *   ActivityManager: Process com.example.app (pid 1234) has died
 *   ActivityManager: Killing 1234:com.example.app/u0a56
 */
const PROC_DIED_REGEX = /Process\s+([a-zA-Z][a-zA-Z0-9._]+)\s*\(pid\s+(\d+)\)\s+has died/;
const KILLING_REGEX = /Killing\s+(\d+):([^/\s]+)/;

/**
 * Pattern for ANR / crash attribution lines which also mark end-of-life:
 *   ActivityManager: ANR in com.example.app (pid 1234)
 */
const ANR_REGEX = /ANR in\s+([a-zA-Z][a-zA-Z0-9._]+)/;

// ─────────────────────────────────────────────────────────────────────────────

export interface PidTrackResult {
  lifecycles: PidLifecycle[];
  /** Packages requested but for which no PID was ever found */
  not_found: string[];
}

/**
 * Scan log events for process-lifecycle signals and build PidLifecycle records
 * for each requested package name.
 *
 * Rules:
 * - A "Start proc" line opens a new segment for the package.
 * - "has died" / "Killing" closes the most-recent open segment for that PID.
 * - If a segment is still open at scan-end, window.end is used as end_time.
 * - Multiple starts without intervening death → multiple overlapping segments
 *   (each start opens a new one; we do not force-close the previous).
 * - packages matching is substring / exact match against the package field
 *   extracted from the log line.
 */
export function trackPidLifecycles(
  events: LogEvent[],
  packages: string[],
  window: TimeWindow
): PidTrackResult {
  if (packages.length === 0) {
    return { lifecycles: [], not_found: [] };
  }

  const normalizedPackages = packages.map((p) => p.trim().toLowerCase());

  // Map: packageName → list of open segments (start_time set, end_time = '')
  const openSegments = new Map<string, Array<{ pid: string; start_time: string }>>();
  // Map: packageName → completed segments
  const completedSegments = new Map<string, PidSegment[]>();
  // Map: pid → packageName (for death detection by PID)
  const pidToPackage = new Map<string, string>();

  for (const pkg of normalizedPackages) {
    openSegments.set(pkg, []);
    completedSegments.set(pkg, []);
  }

  for (const event of events) {
    const msg = event.message;
    const tag = event.tag;

    // ── Start proc ──────────────────────────────────────────────────────────
    if (tag === 'ActivityManager') {
      const startMatch = msg.match(START_PROC_REGEX);
      if (startMatch) {
        const pid = startMatch[1];
        const pkgRaw = startMatch[2].toLowerCase();
        const matchedPkg = normalizedPackages.find(
          (p) => pkgRaw === p || pkgRaw.startsWith(p) || p.startsWith(pkgRaw)
        );
        if (matchedPkg) {
          openSegments.get(matchedPkg)!.push({ pid, start_time: event.timestamp });
          pidToPackage.set(pid, matchedPkg);
        }
        continue;
      }

      // Older format: no PID in Start proc line
      const startNoPidMatch = msg.match(START_PROC_NO_PID_REGEX);
      if (startNoPidMatch) {
        const pkgRaw = startNoPidMatch[1].toLowerCase();
        const matchedPkg = normalizedPackages.find(
          (p) => pkgRaw === p || pkgRaw.startsWith(p) || p.startsWith(pkgRaw)
        );
        if (matchedPkg) {
          // Use the event's own PID as a best-effort value
          openSegments.get(matchedPkg)!.push({ pid: event.pid, start_time: event.timestamp });
          pidToPackage.set(event.pid, matchedPkg);
        }
        continue;
      }

      // ── Process has died ─────────────────────────────────────────────────
      const diedMatch = msg.match(PROC_DIED_REGEX);
      if (diedMatch) {
        const pkgRaw = diedMatch[1].toLowerCase();
        const pid = diedMatch[2];
        closeSegment(pkgRaw, pid, event.timestamp, normalizedPackages, openSegments, completedSegments, pidToPackage);
        continue;
      }

      // ── Killing ───────────────────────────────────────────────────────────
      const killingMatch = msg.match(KILLING_REGEX);
      if (killingMatch) {
        const pid = killingMatch[1];
        const pkgRaw = killingMatch[2].toLowerCase();
        closeSegment(pkgRaw, pid, event.timestamp, normalizedPackages, openSegments, completedSegments, pidToPackage);
        continue;
      }
    }

    // ── ANR (any tag) ────────────────────────────────────────────────────────
    const anrMatch = msg.match(ANR_REGEX);
    if (anrMatch) {
      const pkgRaw = anrMatch[1].toLowerCase();
      const matchedPkg = normalizedPackages.find(
        (p) => pkgRaw === p || pkgRaw.startsWith(p) || p.startsWith(pkgRaw)
      );
      if (matchedPkg) {
        // Close the most recent open segment for this package
        const open = openSegments.get(matchedPkg)!;
        if (open.length > 0) {
          const seg = open.pop()!;
          completedSegments.get(matchedPkg)!.push({
            pid: seg.pid,
            start_time: seg.start_time,
            end_time: event.timestamp,
          });
          pidToPackage.delete(seg.pid);
        }
      }
    }
  }

  // ── Close any still-open segments with window.end ────────────────────────
  for (const pkg of normalizedPackages) {
    const open = openSegments.get(pkg)!;
    const completed = completedSegments.get(pkg)!;
    for (const seg of open) {
      completed.push({
        pid: seg.pid,
        start_time: seg.start_time,
        end_time: window.end,
      });
    }
    openSegments.set(pkg, []);
  }

  // ── Build result ─────────────────────────────────────────────────────────
  const lifecycles: PidLifecycle[] = [];
  const not_found: string[] = [];

  for (const pkg of normalizedPackages) {
    const segments = completedSegments.get(pkg)!;
    if (segments.length === 0) {
      not_found.push(pkg);
    } else {
      lifecycles.push({ package_name: pkg, segments });
    }
  }

  return { lifecycles, not_found };
}

// ─────────────────────────────────────────────────────────────────────────────

function closeSegment(
  pkgRaw: string,
  pid: string,
  endTime: string,
  normalizedPackages: string[],
  openSegments: Map<string, Array<{ pid: string; start_time: string }>>,
  completedSegments: Map<string, PidSegment[]>,
  pidToPackage: Map<string, string>
): void {
  // Try direct package match first
  const matchedPkg =
    normalizedPackages.find((p) => pkgRaw === p || pkgRaw.startsWith(p) || p.startsWith(pkgRaw)) ??
    pidToPackage.get(pid);

  if (!matchedPkg) return;

  const open = openSegments.get(matchedPkg);
  if (!open) return;

  // Close the segment whose PID matches, or the most recent open one
  const idx = open.findIndex((s) => s.pid === pid);
  if (idx !== -1) {
    const [seg] = open.splice(idx, 1);
    completedSegments.get(matchedPkg)!.push({
      pid: seg.pid,
      start_time: seg.start_time,
      end_time: endTime,
    });
    pidToPackage.delete(pid);
  }
}
