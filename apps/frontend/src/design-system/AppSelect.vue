<script setup lang="ts">
import { computed, ref } from 'vue';
import { ListInput } from 'konsta/vue';
import AppSheet from './AppSheet.vue';
import { toggleSelection, type SelectValue } from './select-values';

export interface SelectOption {
  label: string;
  value: SelectValue;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    value?: SelectValue | SelectValue[] | null;
    options: SelectOption[];
    multiple?: boolean;
    filterable?: boolean;
    clearable?: boolean;
    disabled?: boolean;
    placeholder?: string;
    title?: string;
  }>(),
  {
    value: null,
    multiple: false,
    filterable: false,
    clearable: false,
    disabled: false,
    placeholder: '请选择',
    title: '请选择',
  },
);

const emit = defineEmits<{
  'update:value': [value: SelectValue | SelectValue[] | null];
}>();

const open = ref(false);
const query = ref('');

const selectedValues = computed<SelectValue[]>(() => {
  if (props.multiple) {
    return Array.isArray(props.value) ? props.value : [];
  }
  return props.value === null || props.value === undefined ? [] : [props.value as SelectValue];
});

const filteredOptions = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  if (!keyword) return props.options;
  return props.options.filter((option) => option.label.toLowerCase().includes(keyword));
});

const displayText = computed(() => {
  if (!selectedValues.value.length) return props.placeholder;
  return selectedValues.value
    .map((value) => props.options.find((option) => option.value === value)?.label ?? value)
    .join('、');
});

function isSelected(value: SelectValue) {
  return selectedValues.value.includes(value);
}

function choose(option: SelectOption) {
  if (option.disabled) return;

  if (props.multiple) {
    emit(
      'update:value',
      toggleSelection(selectedValues.value, option.value),
    );
    return;
  }

  emit('update:value', option.value);
  open.value = false;
}

function clearValue() {
  emit('update:value', props.multiple ? [] : null);
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="min-h-12 w-full rounded-2xl border border-ios-separator/70 bg-ios-card px-4 py-3 pr-12 text-left text-sm font-medium text-ios-label disabled:opacity-50"
      :disabled="disabled"
      @click="open = true"
    >
      <span :class="selectedValues.length ? 'text-ios-label' : 'text-ios-secondary'">
        {{ displayText }}
      </span>
      <span class="absolute right-4 top-1/2 -translate-y-1/2 text-ios-secondary">⌄</span>
    </button>

    <button
      v-if="clearable && selectedValues.length"
      type="button"
      class="absolute right-10 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-ios-fill text-xs text-ios-secondary"
      aria-label="清除选择"
      @click.stop="clearValue"
    >
      ×
    </button>

    <AppSheet
      :open="open"
      :title="title"
      panel-class="bg-ios-bg rounded-t-3xl max-h-[80vh] overflow-hidden no-scrollbar safe-bottom"
      @close="open = false"
    >
      <div class="px-5 pb-5">
        <ListInput
          v-if="filterable"
          component="div"
          :value="query"
          clear-button
          placeholder="搜索"
          class="mb-3"
          @input="query = ($event.target as HTMLInputElement).value"
          @clear="query = ''"
        />

        <div class="max-h-[55vh] overflow-y-auto rounded-2xl bg-ios-card">
          <button
            v-for="option in filteredOptions"
            :key="option.value"
            type="button"
            class="flex min-h-12 w-full items-center justify-between gap-4 border-b border-ios-separator/60 px-4 py-3 text-left text-sm last:border-b-0"
            :class="[
              option.disabled ? 'opacity-40' : 'active:bg-ios-fill/50',
              isSelected(option.value) ? 'text-ios-blue' : 'text-ios-label',
            ]"
            :disabled="option.disabled"
            @click="choose(option)"
          >
            <span>{{ option.label }}</span>
            <span v-if="isSelected(option.value)" class="font-bold">✓</span>
          </button>
          <p v-if="!filteredOptions.length" class="py-10 text-center text-sm text-ios-secondary">
            没有匹配选项
          </p>
        </div>

        <button
          v-if="multiple"
          type="button"
          class="mt-4 w-full rounded-2xl bg-ios-blue py-3 font-semibold text-white"
          @click="open = false"
        >
          完成
        </button>
      </div>
    </AppSheet>
  </div>
</template>
