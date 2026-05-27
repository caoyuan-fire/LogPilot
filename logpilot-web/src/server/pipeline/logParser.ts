import type { LogEvent, ParseResult, UnparsedLine } from '../../shared/types.js';

/**
 * Regex for parsing logcat lines. The leading hex prefix is OPTIONAL so the
 * parser handles both car-maker dump format and standard
 * `adb logcat -v threadtime` output.
 *
 * Layout:
 *   [<hex_prefix>  ]<MM-DD> <HH:MM:SS.mmm>  <pid>  <tid> <level> <tag>: <message>
 *
 * Examples that match:
 *   M081600  05-20 18:44:46.791  1048  1328 E GnssCallbckJni: gnssNmeaCb: NMEA:$GPGSV
 *   S081608  05-20 18:44:47.028   594 24488 E TboxTest: handleSomeipCallback
 *   05-20 18:44:46.791  1048  1328 E GnssCallbckJni: gnssNmeaCb: NMEA:$GPGSV
 *   01-01 00:00:05.801   321   321 I lowmemorykiller: unisoc update props done
 *
 * The prefix character class excludes digits to avoid ambiguity with the
 * "MM-DD" start of an un-prefixed line.
 */
const LOG_LINE_REGEX = /^(?:[A-Za-z][A-Za-z0-9]*\s+)?(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEF])\s+(.+?):\s*(.*)/;

export function parseLogLine(line: string, lineNo: number): LogEvent | null {
  if (!line || line.trim().length === 0) {
    return null;
  }

  const match = line.match(LOG_LINE_REGEX);
  if (!match) {
    return null;
  }

  const [, timestamp, pid, tid, level, rawTag, message] = match;
  const tag = rawTag.trim();

  return {
    line_no: lineNo,
    timestamp,
    pid,
    tid,
    level,
    tag,
    message: message ?? '',
  };
}

export function parseLogFile(content: string): ParseResult {
  const lines = content.split('\n');
  const events: LogEvent[] = [];
  const unparsed: UnparsedLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip empty trailing line from split
    if (i === lines.length - 1 && line === '') {
      continue;
    }

    const lineNo = i + 1;
    const event = parseLogLine(line, lineNo);

    if (event) {
      events.push(event);
    } else {
      unparsed.push({ line_no: lineNo, raw: line });
    }
  }

  return {
    events,
    unparsed,
    total_lines: events.length + unparsed.length,
  };
}
