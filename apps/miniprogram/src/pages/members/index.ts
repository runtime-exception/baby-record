import { applyAppearance } from '../../lib/appearance';
import { USER_ROLE_LABELS, type FamilyMember } from '@baby-record/shared';
import { api, babyContext, report } from '../../lib/api';
import { confirm } from '../../lib/format';

Page({
  data: { babyId: '', admin: false, members: [] as (FamilyMember & { roleLabel: string; title: string })[], busy: false },
  onShow() { applyAppearance(this); void this.refresh(); },
  async onPullDownRefresh() { try { await this.refresh(); } finally { wx.stopPullDownRefresh(); } },
  async refresh() {
    try {
      const result = await babyContext();
      const baby = result?.baby;
      if (!baby) return;
      const members = await api<FamilyMember[]>('/family/' + baby.id + '/members');
      this.setData({
        babyId: baby.id,
        admin: baby.membership.isAdmin,
        members: members.map((item) => {
          const roleLabel = USER_ROLE_LABELS[item.role];
          return { ...item, roleLabel, title: item.name === roleLabel ? roleLabel : `${item.name} · ${roleLabel}` };
        }),
      });
    } catch (error) { this.setData({ members: [] }); report(error); }
  },
  async change(event: WxEvent) {
    const { account, status } = event.currentTarget.dataset;
    if (this.data.busy) return;
    if (status === 'REMOVED' && !await confirm('移除成员', '移除后，该成员将无法访问宝宝的资料和记录。')) return;
    this.setData({ busy: true });
    try {
      const path = '/family/' + this.data.babyId + '/members/' + account;
      if (status === 'REMOVED') await api(path, 'DELETE');
      else await api(path, 'PATCH', { status });
      await this.refresh();
    } catch (error) { report(error); }
    finally { this.setData({ busy: false }); }
  },
});
