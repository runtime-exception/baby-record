<script setup lang="ts">
import AppProvider from '@/design-system/AppProvider.vue';
import AppDialogHost from '@/design-system/AppDialogHost.vue';
import AppFeedbackHost from '@/design-system/AppFeedbackHost.vue';
</script>

<template>
  <AppProvider>
    <RouterView />
    <AppFeedbackHost />
    <AppDialogHost />
  </AppProvider>
</template>
