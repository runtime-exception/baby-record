import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { dashboardApi } from '@/api/dashboard';
import { useBabyStore } from './baby';
import type { DashboardData } from '@baby-record/shared';

export const useDashboardStore = defineStore('dashboard', () => {
  const data = ref<DashboardData | null>(null);
  const loading = ref(false);

  const babies = useBabyStore();
  let generation = 0;

  watch(() => babies.currentBabyId, () => {
    generation++;
    data.value = null;
    loading.value = false;
  }, { flush: 'sync' });

  async function fetch(babyId: string) {
    if (babies.currentBabyId !== babyId) return;
    const request = ++generation;
    loading.value = true;
    try {
      const result = await dashboardApi.overview(babyId);
      if (request === generation) data.value = result;
    } finally {
      if (request === generation) loading.value = false;
    }
  }

  return { data, loading, fetch };
});
