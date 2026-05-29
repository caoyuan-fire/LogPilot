@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

:: LogPilot 一键启动脚本（Windows 双击运行）
:: 零配置：全新 clone 后直接双击即可

set "SCRIPT_DIR=%~dp0"
set "WEB_DIR=%SCRIPT_DIR%logpilot-web"

echo.
echo  ╔══════════════════════════════════════╗
echo  ║         LogPilot  Launcher           ║
echo  ╚══════════════════════════════════════╝
echo.

:: ── 1. 检查 Node.js ──────────────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js ^>= 18
    echo.
    echo   安装方式（选一）：
    echo     1. 官网下载: https://nodejs.org
    echo     2. winget:   winget install OpenJS.NodeJS.LTS
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -e "process.stdout.write(process.version)"') do set NODE_VER=%%v
echo [OK] Node.js %NODE_VER% 已就绪

:: 检查主版本 >= 18
for /f "tokens=1 delims=." %%m in ('node -e "process.stdout.write(process.version.slice(1))"') do set NODE_MAJOR=%%m
if !NODE_MAJOR! LSS 18 (
    echo [错误] Node.js 版本过低（当前 %NODE_VER%），需要 ^>= 18
    pause
    exit /b 1
)

:: ── 2. 初始化 .env.local ─────────────────────────────────────────────────────
if not exist "%WEB_DIR%\.env.local" (
    echo [提示] .env.local 不存在，从模板自动生成（AI_PROVIDER=mock，无需 API key）
    copy "%WEB_DIR%\.env.example" "%WEB_DIR%\.env.local" >nul
    echo [OK] 已生成 .env.local
)

:: ── 3. 安装 npm 依赖 ─────────────────────────────────────────────────────────
if not exist "%WEB_DIR%\node_modules" (
    echo [提示] 安装依赖，首次运行需要约 30 秒...
    :: 检测国内镜像可达性，优先使用
    node -e "const h=require('https');const r=h.get('https://registry.npmmirror.com',{timeout:3000},()=>process.exit(0));r.on('error',()=>process.exit(1));r.on('timeout',()=>process.exit(1));" 2>nul
    if !errorlevel! == 0 (
        echo [提示] 使用国内镜像加速...
        call npm --prefix "%WEB_DIR%" install --registry https://registry.npmmirror.com --silent
    ) else (
        call npm --prefix "%WEB_DIR%" install --silent
    )
    if errorlevel 1 (
        echo [错误] 依赖安装失败，请检查网络后重试
        pause
        exit /b 1
    )
    echo [OK] 依赖安装完成
) else (
    echo [OK] 依赖已就绪，跳过安装
)

:: ── 4. 启动 ─────────────────────────────────────────────────────────────────
echo.
echo  启动 LogPilot...
echo  前端: http://127.0.0.1:5173
echo  后端: http://127.0.0.1:5174
echo.
echo  稍等几秒后浏览器会自动打开，也可手动访问上方地址
echo  关闭此窗口即可停止服务
echo.

:: 延迟 3 秒后自动打开浏览器
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://127.0.0.1:5173"

cd /d "%WEB_DIR%"
call npm run dev

pause
