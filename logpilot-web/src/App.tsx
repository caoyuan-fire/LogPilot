import { useState } from 'react'
import './App.css'

function App() {
  const [healthStatus, setHealthStatus] = useState<string>('')

  const checkHealth = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5174'
      const res = await fetch(`${baseUrl}/health`)
      const data = await res.json()
      setHealthStatus(JSON.stringify(data, null, 2))
    } catch (err) {
      setHealthStatus(`连接失败: ${err instanceof Error ? err.message : '未知错误'}`)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>LogPilot</h1>
        <p>AI 日志裁剪与缺陷分诊助手</p>
      </header>

      <main className="app-main">
        <section className="section">
          <h2>系统状态</h2>
          <button onClick={checkHealth}>检查后端连接</button>
          {healthStatus && (
            <pre className="status-output">{healthStatus}</pre>
          )}
        </section>

        <section className="section">
          <h2>使用流程</h2>
          <ol>
            <li>上传日志文件</li>
            <li>输入复现时间窗口</li>
            <li>输入相关包名（支持多个）</li>
            <li>查看 PID 生命周期、动态 Tag、事件时间线</li>
            <li>生成 AI 分诊报告</li>
          </ol>
        </section>
      </main>
    </div>
  )
}

export default App
