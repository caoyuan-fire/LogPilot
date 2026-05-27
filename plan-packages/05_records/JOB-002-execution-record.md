# JOB-002 执行记录：多包名 PID 生命周期追踪

执行者：Qoder  
执行日期：2026-05-27  
依赖确认：JOB-001 已由人工负责人实机验证通过（2026-05-27）

---

## 实现内容

### 新增文件

| 文件 | 说明 |
|---|---|
| `logpilot-web/src/server/pipeline/pidTracker.ts` | PID 生命周期追踪核心逻辑 |
| `logpilot-web/src/server/index.ts` | 新增 POST /api/pid-lifecycles 接口 |
| `logpilot-web/tests/pidTracker.test.ts` | 6 个测试场景 |
| `logpilot-web/tests/fixtures/pid_single.log` | 单包名单 PID fixture |
| `logpilot-web/tests/fixtures/pid_restart.log` | 进程重启 fixture（2 个 PID 片段） |
| `logpilot-web/tests/fixtures/pid_multi_package.log` | 双包名独立追踪 fixture |
| `logpilot-web/scripts/verify-pid-lifecycles.ts` | 自动化验证脚本（5 个条目，25 个断言） |

### 核心逻辑说明

- 识别 `ActivityManager` tag 下的三类信号：
  - `Start proc <pid>:<pkgname>/...`：开启新 PID 片段
  - `Process <pkgname> (pid <pid>) has died`：关闭对应片段
  - `Killing <pid>:<pkgname>/...`：关闭对应片段
- 另识别任意 tag 下的 `ANR in <pkgname>` 作为进程结束信号
- 兼容无 PID 的旧版 `Start proc <pkgname> for` 格式（以事件自身 PID 作为近似值）
- 同一包名多次启动生成多个独立 `PidSegment`（支持重启场景）
- 扫描结束时仍未关闭的片段，使用 `window.end` 作为暂定结束时间
- 未找到任何 PID 的包名放入 `not_found` 列表，不抛异常

### 测试场景（tests/pidTracker.test.ts）

1. 单包名单 PID，起止时间正确
2. 同一包名重启 → 输出 2 个独立 PID 片段
3. 两个包名各自独立追踪，不互相污染
4. 不存在的包名 → `not_found` 列表，不崩溃
5. 混合：一个存在、一个不存在
6. 进程在窗口结束时仍存活 → `end_time` 使用 `window.end`

---

## Human Pending（人工验证条目）

以下条目需人工负责人本机运行实机验证，完成后在对应项打勾并更新验证状态。

- [ ] 运行 `npm test`，确认 `pidTracker.test.ts` 全部通过（含已有测试无回归）
- [ ] 单包名单 PID：接口或页面能展示该包名对应 PID 及起止时间
- [ ] 进程重启：同一包名出现两个 PID 生命周期片段
- [ ] 两个包名：各自独立展示，互不混淆
- [ ] 不存在的包名：返回或显示"未找到 PID，请补充进程名或扩大时间窗口"等可读提示
- [ ] PID 生命周期结果展示中不出现"根因"表述

---

## 验证状态

### 自动化验证 — 已通过（2026-05-27）

验证脚本：`scripts/verify-pid-lifecycles.ts`
运行命令：`npx tsx scripts/verify-pid-lifecycles.ts`
结果：**25 passed，0 failed**

| 条目 | 方式 | 结果 |
|---|---|---|
| npm test（含 pidTracker.test.ts 7 个测试，无回归） | 自动化 | PASS |
| 单包名单 PID：PID/起止时间正确 | 自动化 | PASS |
| 进程重启：同一包名输出 2 个 PID 片段 | 自动化 | PASS |
| 两个包名：各自独立，PID 不混淆 | 自动化 | PASS |
| 不存在包名：not_found 列表 + 可读提示，不崩溃 | 自动化 | PASS |
| 窗口结束仍存活：end_time 使用 window.end | 自动化 | PASS |

### 人工待确认条目（需前端 UI 完成后）

- [ ] 页面 UI 展示 PID 生命周期结果（JOB-003/004 前端完成后验收）
- [ ] 确认界面上不出现"根因"表述
