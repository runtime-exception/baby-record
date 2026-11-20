import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { authApi } from '@/api/auth';
import { useBabyStore } from './baby';

export const useAuthStore = defineStore('auth', () => {
  const authenticated = ref(false);
  const checked = ref(false);
  const checking = ref<Promise<boolean> | null>(null);

  const isAuthenticated = computed(() => authenticated.value);

  async function ensureChecked(): Promise<boolean> {
    if (checked.value) return authenticated.value;
    if (checking.value) return checking.value;
    checking.value = authApi.status()
      .then((result) => {
        authenticated.value = result.authenticated;
        checked.value = true;
        return authenticated.value;
      })
      .catch(() => {
        authenticated.value = false;
        checked.value = true;
        return false;
      })
      .finally(() => {
        checking.value = null;
      });
    return checking.value;
  }

  function acceptLogin() {
    useBabyStore().clear();
    authenticated.value = true;
    checked.value = true;
  }

  async function logout() {
    await authApi.logout();
    useBabyStore().clear();
    authenticated.value = false;
    checked.value = true;
  }

  return { authenticated, checked, isAuthenticated, ensureChecked, acceptLogin, logout };
});
