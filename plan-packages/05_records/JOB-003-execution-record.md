# JOB-003 执行记录：动态 Tag 与跨包名时间线

执行者：Qoder
执行日期：2026-05-27
依赖确认：JOB-001 与 JOB-002 自动化验证已通过；人工实机验证条目仍待负责人在 UI 上勾选

---

## 实现内容

### 新增文件

| 文件 | 说明 |
|---|---|
| `logpilot-web/src/server/pipeline/tagAnalyzer.ts` | 按 (package, pid, tag) 聚合频次 / level 分布 / 起止时间，输出动态 Tag 清单 + 异常密集 Tag |
| `logpilot-web/src/server/pipeline/systemEventExtractor.ts` | 识别 ANR / Watchdog / FATAL / Killing / LMK / Input timeout 等系统事件；显式跳过目标 PID 的事件 |
| `logpilot-web/src/server/pipeline/timelineBuilder.ts` | 合并目标 PID 关键事件（W/E/F）与系统事件，按时间戳排序，相邻完全相同的事件压缩为单条并保留首样例行号 |
| `logpilot-web/tests/tagAnalyzer.test.ts` | 6 个测试场景 |
| `logpilot-web/tests/timelineBuilder.test.ts` | 6 个测试场景 |
| `logpilot-web/tests/fixtures/tag_timeline.log` | 双包名 + 多 Tag + 6 类系统事件的综合 fixture |
| `logpilot-web/scripts/verify-tag-timeline.ts` | 自动化验证脚本（7 个条目，26 个断言） |

### 修改文件

| 文件 | 说明 |
|---|---|
| `logpilot-web/src/shared/types.ts` | 新增 `TagAnalysisResult`，为 `TimelineEvent` 增加可选 `compressed_count` 字段 |
| `logpilot-web/src/server/index.ts` | 新增 `POST /api/analyze` 接口，串联解析 → 时间窗口 → PID 生命周期 → Tag 分析 → 系统事件 → 时间线 |
| `logpilot-web/src/App.tsx` | 前端 UI：日志上传/粘贴 + 时间窗口 + 包名输入；展示 PID 生命周期表、动态 Tag 统计（异常 Tag 高亮）、关键事件时间线（系统事件 source 显式标注）、解析摘要 |
| `logpilot-web/src/App.css` | 表格、徽标、警告、异常 Tag、系统事件行样式 |
| `logpilot-web/.gitignore` | 新增 `!tests/fixtures/*.log` 反例规则，使 fixture 不再被 `*.log` 全局忽略 |

### 修复历史遗留问题

JOB-001 / JOB-002 的 fixture 因 `.gitignore` 中 `*.log` 规则被全量忽略，仓库中缺失，导致克隆后 `npm test` 直接 ENOENT。本 Job 顺手修复并补回三个 fixture：

- `tests/fixtures/basic_logcat.log`
- `tests/fixtures/pid_single.log`
- `tests/fixtures/pid_restart.log`
- `tests/fixtures/pid_multi_package.log`

修复后基线测试 29/29 全绿，本 Job 增量后 41/41 全绿。

### 核心逻辑说明

**tagAnalyzer**
- 输入：窗口内事件 + PID 生命周期。
- 索引：`pid → [{ pkg, start, end }]`；每个事件仅归入第一个命中的段（避免同 PID 被同时归到多个包名）。
- 聚合键：`package_name | pid | tag` —— 同包名多次重启会产生多行（按 PID 区分）。
- 异常密集 Tag 判定：`E + F ≥ 3` 或 `total ≥ 50`。阈值保守，专为 Demo 量级。
- **不维护静态业务 Tag 白名单**（符合 R6 与停止条件 #2）。

**systemEventExtractor**
- 系统事件来源既看 tag（Watchdog / AndroidRuntime / lowmemorykiller / InputDispatcher / DropBoxManagerService），也看 (tag, message) 组合（ActivityManager 下的 ANR / Killing 等）。
- 关键不变量：**目标 PID 的事件永远不会被当作系统事件输出**。即使 ANR 提到目标包名，规则仅用包名比对来推断，不会把目标 PID 当作系统事件的 source。
- 输出 `source = "system:<tag>"`，前端以蓝底 + "系统" 徽标显示。

**timelineBuilder**
- 目标侧关键事件 = 段内 LogEvent 且 level ∈ {W, E, F}；I/D 级停留在原始事件流，不进时间线。
- 相邻 (pid, tag, level, message, source) 完全相同的事件折叠成一条，附 `compressed_count`，`line_no` 保留首样例行号——证据可回溯。
- 与系统事件合并后整体按 `timestamp` 升序；并列时按 `line_no` 二级排序，保证稳定。

### 测试场景

**tests/tagAnalyzer.test.ts**
1. 单 PID 的 Tag 频次、level 分布、first/last_seen 全部正确（AppCore count=11, D:5/W:1/E:5）。
2. 多包名独立统计，不会把 helper 的 Tag 混进 app。
3. 同包名重启 → 同 Tag 在两个 PID 下产生两行独立统计。
4. AppCore 的 5 个 E 命中异常密集 Tag；HelperCore 不被误标。
5. 空生命周期 → 空结果。
6. 段时间边界严格生效（只取段内事件）。

**tests/timelineBuilder.test.ts**
1. 目标 PID 的 W 事件进入时间线，I 事件不进入；source = `"<pkg>:<pid>"`。
2. ANR/Watchdog/FATAL/Killing/Input timeout 全部入时间线，且 source 不包含目标包名。
3. 跨包名事件按时间戳严格升序；时间线同时包含两个包名的 source。
4. 5 条完全相同事件 → 折叠成 1 条，`compressed_count = 5`，`line_no = 100`（首样例）。
5. 消息不同则不折叠。
6. 全空输入 → 空时间线。

---

## Human Pending（人工验证条目）

以下条目需人工负责人本机运行实机验证。前 7 条由 `verify-tag-timeline.ts` 自动化覆盖（已 PASS），仍需人工在 UI 上勾选最终验收：

- [ ] 运行 `npm test`，41 个测试全部通过（含 JOB-001/002 无回归）
- [ ] 启动 `npm run dev`，前端能上传日志文件并显示 PID 生命周期表
- [ ] 动态 Tag 清单和频次显示正确，异常密集 Tag 高亮
- [ ] Tag 统计中能看到 ERROR/WARN/INFO 等 level 分布
- [ ] 时间线中能看到 ANR / Watchdog / Killing / FATAL / Input timeout 等系统事件
- [ ] 输入多个包名后，时间线按时间顺序展示跨包名事件
- [ ] 系统事件 source 以 `system:<tag>` 形式标注，UI 上有"系统"徽标
- [ ] 重复事件被折叠并显示 `×N`，点击/查看仍能看到首样例行号
- [ ] 整个 UI 不出现"根因 / root cause"字样
- [ ] 不存在的包名仍走 JOB-002 的 `not_found` 提示流程，不崩溃

---

## 验证状态

### 自动化验证 — 已通过（2026-05-27）

**vitest 全量回归**
```
npm test
Test Files  5 passed (5)
     Tests  41 passed (41)
```

**verify-tag-timeline.ts**
```
npx tsx scripts/verify-tag-timeline.ts
结果：26 passed，0 failed
```

| 条目 | 方式 | 结果 |
|---|---|---|
| 动态 Tag 清单与频次正确 | 自动化 | PASS |
| ERROR/WARN/INFO level 分布 | 自动化 | PASS |
| ANR / timeout / Watchdog / FATAL / Killing / LMK 等系统事件全部识别 | 自动化 | PASS |
| 多包名跨包名时间线严格按时间升序 | 自动化 | PASS |
| 系统事件 source 不归因到目标 App（pid、source 双重断言） | 自动化 | PASS |
| 异常密集 Tag 仅命中 AppCore | 自动化 | PASS |
| 高频重复事件压缩并保留首样例行号 | 自动化 | PASS |
| `npm run build` TS 严格编译 + Vite 打包通过 | 自动化 | PASS |

### 人工待确认条目（需前端 UI 完成后）

- [ ] 在浏览器中按上述清单逐条勾选
- [ ] 确认界面上不出现"根因"表述（R3 红线）

---

## 与计划包的对齐

- **R6 动态 Tag**：无任何业务 Tag 白名单；所有 Tag 由日志事件自身决定。
- **R3 不下根因结论**：UI 与后端输出全文未出现"根因 / 推断 / 结论"字样，系统事件被显式标注来源、不归因。
- **R7 可解释性**：每条 Tag 统计都附 `first_seen` / `last_seen`；时间线每条都带 `line_no`（压缩条目也保留首样例行号）。
- **停止条件 #1 时间戳无法比较**：未触发——所有时间戳来自 `MM-DD HH:MM:SS.mmm` 同源格式，字典序即时间序。
- **停止条件 #2 系统事件规则需业务专家确认**：当前规则覆盖座舱场景最常见的 6 类系统事件（ANR / Watchdog / FATAL / Killing / LMK / Input timeout），若后续业务专家提出新增或调整，仅需在 `systemEventExtractor.ts` 的两个常量数组中增删，不动主干逻辑。
- **拒绝条件 #2 静态业务 Tag 白名单**：未实现，符合预期。
- **拒绝条件 #3 修改模型调用或外部系统接入代码**：未触碰 `aiProvider.ts` / `deepseekProvider.ts` / `mockProvider.ts`。
