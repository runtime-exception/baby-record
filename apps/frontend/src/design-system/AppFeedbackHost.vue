<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import {
  subscribeFeedback,
  type FeedbackMessage,
  type FeedbackType,
} from './feedback';

const current = ref<FeedbackMessage | null>(null);
const queue: FeedbackMessage[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;

const typeClasses: Record<FeedbackType, string> = {
  success: 'bg-ios-green text-white',
  error: 'bg-ios-red text-white',
  warning: 'bg-ios-orange text-white',
  info: 'bg-ios-blue text-white',
};

function closeCurrent() {
  if (timer) clearTimeout(timer);
  timer = null;
  current.value = null;
  window.setTimeout(showNext, 120);
}

function showNext() {
  if (current.value || !queue.length) return;
  current.value = queue.shift() ?? null;
  if (current.value) {
    timer = setTimeout(closeCurrent, current.value.duration);
  }
}

onMounted(() => {
  unsubscribe = subscribeFeedback((item) => {
    queue.push(item);
    showNext();
  });
});

onBeforeUnmount(() => {
  unsubscribe?.();
  if (timer) clearTimeout(timer);
});
</script>

<template>
  <Transition name="feedback-top">
    <div
      v-if="current"
      data-feedback-toast
      class="pointer-events-none fixed left-4 right-4 z-50 flex justify-center"
      style="top: calc(env(safe-area-inset-top) + 1rem); bottom: auto"
    >
      <div
        class="max-w-app rounded-2xl px-4 py-3 text-sm font-semibold shadow-soft"
        :class="typeClasses[current.type]"
        role="status"
        aria-live="polite"
      >
        {{ current.message }}
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.feedback-top-enter-active,
.feedback-top-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.feedback-top-enter-from,
.feedback-top-leave-to { transform: translateY(-12px); opacity: 0; }
</style>
