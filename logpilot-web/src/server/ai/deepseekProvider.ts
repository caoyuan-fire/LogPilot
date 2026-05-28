import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AiProvider, TriageReportInput, TriageReportResult } from '../../shared/types.js';

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// prompts/ 与 src/server/ai/ 平级（项目根 → prompts）
const PROMPT_PATH = path.resolve(__dirname, '../../../prompts/triage_report_prompt.md');

let cachedSystemPrompt: string | null = null;
function loadSystemPrompt(): string {
  if (cachedSystemPrompt !== null) return cachedSystemPrompt;
  try {
    cachedSystemPrompt = readFileSync(PROMPT_PATH, 'utf-8');
  } catch {
    // Defensive fallback：找不到 prompt 文件时，给个最小版本，保证不崩
    cachedSystemPrompt =
      '你是 LogPilot 缺陷分诊助手。基于输入的结构化证据生成 JSON 报告。' +
      '每条推测必须引用 line_no；证据不足时把内容降级到 missing_information。' +
      '输出字段：report_markdown / facts / hypotheses / missing_information / jira_comment_markdown。';
  }
  return cachedSystemPrompt;
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
    return loadSystemPrompt();
  }
}
