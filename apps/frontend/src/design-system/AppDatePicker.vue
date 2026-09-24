<script setup lang="ts">
import { computed } from 'vue';
import { ListInput } from 'konsta/vue';
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
  <ListInput
    component="div"
    :value="inputValue"
    :type="type === 'date' ? 'date' : 'datetime-local'"
    :placeholder="placeholder"
    :disabled="disabled"
    input-class="text-sm"
    class="w-full"
    @input="onInput"
  />
</template>
