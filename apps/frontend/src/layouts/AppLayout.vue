<script setup lang="ts">
import { useBabyStore } from '@/stores/baby';
import TabBar from '@/components/TabBar.vue';
const babies = useBabyStore();
</script>

<template>
  <div class="min-h-screen w-full bg-shell flex justify-center">
    <div class="relative w-full max-w-app min-h-screen bg-ios-bg overflow-hidden">
      <main class="min-h-screen pb-24">
        <RouterView v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" :key="babies.currentBabyId" />
          </transition>
        </RouterView>
      </main>
      <TabBar />
    </div>
  </div>
</template>
