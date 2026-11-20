# ====== 构建阶段 ======
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY prisma ./prisma
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

# ====== 运行阶段 ======
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# 仅拷贝运行所需产物
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["sh", "-c", "node dist/prisma/deploy.js && exec node dist/main.js"]
