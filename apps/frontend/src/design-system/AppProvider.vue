<script setup lang="ts">
import { computed } from 'vue';
import { App as KonstaApp } from 'konsta/vue';
import { useThemeStore } from '@/stores/theme';

const themeStore = useThemeStore();
const dark = computed(() => themeStore.isDark);
</script>

<template>
  <KonstaApp
    :theme="themeStore.uiTheme"
    :dark="dark"
    :safe-areas="true"
    class="min-h-screen"
  >
    <slot />
  </KonstaApp>
</template>
