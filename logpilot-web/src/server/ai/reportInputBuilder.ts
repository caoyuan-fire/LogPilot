import type {
  LogEvent,
  PidLifecycle,
  TagAnalysisResult,
  TimeWindow,
  TimelineEvent,
  TriageReportInput,
} from '../../shared/types.js';

export interface BuildTriageInputArgs {
  /** User-supplied bug description; falls back to a neutral default when empty */
  bugSummary: string;
  packages: string[];
  timeWindow: TimeWindow;
  lifecycles: PidLifecycle[];
  tagAnalysis: TagAnalysisResult;
  timeline: TimelineEvent[];
  /** Parsed + windowed events (used to look up evidence rows by line_no) */
  windowedEvents: LogEvent[];
}

/** Max evidence rows shipped to the model. Caps token cost and keeps prompts focused. */
const MAX_EVIDENCE = 50;
/** Max example E events sampled per anomalous tag */
const PER_TAG_SAMPLES = 3;

/**
 * Assemble a TriageReportInput from the deterministic pipeline output. This is
 * the boundary between "确定性日志工程" and "AI 推断"：
 *
 *   - The model never sees raw logs.
 *   - The model only sees structured summaries + a tight, hand-picked
 *     `key_log_evidence` list whose line numbers it MUST cite.
 *   - Evidence is chosen from system events (full ANR/Watchdog/etc. lines)
 *     and a few error samples per anomalous Tag.
 */
export function buildTriageReportInput(args: BuildTriageInputArgs): TriageReportInput {
  const {
    bugSummary,
    packages,
    timeWindow,
    lifecycles,
    tagAnalysis,
    timeline,
    windowedEvents,
  } = args;

  const lineNoIndex = new Map<number, LogEvent>();
  for (const ev of windowedEvents) lineNoIndex.set(ev.line_no, ev);

  const evidence: LogEvent[] = [];
  const seen = new Set<number>();

  // 1) System events — pull the original LogEvent for each
  for (const tl of timeline) {
    if (!tl.is_system_event) continue;
    if (seen.has(tl.line_no)) continue;
    const ev = lineNoIndex.get(tl.line_no);
    if (ev) {
      evidence.push(ev);
      seen.add(tl.line_no);
    }
    if (evidence.length >= MAX_EVIDENCE) break;
  }

  // 2) Anomalous Tag — sample up to N E-level events per (pkg, pid, tag)
  if (evidence.length < MAX_EVIDENCE) {
    const anomalous = new Set(tagAnalysis.anomalous_tags);
    for (const stat of tagAnalysis.statistics) {
      if (!anomalous.has(stat.tag)) continue;
      let picked = 0;
      for (const ev of windowedEvents) {
        if (picked >= PER_TAG_SAMPLES) break;
        if (ev.pid !== stat.pid || ev.tag !== stat.tag) continue;
        if (ev.level !== 'E' && ev.level !== 'F') continue;
        if (seen.has(ev.line_no)) continue;
        evidence.push(ev);
        seen.add(ev.line_no);
        picked += 1;
        if (evidence.length >= MAX_EVIDENCE) break;
      }
      if (evidence.length >= MAX_EVIDENCE) break;
    }
  }

  // Keep evidence ordered by line_no for deterministic prompt assembly
  evidence.sort((a, b) => a.line_no - b.line_no);

  const summary = bugSummary.trim() || defaultBugSummary(packages, timeWindow);

  return {
    bug_summary: summary,
    packages,
    time_window: `${timeWindow.start} ~ ${timeWindow.end}`,
    pid_lifecycles: lifecycles,
    tag_statistics: tagAnalysis.statistics,
    timeline,
    key_log_evidence: evidence,
  };
}

function defaultBugSummary(packages: string[], window: TimeWindow): string {
  const pkgs = packages.length > 0 ? packages.join(' / ') : '未指定';
  return `用户未填写问题描述。请基于以下证据分析包名 ${pkgs} 在 ${window.start} ~ ${window.end} 窗口内的异常情况，区分事实与推测，并指出缺失信息。`;
}
