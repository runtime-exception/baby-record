<script setup lang="ts">
import { ref } from 'vue';
import { Preloader } from 'konsta/vue';
import { useEventListener } from '@vueuse/core';
import {
  hasReachedRefreshThreshold,
  shouldStartPullRefresh,
} from './gesture-values';

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    threshold?: number;
  }>(),
  {
    disabled: false,
    threshold: 72,
  },
);

const emit = defineEmits<{
  refresh: [];
}>();

const distance = ref(0);
const refreshing = ref(false);
let active = false;
let startY = 0;

function onTouchStart(event: TouchEvent) {
  if (props.disabled || refreshing.value) return;
  const touch = event.touches[0];
  active = Boolean(touch) && shouldStartPullRefresh(window.scrollY, 1);
  startY = touch?.clientY ?? 0;
}

function onTouchMove(event: TouchEvent) {
  if (!active || refreshing.value) return;
  const touch = event.touches[0];
  if (!touch) return;
  const delta = touch.clientY - startY;
  if (!shouldStartPullRefresh(window.scrollY, delta)) {
    active = false;
    distance.value = 0;
    return;
  }
  distance.value = Math.min(120, delta * 0.5);
  if (distance.value > 0 && event.cancelable) event.preventDefault();
}

function finishPull() {
  if (!active) return;
  active = false;
  if (hasReachedRefreshThreshold(distance.value, props.threshold)) {
    refreshing.value = true;
    emit('refresh');
    window.setTimeout(() => {
      refreshing.value = false;
      distance.value = 0;
    }, 900);
    return;
  }
  distance.value = 0;
}

useEventListener(window, 'touchstart', onTouchStart, { passive: true });
useEventListener(window, 'touchmove', onTouchMove, { passive: false });
useEventListener(window, 'touchend', finishPull, { passive: true });
useEventListener(window, 'touchcancel', finishPull, { passive: true });
</script>

<template>
  <div class="contents">
    <div
      class="pointer-events-none fixed left-1/2 top-safe z-30 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-ios-card shadow-card transition-all duration-200"
      :class="distance || refreshing ? 'opacity-100' : 'opacity-0'"
      :style="{ transform: `translate(-50%, ${Math.max(0, distance - 36)}px)` }"
      aria-hidden="true"
    >
      <Preloader
        :size="22"
        :style="{ opacity: refreshing || distance >= threshold ? 1 : distance / threshold }"
      />
    </div>
    <slot />
  </div>
</template>
