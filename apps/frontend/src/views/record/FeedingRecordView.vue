<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { NInput, NSelect, NSwitch } from 'naive-ui';
import AppHeader from '@/components/AppHeader.vue';
import DateTimePicker from '@/components/form/DateTimePicker.vue';
import IconPicker from '@/components/form/IconPicker.vue';
import WheelPicker from '@/components/form/WheelPicker.vue';
import { feedingApi } from '@/api/feeding';
import { foodApi } from '@/api/food';
import { useBabyStore } from '@/stores/baby';
import { useUserStore } from '@/stores/user';
import { useDashboardStore } from '@/stores/dashboard';
import { ALL_FEEDING_TYPES, FEEDING_TYPE_LABELS, type FeedingType } from '@baby-record/shared';

const router = useRouter();
const message = useMessage();
const babyStore = useBabyStore();
const userStore = useUserStore();
const dashStore = useDashboardStore();

const feedingType = ref<FeedingType>('BREAST_MILK');
const time = ref(Date.now());
const amountMl = ref(120);
const remark = ref('');
const submitting = ref(false);
const foods = ref<{ id: number; name: string }[]>([]);
const foodIds = ref<number[]>([]);
const addFoodToMixed = ref(false);

const isComplementaryFood = computed(() => feedingType.value === 'COMPLEMENTARY_FOOD');
const isMixed = computed(() => feedingType.value === 'MIXED');
const showFoodPicker = computed(() => isComplementaryFood.value || (isMixed.value && addFoodToMixed.value));
const foodOptions = computed(() => foods.value.map((food) => ({ label: food.name, value: food.id })));

const typeOptions = ALL_FEEDING_TYPES.map((v) => ({
  label: FEEDING_TYPE_LABELS[v],
  value: v,
  icon: v === 'BREAST_MILK' ? '🤱' : v === 'FORMULA' ? '🍼' : v === 'COMPLEMENTARY_FOOD' ? '🥣' : '🤱🍼',
}));

onMounted(async () => {
  foods.value = await foodApi.list();
});

async function onSubmit() {
  const baby = babyStore.currentBaby;
  const user = userStore.currentUser;
  if (!baby || !user) {
    message.error('请先选择宝宝与身份');
    return;
  }
  if (isComplementaryFood.value && !foodIds.value.length) {
    message.warning('请选择至少一种辅食');
    return;
  }
  submitting.value = true;
  try {
    await feedingApi.create({
      babyId: baby.id,
      feedingType: feedingType.value,
      feedingTime: new Date(time.value).toISOString(),
      ...(!isComplementaryFood.value && { amountMl: amountMl.value }),
      ...(showFoodPicker.value && { foodIds: foodIds.value }),
      remark: remark.value || undefined,
      creatorId: user.id,
    });
    message.success('喂养记录已保存');
    await dashStore.fetch(baby.id);
    router.push('/');
  } catch {
    // 错误已由 request 拦截器统一提示
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
        <IconPicker v-model="feedingType" :options="typeOptions" active-color="bg-ios-orange" class="mt-3" />
      </div>

      <div v-if="!isComplementaryFood" class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">奶量</label>
        <div class="mt-2 flex items-center gap-2">
          <WheelPicker v-model="amountMl" :options="Array.from({ length: 31 }, (_, i) => ({ label: `${i * 10} ml`, value: i * 10 }))" class="flex-1" />
        </div>
      </div>

      <div v-if="isMixed" class="bg-ios-card rounded-3xl p-4 shadow-card flex items-center gap-3">
        <div class="flex-1">
          <p class="text-sm font-medium text-ios-label">添加辅食</p>
          <p class="text-xs text-ios-secondary mt-0.5">选填，可同时记录本餐辅食</p>
        </div>
        <NSwitch v-model:value="addFoodToMixed" aria-label="添加辅食" />
      </div>

      <div v-if="showFoodPicker" class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">辅食{{ isComplementaryFood ? '（必选）' : '（选填）' }}</label>
        <NSelect v-model:value="foodIds" multiple filterable :options="foodOptions" placeholder="请选择辅食" class="mt-2" />
      </div>

      <div class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">备注</label>
        <NInput
          v-model:value="remark"
          type="textarea"
          :autosize="{ minRows: 2 }"
          placeholder="选填"
          class="mt-2"
        />
      </div>

      <button
        class="w-full py-3.5 rounded-2xl bg-ios-orange text-white font-semibold active:scale-95 transition-transform duration-150 disabled:opacity-60"
        :disabled="submitting"
        @click="onSubmit"
      >
        {{ submitting ? '保存中…' : '保存记录' }}
      </button>
    </div>
  </div>
</template>
