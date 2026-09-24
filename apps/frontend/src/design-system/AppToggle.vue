<script setup lang="ts">
import { Toggle } from 'konsta/vue';

defineProps<{
  value: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}>();

const emit = defineEmits<{
  'update:value': [value: boolean];
}>();

function onChange(event: Event) {
  emit('update:value', (event.target as HTMLInputElement).checked);
}
</script>

<template>
  <Toggle
    :checked="value"
    :disabled="disabled"
    :aria-label="ariaLabel"
    @change="onChange"
  />
</template>
