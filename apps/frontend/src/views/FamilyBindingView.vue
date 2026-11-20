<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { USER_ROLE_LABELS, type FamilyApplication, type UserRole } from '@baby-record/shared';
import AppHeader from '@/components/AppHeader.vue';
import { familyApi } from '@/api/family';
import { useBabyStore } from '@/stores/baby';
import { useAppFeedback } from '@/design-system/feedback';

const router = useRouter();
const babies = useBabyStore();
const feedback = useAppFeedback();
const applications = ref<FamilyApplication[]>([]);
const babyId = ref<number>();
const memberName = ref('');
const role = ref<UserRole>('DAD');
const code = ref('');
const claimMode = ref(false);
const busy = ref(false);
const labels = { PENDING: '等待审批', REJECTED: '已拒绝', REMOVED: '已移除' };

async function refresh() {
  applications.value = await familyApi.applications();
  await babies.loadBabies();
}
onMounted(() => { void refresh().catch(() => {}); });

async function submit() {
  if (busy.value || !babyId.value || !memberName.value.trim()) return;
  busy.value = true;
  try {
    const payload = { babyId: babyId.value, memberName: memberName.value.trim(), role: role.value };
    if (claimMode.value) {
      await familyApi.claim({ ...payload, code: code.value.trim() });
      await babies.loadBabies();
      babies.setCurrentBaby(payload.babyId);
      await router.replace('/profile');
    } else {
      await familyApi.apply(payload);
      feedback.success('申请已提交，请联系管理员查看');
      await refresh();
    }
  } catch { /* 请求层显示错误 */ }
  finally { busy.value = false; }
}
</script>

<template>
  <div>
    <AppHeader title="绑定已有宝宝" show-back />
    <div class="mx-auto max-w-app space-y-3 px-5 py-4">
      <form class="space-y-3 rounded-3xl bg-ios-card p-5 shadow-card" @submit.prevent="submit">
        <label class="block">宝宝 ID <input v-model.number="babyId" required class="mt-1 block w-full rounded-xl bg-ios-bg p-2" type="number" min="1" /></label>
        <label class="block">显示名称 <input v-model="memberName" required class="mt-1 block w-full rounded-xl bg-ios-bg p-2" maxlength="40" /></label>
        <label class="block">你的身份 <select v-model="role" class="mt-1 block w-full rounded-xl bg-ios-bg p-2">
          <option v-for="(label, key) in USER_ROLE_LABELS" :key="key" :value="key">{{ label }}</option>
        </select></label>
        <label class="flex items-center gap-2"><input v-model="claimMode" type="checkbox" /> 我有旧宝宝认领码</label>
        <label v-if="claimMode" class="block">一次性认领码 <input v-model="code" required maxlength="32" class="mt-1 block w-full rounded-xl bg-ios-bg p-2" /></label>
        <button class="w-full rounded-xl bg-ios-blue p-2 text-white" :disabled="busy">{{ claimMode ? '认领宝宝' : '提交申请' }}</button>
      </form>
      <div class="rounded-3xl bg-ios-card p-5 shadow-card">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">我的申请</h2>
          <button class="text-ios-blue" @click="refresh">刷新</button>
        </div>
        <p v-if="!applications.length" class="mt-2 text-sm text-ios-secondary">暂无待处理或已关闭的申请</p>
        <p v-for="item in applications" :key="item.babyId" class="mt-2 text-sm">宝宝 {{ item.babyId }} · {{ labels[item.status] }}</p>
        <RouterLink v-if="babies.currentBaby" to="/" class="mt-3 block text-ios-blue">返回首页</RouterLink>
      </div>
    </div>
  </div>
</template>
