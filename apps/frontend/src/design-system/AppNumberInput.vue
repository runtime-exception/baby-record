<script setup lang="ts">
import { ListInput } from 'konsta/vue';

withDefaults(
  defineProps<{
    value?: number | null;
    placeholder?: string;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
  }>(),
  {
    value: null,
    placeholder: '',
    min: undefined,
    max: undefined,
    step: 1,
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:value': [value: number | null];
}>();

function onInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value;
  emit('update:value', raw === '' ? null : Number(raw));
}
</script>

<template>
  <ListInput
    component="div"
    :value="value ?? ''"
    type="number"
    inputmode="decimal"
    :placeholder="placeholder"
    :disabled="disabled"
    :min="min"
    :max="max"
    :step="step"
    class="w-full"
    @input="onInput"
  />
</template>
