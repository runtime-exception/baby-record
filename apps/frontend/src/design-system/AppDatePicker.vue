<script setup lang="ts">
import { computed } from 'vue';
import {
  dateInputToTimestamp,
  timestampToDateInput,
  type DateInputType,
} from './date-values';

const props = withDefaults(
  defineProps<{
    value?: number | null;
    type?: DateInputType;
    placeholder?: string;
    disabled?: boolean;
    isDateDisabled?: (timestamp: number) => boolean;
  }>(),
  {
    value: null,
    type: 'date',
    placeholder: '请选择日期',
    disabled: false,
    isDateDisabled: undefined,
  },
);

const emit = defineEmits<{
  'update:value': [value: number | null];
}>();

const inputValue = computed(() =>
  timestampToDateInput(props.value, props.type),
);

function onInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value;
  const timestamp = dateInputToTimestamp(raw, props.type);
  if (timestamp === null || props.isDateDisabled?.(timestamp)) return;
  emit('update:value', timestamp);
}
</script>

<template>
  <input
    :value="inputValue"
    :type="type === 'date' ? 'date' : 'datetime-local'"
    :placeholder="placeholder"
    :disabled="disabled"
    class="h-11 w-full min-w-0 bg-transparent px-0 text-sm font-medium text-ios-label outline-none disabled:opacity-50"
    @input="onInput"
  />
</template>
