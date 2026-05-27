import type { AiProvider, TriageReportInput, TriageReportResult } from '../../shared/types.js';

export class MockAiProvider implements AiProvider {
  name = 'mock';
  model = 'mock-logpilot-triage';

  async generateTriageReport(input: TriageReportInput): Promise<TriageReportResult> {
    const packages = input.packages.join(', ');
    const pidCount = input.pid_lifecycles.length;
    const tagCount = input.tag_statistics.length;
    const timelineCount = input.timeline.length;

    return {
      provider: this.name,
      model: this.model,
      report_markdown: [
        '## 问题摘要',
        '',
        `**Bug 描述**: ${input.bug_summary}`,
        `**相关包名**: ${packages}`,
        `**时间窗口**: ${input.time_window}`,
        '',
        '## 事实（Facts）',
        '',
        `- 追踪到 ${pidCount} 个包名的 PID 生命周期`,
        `- 发现 ${tagCount} 个动态 Tag`,
        `- 时间线包含 ${timelineCount} 个事件`,
        '',
        '## 推测（Hypotheses）',
        '',
        '- [MOCK] 基于时间线密集异常事件，可能存在资源竞争问题',
        '- [MOCK] 多个进程在同一时间段出现异常，建议检查跨进程通信链路',
        '',
        '## 待补充信息',
        '',
        '- 需要确认是否有用户操作日志',
        '- 建议扩大时间窗口查看异常前的系统状态',
        '',
        '## 排查建议',
        '',
        '1. 检查异常密集 Tag 对应的代码路径',
        '2. 确认进程重启原因',
        '3. 检查系统关键事件与应用异常的时间关联',
        '',
        '*注意：本报告由 mock provider 生成，仅用于流程验证。*',
      ].join('\n'),
      facts: [
        `追踪到 ${pidCount} 个包名的 PID 生命周期`,
        `发现 ${tagCount} 个动态 Tag`,
        `时间线包含 ${timelineCount} 个事件`,
      ],
      hypotheses: [
        '[MOCK] 可能存在资源竞争问题',
        '[MOCK] 建议检查跨进程通信链路',
      ],
      missing_information: [
        '需要确认是否有用户操作日志',
        '建议扩大时间窗口查看异常前的系统状态',
      ],
      jira_comment_markdown: [
        `**AI 分诊摘要 (mock)**`,
        '',
        `包名: ${packages}`,
        `时间窗口: ${input.time_window}`,
        `PID 生命周期: ${pidCount} 个`,
        `动态 Tag: ${tagCount} 个`,
        `时间线事件: ${timelineCount} 个`,
        '',
        '> 本报告由 LogPilot mock provider 生成，仅用于流程验证。',
      ].join('\n'),
    };
  }
}
