import { onBeforeUnmount } from 'vue';
import { exceedsLongPressTolerance } from './gesture-values';

export interface LongPressOptions {
  duration?: number;
  moveTolerance?: number;
}

export function useLongPress<T>(
  callback: (payload: T) => void,
  options: LongPressOptions = {},
) {
  const duration = options.duration ?? 500;
  const moveTolerance = options.moveTolerance ?? 10;
  let timer: number | null = null;
  let payload: T | null = null;
  let startX = 0;
  let startY = 0;

  function cancel() {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
    payload = null;
  }

  function start(nextPayload: T, event: PointerEvent) {
    cancel();
    payload = nextPayload;
    startX = event.clientX;
    startY = event.clientY;
    timer = window.setTimeout(() => {
      if (payload !== null) callback(payload);
      timer = null;
      payload = null;
    }, duration);
  }

  function move(event: PointerEvent) {
    if (timer === null) return;
    if (
      exceedsLongPressTolerance(
        startX,
        startY,
        event.clientX,
        event.clientY,
        moveTolerance,
      )
    ) {
      cancel();
    }
  }

  function end() {
    cancel();
  }

  onBeforeUnmount(cancel);

  return { start, move, end, cancel };
}
