import { defineStore } from 'pinia';
import { computed } from 'vue';
import type { CurrentUser } from '@baby-record/shared';
import { useBabyStore } from './baby';

export const useUserStore = defineStore('user', () => {
  const babies = useBabyStore();
  const currentUser = computed<CurrentUser | null>(() => {
    const member = babies.currentBaby?.membership;
    return member ? { id: member.creatorId, name: member.name, role: member.role } : null;
  });
  const hasIdentity = computed(() => currentUser.value !== null);
  return { currentUser, hasIdentity };
});
