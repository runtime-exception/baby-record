# Konsta UI 迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将移动端前端从 Naive UI 渐进迁移到 Konsta UI、Headless UI 和 VueUse，并完成 PWA、主题和原生手势支持。

**Architecture:** 在 `apps/frontend/src/design-system` 内建立主题、反馈、弹层、日期和手势适配层。业务页面继续负责业务状态和 API，设计系统只负责跨页面交互与展示一致性。

**Tech Stack:** Vue 3.5、Vite 6、Tailwind CSS 4.3、Konsta 5.4、Headless UI Vue 1.7、VueUse 15、Vitest、Playwright、vite-plugin-pwa 1.3。

**Spec:** `docs/superpowers/specs/2026-09-24-konsta-ui-migration-design.md`

## Global Constraints

- 默认 UI 主题为 `ios`，用户可以在「我的」中切换 `ios` / `material`。
- 保留 `light` / `dark` / `auto`，暗色和主题选择需要持久化。
- 不修改后端、API DTO、共享业务类型或现有路由路径。
- 第一阶段完成后 `rg "naive-ui" apps/frontend` 必须无结果。
- 系统负责边缘返回，应用只实现 Sheet 拖拽、长按菜单和下拉刷新。
- 当前工作区存在无关改动，本计划不自动提交或推送任何文件。

## Review Focus

- iOS standalone 下的顶部、底部安全区不能与导航和 TabBar 重叠。
- PWA Service Worker 不得缓存 API、认证 Cookie 或家庭隐私数据。
- 老年人模式下 Konsta 固定像素字号不能导致布局裁切或操作目标小于 56px。
- 下拉刷新不能拦截普通纵向滚动，Sheet 拖拽不能误关没有移动过的弹层。
- Material 主题下所有已迁移页面仍需保持完整可操作性，长按不能成为唯一入口。

---

### Task 1: 构建基础与测试工具

**Files:**
- Modify: `apps/frontend/package.json`
- Modify: `apps/frontend/vite.config.ts`
- Modify: `pnpm-lock.yaml`
- Delete: `apps/frontend/postcss.config.js`
- Delete: `apps/frontend/tailwind.config.js`
- Modify: `apps/frontend/src/style.css`
- Create: `apps/frontend/vitest.config.ts`
- Create: `apps/frontend/src/test/setup.ts`
- Test: `apps/frontend/src/design-system/__tests__/tailwind-smoke.test.ts`

**Interfaces:**
- Produces: Tailwind 4 Vite pipeline、Vitest 命令、Konsta 样式入口。

- [ ] **Step 1: 安装精确版本依赖**

Run:

```bash
cd /Users/yangbao/.codex/worktrees/konsta-ui-migration/baby-record
pnpm --filter @baby-record/frontend add konsta@5.4.0 @headlessui/vue@1.7.23 @vueuse/core@15.0.0
pnpm --filter @baby-record/frontend add -D tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 vite-plugin-pwa@1.3.0 vitest@latest @vue/test-utils@latest happy-dom@latest @playwright/test@latest
```

Expected: `apps/frontend/package.json` 包含上述依赖，`pnpm-lock.yaml` 更新。

- [ ] **Step 2: 写失败样式测试**

Test:

```ts
import { describe, expect, it } from 'vitest';

describe('Tailwind and Konsta style pipeline', () => {
  it('loads the frontend style entry with Tailwind 4 import', async () => {
    const css = await import('../../style.css?raw');
    expect(css.default).toContain('@import "tailwindcss"');
    expect(css.default).toContain('konsta/vue/theme.css');
  });
});
```

Run:

```bash
pnpm --filter @baby-record/frontend exec vitest run src/design-system/__tests__/tailwind-smoke.test.ts
```

Expected: FAIL because `style.css` 仍使用 Tailwind 3 指令。

- [ ] **Step 3: 迁移到 Tailwind 4 CSS-first**

`style.css` 顶部：

```css
@import "tailwindcss";
@import "konsta/vue/theme.css";
```

将现有 `tailwind.config.js` 的颜色、圆角、阴影、字体、动画和 keyframes 迁移到 `@theme`。保留 `.dark` 变量和 `.senior-mode` 兼容选择器。Vite 中改用 `@tailwindcss/vite`，删除 PostCSS 插件配置。

- [ ] **Step 4: 验证样式测试和构建**

Run:

```bash
pnpm --filter @baby-record/frontend exec vitest run src/design-system/__tests__/tailwind-smoke.test.ts
pnpm --filter @baby-record/frontend build
```

Expected: 测试 PASS，构建 exit 0。

### Task 2: Theme Store 与 App Shell

**Files:**
- Modify: `apps/frontend/src/stores/theme.ts`
- Modify: `apps/frontend/src/App.vue`
- Create: `apps/frontend/src/design-system/index.ts`
- Create: `apps/frontend/src/design-system/AppProvider.vue`
- Test: `apps/frontend/src/stores/__tests__/theme.test.ts`

**Interfaces:**

```ts
type UiTheme = 'ios' | 'material';
type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeStore {
  uiTheme: UiTheme;
  mode: ThemeMode;
  seniorMode: boolean;
  setUiTheme(theme: UiTheme): void;
  setMode(mode: ThemeMode): void;
  setSeniorMode(enabled: boolean): void;
  apply(): void;
}
```

- [ ] **Step 1: 写失败测试**

Test:

```ts
it('defaults to ios and persists ui theme', () => {
  localStorage.clear();
  const store = useThemeStore(createPinia());
  expect(store.uiTheme).toBe('ios');
  store.setUiTheme('material');
  expect(localStorage.getItem('baby-record:ui-theme')).toBe('material');
});
```

Run: `pnpm --filter @baby-record/frontend exec vitest run src/stores/__tests__/theme.test.ts`

Expected: FAIL because `uiTheme` 不存在。

- [ ] **Step 2: 实现主题状态**

增加 `uiTheme`、持久化键、根节点 `ios` / `k-material` / `dark` / `data-density` 同步。

- [ ] **Step 3: 替换 App Shell**

`App.vue` 使用 `k-app` 和 `k-provider`，移除 Naive Provider。为 Feedback、Dialog Host 预留插槽。

- [ ] **Step 4: 验证**

Run:

```bash
pnpm --filter @baby-record/frontend exec vitest run src/stores/__tests__/theme.test.ts
pnpm --filter @baby-record/frontend build
```

Expected: PASS 且构建 exit 0。

### Task 3: 反馈与 Dialog

**Files:**
- Modify: `apps/frontend/src/utils/feedback.ts`
- Create: `apps/frontend/src/design-system/feedback.ts`
- Create: `apps/frontend/src/design-system/AppFeedbackHost.vue`
- Create: `apps/frontend/src/design-system/dialog.ts`
- Create: `apps/frontend/src/design-system/AppDialogHost.vue`
- Modify: `apps/frontend/src/App.vue`
- Replace usages in: `apps/frontend/src/views/**/*.vue`
- Replace usages in: `apps/frontend/src/components/**/*.vue`

**Interfaces:**

```ts
interface AppFeedbackApi {
  success(message: string): void;
  error(message: string): void;
  warning(message: string): void;
  info(message: string): void;
}

interface AppDialogApi {
  confirm(options: ConfirmOptions): Promise<boolean>;
  alert(options: AlertOptions): Promise<void>;
}
```

- [ ] **Step 1: 写反馈和 Dialog 的失败测试**

测试全局 `appFeedback.success('已保存')` 进入队列，`appDialog.confirm()` 在点击肯定按钮后 resolve `true`。

- [ ] **Step 2: 实现 Host 和组件外调度**

反馈使用 Konsta Toast；确认框使用 Konsta Dialog。Host 注册全局 dispatcher，Axios 拦截器无需组件上下文。

- [ ] **Step 3: 替换所有 `useMessage` 和 `useDialog`**

保持调用语义和中文文案不变。

- [ ] **Step 4: 验证**

Run:

```bash
pnpm --filter @baby-record/frontend exec vitest run src/design-system/__tests__/feedback.test.ts
pnpm --filter @baby-record/frontend build
```

Expected: PASS，构建 exit 0。

### Task 4: AppSheet 与现有 Modal

**Files:**
- Create: `apps/frontend/src/design-system/AppSheet.vue`
- Create: `apps/frontend/src/design-system/useSheetGesture.ts`
- Modify: `apps/frontend/src/components/EditRecordModal.vue`
- Modify: `apps/frontend/src/views/DashboardView.vue`
- Modify: `apps/frontend/src/views/FoodManagementView.vue`

**Interfaces:**

```ts
interface AppSheetProps {
  open: boolean;
  title?: string;
  dismissible?: boolean;
}

type AppSheetEmits = {
  close: [];
};
```

- [ ] **Step 1: 写失败手势测试**

覆盖位移超过容器 25% 时关闭、速度超过 `0.5px/ms` 时关闭、位移不足时回弹。

- [ ] **Step 2: 实现 AppSheet**

Konsta Sheet 负责视觉，Headless UI Dialog 负责焦点和 aria，VueUse 锁定滚动和监听指针事件。

- [ ] **Step 3: 替换 NModal**

Dashboard 三个 Modal、FoodManagement 编辑弹窗和 EditRecordModal 改为 AppSheet。

- [ ] **Step 4: 验证**

Run:

```bash
pnpm --filter @baby-record/frontend exec vitest run src/design-system/__tests__/sheet.test.ts
pnpm --filter @baby-record/frontend build
```

Expected: PASS，构建 exit 0。

### Task 5: 日期、表单和图标

**Files:**
- Create: `apps/frontend/src/design-system/AppDatePicker.vue`
- Create: `apps/frontend/src/design-system/AppDateRangePicker.vue`
- Create: `apps/frontend/src/design-system/AppSelect.vue`
- Modify: `apps/frontend/src/views/BabyFormView.vue`
- Modify: `apps/frontend/src/views/HistoryView.vue`
- Modify: `apps/frontend/src/views/StatisticsView.vue`
- Modify: `apps/frontend/src/views/ProfileView.vue`
- Modify: `apps/frontend/src/views/record/*.vue`
- Modify: `apps/frontend/src/components/TabBar.vue`
- Modify: `apps/frontend/src/components/EditRecordModal.vue`

**Interfaces:**

```ts
type SingleDateValue = number | null;
type RangeDateValue = [number, number] | null;
```

- [ ] **Step 1: 写失败日期和选择测试**

覆盖 timestamp 与 `YYYY-MM-DD` 互转、range 顺序校正、筛选选择和多选值。

- [ ] **Step 2: 实现日期和选择适配器**

单日和多日使用原生 date input，范围由两个单日字段组成；选择器支持单选、多选、过滤。

- [ ] **Step 3: 逐页替换**

替换 `NDatePicker`、`NInput`、`NInputNumber`、`NSelect`、`NSwitch` 和 `NIcon`，保持 v-model 和事件语义。

- [ ] **Step 4: 验证**

Run:

```bash
pnpm --filter @baby-record/frontend exec vitest run src/design-system/__tests__/date-picker.test.ts
pnpm --filter @baby-record/frontend build
```

Expected: PASS，构建 exit 0。

### Task 6: 长按菜单与下拉刷新

**Files:**
- Create: `apps/frontend/src/design-system/useLongPress.ts`
- Create: `apps/frontend/src/design-system/AppPullToRefresh.vue`
- Modify: `apps/frontend/src/views/HistoryView.vue`
- Modify: `apps/frontend/src/views/DashboardView.vue`
- Modify: `apps/frontend/src/views/StatisticsView.vue`
- Modify: `apps/frontend/src/views/FoodManagementView.vue`

- [ ] **Step 1: 写失败手势测试**

覆盖长按 500ms 触发、移动超过 10px 取消、下拉只在 `scrollTop === 0` 时开始、阈值达到后触发一次。

- [ ] **Step 2: 实现长按与刷新**

使用 VueUse 指针事件；长按菜单使用 Konsta Popover，桌面提供右键和普通点击替代。

- [ ] **Step 3: 接入数据页面**

刷新事件调用页面现有 `load()` 或 Store fetch，不新增并发请求策略。

- [ ] **Step 4: 验证**

Run:

```bash
pnpm --filter @baby-record/frontend exec vitest run src/design-system/__tests__/gestures.test.ts
pnpm --filter @baby-record/frontend build
```

Expected: PASS，构建 exit 0。

### Task 7: PWA、图标和安全区

**Files:**
- Modify: `apps/frontend/vite.config.ts`
- Modify: `apps/frontend/index.html`
- Create: `apps/frontend/public/icons/icon-192.png`
- Create: `apps/frontend/public/icons/icon-512.png`
- Create: `apps/frontend/public/icons/maskable-512.png`
- Modify: `apps/frontend/src/layouts/AppLayout.vue`
- Modify: `apps/frontend/src/style.css`

- [ ] **Step 1: 写失败 PWA 配置测试**

断言 manifest 启动 URL、display、图标数量和 API 不被缓存。

- [ ] **Step 2: 配置 VitePWA**

启用 `registerType: 'autoUpdate'`、standalone manifest、静态资源 precache、API NetworkOnly。

- [ ] **Step 3: 完善 Apple 与安全区**

增加 Apple meta、theme color 和 standalone 状态栏，验证 TabBar 和 Sheet 不侵入安全区。

- [ ] **Step 4: 验证**

Run:

```bash
pnpm --filter @baby-record/frontend exec vitest run src/design-system/__tests__/pwa.test.ts
pnpm --filter @baby-record/frontend build
```

Expected: PASS，构建生成 `dist/manifest.webmanifest` 和 `dist/sw.js`。

### Task 8: 移除 Naive UI 与最终验证

**Files:**
- Modify: `apps/frontend/package.json`
- Modify: `apps/frontend/vite.config.ts`
- Modify: any remaining `apps/frontend/src/**/*`
- Create: `apps/frontend/tests/e2e/smoke.spec.ts`

- [ ] **Step 1: 删除剩余 Naive UI**

Run:

```bash
rg -n "naive-ui|NConfigProvider|NMessageProvider|NDialogProvider|NModal|NDatePicker|NInput|NSelect|NSwitch|NIcon" apps/frontend
```

Expected: 先列出待替换项，处理后无结果。

- [ ] **Step 2: 移除依赖和分包**

从 `package.json` 删除 `naive-ui`，从 Vite 配置删除 `naiveui` manual chunk。

- [ ] **Step 3: 跑完整自动化验证**

Run:

```bash
pnpm --filter @baby-record/frontend test
pnpm --filter @baby-record/frontend build
pnpm lint
git diff --check
```

Expected: 所有命令 exit 0，测试 0 failures。

- [ ] **Step 4: Playwright 冒烟**

Run:

```bash
pnpm --filter @baby-record/frontend exec playwright test
```

Expected: 登录后主要路由可访问，主题持久化，Sheet 可开关，无横向溢出。

- [ ] **Step 5: 人工运行验收**

在 iPhone Safari 和添加到主屏幕的 standalone 模式验证安全区、状态栏、TabBar、Sheet 拖拽、长按菜单、下拉刷新和系统返回。

## Self-Review

- Spec coverage: 构建、主题、反馈、Sheet、表单、手势、PWA、清理和验收均有对应任务。
- Placeholder scan: 无 TBD、TODO 或未定义接口。
- Type consistency: Theme、Feedback、Dialog、Sheet、Date 和手势接口在 Spec 与任务中名称一致。
- Review Focus: 安全区、隐私缓存、老年人模式、滚动冲突和 Material 可操作性均在实现和验证步骤中有覆盖。
