import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createAiProvider } from './ai/aiProvider.js';
import { parseLogFile } from './pipeline/logParser.js';
import { filterByTimeWindow, parseTimeInput } from './pipeline/timeWindow.js';
import { trackPidLifecycles } from './pipeline/pidTracker.js';
import { analyzeTags } from './pipeline/tagAnalyzer.js';
import { extractSystemEvents } from './pipeline/systemEventExtractor.js';
import { buildTimeline } from './pipeline/timelineBuilder.js';
import { buildTriageReportInput } from './ai/reportInputBuilder.js';
import {
  listHmEvents,
  loadHmEvent,
  HmEventNotFoundError,
  HmEventPathError,
} from './demoWorkflow.js';
import type { HealthCheckResponse } from '../shared/types.js';

// Load .env.local first, then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const app = express();
const PORT = Number(process.env.SERVER_PORT) || 5174;

app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (_req, res) => {
  const providerName = process.env.AI_PROVIDER || 'mock';
  const response: HealthCheckResponse = {
    status: 'ok',
    ai_provider: providerName,
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

// PID lifecycle tracking endpoint
//
// POST /api/pid-lifecycles
// Body: { log_content: string, packages: string[], time_window?: string }
// Returns: { lifecycles, not_found, parse_summary }
app.post('/api/pid-lifecycles', (req, res) => {
  try {
    const { log_content, packages, time_window } = req.body as {
      log_content: string;
      packages: string[];
      time_window?: string;
    };

    if (typeof log_content !== 'string' || log_content.length === 0) {
      res.status(400).json({ error: 'log_content is required' });
      return;
    }
    if (!Array.isArray(packages) || packages.length === 0) {
      res.status(400).json({ error: 'packages must be a non-empty array' });
      return;
    }

    const parsed = parseLogFile(log_content);

    // Infer date prefix from first parseable event
    const datePrefix = parsed.events.length > 0
      ? parsed.events[0].timestamp.slice(0, 6)   // "MM-DD "
      : '05-20 ';

    const window = time_window
      ? parseTimeInput(time_window, datePrefix)
      : { start: datePrefix + '00:00:00.000', end: datePrefix + '23:59:59.999' };

    const windowed = filterByTimeWindow(parsed.events, window);
    const result = trackPidLifecycles(windowed, packages, window);

    res.json({
      lifecycles: result.lifecycles,
      not_found: result.not_found,
      parse_summary: {
        total_lines: parsed.total_lines,
        parsed_events: parsed.events.length,
        windowed_events: windowed.length,
        unparsed_lines: parsed.unparsed.length,
        window,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Combined analyze endpoint
//
// POST /api/analyze
// Body: { log_content: string, packages: string[], time_window?: string }
// Returns: { lifecycles, not_found, tag_analysis, timeline, parse_summary }
app.post('/api/analyze', (req, res) => {
  try {
    const { log_content, packages, time_window } = req.body as {
      log_content: string;
      packages: string[];
      time_window?: string;
    };

    if (typeof log_content !== 'string' || log_content.length === 0) {
      res.status(400).json({ error: 'log_content is required' });
      return;
    }
    if (!Array.isArray(packages) || packages.length === 0) {
      res.status(400).json({ error: 'packages must be a non-empty array' });
      return;
    }

    const parsed = parseLogFile(log_content);
    const datePrefix = parsed.events.length > 0
      ? parsed.events[0].timestamp.slice(0, 6)
      : '05-20 ';
    const window = time_window
      ? parseTimeInput(time_window, datePrefix)
      : { start: datePrefix + '00:00:00.000', end: datePrefix + '23:59:59.999' };
    const windowed = filterByTimeWindow(parsed.events, window);

    const pidResult = trackPidLifecycles(windowed, packages, window);
    const tagAnalysis = analyzeTags(windowed, pidResult.lifecycles);
    const systemEvents = extractSystemEvents(windowed, { lifecycles: pidResult.lifecycles });
    const timeline = buildTimeline(windowed, pidResult.lifecycles, systemEvents);

    res.json({
      lifecycles: pidResult.lifecycles,
      not_found: pidResult.not_found,
      tag_analysis: tagAnalysis,
      timeline,
      parse_summary: {
        total_lines: parsed.total_lines,
        parsed_events: parsed.events.length,
        windowed_events: windowed.length,
        unparsed_lines: parsed.unparsed.length,
        window,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// AI triage report endpoint
//
// POST /api/triage-report
// Body: { log_content, packages, time_window?, bug_summary? }
// 服务端复跑流水线 → buildTriageReportInput → AiProvider.generateTriageReport
// 这样前端不必把 MB 级的结构化数据回传，只需要传一次原始日志。
app.post('/api/triage-report', async (req, res) => {
  try {
    const { log_content, packages, time_window, bug_summary } = req.body as {
      log_content: string;
      packages: string[];
      time_window?: string;
      bug_summary?: string;
    };

    if (typeof log_content !== 'string' || log_content.length === 0) {
      res.status(400).json({ error: 'log_content is required' });
      return;
    }
    if (!Array.isArray(packages) || packages.length === 0) {
      res.status(400).json({ error: 'packages must be a non-empty array' });
      return;
    }

    const parsed = parseLogFile(log_content);
    const datePrefix = parsed.events.length > 0
      ? parsed.events[0].timestamp.slice(0, 6)
      : '05-20 ';
    const window = time_window
      ? parseTimeInput(time_window, datePrefix)
      : { start: datePrefix + '00:00:00.000', end: datePrefix + '23:59:59.999' };
    const windowed = filterByTimeWindow(parsed.events, window);

    const pidResult = trackPidLifecycles(windowed, packages, window);
    const tagAnalysis = analyzeTags(windowed, pidResult.lifecycles);
    const systemEvents = extractSystemEvents(windowed, { lifecycles: pidResult.lifecycles });
    const timeline = buildTimeline(windowed, pidResult.lifecycles, systemEvents);

    const triageInput = buildTriageReportInput({
      bugSummary: bug_summary ?? '',
      packages,
      timeWindow: window,
      lifecycles: pidResult.lifecycles,
      tagAnalysis,
      timeline,
      windowedEvents: windowed,
    });

    const provider = createAiProvider();
    const report = await provider.generateTriageReport(triageInput);

    res.json({
      report,
      // 把构造给模型的 input 也回带 — 前端可显示 "evidence 数量 / 实际送给模型的字段" 供答辩
      triage_input_summary: {
        bug_summary: triageInput.bug_summary,
        packages: triageInput.packages,
        time_window: triageInput.time_window,
        pid_lifecycles_count: triageInput.pid_lifecycles.length,
        tag_statistics_count: triageInput.tag_statistics.length,
        timeline_count: triageInput.timeline.length,
        key_log_evidence_count: triageInput.key_log_evidence.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ── HM / Jira 闭环 Demo 接口 ─────────────────────────────────────────────
// 注：这是模拟闭环，不与任何真实 HealthMonitor / Jira 通信

// GET /api/demo/hm-events — 列出所有合成 HM 样例（用于前端下拉）
app.get('/api/demo/hm-events', (_req, res) => {
  try {
    res.json({
      _disclaimer: '模拟 HM/Jira 闭环 — 未接入生产系统',
      events: listHmEvents(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/demo/load-hm-event — 按 id 载入完整事件 + 嵌入日志内容
app.post('/api/demo/load-hm-event', (req, res) => {
  try {
    const { id } = req.body as { id: string };
    if (typeof id !== 'string' || id.length === 0) {
      res.status(400).json({ error: 'id is required' });
      return;
    }
    const loaded = loadHmEvent(id);
    res.json({
      _disclaimer: '模拟 HM/Jira 闭环 — 未接入生产系统',
      ...loaded,
    });
  } catch (error) {
    if (error instanceof HmEventNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof HmEventPathError) {
      res.status(400).json({ error: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  const providerName = process.env.AI_PROVIDER || 'mock';
  console.log(`LogPilot server listening on http://localhost:${PORT}`);
  console.log(`AI provider: ${providerName}`);
});

export default app;
