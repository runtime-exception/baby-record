# 宝宝成长记录服务

> 家庭内部使用的宝宝成长记录系统：记录宝宝每天的喂养、睡眠、纸尿裤、补剂与成长事件，提供查询、统计分析与数据可视化接口，并为未来 AI 分析预留数据底座。

## 技术栈

- **后端**：TypeScript 5 + NestJS 10
- **ORM**：Prisma 5
- **数据库**：PostgreSQL 15+
- **API**：RESTful（`/api/v1`）+ Swagger 文档
- **部署**：Docker + docker-compose

## 功能特性

- 宝宝基础信息管理（自动计算 年龄 / 月龄 / 天数）
- 记录人身份管理（爸爸/妈妈/爷爷/奶奶/姥姥/姥爷）
- 喂养、纸尿裤、睡眠（开始/结束）、补剂、成长事件 记录
- 按日期 / 时间范围聚合查询
- 统计分析（今日 / 7 天 / 30 天 / 自定义）
- 首页仪表盘（距离上次喂养/换纸尿裤/睡眠）
- 时间间隔分析（最近两次记录与间隔）
- ECharts 可视化数据接口
- 多宝宝支持 + AI 分析预留（生长曲线 / 医疗记录 / AI 分析表已建好）

## 项目结构

```
src/
├── modules/      业务模块（baby user feeding diaper sleep supplement activity
│                  record statistics dashboard interval chart）
├── common/       filters interceptors exceptions enums utils dto
├── config/       configuration validation
├── prisma/       prisma.service prisma.module seed
├── app.module.ts
└── main.ts
prisma/           schema.prisma migrations
docs/             design schema.sql er-diagram swagger-usage api-overview
```

## 快速开始（本地开发）

### 1. 环境要求

- Node.js >= 20
- PostgreSQL（本地或远程）

### 2. 安装依赖

```bash
pnpm install --frozen-lockfile
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 设置数据库连接信息及 DATABASE_PASSWORD
```

> 密码中的 `@` 在 `DATABASE_URL` 中需编码为 `%40`。若仅填写分项字段（`DATABASE_HOST` 等），应用启动时会自动拼接并 URL 编码。

### 4. 数据库迁移

```bash
# 生成 Prisma Client 并应用现有迁移
pnpm prisma:generate
pnpm build
node dist/prisma/deploy.js
```

登录后可在「添加宝宝」创建档案并初始化家庭身份。

### 5. 启动

```bash
npm run start:dev
```

- API：`http://localhost:3000/api/v1`
- Swagger：`http://localhost:3000/docs`

## Docker 部署

```bash
# 一键启动（内置 PostgreSQL，自动建表）
docker-compose up -d --build

# 初始化种子数据（首次）
docker exec -it baby-record node dist/prisma/seed.js  # 若已编译 seed
# 或在宿主执行：npm run prisma:seed
```

访问 `http://localhost:3000/docs` 查看接口文档。

> 连接外部 PostgreSQL 时，编辑 `docker-compose.yml` 注释 `postgres` 服务，并修改 `app.environment` 中的数据库连接。

## 环境变量

| 变量 | 说明 | 默认 |
|---|---|---|
| `DATABASE_HOST` | 数据库主机 | - |
| `DATABASE_PORT` | 数据库端口 | 5432 |
| `DATABASE_NAME` | 数据库名 | - |
| `DATABASE_USERNAME` | 用户名 | - |
| `DATABASE_PASSWORD` | 密码 | - |
| `DATABASE_URL` | 完整连接串（可选，优先使用） | 由分项拼接 |
| `APP_PORT` | 服务端口 | 3000 |
| `API_PREFIX` | API 前缀 | api/v1 |
| `SWAGGER_PATH` | Swagger 路径 | docs |
| `NODE_ENV` | 运行环境 | development |

## 常用命令

| 命令 | 说明 |
|---|---|
| `npm run start:dev` | 本地开发（热重载） |
| `npm run build` | 构建 |
| `npm run start:prod` | 生产启动 |
| `npm run prisma:migrate` | 创建/应用迁移 |
| `npm run prisma:generate` | 生成 Prisma Client |
| `npm run prisma:seed` | 初始化种子数据 |
| `npm run prisma:studio` | Prisma Studio 可视化数据 |

## 文档索引

- [设计方案](./docs/design.md)
- [数据库 ER 图](./docs/er-diagram.md)
- [建表 SQL 脚本](./docs/schema.sql)
- [API 接口总览](./docs/api-overview.md)
- [Swagger 使用说明](./docs/swagger-usage.md)

## 统一响应与错误码

详见 [Swagger 使用说明](./docs/swagger-usage.md)。成功响应：`{ code: 0, message: 'success', data }`。

## AI 扩展预留

数据库已包含 `growth_record`（生长曲线）、`medical_record`（医疗记录）、`ai_analysis`（AI 分析结果，JSON 存输入快照与输出）三张预留表，原始事件全量保留，未来可按 `(baby_id, 时段)` 取数喂给模型，输出喂养规律 / 睡眠趋势 / 异常提醒。
