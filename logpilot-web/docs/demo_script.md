# LogPilot 演示脚本 — HM / Jira 闭环

> 适用版本：v0.5（含 JOB-005 模拟闭环）
> 时长目标：5 分钟，重点是讲清"闭环价值 + 不下根因结论"两个差异点

---

## 0. 演示前准备（30 秒，私下做完）

```bash
# 仓库根目录
cd D:/PrivateWork/LogPilot/logpilot-web

# 依赖
npm install

# 默认 mock provider，无需配置 API key
# 真要展示 DeepSeek 真模型时，再在 .env.local 里填 AI_API_KEY，并把 AI_PROVIDER 改成 deepseek
npm run dev
```

打开浏览器到 `http://127.0.0.1:5173/`。等到右上角药丸显示 🟢 **在线 · mock**。

---

## 1. 开场 30 秒：一句话讲清差异

> "LogPilot 不是一个 AI 客户端外壳。它先用确定性日志工程把万行日志压成结构化证据，
> 再让 AI 基于证据写一份**不下根因结论**的分诊报告。"

把鼠标停在右上角药丸上，让评审看到 `provider: mock`，然后说：

> "今天的 Demo 默认走 mock provider，所有响应都是本地确定性输出，
> 演示流程完全稳定。切到 DeepSeek 真模型只需要改一个环境变量。"

---

## 2. HM 闭环入口（30 秒）

向下滚动到 **HM / Jira 闭环** 卡片：

- 指着红框横幅，强调："⚠ **模拟闭环，未接入生产系统**。所有 HM 事件、Jira 单号、设备信息都是合成数据。"
- 解释闭环意图："想象生产环境里 HealthMonitor 在 10:00:05 抓到了 Watchdog + ANR，
  它会自动把日志上传、自动建一个 Jira 单。我们今天演示的就是这之后 LogPilot 怎么接上来。"

---

## 3. 选样例：HM-20260520-001（高优 ANR）（45 秒）

点击 **HM-20260520-001 · 音乐 App 启动后 ANR + Helper 进程被 LMK 杀掉**。

页面会自动：

1. 把 `tests/fixtures/tag_timeline.log` 加载到日志栏
2. 自动填入 `10:00:00~10:01:00`、`com.example.app, com.example.helper`、Bug 描述
3. 顶部出现绿色 ✓ "已载入 HM-20260520-001"，附带 Jira 单号 `COCKPIT-1234`
4. 展开 "HM 抓到的信号" 看 3 条原始线索（Watchdog / ANR / LMK Kill）

讲：

> "这一步对应的是生产里：HM 把它认为可疑的几条 raw 信号挂在 Jira 单里。
> 但研发接单时不可能只看这 3 行，他需要更全面的证据。这就是 LogPilot 该干的事。"

---

## 4. 跑分析（30 秒）

点击 **开始分析**。

预期看到：

- 5 张顶部 stat 卡：解析事件 ~60 / PID 片段 **3** / 时间线 13 / 异常 Tag **1**
- **PID 生命周期**：3 段（app 1 段 + helper 1 段；如果窗口足够长会看到 app 重启的第二段）
- **动态 Tag 统计**：4 行，AppCore 行带 **异常** 橙色高亮
- **关键事件时间线**：13 条，下半段 6 条是**蓝底 + "系统"徽标**

讲：

> "30 秒内，AppCore 这个 Tag 在 PID 2100 下出了 5 个 ERROR、1 个 WARN — 系统帮我们把异常密集 Tag 高亮出来了。
> 时间线下半段那 6 条蓝色行是**系统事件**（Watchdog / ANR / Killing / LMK / FATAL EXCEPTION / Input timeout），
> 注意它们的 source 都是 `system:<tag>` —— LogPilot **明确告诉评审 / 研发，这些事件不归因到目标 App**。
> 比如那条 `FATAL EXCEPTION` 实际是另一个进程 PID 1500 出的，绝不会被误算到音乐 App 头上。"

---

## 5. 生成 AI 报告（45 秒）

点击 **生成 AI 报告**。

预期看到：

- 左大栏：完整 Markdown 报告，含 ## 事实 / ## 推测 / ## 待补充信息 / ## 排查建议 四段
- **每条推测必须带 evidence**（`line_no=18`、`evidence: 见 tag_statistics` 等）
- 右窄栏：Jira 评论版 + **"复制 Jira 评论"** 按钮
- 下方三栏：facts / hypotheses / missing 计数

点 **复制 Jira 评论**，弹出 "Jira 评论 已复制" 提示。

讲：

> "右边这份就是要回填到 Jira 单的评论。
> 注意推测都引用了具体的 line_no — 研发点开评论，能直接跳回原日志的那一行去看原文。
> 这就是 LogPilot 的核心承诺：**证据可追溯**。
> 同时也注意 — 整份报告里**没有**'根因'、'必然由...导致'这类字样。AI 只给推测，不下结论。"

---

## 6. 切换样例：HM-20260520-002（进程重启）（30 秒）

回到 HM 卡片，点 **HM-20260520-002**。这一个 severity 是 medium，说明：

> "并不是所有 HM 事件都是 ANR。这一个是进程在 10 秒内连续重启 — 可能是预期重启，也可能是 crash 循环。
> LogPilot 不会替研发判断，但它会把两段 PID 生命周期都摆出来，让研发自己看清。"

直接点 **开始分析**，看 PID 生命周期 2 段（2100 → 3300），讲完即可。**不必再生成 AI 报告**，节省时间。

---

## 7. 收尾：差异化与"真实接入需要什么"（30 秒）

切回 PPT 或直接讲：

> "如果今天我们要把这个 Demo 接到生产 HealthMonitor 和 Jira，需要的是：
>
> 1. **Jira 服务账号** + `Add Comments` 权限 + API token；
> 2. **HM 事件订阅接口** + 日志下载 ACL；
> 3. **日志脱敏审查** —— 进 AI 前必须脱敏，避免把客户数据外送；
> 4. **审计日志** —— 每次 AI 调用记录 hm_event_id / jira_key / llm_provider / llm_model；
>
> 这些都列在 `demo/jira_comment_sample.md` 里。今天的 Demo 不触达任何真实系统。"

---

## 8. 万一被问到的几个问题

**Q：你们用的是哪个大模型？**
A：默认 mock；真实接入 DeepSeek，base URL / model / API key 全部走后端 `.env.local`，前端代码里 grep 不到 API key 字样。

**Q：万一 AI 编日志怎么办？**
A：AI 看不到原始日志，只能看我们前置流水线产出的结构化摘要 + 不超过 50 条 key_log_evidence。
   Prompt 明确要求每条推测必须引用 line_no；没法引用就降级到 missing_information。

**Q：能扛多大的日志？**
A：实测 10 MB / 9 万行 logcat，整条流水线在 1 秒内跑完。瓶颈是浏览器表格渲染，不是后端。

**Q：和已有的 grep 脚本相比好在哪？**
A：grep 脚本要 (a) 维护静态 Tag 白名单 (b) 跨包名时人工肉眼对时间。LogPilot 用 PID 生命周期替代白名单、用时间线自动跨包名 — 两块维护成本都消掉了。

**Q：会替代研发判断吗？**
A：不会。LogPilot 是分诊（triage）助手，不是定锅工具。整个产品里**没有**"根因 / root cause"字样，文档、测试、UI 三处守护。

---

## 9. 演示脚本回退（万一卡壳）

| 场景 | 应对 |
|---|---|
| 后端断了 | 右上角药丸变红，自动 20s 重试。手动点药丸立即重试。 |
| HM 样例没加载出来 | 直接走"自己上传"路径：拖一个 fixture 进去 / 粘日志 + 填表 |
| AI 报告生成卡 | mock 是同步的，不会卡；如果切到 deepseek 卡了，回 `.env.local` 把 `AI_PROVIDER=mock` 改回去重启 |
| 浏览器不肯打开 5173 | `npm run dev` 输出里看实际端口；后端 5174 固定 |

---

## 10. 关闭演示（10 秒）

`Ctrl+C` 终止 `npm run dev`，关浏览器。
