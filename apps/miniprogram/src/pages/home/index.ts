import { applyAppearance } from '../../lib/appearance';
import { type DashboardData, type DailyRecords, type MemberBaby, type StatusCard, TEMP_STATUS_LABEL, getTempStatus } from '@baby-record/shared';
import { api, avatarSource, babyContext, explain } from '../../lib/api';
import { dateString, timeString } from '../../lib/format';
import { openRecord, timeline, type TimelineItem } from '../../lib/timeline';

const quick = [
  { label: '喂养', icon: '🍼', kind: 'feeding' }, { label: '体温', icon: '🌡️', kind: 'temperature' },
  { label: '换尿布', icon: '🧷', kind: 'diaper' }, { label: '睡眠', icon: '🌙', kind: 'sleep' },
  { label: '其他', icon: '✨', kind: 'other' },
];
function card(label: string, icon: string, state: StatusCard) {
  const gap = state.minutesSince;
  const ago = gap === null ? '暂无记录' : gap < 60 ? gap + ' 分钟前' : Math.floor(gap / 60) + ' 小时 ' + gap % 60 + ' 分钟前';
  return { label, icon, ago, detail: [state.lastTime && timeString(state.lastTime), state.text].filter(Boolean).join(' · ') };
}

Page({
  data: {
    baby: null as MemberBaby | null, avatar: '', quick, error: '', loading: true, today: [] as TimelineItem[],
    cards: [] as ReturnType<typeof card>[], summary: null as DashboardData | null,
    nextFeeding: '', nextSleep: '', tempStatus: '',
  },
  active: 0,
  onShow() { applyAppearance(this, true); void this.refresh(); },
  onHide() { this.active++; this.setData({ baby: null, avatar: '', summary: null, cards: [], today: [] }); },
  async onPullDownRefresh() { try { await this.refresh(); } finally { wx.stopPullDownRefresh(); } },
  async refresh() {
    const request = ++this.active;
    this.setData({ loading: true, error: '' });
    try {
      const baby = (await babyContext())?.baby;
      if (!baby || request !== this.active) return;
      const [summary, day, avatar] = await Promise.all([
        api<DashboardData>('/dashboard', 'GET', { babyId: baby.id }),
        api<DailyRecords>('/records/daily', 'GET', { babyId: baby.id, date: dateString() }),
        avatarSource(baby.avatar),
      ]);
      if (request !== this.active) return;
      this.setData({
        baby, avatar, summary, today: timeline(day).slice(0, 6),
        cards: [card('喂养', '🍼', summary.feeding), card('纸尿裤', '🧷', summary.diaper), card('睡眠', '🌙', summary.sleep)],
        nextFeeding: summary.feedingSuggestion ? timeString(summary.feedingSuggestion.recommendedNextFeedTime) : '',
        nextSleep: summary.wakePrediction.recommendedSleepTime ? timeString(summary.wakePrediction.recommendedSleepTime) : '',
        tempStatus: summary.latestTemperature ? TEMP_STATUS_LABEL[getTempStatus(summary.latestTemperature.temperature)] : '',
      });
    } catch (error) {
      if (request === this.active) this.setData({ baby: null, summary: null, today: [], error: explain(error) });
    } finally { if (request === this.active) this.setData({ loading: false }); }
  },
  open(event: WxEvent) {
    const { kind, id } = event.currentTarget.dataset;
    openRecord(String(kind), id ? Number(id) : undefined);
  },
  history() { wx.switchTab({ url: '/pages/history/index' }); },
});
