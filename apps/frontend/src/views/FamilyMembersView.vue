<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { USER_ROLE_LABELS, type FamilyMember } from '@baby-record/shared';
import AppHeader from '@/components/AppHeader.vue';
import { familyApi } from '@/api/family';
import { useBabyStore } from '@/stores/baby';

const baby = computed(() => useBabyStore().currentBaby);
const members = ref<FamilyMember[]>([]);
const busy = ref(false);
async function refresh() {
  if (baby.value) members.value = await familyApi.members(baby.value.id);
}
onMounted(() => { void refresh().catch(() => {}); });

async function change(accountId: number, status: 'APPROVED' | 'REJECTED' | 'REMOVED') {
  if (!baby.value || busy.value) return;
  if (status === 'REMOVED' && !window.confirm('移除后，该成员将无法访问宝宝的资料和记录。确定移除？')) return;
  busy.value = true;
  try {
    if (status === 'REMOVED') await familyApi.remove(baby.value.id, accountId);
    else await familyApi.decide(baby.value.id, accountId, status);
    await refresh();
  } catch { /* 请求层显示错误 */ }
  finally { busy.value = false; }
}
</script>

<template>
  <div>
    <AppHeader title="家庭成员" show-back />
    <section class="space-y-3 px-5 py-4">
      <button class="text-sm text-ios-blue" @click="refresh">刷新成员与申请</button>
      <div v-for="member in members" :key="member.accountId" class="flex items-center justify-between rounded-3xl bg-ios-card p-4 shadow-card">
        <div>
          <p class="font-semibold">{{ member.name }} · {{ USER_ROLE_LABELS[member.role] }}</p>
          <p class="text-xs text-ios-secondary">{{ member.isAdmin ? '管理员' : member.status === 'PENDING' ? '等待审批' : '家庭成员' }}</p>
        </div>
        <div v-if="baby?.membership.isAdmin && !member.isAdmin" class="flex gap-3 text-sm">
          <button v-if="member.status === 'PENDING'" class="text-ios-blue" :disabled="busy" @click="change(member.accountId, 'APPROVED')">批准</button>
          <button v-if="member.status === 'PENDING'" class="text-ios-red" :disabled="busy" @click="change(member.accountId, 'REJECTED')">拒绝</button>
          <button v-else class="text-ios-red" :disabled="busy" @click="change(member.accountId, 'REMOVED')">移除</button>
        </div>
      </div>
    </section>
  </div>
</template>
