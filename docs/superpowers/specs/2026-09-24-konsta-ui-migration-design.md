# Konsta UI 分阶段迁移设计

## 目标

第一阶段将移动端家庭 App 从 Naive UI 渐进迁移到 Konsta UI 5.4.0、Headless UI 和 VueUse，并在 `apps/frontend/src/design-system` 内建立应用设计系统。

迁移必须保持现有业务流程、API 调用、路由、Pinia Store 和页面职责基本不变。第一阶段完成后，移动端业务代码不再依赖 Naive UI。

## 非目标

- 不新增后台管理界面。
- 不把设计系统抽成独立 workspace 包。
- 不修改 NestJS、数据库、API DTO、共享业务类型或现有路由路径。
- 不在第一阶段接管 iOS/Android 系统边缘返回手势。

## 当前状态

- 前端为 Vue 3.5、Vite 6、Pinia、Vue Router、Tailwind CSS 3、Naive UI 2.40。
- Naive UI 分布在 16 个前端文件中。
- 主要耦合点是全局 Provider、`useMessage`、`useDialog`、`NModal`、`NDatePicker`、`NInput`、`NInputNumber`、`NSelect`、`NSwitch` 和 `NIcon`。
- 页面已有较多 Tailwind iOS 风格，但覆盖层、表单和反馈仍保留 Naive UI 的统一桌面组件手感。
- 当前没有前端自动化测试；`pnpm --filter @baby-record/frontend build` 是现有最低构建门槛。
- `index.html` 已包含 `viewport-fit=cover` 和基础 Apple meta，但尚未提供 manifest、Service Worker 和 PWA 图标。

## 架构决策

### 渐进适配层

采用适配层渐进迁移，而不是逐页复制或一次性重写：

```text
业务页面
  ↓
design-system
  ├── 主题与 Provider
  ├── 反馈、Dialog、Sheet
  ├── 日期、选择等复杂控件
  └── 手势与下拉刷新
  ↓
Konsta / Headless UI / VueUse
```

简单控件允许业务页面直接导入 Konsta。只有全局状态、无障碍、弹层、手势和跨页面一致行为必须经过设计系统。

### 主题策略

- 默认 UI 主题为 `ios`。
- 用户可在「我的」中切换 `ios` / `material`。
- 保留 `light` / `dark` / `auto` 明暗模式设置。
- `uiTheme` 持久化到 `baby-record:ui-theme`。
- 现有 `baby-record:theme` 继续保存明暗模式。
- Konsta 根组件接收 `theme` 和 `dark`，并与 `document.documentElement` 的 `.dark`、`.ios` / `.k-material` 状态同步。

### 老年人模式

老年人模式改为 `data-density="senior"` 驱动的设计系统覆盖层：

- 放大字体和主要控件最小高度。
- 不通过只修改根 `font-size` 来完成任务，因为 Konsta 大量尺寸使用像素类。
- 对 Konsta Button、ListInput、ListItem、Navbar、Tabbar、Dialog、Sheet、Segmented 等核心组件提供统一 CSS 覆盖。
- 验收重点是文字不裁切、触控目标不小于 56px、底部安全区不重叠。

### PWA 与安全区

- 使用 `vite-plugin-pwa` 生成 manifest 和 Service Worker。
- `display` 为 `standalone`，启动地址为 `/`。
- 提供 192、512 和 maskable 图标。
- 只缓存应用壳和静态资源，不缓存 API 响应、认证 Cookie 或家庭隐私数据。
- 使用 Konsta 安全区变量和项目现有 safe-area 工具类处理顶部、底部和左右区域。

### 手势

- 系统负责边缘返回，应用不接管历史返回。
- `AppSheet` 支持拖拽关闭。
- History 条目支持长按上下文菜单。
- 数据页面支持下拉刷新。
- 手势必须保留可点击或可聚焦的桌面替代入口。

## 公共接口

### Theme Store

```ts
type UiTheme = 'ios' | 'material';
type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeState {
  uiTheme: UiTheme;
  mode: ThemeMode;
  seniorMode: boolean;
  isDark: ComputedRef<boolean>;
  setUiTheme(theme: UiTheme): void;
  setMode(mode: ThemeMode): void;
  setSeniorMode(enabled: boolean): void;
  apply(): void;
}
```

### Feedback

```ts
interface AppFeedbackApi {
  success(message: string): void;
  error(message: string): void;
  warning(message: string): void;
  info(message: string): void;
}
```

反馈 Host 挂在应用根节点，继续支持 Axios 拦截器在组件上下文外调用。

### Dialog

```ts
interface ConfirmOptions {
  title: string;
  content: string;
  positiveText?: string;
  negativeText?: string;
}

interface AppDialogApi {
  confirm(options: ConfirmOptions): Promise<boolean>;
  alert(options: Omit<ConfirmOptions, 'negativeText'>): Promise<void>;
}
```

### Sheet

```ts
interface AppSheetProps {
  open: boolean;
  title?: string;
  dismissible?: boolean;
}

// emits
type AppSheetEmits = {
  close: [];
};
```

### 日期

现有页面使用 timestamp 数字或 range 数组。适配器保留该模型，避免改动业务状态：

```ts
type SingleDateValue = number | null;
type RangeDateValue = [number, number] | null;
```

### 手势与刷新

```ts
interface LongPressOptions {
  duration?: number;
  moveTolerance?: number;
}

interface AppPullToRefreshProps {
  disabled?: boolean;
  threshold?: number;
}

// emits
type AppPullToRefreshEmits = {
  refresh: [];
};
```

## 迁移顺序

1. 文档与基线构建。
2. Tailwind 4、Konsta、Headless UI、VueUse、PWA 依赖和配置。
3. Theme Store、App Shell、反馈和 Dialog Host。
4. Modal、Dialog、Toast 和 Sheet。
5. 日期、输入、选择、开关和图标。
6. Sheet 拖拽、长按菜单、下拉刷新。
7. PWA、图标、安全区和安装态布局。
8. 移除 Naive UI 并完成回归验证。

## 风险与缓解

- Tailwind 3 到 4 会改变配置入口和默认监听行为：先单独完成升级并构建，再迁移组件。
- Konsta 没有日期选择器：使用原生 `date` / `datetime-local` 输入和现有 WheelPicker，保留 timestamp 接口。
- Konsta Sheet 只提供视觉容器：拖拽由 VueUse 指针事件补充，Headless UI 负责焦点、ESC 和 aria 语义。
- PWA Service Worker 可能错误缓存私有数据：明确限制为静态资源，API 使用 NetworkOnly。
- 手势在桌面浏览器与 iOS 表现不同：触摸设备启用真实手势，桌面保留按钮和右键替代。
- PWA 图标目前不存在：使用与现有蓝色宝宝头像一致的确定性品牌图标。

## 验收标准

- `rg "naive-ui" apps/frontend` 无结果。
- `pnpm --filter @baby-record/frontend build` 通过。
- 前端单元测试通过。
- 主要路由可访问，业务流程和 API 调用不回归。
- 默认 iOS，Material 可手动切换，刷新后保持选择。
- 暗色可用，`auto` 跟随系统。
- 老年人模式无文字裁切和触控目标过小。
- iPhone Safari 和 standalone PWA 安全区、TabBar、Sheet、下拉刷新和长按菜单正常。
- 桌面浏览器保留鼠标和键盘替代操作。
