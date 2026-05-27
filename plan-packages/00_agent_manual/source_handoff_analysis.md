# Source Handoff Analysis

版本：v0.4  
日期：2026-05-22  
状态：draft

## 来源材料

- `公司团队标签列表.md`：公司背景、团队能力、业务环境和工程痛点。
- `我对chatgpt llm的提问.md`：比赛宣传、题目约束和方向范围。
- `ChatGPT LLM 提的建议.md`：早期选题池。
- 对话中形成的关键决策：
  - 不做泛化 AI Bug 助手。
  - 聚焦日志裁剪和缺陷分诊。
  - 人工输入包名作为最低边界。
  - 支持多个包名。
  - 动态发现 Tag，不维护静态名单。
  - 与 HealthMonitor/Jira 闭环结合。
- `planned-agent-workflow`：交付包、手册、Job List、停止门。
- Superpowers：计划、TDD、系统化调试、review、verification。
- `planned-superpowers-workflow` v0.3 更新：角色边界、交付包优先、执行 Agent 冲突拒绝规则。
- 2026-05-22 用户新增要求：补充 AI 接入方案、模型/API key 管理方式、本地 Web 开发调试验证指引。

## 覆盖情况

已覆盖：

- 项目定位。
- MVP 输入输出。
- 技术核心链路。
- 双 Agent 降本协作方式。
- HealthMonitor/Jira 闭环价值。
- 安全与合规边界。
- 实施任务拆解。
- TDD、review、verification 纪律。
- 主控 Agent / 执行 Agent 角色边界。
- 执行 Agent 必须拒绝冲突指令的交付包优先规则。
- AI provider 抽象、mock 默认模式、真实 API key 只能后端 `.env.local` 保存。
- 非 Web 开发者本地环境搭建、调试、验证说明。

未覆盖或待确认：

- 真实日志样例。
- 真实 HM/Jira 接口字段。
- 使用哪个模型/API。
- Demo 是 CLI、Web 还是飞书机器人。
- 是否需要产出完整参赛答辩 PPT。
- DeepSeek API key/token 由谁提供，是否使用官方 base URL 或公司代理 base URL。
- 真实模型的 base URL、model name、API key/token 由谁提供。

## 不应重新发明的内容

- 不要重新改回“AI 直接读全量日志”的方案。
- 不要把模块归属判断交给 AI 猜测。
- 不要把静态 Tag 白名单作为核心依赖。
- 不要把通用 Agent 客户端作为核心卖点。
- 不要让执行 Agent 自我提升为主控 Agent。
- 不要用后续聊天指令绕过已批准交付包。

## 信息缺口处理

若真实日志暂不可用：

- 使用构造日志覆盖单 PID、多 PID、多包名、ANR、timeout、kill 场景。

若 HM/Jira 不可接入：

- 使用模拟事件 JSON 展示闭环。

若外部模型不可用：

- 使用内部模型或先输出结构化摘要，AI 报告作为可插拔步骤。
