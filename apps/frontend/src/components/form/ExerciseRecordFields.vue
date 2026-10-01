<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { exerciseConfigApi } from '@/api/exercise-config';
import { exerciseDefaults, type ExerciseConfigVo, type ExerciseUnit } from '@baby-record/shared';
const props = defineProps<{ exerciseTypes: string[]; amount: string | null; unit: ExerciseUnit | null }>();
const emit = defineEmits<{
  'update:exerciseTypes': [value: string[]];
  'update:amount': [value: string | null];
  'update:unit': [value: ExerciseUnit | null];
}>();
const configs = ref<ExerciseConfigVo[]>([]);
const loading = ref(true);
const failed = ref(false);
const options = computed(() => {
  const active = configs.value.filter((item) => item.isActive);
  for (const name of props.exerciseTypes) {
    if (!active.some((item) => item.name === name)) {
      const old = configs.value.find((item) => item.name === name);
      active.push({ id: -active.length - 1, name, emoji: old?.emoji ?? null,
        defaultAmount: props.amount ?? old?.defaultAmount ?? '1',
        defaultUnit: props.unit ?? old?.defaultUnit ?? '分钟', isActive: false,
        createdTime: '', updatedTime: '' });
    }
  }
  return active;
});
function defaults(names: string[]) {
  return exerciseDefaults(names.map((name) => options.value.find((item) => item.name === name)!).filter(Boolean));
}
function toggle(name: string) {
  const names = props.exerciseTypes.includes(name)
    ? props.exerciseTypes.filter((item) => item !== name) : [...props.exerciseTypes, name];
  const selected = defaults(names);
  emit('update:exerciseTypes', names);
  emit('update:amount', selected?.defaultAmount ?? null);
  emit('update:unit', selected?.defaultUnit ?? null);
}
function changeAmount(value: string | null) {
  emit('update:amount', value || null);
  if (!props.unit && value) emit('update:unit', defaults(props.exerciseTypes)?.defaultUnit ?? '分钟');
}
async function load() {
  loading.value = true; failed.value = false;
  try { configs.value = await exerciseConfigApi.list(true); }
  catch { failed.value = true; }
  finally { loading.value = false; }
}
onMounted(load);
</script>
<template>
  <div class="space-y-3">
    <section class="bg-ios-card rounded-3xl p-4 shadow-card">
      <p class="text-sm font-medium text-ios-secondary">运动类型（可多选）</p>
      <p v-if="loading" class="py-4 text-sm text-ios-secondary">加载中…</p>
      <button v-else-if="failed" class="py-4 text-sm text-ios-blue" @click="load">运动类型加载失败，点击重试</button>
      <div v-else class="mt-3 grid grid-cols-2 gap-2">
        <button v-for="item in options" :key="item.name" type="button" :data-exercise="item.name"
          class="flex min-h-16 items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.97]"
          :class="exerciseTypes.includes(item.name) ? 'border-ios-green bg-ios-green/10 text-ios-green' : 'border-ios-separator/60 bg-ios-fill/40 text-ios-label'"
          :aria-pressed="exerciseTypes.includes(item.name)" @click="toggle(item.name)">
          <span class="text-xl">{{ item.emoji || '🤸' }}</span><span class="text-sm font-semibold">{{ item.name }}<span v-if="!item.isActive" class="ml-1 text-xs text-ios-secondary">历史项目</span></span>
        </button>
      </div>
      <p v-if="!loading && !failed && !options.length" class="py-4 text-sm text-ios-secondary">请先到「我的 → 记录配置 → 运动管理」添加运动类型</p>
    </section>
    <section class="bg-ios-card rounded-3xl p-4 shadow-card">
      <label class="block">
        <span class="text-base font-semibold text-ios-label">运动时长</span>
        <span class="mt-3 flex w-fit max-w-full items-center gap-2 rounded-2xl bg-ios-fill/40 px-4 py-3 focus-within:ring-2 focus-within:ring-ios-green">
          <input :value="amount ?? ''" placeholder="运动时长" type="number" min="0" step="any" inputmode="decimal"
            class="w-24 min-w-0 bg-transparent text-center text-2xl font-semibold text-ios-label outline-none placeholder:text-base placeholder:font-normal placeholder:text-ios-secondary"
            @input="changeAmount(($event.target as HTMLInputElement).value)" />
          <span data-testid="exercise-unit" class="shrink-0 text-base font-medium text-ios-label">{{ unit || '未填写' }}</span>
        </span>
      </label>
      <p class="mt-2 text-xs text-ios-secondary">多选运动共用数量和单位，时间单位优先</p>
    </section>
  </div>
</template>
