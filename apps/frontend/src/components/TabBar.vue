<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { HomeOutline, CreateOutline, StatsChartOutline, PersonOutline } from '@vicons/ionicons5';

const route = useRoute();
const router = useRouter();

const tabs = [
  { name: 'home', label: '首页', icon: HomeOutline, to: '/' },
  { name: 'record', label: '记录', icon: CreateOutline, to: '/record' },
  { name: 'statistics', label: '统计', icon: StatsChartOutline, to: '/statistics' },
  { name: 'profile', label: '我的', icon: PersonOutline, to: '/profile' },
];

const activeTab = computed(() => (route.meta.tab as string) || 'home');
</script>

<template>
  <nav
    class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app bg-ios-card/85 backdrop-blur-xl border-t border-ios-separator/60 safe-bottom z-20"
  >
    <div class="flex items-stretch justify-around px-2 pt-1.5 pb-1">
      <button
        v-for="t in tabs"
        :key="t.name"
        class="flex-1 flex flex-col items-center gap-0.5 py-1.5 transition-colors"
        :class="activeTab === t.name ? 'text-ios-blue' : 'text-ios-secondary'"
        @click="router.push(t.to)"
      >
        <component :is="t.icon" class="h-6 w-6 shrink-0" aria-hidden="true" />
        <span class="text-[10px] font-medium">{{ t.label }}</span>
      </button>
    </div>
  </nav>
</template>
