# Swagger 使用说明

## 访问地址

本地启动后：

- API 根路径：`http://localhost:3000/api/v1`
- Swagger 文档：`http://localhost:3000/docs`

> Swagger 路径由环境变量 `SWAGGER_PATH` 控制，默认 `docs`，不受 API 全局前缀影响。

## 统一响应格式

所有接口返回统一结构（由 `TransformInterceptor` 包装）：

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

异常时（由 `AllExceptionsFilter` 转换）：

```json
{
  "code": 40001,
  "message": "参数校验失败",
  "data": null,
  "details": ["宝宝 ID 必须是 16 位十六进制字符"],
  "timestamp": "2026-08-03T10:00:00.000Z",
  "path": "/api/v1/feedings"
}
```

## 错误码

| code | 含义 |
|---|---|
| 0 | 成功 |
| 10001 | 服务器内部错误 |
| 10002 | 配置错误 |
| 20001/20002 | 未授权 / 请先选择记录人身份 |
| 30001/30002/30003 | 宝宝不存在 / 宝宝已存在 / 记录人不存在 |
| 40001/40002 | 参数校验失败 / 缺少必要参数 |
| 50001 | 记录不存在 |
| 50002/50003/50004 | 睡眠已结束 / 睡眠不存在 / 已有进行中睡眠 |

## 首次使用流程

1. **初始化数据**：执行 `npm run prisma:migrate` + `npm run prisma:seed`（自动创建 6 个记录人身份与示例宝宝）。
2. **选择记录人**：`GET /users` 获取身份列表，前端缓存选中的 `creatorId`。
3. **确认宝宝**：`GET /babies` 获取宝宝，前端缓存 `babyId`。
4. **日常记录**：通过各记录域接口新增；每次新增需带 `babyId` 与 `creatorId`。

## 快捷操作映射

| 首页快捷入口 | 接口 |
|---|---|
| 快速喂养 | `POST /feedings`（仅需 babyId/feedingTime/feedingType/creatorId） |
| 快速换纸尿裤 | `POST /diapers` |
| 睡觉-开始 | `POST /sleeps/start` |
| 睡觉-结束 | `PATCH /sleeps/:id/end` |
| 补剂 / 玩耍 / 抬头 / 洗澡 / 成长事件 | `POST /supplements` 或 `POST /activities`（eventType 区分） |

## curl 示例

```bash
# 1. 新增喂养
curl -X POST http://localhost:3000/api/v1/feedings \
  -H "Content-Type: application/json" \
  -d '{
    "babyId": "a1b2c3d4e5f60718",
    "feedingType": "FORMULA",
    "feedingTime": "2026-08-03T10:30:00.000Z",
    "amountMl": 120,
    "durationMinutes": 15,
    "creatorId": 2
  }'

# 2. 开始睡觉
curl -X POST http://localhost:3000/api/v1/sleeps/start \
  -H "Content-Type: application/json" \
  -d '{ "babyId": "a1b2c3d4e5f60718", "sleepType": "NIGHT", "creatorId": 2 }'

# 3. 结束睡觉（用上一步返回的 id）
curl -X PATCH http://localhost:3000/api/v1/sleeps/1/end \
  -H "Content-Type: application/json" \
  -d '{ "endTime": "2026-08-04T06:00:00.000Z" }'

# 4. 首页仪表盘
curl http://localhost:3000/api/v1/dashboard?babyId=a1b2c3d4e5f60718

# 5. 查询某天全部记录
curl "http://localhost:3000/api/v1/records/daily?babyId=a1b2c3d4e5f60718&date=2026-08-03"

# 6. 最近 7 天综合统计
curl "http://localhost:3000/api/v1/statistics/overview?babyId=a1b2c3d4e5f60718&range=7d"

# 7. 喂养趋势图（最近 7 天）
curl "http://localhost:3000/api/v1/charts/feeding?babyId=a1b2c3d4e5f60718&range=7d"

# 8. 时间间隔分析
curl http://localhost:3000/api/v1/intervals/feeding?babyId=a1b2c3d4e5f60718
```

## 枚举取值速查

- `gender`: `MALE` / `FEMALE`
- `role`: `DAD` / `MOM` / `GRANDPA_P` / `GRANDMA_P` / `GRANDMA_M` / `GRANDPA_M`
- `feedingType`: `BREAST_MILK` / `FORMULA` / `MIXED`
- `type`(diaper): `PEE` / `POOP` / `BOTH`
- `sleepType`: `DAYTIME` / `NIGHT`
