# ====== 阶段 1: 构建前端 ======
FROM node:22-alpine AS frontend-builder
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --filter @baby-record/frontend --filter @baby-record/shared

COPY apps/frontend/ apps/frontend/
COPY packages/shared/ packages/shared/
# 生产构建：API 走同源相对路径，由 nginx 反代到后端
ENV VITE_API_BASE_URL=/api/v1
RUN pnpm --filter @baby-record/frontend build

# ====== 阶段 2: 构建后端 ======
FROM node:22-alpine AS backend-builder
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --filter @baby-record/backend --filter @baby-record/shared

COPY apps/backend/ apps/backend/
COPY packages/shared/ packages/shared/
RUN pnpm --filter @baby-record/backend exec prisma generate
RUN pnpm --filter @baby-record/backend build

# ====== 阶段 3: 运行时（node + nginx 单镜像）======
FROM node:22-alpine
RUN corepack enable
RUN apk add --no-cache nginx openssl
WORKDIR /app

# 安装后端生产依赖（pnpm 在运行时重建 node_modules，避免构建期 symlink 跨阶段复制断裂）
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --filter @baby-record/backend --filter @baby-record/shared --prod

# schema + 在运行时镜像内重新 prisma generate（确保 .prisma 生成到 @prisma/client 实际所在位置）
COPY --from=backend-builder /app/apps/backend/prisma ./apps/backend/prisma
RUN pnpm --filter @baby-record/backend exec prisma generate --schema=prisma/schema.prisma

# 后端编译产物
COPY --from=backend-builder /app/apps/backend/dist ./apps/backend/dist

# 前端产物
COPY --from=frontend-builder /app/apps/frontend/dist /usr/share/nginx/html

# nginx 配置 + 启动脚本
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production
# 业务日期按家庭所在时区计算；可在部署时用 APP_TIME_ZONE 覆盖。
ENV APP_TIME_ZONE=Asia/Shanghai
EXPOSE 80

CMD ["/entrypoint.sh"]
