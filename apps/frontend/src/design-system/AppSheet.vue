<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  Dialog,
  DialogOverlay,
  DialogPanel,
} from '@headlessui/vue';
import { Sheet } from 'konsta/vue';
import { useScrollLock } from '@vueuse/core';
import { useSheetGesture } from './useSheetGesture';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    dismissible?: boolean;
    panelClass?: string;
  }>(),
  {
    title: '',
    dismissible: true,
    panelClass: 'bg-ios-bg max-h-[85vh] overflow-y-auto no-scrollbar safe-bottom',
  },
);

const emit = defineEmits<{
  close: [];
}>();

const panel = ref<HTMLElement | null>(null);
const dismissible = computed(() => props.dismissible);
const { dragY, onPointerDown } = useSheetGesture(
  panel,
  () => emit('close'),
  dismissible,
);

const scrollLocked = useScrollLock(document.body);
watch(
  () => props.open,
  (open) => {
    scrollLocked.value = open;
  },
  { immediate: true },
);

const sheetStyle = computed(() => ({
  transform: `translateY(calc(-100% + ${dragY.value}px))`,
}));
</script>

<template>
  <Dialog :open="open" @close="dismissible && emit('close')">
    <DialogOverlay class="fixed inset-0 z-40 bg-black/45" />
    <div class="app-sheet-viewport fixed inset-x-0 top-0 z-50 flex items-end justify-center">
      <DialogPanel ref="panel" class="w-full max-w-app">
        <Sheet
          :opened="open"
          :backdrop="false"
          :class="[
            '!left-0 !right-0 !mx-auto !w-full !max-w-app',
            panelClass,
          ]"
          :style="sheetStyle"
        >
          <div
            class="cursor-grab touch-none px-5 pb-1 pt-3 active:cursor-grabbing"
            aria-label="拖动关闭"
            @pointerdown="onPointerDown"
          >
            <div class="mx-auto h-1 w-10 rounded-full bg-ios-secondary/30" />
          </div>

          <div
            v-if="title"
            class="flex items-center justify-between px-5 pb-2"
          >
            <h3 class="text-lg font-bold text-ios-label">{{ title }}</h3>
            <button
              v-if="dismissible"
              type="button"
              class="text-sm font-semibold text-ios-blue"
              @click="emit('close')"
            >
              关闭
            </button>
          </div>

          <div class="app-sheet-content pb-4">
            <slot />
          </div>
        </Sheet>
      </DialogPanel>
    </div>
  </Dialog>
</template>
