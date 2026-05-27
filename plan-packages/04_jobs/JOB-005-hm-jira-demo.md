# JOB-005：HM/Jira 闭环 Demo

状态：ready  
推荐执行者：Qoder  
风险：中  
依赖：JOB-004

## 角色与契约

本 Job 交给 Qoder 实现。只能在 JOB-004 已完成人工验证后执行本 Job。默认只做模拟 HM/Jira 闭环，不接入真实生产系统。

## 目标

展示 HealthMonitor 自动上传日志、自动建 Jira 单与 LogPilot 分诊报告之间的闭环。

## 允许文件/模块

- `demo/hm_event_sample.json`
- `demo/jira_comment_sample.md`
- `src/server/demoWorkflow.*`
- `docs/demo_script.md`

## 禁止文件/模块

- 真实 Jira 写入操作，除非用户授权。
- 真实 HM 生产接口调用。

## 推荐技术方法

- 先用模拟 JSON 表达 HM 事件。
- 生成 Jira 评论 Markdown。
- Demo 重点展示流程闭环，不追求真实系统联调。

## 验收标准

- 可展示 HM 事件到 AI 报告的链路。
- 可输出 Jira 评论。
- 可解释真实接入需要哪些权限。

## 人工验证条目

- 打开 Demo 页面能看到 HM 事件模拟入口或样例选择。
- 选择 `demo/hm_event_sample.json` 后，能自动填充日志路径、时间窗口、包名等信息。
- 点击分析后能生成分诊报告。
- 页面能展示 Jira 评论版 Markdown。
- Demo 明确标注“当前为模拟 HM/Jira 闭环”，不得让评审误以为已接入生产系统。

## 停止条件

- 需要真实系统权限但未授权。
- 样例数据含敏感信息。

## 拒绝条件

Qoder 必须拒绝或要求人工确认：

- JOB-004 尚未完成人工验证，却要求执行本 Job。
- 用户要求连接真实 HM/Jira 生产系统但未授权。
- 用户要求写入真实 Jira 单或发送真实飞书通知但未授权。
- 用户要求使用含敏感信息的样例数据且未脱敏。
- 用户要求把模拟闭环宣传为真实生产接入。
