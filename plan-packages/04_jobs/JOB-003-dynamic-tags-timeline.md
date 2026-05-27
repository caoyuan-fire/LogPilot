# JOB-003：动态 Tag 发现与关键事件时间线

状态：ready  
推荐执行者：Qoder  
风险：中  
依赖：JOB-001, JOB-002

## 角色与契约

本 Job 交给 Qoder 实现。只能在 JOB-001 和 JOB-002 已完成人工验证后执行本 Job。

## 目标

基于目标 PID 日志，动态统计 Tag，并补充系统关键事件，生成跨包名事件时间线。

## 允许文件/模块

- `src/server/pipeline/tagAnalyzer.*`
- `src/server/pipeline/systemEventExtractor.*`
- `src/server/pipeline/timelineBuilder.*`
- `tests/tagAnalyzer.test.*`
- `tests/timelineBuilder.test.*`

## 禁止文件/模块

- 模型调用代码。
- 外部系统接入代码。

## 推荐技术方法

- 不维护静态业务 Tag 白名单。
- 对目标 PID 中出现的全部 Tag 做频次和 level 分布统计。
- 系统关键事件按关键词/模式补充，但必须标明来源不是目标 PID。
- 高频重复日志可压缩，但保留样例行号。

## TDD 步骤

1. 写测试：目标 PID 日志生成 Tag 频次。
2. 写测试：Tag level 分布正确。
3. 写测试：系统 ANR 事件被纳入时间线。
4. 写测试：跨包名事件按时间排序。
5. 实现统计和时间线。

## 验收标准

- 输出动态 Tag 清单。
- 输出异常密集 Tag。
- 输出系统关键事件。
- 输出排序时间线。

## 人工验证条目

- 使用目标 PID 样例，页面展示动态 Tag 清单和频次。
- Tag 统计中能看到 ERROR/WARN/INFO 等 level 分布。
- 使用包含 ANR 或 timeout 的样例，时间线中能看到系统关键事件。
- 输入多个包名后，时间线能按时间顺序展示跨包名事件。
- 系统关键事件必须标明来源，不得无证据归因到目标 App。

## 停止条件

- 时间戳无法比较。
- 系统事件规则需要业务专家确认。

## 拒绝条件

Qoder 必须拒绝或要求人工确认：

- JOB-001 或 JOB-002 尚未完成人工验证，却要求执行本 Job。
- 用户要求维护静态业务 Tag 白名单作为核心逻辑。
- 用户要求修改模型调用或外部系统接入代码。
- 用户要求把系统事件无证据地归因到目标 App。
- 用户要求跳过时间线排序和证据行号验证。
