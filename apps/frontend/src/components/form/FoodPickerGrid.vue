<script setup lang="ts">
import { splitFoodEmoji } from '@/design-system/food-emoji';

const props = withDefaults(
  defineProps<{
    foods: { id: number; name: string; emoji?: string | null }[];
    modelValue: number[];
    tone?: 'orange' | 'blue' | 'green';
    emptyHint?: string;
  }>(),
  {
    tone: 'orange',
    emptyHint: '还没有辅食，请先到「我的 - 辅食管理」添加',
  },
);

const TONE_CLASS: Record<'orange' | 'blue' | 'green', string> = {
  orange: 'border-ios-orange bg-ios-orange/10 text-ios-orange',
  blue: 'border-ios-blue bg-ios-blue/10 text-ios-blue',
  green: 'border-ios-green bg-ios-green/10 text-ios-green',
};

const emit = defineEmits<{
  'update:modelValue': [value: number[]];
}>();

function isSelected(id: number) {
  return props.modelValue.includes(id);
}

function toggle(id: number) {
  emit(
    'update:modelValue',
    isSelected(id)
      ? props.modelValue.filter((item) => item !== id)
      : [...props.modelValue, id],
  );
}
</script>

<template>
  <div>
    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="food in foods"
        :key="food.id"
        type="button"
        class="flex min-h-16 items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.97]"
        :class="isSelected(food.id)
          ? TONE_CLASS[tone]
          : 'border-ios-separator/60 bg-ios-fill/40 text-ios-label'"
        :aria-pressed="isSelected(food.id)"
        @click="toggle(food.id)"
      >
        <span class="text-xl">{{ splitFoodEmoji(food.name, food.emoji).emoji }}</span>
        <span class="min-w-0 flex-1 truncate text-sm font-semibold">
          {{ splitFoodEmoji(food.name, food.emoji).label }}
        </span>
      </button>
    </div>
    <p v-if="!foods.length" class="py-6 text-center text-sm text-ios-secondary">
      {{ emptyHint }}
    </p>
  </div>
</template>
