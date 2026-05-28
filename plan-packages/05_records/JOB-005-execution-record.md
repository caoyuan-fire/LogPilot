# JOB-005 执行记录：HM / Jira 闭环 Demo

执行者：Qoder
执行日期：2026-05-28
依赖确认：JOB-004 自动化验证通过；JOB-001~004 共 52 个测试 + 26 + 24 个 verify 断言全部 PASS

---

## 实现内容

### 新增文件

| 文件 | 说明 |
|---|---|
| `logpilot-web/demo/hm_event_sample.json` | 合成 HM 事件清单 v1：2 条样例（HM-20260520-001 ANR + LMK / HM-20260520-002 进程重启），含 device / jira / log_path / time_window / packages / bug_summary / hm_signals 字段 |
| `logpilot-web/demo/jira_comment_sample.md` | Jira 评论样例 + "真实接入需要的权限说明"（服务账号 / 项目权限 / 网络可达 / 密钥管理 / 审计） |
| `logpilot-web/src/server/demoWorkflow.ts` | `listHmEvents()` + `loadHmEvent(id)`；含路径沙箱守门（log_path 必须落在 `tests/fixtures/` 内，禁绝对路径 / `..` 越界 / 不存在文件） |
| `logpilot-web/tests/demoWorkflow.test.ts` | 5 个测试场景，含 3 个安全约束断言 |
| `logpilot-web/scripts/verify-hm-demo.ts` | 自动化验证脚本（8 个条目，30 个断言） |
| `logpilot-web/docs/demo_script.md` | 5 分钟现场演示脚本：流程、台词、可能问答、回退方案 |

### 修改文件

| 文件 | 说明 |
|---|---|
| `logpilot-web/src/server/index.ts` | 新增 `GET /api/demo/hm-events` 与 `POST /api/demo/load-hm-event` 两个端点；响应统一携带 `_disclaimer: "模拟 HM/Jira 闭环 — 未接入生产系统"`；404 / 400 错误分别对应 `HmEventNotFoundError` / `HmEventPathError` |
| `logpilot-web/src/App.tsx` | 新增 "DEMO HM / Jira 闭环" 卡（置于输入卡上方）：拉取样例列表、卡片式样例选择、点击自动填表（log_content / time_window / packages / bug_summary）、展开 HM 抓到的信号、绿色 ✓ 载入指示；清除按钮一并清除 HM 状态 |
| `logpilot-web/src/App.css` | `.demo-card` / `.demo-badge` / `.alert-demo` / `.hm-grid` / `.hm-event` / `.hm-sev` / `.hm-loaded` / `.hm-signals` 等样式 |

---

## 核心设计

### 路径安全沙箱

即使是 Demo，也强制 `log_path` 必须在 `tests/fixtures/` 内：

```ts
function resolveSafeLogPath(rawPath: string): string {
  if (path.isAbsolute(rawPath)) throw new HmEventPathError(...);
  const candidate = path.resolve(PROJECT_ROOT, rawPath);
  const rel = path.relative(FIXTURE_SANDBOX, candidate);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new HmEventPathError(...);
  return candidate;
}
```

避免有人通过修改 `hm_event_sample.json` 把 `log_path` 指向 `/etc/passwd` 或 `C:\Windows\...`。

### "模拟闭环"标注的三重保险

1. **后端 API 响应**：每个 `/api/demo/*` 响应顶层都带 `"_disclaimer": "模拟 HM/Jira 闭环 — 未接入生产系统"`
2. **样例文件**：`demo/hm_event_sample.json` 顶层 `_note` 字段明文写"合成 ... 无生产数据"
3. **前端**：HM Demo 卡里红框 `<strong>⚠ 模拟闭环，未接入生产系统</strong>` + 引用 `demo/jira_comment_sample.md`

满足 JOB-005 拒绝条件第 5 项："不得让评审误以为已接入生产系统"。

### 演示路径

```
HM 样例点击
  ↓ POST /api/demo/load-hm-event {id}
后端 loadHmEvent
  ↓ 路径守门 + 读 fixture
返回 {event, log_content, _disclaimer}
  ↓ 前端自动填表
  ↓ 用户点 "开始分析"
POST /api/analyze
  ↓ 五张统计卡 / PID / Tag / 时间线
  ↓ 用户点 "生成 AI 报告"
POST /api/triage-report
  ↓ Markdown 报告 + Jira 评论
  ↓ 用户点 "复制 Jira 评论"
🎉 完整闭环演示
```

---

## Human Pending（人工验证条目）

| JOB-005 验收条目 | 状态 |
|---|---|
| 打开 Demo 页面能看到 HM 事件模拟入口或样例选择 | ✅ 已实现（HM Demo 卡） |
| 选择 hm_event_sample.json 后能自动填充日志路径、时间窗口、包名 | ✅ verify 脚本断言 |
| 点击分析后能生成分诊报告 | ✅ JOB-004 + 本次端到端 verify |
| 页面能展示 Jira 评论版 Markdown | ✅ AI 报告卡右窄栏 + 复制按钮 |
| Demo 明确标注"模拟闭环" | ✅ API `_disclaimer` + 样例 `_note` + UI 红框 三重保险 |

### 还需人工实机走的（前端 UI 验收）

- [ ] 浏览器打开 `http://127.0.0.1:5173/`，HM Demo 卡显示 2 个样例
- [ ] 点击 HM-20260520-001，自动填好日志 / 时间窗口 / 包名 / Bug 描述
- [ ] 顶部出现绿色"✓ 已载入 HM-20260520-001"
- [ ] 展开 "HM 抓到的信号" 看到 3 条原始线索
- [ ] 点击"开始分析" → "生成 AI 报告" → "复制 Jira 评论" 全链路顺滑
- [ ] 整个过程红色 ⚠ "模拟闭环" 提示始终可见
- [ ] 切到 HM-20260520-002 重新跑一遍，结果不同（PID 重启 vs ANR）

---

## 验证状态

### 自动化验证 — 已通过（2026-05-28）

**vitest 全量回归**
```
npm test
Test Files  7 passed (7)
     Tests  57 passed (57)
```

新增测试明细：
- `tests/demoWorkflow.test.ts` (5 tests) — list / load / 三类 PathError

**verify-hm-demo.ts**
```
npx tsx scripts/verify-hm-demo.ts
结果：30 passed，0 failed
```

| 条目 | 方式 | 结果 |
|---|---|---|
| `hm_event_sample.json` 结构正确，含合成数据 _note | 自动化 | PASS |
| `listHmEvents` 含 jira_key / packages 概要 | 自动化 | PASS |
| `loadHmEvent('HM-20260520-001')` 完整装回 + 日志内嵌 | 自动化 | PASS |
| 绝对路径 / `..` 越界 / 不存在文件 / 未知 id 四类错误正确抛 | 自动化 | PASS |
| HM 样例 → 流水线 → AI 报告 端到端跑通（mock） | 自动化 | PASS |
| AI 报告 + Jira 评论均无"根因 / root cause"字样 | 自动化 | PASS |
| 每条 hypothesis 都引用 evidence | 自动化 | PASS |
| Jira 评论含 包名 / 时间窗口 / provider 标识 | 自动化 | PASS |
| `demo/jira_comment_sample.md` 含"真实接入 + 权限"说明 | 自动化 | PASS |
| `docs/demo_script.md` 明确标"模拟闭环" | 自动化 | PASS |
| `npm run build` 严格 TS 编译 + Vite 打包通过 | 自动化 | PASS |
| `/api/demo/hm-events` 与 `/api/demo/load-hm-event` curl 实测 | 半自动 | PASS |

---

## 与计划包的对齐

- **R10 HM/Jira 闭环**：以模拟 JSON 完整呈现 HM 事件 → LogPilot 分诊 → Jira 评论的链路
- **R3 不下根因结论**：从 mock 输出到 Jira 评论全文都禁用"根因/root cause"字样，verify 守护
- **拒绝条件 #1 JOB-004 未完成却执行本 Job**：未触发 — JOB-004 已 57 测试 + 24 断言 PASS
- **拒绝条件 #2 真实 HM/Jira 接入**：未触发 — 所有 HM 事件 + Jira 信息为合成数据
- **拒绝条件 #3 真实 Jira 写入 / 飞书通知**：未触发 — 整个流程不发任何外部网络请求
- **拒绝条件 #4 含敏感信息样例**：未触发 — 设备 / 包名 / Bug 描述全是合成
- **拒绝条件 #5 把模拟闭环宣传为真实接入**：未触发 — API / 样例 / UI / 演示脚本四处声明"模拟闭环"

---

## 与 JOB-006 的衔接

JOB-005 完成后，JOB-006（最终人工验收）的所有前置依赖已就绪：

- ✅ JOB-000 ~ JOB-005 自动化全 PASS
- ✅ 端到端流程 fixture / mock / 真实接口 三层验证齐
- ✅ `docs/demo_script.md` 提供 5 分钟演示脚本，含可能问答
- ✅ `demo/jira_comment_sample.md` 提供"真实接入需要的权限"说明，可直接用于答辩

JOB-006 待人工负责人按 `04_jobs/JOB-006-final-integration-acceptance.md` 的人工验证条目本机实机验证。
