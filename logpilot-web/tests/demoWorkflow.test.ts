import { describe, it, expect } from 'vitest';
import {
  listHmEvents,
  loadHmEvent,
  HmEventNotFoundError,
  HmEventPathError,
} from '../src/server/demoWorkflow.js';

describe('demoWorkflow.listHmEvents', () => {
  it('returns the seeded HM samples with id/title/packages summary', () => {
    const list = listHmEvents();
    expect(list.length).toBeGreaterThan(0);

    // Every entry must have the summary fields the frontend needs to render a picker
    for (const e of list) {
      expect(typeof e.hm_event_id).toBe('string');
      expect(e.hm_event_id.length).toBeGreaterThan(0);
      expect(typeof e.title).toBe('string');
      expect(typeof e.jira_key).toBe('string');
      expect(Array.isArray(e.packages)).toBe(true);
    }

    // The canonical demo event should be present
    expect(list.find((e) => e.hm_event_id === 'HM-20260520-001')).toBeDefined();
  });
});

describe('demoWorkflow.loadHmEvent', () => {
  it('returns the full event detail plus inlined log_content for the canonical sample', () => {
    const result = loadHmEvent('HM-20260520-001');

    expect(result.event.hm_event_id).toBe('HM-20260520-001');
    expect(result.event.jira.key).toBe('COCKPIT-1234');
    expect(result.event.packages).toContain('com.example.app');
    expect(result.event.time_window).toMatch(/\d{2}:\d{2}:\d{2}.*~.*\d{2}:\d{2}:\d{2}/);

    // log_content was inlined from disk
    expect(typeof result.log_content).toBe('string');
    expect(result.log_content.length).toBeGreaterThan(0);
    // tag_timeline.log fixture contains com.example.app
    expect(result.log_content).toContain('com.example.app');
  });

  it('throws HmEventNotFoundError when id is unknown', () => {
    expect(() => loadHmEvent('HM-DOES-NOT-EXIST')).toThrow(HmEventNotFoundError);
  });

  it('rejects samples whose log_path escapes the fixtures sandbox', () => {
    // 路径越界守门 — 即使 demo sample 文件被人改坏指向外部文件，也必须拒绝加载
    expect(() => loadHmEvent('HM-EVIL-PATH-TEST', {
      override_log_path: '../../../etc/passwd',
    })).toThrow(HmEventPathError);

    expect(() => loadHmEvent('HM-EVIL-PATH-TEST', {
      override_log_path: 'C:/Windows/System32/drivers/etc/hosts',
    })).toThrow(HmEventPathError);
  });

  it('throws HmEventPathError when log_path points to a non-existent file', () => {
    expect(() => loadHmEvent('HM-EVIL-PATH-TEST', {
      override_log_path: 'tests/fixtures/this_file_does_not_exist.log',
    })).toThrow(HmEventPathError);
  });
});
