<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAppFeedback } from '@/design-system/feedback';
import AppSheet from '@/design-system/AppSheet.vue';
import AppInput from '@/design-system/AppInput.vue';
import AppPullToRefresh from '@/design-system/AppPullToRefresh.vue';
import AppHeader from '@/components/AppHeader.vue';

import { EXERCISE_UNITS, type ExerciseUnit } from '@baby-record/shared';
import { exerciseConfigApi } from '@/api/exercise-config';
import type { ExerciseConfigVo } from '@baby-record/shared';

const message = useAppFeedback();
const exercises = ref<ExerciseConfigVo[]>([]);
const loading = ref(false);
const actionSubmitting = ref(false);
const query = ref('');
const newName = ref('');
const newEmoji = ref<string | null>(null);
const newAmount = ref('1');
const newUnit = ref<ExerciseUnit>('分钟');
const editing = ref<ExerciseConfigVo | null>(null);
const editingName = ref('');
const editingEmoji = ref<string | null>(null);
const editingAmount = ref('');
const editingUnit = ref<ExerciseUnit>('分钟');

const showEditing = computed({
  get: () => editing.value !== null,
  set: (show: boolean) => { if (!show) editing.value = null; },
});

const filteredExercises = computed(() => {
  const keyword = query.value.trim();
  return exercises.value.filter((item) => !keyword || item.name.includes(keyword));
});

async function load() {
  loading.value = true;
  try {
    exercises.value = await exerciseConfigApi.list(true);
  } finally {
    loading.value = false;
  }
}

async function addExercise() {
  if (actionSubmitting.value) return;
  const name = newName.value.trim();
  if (!name) return message.warning('请输入运动名称');
  actionSubmitting.value = true;
  try {
    await exerciseConfigApi.create({
      name,
      emoji: newEmoji.value,
      defaultAmount: newAmount.value.trim(),
      defaultUnit: newUnit.value,
    });
    newName.value = '';
    newEmoji.value = null;
    newAmount.value = '1';
    newUnit.value = '分钟';
    message.success('运动已添加');
    await load();
  } finally {
    actionSubmitting.value = false;
  }
}

function startEdit(item: ExerciseConfigVo) {
  editing.value = item;
  editingName.value = item.name;
  editingEmoji.value = item.emoji;
  editingAmount.value = item.defaultAmount ?? '';
  editingUnit.value = item.defaultUnit;
}

async function saveEdit() {
  if (actionSubmitting.value) return;
  if (!editing.value || !editingName.value.trim()) return;
  actionSubmitting.value = true;
  try {
    await exerciseConfigApi.update(editing.value.id, {
      name: editingName.value.trim(),
      emoji: editingEmoji.value,
      defaultAmount: editingAmount.value.trim(),
      defaultUnit: editingUnit.value,
    });
    editing.value = null;
    message.success('运动配置已更新');
    await load();
  } finally {
    actionSubmitting.value = false;
  }
}

async function toggle(item: ExerciseConfigVo) {
  if (actionSubmitting.value) return;
  actionSubmitting.value = true;
  try {
    if (item.isActive) await exerciseConfigApi.remove(item.id);
    else await exerciseConfigApi.update(item.id, { isActive: true });
    message.success(item.isActive ? '已停用，历史记录不受影响' : '已恢复');
    await load();
  } finally {
    actionSubmitting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <AppPullToRefresh @refresh="load">
    <div>
      <AppHeader title="运动管理" subtitle="家庭内所有宝宝共享" show-back />
      <div class="px-5 mt-4 space-y-3">
        <section class="bg-ios-card rounded-3xl p-4 shadow-card">
          <label class="text-sm font-medium text-ios-secondary">添加运动</label>
          <div class="mt-2 flex gap-2">
            <AppInput v-model:value="newName" :maxlength="30" placeholder="如：抬头" @keyup.enter="addExercise" />
            <button class="shrink-0 rounded-2xl bg-ios-blue px-4 text-sm font-semibold text-white disabled:opacity-60" :disabled="actionSubmitting" @click="addExercise">{{ actionSubmitting ? '处理中…' : '添加' }}</button>
          </div>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <AppInput v-model:value="newAmount" type="number" min="0" step="any" :maxlength="30" placeholder="默认数量" />
            <select v-model="newUnit" aria-label="默认单位" class="rounded-2xl bg-ios-fill/40 px-3 py-3 text-ios-label"><option v-for="u in EXERCISE_UNITS" :key="u" :value="u">{{ u }}</option></select>
          </div>
          <AppInput v-model:value="newEmoji" :maxlength="8" placeholder="运动图标（选填，如：🧸）" class="mt-3" />
        </section>

        <AppInput v-model:value="query" clearable placeholder="搜索运动" />

        <div v-if="loading" class="py-12 text-center text-sm text-ios-secondary">加载中…</div>
        <section v-else class="bg-ios-card rounded-3xl shadow-card divide-y divide-ios-separator/60">
          <div v-for="item in filteredExercises" :key="item.id" class="flex items-center gap-3 px-4 py-3.5">
            <span class="text-xl">{{ item.emoji || '🤸' }}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold" :class="item.isActive ? 'text-ios-label' : 'text-ios-secondary'">{{ item.name }}</p>
              <p class="text-xs text-ios-secondary">
                {{ item.defaultAmount || item.defaultUnit ? `${item.defaultAmount || ''}${item.defaultUnit || ''}` : '未设置默认数量' }} · {{ item.isActive ? '可用于新记录' : '已停用' }}
              </p>
            </div>
            <button class="text-xs text-ios-blue disabled:opacity-50" :disabled="actionSubmitting" @click="startEdit(item)">编辑</button>
            <button class="text-xs disabled:opacity-50" :class="item.isActive ? 'text-ios-pink' : 'text-ios-green'" :disabled="actionSubmitting" @click="toggle(item)">{{ item.isActive ? '停用' : '恢复' }}</button>
          </div>
          <p v-if="!filteredExercises.length" class="py-10 text-center text-sm text-ios-secondary">没有匹配的运动</p>
        </section>
      </div>

      <AppSheet
        :open="showEditing"
        title="修改运动配置"
        panel-class="bg-ios-bg rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto no-scrollbar safe-bottom"
        @close="showEditing = false"
      >
        <div class="space-y-3">
          <AppInput v-model:value="editingName" :maxlength="30" placeholder="运动名称" />
          <div class="grid grid-cols-2 gap-2">
            <AppInput v-model:value="editingAmount" type="number" min="0" step="any" :maxlength="30" placeholder="本配置默认数量" />
            <select v-model="editingUnit" aria-label="默认单位" class="rounded-2xl bg-ios-fill/40 px-3 py-3 text-ios-label"><option v-for="u in EXERCISE_UNITS" :key="u" :value="u">{{ u }}</option></select>
          </div>
          <AppInput v-model:value="editingEmoji" :maxlength="8" placeholder="运动图标（选填）" />
          <button class="w-full rounded-2xl bg-ios-blue py-3 text-sm font-semibold text-white disabled:opacity-60" :disabled="actionSubmitting" @click="saveEdit">{{ actionSubmitting ? '保存中…' : '保存' }}</button>
        </div>
      </AppSheet>
    </div>
  </AppPullToRefresh>
</template>
