# Jira 评论样例（合成 / 仅作 Demo 参考）

> 本文档展示 LogPilot 在 `HM-20260520-001` 这条样例事件下**预期**回填到 Jira 评论的 Markdown 形态。实际评论由 AI provider 动态生成；mock provider 的输出可能与本样例略有不同，但结构相同。

---

**LogPilot 分诊摘要 (mock)**

- 包名：com.example.app, com.example.helper
- 时间窗口：05-20 10:00:00.000 ~ 05-20 10:01:00.000
- PID 片段：2（2 个包名）
- 动态 Tag：4（异常 1）
- 关键事件：13（系统事件 6）

**推测**：

- 系统在 05-20 10:00:05.000 记录了 Watchdog 事件（line_no=18），目标 App 可能在此时间点附近受影响 — 注意此事件来源是 `system:Watchdog`，不直接归因到目标包名
- Tag `AppCore@2100 (E:5)` 出现密集错误，可能是排查切入点（evidence: 见 tag_statistics）

**待补充**：

- 需要确认异常前的用户操作（点击、滑动、网络切换等）
- 若怀疑系统侧问题，建议提供同时段的 dmesg / kernel log

> 由 LogPilot 自动生成，仅作辅助分诊，请人工核对后再下结论。

---

## 真实接入 Jira 需要的权限说明

当前 Demo 不会真的写入 Jira。如需把该评论自动回填到 Jira：

1. **服务账号**：需在 Jira 内建一个 LogPilot 服务账号，并拿到该账号的 API token。
2. **项目权限**：服务账号需在目标项目（如 `COCKPIT`）拥有：
   - `Browse Projects` — 读取 issue 列表
   - `Add Comments` — 写入评论
3. **网络可达**：LogPilot 后端需要能 HTTPS 直连 `jira.example.com`（生产环境是内网/VPN）。
4. **密钥管理**：Jira API token 与 DeepSeek key 同等敏感，**只能放在后端 `.env.local`**，禁止入前端代码、源码、文档示例或 git 仓库。
5. **审计**：每次自动回填评论应记录 `{hm_event_id, jira_key, timestamp, llm_provider, llm_model}`，便于事后追溯。

以上权限授予前，本 Demo 保持模拟闭环形态，不会触达真实 Jira。
