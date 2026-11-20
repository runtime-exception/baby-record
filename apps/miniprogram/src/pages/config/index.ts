import { applyAppearance } from '../../lib/appearance';
import { EXERCISE_UNITS } from '@baby-record/shared';
import { api, babyContext, currentBabyId, explain, report } from '../../lib/api';
import { confirm } from '../../lib/format';

interface ConfigItem { id: number; name: string; emoji?: string | null; defaultAmount?: string | null; defaultUnit?: string | null; isActive: boolean }
const titles: Record<string, string> = { foods: '辅食管理', 'supplement-configs': '补剂管理', 'exercise-configs': '运动管理' };
const unitOptions = [...EXERCISE_UNITS];
const emojiOptions = ['🥣', '🥕', '🍎', '🥚', '🐟', '🥛', '🥦', '🍠', '🍗', '🍚', '💊', '☀️', '🤸', '🧸', '🐾'];
Page({
  onShow() { applyAppearance(this); },
  data: { babyId: 0, kind: '', title: '', items: [] as ConfigItem[], editing: -1, name: '', emoji: '', defaultAmount: '', defaultUnit: '',
    isActive: true, unitOptions, emojiOptions, busy: false, onlyActive: false, error: '' },
  async onLoad(query: { kind?: string }) {
    const kind = query.kind ?? '';
    if (!Object.prototype.hasOwnProperty.call(titles, kind)) return report(new Error('配置类型无效'));
    this.setData({ kind, title: titles[kind] });
    wx.setNavigationBarTitle({ title: titles[kind] });
    await this.refresh();
  },
  async onPullDownRefresh() { try { await this.refresh(); } finally { wx.stopPullDownRefresh(); } },
  async refresh() {
    try {
      const baby = (await babyContext())?.baby;
      if (!baby || !this.data.kind) return;
      const items = await api<ConfigItem[]>('/' + this.data.kind, 'GET', { includeInactive: true }, baby.id);
      this.setData({ babyId: baby.id, items, error: '' });
    } catch (error) { this.setData({ items: [], error: explain(error) }); }
  },
  edit(event: WxEvent) {
    const id = Number(event.currentTarget.dataset.id);
    const item = this.data.items.find((value) => value.id === id);
    this.setData({
      editing: id, name: item?.name ?? '', emoji: item?.emoji ?? '', isActive: item?.isActive ?? true,
      defaultAmount: item?.defaultAmount ?? (this.data.kind === 'exercise-configs' ? '1' : ''),
      defaultUnit: item?.defaultUnit ?? (this.data.kind === 'exercise-configs' ? '分钟' : ''),
    });
  },
  close() { this.setData({ editing: -1 }); },
  sheetTap() {},
  field(event: WxInput) { this.setData({ [String(event.currentTarget.dataset.key)]: event.detail.value }); },
  unit(event: WxInput) { this.setData({ defaultUnit: unitOptions[Number(event.detail.value)] }); },
  icon(event: WxEvent) { this.setData({ emoji: String(event.currentTarget.dataset.value) }); },
  async save() {
    const d = this.data;
    if (d.busy || !d.babyId || currentBabyId() !== d.babyId) return;
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
  activeFilter() { this.setData({ onlyActive: !this.data.onlyActive }); },
  async changeActive(event: WxEvent) {
    const id = Number(event.currentTarget.dataset.id);
    const item = this.data.items.find((value) => value.id === id);
    const { babyId, kind, busy } = this.data;
    if (!item || !babyId || currentBabyId() !== babyId || busy) return;
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
