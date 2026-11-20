import { applyAppearance, getAppearance, setAppearance, type ThemeMode, type UiTheme } from '../../lib/appearance';
import { USER_ROLE_LABELS, GENDER_LABELS, type MemberBaby } from '@baby-record/shared';
import { avatarSource, babyContext, explain, logout, report, selectBaby, uploadAvatar } from '../../lib/api';

const config = [
  { kind: 'foods', label: '辅食管理', icon: '🥣', tip: '维护喂养与排敏时可选的辅食' },
  { kind: 'supplement-configs', label: '补剂管理', icon: '💊', tip: '维护补剂与默认剂量' },
  { kind: 'exercise-configs', label: '运动管理', icon: '🤸', tip: '维护运动类型与默认数量、单位' },
];

Page({
  data: { baby: null as MemberBaby | null, list: [] as MemberBaby[], avatar: '', appearance: getAppearance(), role: '', gender: '', error: '', config },
  active: 0,
  onShow() { applyAppearance(this, true); void this.refresh(); },
  onHide() { this.active++; this.setData({ baby: null, list: [], avatar: '' }); },
  async onPullDownRefresh() { try { await this.refresh(); } finally { wx.stopPullDownRefresh(); } },
  async refresh() {
    const request = ++this.active;
    this.setData({ error: '' });
    try {
      const context = await babyContext();
      const baby = context?.baby;
      if (!baby || request !== this.active) return;
      this.setData({ baby, list: context.list, role: USER_ROLE_LABELS[baby.membership.role], gender: GENDER_LABELS[baby.gender] });
      const avatar = await avatarSource(baby.avatar);
      if (request === this.active) this.setData({ avatar });
    } catch (error) {
      if (request === this.active) this.setData({ baby: null, list: [], avatar: '', error: explain(error) });
    }
  },
  chooseBaby(event: WxEvent) {
    selectBaby(Number(event.currentTarget.dataset.id));
    this.setData({ baby: null, avatar: '' });
    void this.refresh();
  },
  copyId() { if (this.data.baby) wx.setClipboardData({ data: String(this.data.baby.id) }); },
  add() { wx.navigateTo({ url: '/pages/baby/index' }); },
  edit() { wx.navigateTo({ url: '/pages/baby/index?edit=1' }); },
  bind() { wx.navigateTo({ url: '/pages/family/index' }); },
  members() { wx.navigateTo({ url: '/pages/members/index' }); },
  openConfig(event: WxEvent) { wx.navigateTo({ url: '/pages/config/index?kind=' + event.currentTarget.dataset.kind }); },
  chooseAvatar() {
    const baby = this.data.baby;
    if (!baby?.membership.isAdmin) return;
    const request = this.active;
    wx.chooseMedia({
      count: 1, mediaType: ['image'],
      success: async (res) => {
        if (request !== this.active || !res.tempFiles[0]) return;
        try {
          await uploadAvatar(baby.id, res.tempFiles[0].tempFilePath);
          if (request === this.active) await this.refresh();
        } catch (error) { report(error); }
      },
    });
  },
  changeMode(event: WxEvent) {
    setAppearance({ mode: event.currentTarget.dataset.value as ThemeMode });
    applyAppearance(this, true);
  },
  changeTheme(event: WxEvent) {
    setAppearance({ theme: event.currentTarget.dataset.value as UiTheme });
    applyAppearance(this, true);
  },
  senior() {
    setAppearance({ senior: !this.data.appearance.senior });
    applyAppearance(this, true);
  },
  logout() { void logout().catch(report); },
});
