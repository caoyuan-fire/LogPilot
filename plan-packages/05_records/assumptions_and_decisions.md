# Assumptions and Decisions

版本：v0.4  
日期：2026-05-22  
状态：draft

## 已确认决策

- 项目名使用 LogPilot。
- 方向为 AI 日志裁剪与缺陷分诊助手。
- 最低输入为日志文件、时间窗口、一个或多个包名。
- 包名由人工提供，系统不自动猜测模块归属。
- 支持多个包名。
- 通过 PID 生命周期追踪裁剪目标日志。
- 动态发现 Tag，不维护静态业务 Tag 名单。
- 系统关键事件作为补充证据。
- HealthMonitor/Jira 闭环是核心加分点。
- AI 只分析结构化摘要。

## 当前假设

- MVP 日志格式优先支持 Android logcat。
- Demo 可使用构造或脱敏日志。
- HM/Jira 可先模拟，不强制真实接入。
- 模型调用可 mock 或使用内部 API。
- 默认采用 Qoder 可执行、人工可验证的 Job 分解。
- 本任务包定稿后交给 Qoder 实际编码实现。
- 项目目标是比赛评审中的视觉效果和实际运行效果优先。
- 代码在高压场景下的表现、Bug 存量、完整工程质量不是本阶段首要目标。
- 每个 Job 必须包含人工验证条目，Qoder 实现后由人工实机运行验证。
- Web Demo 默认采用 Vite + React + TypeScript + Node.js 本地后端。
- AI 接入默认采用 Provider 抽象，`AI_PROVIDER=mock` 为本地开发默认模式，比赛真实 AI 默认 `AI_PROVIDER=deepseek`。
- 真实模型调用只允许从后端发起，API key/token 放在 `.env.local`，不得进入浏览器或仓库。
- 模型预定义为 DeepSeek，默认模型 `deepseek-chat`，原因是便宜、国内网络可用、适合日志定性与分诊。

## 待确认问题

- Demo 技术栈：CLI、Web、飞书机器人，或混合。
- 样例日志来源：真实脱敏日志还是构造日志。
- 是否需要真实接入 HM/Jira。
- 使用内部模型还是外部模型。
- DeepSeek API key/token 由谁提供，是否使用官方 base URL 或公司代理 base URL。
- 是否需要生成参赛 PPT/报名表最终版。

## Superpowers 纪律记录

- 实现前必须先写测试或最小验证样例。
- 遇到解析失败先做系统化调试，定位日志格式、时间窗口、PID 关系或规则问题。
- 每个 Job 完成后必须提供人工验证条目。
- 完成声明以人工实机验证结果为准。
- 不要求 Qoder 实现结果返回本会话做代码审查。
