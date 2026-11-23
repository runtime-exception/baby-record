import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { sleepApi } from '@/api/sleep';
import type { SleepVo, SleepType } from '@baby-record/shared';
import { useBabyStore } from './baby';
import { useUserStore } from './user';

export const useRecordStore = defineStore('record', () => {
  const ongoingSleep = ref<SleepVo | null>(null);
  const submitting = ref(false);
  const babies = useBabyStore();
  let scope = 0;
  let activeCheck = 0;

  watch(() => babies.currentBabyId, () => {
    scope++;
    ongoingSleep.value = null;
    submitting.value = false;
  }, { flush: 'sync' });

  /** 检查是否有进行中的睡眠 */
  async function checkOngoing(babyId: string) {
    const previousScope = scope;
    const check = ++activeCheck;
    const res = await sleepApi.list({ babyId, ongoing: true, page: 1, pageSize: 1 });
    if (previousScope === scope && check === activeCheck && babyId === babies.currentBabyId) {
      ongoingSleep.value = res.list[0] || null;
    }
  }

  async function startSleep(sleepType?: SleepType) {
    const baby = useBabyStore().currentBaby;
    const user = useUserStore().currentUser;
    if (!baby || !user) throw new Error('缺少宝宝或记录人');
    const previousScope = scope;
    activeCheck++;
    submitting.value = true;
    try {
      const sleep = await sleepApi.start({ babyId: baby.id, sleepType, creatorId: user.id });
      if (previousScope === scope) ongoingSleep.value = sleep;
      return sleep;
    } finally {
      if (previousScope === scope) submitting.value = false;
    }
  }

  async function endSleep(remark?: string) {
    if (!ongoingSleep.value) return;
    const previousScope = scope;
    activeCheck++;
    submitting.value = true;
    try {
      const sleep = await sleepApi.end(ongoingSleep.value.id, { remark });
      if (previousScope === scope) ongoingSleep.value = null;
      return sleep;
    } finally {
      if (previousScope === scope) submitting.value = false;
    }
  }

  return { ongoingSleep, submitting, checkOngoing, startSleep, endSleep };
});
