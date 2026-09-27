<script setup lang="ts">
import { SUPPLEMENT_EMOJI_CHOICES, resolveSupplementEmoji } from '@/design-system/supplement-config';

const props = defineProps<{
  modelValue: string | null;
  name?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
}>();
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
        恢复默认
      </button>
    </div>
    <div class="mt-2 grid grid-cols-8 gap-1.5">
      <button
        type="button"
        class="flex aspect-square items-center justify-center rounded-xl border text-xl transition active:scale-90"
        :class="modelValue ? 'border-ios-separator/60 bg-ios-fill/40' : 'border-ios-blue bg-ios-blue/10'"
        :aria-pressed="!modelValue"
        aria-label="使用默认补剂图标"
        @click="emit('update:modelValue', null)"
      >
        {{ resolveSupplementEmoji(props.name ?? '', null) }}
      </button>
      <button
        v-for="emoji in SUPPLEMENT_EMOJI_CHOICES"
        :key="emoji"
        type="button"
        class="flex aspect-square items-center justify-center rounded-xl border text-xl transition active:scale-90"
        :class="modelValue === emoji ? 'border-ios-blue bg-ios-blue/10' : 'border-ios-separator/60 bg-ios-fill/40'"
        :aria-pressed="modelValue === emoji"
        :aria-label="`图标 ${emoji}`"
        @click="emit('update:modelValue', emoji)"
      >
        {{ emoji }}
      </button>
    </div>
  </div>
</template>
