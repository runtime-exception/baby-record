<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Toast } from 'konsta/vue';
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
  <Toast :opened="Boolean(current)" position="center">
    <div
      v-if="current"
      class="rounded-2xl px-4 py-3 text-sm font-semibold shadow-soft"
      :class="typeClasses[current.type]"
      role="status"
      aria-live="polite"
    >
      {{ current.message }}
    </div>
  </Toast>
</template>
