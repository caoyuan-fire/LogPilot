// LogPilot shared types

export interface LogEvent {
  line_no: number;
  timestamp: string;
  pid: string;
  tid: string;
  level: string;
  tag: string;
  message: string;
}

export interface UnparsedLine {
  line_no: number;
  raw: string;
}

export interface ParseResult {
  events: LogEvent[];
  unparsed: UnparsedLine[];
  total_lines: number;
}

export interface TimeWindow {
  start: string;
  end: string;
}

export interface PidSegment {
  pid: string;
  start_time: string;
  end_time: string;
}

export interface PidLifecycle {
  package_name: string;
  segments: PidSegment[];
}

export interface TagStatistic {
  package_name: string;
  pid: string;
  tag: string;
  count: number;
  levels: Record<string, number>;
  first_seen: string;
  last_seen: string;
}

export interface TimelineEvent {
  timestamp: string;
  source: string;
  pid?: string;
  level: string;
  tag: string;
  message: string;
  line_no: number;
  is_system_event: boolean;
}

export interface TriageReportInput {
  bug_summary: string;
  packages: string[];
  time_window: string;
  pid_lifecycles: PidLifecycle[];
  tag_statistics: TagStatistic[];
  timeline: TimelineEvent[];
  key_log_evidence: LogEvent[];
}

export interface TriageReportResult {
  provider: string;
  model: string;
  report_markdown: string;
  facts: string[];
  hypotheses: string[];
  missing_information: string[];
  jira_comment_markdown: string;
}

export interface AiProvider {
  name: string;
  model: string;
  generateTriageReport(input: TriageReportInput): Promise<TriageReportResult>;
}

export interface HealthCheckResponse {
  status: string;
  ai_provider: string;
  timestamp: string;
}
