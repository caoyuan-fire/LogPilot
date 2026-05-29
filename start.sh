#!/usr/bin/env sh
# LogPilot 一键启动脚本（Linux / macOS / Git Bash on Windows）
# 零配置：全新 clone 后直接运行即可

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_DIR="$SCRIPT_DIR/logpilot-web"

# ── 颜色输出 ────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { printf "${GREEN}[LogPilot]${NC} %s\n" "$1"; }
warn()  { printf "${YELLOW}[LogPilot]${NC} %s\n" "$1"; }
error() { printf "${RED}[LogPilot]${NC} %s\n" "$1"; }

# ── 0. 补全 PATH（macOS 双击时不继承 shell PATH，nvm/fnm/brew node 会消失）──
for _d in \
  "/usr/local/bin" \
  "/opt/homebrew/bin" \
  "$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node/" 2>/dev/null | sort -V | tail -1)/bin" \
  "$HOME/.fnm/node-versions/$(ls "$HOME/.fnm/node-versions/" 2>/dev/null | sort -V | tail -1)/installation/bin" \
  "$HOME/.local/bin"; do
  [ -d "$_d" ] && export PATH="$_d:$PATH"
done

# ── 1. 检查 Node.js ──────────────────────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  error "未检测到 Node.js，请先安装 Node.js >= 18"
  echo ""
  echo "  快速安装方式："
  echo "    Linux/macOS:  https://nodejs.org  或  curl -fsSL https://fnm.vercel.app/install | bash"
  echo "    Windows:      https://nodejs.org  或  winget install OpenJS.NodeJS.LTS"
  echo ""
  exit 1
fi

NODE_VER=$(node -e "process.stdout.write(process.version.replace('v','').split('.')[0])")
if [ "$NODE_VER" -lt 18 ]; then
  error "Node.js 版本过低（当前 $(node -v)），需要 >= 18"
  exit 1
fi
info "Node.js $(node -v) ✓"

# ── 2. 初始化 .env.local（首次运行自动复制模板）────────────────────────────
ENV_FILE="$WEB_DIR/.env.local"
if [ ! -f "$ENV_FILE" ]; then
  warn ".env.local 不存在，从 .env.example 自动生成（AI_PROVIDER=mock，无需 key 即可运行）"
  cp "$WEB_DIR/.env.example" "$ENV_FILE"
  info "已生成 $ENV_FILE"
fi

# ── 3. 安装 npm 依赖（node_modules 不存在或 package.json 更新时）────────────
LOCKFILE="$WEB_DIR/package-lock.json"
MODULES="$WEB_DIR/node_modules"

needs_install() {
  [ ! -d "$MODULES" ] && return 0
  [ "$LOCKFILE" -nt "$MODULES" ] && return 0
  return 1
}

if needs_install; then
  info "安装依赖（npm install）..."
  # 优先使用国内镜像，连接超时则退回官方
  if node -e "
    const https = require('https');
    const req = https.get('https://registry.npmmirror.com', {timeout:3000}, ()=>process.exit(0));
    req.on('error',()=>process.exit(1));
    req.on('timeout',()=>process.exit(1));
  " 2>/dev/null; then
    NPM_REGISTRY="--registry https://registry.npmmirror.com"
    npm --prefix "$WEB_DIR" install $NPM_REGISTRY --silent
  else
    NPM_REGISTRY=""
    npm --prefix "$WEB_DIR" install --silent
  fi
  info "依赖安装完成 ✓"
else
  info "依赖已是最新，跳过安装"
fi

# 验证原生绑定完整性（跨平台 clone 后 npm optional dep bug）
if ! npm --prefix "$WEB_DIR" exec -- vite --version >/dev/null 2>&1; then
  warn "检测到原生依赖缺失（跨平台 clone 已知问题），自动修复中..."
  rm -rf "$MODULES" "$WEB_DIR/package-lock.json"
  npm --prefix "$WEB_DIR" install $NPM_REGISTRY --silent
  info "原生依赖修复完成 ✓"
fi

# ── 4. 清理残留进程（防止端口被上次未退出的 node 占用）─────────────────────
for port in 5173 5174; do
  # 用 node 找占用端口的 PID（跨平台，不依赖 lsof 路径）
  pid=$(node -e "
    const net = require('net');
    const s = net.createServer();
    s.listen($port, '127.0.0.1', () => { s.close(); process.stdout.write('free'); });
    s.on('error', () => { process.stdout.write('busy'); });
  " 2>/dev/null)
  if [ "$pid" = "busy" ]; then
    warn "端口 $port 被占用，尝试清理..."
    # 用 lsof 找 PID（兼容绝对路径）
    _lsof=$(command -v lsof || echo /usr/sbin/lsof)
    _pids=$($_lsof -ti tcp:$port 2>/dev/null || true)
    if [ -n "$_pids" ]; then
      echo "$_pids" | xargs kill -9 2>/dev/null || true
      info "端口 $port 已释放"
    else
      warn "无法自动释放端口 $port，请手动运行: lsof -ti tcp:$port | xargs kill -9"
    fi
  fi
done

# ── 5. 启动 ─────────────────────────────────────────────────────────────────
info "启动 LogPilot..."
echo ""
echo "  前端: http://127.0.0.1:5173"
echo "  后端: http://127.0.0.1:5174"
echo ""
echo "  按 Ctrl+C 退出"
echo ""

# 轮询前端端口就绪后再打开浏览器（最多等 60 秒，每秒探测一次）
open_browser() {
  URL="http://127.0.0.1:5173"
  for i in $(seq 1 60); do
    # 用 node 探测 TCP 端口，跨平台无需 nc/curl
    if node -e "
      const net = require('net');
      const c = net.connect(5173, '127.0.0.1', () => { c.destroy(); process.exit(0); });
      c.on('error', () => process.exit(1));
    " 2>/dev/null; then
      if command -v open >/dev/null 2>&1; then
        open "$URL"          # macOS
      elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$URL"      # Linux
      fi
      return
    fi
    sleep 1
  done
}
open_browser &

cd "$WEB_DIR"
npm run dev
