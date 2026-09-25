<script setup lang="ts">
import { computed } from 'vue';
import {
  FOOD_EMOJI_CHOICES,
  resolveFoodEmoji,
} from '@/design-system/food-emoji';

const props = defineProps<{
  modelValue: string | null;
  name?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
}>();

/** 未手动选择时，展示按名称推断出的图标作为「自动」的预览 */
const autoEmoji = computed(() => resolveFoodEmoji(props.name ?? ''));
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium text-ios-secondary">图标</span>
      <button
        v-if="modelValue"
        type="button"
        class="text-xs font-semibold text-ios-blue"
        @click="emit('update:modelValue', null)"
      >
        恢复自动
      </button>
    </div>

    <div class="mt-2 grid grid-cols-8 gap-1.5">
      <button
        type="button"
        class="flex aspect-square items-center justify-center rounded-xl border text-xl transition active:scale-90"
        :class="modelValue
          ? 'border-ios-separator/60 bg-ios-fill/40'
          : 'border-ios-blue bg-ios-blue/10'"
        :aria-pressed="!modelValue"
        aria-label="按名称自动选择图标"
        @click="emit('update:modelValue', null)"
      >
        {{ autoEmoji }}
      </button>
      <button
        v-for="emoji in FOOD_EMOJI_CHOICES"
        :key="emoji"
        type="button"
        class="flex aspect-square items-center justify-center rounded-xl border text-xl transition active:scale-90"
        :class="modelValue === emoji
          ? 'border-ios-blue bg-ios-blue/10'
          : 'border-ios-separator/60 bg-ios-fill/40'"
        :aria-pressed="modelValue === emoji"
        :aria-label="`图标 ${emoji}`"
        @click="emit('update:modelValue', emoji)"
      >
        {{ emoji }}
      </button>
    </div>
  </div>
</template>
