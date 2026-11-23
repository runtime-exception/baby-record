import { applyAppearance } from '../../lib/appearance';
import { USER_ROLE_LABELS, type FamilyApplication, type UserRole } from '@baby-record/shared';
import { api, babyContext, report, selectBaby } from '../../lib/api';

const roles = Object.keys(USER_ROLE_LABELS) as UserRole[];
const statusLabels = { PENDING: '等待审批', REJECTED: '已拒绝', REMOVED: '已移除' };
Page({
  data: { babyId: '', role: '', roleLabel: '', labels: Object.values(USER_ROLE_LABELS), code: '', claimMode: false, busy: false,
    applications: [] as (FamilyApplication & { label: string })[], hasBaby: false },
  onShow() { applyAppearance(this); void this.refresh(); },
  async onPullDownRefresh() { try { await this.refresh(); } finally { wx.stopPullDownRefresh(); } },
  async refresh() {
    try {
      const context = await babyContext(false);
      if (!context) return;
      const items = await api<FamilyApplication[]>('/family/applications');
      this.setData({ hasBaby: !!context.baby, applications: items.map((item) => ({ ...item, label: statusLabels[item.status] })) });
    } catch (error) { report(error); }
  },
  field(event: WxInput) {
    const key = String(event.currentTarget.dataset.key);
    if (key === 'babyId' || key === 'code') this.setData({ [key]: event.detail.value });
  },
  setRole(event: WxInput) {
    const role = roles[Number(event.detail.value)];
    this.setData({ role, roleLabel: USER_ROLE_LABELS[role] });
  },
  toggleClaim() { this.setData({ claimMode: !this.data.claimMode }); },
  async submit() {
    const { babyId, role, code, claimMode, busy } = this.data;
    if (busy) return;
    if (!/^[a-f0-9]{16}$/i.test(babyId) || !role) return report(new Error('请填写 16 位宝宝 ID 并选择与宝宝的关系'));
    this.setData({ busy: true });
    try {
      const data = { babyId: babyId.toLowerCase(), role };
      if (claimMode) {
        await api('/family/claim', 'POST', { ...data, code: code.trim() });
        selectBaby(data.babyId);
        wx.switchTab({ url: '/pages/home/index' });
      } else {
        await api('/family/applications', 'POST', data);
        wx.showToast({ title: '申请已提交', icon: 'success' });
        await this.refresh();
      }
    } catch (error) { report(error); }
    finally { this.setData({ busy: false }); }
  },
  goHome() { wx.switchTab({ url: '/pages/home/index' }); },
});
