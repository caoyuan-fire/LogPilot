#!/bin/bash
# LogPilot 一键启动 — macOS 双击入口
# 使用方式：双击此文件（.command 是 macOS 原生可双击脚本格式）
# 首次运行需要在系统偏好 → 安全性中点击「仍要打开」

# 切换到脚本所在目录（双击时工作目录不固定）
cd "$(dirname "$0")"

# 执行主启动脚本
exec bash start.sh
