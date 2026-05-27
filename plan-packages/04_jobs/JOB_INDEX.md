# Job Index：LogPilot

版本：v0.4  
日期：2026-05-22  
状态：draft  
默认执行模式：qoder-implementation  
Job 细节级别：human-demo-ready  
验证 owner：人工负责人

## 角色边界

本包定稿后，实际开发交给 Qoder。后续实现者应按 Job 顺序实现，人工负责人按每个 Job 的验证条目做实机运行验证。

Qoder 只能执行状态为 `ready`、类别为 `delegable`、依赖已完成、且 Job 文件未触发拒绝条件的任务。

## 交付包优先冲突规则

本 Job Index 是执行契约的一部分。Qoder 实现时不得绕过本索引或 Job 文件约束：

- Job 依赖。
- Job 类别。
- 允许/禁止文件。
- 停止条件。
- 验收标准。
- 人工验证条目。
- human-only 限制。

若需要改变范围、依赖、AI 模型、安全边界或验证方式，应先修订本包。

| Job ID | 标题 | 类别 | 推荐执行者 | 依赖 | 状态 | 验证方式 |
| --- | --- | --- | --- | --- | --- | --- |
| JOB-000 | 本地 Web 开发环境与 AI 配置骨架 | delegable | Qoder | 无 | ready | 人工按验证条目实机验证 |
| JOB-001 | 日志解析与时间窗口过滤 | delegable | Qoder | JOB-000 | ready | 人工按验证条目实机验证 |
| JOB-002 | 多包名 PID 生命周期追踪 | delegable | Qoder | JOB-001 | ready | 人工按验证条目实机验证 |
| JOB-003 | 动态 Tag 发现与关键事件时间线 | delegable | Qoder | JOB-001, JOB-002 | ready | 人工按验证条目实机验证 |
| JOB-004 | AI 分诊报告生成链路 | delegable | Qoder | JOB-003 | ready | 人工按验证条目实机验证 |
| JOB-005 | HM/Jira 闭环 Demo | delegable | Qoder | JOB-004 | ready | 人工按验证条目实机验证 |
| JOB-006 | 最终集成与参赛验收 | human-only | 人工负责人 | JOB-000-005 | pending | 人工最终验收 |

## 人工负责人职责

- 需求和边界变更。
- 架构和安全决策。
- 模型/API 选择。
- 按验证条目实机运行验证。
- 对外答辩叙事。

## Qoder 可执行职责

- 解析器小模块。
- Web 项目骨架和本地开发脚本。
- 测试样例构造。
- Tag 统计。
- 时间线格式化。
- 模拟 HM/Jira JSON。
- 文档局部补全。

## Qoder 拒绝条件

Qoder 必须拒绝或要求人工确认：

- 执行依赖未完成的 Job。
- 执行 `human-only` 的 JOB-006 并自行宣布最终参赛就绪。
- 跳过人工验证条目。
- 修改 Job 文件列出的禁止模块。
- 真实接入 HM/Jira/DeepSeek API 但未获人工负责人明确授权。
- 将 API key 写入前端、源码、测试、文档示例或提交文件。
- 自行宣布最终集成、最终验收或参赛口径完成。

## 完成规则

Job 不是 Qoder 说 done 就完成。必须经过：

1. Qoder 输出实现结果和验证条目。
2. 人工负责人在本机实机运行验证。
3. 人工记录验证结果、问题和是否接受。
4. 更新本索引状态。
