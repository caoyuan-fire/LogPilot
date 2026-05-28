/**
 * HM / Jira 闭环 Demo 工作流
 *
 * 本模块不与任何真实 HealthMonitor / Jira 系统通信。它只做两件事：
 *
 *   1. 从 `demo/hm_event_sample.json` 读出预制的合成 HM 事件清单
 *   2. 按 id 加载完整事件 + 把 `log_path` 指向的 fixture 内联读出来
 *
 * 关键安全约束（即便是 Demo 也要守住）：
 *
 *   - `log_path` 必须解析在 `tests/fixtures/` 目录内，绝不允许 `..` 越界或绝对路径
 *   - 路径不存在时 throw 而不是返回空字符串，避免 silent 失败
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// src/server → 项目根 (logpilot-web)
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const FIXTURE_SANDBOX = path.resolve(PROJECT_ROOT, 'tests/fixtures');
const SAMPLE_PATH = path.resolve(PROJECT_ROOT, 'demo/hm_event_sample.json');

// ─── Schema ───────────────────────────────────────────────────────────────

export interface HmEvent {
  hm_event_id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | string;
  captured_at: string;
  device: {
    model: string;
    android_version: string;
    build: string;
  };
  jira: {
    key: string;
    url: string;
    status: string;
    created_at: string;
  };
  log_path: string;
  time_window: string;
  packages: string[];
  bug_summary: string;
  hm_signals: string[];
}

interface HmSampleFile {
  $schema?: string;
  _note?: string;
  events: HmEvent[];
}

export interface HmEventSummary {
  hm_event_id: string;
  title: string;
  severity: string;
  jira_key: string;
  packages: string[];
}

export interface HmEventLoaded {
  event: HmEvent;
  /** Inlined contents of `event.log_path`, ready to feed the analyze pipeline */
  log_content: string;
}

// ─── Errors ───────────────────────────────────────────────────────────────

export class HmEventNotFoundError extends Error {
  constructor(id: string) {
    super(`HM event 不存在: ${id}`);
    this.name = 'HmEventNotFoundError';
  }
}

export class HmEventPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HmEventPathError';
  }
}

// ─── Sample loader (cached) ───────────────────────────────────────────────

let cached: HmSampleFile | null = null;

function loadSampleFile(): HmSampleFile {
  if (cached !== null) return cached;
  const raw = readFileSync(SAMPLE_PATH, 'utf-8');
  const parsed = JSON.parse(raw) as HmSampleFile;
  if (!parsed || !Array.isArray(parsed.events)) {
    throw new Error('demo/hm_event_sample.json: 缺少 events 数组');
  }
  cached = parsed;
  return parsed;
}

// ─── Public API ───────────────────────────────────────────────────────────

export function listHmEvents(): HmEventSummary[] {
  const file = loadSampleFile();
  return file.events.map((e) => ({
    hm_event_id: e.hm_event_id,
    title: e.title,
    severity: e.severity,
    jira_key: e.jira.key,
    packages: e.packages,
  }));
}

export interface LoadHmEventOpts {
  /** Test hook：override the log_path in the sample so we can exercise the path guard */
  override_log_path?: string;
}

export function loadHmEvent(id: string, opts: LoadHmEventOpts = {}): HmEventLoaded {
  const file = loadSampleFile();
  let event = file.events.find((e) => e.hm_event_id === id);

  // Tests may pass an unknown id together with override_log_path to specifically
  // exercise the path-guard branch. Synthesize a placeholder event in that case.
  if (!event && opts.override_log_path !== undefined) {
    event = {
      hm_event_id: id,
      title: '(test event)',
      severity: 'low',
      captured_at: '',
      device: { model: '', android_version: '', build: '' },
      jira: { key: '', url: '', status: '', created_at: '' },
      log_path: opts.override_log_path,
      time_window: '00:00:00~00:00:01',
      packages: ['x'],
      bug_summary: '',
      hm_signals: [],
    };
  }

  if (!event) throw new HmEventNotFoundError(id);

  const rawLogPath = opts.override_log_path ?? event.log_path;
  const absLogPath = resolveSafeLogPath(rawLogPath);
  if (!existsSync(absLogPath)) {
    throw new HmEventPathError(`log_path 文件不存在: ${rawLogPath}`);
  }

  const log_content = readFileSync(absLogPath, 'utf-8');
  return { event: { ...event, log_path: rawLogPath }, log_content };
}

// ─── Path guard ───────────────────────────────────────────────────────────

function resolveSafeLogPath(rawPath: string): string {
  if (path.isAbsolute(rawPath)) {
    throw new HmEventPathError(
      `log_path 不允许使用绝对路径: ${rawPath}`
    );
  }
  const candidate = path.resolve(PROJECT_ROOT, rawPath);
  const rel = path.relative(FIXTURE_SANDBOX, candidate);
  // path.relative 在 candidate 越界时会返回以 ".." 开头或绝对路径
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new HmEventPathError(
      `log_path 必须位于 tests/fixtures/ 内，禁止越界: ${rawPath}`
    );
  }
  return candidate;
}
