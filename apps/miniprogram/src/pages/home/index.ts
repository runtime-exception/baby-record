import { applyAppearance } from '../../lib/appearance';
import { GENDER_LABELS, type DashboardData, type MemberBaby, getTempStatus } from '@baby-record/shared';
import { api, avatarSource, babyContext, explain, selectBaby } from '../../lib/api';
import { duration, timeString } from '../../lib/format';
import { openRecord } from '../../lib/timeline';

const homeShortcuts = [
  { kind: 'supplement', label: '补剂', icon: '💊' },
  { kind: 'foodAllergy', label: '排敏', icon: '🔎' },
  { kind: 'bath', label: '洗澡', icon: '🛁' },
  { kind: 'other', label: '其他', icon: '✨' },
] as const;

const babyThemes = [
  'linear-gradient(145deg,#387de9,#80c9ec)',
  'linear-gradient(145deg,#7558d5,#c296eb)',
  'linear-gradient(145deg,#149b8f,#82dccd)',
  'linear-gradient(145deg,#d87827,#f4c173)',
  'linear-gradient(145deg,#c64d82,#f19ab6)',
  'linear-gradient(145deg,#5268bd,#9bb0ee)',
];

function babyTheme(index: number) {
  return babyThemes[Math.max(0, index) % babyThemes.length];
}

function metricTexts(baby: MemberBaby, growth?: DashboardData['latestGrowth']) {
  const height = growth?.height ?? baby.birthHeight;
  const weight = growth?.weight ?? baby.birthWeight;
  return {
    heightText: height == null ? '身高 —' : '身高 ' + height.toFixed(1) + ' cm',
    weightText: weight == null ? '体重 —' : '体重 ' + weight.toFixed(1) + ' kg',
  };
}

async function latestGrowth(babyId: string): Promise<DashboardData['latestGrowth']> {
  try {
    const summary = await api<Pick<DashboardData, 'latestGrowth'>>('/dashboard', 'GET', { babyId });
    return summary.latestGrowth;
  } catch {
    return null;
  }
}

interface SwitchCard {
  id: string;
  avatar: string;
  displayName: string;
  genderLabel: string;
  birthday: string;
  age: MemberBaby['age'];
  heightText: string;
  weightText: string;
  theme: string;
}

const SWITCHER_ANIMATION_MS = 280;

function switcherStyle(avatar: WxRect, count: number) {
  const { windowWidth, windowHeight, statusBarHeight } = wx.getWindowInfo();
  const rpx = windowWidth / 750;
  const verticalInset = (statusBarHeight ?? 20) + 48;
  const width = windowWidth - 64 * rpx;
  const height = Math.min((320 + count * 300) * rpx, windowHeight - 2 * verticalInset);
  return [
    `width:${width}px`,
    `height:${height}px`,
    `--avatar-x:${avatar.left + avatar.width / 2 - windowWidth / 2}px`,
    `--avatar-y:${avatar.top + avatar.height / 2 - windowHeight / 2}px`,
    `--avatar-scale-x:${avatar.width / width}`,
    `--avatar-scale-y:${avatar.height / height}`,
    `--switcher-duration:${SWITCHER_ANIMATION_MS}ms`,
  ].join(';');
}

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
    baby: null as MemberBaby | null, avatar: '', quick: homeShortcuts, error: '', loading: true,
    cards: [] as ReturnType<typeof dashboardCards>, summary: null as DashboardData | null,
    growth: '', allergyHeadline: '', showAllergy: false,
    list: [] as MemberBaby[], switcherOpen: false, switcherExpanded: false,
    switcherStyle: '', switchCards: [] as SwitchCard[],
  },
  active: 0,
  switcherRevision: 0,
  onShow() { applyAppearance(this, 'tab'); void this.refresh(); },
  onHide() {
    this.active++;
    this.switcherRevision++;
    this.setData({
      baby: null, avatar: '', summary: null, cards: [], showAllergy: false,
      list: [], switcherOpen: false, switcherExpanded: false, switchCards: [],
    });
  },
  onUnload() {
    this.active++;
    this.switcherRevision++;
  },
  async onPullDownRefresh() { try { await this.refresh(); } finally { wx.stopPullDownRefresh(); } },
  async refresh() {
    const request = ++this.active;
    this.setData({ loading: true, error: '' });
    try {
      const context = await babyContext();
      const baby = context?.baby;
      if (!baby || request !== this.active) return;
      const [summary, avatar] = await Promise.all([
        api<DashboardData>('/dashboard', 'GET', { babyId: baby.id }),
        avatarSource(baby.avatar),
      ]);
      if (request !== this.active) return;
      const { allergic, possible } = summary.foodAllergySummary;
      const metrics = metricTexts(baby, summary.latestGrowth);
      this.setData({
        baby, list: context.list, avatar, summary, cards: dashboardCards(summary),
        growth: [metrics.heightText, metrics.weightText].join(' · '),
        allergyHeadline: allergic.length ? '已发现 ' + allergic.length + ' 种过敏辅食'
          : '暂未发现过敏辅食' + (possible.length ? ' · ' + possible.length + ' 种待观察' : ''),
      });
    } catch (error) {
      if (request === this.active) {
        this.switcherRevision++;
        this.setData({
          baby: null, list: [], summary: null, switcherOpen: false, switcherExpanded: false, switchCards: [],
          error: explain(error),
        });
      }
    } finally { if (request === this.active) this.setData({ loading: false }); }
  },
  async openSwitcher() {
    const { list, switcherOpen } = this.data;
    if (!list.length || switcherOpen) return;
    const request = ++this.switcherRevision;
    const avatar = await new Promise<WxRect | null>((resolve) => {
      wx.createSelectorQuery().in(this).select('.avatarTrigger').boundingClientRect(resolve).exec();
    });
    if (!avatar || request !== this.switcherRevision) return;

    this.setData({
      switcherOpen: true, switcherExpanded: false,
      switcherStyle: switcherStyle(avatar, list.length), switchCards: [],
    }, () => {
      setTimeout(() => {
        if (request === this.switcherRevision) this.setData({ switcherExpanded: true });
      }, 20);
    });
    try {
      const cards = await Promise.all(list.map(async (item, index) => {
        const [avatar, growth] = await Promise.all([avatarSource(item.avatar), latestGrowth(item.id)]);
        return {
          id: item.id,
          avatar,
          displayName: item.nickname?.trim() ? `${item.nickname.trim()}（${item.name}）` : item.name,
          genderLabel: GENDER_LABELS[item.gender],
          birthday: item.birthday,
          age: item.age,
          theme: babyTheme(index),
          ...metricTexts(item, growth),
        };
      }));
      if (request === this.switcherRevision) this.setData({ switchCards: cards });
    } catch (error) {
      if (request === this.switcherRevision) {
        this.switcherRevision++;
        this.setData({ switcherOpen: false, switcherExpanded: false, switchCards: [] });
        wx.showToast({ title: explain(error), icon: 'none' });
      }
    }
  },
  dismissSwitcher(onClosed?: () => void) {
    if (!this.data.switcherExpanded) return;
    const request = ++this.switcherRevision;
    this.setData({ switcherExpanded: false }, () => {
      setTimeout(() => {
        if (request !== this.switcherRevision) return;
        this.setData({ switcherOpen: false, switchCards: [] });
        onClosed?.();
      }, SWITCHER_ANIMATION_MS);
    });
  },
  closeSwitcher() { this.dismissSwitcher(); },
  noop() {},
  chooseBaby(event: WxEvent) {
    const id = String(event.currentTarget.dataset.id ?? '');
    if (!id) return;
    this.dismissSwitcher(() => {
      if (id === String(this.data.baby?.id ?? '')) return;
      selectBaby(id);
      this.setData({ baby: null, avatar: '', summary: null, cards: [], showAllergy: false });
      void this.refresh();
    });
  },
  addBaby() {
    this.dismissSwitcher(() => wx.navigateTo({ url: '/pages/baby/index' }));
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
