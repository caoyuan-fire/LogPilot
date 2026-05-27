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
});
