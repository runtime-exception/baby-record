<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { NDatePicker, useDialog, useMessage } from 'naive-ui';
import AppHeader from '@/components/AppHeader.vue';
import EditRecordModal from '@/components/EditRecordModal.vue';
import { recordApi } from '@/api/record';
import { feedingApi } from '@/api/feeding';
import { diaperApi } from '@/api/diaper';
import { sleepApi } from '@/api/sleep';
import { supplementApi } from '@/api/supplement';
import { activityApi } from '@/api/activity';
import { temperatureApi } from '@/api/temperature';
import { foodAllergyApi } from '@/api/food-allergy';
import { useRouter } from 'vue-router';
import { useBabyStore } from '@/stores/baby';
import { useThemeStore } from '@/stores/theme';
import { fmtTime, fmtDate, minutesToText } from '@/utils/format';
import { isFutureDate } from '@/utils/date-picker';
import {
  FEEDING_TYPE_LABELS,
  DIAPER_TYPE_LABELS,
  SLEEP_TYPE_LABELS,
  USER_ROLE_LABELS,
  ALLERGY_CONCLUSION_LABELS,
  type DailyRecords,
} from '@baby-record/shared';
import type { TimelineEntry } from '@/types/timeline';

withDefaults(defineProps<{
  title?: string;
  showBack?: boolean;
}>(), {
  title: '历史记录',
  showBack: true,
});

const babyStore = useBabyStore();
const router = useRouter();
const themeStore = useThemeStore();
const dialog = useDialog();
const message = useMessage();

// 范围值用「当天 00:00」对齐 Naive UI 日历格子的时间戳；
// end 不用 23:59:59.999 —— 那个值会被 isFuture 判为未来，导致输入框截止日期被划删除线。
const today = new Date(); today.setHours(0, 0, 0, 0);
const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
const dateRange = ref<[number, number] | null>([startOfMonth.getTime(), today.getTime()]);
const selectedType = ref<'all' | TimelineEntry['type']>('all');
const loading = ref(false);
const items = ref<TimelineEntry[]>([]);
const editingEntry = ref<TimelineEntry | null>(null);
const detailEntry = ref<TimelineEntry | null>(null);

function buildItems(d: DailyRecords): TimelineEntry[] {
  const arr: TimelineEntry[] = [];
  d.feeding.forEach((f) =>
    arr.push({
      type: 'feeding',
      raw: f,
      time: f.feedingTime,
      icon: '🍼',
      title: '喂养',
      detail:
        FEEDING_TYPE_LABELS[f.feedingType] +
        (f.amountMl ? ` · ${f.amountMl}ml` : '') +
        (f.foods.length ? ` · ${f.foods.map((food) => food.name).join('、')}` : '') +
        (f.remark ? ` · ${f.remark}` : ''),
      colorClass: 'bg-ios-orange',
    }),
  );
  d.diaper.forEach((x) =>
    arr.push({
      type: 'diaper',
      raw: x,
      time: x.changeTime,
      icon: '🧷',
      title: '换纸尿裤',
      detail: DIAPER_TYPE_LABELS[x.type] + (x.remark ? ` · ${x.remark}` : ''),
      colorClass: 'bg-ios-blue',
    }),
  );
  d.sleep.forEach((s) =>
    arr.push({
      type: 'sleep',
      raw: s,
      time: s.startTime,
      icon: '😴',
      title: '睡眠',
      detail:
        SLEEP_TYPE_LABELS[s.sleepType] +
        ' · ' +
        (s.ongoing ? '睡眠中' : minutesToText(s.durationMinutes ?? 0)),
      colorClass: 'bg-ios-purple',
    }),
  );
  d.supplement.forEach((s) =>
    arr.push({
      type: 'supplement',
      raw: s,
      time: s.takeTime,
      icon: '💊',
      title: '补剂',
      detail: s.name + (s.amount ? ` · ${s.amount}${s.unit || ''}` : ''),
      colorClass: 'bg-ios-green',
    }),
  );
  d.activity.forEach((a) =>
    arr.push({
      type: 'activity',
      raw: a,
      time: a.eventTime,
      icon: '✨',
      title: a.eventType,
      detail: a.description || '',
      colorClass: 'bg-ios-teal',
    }),
  );
  d.temperature.forEach((t) =>
    arr.push({
      type: 'temperature', raw: t, time: t.measureTime, icon: '🌡️', title: '体温',
      detail: `${t.temperature.toFixed(1)}℃${t.remark ? ` · ${t.remark}` : ''}`, colorClass: 'bg-ios-pink',
    }),
  );
  d.foodAllergy.forEach((record) =>
    arr.push({
      type: 'foodAllergy',
      raw: record,
      time: record.exposureTime,
      icon: '🔎',
      title: '辅食排敏',
      detail: `${record.food.name} · ${ALLERGY_CONCLUSION_LABELS[record.finalConclusion]}${record.positiveSymptoms.length ? ` · ${record.positiveSymptoms.join('、')}` : ''}`,
      colorClass: record.finalConclusion === 'ALLERGIC' ? 'bg-ios-pink' : record.finalConclusion === 'POSSIBLE' ? 'bg-ios-orange' : 'bg-ios-green',
    }),
  );
  return arr.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

async function load() {
  const baby = babyStore.currentBaby;
  if (!baby) return;
  loading.value = true;
  try {
    if (!dateRange.value) { items.value = []; return; }
    const data = await recordApi.range(baby.id, fmtDate(dateRange.value[0]), fmtDate(dateRange.value[1]));
    items.value = buildItems(data);
  } finally {
    loading.value = false;
  }
}

async function removeEntry(e: TimelineEntry) {
  const r = e.raw as { id: number };
  dialog.warning({
    title: '删除记录',
    content: `确定删除这条「${e.title}」记录吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        if (e.type === 'feeding') await feedingApi.remove(r.id);
        else if (e.type === 'diaper') await diaperApi.remove(r.id);
        else if (e.type === 'sleep') await sleepApi.remove(r.id);
        else if (e.type === 'supplement') await supplementApi.remove(r.id);
        else if (e.type === 'activity') await activityApi.remove(r.id);
        else if (e.type === 'temperature') await temperatureApi.remove(r.id);
        else if (e.type === 'foodAllergy') await foodAllergyApi.remove(r.id);
        message.success('已删除');
        load();
      } catch {
        // 错误已由拦截器提示
      }
    },
  });
}

function removeEditingEntry() {
  if (!editingEntry.value) return;
  const entry = editingEntry.value;
  editingEntry.value = null;
  removeEntry(entry);
}

function editEntry(entry: TimelineEntry) {
  if (entry.type === 'foodAllergy') router.push(`/record/food-allergy/${entry.raw.id}`);
  else editingEntry.value = entry;
}

const filteredItems = computed(() => selectedType.value === 'all' ? items.value : items.value.filter((item) => item.type === selectedType.value));
function isEarliestRecordOfDay(item: TimelineEntry, index: number): boolean {
  return index === filteredItems.value.length - 1 || fmtDate(item.time) !== fmtDate(filteredItems.value[index + 1].time);
}

function fmtTimelineDate(time: string): string {
  const date = new Date(time);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function creatorName(item: TimelineEntry): string {
  return item.raw.creator?.name || '未知用户';
}
function creatorRole(item: TimelineEntry): string {
  return item.raw.creator ? USER_ROLE_LABELS[item.raw.creator.role] : '未知用户';
}
const typeOptions: { label: string; value: 'all' | TimelineEntry['type'] }[] = [
  { label: '全部', value: 'all' }, { label: '喂养', value: 'feeding' }, { label: '纸尿裤', value: 'diaper' },
  { label: '睡眠', value: 'sleep' }, { label: '补剂', value: 'supplement' }, { label: '活动', value: 'activity' }, { label: '体温', value: 'temperature' },
  { label: '排敏', value: 'foodAllergy' },
];
onMounted(load);
watch(dateRange, load, { deep: true });
</script>

<template>
  <div>
    <AppHeader :title="title" :show-back="showBack" />

    <slot name="prepend" />

    <div class="px-5 mt-4">
      <div class="bg-ios-card rounded-3xl p-4 shadow-card">
        <p class="text-sm font-medium text-ios-secondary mb-2">时间范围</p>
        <NDatePicker v-model:value="dateRange" type="daterange" class="w-full" :is-date-disabled="isFutureDate" clearable />
        <div class="flex gap-2 overflow-x-auto no-scrollbar mt-3">
          <button v-for="option in typeOptions" :key="option.value" class="shrink-0 px-3 py-1.5 rounded-xl text-xs" :class="selectedType === option.value ? 'bg-ios-blue text-white' : 'bg-ios-fill text-ios-secondary'" @click="selectedType = option.value">{{ option.label }}</button>
        </div>
      </div>
    </div>

    <div class="px-5 mt-4">
      <div v-if="loading" class="text-center py-12 text-ios-secondary text-sm">加载中…</div>

      <div v-else-if="!filteredItems.length" class="flex flex-col items-center py-16 text-center">
        <div class="text-4xl mb-2">📭</div>
        <p class="text-sm text-ios-secondary">当前筛选条件下暂无记录</p>
      </div>

      <TransitionGroup v-else name="list" tag="div" class="relative pb-4">
        <div v-for="(it, i) in filteredItems" :key="it.type + '-' + it.raw.id" class="flex gap-3">
          <div class="flex flex-col items-center w-12 shrink-0 pt-1">
            <span
              v-if="isEarliestRecordOfDay(it, i)"
              class="mb-1 rounded-lg bg-ios-card px-1.5 py-1 text-[10px] font-bold text-ios-label num-display shadow-card whitespace-nowrap"
            >
              {{ fmtTimelineDate(it.time) }}
            </span>
            <span class="text-xs text-ios-secondary num-display">{{ fmtTime(it.time) }}</span>
            <span class="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" :class="it.colorClass"></span>
            <span v-if="i < filteredItems.length - 1" class="flex-1 w-px bg-ios-separator mt-1 mb-1"></span>
          </div>
          <div class="flex-1 bg-ios-card rounded-2xl p-3.5 shadow-card mb-3 animate-slide-up text-left cursor-pointer" role="button" tabindex="0" @click="detailEntry = it" @keydown.enter="detailEntry = it">
            <div class="flex items-center gap-2">
              <span class="text-lg">{{ it.icon }}</span>
              <span class="text-sm font-semibold text-ios-label flex-1">{{ it.title }}</span>
              <button class="text-xs text-ios-secondary px-1.5 active:opacity-60" @click.stop="editEntry(it)">
                编辑
              </button>
              <button class="text-xs text-ios-pink px-1.5 active:opacity-60" @click.stop="removeEntry(it)">
                删除
              </button>
            </div>
            <p class="text-xs text-ios-secondary mt-1">
              <template v-if="it.detail">{{ it.detail }} · </template>{{ creatorRole(it) }}（添加）
            </p>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <EditRecordModal :entry="editingEntry" @close="editingEntry = null" @saved="editingEntry = null; load()" @remove="removeEditingEntry" />
    <Teleport to="body">
      <div v-if="detailEntry" class="fixed inset-0 z-50 flex items-end justify-center">
        <div class="absolute inset-0 bg-black/40" @click="detailEntry = null" />
        <section class="relative w-full max-w-app bg-ios-bg rounded-t-3xl p-5 safe-bottom animate-slide-up">
          <div class="flex items-center gap-3 mb-4"><span class="text-2xl">{{ detailEntry.icon }}</span><h2 class="text-lg font-bold text-ios-label flex-1">{{ detailEntry.title }}详情</h2><button class="text-sm text-ios-secondary" @click="detailEntry = null">关闭</button></div>
          <div class="bg-ios-card rounded-2xl p-4 space-y-3 text-sm">
            <div class="flex justify-between gap-4"><span class="text-ios-secondary">记录时间</span><span class="text-ios-label">{{ new Date(detailEntry.time).toLocaleString('zh-CN', { hour12: false }) }}</span></div>
            <div class="flex justify-between gap-4"><span class="text-ios-secondary">完整内容</span><span class="text-ios-label text-right">{{ detailEntry.detail || '—' }}</span></div>
            <div class="flex justify-between gap-4"><span class="text-ios-secondary">添加人</span><span class="text-ios-label">{{ creatorName(detailEntry) }} · {{ creatorRole(detailEntry) }}</span></div>
            <div class="flex justify-between gap-4"><span class="text-ios-secondary">创建时间</span><span class="text-ios-label">{{ new Date(detailEntry.raw.createdTime).toLocaleString('zh-CN', { hour12: false }) }}</span></div>
            <div class="flex justify-between gap-4"><span class="text-ios-secondary">更新时间</span><span class="text-ios-label">{{ detailEntry.raw.updatedTime ? new Date(detailEntry.raw.updatedTime).toLocaleString('zh-CN', { hour12: false }) : '未修改' }}</span></div>
          </div>
          <button class="w-full mt-4 rounded-2xl bg-ios-blue text-white font-semibold" :class="themeStore.seniorMode ? 'min-h-16 text-xl' : 'py-3.5'" @click="editEntry(detailEntry); detailEntry = null">修改记录</button>
        </section>
      </div>
    </Teleport>
  </div>
</template>
