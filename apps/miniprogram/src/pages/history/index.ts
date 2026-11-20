import { applyAppearance } from '../../lib/appearance';
import type { DailyRecords, GrowthRecordVo, PaginatedResult } from '@baby-record/shared';
import { api, babyContext, explain, report } from '../../lib/api';
import { confirm, dateString } from '../../lib/format';
import { openRecord, recordKinds, timeline, type TimelineItem } from '../../lib/timeline';

Page({
  data: { quick: recordKinds.slice(0, 4), filters: recordKinds, selected: 'all', mode: 'range', startDate: dateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), endDate: dateString(),
    today: dateString(), records: [] as TimelineItem[], filtered: [] as TimelineItem[], loading: false, error: '', detail: null as TimelineItem | null },
  active: 0,
  onShow() { applyAppearance(this, true); void this.refresh(); },
  onHide() { this.active++; this.setData({ records: [], filtered: [], detail: null }); },
  async onPullDownRefresh() { try { await this.refresh(); } finally { wx.stopPullDownRefresh(); } },
  async refresh() {
    const request = ++this.active;
    const { mode, startDate, endDate } = this.data;
    this.setData({ loading: true, error: '', detail: null });
    try {
      const baby = (await babyContext())?.baby;
      if (!baby || request !== this.active) return;
      const babyId = baby.id;
      const [records, growth] = await Promise.all([
        mode === 'day'
          ? api<DailyRecords>('/records/daily', 'GET', { babyId, date: startDate })
          : api<DailyRecords>('/records/range', 'GET', { babyId, startDate, endDate }),
        api<PaginatedResult<GrowthRecordVo>>('/growths', 'GET', { babyId, startDate, endDate: mode === 'day' ? startDate : endDate, pageSize: 100 }),
      ]);
      if (request !== this.active) return;
      this.setData({ records: timeline(records, growth.list) });
      this.filter();
    } catch (error) {
      if (request === this.active) this.setData({ error: explain(error), records: [], filtered: [] });
    } finally { if (request === this.active) this.setData({ loading: false }); }
  },
  filter() {
    const { selected, records } = this.data;
    this.setData({ filtered: selected === 'all' ? records : records.filter((item) => item.kind === selected) });
  },
  chooseFilter(event: WxEvent) { this.setData({ selected: String(event.currentTarget.dataset.kind) }); this.filter(); },
  changeMode(event: WxEvent) { this.setData({ mode: String(event.currentTarget.dataset.mode) }); void this.refresh(); },
  chooseDate(event: WxInput) {
    const value = event.detail.value;
    if (event.currentTarget.dataset.field === 'start') {
      this.setData({ startDate: value, endDate: value > this.data.endDate ? value : this.data.endDate });
    } else this.setData({ endDate: value });
    void this.refresh();
  },
  create(event: WxEvent) { openRecord(String(event.currentTarget.dataset.kind)); },
  view(event: WxEvent) { this.setData({ detail: this.data.records.find((item) => item.key === event.currentTarget.dataset.key) ?? null }); },
  viewSheet() {},
  close() { this.setData({ detail: null }); },
  edit() { const item = this.data.detail; if (item) openRecord(item.kind, item.id); },
  async remove() {
    const item = this.data.detail;
    const path = recordKinds.find((entry) => entry.kind === item?.kind)?.path;
    if (!item || !path || !await confirm('删除记录', '确定删除这条记录？')) return;
    try {
      await api(path + '/' + item.id, 'DELETE');
      wx.showToast({ title: '记录已删除', icon: 'success' });
      await this.refresh();
    } catch (error) { report(error); }
  },
});
