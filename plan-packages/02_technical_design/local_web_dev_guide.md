# Local Web Development Guide：LogPilot

版本：v0.1  
日期：2026-05-22  
状态：draft  
目标读者：非 Web 开发背景的参赛成员、执行 Agent、人类开发者

## 1. 推荐本地技术栈

为了让 Demo 快速可跑、容易调试、避免 API key 暴露，推荐采用：

```text
前端：Vite + React + TypeScript
后端：Node.js + Express 或 Fastify
测试：Vitest
代码风格：ESLint + Prettier
AI 调用：后端 Provider 抽象，默认真实模型为 DeepSeek
```

推荐目录：

```text
logpilot-web/
  package.json
  .env.example
  .gitignore
  src/
    web/
      App.tsx
      components/
      apiClient.ts
    server/
      index.ts
      ai/
      pipeline/
    shared/
      types.ts
  tests/
    fixtures/
    unit/
```

## 2. 环境准备

### 2.1 安装 Node.js

建议使用 Node.js 20 LTS 或更高版本。

检查命令：

```bash
node -v
npm -v
```

如果命令不存在，需要先安装 Node.js。macOS 可使用官方安装包、nvm、fnm 或公司统一开发环境。

### 2.2 创建项目

若从零创建：

```bash
npm create vite@latest logpilot-web -- --template react-ts
cd logpilot-web
npm install
npm install express cors dotenv zod
npm install -D vitest tsx @types/express @types/node
```

如果任务包后续已包含项目骨架，则只需：

```bash
cd logpilot-web
npm install
```

## 3. 环境变量

创建 `.env.local`，不得提交：

```dotenv
AI_PROVIDER=mock
AI_BASE_URL=
AI_MODEL=mock-logpilot-triage
AI_API_KEY=
AI_TIMEOUT_MS=60000

SERVER_PORT=5174
VITE_API_BASE_URL=http://localhost:5174
```

创建 `.env.example`，可以提交：

```dotenv
AI_PROVIDER=mock
AI_BASE_URL=
AI_MODEL=mock-logpilot-triage
AI_API_KEY=
AI_TIMEOUT_MS=60000

SERVER_PORT=5174
VITE_API_BASE_URL=http://localhost:5174
```

安全规则：

- `.env.local` 必须加入 `.gitignore`。
- API key 只放 `.env.local`。
- 前端变量不能包含真实 API key。
- 所有真实模型调用都经由本地后端。

## 4. 本地启动

推荐两个终端。

终端 A：启动后端

```bash
npm run dev:server
```

期望：

```text
LogPilot server listening on http://localhost:5174
AI provider: mock
```

终端 B：启动前端

```bash
npm run dev:web
```

期望：

```text
Local: http://localhost:5173/
```

浏览器打开：

```text
http://localhost:5173/
```

## 5. package.json 脚本建议

```json
{
  "scripts": {
    "dev:web": "vite --host 127.0.0.1",
    "dev:server": "tsx watch src/server/index.ts",
    "dev": "npm-run-all -p dev:web dev:server",
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "tsc && vite build",
    "preview": "vite preview --host 127.0.0.1"
  }
}
```

如果使用 `npm-run-all`：

```bash
npm install -D npm-run-all
```

## 6. 调试方法

### 6.1 前端调试

浏览器打开开发者工具：

- Console：查看错误。
- Network：查看 `/api/triage-report` 请求。
- Application：确认没有保存 API key。

常见问题：

| 问题 | 排查 |
| --- | --- |
| 页面空白 | 看 Console 是否有 TS/React 错误 |
| API 404 | 检查 `VITE_API_BASE_URL` 和后端端口 |
| CORS 错误 | 后端开启 localhost CORS |
| 上传日志失败 | 检查文件大小限制和请求体格式 |

### 6.2 后端调试

后端日志需要打印：

- 当前 AI_PROVIDER。
- 输入包名数量。
- 解析日志行数。
- 裁剪后事件数量。
- 是否调用真实模型。
- 模型请求耗时。

不要打印：

- API key。
- 未脱敏原始日志全文。
- token、cookie、账号等敏感字段。

### 6.3 AI 调试

先用 mock：

```dotenv
AI_PROVIDER=mock
```

确认 UI、日志解析、报告展示完整可跑后，再切换 DeepSeek：

```dotenv
AI_PROVIDER=deepseek
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat
AI_API_KEY=replace_with_local_deepseek_key
```

切换真实模型前必须确认：

- 输入是结构化摘要。
- 原始日志已脱敏。
- `.env.local` 不会提交。

## 7. 验证命令

开发者每次提交前至少运行：

```bash
npm test
npm run build
```

Demo 前运行：

```bash
npm run dev:server
npm run dev:web
```

并手工验证：

- 上传样例日志。
- 输入时间窗口。
- 输入多个包名。
- 查看 PID 生命周期。
- 查看动态 Tag 统计。
- 查看事件时间线。
- 查看 AI 分诊报告。
- mock 和真实 provider 的错误提示都可读。

## 8. 最小自测用例

必须准备：

```text
tests/fixtures/basic_logcat.log
tests/fixtures/pid_lifecycle.log
tests/fixtures/multi_package_anr.log
demo/hm_event_sample.json
```

测试覆盖：

- 日志行解析。
- 时间窗口过滤。
- PID 生命周期。
- 动态 Tag 统计。
- 系统事件抽取。
- AI report input builder。
- mock provider。

## 9. 交付检查

交付前检查：

- `.env.local` 未提交。
- 前端代码不包含 `AI_API_KEY`。
- 后端支持 `AI_PROVIDER=mock`。
- 真实 provider 缺 key 时错误友好。
- `npm test` 通过。
- `npm run build` 通过。
- Demo 可以在本地浏览器完整跑通。
