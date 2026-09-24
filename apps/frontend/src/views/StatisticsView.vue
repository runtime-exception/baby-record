<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import VChart from 'vue-echarts';
import '@/utils/echarts';
import AppDatePicker from '@/design-system/AppDatePicker.vue';
import AppPullToRefresh from '@/design-system/AppPullToRefresh.vue';
import AppHeader from '@/components/AppHeader.vue';
import TypeSegment from '@/components/form/TypeSegment.vue';
import { chartApi } from '@/api/chart';
import { statisticsApi, type StatsParams } from '@/api/statistics';
import { growthApi } from '@/api/growth';
import { useBabyStore } from '@/stores/baby';
import { fmtDate } from '@/utils/format';
import { isFutureDate } from '@/utils/date-picker';
import type { ChartResult, GrowthTrendVo, SupplementStats } from '@baby-record/shared';

const babyStore = useBabyStore();

type RangeOpt = '7d' | '30d' | 'custom';
const range = ref<RangeOpt>('7d');
const startDate = ref(Date.now() - 6 * 86400000);
const endDate = ref(Date.now());
const loading = ref(false);

const feedingChart = ref<ChartResult | null>(null);
const sleepChart = ref<ChartResult | null>(null);
const diaperChart = ref<ChartResult | null>(null);
const supplementStats = ref<SupplementStats | null>(null);
const supplementTrendChart = ref<ChartResult | null>(null);

/** 身高/体重趋势：全历史，不受日期范围选择影响 */
const heightTrend = ref<GrowthTrendVo | null>(null);
const weightTrend = ref<GrowthTrendVo | null>(null);
const growthLoading = ref(false);

const rangeOptions: { label: string; value: RangeOpt }[] = [
  { label: '7天', value: '7d' },
  { label: '30天', value: '30d' },
  { label: '自定义', value: 'custom' },
];

function buildParams(): StatsParams {
  const baby = babyStore.currentBaby!;
  if (range.value === 'custom') {
    return {
      babyId: baby.id,
      range: 'custom',
      startDate: fmtDate(startDate.value),
      endDate: fmtDate(endDate.value),
    };
  }
  return { babyId: baby.id, range: range.value };
}

async function loadAll() {
  const baby = babyStore.currentBaby;
  if (!baby) return;
  loading.value = true;
  try {
    const params = buildParams();
    const [f, s, d, supStats, supTrend] = await Promise.all([
      chartApi.feeding(params),
      chartApi.sleep(params),
      chartApi.diaper(params),
      statisticsApi.supplement(params),
      chartApi.supplement(params),
    ]);
    feedingChart.value = f;
    sleepChart.value = s;
    diaperChart.value = d;
    supplementStats.value = supStats;
    supplementTrendChart.value = supTrend;
  } finally {
    loading.value = false;
  }
}

const feedingOption = computed(() => {
  const c = feedingChart.value;
  if (!c) return null;
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: c.series.map((s) => s.name), top: 0, textStyle: { fontSize: 11 } },
    grid: { left: 36, right: 36, top: 32, bottom: 28 },
    xAxis: {
      type: 'category',
      data: c.xAxis,
      axisLabel: { fontSize: 10, formatter: (v: string) => v.slice(5) },
    },
    yAxis: [
      { type: 'value', name: '次数', axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: 'dashed' } } },
      { type: 'value', name: 'ml', axisLabel: { fontSize: 10 }, splitLine: { show: false } },
    ],
    series: c.series.map((s, i) => ({
      name: s.name,
      type: 'line',
      smooth: true,
      data: s.data,
      yAxisIndex: i,
      itemStyle: { color: i === 0 ? '#ff9500' : '#007aff' },
      lineStyle: { width: 2 },
    })),
  };
});

const sleepOption = computed(() => {
  const c = sleepChart.value;
  if (!c || !c.series.length) return null;
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 16, bottom: 28 },
    xAxis: {
      type: 'category',
      data: c.xAxis,
      axisLabel: { fontSize: 10, formatter: (v: string) => v.slice(5) },
    },
    yAxis: { type: 'value', name: '分钟', axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: 'dashed' } } },
    series: [
      {
        type: 'bar',
        data: c.series[0].data,
        itemStyle: { color: '#af52de', borderRadius: [4, 4, 0, 0] },
        barWidth: '60%',
      },
    ],
  };
});

const diaperOption = computed(() => {
  const c = diaperChart.value;
  if (!c || !c.series.length) return null;
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 16, bottom: 28 },
    xAxis: {
      type: 'category',
      data: c.xAxis,
      axisLabel: { fontSize: 10, formatter: (v: string) => v.slice(5) },
    },
    yAxis: { type: 'value', name: '次', axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: 'dashed' } } },
    series: [
      {
        type: 'bar',
        data: c.series[0].data,
        itemStyle: { color: '#007aff', borderRadius: [4, 4, 0, 0] },
        barWidth: '60%',
      },
    ],
  };
});

async function loadGrowth() {
  const baby = babyStore.currentBaby;
  if (!baby) return;
  growthLoading.value = true;
  try {
    const [h, w] = await Promise.all([
      growthApi.trend(baby.id, 'height'),
      growthApi.trend(baby.id, 'weight'),
    ]);
    heightTrend.value = h;
    weightTrend.value = w;
  } finally {
    growthLoading.value = false;
  }
}

const supplementOption = computed(() => {
  const s = supplementStats.value;
  if (!s || !s.typeStats.length) return null;
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    series: [
      {
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['50%', '42%'],
        data: s.typeStats.map((t) => ({ name: t.name, value: t.count })),
        label: { fontSize: 10 },
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
      },
    ],
  };
});

const supplementTrendOption = computed(() => {
  const c = supplementTrendChart.value;
  if (!c || !c.series.length) return null;
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 16, bottom: 28 },
    xAxis: {
      type: 'category',
      data: c.xAxis,
      axisLabel: { fontSize: 10, formatter: (v: string) => v.slice(5) },
    },
    yAxis: {
      type: 'value',
      name: '次',
      axisLabel: { fontSize: 10 },
      splitLine: { lineStyle: { type: 'dashed' } },
    },
    series: [
      {
        type: 'bar',
        data: c.series[0].data,
        itemStyle: { color: '#30d158', borderRadius: [4, 4, 0, 0] },
        barWidth: '60%',
      },
    ],
  };
});

/** 成长趋势图：实测 + 参考高位 P97 + 参考低位 P3，tooltip 显示所处区间百分比 */
function growthChartOption(trend: GrowthTrendVo | null, accent: string) {
  if (!trend || !trend.xAxis.length) return null;
  const labels = ['宝宝实测', '参考高位 P97', '参考低位 P3'];
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: { dataIndex: number; marker: string; seriesName: string; value: number | null }[]) => {
        const point = trend.points[params[0]?.dataIndex ?? 0];
        if (!point) return '';
        const rows = params
          .filter((p) => p.value != null)
          .map((p) => `${p.marker}${p.seriesName}：${p.value}${trend.unit}`)
          .join('<br/>');
        const percent = point.percent != null ? `<br/><span style="font-weight:600">处于参考区间 ${point.percent}%</span>` : '';
        return `<b>${point.date}</b><br/>${rows || '无数据'}${percent}`;
      },
    },
    legend: { data: labels, top: 0, textStyle: { fontSize: 11 } },
    grid: { left: 44, right: 16, top: 32, bottom: 28 },
    xAxis: {
      type: 'category',
      data: trend.xAxis,
      axisLabel: { fontSize: 10, formatter: (v: string) => v.slice(5) },
    },
    yAxis: {
      type: 'value',
      name: trend.unit,
      axisLabel: { fontSize: 10 },
      splitLine: { lineStyle: { type: 'dashed' } },
    },
    series: [
      {
        name: labels[0],
        type: 'line',
        data: trend.actual,
        smooth: false,
        symbol: 'circle',
        symbolSize: 7,
        itemStyle: { color: accent },
        lineStyle: { width: 2, color: accent },
        z: 5,
      },
      {
        name: labels[1],
        type: 'line',
        data: trend.high,
        smooth: false,
        symbol: 'none',
        lineStyle: { width: 1.5, type: 'dashed', color: '#ff9500' },
        itemStyle: { color: '#ff9500' },
      },
      {
        name: labels[2],
        type: 'line',
        data: trend.low,
        smooth: false,
        symbol: 'none',
        lineStyle: { width: 1.5, type: 'dashed', color: '#30d158' },
        itemStyle: { color: '#30d158' },
      },
    ],
  };
}

const heightOption = computed(() => growthChartOption(heightTrend.value, '#007aff'));
const weightOption = computed(() => growthChartOption(weightTrend.value, '#30d158'));

/** 最新测量所处参考区间的展示状态 */
function growthStatus(trend: GrowthTrendVo | null) {
  if (!trend || !trend.points.length) return { text: '', cls: 'text-ios-secondary', marker: 0, hasData: false };
  const p = trend.latest?.percent;
  if (p == null) return { text: '超出参考数据范围', cls: 'text-ios-secondary', marker: 0, hasData: false };
  if (p <= 3) return { text: '低于同龄参考下限（P3），建议关注', cls: 'text-ios-red', marker: p, hasData: true };
  if (p >= 97) return { text: '高于同龄参考上限（P97）', cls: 'text-ios-red', marker: p, hasData: true };
  return { text: '在正常参考范围内', cls: 'text-ios-green', marker: p, hasData: true };
}

const heightStatus = computed(() => growthStatus(heightTrend.value));
const weightStatus = computed(() => growthStatus(weightTrend.value));

onMounted(loadAll);
onMounted(loadGrowth);
watch([range, startDate, endDate], loadAll);
</script>

<template>
  <AppPullToRefresh @refresh="loadAll">
  <div>
    <AppHeader title="统计" subtitle="宝宝成长趋势" />

    <div class="px-5 mt-4 space-y-3">
      <!-- 范围选择 -->
      <div class="bg-ios-card rounded-3xl p-4 shadow-card">
        <TypeSegment v-model="range" :options="rangeOptions" />
        <div v-if="range === 'custom'" class="mt-3 flex items-center gap-2">
          <AppDatePicker v-model:value="startDate" type="date" class="flex-1" :is-date-disabled="isFutureDate" />
          <span class="text-ios-secondary text-sm">至</span>
          <AppDatePicker v-model:value="endDate" type="date" class="flex-1" :is-date-disabled="isFutureDate" />
        </div>
      </div>

      <div v-if="loading" class="text-center py-10 text-ios-secondary text-sm">加载中…</div>

      <template v-else>
        <!-- 身高趋势 -->
        <div class="bg-ios-card rounded-3xl p-4 shadow-card">
          <h3 class="text-sm font-semibold text-ios-label mb-2">📏 身高趋势</h3>
          <div v-if="growthLoading && !heightTrend" class="text-center py-6 text-xs text-ios-secondary">加载中…</div>
          <template v-else-if="heightOption">
            <VChart :option="heightOption" autoresize style="height: 200px" />
            <div v-if="heightTrend?.latest" class="mt-3 px-1">
              <div class="flex items-center justify-between gap-2 text-xs">
                <span class="text-ios-secondary">最新 {{ heightTrend.latest.value }}{{ heightTrend.unit }}（{{ heightTrend.latest.monthAge }} 个月龄）</span>
                <span class="font-semibold num-display shrink-0" :class="heightStatus.cls">
                  位于参考区间 {{ heightTrend.latest.percent != null ? heightTrend.latest.percent + '%' : '—' }}
                </span>
              </div>
              <div
                v-if="heightStatus.hasData"
                class="relative mt-2 h-1.5 rounded-full"
                style="background: linear-gradient(90deg, #30d158 0%, #ff9500 55%, #ff2d55 100%)"
              >
                <div
                  class="absolute -top-[3px] w-3 h-3 rounded-full bg-white border-2 shadow"
                  :class="heightStatus.cls === 'text-ios-red' ? 'border-ios-red' : 'border-ios-label'"
                  :style="{ left: `calc(${heightStatus.marker}% - 6px)` }"
                />
              </div>
              <p v-if="heightStatus.text" class="mt-1.5 text-xs" :class="heightStatus.cls">{{ heightStatus.text }}</p>
            </div>
          </template>
          <p v-else class="text-center text-xs text-ios-secondary py-10">暂无身高记录，去「记录 → 其他」添加</p>
          <p v-if="heightTrend" class="mt-2 text-[10px] text-ios-secondary">
            参考标准：
            <a :href="heightTrend.sourceUrl" target="_blank" rel="noopener noreferrer" class="text-ios-blue underline underline-offset-2">
              WHO 儿童生长标准 ↗
            </a>
          </p>
        </div>

        <!-- 体重趋势 -->
        <div class="bg-ios-card rounded-3xl p-4 shadow-card">
          <h3 class="text-sm font-semibold text-ios-label mb-2">⚖️ 体重趋势</h3>
          <div v-if="growthLoading && !weightTrend" class="text-center py-6 text-xs text-ios-secondary">加载中…</div>
          <template v-else-if="weightOption">
            <VChart :option="weightOption" autoresize style="height: 200px" />
            <div v-if="weightTrend?.latest" class="mt-3 px-1">
              <div class="flex items-center justify-between gap-2 text-xs">
                <span class="text-ios-secondary">最新 {{ weightTrend.latest.value }}{{ weightTrend.unit }}（{{ weightTrend.latest.monthAge }} 个月龄）</span>
                <span class="font-semibold num-display shrink-0" :class="weightStatus.cls">
                  位于参考区间 {{ weightTrend.latest.percent != null ? weightTrend.latest.percent + '%' : '—' }}
                </span>
              </div>
              <div
                v-if="weightStatus.hasData"
                class="relative mt-2 h-1.5 rounded-full"
                style="background: linear-gradient(90deg, #30d158 0%, #ff9500 55%, #ff2d55 100%)"
              >
                <div
                  class="absolute -top-[3px] w-3 h-3 rounded-full bg-white border-2 shadow"
                  :class="weightStatus.cls === 'text-ios-red' ? 'border-ios-red' : 'border-ios-label'"
                  :style="{ left: `calc(${weightStatus.marker}% - 6px)` }"
                />
              </div>
              <p v-if="weightStatus.text" class="mt-1.5 text-xs" :class="weightStatus.cls">{{ weightStatus.text }}</p>
            </div>
          </template>
          <p v-else class="text-center text-xs text-ios-secondary py-10">暂无体重记录，去「记录 → 其他」添加</p>
          <p v-if="weightTrend" class="mt-2 text-[10px] text-ios-secondary">
            参考标准：
            <a :href="weightTrend.sourceUrl" target="_blank" rel="noopener noreferrer" class="text-ios-blue underline underline-offset-2">
              WHO 儿童生长标准 ↗
            </a>
          </p>
        </div>

        <!-- 喂养趋势 -->
        <div class="bg-ios-card rounded-3xl p-4 shadow-card">
          <h3 class="text-sm font-semibold text-ios-label mb-2">🍼 喂养趋势</h3>
          <VChart v-if="feedingOption" :option="feedingOption" autoresize style="height: 200px" />
          <p v-else class="text-center text-xs text-ios-secondary py-10">暂无数据</p>
        </div>

        <!-- 睡眠趋势 -->
        <div class="bg-ios-card rounded-3xl p-4 shadow-card">
          <h3 class="text-sm font-semibold text-ios-label mb-2">😴 睡眠趋势</h3>
          <VChart v-if="sleepOption" :option="sleepOption" autoresize style="height: 200px" />
          <p v-else class="text-center text-xs text-ios-secondary py-10">暂无数据</p>
        </div>

        <!-- 纸尿裤趋势 -->
        <div class="bg-ios-card rounded-3xl p-4 shadow-card">
          <h3 class="text-sm font-semibold text-ios-label mb-2">🧷 纸尿裤趋势</h3>
          <VChart v-if="diaperOption" :option="diaperOption" autoresize style="height: 200px" />
          <p v-else class="text-center text-xs text-ios-secondary py-10">暂无数据</p>
        </div>

        <!-- 补剂趋势 -->
        <div class="bg-ios-card rounded-3xl p-4 shadow-card">
          <h3 class="text-sm font-semibold text-ios-label mb-2">💊 补剂趋势</h3>
          <VChart v-if="supplementTrendOption" :option="supplementTrendOption" autoresize style="height: 200px" />
          <p v-else class="text-center text-xs text-ios-secondary py-10">暂无数据</p>
        </div>

        <!-- 补剂统计 -->
        <div class="bg-ios-card rounded-3xl p-4 shadow-card">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold text-ios-label">💊 补剂统计</h3>
            <span v-if="supplementStats" class="num-display text-lg font-bold text-ios-green">
              {{ supplementStats.count }}<span class="text-xs text-ios-secondary font-normal ml-1">次</span>
            </span>
          </div>
          <VChart v-if="supplementOption" :option="supplementOption" autoresize style="height: 200px" />
          <p v-else class="text-center text-xs text-ios-secondary py-10">暂无数据</p>
        </div>
      </template>
    </div>
  </div>
  </AppPullToRefresh>
</template>
