# Technical Design：LogPilot

版本：v0.4  
日期：2026-05-22  
状态：draft

## 1. 架构概览

```text
日志文件 + 时间窗口 + 多包名
        ↓
日志解析与脱敏
        ↓
PID 生命周期追踪
        ↓
目标 PID 日志裁剪
        ↓
动态 Tag 发现
        ↓
系统关键事件补充
        ↓
跨进程事件时间线
        ↓
AI 缺陷分诊报告
        ↓
可选：Jira 回填 / 飞书通知 / HM 闭环展示
```

推荐 Demo 技术栈调整为 Web 原型：

```text
浏览器 UI
  ↓ 上传日志 / 输入时间窗口与包名
Node.js 本地后端
  ↓ 日志解析 / 证据摘要 / AI Provider 代理
AI Provider
  ↓ mock / DeepSeek API
结构化分诊报告
```

AI 接入不得在浏览器端直接调用模型 API。真实 DeepSeek API key、base URL、model name 必须放在本地后端环境变量中，由后端代理调用。详细方案见 `02_technical_design/ai_integration.md`。

## 2. 模块边界

### 2.1 LogParser

职责：

- 解析日志行。
- 保留原始行号。
- 提取 timestamp、pid、tid、level、tag、message。
- 容错处理无法解析的行。

### 2.2 TimeWindowFilter

职责：

- 解析用户时间输入。
- 支持时间点和起止时间。
- 过滤窗口外日志。

### 2.3 PidTracker

职责：

- 根据包名/进程名识别 PID。
- 建立包名到 PID 生命周期映射。
- 处理进程重启、多 PID、多包名。

示例：

```text
com.demo.export:
  14:20:01 - 14:32:11 => pid 12345
  14:32:13 - 14:40:00 => pid 12680
```

### 2.4 TargetLogExtractor

职责：

- 基于 PID 和时间窗口裁剪目标进程日志。
- 输出结构化事件。

### 2.5 DynamicTagAnalyzer

职责：

- 统计本次复现周期内所有动态 Tag。
- 输出频次、等级分布、首次/末次出现、异常密度。

### 2.6 SystemEventExtractor

职责：

- 从窗口内提取系统关键事件。
- 系统事件不要求属于目标 PID，但必须保留来源。

### 2.7 TimelineBuilder

职责：

- 合并目标日志和系统事件。
- 去重或压缩高频重复项。
- 按时间排序输出事件线。

### 2.8 AiTriageReporter

职责：

- 接收结构化摘要。
- 通过 `AiProvider` 调用 mock 或 DeepSeek API 生成分诊报告。
- 强制区分事实、推测和待补充信息。

### 2.9 AiProvider

职责：

- 统一封装模型接入方式。
- 支持 `mock`、`deepseek` 两种模式。
- 从后端 `.env.local` 读取模型配置。
- 负责超时、重试、错误归一化和敏感信息保护。
- 禁止将 API key 暴露给浏览器端代码。

## 3. 数据结构

日志事件：

```json
{
  "line_no": 1024,
  "timestamp": "14:32:10.123",
  "pid": "12345",
  "tid": "12345",
  "level": "E",
  "tag": "ExportManager",
  "message": "export timeout after 30000ms"
}
```

Tag 统计：

```json
{
  "package": "com.demo.export",
  "pid": "12345",
  "tag": "ExportManager",
  "count": 42,
  "levels": {"D": 10, "I": 20, "W": 8, "E": 4},
  "first_seen": "14:31:02.100",
  "last_seen": "14:32:10.123"
}
```

AI 报告输入：

```json
{
  "bug_summary": "...",
  "packages": ["com.demo.export", "com.demo.file"],
  "time_window": "14:27:00-14:37:00",
  "pid_lifecycles": [],
  "tag_statistics": [],
  "timeline": [],
  "key_log_evidence": []
}
```

## 4. HM/Jira 闭环

```text
HealthMonitor 发现异常
        ↓
自动上传日志
        ↓
自动创建 Jira 单
        ↓
LogPilot 读取日志链接、时间、包名候选
        ↓
生成分诊报告
        ↓
回填 Jira 评论
        ↓
研发接手
```

MVP 可先用模拟 JSON：

```json
{
  "hm_event_id": "HM-20260518-001",
  "jira_key": "COCKPIT-1234",
  "log_path": "sample.log",
  "time_window": "14:27:00-14:37:00",
  "packages": ["com.demo.export", "com.demo.file"]
}
```

## 5. 安全设计

- 日志脱敏在模型调用前执行。
- 外部模型调用默认禁止真实敏感日志。
- 权限系统接入必须显式授权。
- AI 报告只作为辅助建议。
- Web 前端不得保存或传输模型 API key；真实模型调用只能从本地后端发起。
- 默认本地开发使用 `AI_PROVIDER=mock`，确保无 key 也能调试完整流程。

## 6. 风险与处理

- 日志格式不统一：解析器保留无法解析行并计数。
- 找不到 PID：提示用户补充进程名或扩大时间窗口。
- Tag 太多：按异常密度、等级、时间邻近性排序。
- AI 泛化输出：Prompt 要求必须引用 evidence id。
- 接入系统不稳定：Demo 使用模拟闭环，不阻塞核心价值展示。
