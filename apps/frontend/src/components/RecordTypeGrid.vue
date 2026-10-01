<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const items = [
  {
    icon: '🍚',
    label: '喂养',
    desc: '母乳 / 奶粉 / 辅食',
    color: 'from-ios-orange/20 to-ios-orange/5',
    to: '/record/feeding',
  },
  {
    icon: '🧷',
    label: '纸尿裤',
    desc: '尿 / 便便 / 尿+便',
    color: 'from-ios-blue/20 to-ios-blue/5',
    to: '/record/diaper',
  },
  {
    icon: '😴',
    label: '睡眠',
    desc: '开始 / 结束睡觉',
    color: 'from-ios-purple/20 to-ios-purple/5',
    to: '/record/sleep',
  },
  {
    icon: '✨',
    label: '其他',
    desc: '补剂 / 运动 / 成长…',
    color: 'from-ios-green/20 to-ios-green/5',
    to: '/record/activity',
  },
];
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <button
      v-for="i in items"
      :key="i.label"
      class="bg-gradient-to-br rounded-3xl p-5 h-36 flex flex-col items-start justify-between shadow-card active:scale-95 transition-transform duration-150 text-left"
      :class="i.color"
      @click="router.push(i.to)"
    >
      <span class="text-4xl">{{ i.icon }}</span>
      <div>
        <p class="text-lg font-bold text-ios-label">{{ i.label }}</p>
        <p class="text-xs text-ios-secondary mt-0.5">{{ i.desc }}</p>
      </div>
    </button>
  </div>
</template>
