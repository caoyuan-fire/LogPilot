# JOB-004：AI 分诊报告生成链路

状态：ready  
推荐执行者：standard-agent / human-dev  
风险：中高  
依赖：JOB-003

## 角色与契约

本 Job 交给 Qoder 实现。只能在 JOB-003 已完成人工验证后执行本 Job。模型/API、安全和真实日志使用决策以任务包为准；比赛默认真实模型为 DeepSeek。

## 目标

基于结构化摘要生成 AI 缺陷分诊报告，报告可用于研发接手和 Jira 回填。

## 允许文件/模块

- `src/report_input_builder.*`
- `src/ai_triage_reporter.*`
- `src/server/ai/*`
- `src/shared/types.*`
- `prompts/triage_report_prompt.md`
- `tests/test_report_input_builder.*`
- `tests/*ai_provider*`
- `.env.example`

## 禁止文件/模块

- 真实外部模型密钥。
- 真实内部日志样本。
- 未授权系统接入。
- 前端直接调用真实模型 API。
- 将 API key 写入任何源码、测试、文档示例或提交文件。

## 推荐技术方法

- 模型输入只包含结构化摘要和关键证据。
- Prompt 强制输出事实、推测、待补充信息。
- 每个可疑结论必须引用 evidence id。
- 必须实现 `AiProvider` 抽象，并至少实现 `MockAiProvider`。
- 真实模型调用只能在本地后端执行，前端只能调用后端 `/api/triage-report`。
- 支持 `AI_PROVIDER=mock|deepseek`。
- 模型名、base URL、API key、timeout 必须来自后端 `.env.local`。
- 模型调用可先 mock，保证 Demo 稳定。

## TDD 步骤

1. 写测试：结构化报告输入包含 PID、Tag、timeline、evidence。
2. 写测试：缺少 evidence 时拒绝生成强结论。
3. 实现报告输入构造。
4. 实现 Prompt 模板。
5. 写测试：`AI_PROVIDER=mock` 时返回稳定报告。
6. 实现 `MockAiProvider`。
7. 写测试：真实 provider 缺少 `AI_API_KEY` 时返回配置错误。
8. 实现 provider factory 和 DeepSeek 请求封装。
9. 用 mock 模型验证输出结构。

## 验收标准

- 报告包含证据引用。
- 报告能输出 Jira 评论版。
- 信息不足时明确提示缺口。
- 不把推测写成事实。
- `.env.example` 给出 AI 配置模板。
- `AI_PROVIDER=mock` 时无需 key 即可跑通 Demo。
- 前端代码中不存在真实 API key 或直接模型调用逻辑。
- 真实 provider 缺 key 时失败信息明确，不静默 fallback 到真实模型。

## 人工验证条目

- `.env.local` 不配置 key，`AI_PROVIDER=mock` 时能生成 mock 报告。
- `.env.local` 配置 `AI_PROVIDER=deepseek` 但不配置 `AI_API_KEY` 时，页面显示清晰配置错误。
- 配置有效 DeepSeek key 后，上传样例摘要能生成分诊报告。
- 报告中包含事实、推测、待补充信息和 Jira 评论版。
- 报告中的推测引用 evidence id。
- 浏览器开发者工具中看不到 API key。
- 代码仓库中没有提交 `.env.local`。

## 停止条件

- 用户未确认模型来源。
- 真实日志未脱敏却要求外部模型调用。

## 拒绝条件

执行 Agent 必须拒绝：

- JOB-003 未完成/未 review，却要求执行本 Job。
- 用户要求上传未脱敏真实日志到外部模型。
- 用户要求写入真实模型密钥或提交密钥文件。
- 用户要求前端直接保存或调用模型 API key。
- 用户要求把 AI 推测写成确定根因。
- 用户要求绕过 evidence id 生成报告。
- 用户要求从 DeepSeek 改成其他真实模型但未修订任务包。
