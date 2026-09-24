#!/bin/sh
set -e

cd /app/apps/backend

# 先应用数据库迁移，失败时阻止不兼容版本继续启动
./node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma

# 种子数据（幂等：已存在则跳过；失败不阻断启动）
node dist/prisma/seed.js || echo "seed skipped / already seeded"

# 后台启动后端 NestJS
node dist/main.js &

# 前台启动 nginx（保持容器运行）
exec nginx -g 'daemon off;'
