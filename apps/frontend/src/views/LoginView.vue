<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi, type WebChallenge } from '@/api/auth';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const challenge = ref<WebChallenge | null>(null);
const loading = ref(false);
const status = ref('');
let timer: ReturnType<typeof setTimeout> | undefined;
let generation = 0;

function stop() {
  clearTimeout(timer);
  generation++;
}

async function cancel() {
  const scene = challenge.value?.scene;
  stop();
  challenge.value = null;
  if (scene) await authApi.cancel(scene).catch(() => {});
}

async function start() {
  if (loading.value) return;
  loading.value = true;
  await cancel();
  status.value = '';
  const current = generation;
  try {
    const next = await authApi.start();
    if (current !== generation) {
      void authApi.cancel(next.scene).catch(() => {});
      return;
    }
    challenge.value = next;
    const expiry = Date.now() + next.expiresIn * 1000;
    async function poll() {
      if (current !== generation) return;
      const result = await authApi.exchange(next.scene).catch(() => null);
      if (current !== generation) return;
      if (result?.status === 'APPROVED') {
        challenge.value = null;
        auth.acceptLogin();
        const target = route.query.redirect;
        await router.replace(typeof target === 'string' && /^\/(?![/\\])/.test(target) ? target : '/');
      } else if (result?.status === 'EXPIRED' || Date.now() >= expiry) {
        challenge.value = null;
        status.value = '二维码已过期，请重新生成';
      } else {
        timer = setTimeout(poll, 1500);
      }
    }
    timer = setTimeout(poll, 1000);
  } catch {
    status.value = '暂时无法生成二维码，请重试';
  } finally {
    loading.value = false;
  }
}

onBeforeUnmount(() => { void cancel(); });
</script>

<template>
  <main class="min-h-screen bg-ios-bg flex items-center justify-center px-5">
    <div class="w-full max-w-sm rounded-3xl bg-ios-card p-6 text-center shadow-card">
      <div class="text-4xl" aria-hidden="true">👶</div>
      <h1 class="mt-3 text-xl font-bold text-ios-label">宝宝成长记录</h1>
      <p class="mt-2 text-sm text-ios-secondary">使用微信扫一扫，在小程序中确认登录</p>
      <img v-if="challenge" :src="challenge.qrCode" class="mx-auto mt-4 h-44 w-44" alt="小程序登录码" />
      <p v-if="challenge" class="mt-2 text-sm text-ios-label">确认码 {{ challenge.verificationCode }}</p>
      <p v-if="status" class="mt-3 text-sm text-ios-secondary" role="status">{{ status }}</p>
      <div class="mt-5 flex justify-center gap-3">
        <button class="rounded-2xl bg-ios-blue px-4 py-2 text-white" :disabled="loading" @click="start">
          {{ loading ? '生成中…' : challenge ? '刷新二维码' : '获取登录二维码' }}
        </button>
        <button v-if="challenge" class="rounded-2xl bg-ios-bg px-4 py-2" @click="cancel">取消</button>
      </div>
    </div>
  </main>
</template>
