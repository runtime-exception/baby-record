<script setup lang="ts">
import AppDatePicker from './AppDatePicker.vue';

const props = withDefaults(
  defineProps<{
    value?: [number, number] | null;
    isDateDisabled?: (timestamp: number) => boolean;
  }>(),
  {
    value: null,
    isDateDisabled: undefined,
  },
);

const emit = defineEmits<{
  'update:value': [value: [number, number] | null];
}>();

function updateStart(value: number | null) {
  if (value === null || !props.value) {
    emit('update:value', null);
    return;
  }
  emit('update:value', [Math.min(value, props.value[1]), Math.max(value, props.value[1])]);
}

function updateEnd(value: number | null) {
  if (value === null || !props.value) {
    emit('update:value', null);
    return;
  }
  emit('update:value', [Math.min(props.value[0], value), Math.max(props.value[0], value)]);
}
</script>

<template>
  <div class="flex items-center gap-2">
    <AppDatePicker
      :value="value?.[0] ?? null"
      :is-date-disabled="isDateDisabled"
      class="min-w-0 flex-1"
      @update:value="updateStart"
    />
    <span class="flex h-11 shrink-0 items-center text-sm text-ios-secondary">至</span>
    <AppDatePicker
      :value="value?.[1] ?? null"
      :is-date-disabled="isDateDisabled"
      class="min-w-0 flex-1"
      @update:value="updateEnd"
    />
  </div>
</template>
