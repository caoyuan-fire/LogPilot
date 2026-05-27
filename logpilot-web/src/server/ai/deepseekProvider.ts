import type { AiProvider, TriageReportInput, TriageReportResult } from '../../shared/types.js';

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export class DeepSeekProvider implements AiProvider {
  name = 'deepseek';
  model: string;
  private config: DeepSeekConfig;

  constructor(config: DeepSeekConfig) {
    this.config = config;
    this.model = config.model;
  }

  async generateTriageReport(input: TriageReportInput): Promise<TriageReportResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: this.buildSystemPrompt() },
            { role: 'user', content: JSON.stringify(input, null, 2) },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `DeepSeek API 错误 (${response.status}): ${errorText}`
        );
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('DeepSeek 返回空内容');
      }

      try {
        const parsed = JSON.parse(content) as TriageReportResult;
        return {
          provider: this.name,
          model: this.model,
          report_markdown: parsed.report_markdown || content,
          facts: parsed.facts || [],
          hypotheses: parsed.hypotheses || [],
          missing_information: parsed.missing_information || [],
          jira_comment_markdown: parsed.jira_comment_markdown || '',
        };
      } catch {
        return {
          provider: this.name,
          model: this.model,
          report_markdown: content,
          facts: [],
          hypotheses: [],
          missing_information: [],
          jira_comment_markdown: '',
        };
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildSystemPrompt(): string {
    return `你是 LogPilot 缺陷分诊助手。你将收到一份结构化的日志分析证据摘要，包含 PID 生命周期、动态 Tag 统计、关键事件时间线和关键日志证据。

请基于这些证据生成分诊报告，严格遵守以下规则：

1. 只根据输入证据分析，不编造信息。
2. 明确区分"事实（facts）"、"推测（hypotheses）"和"待补充信息（missing_information）"。
3. 每个推测必须引用具体的 evidence（通过 line_no 或时间戳）。
4. 信息不足时输出缺口清单，不生成强结论。
5. 输出一份可直接复制到 Jira 评论的摘要版。

请以 JSON 格式输出，包含以下字段：
- report_markdown: 完整的 Markdown 分诊报告
- facts: 事实数组
- hypotheses: 推测数组（每条必须引用证据）
- missing_information: 待补充信息数组
- jira_comment_markdown: Jira 评论版 Markdown 摘要`;
  }
}
