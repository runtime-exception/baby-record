<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAppFeedback } from '@/design-system/feedback';
import AppInput from '@/design-system/AppInput.vue';
import AppToggle from '@/design-system/AppToggle.vue';
import AppHeader from '@/components/AppHeader.vue';
import DateTimePicker from '@/components/form/DateTimePicker.vue';
import FoodPickerGrid from '@/components/form/FoodPickerGrid.vue';
import FeedingComponentPicker from '@/components/form/FeedingComponentPicker.vue';
import SupplementPickerGrid from '@/components/form/SupplementPickerGrid.vue';
import WheelPicker from '@/components/form/WheelPicker.vue';
import { feedingApi } from '@/api/feeding';
import { foodApi } from '@/api/food';
import { supplementApi } from '@/api/supplement';
import { supplementConfigApi } from '@/api/supplement-config';
import {
  buildFeedingSupplementPayloads,
  summarizeSupplementResults,
} from '@/design-system/feeding-supplements';
import { useBabyStore } from '@/stores/baby';
import { useUserStore } from '@/stores/user';
import { useDashboardStore } from '@/stores/dashboard';
import { type SupplementConfigVo } from '@baby-record/shared';
import { feedingTypeForComponents, type FeedingComponent } from '@/design-system/feeding-composition';

const router = useRouter();
const message = useAppFeedback();
const babyStore = useBabyStore();
const userStore = useUserStore();
const dashStore = useDashboardStore();

const components = ref<FeedingComponent[]>(['BREAST_MILK']);
const time = ref(Date.now());
const amountMl = ref(120);
const remark = ref('');
const submitting = ref(false);
const feedingSaved = ref(false);
const foods = ref<{ id: number; name: string }[]>([]);
const foodIds = ref<number[]>([]);
const supplements = ref<SupplementConfigVo[]>([]);
const supplementIds = ref<number[]>([]);
const addSupplements = ref(false);

const hasFood = computed(() => components.value.includes('COMPLEMENTARY_FOOD'));
const hasMilk = computed(() => components.value.some((item) => item !== 'COMPLEMENTARY_FOOD'));
const feedingType = computed(() => feedingTypeForComponents(components.value));

onMounted(async () => {
  const [foodResult, supplementResult] = await Promise.allSettled([
    foodApi.list(),
    supplementConfigApi.list(),
  ]);
  if (foodResult.status === 'fulfilled') foods.value = foodResult.value;
  if (supplementResult.status === 'fulfilled') supplements.value = supplementResult.value;
});

async function onSubmit() {
  if (submitting.value || feedingSaved.value) return;
  const baby = babyStore.currentBaby;
  const user = userStore.currentUser;
  if (!baby || !user) {
    message.error('请先选择宝宝与身份');
    return;
  }
  if (hasFood.value && !foodIds.value.length) {
    message.warning('请选择至少一种辅食');
    return;
  }
  submitting.value = true;
  const feedingTime = new Date(time.value).toISOString();
  try {
    await feedingApi.create({
      babyId: baby.id,
      feedingType: feedingType.value,
      components: components.value,
      feedingTime,
      ...(hasMilk.value && { amountMl: amountMl.value }),
      ...(hasFood.value && { foodIds: foodIds.value }),
      remark: remark.value || undefined,
      creatorId: user.id,
    });
    feedingSaved.value = true;
  } catch {
    submitting.value = false;
    return;
  }

  const supplementPayloads = addSupplements.value
    ? buildFeedingSupplementPayloads(supplements.value, supplementIds.value, {
        babyId: baby.id,
        creatorId: user.id,
        feedingTime,
      })
    : [];
  const supplementResults = await Promise.allSettled(
    supplementPayloads.map((payload) => supplementApi.create(payload)),
  );
  const summary = summarizeSupplementResults(supplementResults);
  if (summary.failedCount) message.warning(summary.message);
  else message.success(summary.message);

  try {
    await dashStore.fetch(baby.id);
  } catch {
    // 喂养已经保存，首页刷新失败不能允许重新创建记录
  }
  try {
    await router.push('/');
  } catch {
    message.warning('记录已保存，请手动返回首页');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div>
    <AppHeader title="喂养记录" show-back />
    <div class="px-5 mt-4 space-y-3">
      <div class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">时间</label>
        <DateTimePicker v-model="time" class="mt-2 w-full" />
      </div>

      <div class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">类型</label>
        <FeedingComponentPicker v-model="components" class="mt-3" />
        <p v-if="components.length > 1" class="text-xs text-ios-orange mt-2">将记录为混合喂养</p>
      </div>

      <div v-if="hasMilk" class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">奶量</label>
        <div class="mt-2 flex items-center gap-2">
          <WheelPicker v-model="amountMl" :options="Array.from({ length: 31 }, (_, i) => ({ label: `${i * 10} ml`, value: i * 10 }))" class="flex-1" />
        </div>
      </div>

      <div v-if="hasFood" class="bg-ios-card rounded-3xl p-4 shadow-card">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-ios-secondary">辅食（必选）</label>
          <span v-if="foodIds.length" class="text-xs text-ios-orange">已选 {{ foodIds.length }} 种</span>
        </div>
        <FoodPickerGrid v-model="foodIds" :foods="foods" class="mt-3" />
      </div>

      <div class="bg-ios-card rounded-3xl p-4 shadow-card flex items-center gap-3">
        <div class="flex-1">
          <p class="text-sm font-medium text-ios-label">补剂添加</p>
          <p class="text-xs text-ios-secondary mt-0.5">选填，可顺带记录本次补剂</p>
        </div>
        <AppToggle v-model:value="addSupplements" aria-label="补剂添加" />
      </div>

      <div v-if="addSupplements" class="bg-ios-card rounded-3xl p-4 shadow-card">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-ios-secondary">选择补剂</label>
          <span v-if="supplementIds.length" class="text-xs text-ios-orange">已选 {{ supplementIds.length }} 种</span>
        </div>
        <SupplementPickerGrid v-model="supplementIds" :supplements="supplements" class="mt-3" />
      </div>

      <div class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">备注</label>
        <AppInput
          v-model:value="remark"
          textarea
          :rows="2"
          placeholder="选填"
          class="mt-2"
        />
      </div>

      <button
        class="w-full py-3.5 rounded-2xl bg-ios-orange text-white font-semibold active:scale-95 transition-transform duration-150 disabled:opacity-60"
        :disabled="submitting || feedingSaved"
        @click="onSubmit"
      >
        {{ feedingSaved ? '已保存' : submitting ? '保存中…' : '保存记录' }}
      </button>
    </div>
  </div>
</template>
