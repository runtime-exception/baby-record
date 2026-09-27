<script setup lang="ts">
import { resolveSupplementEmoji } from '@/design-system/supplement-config';
import type { SupplementConfigVo } from '@baby-record/shared';

const props = withDefaults(
  defineProps<{
    supplements: SupplementConfigVo[];
    modelValue: number[];
    multiple?: boolean;
    emptyHint?: string;
  }>(),
  {
    multiple: true,
    emptyHint: '还没有补剂，请先到「我的 - 补剂管理」添加',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: number[]];
}>();

function isSelected(id: number) {
  return props.modelValue.includes(id);
}

function toggle(id: number) {
  if (isSelected(id)) {
    emit('update:modelValue', props.modelValue.filter((item) => item !== id));
    return;
  }
  emit('update:modelValue', props.multiple ? [...props.modelValue, id] : [id]);
}
</script>

<template>
  <div>
    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="supplement in supplements"
        :key="supplement.id"
        type="button"
        class="flex min-h-16 items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.97]"
        :class="isSelected(supplement.id)
          ? 'border-ios-green bg-ios-green/10 text-ios-green'
          : 'border-ios-separator/60 bg-ios-fill/40 text-ios-label'"
        :aria-pressed="isSelected(supplement.id)"
        @click="toggle(supplement.id)"
      >
        <span class="text-xl">{{ resolveSupplementEmoji(supplement.name, supplement.emoji) }}</span>
        <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{ supplement.name }}</span>
      </button>
    </div>
    <p v-if="!supplements.length" class="py-6 text-center text-sm text-ios-secondary">
      {{ emptyHint }}
    </p>
  </div>
</template>
