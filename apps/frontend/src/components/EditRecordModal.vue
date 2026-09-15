<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useMessage } from 'naive-ui';
import { NInput, NInputNumber, NSelect, NSwitch } from 'naive-ui';
import IconPicker from '@/components/form/IconPicker.vue';
import DateTimePicker from '@/components/form/DateTimePicker.vue';
import WheelPicker from '@/components/form/WheelPicker.vue';
import { feedingApi } from '@/api/feeding';
import { diaperApi } from '@/api/diaper';
import { sleepApi } from '@/api/sleep';
import { supplementApi } from '@/api/supplement';
import { activityApi } from '@/api/activity';
import { temperatureApi } from '@/api/temperature';
import { foodApi } from '@/api/food';
import {
  FEEDING_TYPE_LABELS,
  DIAPER_TYPE_LABELS,
  ALL_FEEDING_TYPES,
  ALL_DIAPER_TYPES,
  type FeedingType,
  type DiaperType,
} from '@baby-record/shared';
import type { TimelineEntry } from '@/types/timeline';
import { useThemeStore } from '@/stores/theme';
import { fmtDateTime } from '@/utils/format';

const props = defineProps<{ entry: TimelineEntry | null }>();
const emit = defineEmits<{ close: []; saved: []; remove: [] }>();
const message = useMessage();
const themeStore = useThemeStore();

const time = ref(0);
const sleepStart = ref(0);
const sleepEnd = ref<number | null>(null);
const remark = ref('');
const feedingType = ref<FeedingType>('FORMULA');
const amountMl = ref(120);
const diaperType = ref<DiaperType>('BOTH');
const supplementName = ref('');
const amount = ref('');
const unit = ref('');
const eventType = ref('');
const description = ref('');
const temperature = ref(36.5);
const submitting = ref(false);
const foods = ref<{ id: number; name: string }[]>([]);
const feedingFoodIds = ref<number[]>([]);
const addFoodToMixed = ref(false);
const seniorStep = ref<'summary' | 'time' | 'details' | 'confirm'>('summary');

const feedingTypeOptions = ALL_FEEDING_TYPES.map((v) => ({
  label: FEEDING_TYPE_LABELS[v],
  value: v,
  icon: v === 'BREAST_MILK' ? '🤱' : v === 'FORMULA' ? '🍼' : v === 'COMPLEMENTARY_FOOD' ? '🥣' : '🤱🍼',
}));
const diaperTypeOptions = ALL_DIAPER_TYPES.map((v) => ({
  label: DIAPER_TYPE_LABELS[v],
  value: v,
  icon: v === 'PEE' ? '💧' : v === 'POOP' ? '💩' : '💧💩',
}));

const titleMap: Record<TimelineEntry['type'], string> = {
  feeding: '喂养',
  diaper: '纸尿裤',
  sleep: '睡眠',
  supplement: '补剂',
  activity: '事件',
  temperature: '体温',
  foodAllergy: '辅食排敏',
};
const entryTitle = computed(() => (props.entry ? titleMap[props.entry.type] : ''));
const feedingIsComplementary = computed(() => feedingType.value === 'COMPLEMENTARY_FOOD');
const feedingIsMixed = computed(() => feedingType.value === 'MIXED');
const feedingShowsFoods = computed(() => feedingIsComplementary.value || (feedingIsMixed.value && addFoodToMixed.value));
const foodOptions = computed(() => foods.value.map((food) => ({ label: food.name, value: food.id })));
const seniorTimeText = computed(() => {
  if (!props.entry) return '';
  if (props.entry.type === 'sleep') {
    const end = sleepEnd.value ? ` 至 ${fmtDateTime(sleepEnd.value)}` : '（睡眠中）';
    return `${fmtDateTime(sleepStart.value)}${end}`;
  }
  return fmtDateTime(time.value);
});
const seniorDetailText = computed(() => {
  if (!props.entry) return '';
  if (props.entry.type === 'feeding') {
    const selected = foods.value.filter((food) => feedingFoodIds.value.includes(food.id)).map((food) => food.name);
    return [FEEDING_TYPE_LABELS[feedingType.value], !feedingIsComplementary.value ? `${amountMl.value} ml` : '', selected.join('、')].filter(Boolean).join(' · ');
  }
  if (props.entry.type === 'diaper') return DIAPER_TYPE_LABELS[diaperType.value];
  if (props.entry.type === 'temperature') return `${temperature.value.toFixed(1)}℃`;
  if (props.entry.type === 'supplement') return `${supplementName.value || '未填写名称'}${amount.value ? ` · ${amount.value}${unit.value}` : ''}`;
  if (props.entry.type === 'activity') return eventType.value || '未填写事件类型';
  return '查看并修改睡眠时间';
});

function iso(ts: number) {
  return new Date(ts).toISOString();
}

watch(
  () => props.entry,
  async (e) => {
    if (!e) return;
    seniorStep.value = 'summary';
    remark.value = '';
    const r = e.raw as unknown as Record<string, unknown>;
    if (e.type === 'feeding') {
      foods.value = await foodApi.list();
      for (const linked of ((r.foods as { id: number; name: string }[] | undefined) ?? [])) {
        if (!foods.value.some((food) => food.id === linked.id)) foods.value.push(linked);
      }
      time.value = new Date(r.feedingTime as string).getTime();
      feedingType.value = r.feedingType as FeedingType;
      amountMl.value = (r.amountMl as number | null) ?? 120;
      feedingFoodIds.value = ((r.foods as { id: number }[] | undefined) ?? []).map((food) => food.id);
      addFoodToMixed.value = feedingType.value === 'MIXED' && feedingFoodIds.value.length > 0;
      remark.value = (r.remark as string) || '';
    } else if (e.type === 'diaper') {
      time.value = new Date(r.changeTime as string).getTime();
      diaperType.value = r.type as DiaperType;
      remark.value = (r.remark as string) || '';
    } else if (e.type === 'sleep') {
      sleepStart.value = new Date(r.startTime as string).getTime();
      sleepEnd.value = r.endTime ? new Date(r.endTime as string).getTime() : null;
      remark.value = (r.remark as string) || '';
    } else if (e.type === 'supplement') {
      time.value = new Date(r.takeTime as string).getTime();
      supplementName.value = r.name as string;
      amount.value = (r.amount as string) || '';
      unit.value = (r.unit as string) || '';
      remark.value = (r.remark as string) || '';
    } else if (e.type === 'activity') {
      time.value = new Date(r.eventTime as string).getTime();
      eventType.value = r.eventType as string;
      description.value = (r.description as string) || '';
      remark.value = (r.remark as string) || '';
    } else if (e.type === 'temperature') {
      time.value = new Date(r.measureTime as string).getTime();
      temperature.value = Number(r.temperature);
      remark.value = (r.remark as string) || '';
    }
  },
  { immediate: true },
);

function setSeniorTime(minutesAgo: number) {
  const value = Date.now() - minutesAgo * 60_000;
  if (props.entry?.type === 'sleep') {
    const duration = sleepEnd.value ? sleepEnd.value - sleepStart.value : 0;
    sleepEnd.value = value;
    sleepStart.value = duration > 0 ? value - duration : value;
  } else {
    time.value = value;
  }
}

function requestRemove() {
  emit('remove');
}

async function onSave() {
  if (!props.entry) return;
  const e = props.entry;
  const r = e.raw as unknown as Record<string, unknown> & { id: number };
  submitting.value = true;
  try {
    if (e.type === 'feeding') {
      await feedingApi.update(r.id, {
        feedingTime: iso(time.value),
        feedingType: feedingType.value,
        ...(!feedingIsComplementary.value && { amountMl: amountMl.value }),
        foodIds: feedingShowsFoods.value ? feedingFoodIds.value : [],
        remark: remark.value || undefined,
      });
    } else if (e.type === 'diaper') {
      await diaperApi.update(r.id, {
        changeTime: iso(time.value),
        type: diaperType.value,
        remark: remark.value || undefined,
      });
    } else if (e.type === 'sleep') {
      await sleepApi.update(r.id, {
        startTime: iso(sleepStart.value),
        endTime: sleepEnd.value ? iso(sleepEnd.value) : undefined,
        remark: remark.value || undefined,
      });
    } else if (e.type === 'supplement') {
      await supplementApi.update(r.id, {
        name: supplementName.value,
        amount: amount.value || undefined,
        unit: unit.value || undefined,
        takeTime: iso(time.value),
        remark: remark.value || undefined,
      });
    } else if (e.type === 'activity') {
      await activityApi.update(r.id, {
        eventType: eventType.value,
        eventTime: iso(time.value),
        description: description.value || undefined,
        remark: remark.value || undefined,
      });
    } else if (e.type === 'temperature') {
      await temperatureApi.update(r.id, { temperature: temperature.value, measureTime: iso(time.value), remark: remark.value || undefined });
    }
    message.success('已更新');
    emit('saved');
  } catch {
    // 错误已由拦截器提示
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="entry" class="fixed inset-0 z-50 flex items-end justify-center">
      <div class="absolute inset-0 bg-black/40" @click="emit('close')" />
      <div
        v-if="themeStore.seniorMode"
        class="relative w-full max-w-app bg-ios-bg rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto no-scrollbar animate-slide-up safe-bottom"
      >
        <template v-if="seniorStep === 'summary'">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-xl font-bold text-ios-label">修改{{ entryTitle }}记录</h3>
            <button class="text-ios-label text-base font-semibold px-3" @click="emit('close')">关闭</button>
          </div>
          <div class="bg-ios-card rounded-3xl p-5 shadow-card space-y-4">
            <div><p class="text-sm font-medium text-ios-secondary">当前记录</p><p class="text-2xl font-bold text-ios-label mt-1">{{ entryTitle }}</p></div>
            <div class="border-t border-ios-separator pt-4"><p class="text-sm text-ios-secondary">记录时间</p><p class="text-lg font-semibold text-ios-label mt-1">{{ seniorTimeText }}</p></div>
            <div><p class="text-sm text-ios-secondary">记录内容</p><p class="text-xl font-bold text-ios-label mt-1">{{ seniorDetailText }}</p></div>
          </div>
          <div class="space-y-3 mt-4">
            <button class="w-full min-h-16 rounded-2xl bg-ios-card text-ios-label text-lg font-semibold shadow-card" @click="seniorStep = 'time'">修改时间</button>
            <button class="w-full min-h-16 rounded-2xl bg-ios-blue text-white text-lg font-semibold shadow-card" @click="seniorStep = 'details'">修改{{ entryTitle === '喂养' ? '类型或奶量' : '记录内容' }}</button>
            <button class="w-full min-h-16 rounded-2xl bg-ios-card text-ios-pink text-lg font-semibold shadow-card" @click="requestRemove">删除这条{{ entryTitle }}记录</button>
          </div>
        </template>

        <template v-else-if="seniorStep === 'time'">
          <div class="flex items-center justify-between mb-5"><button class="text-ios-blue text-lg font-semibold" @click="seniorStep = 'summary'">返回</button><h3 class="text-xl font-bold text-ios-label">修改时间</h3><span class="w-10" /></div>
          <div class="grid grid-cols-2 gap-3 mb-4">
            <button v-for="option in [{ label: '刚刚', minutes: 0 }, { label: '5 分钟前', minutes: 5 }, { label: '30 分钟前', minutes: 30 }, { label: '1 小时前', minutes: 60 }]" :key="option.minutes" class="min-h-16 rounded-2xl bg-ios-card text-ios-label text-lg font-semibold shadow-card" @click="setSeniorTime(option.minutes)">{{ option.label }}</button>
          </div>
          <div class="bg-ios-card rounded-3xl p-5 shadow-card">
            <p class="text-base font-semibold text-ios-label mb-3">选择其他时间</p>
            <template v-if="entry.type === 'sleep'"><p class="text-sm text-ios-secondary mb-2">开始时间</p><DateTimePicker v-model="sleepStart" class="w-full" /><p class="text-sm text-ios-secondary mb-2 mt-5">结束时间</p><DateTimePicker v-model="sleepEnd" clearable class="w-full" /></template>
            <DateTimePicker v-else v-model="time" class="w-full" />
          </div>
          <button class="w-full mt-4 min-h-16 rounded-2xl bg-ios-blue text-white text-lg font-semibold" @click="seniorStep = 'confirm'">下一步</button>
        </template>

        <template v-else-if="seniorStep === 'details'">
          <div class="flex items-center justify-between mb-5"><button class="text-ios-blue text-lg font-semibold" @click="seniorStep = 'summary'">返回</button><h3 class="text-xl font-bold text-ios-label">修改内容</h3><span class="w-10" /></div>
          <div class="space-y-4">
            <div v-if="entry.type === 'feeding'" class="bg-ios-card rounded-3xl p-5 shadow-card space-y-4">
              <div><p class="text-base font-semibold text-ios-label mb-3">喂养类型</p><IconPicker v-model="feedingType" :options="feedingTypeOptions" active-color="bg-ios-orange" /></div>
              <div v-if="!feedingIsComplementary"><p class="text-base font-semibold text-ios-label mb-3">奶量</p><WheelPicker v-model="amountMl" :options="Array.from({ length: 31 }, (_, i) => ({ label: `${i * 10} ml`, value: i * 10 }))" /></div>
              <div v-if="feedingIsMixed" class="flex items-center gap-3"><span class="flex-1 text-base font-semibold text-ios-label">添加辅食</span><NSwitch v-model:value="addFoodToMixed" /></div>
              <div v-if="feedingShowsFoods"><p class="text-base font-semibold text-ios-label mb-2">辅食</p><NSelect v-model:value="feedingFoodIds" multiple filterable :options="foodOptions" /></div>
            </div>
            <div v-else-if="entry.type === 'diaper'" class="bg-ios-card rounded-3xl p-5 shadow-card"><p class="text-base font-semibold text-ios-label mb-3">纸尿裤类型</p><IconPicker v-model="diaperType" :options="diaperTypeOptions" active-color="bg-ios-blue" /></div>
            <div v-else-if="entry.type === 'temperature'" class="bg-ios-card rounded-3xl p-5 shadow-card"><p class="text-base font-semibold text-ios-label mb-3">体温</p><WheelPicker v-model="temperature" :options="Array.from({ length: 51 }, (_, i) => ({ label: `${(36 + i / 10).toFixed(1)}℃`, value: 36 + i / 10 }))" /></div>
            <div v-else-if="entry.type === 'supplement'" class="bg-ios-card rounded-3xl p-5 shadow-card space-y-4"><div><p class="text-base font-semibold text-ios-label mb-2">名称</p><NInput v-model:value="supplementName" size="large" /></div><div><p class="text-base font-semibold text-ios-label mb-2">剂量</p><NInput v-model:value="amount" size="large" /></div></div>
            <div v-else-if="entry.type === 'activity'" class="bg-ios-card rounded-3xl p-5 shadow-card"><p class="text-base font-semibold text-ios-label mb-2">事件类型</p><NInput v-model:value="eventType" size="large" /></div>
            <div v-else class="bg-ios-card rounded-3xl p-5 shadow-card"><p class="text-lg font-semibold text-ios-label">睡眠记录</p><p class="text-base text-ios-secondary mt-2">可在“修改时间”中调整开始和结束时间。</p></div>
            <div v-if="entry.type !== 'temperature'" class="bg-ios-card rounded-3xl p-5 shadow-card"><p class="text-base font-semibold text-ios-label mb-2">备注（选填）</p><NInput v-model:value="remark" type="textarea" :autosize="{ minRows: 3 }" /></div>
          </div>
          <button class="w-full mt-4 min-h-16 rounded-2xl bg-ios-blue text-white text-lg font-semibold" @click="seniorStep = 'confirm'">下一步</button>
        </template>

        <template v-else>
          <div class="flex items-center justify-between mb-5"><button class="text-ios-blue text-lg font-semibold" @click="seniorStep = 'summary'">返回</button><h3 class="text-xl font-bold text-ios-label">确认修改</h3><span class="w-10" /></div>
          <div class="bg-ios-card rounded-3xl p-5 shadow-card space-y-4"><p class="text-lg font-bold text-ios-label">请确认以下内容</p><div><p class="text-sm text-ios-secondary">记录时间</p><p class="text-lg font-semibold text-ios-label mt-1">{{ seniorTimeText }}</p></div><div><p class="text-sm text-ios-secondary">记录内容</p><p class="text-xl font-bold text-ios-label mt-1">{{ seniorDetailText }}</p></div></div>
          <button class="w-full mt-4 min-h-16 rounded-2xl bg-ios-blue text-white text-xl font-bold disabled:opacity-60" :disabled="submitting" @click="onSave">{{ submitting ? '保存中…' : '确认保存' }}</button>
        </template>
      </div>

      <div
        v-else
        class="relative w-full max-w-app bg-ios-bg rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto no-scrollbar animate-slide-up safe-bottom"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-ios-label">编辑{{ entryTitle }}</h3>
          <button class="text-ios-secondary text-sm" @click="emit('close')">关闭</button>
        </div>

        <div class="space-y-3">
          <div v-if="entry.type !== 'sleep'" class="bg-ios-card rounded-3xl p-4 shadow-card">
            <label class="text-sm font-medium text-ios-secondary">时间</label>
            <DateTimePicker v-model="time" class="mt-2 w-full" />
          </div>

          <template v-if="entry.type === 'sleep'">
            <div class="bg-ios-card rounded-3xl p-4 shadow-card">
              <label class="text-sm font-medium text-ios-secondary">开始时间</label>
              <DateTimePicker v-model="sleepStart" class="mt-2 w-full" />
            </div>
            <div class="bg-ios-card rounded-3xl p-4 shadow-card">
              <label class="text-sm font-medium text-ios-secondary">结束时间</label>
              <DateTimePicker v-model="sleepEnd" clearable class="mt-2 w-full" />
              <p class="text-xs text-ios-secondary mt-1">不填表示睡眠中</p>
            </div>
          </template>

          <template v-if="entry.type === 'feeding'">
            <div class="bg-ios-card rounded-3xl p-4 shadow-card">
              <label class="text-sm font-medium text-ios-secondary">类型</label>
              <IconPicker v-model="feedingType" :options="feedingTypeOptions" active-color="bg-ios-orange" class="mt-3" />
            </div>
            <div v-if="!feedingIsComplementary" class="bg-ios-card rounded-3xl p-4 shadow-card grid grid-cols-4 gap-2 items-center">
              <label class="text-sm font-medium text-ios-secondary col-span-1">奶量</label>
              <WheelPicker v-model="amountMl" :options="Array.from({ length: 31 }, (_, i) => ({ label: `${i * 10} ml`, value: i * 10 }))" class="col-span-2" />
              <span class="text-sm text-ios-secondary text-center">ml</span>
            </div>
            <div v-if="feedingIsMixed" class="bg-ios-card rounded-3xl p-4 shadow-card flex items-center gap-3">
              <span class="flex-1 text-sm font-medium text-ios-label">添加辅食</span>
              <NSwitch v-model:value="addFoodToMixed" />
            </div>
            <div v-if="feedingShowsFoods" class="bg-ios-card rounded-3xl p-4 shadow-card">
              <label class="text-sm font-medium text-ios-secondary">辅食</label>
              <NSelect v-model:value="feedingFoodIds" multiple filterable :options="foodOptions" class="mt-2" />
            </div>
          </template>

          <div v-if="entry.type === 'temperature'" class="bg-ios-card rounded-3xl p-4 shadow-card">
            <label class="text-sm font-medium text-ios-secondary">体温</label>
            <WheelPicker v-model="temperature" :options="Array.from({ length: 51 }, (_, i) => ({ label: `${(36 + i / 10).toFixed(1)}℃`, value: 36 + i / 10 }))" class="mt-2" />
          </div>

          <div v-if="entry.type === 'diaper'" class="bg-ios-card rounded-3xl p-4 shadow-card">
            <label class="text-sm font-medium text-ios-secondary">类型</label>
            <IconPicker v-model="diaperType" :options="diaperTypeOptions" active-color="bg-ios-blue" class="mt-3" />
          </div>

          <template v-if="entry.type === 'supplement'">
            <div class="bg-ios-card rounded-3xl p-4 shadow-card">
              <label class="text-sm font-medium text-ios-secondary">名称</label>
              <NInput v-model:value="supplementName" class="mt-2" />
            </div>
            <div class="bg-ios-card rounded-3xl p-4 shadow-card grid grid-cols-3 gap-2">
              <WheelPicker v-model="amount" :options="Array.from({ length: 11 }, (_, value) => ({ label: String(value), value: String(value) }))" class="col-span-2" />
              <NInput v-model:value="unit" placeholder="单位" />
            </div>
          </template>

          <template v-if="entry.type === 'activity'">
            <div class="bg-ios-card rounded-3xl p-4 shadow-card">
              <label class="text-sm font-medium text-ios-secondary">事件类型</label>
              <NInput v-model:value="eventType" class="mt-2" />
            </div>
            <div class="bg-ios-card rounded-3xl p-4 shadow-card">
              <label class="text-sm font-medium text-ios-secondary">描述</label>
              <NInput v-model:value="description" type="textarea" :autosize="{ minRows: 2 }" class="mt-2" />
            </div>
          </template>

          <div class="bg-ios-card rounded-3xl p-4 shadow-card">
            <label class="text-sm font-medium text-ios-secondary">备注</label>
            <NInput v-model:value="remark" type="textarea" :autosize="{ minRows: 2 }" class="mt-2" />
          </div>

          <button
            class="w-full py-3.5 rounded-2xl bg-ios-blue text-white font-semibold active:scale-95 transition-transform disabled:opacity-60"
            :disabled="submitting"
            @click="onSave"
          >
            {{ submitting ? '保存中…' : '保存修改' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
