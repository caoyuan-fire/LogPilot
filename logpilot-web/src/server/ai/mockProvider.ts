import type { AiProvider, TriageReportInput, TriageReportResult } from '../../shared/types.js';

/**
 * MockAiProvider — 用于无 key 跑通流程 & 跑稳 Demo 的兜底 provider。
 *
 * 重要：mock 也必须遵守 R3（不下根因结论），证据不足时退化到 missing_information。
 * 这样即使比赛 Demo 卡在 mock 上，输出也不会出现"凭空猜测"。
 */
export class MockAiProvider implements AiProvider {
  name = 'mock';
  model = 'mock-logpilot-triage';

  async generateTriageReport(input: TriageReportInput): Promise<TriageReportResult> {
    const packages = input.packages.join(', ');
    const totalPidSegments = input.pid_lifecycles.reduce(
      (n, lc) => n + lc.segments.length,
      0
    );
    const tagCount = input.tag_statistics.length;
    const timelineCount = input.timeline.length;
    const systemEventCount = input.timeline.filter((e) => e.is_system_event).length;
    const evidenceCount = input.key_log_evidence.length;
    const anomalousTagSamples = input.tag_statistics
      .filter((s) => (s.levels.E ?? 0) + (s.levels.F ?? 0) >= 3)
      .map((s) => `${s.tag}@${s.pid} (E:${s.levels.E ?? 0})`)
      .slice(0, 3);

    // ── R3 守门：证据严重不足时绝不下推测 ───────────────────────────────
    const lowEvidence =
      [totalPidSegments === 0, timelineCount === 0, evidenceCount === 0]
        .filter(Boolean).length >= 2;

    const facts: string[] = [
      `相关包名：${packages || '未指定'}`,
      `时间窗口：${input.time_window}`,
      `追踪到 ${totalPidSegments} 个 PID 片段（${input.pid_lifecycles.length} 个包名）`,
      `发现 ${tagCount} 个动态 Tag`,
      `时间线 ${timelineCount} 条，其中系统事件 ${systemEventCount} 条`,
      `key_log_evidence 含 ${evidenceCount} 条原始证据`,
    ];

    let hypotheses: string[] = [];
    let missing_information: string[] = [];

    if (lowEvidence) {
      missing_information = [
        '请确认时间窗口是否覆盖了问题发生时刻；可尝试扩大 ±5 分钟',
        '请确认包名是否准确（进程名 vs 包名），或补充其他疑似相关的进程',
        '日志中可能缺少 ActivityManager / Watchdog 等系统进程的输出，建议导出完整 logcat',
      ];
    } else {
      // 仅在确实有证据时给出"带 evidence 引用"的推测
      const firstSys = input.timeline.find((e) => e.is_system_event);
      if (firstSys) {
        hypotheses.push(
          `系统在 ${firstSys.timestamp} 记录了 ${firstSys.tag} 事件（line_no=${firstSys.line_no}），目标 App 可能在此时间点附近受影响 — 注意此事件来源是 ${firstSys.source}，不直接归因到目标包名`
        );
      }
      if (anomalousTagSamples.length > 0) {
        hypotheses.push(
          `Tag ${anomalousTagSamples.join(' / ')} 出现密集错误，可能是排查切入点（evidence: 见 tag_statistics）`
        );
      }
      if (totalPidSegments > input.pid_lifecycles.length) {
        hypotheses.push(
          '窗口内目标包名出现进程重启迹象，建议核对每个 PID 段内的事件是否独立 (evidence: pid_lifecycles 多段)'
        );
      }
      // 即便走到这里，也仍要列出至少一条缺失信息，提示用户进一步收敛
      missing_information = [
        '需要确认异常前的用户操作（点击、滑动、网络切换等）',
        '若怀疑系统侧问题，建议提供同时段的 dmesg / kernel log',
      ];
    }

    const report_markdown = [
      '## 问题摘要',
      '',
      `**Bug 描述**：${input.bug_summary}`,
      `**相关包名**：${packages}`,
      `**时间窗口**：${input.time_window}`,
      '',
      '## 事实（Facts）',
      '',
      ...facts.map((f) => `- ${f}`),
      '',
      '## 推测（Hypotheses）',
      '',
      ...(hypotheses.length > 0
        ? hypotheses.map((h) => `- ${h}`)
        : ['- _（证据不足，未生成推测）_']),
      '',
      '## 待补充信息',
      '',
      ...missing_information.map((m) => `- ${m}`),
      '',
      '## 排查建议',
      '',
      '1. 优先检查异常密集 Tag 对应的代码路径',
      '2. 核对每段 PID 的生命周期是否符合预期（无意外重启）',
      '3. 检查系统关键事件与应用日志的时间相邻性，但不强行归因',
      '',
      lowEvidence
        ? '**⚠ 当前证据不足以得出推测，请补充上述信息后重试。**'
        : '*提示：本报告由 mock provider 生成，仅用于流程验证；如需真实分析请切换 `AI_PROVIDER=deepseek`。*',
    ].join('\n');

    const jiraLines: string[] = [
      `**LogPilot 分诊摘要 (${this.name})**`,
      '',
      `- 包名：${packages || '未指定'}`,
      `- 时间窗口：${input.time_window}`,
      `- PID 片段：${totalPidSegments}（${input.pid_lifecycles.length} 个包名）`,
      `- 动态 Tag：${tagCount}（异常 ${anomalousTagSamples.length}）`,
      `- 关键事件：${timelineCount}（系统事件 ${systemEventCount}）`,
    ];
    if (hypotheses.length > 0) {
      jiraLines.push('', '**推测**：');
      hypotheses.forEach((h) => jiraLines.push(`- ${h}`));
    }
    if (missing_information.length > 0) {
      jiraLines.push('', '**待补充**：');
      missing_information.forEach((m) => jiraLines.push(`- ${m}`));
    }
    jiraLines.push('', '> 由 LogPilot 自动生成，仅作辅助分诊，请人工核对后再下结论。');

    return {
      provider: this.name,
      model: this.model,
      report_markdown,
      facts,
      hypotheses,
      missing_information,
      jira_comment_markdown: jiraLines.join('\n'),
    };
  }
}
