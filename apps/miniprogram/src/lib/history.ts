import { applyAppearance } from './appearance';
import type { DailyRecords, GrowthRecordVo, PaginatedResult } from '@baby-record/shared';
import { api, babyContext, explain, report } from './api';
import { confirm, dateString } from './format';
import { openRecord, recordKinds, recordShortcuts, timeline, type TimelineItem } from './timeline';

export function registerHistory(showShortcuts: boolean) {
  Page({
    data: { quick: recordShortcuts.slice(0, 4), filters: recordKinds, selected: 'all', startDate: dateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), endDate: dateString(),
      today: dateString(), records: [] as TimelineItem[], filtered: [] as (TimelineItem & { dateLabel: string })[], loading: false, error: '', detail: null as TimelineItem | null },
    active: 0,
    onShow() { applyAppearance(this, showShortcuts ? 'tab' : 'detail'); void this.refresh(); },
    onHide() { this.active++; this.setData({ records: [], filtered: [], detail: null }); },
    async onPullDownRefresh() { try { await this.refresh(); } finally { wx.stopPullDownRefresh(); } },
    async refresh() {
      const request = ++this.active;
      const { startDate, endDate } = this.data;
      this.setData({ loading: true, error: '', detail: null });
      try {
        const baby = (await babyContext())?.baby;
        if (!baby || request !== this.active) return;
        const babyId = baby.id;
        const [records, growth] = await Promise.all([
          api<DailyRecords>('/records/range', 'GET', { babyId, startDate, endDate }),
          api<PaginatedResult<GrowthRecordVo>>('/growths', 'GET', { babyId, startDate, endDate, pageSize: 100 }),
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
      const filtered = selected === 'all' ? records : records.filter((item) => item.kind === selected);
      this.setData({ filtered: filtered.map((item, index) => {
        const [, month, day] = item.date.split('-');
        return { ...item, dateLabel: index === 0 || filtered[index - 1].date !== item.date ? Number(month) + '月' + Number(day) + '日' : '' };
      }) });
    },
    chooseFilter(event: WxEvent) { this.setData({ selected: String(event.currentTarget.dataset.kind) }); this.filter(); },
    chooseDate(event: WxInput) {
      const value = event.detail.value;
      if (event.currentTarget.dataset.field === 'start') {
        this.setData({ startDate: value, endDate: value > this.data.endDate ? value : this.data.endDate });
      } else this.setData({ endDate: value });
      void this.refresh();
    },
    back() { wx.navigateBack(); },
    create(event: WxEvent) { openRecord(String(event.currentTarget.dataset.kind)); },
    view(event: WxEvent) { this.setData({ detail: this.data.records.find((item) => item.key === event.currentTarget.dataset.key) ?? null }); },
    viewSheet() {},
    close() { this.setData({ detail: null }); },
    edit(event: WxEvent) { const item = this.recordFor(event); if (item) openRecord(item.kind, item.id); },
    recordFor(event: WxEvent) {
      const key = event.currentTarget.dataset.key;
      return key ? this.data.records.find((item) => item.key === key) : this.data.detail;
    },
    async remove(event: WxEvent) {
      const request = this.active;
      const item = this.recordFor(event);
      const path = recordKinds.find((entry) => entry.kind === item?.kind)?.path;
      if (!item || !path || !await confirm('删除记录', '确定删除这条记录？') || request !== this.active) return;
      try {
        await api(path + '/' + item.id, 'DELETE');
        wx.showToast({ title: '记录已删除', icon: 'success' });
        await this.refresh();
      } catch (error) { report(error); }
    },
  });
}
