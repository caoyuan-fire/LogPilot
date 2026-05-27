import type { LogEvent, PidLifecycle, TimelineEvent } from '../../shared/types.js';

/**
 * Patterns and tags that identify Android/座舱 system-level events.
 *
 * The intent is to surface events that *may* relate to the target app's
 * incident (ANR, watchdog, low-memory kill, fatal exception, input
 * timeout, etc.) but which originate from a system process — not from
 * the target PID. The extractor must NEVER attribute these events to the
 * target app's PID; that is left to AI triage (JOB-004) and only when
 * evidence supports it.
 */
const SYSTEM_TAG_PATTERNS = [
  /^Watchdog$/i,
  /^AndroidRuntime$/i,
  /^lowmemorykiller$/i,
  /^InputDispatcher$/i,
  /^DropBoxManagerService$/i,
];

interface SystemPattern {
  /** Human-readable kind shown to operator */
  kind: string;
  /** Match either the tag, the message regex, or both */
  tag?: RegExp;
  message?: RegExp;
}

const SYSTEM_MESSAGE_PATTERNS: SystemPattern[] = [
  { kind: 'ANR', tag: /^ActivityManager$/, message: /\bANR in\b/ },
  { kind: 'Killing', tag: /^ActivityManager$/, message: /\bKilling\s+\d+:/ },
  { kind: 'FATAL_EXCEPTION', message: /FATAL EXCEPTION/ },
  { kind: 'Watchdog', message: /Watchdog|!@Sync/ },
  { kind: 'INPUT_TIMEOUT', message: /Input dispatching timed out/ },
  { kind: 'LMK', tag: /^lowmemorykiller$/, message: /Killing/ },
];

export interface SystemEventExtractOptions {
  /**
   * Lifecycles for the target packages. PIDs that appear in any lifecycle
   * segment are considered "target PIDs" and their events are NOT emitted
   * as system events even when they match a system pattern (those will
   * be picked up as target-side timeline events instead).
   */
  lifecycles: PidLifecycle[];
}

/**
 * Scan all windowed events and emit system-level TimelineEvent entries.
 *
 * - Events whose tag matches a SYSTEM_TAG_PATTERN are emitted.
 * - Events whose (tag, message) matches a SYSTEM_MESSAGE_PATTERNS row are emitted.
 * - Events whose PID is a target PID are skipped (no system attribution).
 * - Resulting events carry is_system_event=true and source="system:<tag>".
 */
export function extractSystemEvents(
  events: LogEvent[],
  options: SystemEventExtractOptions
): TimelineEvent[] {
  const targetPids = new Set<string>();
  for (const lc of options.lifecycles) {
    for (const seg of lc.segments) targetPids.add(seg.pid);
  }

  const out: TimelineEvent[] = [];

  for (const ev of events) {
    if (targetPids.has(ev.pid)) continue;
    if (!isSystemEvent(ev)) continue;

    out.push({
      timestamp: ev.timestamp,
      source: `system:${ev.tag}`,
      pid: ev.pid,
      level: ev.level,
      tag: ev.tag,
      message: ev.message,
      line_no: ev.line_no,
      is_system_event: true,
    });
  }

  return out;
}

function isSystemEvent(ev: LogEvent): boolean {
  for (const p of SYSTEM_TAG_PATTERNS) {
    if (p.test(ev.tag)) return true;
  }
  for (const p of SYSTEM_MESSAGE_PATTERNS) {
    const tagOk = p.tag ? p.tag.test(ev.tag) : true;
    const msgOk = p.message ? p.message.test(ev.message) : true;
    if (tagOk && msgOk && (p.tag || p.message)) return true;
  }
  return false;
}
