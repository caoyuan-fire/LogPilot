import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAiProvider } from '../src/server/ai/aiProvider.js';
import { MockAiProvider } from '../src/server/ai/mockProvider.js';
import type { TriageReportInput } from '../src/shared/types.js';

describe('createAiProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('defaults to mock when AI_PROVIDER is not set', () => {
    delete process.env.AI_PROVIDER;
    const provider = createAiProvider();
    expect(provider.name).toBe('mock');
  });

  it('returns mock provider when AI_PROVIDER=mock', () => {
    process.env.AI_PROVIDER = 'mock';
    const provider = createAiProvider();
    expect(provider.name).toBe('mock');
    expect(provider.model).toBe('mock-logpilot-triage');
  });

  it('throws when AI_PROVIDER=deepseek but AI_API_KEY is missing', () => {
    process.env.AI_PROVIDER = 'deepseek';
    delete process.env.AI_API_KEY;
    expect(() => createAiProvider()).toThrow('AI_API_KEY');
  });

  it('returns deepseek provider when AI_PROVIDER=deepseek with key', () => {
    process.env.AI_PROVIDER = 'deepseek';
    process.env.AI_API_KEY = 'test-key';
    const provider = createAiProvider();
    expect(provider.name).toBe('deepseek');
  });

  it('falls back to mock for unknown provider type', () => {
    process.env.AI_PROVIDER = 'unknown-xyz';
    const provider = createAiProvider();
    expect(provider.name).toBe('mock');
  });
});

describe('MockAiProvider', () => {
  it('generates a deterministic report without API key', async () => {
    const provider = new MockAiProvider();
    const input: TriageReportInput = {
      bug_summary: '点击导出按钮后页面卡死',
      packages: ['com.demo.export', 'com.demo.file'],
      time_window: '14:27:00-14:37:00',
      pid_lifecycles: [],
      tag_statistics: [],
      timeline: [],
      key_log_evidence: [],
    };

    const result = await provider.generateTriageReport(input);

    expect(result.provider).toBe('mock');
    expect(result.model).toBe('mock-logpilot-triage');
    expect(result.report_markdown).toContain('问题摘要');
    expect(result.report_markdown).toContain('com.demo.export');
    expect(result.facts).toBeInstanceOf(Array);
    expect(result.hypotheses).toBeInstanceOf(Array);
    expect(result.missing_information).toBeInstanceOf(Array);
    expect(result.jira_comment_markdown).toContain('mock');
  });

  // R3 红线 —— 证据不足时不下推测，全部降级到 missing_information
  it('refuses to emit hypotheses when evidence is severely insufficient', async () => {
    const provider = new MockAiProvider();
    const input: TriageReportInput = {
      bug_summary: '',
      packages: ['com.demo.app'],
      time_window: '14:27:00 ~ 14:37:00',
      pid_lifecycles: [],     // 无 PID 段
      tag_statistics: [],
      timeline: [],            // 无时间线
      key_log_evidence: [],    // 无证据
    };

    const result = await provider.generateTriageReport(input);

    expect(result.hypotheses).toEqual([]);
    expect(result.missing_information.length).toBeGreaterThanOrEqual(3);
    expect(result.report_markdown).toMatch(/证据不足|信息不足/);
    // 不能出现"根因 / root cause"等强结论
    expect(result.report_markdown).not.toMatch(/根因|root cause/i);
    expect(result.jira_comment_markdown).not.toMatch(/根因|root cause/i);
  });

  // 证据充足时才允许出推测，且每条推测必须带 evidence 引用
  it('emits hypotheses with evidence references when input is rich', async () => {
    const provider = new MockAiProvider();
    const input: TriageReportInput = {
      bug_summary: 'x',
      packages: ['com.demo.app'],
      time_window: '14:27:00 ~ 14:37:00',
      pid_lifecycles: [
        {
          package_name: 'com.demo.app',
          segments: [
            { pid: '2100', start_time: '14:27:00.000', end_time: '14:32:00.000' },
            { pid: '2200', start_time: '14:32:05.000', end_time: '14:37:00.000' },
          ],
        },
      ],
      tag_statistics: [
        {
          package_name: 'com.demo.app',
          pid: '2100',
          tag: 'AppCore',
          count: 8,
          levels: { E: 5, W: 3 },
          first_seen: '14:28:00.000',
          last_seen: '14:31:00.000',
        },
      ],
      timeline: [
        {
          timestamp: '14:30:00.000',
          source: 'system:Watchdog',
          pid: '500',
          level: 'E',
          tag: 'Watchdog',
          message: 'stuck for 2000ms',
          line_no: 4242,
          is_system_event: true,
        },
      ],
      key_log_evidence: [
        {
          line_no: 4242,
          timestamp: '14:30:00.000',
          pid: '500', tid: '500', level: 'E',
          tag: 'Watchdog', message: 'stuck for 2000ms',
        },
      ],
    };

    const result = await provider.generateTriageReport(input);

    expect(result.hypotheses.length).toBeGreaterThan(0);
    // 每条推测必须能在文本中找到 line_no 或时间戳引用
    for (const h of result.hypotheses) {
      const hasEvidence = /line_no=|at \d|evidence|tag_statistics|pid_lifecycles/i.test(h);
      expect(hasEvidence).toBe(true);
    }
    // 系统事件不能被强行归因到目标包名
    expect(result.report_markdown).not.toMatch(/根因|root cause/i);
  });
});
