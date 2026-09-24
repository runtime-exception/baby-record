import { appFeedback } from '@/design-system/feedback';

// 全局反馈调度器，供 API 层与组件直接调用，不依赖组件树上下文。
export const $message = appFeedback;
