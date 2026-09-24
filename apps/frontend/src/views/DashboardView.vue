<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useBabyStore } from '@/stores/baby';
import { useDashboardStore } from '@/stores/dashboard';
import { useRecordStore } from '@/stores/record';
import StatCard from '@/components/StatCard.vue';
import QuickActionButton from '@/components/QuickActionButton.vue';
import { fmtTime, minutesToText } from '@/utils/format';
import { getTempStatus } from '@baby-record/shared';
import AppSheet from '@/design-system/AppSheet.vue';
import AppPullToRefresh from '@/design-system/AppPullToRefresh.vue';

const router = useRouter();
const babyStore = useBabyStore();
const dashStore = useDashboardStore();
const recordStore = useRecordStore();
const nowMs = ref(Date.now());
const showSleepAdvice = ref(false);
const showFeedingAdvice = ref(false);
const showAllergyDetail = ref(false);
let clockTimer: number | undefined;

const baby = computed(() => babyStore.currentBaby);
const loading = computed(() => babyStore.loading || (dashStore.loading && !dashStore.data));

async function refresh() {
  if (baby.value) {
    await Promise.all([
      dashStore.fetch(baby.value.id),
      recordStore.checkOngoing(baby.value.id),
    ]);
  }
}

function onVisibility() {
  // 多用户场景：切回页面时刷新首页状态（含进行中睡眠）
  if (document.visibilityState === 'visible') refresh();
}

onMounted(async () => {
  if (!babyStore.babies.length) {
    await babyStore.loadBabies();
  }
  await refresh();
  clockTimer = window.setInterval(() => {
    nowMs.value = Date.now();
  }, 30_000);
  document.addEventListener('visibilitychange', onVisibility);
});

onUnmounted(() => {
  if (clockTimer !== undefined) window.clearInterval(clockTimer);
  document.removeEventListener('visibilitychange', onVisibility);
});

const quickActions = [
  { icon: '🍚', label: '喂养', color: 'bg-ios-orange/15', to: '/record/feeding' },
  { icon: '🧷', label: '纸尿裤', color: 'bg-ios-blue/15', to: '/record/diaper' },
  { icon: '😴', label: '睡觉', color: 'bg-ios-purple/15', to: '/record/sleep' },
  { icon: '✨', label: '其他', color: 'bg-ios-green/15', to: '/record/activity' },
  { icon: '🌡️', label: '体温', color: 'bg-ios-pink/15', to: '/record/temperature' },
];

const latestTemperature = computed(() => dashStore.data?.latestTemperature || null);
const allergySummary = computed(() => dashStore.data?.foodAllergySummary ?? {
  allergic: [],
  possible: [],
  notAllergic: [],
});
const allergyHeadline = computed(() => {
  const { allergic, possible } = allergySummary.value;
  if (allergic.length) return `已发现 ${allergic.length} 种过敏辅食`;
  if (possible.length) return `暂未发现明确过敏辅食 · ${possible.length} 种待观察`;
  return '暂未发现过敏辅食';
});
/** 首页月龄旁展示的最新身高/体重（来自最近一次成长测量） */
const latestGrowth = computed(() => dashStore.data?.latestGrowth || null);
const growthSummary = computed(() => {
  const g = latestGrowth.value;
  if (!g) return null;
  const parts: string[] = [];
  if (g.height != null) parts.push(`📏 ${g.height.toFixed(1)}cm`);
  if (g.weight != null) parts.push(`⚖️ ${g.weight.toFixed(1)}kg`);
  return parts.length ? parts.join(' · ') : null;
});
const temperatureClass = computed(() => {
  if (!latestTemperature.value) return 'text-ios-secondary';
  return { normal: 'text-ios-green', watch: 'text-ios-orange', fever: 'text-ios-pink', high: 'text-black font-bold' }[getTempStatus(latestTemperature.value.temperature)];
});

const sleepCard = computed(() => {
  const prediction = dashStore.data?.wakePrediction;
  if (recordStore.ongoingSleep || prediction?.isSleeping) {
    const startTime = recordStore.ongoingSleep?.startTime;
    return {
      value: '睡眠中',
      accent: 'text-ios-purple',
      sub: startTime ? `从 ${fmtTime(startTime)} 开始睡眠` : '宝宝正在睡眠',
      statusLabel: '',
      statusClass: '',
    };
  }
  if (
    !prediction?.lastWakeTime ||
    !prediction.sleepWindowStart ||
    !prediction.recommendedSleepTime ||
    !prediction.maxAwakeUntil
  ) {
    return {
      value: '-',
      accent: 'text-ios-secondary',
      sub: '还没有完整的睡眠记录',
      statusLabel: '',
      statusClass: '',
    };
  }

  const awakeMinutes = Math.max(0, Math.floor((nowMs.value - new Date(prediction.lastWakeTime).getTime()) / 60_000));
  const windowStart = new Date(prediction.sleepWindowStart).getTime();
  const windowEnd = new Date(prediction.maxAwakeUntil).getTime();
  const beforeWindow = nowMs.value < windowStart;
  const withinWindow = nowMs.value <= windowEnd;
  const statusLabel = beforeWindow ? '（⚡ 精力充沛）' : withinWindow ? '（🌙 该哄睡了）' : '（😴 宝宝困了）';
  const statusClass = beforeWindow
    ? 'text-ios-green'
    : withinWindow
      ? 'text-ios-orange'
      : 'text-ios-red';

  return {
    value: minutesToText(awakeMinutes),
    accent: 'text-ios-purple',
    sub: `最近结束 ${fmtTime(prediction.lastWakeTime)} · 建议 ${fmtTime(prediction.recommendedSleepTime)} 哄睡`,
    statusLabel,
    statusClass,
  };
});

const sleepAdvice = computed(() => {
  const prediction = dashStore.data?.wakePrediction;
  if (
    !prediction?.lastWakeTime ||
    !prediction.sleepWindowStart ||
    !prediction.recommendedSleepTime ||
    !prediction.maxAwakeUntil
  ) return null;

  return {
    ageMonths: prediction.ageMonths,
    lastWakeTime: fmtTime(prediction.lastWakeTime),
    windowStart: fmtTime(prediction.sleepWindowStart),
    recommendedTime: fmtTime(prediction.recommendedSleepTime),
    windowEnd: fmtTime(prediction.maxAwakeUntil),
    wakeDuration: `${minutesToText(prediction.recommendedWakeMinutes)}–${minutesToText(prediction.maxWakeMinutes)}`,
    sourceUrl: prediction.sourceUrl,
  };
});

const feedingAdvice = computed(() => {
  const s = dashStore.data?.feedingSuggestion;
  if (!s) return null;
  const isBreast = s.lastFeedingType === 'BREAST_MILK';
  const perFeedText =
    s.perFeedMinMl != null && s.perFeedMaxMl != null ? `${s.perFeedMinMl}–${s.perFeedMaxMl}ml` : null;
  return {
    lastFeedTime: fmtTime(s.lastFeedTime),
    recommendedTime: fmtTime(s.recommendedNextFeedTime),
    intervalText: s.intervalRangeText,
    ageMonths: s.ageMonths,
    isBreast,
    perFeedText,
    dailyAmountText: s.dailyAmountMl != null ? `${s.dailyAmountMl}ml` : null,
    feedingCount: s.feedingCount,
    lastAmountText: s.lastAmountMl != null ? `${s.lastAmountMl}ml` : null,
    sourceUrl: s.sourceUrl,
  };
});
</script>

<template>
  <AppPullToRefresh @refresh="refresh">
  <div>
  <div v-if="loading && !baby" class="px-5 pt-14 safe-top animate-fade-in">
    <div class="flex items-center gap-3 mb-5">
      <div class="w-14 h-14 rounded-full bg-ios-fill/60 animate-pulse" />
      <div class="flex-1">
        <div class="h-5 bg-ios-fill/60 rounded-lg animate-pulse mb-2 w-24" />
        <div class="h-3.5 bg-ios-fill/60 rounded animate-pulse w-36" />
      </div>
    </div>
    <div class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-[110px] bg-ios-fill/60 rounded-3xl animate-pulse" />
    </div>
  </div>

  <div v-else-if="!baby" class="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
    <div class="text-5xl mb-3">👶</div>
    <p class="text-ios-label font-medium">还没有宝宝信息</p>
    <p class="text-sm text-ios-secondary mt-1">请在「我的」页面添加宝宝</p>
  </div>

  <div v-else class="animate-fade-in">
    <!-- 宝宝 Header -->
    <header class="px-5 pt-14 pb-2 safe-top">
      <div class="flex items-center gap-3">
        <div
          class="w-14 h-14 rounded-full bg-gradient-to-br from-ios-blue to-ios-teal flex items-center justify-center text-3xl shadow-soft"
        >
          <img v-if="baby.avatar" :src="baby.avatar" alt="宝宝头像" class="w-full h-full rounded-full object-cover" />
          <template v-else>👶</template>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-ios-label">{{ baby.nickname || baby.name }}</h1>
          <p class="text-sm text-ios-secondary mt-0.5">
            {{ baby.age.monthAgeText }}<template v-if="growthSummary"> · {{ growthSummary }}</template>
          </p>
        </div>
      </div>
    </header>

    <!-- 状态卡片 -->
    <section class="px-5 mt-4 space-y-3">
      <StatCard
        icon="🍼"
        title="距离上次喂养"
        :value="dashStore.data?.feeding.text || '-'"
        accent="text-ios-orange"
        action-label="记录"
        action-class="text-ios-orange"
        :sub="
          dashStore.data?.feeding.lastTime
            ? `最近 ${fmtTime(dashStore.data.feeding.lastTime)}`
            : '今天还没有喂养记录'
        "
        @action="router.push('/record/feeding')"
      >
        <template v-if="feedingAdvice" #sub>
          <span>最近 {{ feedingAdvice.lastFeedTime }} · </span>
          <button
            type="button"
            class="font-bold text-black dark:text-white underline decoration-dotted underline-offset-2 active:opacity-60"
            @click="showFeedingAdvice = true"
          >
            建议 {{ feedingAdvice.recommendedTime }} 喂养
          </button>
          <span v-if="feedingAdvice.perFeedText"> · 约{{ feedingAdvice.perFeedText }}</span>
        </template>
      </StatCard>
      <StatCard
        icon="🧷"
        title="距离上次换纸尿裤"
        :value="dashStore.data?.diaper.text || '-'"
        accent="text-ios-blue"
        action-label="记录"
        action-class="text-ios-blue"
        :sub="
          dashStore.data?.diaper.lastTime
            ? `最近 ${fmtTime(dashStore.data.diaper.lastTime)}`
            : '今天还没有更换记录'
        "
        @action="router.push('/record/diaper')"
      />
      <StatCard
        icon="😴"
        title="距上次睡觉"
        :value="sleepCard.value"
        :accent="sleepCard.accent"
        :sub="sleepCard.sub"
        action-label="记录"
        action-class="text-ios-purple"
        @action="router.push('/record/sleep')"
      >
        <template #value>
          <span class="flex items-baseline gap-2 whitespace-nowrap">
            <span>{{ sleepCard.value }}</span>
            <span
              v-if="sleepCard.statusLabel"
              class="text-base font-bold shrink-0"
              :class="sleepCard.statusClass"
            >
              {{ sleepCard.statusLabel }}
            </span>
          </span>
        </template>
        <template v-if="sleepAdvice" #sub>
          <span>最近结束 {{ sleepAdvice.lastWakeTime }} · </span>
          <button
            type="button"
            class="font-bold text-black dark:text-white underline decoration-dotted underline-offset-2 active:opacity-60"
            @click="showSleepAdvice = true"
          >
            建议 {{ sleepAdvice.recommendedTime }} 哄睡
          </button>
        </template>
      </StatCard>
      <div class="bg-ios-card rounded-3xl p-5 shadow-card animate-slide-up">
        <div class="flex items-center gap-2">
          <div class="flex flex-1 items-center gap-2">
            <span class="text-xl">🌡️</span>
            <span class="text-sm font-medium text-ios-secondary">宝宝最新体温</span>
          </div>
          <button
            type="button"
            class="text-sm font-medium text-ios-pink active:opacity-60"
            @click="router.push('/record/temperature')"
          >
            记录
          </button>
        </div>
        <p
          v-if="latestTemperature"
          class="mt-3 text-3xl font-bold num-display"
          :class="temperatureClass"
        >
          {{ latestTemperature.temperature.toFixed(1) }}℃
        </p>
        <p v-else class="mt-3 text-sm text-ios-secondary">暂无体温记录</p>
        <div
          v-if="latestTemperature && latestTemperature.temperature > 37.2"
          class="mt-3 rounded-2xl bg-ios-orange/10 p-3 text-sm text-ios-orange"
        >
          <p class="font-semibold">宝宝体温需要关注</p>
          <p class="text-xs mt-1">请在宝宝平稳状态下进行测量</p>
        </div>
      </div>
    </section>

    <!-- 辅食排敏摘要 -->
    <section class="px-5 mt-7">
      <button
        class="w-full bg-ios-card rounded-3xl p-5 shadow-card text-left active:scale-[0.98] transition-transform"
        @click="showAllergyDetail = true"
      >
        <div class="flex items-center gap-3">
          <span class="text-2xl">🥣</span>
          <div class="flex-1">
            <p class="text-sm font-semibold text-ios-label">宝宝辅食排敏</p>
            <p class="mt-1 text-sm" :class="allergySummary.allergic.length ? 'text-ios-pink font-semibold' : 'text-ios-secondary'">{{ allergyHeadline }}</p>
          </div>
          <span class="text-xl text-ios-secondary">›</span>
        </div>
      </button>
    </section>

    <!-- 快捷操作 -->
    <section class="px-5 mt-7">
      <h2 class="text-sm font-semibold text-ios-secondary mb-3 px-1">快捷操作</h2>
      <div class="bg-ios-card rounded-3xl p-4 shadow-card grid grid-cols-5 gap-2">
        <QuickActionButton
          v-for="a in quickActions"
          :key="a.label"
          :icon="a.icon"
          :label="a.label"
          :color="a.color"
          @click="router.push(a.to)"
        />
      </div>
    </section>

    <!-- 历史记录入口 -->
    <section class="px-5 mt-4">
      <button
        class="w-full bg-ios-card rounded-3xl p-4 shadow-card flex items-center gap-3 active:scale-[0.98] transition-transform"
        @click="router.push('/history')"
      >
        <span class="text-2xl">📋</span>
        <div class="flex-1 text-left">
          <p class="text-sm font-semibold text-ios-label">历史记录</p>
          <p class="text-xs text-ios-secondary">查看每天喂养 / 睡眠 / 护理时间轴</p>
        </div>
        <span class="text-ios-secondary text-xl">›</span>
      </button>
    </section>
  </div>

  <AppSheet
    :open="showAllergyDetail"
    title="宝宝辅食排敏情况"
    panel-class="bg-ios-bg rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto no-scrollbar safe-bottom"
    @close="showAllergyDetail = false"
  >
    <div class="space-y-5 text-ios-label">
      <section>
        <h3 class="text-sm font-bold text-ios-pink">过敏辅食</h3>
        <div v-if="allergySummary.allergic.length" class="mt-2 space-y-2">
          <div v-for="item in allergySummary.allergic" :key="item.foodId" class="rounded-2xl bg-ios-pink/10 p-3">
            <p class="font-semibold">{{ item.foodName }}</p>
            <p class="mt-1 text-sm font-semibold text-ios-pink">{{ item.symptoms.length ? item.symptoms.join('、') : '用户最终判断为过敏' }}</p>
          </div>
        </div>
        <p v-else class="mt-2 text-sm text-ios-secondary">暂未发现</p>
      </section>

      <section>
        <h3 class="text-sm font-bold text-ios-orange">可能过敏 / 待观察</h3>
        <div v-if="allergySummary.possible.length" class="mt-2 space-y-2">
          <div v-for="item in allergySummary.possible" :key="item.foodId" class="rounded-2xl bg-ios-orange/10 p-3">
            <p class="font-semibold">{{ item.foodName }}</p>
            <p v-if="item.symptoms.length" class="mt-1 text-xs text-ios-orange">{{ item.symptoms.join('、') }}</p>
          </div>
        </div>
        <p v-else class="mt-2 text-sm text-ios-secondary">暂无待观察辅食</p>
      </section>

      <section>
        <h3 class="text-sm font-bold text-ios-green">不过敏辅食</h3>
        <div v-if="allergySummary.notAllergic.length" class="mt-2 flex flex-wrap gap-2">
          <span v-for="item in allergySummary.notAllergic" :key="item.foodId" class="rounded-xl bg-ios-green/10 px-3 py-1.5 text-sm text-ios-green">{{ item.foodName }}</span>
        </div>
        <p v-else class="mt-2 text-sm text-ios-secondary">暂无已确认记录</p>
      </section>

      <button class="w-full rounded-2xl bg-ios-orange py-3 font-semibold text-white" @click="showAllergyDetail = false; router.push('/record/food-allergy')">新增排敏记录</button>
    </div>
  </AppSheet>

  <AppSheet
    :open="showSleepAdvice"
    title="哄睡时间建议"
    panel-class="bg-ios-bg rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto no-scrollbar safe-bottom"
    @close="showSleepAdvice = false"
  >
    <div v-if="sleepAdvice" class="space-y-4 text-ios-label">
      <div class="rounded-2xl bg-ios-fill/40 p-4 text-center">
        <p class="text-xs text-ios-secondary">本次建议哄睡时间</p>
        <p class="mt-1 text-3xl font-bold num-display text-black dark:text-white">
          {{ sleepAdvice.recommendedTime }}
        </p>
        <p class="mt-1 text-sm text-ios-secondary">
          建议范围 {{ sleepAdvice.windowStart }}–{{ sleepAdvice.windowEnd }}
        </p>
      </div>

      <div class="divide-y divide-ios-separator/60 rounded-2xl bg-ios-card">
        <div class="flex items-center justify-between gap-4 py-3">
          <span class="text-sm text-ios-secondary">宝宝月龄</span>
          <span class="text-sm font-medium">{{ sleepAdvice.ageMonths }} 个月</span>
        </div>
        <div class="flex items-center justify-between gap-4 py-3">
          <span class="text-sm text-ios-secondary">最近睡眠结束</span>
          <span class="text-sm font-medium num-display">{{ sleepAdvice.lastWakeTime }}</span>
        </div>
        <div class="flex items-center justify-between gap-4 py-3">
          <span class="text-sm text-ios-secondary">参考清醒时长</span>
          <span class="text-sm font-medium">{{ sleepAdvice.wakeDuration }}</span>
        </div>
        <div class="flex items-center justify-between gap-4 py-3">
          <span class="text-sm text-ios-secondary">推荐计算方式</span>
          <span class="text-sm font-medium">清醒区间中点</span>
        </div>
      </div>

      <div class="rounded-2xl bg-ios-blue/10 p-4">
        <p class="text-sm font-semibold text-ios-label">参考来源</p>
        <a
          :href="sleepAdvice.sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-1 inline-block text-sm font-medium text-ios-blue underline underline-offset-2"
        >
          CHOC Children's Health：Babies and sleep ↗
        </a>
      </div>

      <p class="text-xs leading-5 text-ios-secondary">
        清醒窗口是按月龄估算的日常参考，不同宝宝和同一宝宝每天的睡眠需求都可能不同，请优先观察打哈欠、揉眼和活动减少等困倦信号。
      </p>
    </div>
  </AppSheet>

  <AppSheet
    :open="showFeedingAdvice"
    title="喂养建议"
    panel-class="bg-ios-bg rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto no-scrollbar safe-bottom"
    @close="showFeedingAdvice = false"
  >
    <div v-if="feedingAdvice" class="space-y-4 text-ios-label">
      <div class="rounded-2xl bg-ios-fill/40 p-4 text-center">
        <p class="text-xs text-ios-secondary">本次建议喂养时间</p>
        <p class="mt-1 text-3xl font-bold num-display text-black dark:text-white">
          {{ feedingAdvice.recommendedTime }}
        </p>
        <p class="mt-1 text-sm text-ios-secondary">
          参考间隔 {{ feedingAdvice.intervalText }}
        </p>
      </div>

      <div v-if="feedingAdvice.isBreast" class="rounded-2xl bg-ios-orange/10 p-4 text-sm text-ios-orange">
        <p class="font-semibold">母乳提倡按需喂养</p>
        <p class="text-xs mt-1">通常每天 8~12 次，观察宝宝的饥饿信号即可，无需严格卡时间。</p>
      </div>

      <div class="divide-y divide-ios-separator/60 rounded-2xl bg-ios-card">
        <div class="flex items-center justify-between gap-4 py-3">
          <span class="text-sm text-ios-secondary">宝宝月龄</span>
          <span class="text-sm font-medium">{{ feedingAdvice.ageMonths }} 个月</span>
        </div>
        <div class="flex items-center justify-between gap-4 py-3">
          <span class="text-sm text-ios-secondary">最近喂养</span>
          <span class="text-sm font-medium num-display">{{ feedingAdvice.lastFeedTime }}</span>
        </div>
        <div class="flex items-center justify-between gap-4 py-3">
          <span class="text-sm text-ios-secondary">参考间隔</span>
          <span class="text-sm font-medium">{{ feedingAdvice.intervalText }}</span>
        </div>
        <template v-if="!feedingAdvice.isBreast">
          <div class="flex items-center justify-between gap-4 py-3">
            <span class="text-sm text-ios-secondary">建议奶量</span>
            <span class="text-sm font-medium">{{ feedingAdvice.perFeedText }}</span>
          </div>
          <div class="flex items-center justify-between gap-4 py-3">
            <span class="text-sm text-ios-secondary">每日喂养次数</span>
            <span class="text-sm font-medium">约 {{ feedingAdvice.feedingCount }} 次</span>
          </div>
          <div class="flex items-center justify-between gap-4 py-3">
            <span class="text-sm text-ios-secondary">每日参考总量</span>
            <span class="text-sm font-medium">{{ feedingAdvice.dailyAmountText }}</span>
          </div>
          <div v-if="feedingAdvice.lastAmountText" class="flex items-center justify-between gap-4 py-3">
            <span class="text-sm text-ios-secondary">上次奶量</span>
            <span class="text-sm font-medium">{{ feedingAdvice.lastAmountText }}</span>
          </div>
        </template>
      </div>

      <div class="rounded-2xl bg-ios-blue/10 p-4">
        <p class="text-sm font-semibold text-ios-label">参考来源</p>
        <a
          :href="feedingAdvice.sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-1 inline-block text-sm font-medium text-ios-blue underline underline-offset-2"
        >
          AAP Healthychildren：How Often and How Much Should Your Baby Eat? ↗
        </a>
      </div>

      <p class="text-xs leading-5 text-ios-secondary">
        喂养间隔和奶量按月龄估算，仅供参考。不同宝宝和同一宝宝每天的奶量都可能不同，母乳提倡按需喂养，请优先观察宝宝的饥饿信号，必要时咨询儿科医生。
      </p>
    </div>
  </AppSheet>
  </div>
  </AppPullToRefresh>
</template>
