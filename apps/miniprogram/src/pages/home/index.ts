import { applyAppearance } from '../../lib/appearance';
import { type DashboardData, type MemberBaby, getTempStatus } from '@baby-record/shared';
import { api, avatarSource, babyContext, explain } from '../../lib/api';
import { duration, timeString } from '../../lib/format';
import { openRecord, recordShortcuts } from '../../lib/timeline';

function dashboardCards(summary: DashboardData) {
  const { feeding, diaper, sleep, wakePrediction, feedingSuggestion, latestTemperature } = summary;
  const sleepEnd = wakePrediction.lastWakeTime;
  const sleepWindow = wakePrediction.sleepWindowStart;
  const sleepLimit = wakePrediction.maxAwakeUntil;
  const now = Date.now();
  const awake = sleepEnd && sleepWindow && sleepLimit && !wakePrediction.isSleeping;
  const sleepStatus = !awake ? null : now < Date.parse(sleepWindow)
    ? { text: '（⚡ 精力充沛）', tone: 'normal' } : now <= Date.parse(sleepLimit)
      ? { text: '（🌙 该哄睡了）', tone: 'watch' } : { text: '（😴 宝宝困了）', tone: 'fever' };
  return [
    { kind: 'feeding', icon: '🍼', label: '距离上次喂养', value: feeding.text || '—',
      detail: feeding.lastTime ? '最近 ' + timeString(feeding.lastTime) : '今天还没有喂养记录',
      advice: feedingSuggestion ? '建议 ' + timeString(feedingSuggestion.recommendedNextFeedTime) + ' 喂养' : '',
      extra: feedingSuggestion?.perFeedMinMl && feedingSuggestion.perFeedMaxMl
        ? ' · 约' + feedingSuggestion.perFeedMinMl + '–' + feedingSuggestion.perFeedMaxMl + 'ml' : '' },
    { kind: 'diaper', icon: '🧷', label: '距离上次换纸尿裤', value: diaper.text || '—',
      detail: diaper.lastTime ? '最近 ' + timeString(diaper.lastTime) : '今天还没有更换记录' },
    { kind: 'sleep', icon: '😴', label: '距上次睡觉',
      value: wakePrediction.isSleeping ? '睡眠中' : awake ? duration(Math.max(0, Math.floor((now - Date.parse(sleepEnd)) / 60000))) : '—',
      detail: wakePrediction.isSleeping ? (sleep.lastTime ? '从 ' + timeString(sleep.lastTime) + ' 开始睡眠' : '宝宝正在睡眠')
        : awake ? '最近结束 ' + timeString(sleepEnd) : '还没有完整的睡眠记录',
      advice: awake && wakePrediction.recommendedSleepTime ? '建议 ' + timeString(wakePrediction.recommendedSleepTime) + ' 哄睡' : '',
      status: sleepStatus },
    { kind: 'temperature', icon: '🌡️', label: '宝宝最新体温',
      value: latestTemperature ? latestTemperature.temperature.toFixed(1) + '°C' : '',
      tone: latestTemperature ? getTempStatus(latestTemperature.temperature) : 'unavailable',
      detail: latestTemperature ? '' : '暂无体温记录', warning: (latestTemperature?.temperature ?? 0) > 37.2 },
  ];
}

Page({
  data: {
    baby: null as MemberBaby | null, avatar: '', quick: recordShortcuts, error: '', loading: true,
    cards: [] as ReturnType<typeof dashboardCards>, summary: null as DashboardData | null,
    growth: '', allergyHeadline: '', showAllergy: false,
  },
  active: 0,
  onShow() { applyAppearance(this, 'tab'); void this.refresh(); },
  onHide() { this.active++; this.setData({ baby: null, avatar: '', summary: null, cards: [], showAllergy: false }); },
  async onPullDownRefresh() { try { await this.refresh(); } finally { wx.stopPullDownRefresh(); } },
  async refresh() {
    const request = ++this.active;
    this.setData({ loading: true, error: '' });
    try {
      const baby = (await babyContext())?.baby;
      if (!baby || request !== this.active) return;
      const [summary, avatar] = await Promise.all([
        api<DashboardData>('/dashboard', 'GET', { babyId: baby.id }),
        avatarSource(baby.avatar),
      ]);
      if (request !== this.active) return;
      const { allergic, possible } = summary.foodAllergySummary;
      const height = summary.latestGrowth?.height;
      const weight = summary.latestGrowth?.weight;
      this.setData({
        baby, avatar, summary, cards: dashboardCards(summary),
        growth: [height != null && '📏 ' + height.toFixed(1) + 'cm', weight != null && '⚖️ ' + weight.toFixed(1) + 'kg'].filter(Boolean).join(' · '),
        allergyHeadline: allergic.length ? '已发现 ' + allergic.length + ' 种过敏辅食'
          : '暂未发现过敏辅食' + (possible.length ? ' · ' + possible.length + ' 种待观察' : ''),
      });
    } catch (error) {
      if (request === this.active) this.setData({ baby: null, summary: null, error: explain(error) });
    } finally { if (request === this.active) this.setData({ loading: false }); }
  },
  open(event: WxEvent) { openRecord(String(event.currentTarget.dataset.kind)); },
  advice(event: WxEvent) {
    const { summary } = this.data;
    if (event.currentTarget.dataset.kind === 'feeding' && summary?.feedingSuggestion) {
      const advice = summary.feedingSuggestion;
      wx.showModal({ title: '喂养建议', content: '建议 ' + timeString(advice.recommendedNextFeedTime) + ' 喂养\n推荐间隔 ' + advice.intervalRangeText,
        success: () => {} });
    } else if (summary?.wakePrediction.recommendedSleepTime) {
      const advice = summary.wakePrediction;
      wx.showModal({ title: '哄睡建议', content: '建议 ' + timeString(summary.wakePrediction.recommendedSleepTime) + ' 哄睡\n清醒时长 ' + duration(advice.recommendedWakeMinutes) + '–' + duration(advice.maxWakeMinutes),
        success: () => {} });
    }
  },
  toggleAllergy() { this.setData({ showAllergy: !this.data.showAllergy }); },
  keepAllergyOpen() {},
  history() { wx.navigateTo({ url: '/pages/history-detail/index' }); },
});
