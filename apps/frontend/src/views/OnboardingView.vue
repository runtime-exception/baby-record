<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();
async function logout() {
  await auth.logout();
  await router.replace('/login');
}
</script>

<template>
  <main class="min-h-screen bg-ios-bg px-5 py-16">
    <div class="mx-auto max-w-app space-y-4">
      <h1 class="text-2xl font-bold text-ios-label">宝宝成长记录</h1>
      <p class="text-sm text-ios-secondary">添加宝宝，或输入家人提供的宝宝 ID 申请绑定。</p>
      <RouterLink to="/baby/new" class="block rounded-3xl bg-ios-blue p-4 text-center text-white">添加宝宝</RouterLink>
      <RouterLink to="/family/bind" class="block rounded-3xl bg-ios-card p-4 text-center text-ios-blue shadow-card">绑定已有宝宝</RouterLink>
      <button class="w-full p-3 text-sm text-ios-secondary" @click="logout">退出登录</button>
    </div>
  </main>
</template>
