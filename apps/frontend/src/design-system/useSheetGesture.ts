import { computed, ref, type Ref } from 'vue';
import { useEventListener } from '@vueuse/core';

export function shouldDismissSheet(distance: number, velocity: number, height: number) {
  return distance > height * 0.25 || (distance > 16 && velocity > 0.5);
}

export function useSheetGesture(
  panel: Ref<HTMLElement | null>,
  onClose: () => void,
  enabled: Ref<boolean>,
) {
  const dragY = ref(0);
  const dragging = ref(false);
  let startY = 0;
  let startedAt = 0;

  function onPointerDown(event: PointerEvent) {
    if (!enabled.value || event.button !== 0) return;
    dragging.value = true;
    startY = event.clientY;
    startedAt = performance.now();
    dragY.value = 0;
  }

  useEventListener(window, 'pointermove', (event: PointerEvent) => {
    if (!dragging.value) return;
    dragY.value = Math.max(0, event.clientY - startY);
  });

  useEventListener(window, 'pointerup', () => {
    if (!dragging.value) return;
    dragging.value = false;
    const elapsed = Math.max(1, performance.now() - startedAt);
    const velocity = dragY.value / elapsed;
    const height = panel.value?.getBoundingClientRect().height || 1;

    if (shouldDismissSheet(dragY.value, velocity, height)) {
      dragY.value = 0;
      onClose();
      return;
    }
    dragY.value = 0;
  });

  return {
    dragY,
    dragging: computed(() => dragging.value),
    onPointerDown,
  };
}
