# LogPilot Design Spec

日期：2026-05-22  
状态：draft  
来源：planned-superpowers-workflow

## Problem

Android/座舱缺陷排查时，日志量大、噪声多、跨进程信息分散。测试提交缺陷时常只能上传全量日志，研发需要人工定位时间、包名、PID、Tag 和系统事件。该过程慢、依赖经验、成本高。

## Design Recommendation

推荐方案：多包名 PID 追踪 + 动态 Tag 发现 + 系统关键事件补充 + AI 分诊报告。

不推荐方案：

- 直接让 AI 读取全量日志，成本高且不稳定。
- 维护静态 Tag 白名单，维护成本高且项目迁移性差。
- 把模块归属交给 AI 猜测，容易产生不可信结论。

## User Flow

1. 用户输入 Bug 描述、时间窗口和多个包名。
2. 用户上传日志，或由 HM 事件提供日志链接。
3. 系统解析日志并追踪 PID。
4. 系统动态统计目标 PID 内出现的 Tag。
5. 系统补充系统关键事件。
6. 系统生成事件时间线。
7. AI 生成分诊报告。
8. 报告可复制或回填到 Jira。

## Components

- LogParser：解析日志。
- TimeWindowFilter：限定复现周期。
- PidTracker：建立包名到 PID 生命周期。
- TargetLogExtractor：裁剪目标 PID 日志。
- DynamicTagAnalyzer：动态发现并统计 Tag。
- SystemEventExtractor：补充系统事件。
- TimelineBuilder：生成跨进程事件线。
- AiTriageReporter：生成报告。
- DemoWorkflow：模拟 HM/Jira 闭环。
- AiProvider：封装 mock 和 DeepSeek API，真实 key 仅在后端 `.env.local`。
- WebDemo：Vite + React + TypeScript 前端，本地 Node 后端代理 AI 调用。

## Error Handling

- 缺少包名：停止并要求补充。
- 时间非法：提示格式和示例。
- 找不到 PID：建议补充进程名、扩大窗口、检查日志是否完整。
- AI 报告证据不足：输出待补充信息，不生成强结论。

## Testing

核心模块使用 TDD。测试先覆盖单 PID、多 PID、多包名、系统事件和异常输入。

## Approval Gate

本设计是 draft。实施前用户需确认 Demo 技术栈、数据来源、模型来源和是否接入 HM/Jira。
