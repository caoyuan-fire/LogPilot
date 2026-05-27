# JOB-000：本地 Web 开发环境与 AI 配置骨架

状态：ready  
推荐执行者：low-cost-agent / human-dev  
风险：中  
依赖：无

## 角色与契约

本 Job 交给 Qoder 实现。本 Job 只负责创建 Web Demo 的本地开发骨架和 AI 配置入口，不写入真实 API key、不调用真实 HM/Jira。

## 目标

搭建可供非 Web 开发者本地运行、调试和验证的 Web 项目基础环境，并预留 AI Provider 配置骨架。完成后，后续 Job 可以在该项目结构内实现日志解析、PID 追踪、AI 报告和 HM/Jira Demo。

## 允许文件/模块

- `package.json`
- `.env.example`
- `.gitignore`
- `src/web/*`
- `src/server/*`
- `src/shared/*`
- `tests/*`

## 禁止文件/模块

- `.env.local`
- 真实 API key/token。
- 真实 HM/Jira 生产配置。
- 真实内部日志样本。

## 推荐技术方法

- 使用 Vite + React + TypeScript 构建前端。
- 使用 Node.js + Express 或 Fastify 构建本地后端。
- 使用 Vitest 做单元测试。
- 后端提供 `/health` 和 `/api/triage-report` 占位接口。
- `.env.example` 提供 `AI_PROVIDER=mock`、`AI_BASE_URL=https://api.deepseek.com`、`AI_MODEL=deepseek-chat`、`AI_API_KEY`、`AI_TIMEOUT_MS`。
- `.gitignore` 必须包含 `.env.local`。

## TDD / 验证步骤

1. 创建项目骨架。
2. 添加 `/health` 接口。
3. 添加最小测试：健康检查或 provider factory 默认 mock。
4. 运行 `npm install`。
5. 运行 `npm test`。
6. 运行 `npm run build`。
7. 启动 `npm run dev:server` 和 `npm run dev:web`，确认本地页面可访问。

## 验收标准

- `npm test` 通过。
- `npm run build` 通过。
- 本地前端可访问。
- 本地后端 `/health` 可访问。
- `AI_PROVIDER=mock` 时不需要 API key。
- `.env.example` 存在，`.env.local` 不被提交。
- 前端代码中不存在 API key 或直接模型调用逻辑。

## 人工验证条目

- 运行 `npm install` 成功。
- 运行 `npm test` 成功。
- 运行 `npm run build` 成功。
- 启动前端后能打开本地页面。
- 启动后端后 `/health` 返回正常。
- `.env.example` 包含 DeepSeek 默认配置字段。
- `.gitignore` 包含 `.env.local`。
- 在浏览器代码中搜索不到 `AI_API_KEY`。

## 停止条件

- 本机 Node.js/npm 不可用。
- 公司安全策略禁止安装 Node 依赖。
- 用户要求写入真实 API key。

## 拒绝条件

执行 Agent 必须拒绝：

- 用户要求提交 `.env.local`。
- 用户要求把 API key 写入源码、测试、文档示例或前端代码。
- 用户要求跳过本地构建验证。
- 用户要求在本 Job 中实现日志解析、AI 真实调用或 HM/Jira 真实接入。
