<script setup lang="ts">
import { FEEDING_TYPE_LABELS } from '@baby-record/shared';
import type { FeedingComponent } from '@/design-system/feeding-composition';

const props = defineProps<{ modelValue: FeedingComponent[] }>();
const emit = defineEmits<{ 'update:modelValue': [value: FeedingComponent[]] }>();
const options: { value: FeedingComponent; icon: string }[] = [
  { value: 'BREAST_MILK', icon: '🤱' },
  { value: 'FORMULA', icon: '🍼' },
  { value: 'COMPLEMENTARY_FOOD', icon: '🥣' },
];

function toggle(value: FeedingComponent) {
  if (props.modelValue.includes(value)) {
    if (props.modelValue.length > 1) emit('update:modelValue', props.modelValue.filter((item) => item !== value));
  } else {
    emit('update:modelValue', options.map((item) => item.value).filter((item) => item === value || props.modelValue.includes(item)));
  }
}
</script>

<template>
  <div class="grid grid-cols-3 gap-2">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :data-feeding-component="option.value"
      :aria-pressed="modelValue.includes(option.value)"
      class="py-3 rounded-2xl flex flex-col items-center gap-1.5 transition-colors"
      :class="modelValue.includes(option.value) ? 'bg-ios-orange text-white' : 'bg-ios-fill/50 text-ios-secondary'"
      @click="toggle(option.value)"
    >
      <span class="text-2xl">{{ option.icon }}</span>
      <span class="text-xs font-medium">{{ FEEDING_TYPE_LABELS[option.value] }}</span>
    </button>
  </div>
</template>
