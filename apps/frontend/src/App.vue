<script setup lang="ts">
import { ref } from 'vue';
import router, { failedNavigation } from '@/router';
import AppProvider from '@/design-system/AppProvider.vue';
import AppDialogHost from '@/design-system/AppDialogHost.vue';
import AppFeedbackHost from '@/design-system/AppFeedbackHost.vue';

const retrying = ref(false);

async function retryNavigation() {
  if (!failedNavigation.value || retrying.value) return;
  retrying.value = true;
  try {
    await router.replace(failedNavigation.value);
  } finally {
    retrying.value = false;
  }
}
</script>

<template>
  <AppProvider>
    <main v-if="failedNavigation" class="flex min-h-screen items-center justify-center bg-ios-bg p-6">
      <section class="w-full max-w-sm rounded-3xl bg-ios-card p-6 text-center">
        <h1 class="text-xl font-semibold text-ios-label">宝宝档案加载失败</h1>
        <button class="mt-4 rounded-2xl bg-ios-blue px-5 py-2.5 text-white" :disabled="retrying" @click="retryNavigation">
          {{ retrying ? '加载中…' : '重新加载' }}
        </button>
      </section>
    </main>
    <RouterView v-else />
    <AppFeedbackHost />
    <AppDialogHost />
  </AppProvider>
</template>
