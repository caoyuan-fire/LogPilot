import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import type {
  PidLifecycle,
  TagAnalysisResult,
  TimelineEvent,
} from './shared/types'

interface AnalyzeResponse {
  lifecycles: PidLifecycle[]
  not_found: string[]
  tag_analysis: TagAnalysisResult
  timeline: TimelineEvent[]
  parse_summary: {
    total_lines: number
    parsed_events: number
    windowed_events: number
    unparsed_lines: number
    window: { start: string; end: string }
  }
}

type HealthState =
  | { kind: 'checking' }
  | { kind: 'ok'; provider: string; timestamp: string }
  | { kind: 'error'; message: string }

const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5174'
const HEALTH_POLL_MS = 20_000

function App() {
  const [health, setHealth] = useState<HealthState>({ kind: 'checking' })
  const [logContent, setLogContent] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')
  const [timeWindow, setTimeWindow] = useState<string>('')
  const [packagesText, setPackagesText] = useState<string>('')
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [dragOver, setDragOver] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const checkHealth = useCallback(async (opts?: { silent?: boolean }) => {
    // 手动触发（点击状态指示器）时给出"检查中"过渡态；轮询时静默更新避免闪烁
    if (!opts?.silent) setHealth({ kind: 'checking' })
    try {
      const res = await fetch(`${baseUrl}/health`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setHealth({ kind: 'ok', provider: data.ai_provider, timestamp: data.timestamp })
    } catch (err) {
      setHealth({ kind: 'error', message: err instanceof Error ? err.message : '未知错误' })
    }
  }, [])

  // 首次加载立即检查 + 每 20s 静默轮询，后端恢复连接后自动解锁
  useEffect(() => {
    checkHealth()
    const id = setInterval(() => checkHealth({ silent: true }), HEALTH_POLL_MS)
    return () => clearInterval(id)
  }, [checkHealth])

  const isOnline = health.kind === 'ok'

  const acceptFile = async (file: File) => {
    setFileName(file.name)
    const text = await file.text()
    setLogContent(text)
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) await acceptFile(f)
    // 重置 <input> 的 value，确保再次选择同一文件时 onChange 仍会触发
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) acceptFile(f)
  }

  const runAnalyze = async () => {
    setError('')
    setResult(null)

    if (!logContent.trim()) {
      setError('请先上传或粘贴日志')
      return
    }
    const packages = packagesText
      .split(/[\s,，;；\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (packages.length === 0) {
      setError('请输入至少一个包名')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_content: logContent,
          packages,
          time_window: timeWindow.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || `请求失败 (${res.status})`)
      }
      const data: AnalyzeResponse = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }

  const totalSegments = result
    ? result.lifecycles.reduce((acc, lc) => acc + lc.segments.length, 0)
    : 0

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-left">
          <div className="brand">
            <span className="brand-dot" />
            <h1>LogPilot</h1>
          </div>
          <p className="tagline">AI 日志裁剪与缺陷分诊助手</p>
        </div>
        <div className="hero-right">
          <button
            className={`status-pill status-${health.kind}`}
            onClick={() => checkHealth()}
            title={
              health.kind === 'error'
                ? `后端无响应：${health.message}（点击重试）`
                : health.kind === 'ok'
                  ? `Provider: ${health.provider}`
                  : '正在检查后端连接...'
            }
          >
            <span className="status-dot" />
            {health.kind === 'checking' && '检查中...'}
            {health.kind === 'ok' && `在线 · ${health.provider}`}
            {health.kind === 'error' && '离线 · 点击重试'}
          </button>
        </div>
      </header>

      <main className="app-main">
        {!isOnline && (
          <div className="alert alert-offline">
            {health.kind === 'checking' ? (
              <><span className="spinner" /> 正在连接后端服务...</>
            ) : (
              <>
                <strong>后端服务未连接</strong>
                <span className="dim">— {health.message}。已每 20s 自动重试，连上后自动解锁。</span>
                <button className="btn btn-link" onClick={() => checkHealth()}>立即重试</button>
              </>
            )}
          </div>
        )}

        {/* ── 输入卡 ───────────────────────────────────────────────── */}
        <section className={`card ${!isOnline ? 'is-disabled' : ''}`}>
          <fieldset disabled={!isOnline} className="fieldset-bare">
          <div className="card-head">
            <h2>1. 输入</h2>
            <span className="card-sub">日志文件 · 时间窗口 · 包名</span>
          </div>

          <div
            className={`drop-zone ${dragOver ? 'is-over' : ''} ${logContent ? 'is-loaded' : ''} ${!isOnline ? 'is-disabled' : ''}`}
            onDragOver={(e) => {
              if (!isOnline) return
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              if (!isOnline) return
              handleDrop(e)
            }}
            onClick={() => {
              if (!isOnline) return
              fileInputRef.current?.click()
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".log,.txt,text/plain"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
            {logContent ? (
              <div className="drop-loaded">
                <span className="file-icon">📄</span>
                <div className="file-meta">
                  <div className="file-name">{fileName || '已粘贴日志'}</div>
                  <div className="file-size">{formatBytes(logContent.length)} · {logContent.split('\n').length.toLocaleString()} 行</div>
                </div>
                <button
                  className="btn btn-link"
                  onClick={(e) => {
                    e.stopPropagation()
                    setLogContent('')
                    setFileName('')
                    // 清除分析输入：时间窗口 + 包名
                    setTimeWindow('')
                    setPackagesText('')
                    // 清除分析结果，避免旧结果留在页面上造成误导
                    setResult(null)
                    setError('')
                    // 同步清空 <input>，防止"选同一个文件"时 onChange 不触发
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                >
                  清除
                </button>
              </div>
            ) : (
              <div className="drop-empty">
                <span className="drop-icon">⬆</span>
                <div>
                  <strong>拖入日志文件</strong> 或点击选择
                </div>
                <span className="drop-hint">支持 .log / .txt，10MB 以内</span>
              </div>
            )}
          </div>

          <details className="paste-toggle">
            <summary>或直接粘贴日志文本</summary>
            <textarea
              placeholder="将 logcat 输出粘贴到这里..."
              value={logContent}
              onChange={(e) => {
                setLogContent(e.target.value)
                if (!fileName) setFileName('')
              }}
              rows={6}
            />
          </details>

          <div className="form-grid">
            <label className="field">
              <span className="field-label">时间窗口（可选）</span>
              <input
                type="text"
                placeholder="HH:MM:SS~HH:MM:SS 或单点 HH:MM:SS"
                value={timeWindow}
                onChange={(e) => setTimeWindow(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">包名（多个用逗号分隔）</span>
              <input
                type="text"
                placeholder="com.example.app, com.example.helper"
                value={packagesText}
                onChange={(e) => setPackagesText(e.target.value)}
              />
            </label>
          </div>

          <div className="actions">
            <button className="btn btn-primary" onClick={runAnalyze} disabled={loading || !isOnline}>
              {loading ? (
                <>
                  <span className="spinner" /> 分析中...
                </>
              ) : (
                '开始分析'
              )}
            </button>
            {error && <span className="error-text">{error}</span>}
          </div>
          </fieldset>
        </section>

        {/* ── 结果 ─────────────────────────────────────────────────── */}
        {result && (
          <>
            <section className="stat-row">
              <StatCard label="解析事件" value={result.parse_summary.parsed_events} hint={`共 ${result.parse_summary.total_lines.toLocaleString()} 行`} />
              <StatCard label="窗口内事件" value={result.parse_summary.windowed_events} hint={`未解析 ${result.parse_summary.unparsed_lines}`} />
              <StatCard label="PID 片段" value={totalSegments} hint={`${result.lifecycles.length} 个包名`} />
              <StatCard label="时间线" value={result.timeline.length} hint={`系统事件 ${result.timeline.filter((e) => e.is_system_event).length}`} />
              <StatCard
                label="异常 Tag"
                value={result.tag_analysis.anomalous_tags.length}
                hint={result.tag_analysis.anomalous_tags.slice(0, 2).join(', ') || '无'}
                tone={result.tag_analysis.anomalous_tags.length > 0 ? 'warn' : undefined}
              />
            </section>

            {/* PID 生命周期 */}
            <section className="card">
              <div className="card-head">
                <h2>2. PID 生命周期</h2>
                <span className="card-sub">{result.lifecycles.length} 个包名 · {totalSegments} 个 PID 片段</span>
              </div>
              {result.not_found.length > 0 && (
                <div className="alert alert-warn">
                  <strong>未找到 PID：</strong>{result.not_found.join(', ')}。可尝试扩大时间窗口或确认进程名。
                </div>
              )}
              {result.lifecycles.length === 0 ? (
                <EmptyState text="未匹配到任何包名的 PID 片段" />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>包名</th>
                        <th>PID</th>
                        <th>开始</th>
                        <th>结束</th>
                        <th>持续</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.lifecycles.flatMap((lc) =>
                        lc.segments.map((seg, idx) => (
                          <tr key={`${lc.package_name}-${seg.pid}-${idx}`}>
                            <td><code className="pkg">{lc.package_name}</code></td>
                            <td><span className="pid-chip">{seg.pid}</span></td>
                            <td className="mono">{seg.start_time}</td>
                            <td className="mono">{seg.end_time}</td>
                            <td className="mono dim">{durationOf(seg.start_time, seg.end_time)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Tag 统计 */}
            <section className="card">
              <div className="card-head">
                <h2>3. 动态 Tag 统计</h2>
                <span className="card-sub">{result.tag_analysis.statistics.length} 个 Tag</span>
              </div>
              {result.tag_analysis.anomalous_tags.length > 0 && (
                <div className="alert alert-warn">
                  <strong>异常密集 Tag：</strong>
                  {result.tag_analysis.anomalous_tags.map((t) => (
                    <span key={t} className="badge badge-warn">{t}</span>
                  ))}
                </div>
              )}
              {result.tag_analysis.statistics.length === 0 ? (
                <EmptyState text="目标 PID 内没有任何 Tag 数据" />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>包名</th>
                        <th>PID</th>
                        <th>Tag</th>
                        <th>总数</th>
                        <th>Level 分布</th>
                        <th>首次</th>
                        <th>末次</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.tag_analysis.statistics.map((s, i) => {
                        const isAnomaly = result.tag_analysis.anomalous_tags.includes(s.tag)
                        return (
                          <tr key={i} className={isAnomaly ? 'is-anomaly' : ''}>
                            <td><code className="pkg">{s.package_name}</code></td>
                            <td><span className="pid-chip">{s.pid}</span></td>
                            <td>
                              <span className="tag-chip">{s.tag}</span>
                              {isAnomaly && <span className="badge badge-warn-sm">异常</span>}
                            </td>
                            <td><strong>{s.count.toLocaleString()}</strong></td>
                            <td>
                              <div className="level-row">
                                {(['V', 'D', 'I', 'W', 'E', 'F'] as const).map((lv) =>
                                  s.levels[lv] ? (
                                    <span key={lv} className={`lv lv-${lv}`}>{lv} {s.levels[lv]}</span>
                                  ) : null
                                )}
                              </div>
                            </td>
                            <td className="mono dim">{s.first_seen}</td>
                            <td className="mono dim">{s.last_seen}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* 时间线 */}
            <section className="card">
              <div className="card-head">
                <h2>4. 关键事件时间线</h2>
                <span className="card-sub">
                  {result.timeline.length} 条 · 系统事件 source 标注 <code>system:&lt;tag&gt;</code>，不归因到目标 App
                </span>
              </div>
              {result.timeline.length === 0 ? (
                <EmptyState text="没有命中关键事件" />
              ) : (
                <div className="table-wrap timeline-wrap">
                  <table className="timeline-table">
                    <thead>
                      <tr>
                        <th>时间</th>
                        <th>来源</th>
                        <th>Level</th>
                        <th>Tag</th>
                        <th>消息</th>
                        <th>行号</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.timeline.map((ev, idx) => (
                        <tr
                          key={`${ev.line_no}-${idx}`}
                          className={ev.is_system_event ? 'is-system' : ''}
                        >
                          <td className="mono">{ev.timestamp}</td>
                          <td>
                            <span
                              className={`source-chip ${ev.is_system_event ? 'src-system' : 'src-target'}`}
                              title={ev.source}
                            >
                              {ev.source}
                            </span>
                          </td>
                          <td>
                            <span className={`lv lv-${ev.level}`}>{ev.level}</span>
                          </td>
                          <td><span className="tag-chip">{ev.tag}</span></td>
                          <td className="msg-cell" title={ev.message}>
                            {ev.message}
                            {ev.compressed_count && ev.compressed_count > 1 && (
                              <span className="badge badge-folded">×{ev.compressed_count}</span>
                            )}
                          </td>
                          <td className="mono dim">{ev.line_no}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* 解析摘要 */}
            <details className="card collapsible">
              <summary>
                <h2>5. 解析摘要</h2>
                <span className="card-sub">展开查看时间窗口与统计</span>
              </summary>
              <pre className="json-block">{JSON.stringify(result.parse_summary, null, 2)}</pre>
            </details>
          </>
        )}
      </main>

      <footer className="app-footer">
        LogPilot · 仅作辅助分诊，不下根因结论
      </footer>
    </div>
  )
}

// ─── helpers ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: number
  hint?: string
  tone?: 'warn'
}) {
  return (
    <div className={`stat-card ${tone === 'warn' ? 'is-warn' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value.toLocaleString()}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">∅</span>
      <span>{text}</span>
    </div>
  )
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

function durationOf(start: string, end: string): string {
  // Strings are MM-DD HH:MM:SS.mmm — compute ms diff via Date with arbitrary year
  const toMs = (s: string) => {
    const m = s.match(/^(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/)
    if (!m) return 0
    const [, mo, d, h, mi, se, ms] = m
    return Date.UTC(2000, Number(mo) - 1, Number(d), Number(h), Number(mi), Number(se), Number(ms))
  }
  const diff = toMs(end) - toMs(start)
  if (diff < 0) return '-'
  if (diff < 1000) return `${diff} ms`
  if (diff < 60_000) return `${(diff / 1000).toFixed(2)} s`
  if (diff < 3600_000) return `${Math.floor(diff / 60000)}m ${Math.floor((diff % 60000) / 1000)}s`
  return `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`
}

export default App
