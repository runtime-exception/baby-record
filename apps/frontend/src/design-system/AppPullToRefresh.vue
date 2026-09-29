<script setup lang="ts">
import { ref } from 'vue';
import { Preloader } from 'konsta/vue';
import { useEventListener } from '@vueuse/core';
import {
  hasReachedRefreshThreshold,
  shouldActivatePullRefresh,
  shouldStartPullRefresh,
} from './gesture-values';

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    threshold?: number;
  }>(),
  {
    disabled: false,
    threshold: 84,
  },
);

const emit = defineEmits<{
  refresh: [];
}>();

const distance = ref(0);
const refreshing = ref(false);
let active = false;
let tracking = false;
let startX = 0;
let startY = 0;

function onTouchStart(event: TouchEvent) {
  if (props.disabled || refreshing.value) return;
  const touch = event.touches[0];
  tracking = Boolean(touch) && shouldStartPullRefresh(window.scrollY, 1);
  active = false;
  distance.value = 0;
  startX = touch?.clientX ?? 0;
  startY = touch?.clientY ?? 0;
}

function onTouchMove(event: TouchEvent) {
  if (!tracking || refreshing.value) return;
  const touch = event.touches[0];
  if (!touch) return;
  const deltaX = touch.clientX - startX;
  const delta = touch.clientY - startY;
  if (!active) {
    if (Math.abs(deltaX) > 16 && Math.abs(deltaX) >= delta) {
      tracking = false;
      return;
    }
    if (!shouldActivatePullRefresh(window.scrollY, deltaX, delta)) return;
    active = true;
  }
  if (!shouldStartPullRefresh(window.scrollY, delta)) {
    active = false;
    tracking = false;
    distance.value = 0;
    return;
  }
  distance.value = Math.min(120, (delta - 16) * 0.45);
  if (distance.value > 0 && event.cancelable) event.preventDefault();
}

function finishPull() {
  tracking = false;
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

function cancelPull() {
  active = false;
  tracking = false;
  distance.value = 0;
}

useEventListener(window, 'touchstart', onTouchStart, { passive: true });
useEventListener(window, 'touchmove', onTouchMove, { passive: false });
useEventListener(window, 'touchend', finishPull, { passive: true });
useEventListener(window, 'touchcancel', cancelPull, { passive: true });
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
