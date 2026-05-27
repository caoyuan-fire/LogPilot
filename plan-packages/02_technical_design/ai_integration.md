# AI Integration：LogPilot

版本：v0.1  
日期：2026-05-22  
状态：draft

## 1. 目标

明确 LogPilot 如何接入 AI、如何使用 DeepSeek、如何管理 API key/token，以及 Qoder 在实现 AI 分诊任务时必须遵守的边界。

本项目的 AI 接入原则：

- 前端不直接调用模型 API。
- API key/token 不进入浏览器、不提交到代码仓库、不写入任务文档正文。
- 后端通过 Provider 抽象统一接入 mock 和 DeepSeek API。
- 默认本地开发使用 mock provider，保证没有真实 key 也能开发、调试和验证。
- 真实模型调用必须只接收脱敏后的结构化证据摘要，不接收全量原始日志。

## 2. 接入模式

### 2.1 mock 模式，默认开发模式

用途：

- 无 API key 时开发 UI 和流程。
- Demo 稳定演示。
- 自动化测试。

配置：

```dotenv
AI_PROVIDER=mock
```

行为：

- 后端不调用任何外部模型。
- 根据输入摘要返回固定结构的示例分诊报告。
- 可根据 evidence id 生成可预测内容，方便测试。

### 2.2 deepseek，比赛默认真实模型

用途：

- 比赛真实 AI 效果默认采用。
- 成本低，国内网络环境可用性更好。
- 本项目做的是日志定性和分诊建议，不是高强度日志根因分析，DeepSeek 足够胜任。

配置示例：

```dotenv
AI_PROVIDER=deepseek
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat
AI_API_KEY=replace_with_local_deepseek_key
AI_TIMEOUT_MS=60000
```

要求：

- API key 由参赛负责人或公司授权账号提供，只放本地 `.env.local`。
- 不把全量原始日志发给 DeepSeek，只发送脱敏后的结构化证据摘要。
- 若公司提供内部代理形式的 DeepSeek 服务，只调整 `AI_BASE_URL`，不改变前端实现。

说明：

- 默认模型为 `deepseek-chat`，必须可配置，不得硬编码。
- 如果 DeepSeek 不可用，应提示检查网络、key、余额或 base URL，而不是静默 fallback 到其他真实模型。

## 3. 后端 API 设计

前端只调用本地后端：

```http
POST /api/triage-report
Content-Type: application/json
```

请求体：

```json
{
  "bug_summary": "点击导出按钮后页面卡死",
  "packages": ["com.demo.export", "com.demo.file"],
  "time_window": "14:27:00-14:37:00",
  "pid_lifecycles": [],
  "tag_statistics": [],
  "timeline": [],
  "key_log_evidence": []
}
```

响应体：

```json
{
  "provider": "mock",
  "model": "mock-logpilot-triage",
  "report_markdown": "## 问题摘要\n...",
  "facts": [],
  "hypotheses": [],
  "missing_information": [],
  "jira_comment_markdown": "..."
}
```

## 4. Provider 接口

建议定义统一接口：

```ts
export interface AiProvider {
  name: string;
  model: string;
  generateTriageReport(input: TriageReportInput): Promise<TriageReportResult>;
}
```

Provider 实现：

```text
MockAiProvider
DeepSeekProvider
```

Provider 工厂：

```ts
createAiProvider(env): AiProvider
```

## 5. Prompt 约束

模型系统提示必须要求：

- 只根据输入证据分析。
- 区分事实、推测、待补充信息。
- 每个推测必须引用 evidence id。
- 信息不足时输出缺口，不编造根因。
- 输出 Jira 评论版摘要。
- 不输出未脱敏敏感信息。

## 6. 错误处理

| 场景 | 处理 |
| --- | --- |
| 未配置 `AI_PROVIDER` | 默认 `mock` |
| 真实 provider 缺少 `AI_API_KEY` | 返回配置错误，不调用模型 |
| 模型超时 | 返回可读错误，保留结构化摘要 |
| 模型返回非 JSON | 保存原始文本，尝试降级为 Markdown 报告 |
| 输入证据为空 | 拒绝生成强结论 |
| 未脱敏日志进入请求 | 阻断或强提醒，不调用外部模型 |

## 7. 任务约束

执行 Agent 在实现 AI 相关 Job 时必须遵守：

- 不提交 `.env.local`。
- 不把 API key 写进源码、测试、文档示例或截图。
- 不从前端读取或保存 API key。
- 不把全量原始日志发给真实模型。
- 不擅自切换为其他真实模型；比赛默认真实模型是 DeepSeek。
- mock provider 是必须实现项，DeepSeek provider 是比赛真实 AI 效果默认实现项。
