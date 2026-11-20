#!/bin/sh
set -e

cd /app/apps/backend

# 先应用数据库迁移，失败时阻止不兼容版本继续启动
node dist/prisma/deploy.js

# 后台启动后端 NestJS
node dist/main.js &

# 前台启动 nginx（保持容器运行）
exec nginx -g 'daemon off;'
