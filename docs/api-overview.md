# API 接口总览

> 全局前缀：`/api/v1`　统一响应：`{ code, message, data }`　Swagger：`/docs`

## 基础模块

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/babies` | 新增宝宝 |
| PATCH | `/babies/:id` | 修改宝宝 |
| GET | `/babies` | 宝宝列表 |
| GET | `/babies/:id` | 宝宝详情（含年龄/月龄/天数） |
| POST | `/users` | 新增记录人 |
| GET | `/users` | 记录人列表 |
| GET | `/users/:id` | 记录人详情 |
| PATCH | `/users/:id` | 修改记录人 |

## 记录域（feeding / diaper / sleep / supplement / activity 结构相同）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/feedings` | 新增喂养（快捷入口） |
| GET | `/feedings` | 列表（babyId / 时间范围 / 类型） |
| GET | `/feedings/:id` | 详情 |
| PATCH | `/feedings/:id` | 修改 |
| DELETE | `/feedings/:id` | 删除 |

> diaper / supplement / activity 路径分别替换为 `/diapers` `/supplements` `/activities`。

### 身高体重记录（growth）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/growths` | 新增身高/体重记录（height 与 weight 至少一项） |
| GET | `/growths` | 列表（babyId / 时间范围 / 分页） |
| GET | `/growths/latest` | 最新一次测量（首页展示） |
| GET | `/growths/trend` | 趋势：`babyId` + `metric`(height/weight)，返回实测 + 同龄参考 P97/P3 + 区间百分比 |
| GET / PATCH / DELETE | `/growths[/:id]` | 详情/修改/删除 |

### 睡眠特殊接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/sleeps/start` | 开始睡觉 |
| PATCH | `/sleeps/:id/end` | 结束睡觉 |
| POST | `/sleeps` | 完整录入一段睡眠 |
| GET / PATCH / DELETE | `/sleeps[/:id]` | 列表/详情/修改/删除 |

## 聚合查询

| 方法 | 路径 | 参数 | 说明 |
|---|---|---|---|
| GET | `/records/daily` | babyId, date | 当天全部记录 |
| GET | `/records/range` | babyId, startDate, endDate | 范围全部记录 |

## 统计分析

> 参数：`babyId` + `range`(today/7d/30d/custom) + `startDate`/`endDate`(custom 时)

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/statistics/overview` | 综合统计 |
| GET | `/statistics/feeding` | 喂养：次数/总奶量/平均奶量/平均间隔 |
| GET | `/statistics/diaper` | 纸尿裤：总次数/尿/便便 |
| GET | `/statistics/sleep` | 睡眠：总时长/白天/夜间/平均 |
| GET | `/statistics/supplement` | 补剂：次数/类型统计 |
| GET | `/statistics/activity` | 成长事件：各类型数量 |

## 首页仪表盘

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/dashboard` | 距离上次 喂养/换纸尿裤/睡眠 |

## 时间间隔分析

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/intervals/feeding` | 最近两次喂养 + 间隔 |
| GET | `/intervals/diaper` | 最近两次更换 + 间隔 |
| GET | `/intervals/sleep` | 最近两次睡眠 + 间隔 |

## 数据可视化（ECharts）

> 参数：`babyId` + `range`(7d/30d/custom) + 日期

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/charts/feeding` | 每日喂养次数 + 总奶量 |
| GET | `/charts/sleep` | 每日总睡眠分钟 |
| GET | `/charts/diaper` | 每日更换次数 |
| GET | `/charts/supplement` | 每日补剂次数 |
