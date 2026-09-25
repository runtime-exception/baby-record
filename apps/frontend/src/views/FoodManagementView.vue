<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAppFeedback } from '@/design-system/feedback';
import AppSheet from '@/design-system/AppSheet.vue';
import AppInput from '@/design-system/AppInput.vue';
import AppPullToRefresh from '@/design-system/AppPullToRefresh.vue';
import AppHeader from '@/components/AppHeader.vue';
import { splitFoodEmoji } from '@/design-system/food-emoji';
import FoodEmojiPicker from '@/components/form/FoodEmojiPicker.vue';
import { foodApi } from '@/api/food';
import type { FoodVo } from '@baby-record/shared';

const message = useAppFeedback();
const foods = ref<FoodVo[]>([]);
const loading = ref(false);
const newName = ref('');
const newEmoji = ref<string | null>(null);
const query = ref('');
const editing = ref<FoodVo | null>(null);
const editingName = ref('');
const editingEmoji = ref<string | null>(null);
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
  await foodApi.create(name, newEmoji.value);
  newName.value = '';
  newEmoji.value = null;
  message.success('辅食已添加');
  await load();
}

function startEdit(food: FoodVo) {
  editing.value = food;
  editingName.value = food.name;
  editingEmoji.value = food.emoji ?? null;
}

async function saveEdit() {
  if (!editing.value || !editingName.value.trim()) return;
  await foodApi.update(editing.value.id, {
    name: editingName.value.trim(),
    emoji: editingEmoji.value,
  });
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
  <AppPullToRefresh @refresh="load">
  <div>
    <AppHeader title="辅食管理" subtitle="家庭内所有宝宝共享" show-back />
    <div class="px-5 mt-4 space-y-3">
      <section class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">添加辅食</label>
        <div class="mt-2 flex gap-2">
          <AppInput v-model:value="newName" :maxlength="30" placeholder="如：玉米" @keyup.enter="addFood" />
          <button class="shrink-0 rounded-2xl bg-ios-blue px-4 text-sm font-semibold text-white" @click="addFood">添加</button>
        </div>
        <FoodEmojiPicker v-model="newEmoji" :name="newName" class="mt-3" />
      </section>

      <AppInput v-model:value="query" clearable placeholder="搜索辅食" />

      <div v-if="loading" class="py-12 text-center text-sm text-ios-secondary">加载中…</div>
      <section v-else class="bg-ios-card rounded-3xl shadow-card divide-y divide-ios-separator/60">
        <div v-for="food in filteredFoods" :key="food.id" class="flex items-center gap-3 px-4 py-3.5">
          <span class="text-xl">{{ splitFoodEmoji(food.name, food.emoji).emoji }}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold" :class="food.isActive ? 'text-ios-label' : 'text-ios-secondary'">{{ splitFoodEmoji(food.name, food.emoji).label }}</p>
            <p class="text-xs text-ios-secondary">{{ food.isActive ? '可用于新记录' : '已停用' }}</p>
          </div>
          <button class="text-xs text-ios-blue" @click="startEdit(food)">改名</button>
          <button class="text-xs" :class="food.isActive ? 'text-ios-pink' : 'text-ios-green'" @click="toggle(food)">{{ food.isActive ? '停用' : '恢复' }}</button>
        </div>
        <p v-if="!filteredFoods.length" class="py-10 text-center text-sm text-ios-secondary">没有匹配的辅食</p>
      </section>
    </div>

    <AppSheet
      :open="showEditing"
      title="修改辅食名称"
      panel-class="bg-ios-bg rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto no-scrollbar safe-bottom"
      @close="showEditing = false"
    >
      <AppInput v-model:value="editingName" :maxlength="30" @keyup.enter="saveEdit" />
      <FoodEmojiPicker v-model="editingEmoji" :name="editingName" class="mt-3" />
      <button class="mt-4 w-full rounded-2xl bg-ios-blue py-3 text-sm font-semibold text-white" @click="saveEdit">保存</button>
    </AppSheet>
  </div>
  </AppPullToRefresh>
</template>
