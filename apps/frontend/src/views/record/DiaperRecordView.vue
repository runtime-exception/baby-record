<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAppFeedback } from '@/design-system/feedback';
import AppInput from '@/design-system/AppInput.vue';
import AppHeader from '@/components/AppHeader.vue';
import DateTimePicker from '@/components/form/DateTimePicker.vue';
import IconPicker from '@/components/form/IconPicker.vue';
import { diaperApi } from '@/api/diaper';
import { useBabyStore } from '@/stores/baby';
import { useUserStore } from '@/stores/user';
import { useDashboardStore } from '@/stores/dashboard';
import { ALL_DIAPER_TYPES, DIAPER_TYPE_LABELS, type DiaperType } from '@baby-record/shared';

const router = useRouter();
const message = useAppFeedback();
const babyStore = useBabyStore();
const userStore = useUserStore();
const dashStore = useDashboardStore();

const type = ref<DiaperType>('BOTH');
const time = ref(Date.now());
const remark = ref('');
const submitting = ref(false);

const typeOptions = ALL_DIAPER_TYPES.map((v) => ({
  label: DIAPER_TYPE_LABELS[v],
  value: v,
  icon: v === 'PEE' ? '💧' : v === 'POOP' ? '💩' : '💧💩',
}));

async function onSubmit() {
  const baby = babyStore.currentBaby;
  const user = userStore.currentUser;
  if (!baby || !user) {
    message.error('请先选择宝宝与身份');
    return;
  }
  submitting.value = true;
  try {
    await diaperApi.create({
      babyId: baby.id,
      type: type.value,
      changeTime: new Date(time.value).toISOString(),
      remark: remark.value || undefined,
      creatorId: user.id,
    });
    message.success('纸尿裤记录已保存');
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
    <AppHeader title="纸尿裤记录" show-back />
    <div class="px-5 mt-4 space-y-3">
      <div class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">时间</label>
        <DateTimePicker v-model="time" class="mt-2 w-full" />
      </div>

      <div class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">类型</label>
        <IconPicker v-model="type" :options="typeOptions" active-color="bg-ios-blue" class="mt-3" />
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
        class="w-full py-3.5 rounded-2xl bg-ios-blue text-white font-semibold active:scale-95 transition-transform duration-150 disabled:opacity-60"
        :disabled="submitting"
        @click="onSubmit"
      >
        {{ submitting ? '保存中…' : '保存记录' }}
      </button>
    </div>
  </div>
</template>
