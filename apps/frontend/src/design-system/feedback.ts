export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

export interface FeedbackMessage {
  id: number;
  type: FeedbackType;
  message: string;
  duration: number;
}

type FeedbackListener = (item: FeedbackMessage) => void;

const listeners = new Set<FeedbackListener>();
let nextId = 1;

function emit(type: FeedbackType, message: string, duration = 2400) {
  const item = { id: nextId++, type, message, duration };
  listeners.forEach((listener) => listener(item));
}

export const appFeedback = {
  success: (message: string) => emit('success', message),
  error: (message: string) => emit('error', message, 3200),
  warning: (message: string) => emit('warning', message, 2800),
  info: (message: string) => emit('info', message),
};

export function subscribeFeedback(listener: FeedbackListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppFeedback() {
  return appFeedback;
}
