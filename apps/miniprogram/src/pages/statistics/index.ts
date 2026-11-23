import { applyAppearance, isDarkAppearance } from '../../lib/appearance';
import type { ChartResult, GrowthTrendVo, RangeType, StatisticsOverview } from '@baby-record/shared';
import { api, babyContext, explain } from '../../lib/api';
import { dateString } from '../../lib/format';

interface Series { name: string; data: (number | null)[]; color: string }
interface Chart {
  key: string; title: string; columns: string[]; series: Series[]; empty: boolean;
  unit?: string; bar?: boolean; distribution?: boolean;
  latest?: string; percent?: number | null; marker?: number; status?: string; source?: string; points?: GrowthTrendVo['points'];
}

const colors = ['#4086f4', '#efa13e', '#64bc68', '#b364e1', '#ea5472'];
const rangeOptions = [
  { value: '7d', label: '7天' }, { value: '30d', label: '30天' }, { value: 'custom', label: '自定义' },
] as const;
function growthChart(value: GrowthTrendVo): Chart {
  const last = value.latest;
  return {
    key: value.metric, title: value.metric === 'height' ? '📏 身高趋势' : '⚖️ 体重趋势', columns: value.xAxis,
    series: [
      { name: '宝宝实测', data: value.actual, color: value.metric === 'height' ? colors[0] : colors[2] },
      { name: '参考高位 P97', data: value.high, color: colors[1] },
      { name: '参考低位 P3', data: value.low, color: colors[2] },
    ],
    empty: !last, unit: value.unit, source: value.sourceUrl, points: value.points,
    latest: last ? '最新 ' + last.value + value.unit + '（' + last.monthAge + ' 个月龄）' : '',
    percent: last?.percent ?? null,
    marker: Math.max(0, Math.min(100, last?.percent ?? 0)),
    status: last?.percent == null ? '' : last.percent < 0 ? '低于正常参考区间' : last.percent > 100 ? '高于正常参考区间' : '在正常参考范围内',
  };
}

function seriesChart(key: string, title: string, value: ChartResult, palette: string[], unit: string): Chart {
  return {
    key, title, columns: value.xAxis, unit, bar: key !== 'feeding',
    series: value.series.map((item, index) => ({ ...item, color: palette[index % palette.length] })),
    empty: !value.series.some((item) => item.data.some(Boolean)),
  };
}

const chartHeight = 200;
const chartWidth = () => wx.getWindowInfo().windowWidth * (1 - (76 + 60) / 750);
const left = 36;
const rightInset = (chart: Chart) => chart.key === 'feeding' ? 34 : 14;

function draw(chart: Chart, width: number, dark: boolean) {
  const ctx = wx.createCanvasContext('chart-' + chart.key);
  if (chart.distribution) {
    const total = chart.series.reduce((sum, item) => sum + (item.data[0] ?? 0), 0);
    let angle = -Math.PI / 2;
    ctx.setLineWidth(30);
    for (const item of chart.series) {
      const end = angle + ((item.data[0] ?? 0) / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.setStrokeStyle(item.color);
      ctx.arc(width / 2, chartHeight / 2, 60, angle, end);
      ctx.stroke();
      angle = end;
    }
    ctx.draw();
    return;
  }
  const right = width - rightInset(chart), top = 25, bottom = chartHeight - 25;
  const step = (right - left) / Math.max(1, chart.columns.length);
  const x = (index: number) => left + step * (index + .5);
  const maxValue = (series: Series[]) => {
    const maximum = Math.max(1, ...series.flatMap((item) => item.data.map((value) => value ?? 0)));
    const magnitude = 10 ** Math.floor(Math.log10(maximum / 4));
    const interval = [1, 2, 2.5, 3, 4, 5, 10].find((n) => n * magnitude >= maximum / 4) ?? 10;
    return interval * magnitude * 4;
  };
  const dual = chart.key === 'feeding' && chart.series.length > 1;
  const max = maxValue(dual ? chart.series.slice(0, 1) : chart.series);
  const secondMax = dual ? maxValue(chart.series.slice(1)) : max;
  const axisColor = dark ? '#a1a1aa' : '#66666f';
  ctx.setLineWidth(1);
  ctx.setFontSize(10);
  ctx.setFillStyle(axisColor);
  ctx.fillText(chart.unit ?? '', 1, 10);
  if (dual) ctx.fillText('ml', right + 5, 10);
  for (let index = 0; index <= 4; index++) {
    const y = bottom - (bottom - top) * index / 4;
    ctx.beginPath();
    ctx.setLineDash(index ? [3, 3] : []);
    ctx.setStrokeStyle(dark ? '#57575c' : '#dadade');
    ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    ctx.fillText(String(Number((max * index / 4).toFixed(2))), 2, y + 3);
    if (dual) ctx.fillText(String(Number((secondMax * index / 4).toFixed(2))), right + 5, y + 3);
  }
  chart.series.forEach((series, i) => {
    const points: { x: number; y: number }[] = [];
    const seriesMax = dual && i > 0 ? secondMax : max;
    const reference = !!chart.source && i > 0;
    ctx.setStrokeStyle(series.color);
    ctx.setFillStyle(series.color);
    ctx.setLineDash(reference ? [5, 3] : []);
    ctx.setLineWidth(reference ? 1 : 2);
    ctx.beginPath();
    let connecting = false;
    series.data.forEach((value, index) => {
      if (value === null) { connecting = false; return; }
      const point = { x: x(index), y: bottom - (bottom - top) * value / seriesMax };
      if (chart.bar) {
        const barWidth = Math.min(32, step * .6);
        ctx.fillRect(point.x - barWidth / 2, point.y, barWidth, bottom - point.y);
      } else {
        points.push(point);
        if (connecting) ctx.lineTo(point.x, point.y);
        else ctx.moveTo(point.x, point.y);
        connecting = true;
      }
    });
    if (!chart.bar) ctx.stroke();
    if (!reference && points.length <= 31) for (const point of points) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
  ctx.setFillStyle(axisColor);
  const indexes = [...new Set([0, Math.floor((chart.columns.length - 1) / 2), chart.columns.length - 1])];
  indexes.filter((index) => index >= 0).forEach((index) => {
    ctx.fillText(chart.columns[index].slice(-5), x(index) - 13, chartHeight - 6);
  });
  ctx.draw();
}

Page({
  data: { options: rangeOptions, range: '7d' as RangeType, startDate: dateString(), endDate: dateString(), today: dateString(),
    charts: [] as Chart[], overview: null as StatisticsOverview | null, loading: false, error: '' },
  active: 0,
  onShow() { applyAppearance(this, 'tab'); void this.refresh(); },
  onHide() { this.active++; this.setData({ charts: [], overview: null }); },
  async onPullDownRefresh() { try { await this.refresh(); } finally { wx.stopPullDownRefresh(); } },
  async refresh() {
    const request = ++this.active;
    this.setData({ loading: true, error: '' });
    try {
      const baby = (await babyContext())?.baby;
      if (!baby || request !== this.active) return;
      const { range, startDate, endDate } = this.data;
      const params = { babyId: baby.id, range, ...(range === 'custom' && { startDate, endDate }) };
      const [overview, height, weight, feeding, sleep, diaper, supplement] = await Promise.all([
        api<StatisticsOverview>('/statistics/overview', 'GET', params),
        api<GrowthTrendVo>('/growths/trend', 'GET', { babyId: baby.id, metric: 'height' }),
        api<GrowthTrendVo>('/growths/trend', 'GET', { babyId: baby.id, metric: 'weight' }),
        api<ChartResult>('/charts/feeding', 'GET', params),
        api<ChartResult>('/charts/sleep', 'GET', params),
        api<ChartResult>('/charts/diaper', 'GET', params),
        api<ChartResult>('/charts/supplement', 'GET', params),
      ]);
      if (request !== this.active) return;
      const charts = [
        growthChart(height), growthChart(weight), seriesChart('feeding', '🍼 喂养趋势', feeding, [colors[1], colors[0]], '次数'),
        seriesChart('sleep', '😴 睡眠趋势', sleep, [colors[3]], '分钟'), seriesChart('diaper', '🧷 纸尿裤趋势', diaper, [colors[0]], '次'),
        seriesChart('supplement', '💊 补剂趋势', supplement, [colors[2]], '次'),
        { key: 'supplement-stats', title: '💊 补剂统计', distribution: true, columns: [],
          series: overview.supplement.typeStats.map((item, i) => ({ name: item.name, data: [item.count], color: colors[i % colors.length] })),
          empty: !overview.supplement.typeStats.length },
      ];
      this.setData({ charts, overview, loading: false }, () => {
        if (request !== this.active) return;
        const dark = isDarkAppearance();
        charts.filter((chart) => !chart.empty).forEach((chart) => draw(chart, chartWidth(), dark));
      });
    } catch (error) {
      if (request === this.active) this.setData({ error: explain(error), charts: [], overview: null, loading: false });
    }
  },
  chooseRange(event: WxEvent) { this.setData({ range: event.currentTarget.dataset.range as RangeType }); void this.refresh(); },
  changeDate(event: WxInput) {
    const date = event.detail.value;
    if (event.currentTarget.dataset.field === 'start') this.setData({ startDate: date, endDate: date > this.data.endDate ? date : this.data.endDate });
    else this.setData({ endDate: date });
    void this.refresh();
  },
  copySource(event: WxEvent) { wx.setClipboardData({ data: String(event.currentTarget.dataset.source) }); },
  showValue(event: WxEvent<{ x?: number }>) {
    const chart = this.data.charts.find((item) => item.key === event.currentTarget.dataset.key);
    if (!chart || chart.empty) return;
    const fraction = ((event.detail.x ?? left) - left) / (chartWidth() - rightInset(chart) - left);
    const count = chart.columns.length;
    const nearest = Math.floor(fraction * count);
    const index = chart.distribution ? 0 : Math.max(0, Math.min(count - 1, nearest));
    const percent = chart.points?.[index]?.percent;
    const rows = chart.series.map((item) => item.name + '  ' + (item.data[index] ?? '—'));
    if (percent != null) rows.push('位于参考区间 ' + percent + '%');
    wx.showModal({
      title: chart.columns[index] ?? chart.title,
      content: rows.join('\n'),
      confirmText: '确定', success: () => {},
    });
  },
});
