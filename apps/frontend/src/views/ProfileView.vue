<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAppFeedback } from '@/design-system/feedback';
import AppToggle from '@/design-system/AppToggle.vue';
import { EyeOutline } from '@vicons/ionicons5';
import { babyApi } from '@/api/baby';
import { useRouter } from 'vue-router';
import AppHeader from '@/components/AppHeader.vue';
import TypeSegment from '@/components/form/TypeSegment.vue';
import { useUserStore } from '@/stores/user';
import { useBabyStore } from '@/stores/baby';
import { useThemeStore } from '@/stores/theme';
import { useAuthStore } from '@/stores/auth';
import type { ThemeMode, UiTheme } from '@/stores/theme';
import { GENDER_LABELS, USER_ROLE_LABELS } from '@baby-record/shared';

const userStore = useUserStore();
const babyStore = useBabyStore();
const themeStore = useThemeStore();
const authStore = useAuthStore();
const router = useRouter();
const message = useAppFeedback();
const avatarInput = ref<HTMLInputElement | null>(null);

const themeOptions: { label: string; value: ThemeMode }[] = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'auto' },
];
const uiThemeOptions: { label: string; value: UiTheme }[] = [
  { label: 'iOS', value: 'ios' },
  { label: 'Material', value: 'material' },
];
const uiTheme = computed({
  get: () => themeStore.uiTheme,
  set: (value: UiTheme) => themeStore.setUiTheme(value),
});
const themeMode = computed({
  get: () => themeStore.mode,
  set: (v: ThemeMode) => themeStore.setMode(v),
});
const seniorMode = computed({
  get: () => themeStore.seniorMode,
  set: (enabled: boolean) => themeStore.setSeniorMode(enabled),
});

const baby = computed(() => babyStore.currentBaby);
const user = computed(() => userStore.currentUser);
const babies = computed(() => babyStore.babies);

function selectBaby(id: number) {
  babyStore.setCurrentBaby(id);
}

async function chooseAvatar(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !baby.value) return;
  if (!file.type.startsWith('image/')) { message.warning('请选择图片文件'); return; }
  if (file.size > 8 * 1024 * 1024) { message.warning('头像图片请小于 8MB'); return; }
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const updated = await babyApi.update(baby.value!.id, { avatar: String(reader.result) });
      babyStore.replaceBaby(updated);
      message.success('头像已更新');
    } catch { /* 请求层已提示 */ }
  };
  reader.readAsDataURL(file);
  (event.target as HTMLInputElement).value = '';
}

async function logout() {
  await authStore.logout();
  userStore.clearUser();
  await router.replace('/login');
}
</script>

<template>
  <div>
    <AppHeader title="我的" subtitle="宝宝档案与设置" />

    <!-- 宝宝主卡片 -->
    <section v-if="baby" class="px-5 mt-4">
      <div class="bg-gradient-to-br from-ios-blue to-ios-teal rounded-3xl p-5 shadow-soft text-white">
        <div class="flex items-center gap-3">
          <button class="relative w-16 h-16 rounded-full bg-white/25 flex items-center justify-center text-4xl overflow-hidden" @click="avatarInput?.click()">
            <img v-if="baby.avatar" :src="baby.avatar" alt="宝宝头像" class="w-full h-full object-cover" />
            <template v-else>👶</template>
            <span class="absolute bottom-0 inset-x-0 text-[10px] leading-4 bg-black/30">更换</span>
          </button>
          <input ref="avatarInput" type="file" accept="image/*" capture="user" class="hidden" @change="chooseAvatar" />
          <div class="flex-1">
            <h2 class="text-xl font-bold">{{ baby.name }}</h2>
            <p v-if="baby.nickname" class="text-sm text-white/80">{{ baby.nickname }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs bg-white/25 px-2.5 py-1 rounded-full">
              {{ GENDER_LABELS[baby.gender] }}
            </span>
            <button
              class="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center text-sm active:scale-90 transition"
              @click="router.push('/baby/edit')"
            >
              ✎
            </button>
          </div>
        </div>
        <div class="mt-4 flex items-end gap-1">
          <span class="num-display text-4xl font-bold">{{ baby.age.totalMonths }}</span>
          <span class="text-sm text-white/80 mb-1">个月{{ baby.age.days }}天</span>
        </div>
        <p class="text-xs text-white/70 mt-1">
          出生 {{ baby.birthday }} · 共 {{ baby.age.totalDays }} 天
        </p>
      </div>
    </section>

    <!-- 多宝宝切换 -->
    <section v-if="babies.length > 1" class="px-5 mt-4">
      <h2 class="text-sm font-semibold text-ios-secondary mb-2 px-1">切换宝宝</h2>
      <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          v-for="b in babies"
          :key="b.id"
          class="shrink-0 px-4 py-2 rounded-2xl text-sm font-medium transition shadow-card"
          :class="
            b.id === babyStore.currentBabyId
              ? 'bg-ios-blue text-white'
              : 'bg-ios-card text-ios-secondary'
          "
          @click="selectBaby(b.id)"
        >
          {{ b.nickname || b.name }}
        </button>
      </div>
    </section>

    <!-- 当前记录人 -->
    <section v-if="user" class="px-5 mt-4">
      <h2 class="text-sm font-semibold text-ios-secondary mb-2 px-1">当前记录人</h2>
      <div class="bg-ios-card rounded-3xl p-4 shadow-card flex items-center gap-3">
        <div class="w-11 h-11 rounded-full bg-ios-blue/15 flex items-center justify-center text-xl">
          {{ ['DAD', 'GRANDPA_P', 'GRANDPA_M'].includes(user.role) ? '👨' : '👩' }}
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold text-ios-label">{{ user.name }}</p>
          <p class="text-xs text-ios-secondary">{{ USER_ROLE_LABELS[user.role] }}</p>
        </div>
      </div>
    </section>

    <!-- 外观 -->
    <section class="px-5 mt-4">
      <h2 class="text-sm font-semibold text-ios-secondary mb-2 px-1">辅食</h2>
      <button
        class="w-full bg-ios-card rounded-3xl p-4 shadow-card flex items-center gap-3 active:scale-[0.98] transition-transform"
        @click="router.push('/profile/foods')"
      >
        <span class="text-2xl">🥣</span>
        <div class="flex-1 text-left">
          <p class="text-sm font-semibold text-ios-label">辅食管理</p>
          <p class="text-xs text-ios-secondary mt-0.5">维护喂养与排敏时可选的辅食</p>
        </div>
        <span class="text-ios-secondary text-xl">›</span>
      </button>
    </section>

    <!-- 外观 -->
    <section class="px-5 mt-4">
      <h2 class="text-sm font-semibold text-ios-secondary mb-2 px-1">外观</h2>
      <div class="bg-ios-card rounded-3xl p-4 shadow-card">
        <p class="mb-2 text-xs font-medium text-ios-secondary">界面主题</p>
        <TypeSegment v-model="uiTheme" :options="uiThemeOptions" />
      </div>
      <div class="bg-ios-card rounded-3xl p-4 shadow-card mt-3">
        <p class="mb-2 text-xs font-medium text-ios-secondary">明暗模式</p>
        <TypeSegment v-model="themeMode" :options="themeOptions" />
      </div>
      <div class="bg-ios-card rounded-3xl p-4 shadow-card flex items-center gap-3 mt-3">
        <div class="w-11 h-11 rounded-2xl bg-ios-orange/15 text-ios-orange flex items-center justify-center">
          <EyeOutline class="h-6 w-6 shrink-0" aria-hidden="true" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-ios-label">老年人模式</p>
          <p class="text-xs text-ios-secondary mt-0.5">放大文字和按钮，提高阅读清晰度</p>
        </div>
        <AppToggle v-model:value="seniorMode" aria-label="老年人模式" />
      </div>
    </section>

    <!-- 出生信息 -->
    <section v-if="baby" class="px-5 mt-4">
      <h2 class="text-sm font-semibold text-ios-secondary mb-2 px-1">出生信息</h2>
      <div class="bg-ios-card rounded-3xl shadow-card divide-y divide-ios-separator/60">
        <div class="flex justify-between px-5 py-3.5">
          <span class="text-sm text-ios-secondary">出生日期</span>
          <span class="text-sm font-medium text-ios-label">{{ baby.birthday }}</span>
        </div>
        <div class="flex justify-between px-5 py-3.5">
          <span class="text-sm text-ios-secondary">年龄</span>
          <span class="text-sm font-medium text-ios-label">{{ baby.age.ageText }}</span>
        </div>
        <div class="flex justify-between px-5 py-3.5">
          <span class="text-sm text-ios-secondary">出生体重</span>
          <span class="text-sm font-medium text-ios-label">
            {{ baby.birthWeight != null ? baby.birthWeight + ' kg' : '-' }}
          </span>
        </div>
        <div class="flex justify-between px-5 py-3.5">
          <span class="text-sm text-ios-secondary">出生身高</span>
          <span class="text-sm font-medium text-ios-label">
            {{ baby.birthHeight != null ? baby.birthHeight + ' cm' : '-' }}
          </span>
        </div>
        <div class="flex justify-between px-5 py-3.5">
          <span class="text-sm text-ios-secondary">头围</span>
          <span class="text-sm font-medium text-ios-label">
            {{ baby.headCircumference != null ? baby.headCircumference + ' cm' : '-' }}
          </span>
        </div>
        <div class="flex justify-between px-5 py-3.5">
          <span class="text-sm text-ios-secondary">出生医院</span>
          <span class="text-sm font-medium text-ios-label">{{ baby.birthHospital || '-' }}</span>
        </div>
      </div>
      <p v-if="baby.remark" class="text-xs text-ios-secondary mt-3 px-1">{{ baby.remark }}</p>
    </section>

    <!-- 新增宝宝 -->
    <section class="px-5 mt-4">
      <button
        class="w-full py-3.5 rounded-2xl bg-ios-card text-ios-blue font-semibold shadow-card active:scale-95 transition-transform"
        @click="router.push('/baby/new')"
      >
        + 新增宝宝
      </button>
    </section>

    <section class="px-5 mt-4">
      <button
        class="w-full py-3.5 rounded-2xl bg-ios-card text-ios-pink font-semibold shadow-card active:scale-95 transition-transform"
        @click="logout"
      >
        退出登录
      </button>
    </section>

    <div class="h-4" />
  </div>
</template>
