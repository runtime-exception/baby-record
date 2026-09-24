<script setup lang="ts">
import { ListInput } from 'konsta/vue';

withDefaults(
  defineProps<{
    value?: string | number | null;
    placeholder?: string;
    type?: string;
    clearable?: boolean;
    disabled?: boolean;
    maxlength?: string | number;
    min?: string | number;
    max?: string | number;
    step?: string | number;
    textarea?: boolean;
    rows?: string | number;
  }>(),
  {
    value: '',
    placeholder: '',
    type: 'text',
    clearable: false,
    disabled: false,
    maxlength: undefined,
    min: undefined,
    max: undefined,
    step: undefined,
    textarea: false,
    rows: 3,
  },
);

const emit = defineEmits<{
  'update:value': [value: string | null];
  input: [event: Event];
  change: [event: Event];
  blur: [event: Event];
  focus: [event: Event];
}>();

function onInput(event: Event) {
  emit('update:value', (event.target as HTMLInputElement | HTMLTextAreaElement).value);
  emit('input', event);
}
</script>

<template>
  <ListInput
    component="div"
    :value="value ?? ''"
    :type="textarea ? 'textarea' : type"
    :placeholder="placeholder"
    :clear-button="clearable"
    :disabled="disabled"
    :maxlength="maxlength"
    :min="min"
    :max="max"
    :step="step"
    :rows="rows"
    class="w-full"
    input-class="min-w-0"
    @input="onInput"
    @change="emit('change', $event)"
    @blur="emit('blur', $event)"
    @focus="emit('focus', $event)"
    @clear="emit('update:value', null)"
  />
</template>
