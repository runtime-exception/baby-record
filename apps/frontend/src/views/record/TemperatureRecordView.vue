<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAppFeedback } from '@/design-system/feedback';
import AppHeader from '@/components/AppHeader.vue';
import DateTimePicker from '@/components/form/DateTimePicker.vue';
import WheelPicker from '@/components/form/WheelPicker.vue';
import { temperatureApi } from '@/api/temperature';
import { useBabyStore } from '@/stores/baby';
import { useUserStore } from '@/stores/user';
import { useDashboardStore } from '@/stores/dashboard';

const router = useRouter();
const message = useAppFeedback();
const babyStore = useBabyStore();
const userStore = useUserStore();
const dashboardStore = useDashboardStore();
const time = ref(Date.now());
const integer = ref(36);
const decimal = ref(5);
const submitting = ref(false);
const integerOptions = Array.from({ length: 7 }, (_, offset) => {
  const value = 35 + offset;
  return { label: String(value), value, disabled: value < 36 };
});
const digitOptions = Array.from({ length: 10 }, (_, value) => ({ label: String(value), value }));
const temperature = computed(() => Number(`${integer.value}.${decimal.value}`));
const valid = computed(() => temperature.value >= 36 && temperature.value <= 41);

onMounted(async () => {
  const baby = babyStore.currentBaby;
  if (!baby) return;
  const latest = await temperatureApi.latest(baby.id);
  if (latest) {
    const [integerPart, fraction] = latest.temperature.toFixed(1).split('.');
    integer.value = Number(integerPart);
    decimal.value = Number(fraction);
  }
});

async function submit() {
  const baby = babyStore.currentBaby;
  const user = userStore.currentUser;
  if (!baby || !user || !valid.value) { message.warning('请选择 36.0℃ 至 41.0℃ 的有效体温'); return; }
  submitting.value = true;
  try {
    await temperatureApi.create({ babyId: baby.id, temperature: temperature.value, measureTime: new Date(time.value).toISOString(), creatorId: user.id });
    await dashboardStore.fetch(baby.id);
    message.success('体温记录已保存');
    router.push('/');
  } finally { submitting.value = false; }
}
</script>

<template>
  <div>
    <AppHeader title="记录体温" show-back />
    <div class="px-5 mt-4 space-y-3">
      <div class="bg-ios-card rounded-3xl p-5 shadow-card">
        <p class="text-sm font-medium text-ios-secondary">宝宝体温</p>
        <p class="text-4xl num-display font-bold text-ios-label text-center my-5">{{ temperature.toFixed(1) }}℃</p>
        <div class="grid grid-cols-2 gap-3">
          <WheelPicker v-model="integer" :options="integerOptions" />
          <WheelPicker v-model="decimal" :options="digitOptions" />
        </div>
        <p class="text-xs text-ios-secondary text-center mt-3">有效范围 36.0℃ - 41.0℃</p>
      </div>
      <div class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">测量时间</label>
        <DateTimePicker v-model="time" class="mt-2 w-full" />
      </div>
      <button class="w-full py-3.5 rounded-2xl bg-ios-pink text-white font-semibold disabled:opacity-60" :disabled="submitting || !valid" @click="submit">
        {{ submitting ? '保存中…' : '保存体温记录' }}
      </button>
    </div>
  </div>
</template>
