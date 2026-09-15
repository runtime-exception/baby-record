<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { NInput, NModal, useMessage } from 'naive-ui';
import AppHeader from '@/components/AppHeader.vue';
import { foodApi } from '@/api/food';
import type { FoodVo } from '@baby-record/shared';

const message = useMessage();
const foods = ref<FoodVo[]>([]);
const loading = ref(false);
const newName = ref('');
const query = ref('');
const editing = ref<FoodVo | null>(null);
const editingName = ref('');
const showEditing = computed({
  get: () => editing.value !== null,
  set: (show: boolean) => { if (!show) editing.value = null; },
});

const filteredFoods = computed(() => {
  const keyword = query.value.trim();
  return foods.value.filter((food) => !keyword || food.name.includes(keyword));
});

async function load() {
  loading.value = true;
  try {
    foods.value = await foodApi.list(true);
  } finally {
    loading.value = false;
  }
}

async function addFood() {
  const name = newName.value.trim();
  if (!name) return message.warning('请输入辅食名称');
  await foodApi.create(name);
  newName.value = '';
  message.success('辅食已添加');
  await load();
}

function startEdit(food: FoodVo) {
  editing.value = food;
  editingName.value = food.name;
}

async function saveEdit() {
  if (!editing.value || !editingName.value.trim()) return;
  await foodApi.update(editing.value.id, { name: editingName.value.trim() });
  editing.value = null;
  message.success('名称已更新');
  await load();
}

async function toggle(food: FoodVo) {
  if (food.isActive) await foodApi.remove(food.id);
  else await foodApi.update(food.id, { isActive: true });
  message.success(food.isActive ? '已停用，历史记录不受影响' : '已恢复');
  await load();
}

onMounted(load);
</script>

<template>
  <div>
    <AppHeader title="辅食管理" subtitle="家庭内所有宝宝共享" show-back />
    <div class="px-5 mt-4 space-y-3">
      <section class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">添加辅食</label>
        <div class="mt-2 flex gap-2">
          <NInput v-model:value="newName" maxlength="30" placeholder="如：玉米" @keyup.enter="addFood" />
          <button class="shrink-0 rounded-2xl bg-ios-blue px-4 text-sm font-semibold text-white" @click="addFood">添加</button>
        </div>
      </section>

      <NInput v-model:value="query" clearable placeholder="搜索辅食" />

      <div v-if="loading" class="py-12 text-center text-sm text-ios-secondary">加载中…</div>
      <section v-else class="bg-ios-card rounded-3xl shadow-card divide-y divide-ios-separator/60">
        <div v-for="food in filteredFoods" :key="food.id" class="flex items-center gap-3 px-4 py-3.5">
          <span class="text-xl">{{ food.isActive ? '🥣' : '○' }}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold" :class="food.isActive ? 'text-ios-label' : 'text-ios-secondary'">{{ food.name }}</p>
            <p class="text-xs text-ios-secondary">{{ food.isActive ? '可用于新记录' : '已停用' }}</p>
          </div>
          <button class="text-xs text-ios-blue" @click="startEdit(food)">改名</button>
          <button class="text-xs" :class="food.isActive ? 'text-ios-pink' : 'text-ios-green'" @click="toggle(food)">{{ food.isActive ? '停用' : '恢复' }}</button>
        </div>
        <p v-if="!filteredFoods.length" class="py-10 text-center text-sm text-ios-secondary">没有匹配的辅食</p>
      </section>
    </div>

    <NModal v-model:show="showEditing" preset="card" title="修改辅食名称" :style="{ width: 'calc(100vw - 40px)', maxWidth: '420px' }">
      <NInput v-model:value="editingName" maxlength="30" @keyup.enter="saveEdit" />
      <button class="mt-4 w-full rounded-2xl bg-ios-blue py-3 text-sm font-semibold text-white" @click="saveEdit">保存</button>
    </NModal>
  </div>
</template>
