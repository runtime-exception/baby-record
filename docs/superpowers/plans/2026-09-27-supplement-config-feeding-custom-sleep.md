# 补剂配置、喂养联动与自定义睡眠实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增加家庭共享补剂配置，让喂养和其他记录复用配置创建补剂记录，并支持按起止时间补记自动分类的完整睡眠。

**Architecture:** 新增独立 `SupplementConfig` 字典，实际 `Supplement` 继续保存名称、剂量和单位快照。前端通过配置 API 驱动管理页、喂养多选和其他记录单选；喂养保存后逐条调用现有补剂记录接口。睡眠类型和时长规则集中在后端纯函数中，自定义睡眠只提交起止时间，由后端自动分类并校验区间。

**Tech Stack:** Prisma/PostgreSQL、NestJS、Vue 3、TypeScript、Vitest、Node `assert`、Playwright、pnpm、Docker Compose

**Spec:** `docs/superpowers/specs/2026-09-27-supplement-config-feeding-custom-sleep-design.md`

## Global Constraints

- `Supplement` 历史记录保存快照，不强关联 `SupplementConfig`。
- 喂养类型、辅食关联、快捷睡眠和进行中睡眠现有行为保持不变。
- 自定义睡眠按开始时间分类：`06:00–18:00` 为 `DAYTIME`，`18:01–次日 05:59` 为 `NIGHT`。
- 不新增第三方依赖。
- 所有 pnpm 命令使用 `CI=true`。
- 仅暂存本计划涉及的明确文件；不得包含 `.env.example`、`docker-compose.yml`、`.zcode/`、临时计划或 SQL 文件等既有无关改动。

## Review Focus

- 补剂配置名称只包含空白或与现有名称重复时必须拒绝；由 Task 1 服务测试覆盖。
- 停用补剂不得出现在新记录选择器中，但历史补剂快照不得变化；由 Task 1 服务测试和 Task 8 API/UI 检查覆盖。
- 喂养成功而部分补剂失败时不得重复提交喂养；由 Task 5 结果归纳测试和 Task 8 UI 检查覆盖。
- 自定义睡眠跨日可保存，但结束时间等于/早于开始时间或晚于当前时间必须拒绝；由 Task 6 后端测试和 Task 7 前端测试覆盖。
- `05:59`、`06:00`、`18:00`、`18:01` 四个边界必须稳定分类；由 Task 6 后端测试覆盖。

---

### Task 1: 补剂配置数据库与后端 CRUD

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/20260927000000_add_supplement_config/migration.sql`
- Create: `apps/backend/src/modules/supplement-config/dto/create-supplement-config.dto.ts`
- Create: `apps/backend/src/modules/supplement-config/dto/update-supplement-config.dto.ts`
- Create: `apps/backend/src/modules/supplement-config/supplement-config.service.ts`
- Create: `apps/backend/src/modules/supplement-config/supplement-config.controller.ts`
- Create: `apps/backend/src/modules/supplement-config/supplement-config.module.ts`
- Modify: `apps/backend/src/app.module.ts`
- Create: `apps/backend/test/supplement-config.test.ts`
- Modify: `apps/backend/package.json`

**Interfaces:**
- Produces: `SupplementConfigService.findAll(includeInactive?: boolean)`, `create(dto)`, `update(id, dto)`, `remove(id)`；REST 路径 `/supplement-configs`。
- Produces model fields: `id: number`、`name: string`、`emoji: string | null`、`defaultAmount: string | null`、`defaultUnit: string | null`、`isActive: boolean`、`createdTime`、`updatedTime`。

- [ ] **Step 1: 写失败的服务测试**

在 `test/supplement-config.test.ts` 用最小内存 Prisma stub 实例化真实 `SupplementConfigService`，覆盖：创建时 trim、重复名称抛业务异常、默认查询仅取启用项、`remove()` 只把 `isActive` 更新为 `false`。在 `package.json` 增加 `test:supplement-config` 脚本。

- [ ] **Step 2: 运行测试并确认因模块不存在而失败**

Run: `CI=true pnpm --filter @baby-record/backend test:supplement-config`

Expected: FAIL，原因是 `supplement-config.service` 尚不存在。

- [ ] **Step 3: 实现 Prisma 模型与迁移**

在 schema 中定义 `SupplementConfig`；迁移创建 `supplement_config` 表、唯一名称约束，并插入三条初始配置：`维生素D / ☀️ / 1 / 滴`、`DHA / 🐟 / 1 / 粒`、`钙 / 🦴 / 1 / 粒`。之后均可在管理页修改。

- [ ] **Step 4: 实现最小 CRUD 模块**

DTO 约束为：名称必填且最多 30 字符；emoji 可空且最多 8 字符；默认剂量可空且最多 30 字符；默认单位可空且最多 10 字符。Service 沿用 `FoodService` 的 trim、重复检查、软停用和时间序列化模式；Controller 支持 `GET ?includeInactive=true`、`POST`、`PATCH /:id`、`DELETE /:id`；在 `AppModule` 注册模块。

- [ ] **Step 5: 生成 Prisma Client 并运行测试**

Run: `CI=true pnpm --filter @baby-record/backend exec prisma validate --schema=prisma/schema.prisma`

Run: `CI=true pnpm --filter @baby-record/backend exec prisma generate --schema=prisma/schema.prisma`

Run: `CI=true pnpm --filter @baby-record/backend test:supplement-config`

Expected: schema valid，client 生成成功，测试 PASS。

- [ ] **Step 6: 提交 Task 1**

仅暂存本任务列出的文件并执行 `git diff --cached --check` 与敏感信息扫描。

Commit: `feat: add supplement configuration API`

---

### Task 2: 共享类型、前端配置 API 与补剂选择基础组件

**Files:**
- Modify: `packages/shared/src/index.ts`
- Create: `apps/frontend/src/api/supplement-config.ts`
- Create: `apps/frontend/src/design-system/supplement-config.ts`
- Create: `apps/frontend/src/design-system/__tests__/supplement-config.test.ts`
- Create: `apps/frontend/src/components/form/SupplementEmojiPicker.vue`
- Create: `apps/frontend/src/components/form/SupplementPickerGrid.vue`

**Interfaces:**
- Consumes: Task 1 的 `/supplement-configs` 字段与 REST 语义。
- Produces: `SupplementConfigVo`、`supplementConfigApi`、`resolveSupplementEmoji(name, emoji)`、`applySupplementDefaults(config)`、支持单选/多选的 `SupplementPickerGrid`。

- [ ] **Step 1: 写失败的补剂配置工具测试**

测试显式 emoji 优先、空 emoji 回退 `💊`，以及配置映射为 `{ name, amount, unit }` 快照时保留空值和字符串剂量。

- [ ] **Step 2: 运行测试确认 RED**

Run: `CI=true pnpm --filter @baby-record/frontend test -- src/design-system/__tests__/supplement-config.test.ts`

Expected: FAIL，原因是 `supplement-config.ts` 尚不存在。

- [ ] **Step 3: 实现共享类型、API 和纯函数**

`SupplementConfigVo` 与后端字段一致；API 提供 `list(includeInactive?)`、`create`、`update`、`remove`；纯函数只承担 emoji 回退和默认值快照映射。

- [ ] **Step 4: 实现两个薄 UI 组件**

`SupplementEmojiPicker` 使用固定常用补剂图标并允许恢复默认 `💊`。`SupplementPickerGrid` 固定使用 `modelValue: number[]` 并发出 `update:modelValue: number[]`；`multiple=true` 时切换数组成员，`multiple=false` 时选择一项发出 `[id]`、再次点击发出 `[]`。双列卡片展示 `emoji + 名称`。不要抽象或改写现有 `FoodPickerGrid`。

- [ ] **Step 5: 运行测试和前端类型检查**

Run: `CI=true pnpm --filter @baby-record/frontend test -- src/design-system/__tests__/supplement-config.test.ts`

Run: `CI=true pnpm build:frontend`

Expected: 测试 PASS，构建通过。

- [ ] **Step 6: 提交 Task 2**

Commit: `feat: add supplement configuration client components`

---

### Task 3: “我的 → 补剂管理”页面

**Files:**
- Create: `apps/frontend/src/views/SupplementManagementView.vue`
- Modify: `apps/frontend/src/views/ProfileView.vue`
- Modify: `apps/frontend/src/router/index.ts`
- Create: `apps/frontend/src/design-system/__tests__/supplement-management.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `supplementConfigApi`、`SupplementEmojiPicker` 和 `SupplementConfigVo`。
- Produces: `/profile/supplements` 页面及“我的”页面入口。

- [ ] **Step 1: 写失败的管理页测试**

挂载管理页并在 API 边界使用可控 stub，断言：新增提交名称/emoji/默认剂量/单位；编辑回填并保存四项；停用调用 `remove`；恢复调用 `update({ isActive: true })`。

- [ ] **Step 2: 运行测试确认 RED**

Run: `CI=true pnpm --filter @baby-record/frontend test -- src/design-system/__tests__/supplement-management.test.ts`

Expected: FAIL，原因是页面尚不存在。

- [ ] **Step 3: 实现管理页**

参照 `FoodManagementView.vue` 的加载、搜索、底部编辑面板和软停用交互，增加默认剂量/单位输入；页面标题为“补剂管理”，副标题为“家庭内所有宝宝共享”。

- [ ] **Step 4: 注册入口和路由**

在 Profile 的辅食管理附近增加补剂管理卡片；注册 `/profile/supplements`，保持 `meta.tab = 'profile'`。

- [ ] **Step 5: 运行测试和构建**

Run: `CI=true pnpm --filter @baby-record/frontend test -- src/design-system/__tests__/supplement-management.test.ts`

Run: `CI=true pnpm build:frontend`

Expected: PASS。

- [ ] **Step 6: 提交 Task 3**

Commit: `feat: add supplement management page`

---

### Task 4: “其他记录 → 补剂”复用配置

**Files:**
- Modify: `apps/frontend/src/views/record/ActivityRecordView.vue`
- Create: `apps/frontend/src/design-system/__tests__/supplement-record-form.test.ts`

**Interfaces:**
- Consumes: Task 2 的启用配置查询、单选 `SupplementPickerGrid` 和 `applySupplementDefaults`。
- Produces: 从配置选择补剂并允许覆盖本次剂量/单位的记录流程。

- [ ] **Step 1: 写失败的表单行为测试**

挂载补剂记录状态，断言选择配置后带出默认剂量和单位；用户覆盖本次值后，提交给 `supplementApi.create` 的是覆盖值；无启用配置时保存按钮不可创建记录并显示管理提示。

- [ ] **Step 2: 运行测试确认 RED**

Run: `CI=true pnpm --filter @baby-record/frontend test -- src/design-system/__tests__/supplement-record-form.test.ts`

Expected: FAIL，旧页面仍使用硬编码名称分段选择。

- [ ] **Step 3: 实现配置驱动表单**

页面挂载时加载启用配置；移除硬编码 `['维生素D', 'DHA', '钙', '其他']`。选择配置后填入字符串剂量和单位，使用普通输入允许本次修改；保存继续调用 `/supplements`，不回写配置。

- [ ] **Step 4: 运行测试和构建**

Run: `CI=true pnpm --filter @baby-record/frontend test -- src/design-system/__tests__/supplement-record-form.test.ts`

Run: `CI=true pnpm build:frontend`

Expected: PASS。

- [ ] **Step 5: 提交 Task 4**

Commit: `feat: use supplement presets for supplement records`

---

### Task 5: 喂养页面联动创建补剂记录

**Files:**
- Modify: `apps/frontend/src/views/record/FeedingRecordView.vue`
- Create: `apps/frontend/src/design-system/feeding-supplements.ts`
- Create: `apps/frontend/src/design-system/__tests__/feeding-supplements.test.ts`

**Interfaces:**
- Consumes: Task 2 的启用配置、多选 `SupplementPickerGrid` 和现有 `feedingApi`/`supplementApi`。
- Produces: `buildFeedingSupplementPayloads(configs, selectedIds, context)` 与 `summarizeSupplementResults(results)`，供页面构造快照并处理部分失败。

- [ ] **Step 1: 写失败的联动测试**

断言两个勾选配置生成两份补剂 payload，均使用同一个 `babyId`、`creatorId`、喂养时间和各自默认快照；`Promise.allSettled` 结果中只要存在 rejected，就归纳为“部分补剂记录失败”，但不要求重新创建喂养。

- [ ] **Step 2: 运行测试确认 RED**

Run: `CI=true pnpm --filter @baby-record/frontend test -- src/design-system/__tests__/feeding-supplements.test.ts`

Expected: FAIL，辅助函数尚不存在。

- [ ] **Step 3: 实现纯函数与页面 UI**

全部喂养类型下展示默认关闭的“补剂添加”开关；开启后显示双列多选配置。保存时冻结本次 `feedingTime`，先等待 `feedingApi.create` 成功，再用 `Promise.allSettled` 调用每个 `supplementApi.create`。

- [ ] **Step 4: 实现部分失败反馈**

喂养失败时维持现有错误流程；喂养成功且补剂全部成功时提示保存成功；部分补剂失败时提示“喂养已保存，部分补剂记录失败”，刷新首页数据并只执行一次页面跳转。提交期间禁用按钮。

- [ ] **Step 5: 运行测试和构建**

Run: `CI=true pnpm --filter @baby-record/frontend test -- src/design-system/__tests__/feeding-supplements.test.ts`

Run: `CI=true pnpm build:frontend`

Expected: PASS。

- [ ] **Step 6: 提交 Task 5**

Commit: `feat: record supplements with feedings`

---

### Task 6: 后端睡眠分类与有效区间规则

**Files:**
- Create: `apps/backend/src/modules/sleep/sleep-rules.ts`
- Create: `apps/backend/test/sleep-rules.test.ts`
- Modify: `apps/backend/src/modules/sleep/sleep.service.ts`
- Modify: `apps/backend/src/modules/sleep/dto/create-sleep.dto.ts`
- Modify: `apps/backend/package.json`
- Modify: `apps/frontend/src/api/sleep.ts`

**Interfaces:**
- Produces: `resolveSleepType(startTime: Date): SleepType`；`calculateSleepDurationMinutes(startTime: Date, endTime: Date): number`。
- Changes: 完整创建睡眠时 `sleepType` 可选；缺省时后端按 `startTime` 自动判断。

- [ ] **Step 1: 写失败的睡眠规则测试**

用 Node `assert` 覆盖本地时间 `05:59 → NIGHT`、`06:00 → DAYTIME`、`18:00 → DAYTIME`、`18:01 → NIGHT`；跨日正区间计算分钟数；结束等于或早于开始时抛业务异常。

- [ ] **Step 2: 运行测试确认 RED**

Run: `CI=true pnpm --filter @baby-record/backend test:sleep-rules`

Expected: FAIL，脚本或 `sleep-rules.ts` 尚不存在。

- [ ] **Step 3: 实现集中规则并接入服务**

`create()` 在 `sleepType` 未传时调用 `resolveSleepType(startTime)`；`create()`、`end()` 统一调用 `calculateSleepDurationMinutes`。`update()` 在开始或结束时间任一项变化且最终结束时间存在时，用最终起止时间重新计算；删除 `Math.max(0, ...)` 对无效区间的静默吞并。

- [ ] **Step 4: 放宽完整创建 payload**

将 `CreateSleepDto.sleepType` 和前端 `CreateSleepPayload.sleepType` 改为可选；进行中睡眠和快捷睡眠仍可显式传原有类型，不改变现有行为。

- [ ] **Step 5: 运行测试和后端构建**

Run: `CI=true pnpm --filter @baby-record/backend test:sleep-rules`

Run: `CI=true pnpm build:backend`

Expected: PASS。

- [ ] **Step 6: 提交 Task 6**

Commit: `feat: validate and classify completed sleep records`

---

### Task 7: 睡眠页面自定义起止时间

**Files:**
- Create: `apps/frontend/src/design-system/sleep-values.ts`
- Create: `apps/frontend/src/design-system/__tests__/sleep-values.test.ts`
- Modify: `apps/frontend/src/views/record/SleepRecordView.vue`

**Interfaces:**
- Consumes: Task 6 支持省略 `sleepType` 的完整睡眠接口。
- Produces: `validateCompletedSleepRange(startMs, endMs, nowMs)` 与自定义睡眠底部表单。

- [ ] **Step 1: 写失败的前端时间校验测试**

覆盖有效跨日区间、结束等于开始、结束早于开始、结束晚于 `nowMs`；前两类无效区间返回“结束时间必须晚于开始时间”，未来结束时间返回“结束时间不能晚于当前时间”。

- [ ] **Step 2: 运行测试确认 RED**

Run: `CI=true pnpm --filter @baby-record/frontend test -- src/design-system/__tests__/sleep-values.test.ts`

Expected: FAIL，校验函数尚不存在。

- [ ] **Step 3: 实现自定义睡眠面板**

在未进行睡眠时新增“自定义睡眠”入口。打开 `AppSheet` 时将结束时间设为当前时间、开始时间设为一小时前；使用两个 `DateTimePicker`，不展示睡眠类型选择。

- [ ] **Step 4: 实现保存流程**

先调用 `validateCompletedSleepRange`；通过后调用 `sleepApi.create({ babyId, creatorId, startTime, endTime })`，由后端分类并计算时长。请求期间禁用保存按钮，成功后提示并返回首页。

- [ ] **Step 5: 运行测试、全量前端测试和构建**

Run: `CI=true pnpm --filter @baby-record/frontend test -- src/design-system/__tests__/sleep-values.test.ts`

Run: `CI=true pnpm --filter @baby-record/frontend test`

Run: `CI=true pnpm build:frontend`

Expected: 全部 PASS。

- [ ] **Step 6: 提交 Task 7**

Commit: `feat: add custom completed sleep entry`

---

### Task 8: 全链路验证、容器迁移与移动端验收

**Files:**
- Modify only if a verification failure exposes an in-scope defect; return to the owning task's RED/GREEN cycle before editing.

**Interfaces:**
- Consumes: Tasks 1–7 的全部接口和页面。
- Produces: 可复现的测试、构建、迁移、API、UI 验证证据。

- [ ] **Step 1: 运行静态和自动化验证**

Run:

```bash
CI=true pnpm --filter @baby-record/backend exec prisma validate --schema=prisma/schema.prisma
CI=true pnpm --filter @baby-record/backend exec prisma generate --schema=prisma/schema.prisma
CI=true pnpm --filter @baby-record/backend test:allergy-score
CI=true pnpm --filter @baby-record/backend test:supplement-config
CI=true pnpm --filter @baby-record/backend test:sleep-rules
CI=true pnpm --filter @baby-record/frontend test
CI=true pnpm build:backend
CI=true pnpm build:frontend
git diff --check
```

Expected: 全部退出码为 0；只允许记录已知的前端 chunk-size 警告。

- [ ] **Step 2: 构建并启动本地容器**

Run: `docker compose up -d --build`

Run: `docker logs baby-record-app 2>&1 | rg -i "migrat|error|supplement_config"`

Expected: 新迁移成功应用，无启动错误。

- [ ] **Step 3: 验证配置 API**

在已认证会话中验证：默认三项存在；新增测试配置；重复名称被拒绝；停用后默认列表不可见、`includeInactive=true` 仍可见；恢复成功。测试数据在验收结束后停用或删除。

- [ ] **Step 4: Playwright 移动端验证四条用户路径**

使用 `{ width: 430, height: 932, deviceScaleFactor: 2, isMobile: true, hasTouch: true }`：

1. “我的 → 补剂管理”新增、编辑 emoji/默认剂量/单位、停用和恢复。
2. 喂养开启“补剂添加”，双列多选两项，保存后历史页出现一条喂养和两条补剂记录，时间一致。
3. “其他记录 → 补剂”选择配置，默认值自动带出且本次可覆盖。
4. 自定义睡眠选择跨日有效区间并保存；无效区间被阻止；历史页时长和自动分类正确。

- [ ] **Step 5: 检查提交边界与敏感信息**

Run: `git status --short --branch`

Run: `git diff --cached --check`

Run staged-addition secret scan；确认 `.env.example`、`docker-compose.yml`、`.zcode/`、`findings.md`、`progress.md`、`task_plan*.md` 和 `短信模板更新_0819.sql` 未被纳入。

- [ ] **Step 6: 最终提交（仅在验证修复产生未提交文件时）**

Commit: `fix: complete supplement and custom sleep verification`

- [ ] **Step 7: 报告结果**

分别报告 Prisma/迁移、后端测试、前端测试、前后端构建、容器运行、API、移动端 UI 和未触碰文件。除非用户另行明确授权，不执行 push。
