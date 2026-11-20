import { applyAppearance } from '../../lib/appearance';
import type { ChartResult, GrowthTrendVo, RangeType, StatisticsOverview } from '@baby-record/shared';
import { api, babyContext, explain } from '../../lib/api';
import { dateString } from '../../lib/format';

interface Series { name: string; data: (number | null)[]; color: string }
interface Chart { key: string; title: string; columns: string[]; series: Series[]; note: string; empty: boolean }

const colors = ['#007aff', '#17a99e', '#f68d36'];
const rangeOptions = [
  { value: 'today', label: '今天' }, { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' }, { value: 'custom', label: '自定义' },
] as const;
function growthChart(value: GrowthTrendVo): Chart {
  const last = value.latest;
  return {
    key: value.metric, title: value.metric === 'height' ? '📏 身高趋势' : '⚖️ 体重趋势', columns: value.xAxis,
    series: [
      { name: '实测', data: value.actual, color: colors[0] }, { name: '参考低位 P3', data: value.low, color: colors[1] },
      { name: '参考高位 P97', data: value.high, color: colors[2] },
    ],
    empty: !last, note: last ? '最新 ' + last.value + ' ' + value.unit + ' · ' + last.monthAge + ' 个月龄 · 参考区间 ' + (last.percent === null ? '—' : last.percent + '%') : '',
  };
}
function seriesChart(key: string, title: string, value: ChartResult): Chart {
  return {
    key, title, columns: value.xAxis, series: value.series.map((item, index) => ({ ...item, color: colors[index] })),
    empty: !value.series.some((item) => item.data.some(Boolean)), note: '',
  };
}

function draw(chart: Chart, width: number) {
  const ctx = wx.createCanvasContext('chart-' + chart.key);
  const height = 150;
  const left = 42, right = width - 14, top = 12, bottom = height - 24;
  const x = (index: number) => chart.columns.length <= 1 ? (left + right) / 2 : left + (right - left) * index / (chart.columns.length - 1);
  const reference = chart.series.flatMap((series) => series.data.filter((n): n is number => n !== null));
  const isGrowth = chart.key === 'height' || chart.key === 'weight';
  const scale = (series: Series) => {
    const values = series.data.filter((n): n is number => n !== null);
    const min = isGrowth ? Math.floor(Math.min(...reference)) - 1 : 0;
    const max = Math.max(...(isGrowth ? reference : values), min + 1);
    return { min, max };
  };
  const axisScale = scale(chart.series[0]);
  ctx.setLineWidth(1);
  ctx.setFontSize(10);
  for (let index = 0; index <= 4; index++) {
    const y = bottom - (bottom - top) * index / 4;
    ctx.beginPath();
    ctx.setStrokeStyle('#e1e7ef');
    ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    ctx.setFillStyle('#64748b');
    const label = index === 0 ? axisScale.min : axisScale.min + (axisScale.max - axisScale.min) * index / 4;
    ctx.fillText(String(Number(label.toFixed(1))), 1, y + 3);
  }
  chart.series.forEach((series) => {
    const { min, max } = scale(series);
    const points: { x: number; y: number }[] = [];
    ctx.setStrokeStyle(series.color);
    ctx.setFillStyle(series.color);
    ctx.setLineWidth(2);
    ctx.beginPath();
    let connecting = false;
    series.data.forEach((value, index) => {
      if (value === null) { connecting = false; return; }
      const point = { x: x(index), y: bottom - (bottom - top) * (value - min) / (max - min) };
      points.push(point);
      if (connecting) ctx.lineTo(point.x, point.y);
      else ctx.moveTo(point.x, point.y);
      connecting = true;
    });
    ctx.stroke();
    if (points.length <= 31) for (const point of points) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
  ctx.setFillStyle('#64748b');
  const indexes = [...new Set([0, Math.floor((chart.columns.length - 1) / 2), chart.columns.length - 1])];
  indexes.filter((index) => index >= 0).forEach((index) => {
    ctx.fillText(chart.columns[index].slice(-5), x(index) - 15, height - 6);
  });
  ctx.draw();
}

Page({
  data: { options: rangeOptions, range: '7d' as RangeType, startDate: dateString(), endDate: dateString(), today: dateString(),
    charts: [] as Chart[], overview: null as StatisticsOverview | null, loading: false, error: '' },
  active: 0,
  onShow() { applyAppearance(this, true); void this.refresh(); },
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
        growthChart(height), growthChart(weight), seriesChart('feeding', '🍼 喂养趋势', feeding),
        seriesChart('sleep', '🌙 睡眠趋势', sleep), seriesChart('diaper', '🧷 纸尿裤趋势', diaper),
        seriesChart('supplement', '💊 补剂趋势', supplement),
      ];
      this.setData({ charts, overview, loading: false }, () => {
        if (request !== this.active) return;
        const width = wx.getWindowInfo().windowWidth * (1 - (64 + 56) / 750);
        charts.filter((chart) => !chart.empty).forEach((chart) => draw(chart, width));
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
  showValue(event: WxEvent<{ x?: number }>) {
    const chart = this.data.charts.find((item) => item.key === event.currentTarget.dataset.key);
    if (!chart || chart.empty) return;
    const width = wx.getWindowInfo().windowWidth * (1 - (64 + 56) / 750);
    const index = Math.round(Math.max(0, Math.min(1, ((event.detail.x ?? 42) - 42) / (width - 56))) * (chart.columns.length - 1));
    wx.showModal({
      title: chart.columns[index],
      content: chart.series.map((item) => item.name + '  ' + (item.data[index] ?? '—')).join('\n'),
      confirmText: '确定', success: () => {},
    });
  },
});
