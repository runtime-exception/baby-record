# ====== 构建阶段 ======
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && apk add --no-cache openssl

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile --filter @baby-record/backend...

COPY apps/backend/ apps/backend/
RUN pnpm --filter @baby-record/backend prisma:generate
RUN pnpm --filter @baby-record/backend build

# ====== 运行阶段 ======
FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app/apps/backend
ENV NODE_ENV=production

# 仅拷贝运行所需产物
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/backend/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/apps/backend/package.json ./

EXPOSE 3000
CMD ["sh", "-c", "node dist/prisma/deploy.js && exec node dist/main.js"]
