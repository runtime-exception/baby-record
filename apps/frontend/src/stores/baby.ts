import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { babyApi } from '@/api/baby';
import type { BabyVo, MemberBaby } from '@baby-record/shared';

import { setRequestBaby } from '@/utils/request';

const CURRENT_BABY_KEY = 'baby-record:currentBabyId';

export const useBabyStore = defineStore('baby', () => {
  const babies = ref<MemberBaby[]>([]);
  const currentBabyId = ref<number | null>(null);
  const loading = ref(false);

  const currentBaby = computed(() => babies.value.find((b) => b.id === currentBabyId.value) || null);

  let generation = 0;

  async function loadBabies() {
    const request = ++generation;
    loading.value = true;
    try {
      const next = await babyApi.list();
      if (request !== generation) return;
      babies.value = next;
      const saved = currentBabyId.value ?? Number(localStorage.getItem(CURRENT_BABY_KEY));
      const target = next.find((item) => item.id === saved) ?? next[0];
      select(target?.id ?? null);
    } finally {
      if (request === generation) loading.value = false;
    }
  }

  function select(id: number | null) {
    setRequestBaby(id);
    currentBabyId.value = id;
    if (id === null) localStorage.removeItem(CURRENT_BABY_KEY);
    else localStorage.setItem(CURRENT_BABY_KEY, String(id));
  }

  function setCurrentBaby(id: number) {
    if (babies.value.some((item) => item.id === id)) select(id);
  }

  function replaceBaby(baby: BabyVo) {
    const index = babies.value.findIndex((item) => item.id === baby.id);
    if (index >= 0) babies.value.splice(index, 1, { ...babies.value[index], ...baby });
  }

  function clear() {
    generation++;
    loading.value = false;
    babies.value = [];
    select(null);
    localStorage.removeItem('baby-record:currentUser');
  }

  return { babies, currentBabyId, currentBaby, loading, loadBabies, setCurrentBaby, replaceBaby, clear };
});
