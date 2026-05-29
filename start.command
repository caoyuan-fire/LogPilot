#!/bin/bash
# LogPilot 一键启动 — macOS 双击入口
# 使用方式：双击此文件（.command 是 macOS 原生可双击脚本格式）
# 首次运行需要在系统偏好 → 安全性中点击「仍要打开」

# 切换到脚本所在目录（双击时工作目录不固定）
cd "$(dirname "$0")"

# 执行主启动脚本（不用 exec，保留当前 shell 以便捕获退出）
bash start.sh
EXIT_CODE=$?

# 如果异常退出，保持窗口让用户看到错误
if [ $EXIT_CODE -ne 0 ]; then
  echo ""
  echo "启动异常退出（exit $EXIT_CODE），请检查上方错误信息。"
  echo "按回车关闭此窗口..."
  read -r
fi
