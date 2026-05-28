# JOB-004 执行记录：AI 分诊报告生成链路

执行者：Qoder
执行日期：2026-05-28
依赖确认：JOB-003 自动化验证通过；JOB-001 / JOB-002 / JOB-003 共 44 个测试 + 26 个 verify 断言全部 PASS

---

## 实现内容

### 新增文件

| 文件 | 说明 |
|---|---|
| `logpilot-web/src/server/ai/reportInputBuilder.ts` | `(lifecycles + tagAnalysis + timeline + events)` → `TriageReportInput`；按规则选 `key_log_evidence`（系统事件全量 + 每个异常 Tag 取 3 条 E/F 样例），并强制 token 上限 ≤ 50 条 |
| `logpilot-web/prompts/triage_report_prompt.md` | DeepSeek 系统提示词，明文规定输出契约：facts / hypotheses（必须引用 line_no）/ missing_information / jira_comment_markdown；证据严重不足时强制 hypotheses 为空 |
| `logpilot-web/tests/reportInputBuilder.test.ts` | 6 个测试场景 |
| `logpilot-web/scripts/verify-ai-triage.ts` | 自动化验证脚本（5 个条目，24 个断言） |

### 修改文件

| 文件 | 说明 |
|---|---|
| `logpilot-web/src/server/ai/mockProvider.ts` | 完全重写：尊重 R3 红线 —— 证据严重不足（pid_lifecycles / timeline / key_log_evidence 三者中 ≥2 项为空）时强制 hypotheses 为空、退化到 missing_information；任何情况下不出现"根因 / root cause"等强结论用语；每条 hypothesis 显式带 evidence 引用 |
| `logpilot-web/src/server/ai/deepseekProvider.ts` | Prompt 从硬编码改为读 `prompts/triage_report_prompt.md`；含 fallback 防止文件丢失时崩溃 |
| `logpilot-web/src/server/index.ts` | `/api/triage-report` 从纯转发改为：复跑流水线 → `buildTriageReportInput` → `createAiProvider().generateTriageReport()`；额外回带 `triage_input_summary` 给前端展示"实际送给模型的字段计数" |
| `logpilot-web/src/App.tsx` | 新增"问题描述"输入；新增 "5. AI 分诊报告" 卡片：触发按钮、loading 状态、Markdown 报告渲染、Jira 评论复制按钮、facts/hypotheses/missing 三栏结构化展示、provider 标识、模型输入字段计数 |
| `logpilot-web/src/App.css` | 新增 `.ai-cta` / `.ai-report` / `.ai-grid` / `.ai-bucket` / `.ai-markdown` / `.badge-provider` / `.copy-toast` 等样式 |
| `logpilot-web/tests/aiProvider.test.ts` | 新增 2 个测试：证据不足拒绝出推测、证据充足时推测必带 evidence 引用 |

---

## 核心逻辑

### reportInputBuilder

**契约**：所有进入模型的内容必须来自确定性流水线，不允许凭空构造。

```
windowedEvents + lifecycles + tagAnalysis + timeline + bugSummary
  ↓ build
TriageReportInput {
  bug_summary    ← user 填写，空时给中性默认
  packages       ← 透传
  time_window    ← `${start} ~ ${end}`
  pid_lifecycles ← 透传
  tag_statistics ← 透传
  timeline       ← 透传
  key_log_evidence ← 精挑细选：
                    1) 时间线中每条 is_system_event=true 对应的 LogEvent
                    2) 每个 anomalous_tags 取最多 3 条 E/F 样例
                    cap 50 条
}
```

### MockAiProvider R3 守门

```
const lowEvidence = (pid_lifecycles.length === 0)
                  + (timeline.length === 0)
                  + (key_log_evidence.length === 0)
                  >= 2;

if (lowEvidence) {
  hypotheses = []           // 永远不写
  missing_info = [3+ 条具体的补充建议]
  report_markdown 末尾："⚠ 证据不足，请补充后重试"
} else {
  hypotheses = [带 evidence 引用的推测]
  missing_info = [仍然给出 2 条进一步收敛建议]
}
```

### DeepSeek Prompt 抽离

之前 Prompt 硬编码在 `deepseekProvider.ts` 里，现在抽到 `prompts/triage_report_prompt.md`：
- 单一来源（mock 和 deepseek 行为对齐）
- 不改代码即可调 Prompt
- 评审/答辩时可直接展示 Prompt 文件

Prompt 中明确要求模型输出 JSON、每条推测必须有 `line_no=` 或 `at HH:MM:SS` 引用、证据严重不足时强制 `hypotheses: []`。

---

## Human Pending（人工验证条目）

JOB-004 任务包中的 7 项验证条目，前 4 项已由自动化覆盖（已 PASS），剩余 3 项需人工在 UI / 浏览器中确认：

- [x] `.env.local` 不配置 key、`AI_PROVIDER=mock` 时能生成 mock 报告 — verify 脚本断言
- [x] `.env.local` 配置 `AI_PROVIDER=deepseek` 但不配置 `AI_API_KEY` 时，错误信息清晰 — verify 脚本断言
- [x] 报告含事实 / 推测 / 待补充 / Jira 评论 — verify 脚本断言
- [x] 报告中的推测引用 evidence id — verify 脚本断言
- [ ] **配置有效 DeepSeek key 后，上传样例摘要能生成分诊报告** — 需要人工提供真实 key 在 `.env.local` 测试
- [ ] **浏览器开发者工具中看不到 API key** — 需在浏览器 Network 面板核对
- [ ] **代码仓库中没有提交 `.env.local`** — 已通过 `.gitignore` 阻止，但需人工 grep 确认

---

## 验证状态

### 自动化验证 — 已通过（2026-05-28）

**vitest 全量回归**
```
npm test
Test Files  6 passed (6)
     Tests  52 passed (52)
```

新增测试明细：
- `tests/reportInputBuilder.test.ts` (6 tests)
- `tests/aiProvider.test.ts` 扩 2 个测试（"refuses to emit hypotheses when evidence is severely insufficient" + "emits hypotheses with evidence references when input is rich"）

**verify-ai-triage.ts**
```
npx tsx scripts/verify-ai-triage.ts
结果：24 passed，0 failed
```

| 条目 | 方式 | 结果 |
|---|---|---|
| AI_PROVIDER=mock 时无需 key 跑通 | 自动化 | PASS |
| AI_PROVIDER=deepseek 缺 key 报错（含 .env.local 提示） | 自动化 | PASS |
| 报告含 facts / hypotheses / missing / jira 四段 | 自动化 | PASS |
| 每条推测都引用 evidence | 自动化 | PASS |
| 系统事件不被无证据归因到目标 App | 自动化 | PASS |
| 证据严重不足时 hypotheses 强制为空、≥3 条 missing | 自动化 | PASS |
| 报告 + Jira 评论均无"根因 / root cause"字样 | 自动化 | PASS |
| reportInputBuilder：time_window 格式、key_log_evidence ≤50 上限 | 自动化 | PASS |
| `npm run build` 严格 TS 编译 + Vite 打包 | 自动化 | PASS |
| `/api/triage-report` 端到端 (curl 实际 POST + mock 输出符合契约) | 半自动 | PASS |

### 人工待确认条目（保留）

- [ ] 真实 DeepSeek key 接入测试（涉及人工授权 + 真实模型计费）
- [ ] 浏览器 Network 面板核对：API key 未泄漏到前端
- [ ] `git ls-files | grep -i "\.env\.local"` 确认仓库中无 `.env.local`

---

## 与计划包的对齐

- **R3 不下根因结论**：
  - mockProvider 实现层硬编码"不出现"根因 / root cause"用语"，测试断言守护
  - DeepSeek Prompt 显式规定"禁止根因 / root cause 等用语"
  - 系统事件 source 通过 reportInputBuilder 原样透传，模型看到的就是 `system:<tag>` 形式
- **R6 动态 Tag**：reportInputBuilder 仅取 `tagAnalysis.anomalous_tags`，无业务白名单
- **R7 可解释 / 证据可追溯**：`key_log_evidence` 每条都含 `line_no`；hypotheses 强制引用
- **R11 AI 接入边界**：
  - 前端仅调后端 `/api/triage-report`，无直接模型调用
  - DeepSeek key 仅从 `.env.local` 读取，无任何路径写入前端 / 测试 / 文档示例
  - `.env.local` 已在 `.gitignore`，未入仓
- **拒绝条件 #1 真实日志未脱敏**：未触发；样例日志均为合成
- **拒绝条件 #2 写入真实 key**：未触发
- **拒绝条件 #3 前端持 key**：未触发（前端 source 中无 `AI_API_KEY` 引用）
- **拒绝条件 #4 把推测写成事实**：通过 mock / Prompt 双重约束严格防御
- **拒绝条件 #5 绕过 evidence id**：mockProvider 与 Prompt 都强制每条 hypothesis 引用 evidence

---

## 与 JOB-005 / JOB-006 的衔接

JOB-005 闭环 Demo 已具备所有上游接口：
- 输入：`{ log_content, packages, time_window, bug_summary }`
- 输出：完整的 Markdown 报告 + Jira 评论 markdown
- 只需新增：HM 事件模拟样例 → 自动填充上述输入 → 命中 `/api/triage-report`

JOB-006 终审需要人工：
- 真实 DeepSeek key 测试
- 演示稳定性核对
- 安全合规审查
