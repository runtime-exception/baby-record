import { applyAppearance } from '../../lib/appearance';
import { EXERCISE_UNITS } from '@baby-record/shared';
import { api, babyContext, explain, isCurrentBaby, report } from '../../lib/api';
import { confirm } from '../../lib/format';

interface ConfigItem { id: number; name: string; emoji?: string | null; defaultAmount?: string | null; defaultUnit?: string | null; isActive: boolean }
const titles: Record<string, string> = { foods: '辅食管理', 'supplement-configs': '补剂管理', 'exercise-configs': '运动管理' };
const unitOptions = [...EXERCISE_UNITS];
const labels: Record<string, string> = { foods: '辅食', 'supplement-configs': '补剂', 'exercise-configs': '运动' };
const emojis: Record<string, string[]> = {
  foods: ['🥣', '🍚', '🌾', '🍜', '🥔', '🍠', '🫘', '🥚', '🌭', '🥩', '🍗', '🐟', '🦐', '🍢', '🥛', '🥜',
    '🌰', '🍄', '🎃', '🥕', '🥦', '🥬', '🌽', '🍅', '🍎', '🍌', '🍐', '🥑', '🥝', '🍇', '🍉', '🍊', '🫐', '🍓', '🥭', '🍑'],
  'supplement-configs': ['💊', '☀️', '🐟', '🦴', '🩸', '💧', '🍼', '🥛'],
  'exercise-configs': ['🤸', '🏋️', '🧸', '🐾', '🤲', '👶', '⚽', '🎯'],
};
Page({
  onShow() { applyAppearance(this, 'detail'); },
  data: { babyId: '', kind: '', title: '', label: '', search: '', items: [] as ConfigItem[], visibleItems: [] as ConfigItem[], editing: 0, customIcon: false, name: '', emoji: '', defaultAmount: '', defaultUnit: '',
    unitOptions, emojiOptions: [] as string[], busy: false, onlyActive: false, error: '' },
  back() { wx.navigateBack(); },
  async onLoad(query: { kind?: string }) {
    const kind = query.kind ?? '';
    if (!Object.prototype.hasOwnProperty.call(titles, kind)) return report(new Error('配置类型无效'));
    this.setData({ kind, title: titles[kind], label: labels[kind], emojiOptions: emojis[kind] });
    this.close();
    await this.refresh();
  },
  async onPullDownRefresh() { try { await this.refresh(); } finally { wx.stopPullDownRefresh(); } },
  async refresh() {
    try {
      const baby = (await babyContext())?.baby;
      if (!baby || !this.data.kind) return;
      const items = await api<ConfigItem[]>('/' + this.data.kind, 'GET', { includeInactive: true }, baby.id);
      this.setData({ babyId: baby.id, items, error: '' });
      this.filterItems();
    } catch (error) { this.setData({ items: [], visibleItems: [], error: explain(error) }); }
  },
  edit(event: WxEvent) {
    const id = Number(event.currentTarget.dataset.id);
    const item = this.data.items.find((value) => value.id === id);
    if (!item || this.data.busy) return;
    this.setData({
      editing: id, name: item.name, emoji: item.emoji ?? '', customIcon: !!item.emoji && !this.data.emojiOptions.includes(item.emoji),
      defaultAmount: item?.defaultAmount ?? (this.data.kind === 'exercise-configs' ? '1' : ''),
      defaultUnit: item?.defaultUnit ?? (this.data.kind === 'exercise-configs' ? '分钟' : ''),
    });
    wx.pageScrollTo({ scrollTop: 0, duration: 180 });
  },
  close() {
    const exercise = this.data.kind === 'exercise-configs';
    this.setData({
      editing: 0, name: '', emoji: this.data.emojiOptions[0] ?? '', customIcon: false,
      defaultAmount: exercise ? '1' : '', defaultUnit: exercise ? '分钟' : '',
    });
  },
  searchItems(event: WxInput) { this.setData({ search: event.detail.value }); this.filterItems(); },
  clearSearch() { this.setData({ search: '' }); this.filterItems(); },
  filterItems() {
    const { search, items, onlyActive } = this.data;
    const term = search.trim().toLowerCase();
    this.setData({ visibleItems: items.filter((item) => (!onlyActive || item.isActive) && item.name.toLowerCase().includes(term)) });
  },
  field(event: WxInput) { this.setData({ [String(event.currentTarget.dataset.key)]: event.detail.value }); },
  unit(event: WxInput) { this.setData({ defaultUnit: unitOptions[Number(event.detail.value)] }); },
  icon(event: WxEvent) { this.setData({ emoji: String(event.currentTarget.dataset.value), customIcon: false }); },
  custom() { this.setData({ customIcon: true, emoji: '' }); },
  async save() {
    const d = this.data;
    if (d.busy || !d.babyId || !isCurrentBaby(d.babyId)) return;
    if (!d.name.trim()) return report(new Error('请输入名称'));
    const payload = {
      name: d.name.trim(), emoji: d.emoji.trim(),
      ...(d.kind !== 'foods' && { defaultAmount: d.defaultAmount.trim(), defaultUnit: d.defaultUnit.trim() }),
    };
    this.setData({ busy: true });
    try {
      await api('/' + d.kind + (d.editing ? '/' + d.editing : ''), d.editing ? 'PATCH' : 'POST', payload, d.babyId);
      this.close();
      await this.refresh();
    } catch (error) { report(error); }
    finally { this.setData({ busy: false }); }
  },
  activeFilter() { this.setData({ onlyActive: !this.data.onlyActive }); this.filterItems(); },
  async changeActive(event: WxEvent) {
    const id = Number(event.currentTarget.dataset.id);
    const item = this.data.items.find((value) => value.id === id);
    const { babyId, kind, busy } = this.data;
    if (!item || !babyId || !isCurrentBaby(babyId) || busy) return;
    if (item.isActive && !await confirm('停用', '确定停用「' + item.name + '」？历史记录将保留。')) return;
    this.setData({ busy: true });
    try {
      const path = '/' + kind + '/' + id;
      if (item.isActive) await api(path, 'DELETE', undefined, babyId);
      else await api(path, 'PATCH', { isActive: true }, babyId);
      await this.refresh();
    } catch (error) { report(error); }
    finally { this.setData({ busy: false }); }
  },
});
