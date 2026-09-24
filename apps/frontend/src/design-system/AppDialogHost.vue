<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Dialog, DialogButton } from 'konsta/vue';
import type { DialogRequest } from './dialog';
import { subscribeDialog } from './dialog';

const current = ref<DialogRequest | null>(null);
const queue: DialogRequest[] = [];
let unsubscribe: (() => void) | null = null;

function showNext() {
  if (current.value || !queue.length) return;
  current.value = queue.shift() ?? null;
}

function finish(value: boolean) {
  current.value?.resolve(value);
  current.value = null;
  window.setTimeout(showNext, 120);
}

onMounted(() => {
  unsubscribe = subscribeDialog((item) => {
    queue.push(item);
    showNext();
  });
});

onBeforeUnmount(() => {
  unsubscribe?.();
  current.value?.resolve(false);
});
</script>

<template>
  <Dialog
    :opened="Boolean(current)"
    @backdropclick="finish(false)"
  >
    <template #title>
      <span class="text-[17px] font-semibold">{{ current?.title }}</span>
    </template>
    <template v-if="current">
      <p v-if="typeof current.content === 'string'" class="text-sm leading-5 text-ios-secondary">
        {{ current.content }}
      </p>
      <component :is="current.content" v-else />
    </template>
    <template #buttons>
      <DialogButton
        v-if="current?.kind === 'confirm'"
        @click="finish(false)"
      >
        {{ current?.negativeText }}
      </DialogButton>
      <DialogButton strong @click="finish(true)">
        {{ current?.positiveText }}
      </DialogButton>
    </template>
  </Dialog>
</template>
