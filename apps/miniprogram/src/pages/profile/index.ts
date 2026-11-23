import { applyAppearance, getAppearance, setAppearance, type ThemeMode, type UiTheme } from '../../lib/appearance';
import { USER_ROLE_LABELS, GENDER_LABELS, type MemberBaby } from '@baby-record/shared';
import { avatarSource, babyContext, explain, logout, report, selectBaby, uploadAvatar } from '../../lib/api';
import { prepareAvatar } from '../../lib/avatar';

const config = [
  { kind: 'foods', label: '辅食管理', icon: '🥣', tip: '维护喂养与排敏时可选的辅食' },
  { kind: 'supplement-configs', label: '补剂管理', icon: '💊', tip: '维护补剂与默认剂量' },
  { kind: 'exercise-configs', label: '运动管理', icon: '🤸', tip: '维护运动类型与默认数量、单位' },
];

interface SwitchCard {
  id: string;
  avatar: string;
  displayName: string;
  genderLabel: string;
  birthday: string;
  age: MemberBaby['age'];
}

Page({
  data: {
    baby: null as MemberBaby | null,
    list: [] as MemberBaby[],
    avatar: '',
    avatarUploading: false,
    displayName: '',
    appearance: getAppearance(),
    roleCaption: '',
    gender: '',
    error: '',
    config,
    switcherOpen: false,
    switchCards: [] as SwitchCard[],
    switchScrollHeight: '0rpx',
  },
  active: 0,
  onShow() { applyAppearance(this, 'tab'); void this.refresh(); },
  onHide() {
    this.active++;
    this.setData({
      baby: null,
      list: [],
      avatar: '',
      avatarUploading: false,
      displayName: '',
      switcherOpen: false,
      switchCards: [],
    });
  },
  async onPullDownRefresh() { try { await this.refresh(); } finally { wx.stopPullDownRefresh(); } },
  async refresh() {
    const request = ++this.active;
    this.setData({ error: '' });
    try {
      const context = await babyContext();
      const baby = context?.baby;
      if (!baby || request !== this.active) return;
      const roleLabel = USER_ROLE_LABELS[baby.membership.role];
      this.setData({
        baby,
        list: context.list,
        roleCaption: [
          baby.membership.name === roleLabel ? '' : roleLabel,
          baby.membership.isAdmin ? '管理员' : '',
        ].filter(Boolean).join(' · ') || '家庭成员',
        gender: GENDER_LABELS[baby.gender],
        displayName: baby.nickname?.trim() ? `${baby.nickname.trim()}（${baby.name}）` : baby.name,
      });
      const avatar = await avatarSource(baby.avatar);
      if (request === this.active) this.setData({ avatar });
    } catch (error) {
      if (request === this.active) this.setData({ baby: null, list: [], avatar: '', displayName: '', error: explain(error) });
    }
  },
  async openSwitcher() {
    const list = this.data.list;
    if (list.length <= 1 || this.data.switcherOpen) return;
    const request = this.active;
    this.setData({ switcherOpen: true, switchCards: [], switchScrollHeight: '0rpx' });
    const cards = await Promise.all(list.map(async (item) => ({
      id: item.id,
      avatar: await avatarSource(item.avatar),
      displayName: item.nickname?.trim() ? `${item.nickname.trim()}（${item.name}）` : item.name,
      genderLabel: GENDER_LABELS[item.gender],
      birthday: item.birthday,
      age: item.age,
    })));
    if (request !== this.active || !this.data.switcherOpen) return;
    this.setData({
      switchCards: cards,
      switchScrollHeight: Math.min(cards.length * 348 + 16, 980) + 'rpx',
    });
  },
  closeSwitcher() {
    this.setData({ switcherOpen: false, switchCards: [] });
  },
  noop() { /* 阻止弹层内点击穿透到遮罩 */ },
  chooseBaby(event: WxEvent) {
    const id = String(event.currentTarget.dataset.id ?? '');
    this.setData({ switcherOpen: false, switchCards: [] });
    if (!id || id === String(this.data.baby?.id ?? '')) return;
    selectBaby(id);
    this.setData({ baby: null, avatar: '', displayName: '' });
    void this.refresh();
  },
  copyId() { if (this.data.baby) wx.setClipboardData({ data: String(this.data.baby.id) }); },
  add() {
    this.setData({ switcherOpen: false, switchCards: [] });
    wx.navigateTo({ url: '/pages/baby/index' });
  },
  edit() { wx.navigateTo({ url: '/pages/baby/index?edit=1' }); },
  bind() { wx.navigateTo({ url: '/pages/family/index' }); },
  members() { wx.navigateTo({ url: '/pages/members/index' }); },
  openConfig(event: WxEvent) { wx.navigateTo({ url: '/pages/config/index?kind=' + event.currentTarget.dataset.kind }); },
  chooseAvatar() {
    const baby = this.data.baby;
    if (!baby?.membership.isAdmin || this.data.avatarUploading) return;
    const request = this.active;
    wx.chooseMedia({
      count: 1, mediaType: ['image'],
      success: async (res) => {
        if (request !== this.active || !res.tempFiles[0]) return;
        this.setData({ avatarUploading: true });
        try {
          const file = await prepareAvatar(res.tempFiles[0].tempFilePath);
          await uploadAvatar(baby.id, file);
          if (request === this.active) {
            wx.showToast({ title: '头像已更新', icon: 'success' });
            await this.refresh();
          }
        } catch (error) {
          report(error);
        } finally {
          if (request === this.active) this.setData({ avatarUploading: false });
        }
      },
    });
  },
  changeMode(event: WxEvent) {
    setAppearance({ mode: event.currentTarget.dataset.value as ThemeMode });
    applyAppearance(this, 'tab');
  },
  changeTheme(event: WxEvent) {
    setAppearance({ theme: event.currentTarget.dataset.value as UiTheme });
    applyAppearance(this, 'tab');
  },
  senior() {
    setAppearance({ senior: !this.data.appearance.senior });
    applyAppearance(this, 'tab');
  },
  logout() { void logout().catch(report); },
});
