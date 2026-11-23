# 宝宝成长记录服务 · 设计方案

> 家庭内部使用的宝宝成长记录系统：记录宝宝每天的喂养、睡眠、纸尿裤、补剂与成长事件，提供查询、统计分析与数据可视化接口，并为未来 AI 分析预留数据底座。

## 一、设计原则

1. **领域驱动模块化**：每个业务域自成模块；统计、仪表盘、可视化、间隔分析作为只读聚合层复用底层。
2. **原始事件优先**：保留完整原始事件（不丢弃字段、不只存聚合结果），为 AI 分析与生长曲线留足数据底座。
3. **多宝宝 + 多记录人**：所有表挂 `baby_id` / `creator_id`。
4. **统一契约**：统一响应格式、统一异常处理、统一 DTO 校验、统一 Swagger 文档。
5. **配置外置**：敏感信息只走环境变量。

## 二、技术栈

| 层 | 选型 |
|---|---|
| 语言 | TypeScript 5 |
| 框架 | NestJS 10 |
| ORM | Prisma 5 |
| 数据库 | PostgreSQL 15+ |
| API | RESTful（`/api/v1`） |
| 文档 | Swagger / OpenAPI |
| 校验 | class-validator + 全局 ValidationPipe |
| 配置 | @nestjs/config + Joi |
| 部署 | Docker + docker-compose |

## 三、系统架构

```
Controller 层 (路由 / Swagger / DTO 校验)
    ↓
Service 层     (业务逻辑 / 统计 / 聚合)
    ↓
Prisma 层      (PrismaService -> PostgreSQL)
    ↑
Common 层      (Filter / Interceptor / Decorator / Util)
```

横切关注点：

| 组件 | 作用 |
|---|---|
| `AllExceptionsFilter` | 全局异常过滤器，统一转标准响应体 |
| `TransformInterceptor` | 统一响应格式 `{ code, message, data }` |
| `ValidationPipe` | 全局参数校验（whitelist + transform） |
| `BusinessException` | 业务异常 + 错误码 |
| `AgeUtil` | 年龄/月龄/天数计算 |

### 统一响应格式

成功：`{ "code": 0, "message": "success", "data": {...} }`
失败：`{ "code": 40001, "message": "参数校验失败", "data": null, "details": [...] }`

错误码区间：`0` 成功 / `1000x` 系统 / `2000x` 鉴权 / `3000x` baby·user / `4000x` 参数 / `5000x` 记录。

## 四、数据库 ER 设计

共 7 张核心表 + 3 张预留业务表。记录主键自增，宝宝主键为 16 位小写十六进制随机码；业务表通过 `baby_id` 外键级联关联宝宝，并保留 `creator_id`、`created_time`，关键查询字段建复合索引 `(baby_id, 业务时间)`。

ER 图见 [er-diagram.md](./er-diagram.md)，建表 SQL 见 [schema.sql](./schema.sql)。

| 表 | 关键字段 |
|---|---|
| baby | name, nickname, gender, birthday, birth_weight, birth_height, head_circumference, birth_hospital |
| user | name, role（6 种角色枚举） |
| feeding | feeding_time, feeding_type, amount_ml, duration_minutes |
| diaper | change_time, type |
| sleep | start_time, end_time(可空), duration_minutes, sleep_type |
| supplement | name, amount, unit, take_time |
| activity | event_type, event_time, description |
| growth_record（预留） | measure_time, weight, height, head_circumference |
| medical_record（预留） | record_type, record_time, title |
| ai_analysis（预留） | analysis_type, period_start/end, input(JSON), result(JSON) |

## 五、Prisma Schema

完整 schema 见仓库根目录 `prisma/schema.prisma`。命名约定：Prisma 字段 camelCase，`@map` 映射下划线列名。

## 六、API 接口设计

全局前缀 `/api/v1`，详细总览见 [api-overview.md](./api-overview.md)，使用说明见 [swagger-usage.md](./swagger-usage.md)。

| 模块 | 路径前缀 | 说明 |
|---|---|---|
| baby | `/babies` | 宝宝增改查（含年龄计算） |
| user | `/users` | 记录人身份 |
| feeding | `/feedings` | 喂养 CRUD |
| diaper | `/diapers` | 纸尿裤 CRUD |
| sleep | `/sleeps` | 睡眠 CRUD + `start` / `:id/end` |
| supplement | `/supplements` | 补剂 CRUD |
| activity | `/activities` | 成长事件 CRUD |
| record | `/records/daily` `/records/range` | 日期/范围聚合查询 |
| statistics | `/statistics/*` | 统计分析 |
| dashboard | `/dashboard` | 首页状态卡片 |
| interval | `/intervals/*` | 时间间隔分析 |
| chart | `/charts/*` | ECharts 可视化 |

## 七、项目目录结构

```
src/
├── modules/  (baby user feeding diaper sleep supplement activity record statistics dashboard interval chart)
├── common/   (filters interceptors exceptions enums utils dto pipes decorators)
├── config/   (configuration validation)
├── prisma/   (prisma.service prisma.module seed)
├── app.module.ts
└── main.ts
prisma/  (schema.prisma migrations)
docs/    (design schema er-diagram swagger-usage api-overview)
```

## 八、关键设计说明

### 年龄/月龄/天数计算

满月（completed months）+ 余天算法。以生日 `2026-04-01` 为例：

| 当前日期 | ageText | monthAgeText | totalDays |
|---|---|---|---|
| 2026-08-03 | 0岁4个月2天 | 4个月2天 | 124 |
| 2026-08-04 | 0岁4个月3天 | 4个月3天 | 125 |

> 需求示例「4个月3天」对应当前日 08-04；算法逻辑固化为 `AgeUtil.calc()`。

### 配置与数据库连接

`.env` 不入库，提供 `.env.example`。由 `DATABASE_HOST/PORT/NAME/USERNAME/PASSWORD` 拼接 `DATABASE_URL`（密码自动 URL 编码，`@` -> `%40`），启动期 Joi 校验必填项。

### AI 扩展预留

原始事件全保留；`ai_analysis` 表以 JSON 存输入快照与结果，未来按 `(baby_id, 时段)` 取数喂模型，输出喂养规律/睡眠趋势/异常提醒。`growth_record`、`medical_record` 已建表，生长曲线与医疗记录可平滑接入。

### 多宝宝隔离

所有查询强制 `babyId`；baby 删除时业务记录级联删除（`onDelete: Cascade`）。
