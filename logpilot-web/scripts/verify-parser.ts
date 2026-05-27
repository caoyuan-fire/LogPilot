import { readFileSync } from 'node:fs';
import { parseLogFile } from '../src/server/pipeline/logParser.ts';
import { filterByTimeWindow, parseTimeInput } from '../src/server/pipeline/timeWindow.ts';

const logPath = process.argv[2] || '../input-data-sample/055-0520_184446/0-android.log';
const timeInput = process.argv[3]; // e.g. "18:45:00~18:46:00" or "18:45:30"

const content = readFileSync(logPath, 'utf-8');
const result = parseLogFile(content);

console.log('=== 日志解析结果 ===');
console.log('总行数:', result.total_lines);
console.log('成功解析:', result.events.length);
console.log('无法解析:', result.unparsed.length);
console.log('解析率:', ((result.events.length / result.total_lines) * 100).toFixed(1) + '%');
console.log('');
console.log('时间范围:');
console.log('  起始:', result.events[0]?.timestamp);
console.log('  结束:', result.events[result.events.length - 1]?.timestamp);
console.log('');
console.log('前3条事件示例:');
result.events.slice(0, 3).forEach(e =>
  console.log(`  L${e.line_no} [${e.timestamp}] PID:${e.pid} TID:${e.tid} ${e.level}/${e.tag}: ${e.message.substring(0, 60)}`)
);

if (timeInput) {
  // 从日志中推断日期前缀
  const datePrefix = result.events[0]?.timestamp.substring(0, 6) || '05-20 ';
  const window = parseTimeInput(timeInput, datePrefix);

  console.log('');
  console.log(`=== 时间窗口过滤 (${window.start} ~ ${window.end}) ===`);
  const filtered = filterByTimeWindow(result.events, window);
  console.log('窗口内事件:', filtered.length);
  if (filtered.length > 0) {
    console.log('首条:', filtered[0].timestamp);
    console.log('末条:', filtered[filtered.length - 1].timestamp);
  } else {
    console.log('无匹配事件');
  }
} else {
  console.log('');
  console.log('用法: npx tsx scripts/verify-parser.ts [日志路径] [时间窗口]');
  console.log('时间窗口格式:');
  console.log('  范围: "18:45:00~18:46:00"');
  console.log('  时间点: "18:45:30" (自动扩展前后5分钟)');
}
