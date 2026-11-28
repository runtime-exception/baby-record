import { applyAppearance } from './appearance';
import type { DailyRecords, GrowthRecordVo, PaginatedResult } from '@baby-record/shared';
import { api, babyContext, explain, report } from './api';
import { confirm, dateString } from './format';
import { openRecord, recordKinds, recordOptions, timeline, type TimelineItem } from './timeline';

const creationDuration = 280;

function measure(page: unknown, selector: string) {
  return new Promise<WxRect | null>((resolve) => {
    wx.createSelectorQuery().in(page).select(selector).boundingClientRect(resolve).exec();
  });
}

function collapseTo(anchor: WxRect, panel: WxRect) {
  return [
    `--entry-x:${anchor.left - panel.left}px`, `--entry-y:${anchor.top - panel.top}px`,
    `--entry-scale-x:${anchor.width / panel.width}`, `--entry-scale-y:${anchor.height / panel.height}`,
    `--entry-duration:${creationDuration}ms`,
  ].join(';');
}

export function registerHistory(isRecordTab: boolean) {
  Page({
    data: { filters: recordKinds, selected: 'all', startDate: dateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), endDate: dateString(),
      today: dateString(), records: [] as TimelineItem[], filtered: [] as (TimelineItem & { dateLabel: string })[], loading: false, error: '', detail: null as TimelineItem | null,
      recordOptions, typeMounted: false, typeOpen: false, typeStyle: '', formEntry: '', formOpen: false, formStyle: '' },
    active: 0,
    customDates: false,
    creationRevision: 0,
    creationPending: false,
    addBounds: null as WxRect | null,
    onShow() {
      applyAppearance(this, isRecordTab ? 'tab' : 'detail');
      const now = new Date();
      const today = dateString(now);
      this.setData({ today, ...(!this.customDates && { startDate: dateString(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: today }) });
      void this.refresh();
    },
    onHide() {
      this.active++;
      this.resetCreation();
      this.setData({ records: [], filtered: [], detail: null });
    },
    onUnload() { this.active++; this.creationRevision++; },
    resetCreation() {
      this.creationRevision++;
      this.creationPending = false;
      this.addBounds = null;
      this.setData({ typeMounted: false, typeOpen: false, typeStyle: '', formEntry: '', formOpen: false, formStyle: '' });
    },
    async openCreation() {
      if (this.creationPending || this.data.typeMounted) return;
      this.creationPending = true;
      const request = ++this.creationRevision;
      const anchor = await measure(this, '#addRecord');
      if (request !== this.creationRevision) return;
      if (!anchor?.width || !anchor.height) { this.resetCreation(); return; }
      this.addBounds = anchor;
      this.setData({ typeMounted: true }, async () => {
        const panel = await measure(this, '#recordTypes');
        if (request !== this.creationRevision) return;
        if (!panel?.width || !panel.height) { this.resetCreation(); return; }
        this.setData({ typeStyle: collapseTo(anchor, panel) }, () => {
          this.afterCreationDelay(request, 20, () => {
            this.setData({ typeOpen: true });
            this.afterCreationDelay(request, creationDuration, () => { this.creationPending = false; });
          });
        });
      });
    },
    async openRecordType(event: WxEvent) {
      if (this.creationPending || !this.data.typeOpen || this.data.formEntry) return;
      const option = recordOptions.find((item) => item.type === event.currentTarget.dataset.type);
      if (!option) return;
      this.creationPending = true;
      const request = ++this.creationRevision;
      const anchor = await measure(this, '#record-type-' + option.type);
      if (request !== this.creationRevision) return;
      if (!anchor?.width || !anchor.height) { this.creationPending = false; return; }
      this.setData({ formEntry: option.type, formStyle: this.formTransition(anchor) }, () => {
        this.afterCreationDelay(request, 20, () => {
          this.setData({ formOpen: true });
          this.afterCreationDelay(request, creationDuration, () => { this.creationPending = false; });
        });
      });
    },
    formTransition(anchor: WxRect) {
      const { windowWidth, windowHeight } = wx.getWindowInfo();
      return collapseTo(anchor, { left: 0, top: 0, width: windowWidth, height: windowHeight });
    },
    afterCreationDelay(request: number, delay: number, callback: () => void) {
      setTimeout(() => { if (request === this.creationRevision) callback(); }, delay);
    },
    backFromForm() { this.closeCreation(true); },
    cancelCreation() { this.closeCreation(false); },
    recordSaved() { this.closeCreation(false, true); },
    closeCreation(returnToTypes: boolean, saved = false) {
      if (!this.data.typeOpen || (this.creationPending && !saved)) return;
      const request = ++this.creationRevision;
      this.creationPending = true;
      const { formEntry, formStyle } = this.data;
      if (formEntry) wx.hideKeyboard();
      this.setData({
        formOpen: false,
        typeOpen: returnToTypes,
        formStyle: !returnToTypes && formEntry && this.addBounds ? this.formTransition(this.addBounds) : formStyle,
      }, () => {
        this.afterCreationDelay(request, creationDuration, () => {
          if (returnToTypes) {
            this.setData({ formEntry: '', formStyle: '' });
            this.creationPending = false;
          } else {
            this.resetCreation();
            if (saved) void this.refresh();
          }
        });
      });
    },
    async onPullDownRefresh() { try { await this.refresh(); } finally { wx.stopPullDownRefresh(); } },
    async refresh() {
      const request = ++this.active;
      const { startDate, endDate } = this.data;
      this.setData({ loading: true, error: '', detail: null });
      try {
        const baby = (await babyContext())?.baby;
        if (!baby || request !== this.active) return;
        const babyId = baby.id;
        const records = await api<DailyRecords>('/records/range', 'GET', { babyId, startDate, endDate });
        const growth = records.growth ?? [];
        if (!records.growth) {
          for (let page = 1; request === this.active; page++) {
            const result = await api<PaginatedResult<GrowthRecordVo>>('/growths', 'GET', { babyId, startDate, endDate, page, pageSize: 100 });
            growth.push(...result.list);
            if (!result.list.length || growth.length >= result.total) break;
          }
        }
        if (request !== this.active) return;
        this.setData({ records: timeline(records, growth) });
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
      this.customDates = true;
      const value = event.detail.value;
      if (event.currentTarget.dataset.field === 'start') {
        this.setData({ startDate: value, endDate: value > this.data.endDate ? value : this.data.endDate });
      } else this.setData({ endDate: value });
      void this.refresh();
    },
    back() { wx.navigateBack(); },
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
