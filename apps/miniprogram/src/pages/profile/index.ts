import { applyAppearance, getAppearance, setAppearance, type ThemeMode, type UiTheme } from '../../lib/appearance';
import { USER_ROLE_LABELS, GENDER_LABELS, type DashboardData, type MemberBaby } from '@baby-record/shared';
import { api, avatarSource, babyContext, explain, isCurrentBaby, logout, report, revision, selectBaby, uploadAvatar } from '../../lib/api';
import { avatarCover, prepareAvatar } from '../../lib/avatar';

const config = [
  { kind: 'foods', label: '辅食管理', icon: '🥣', tip: '维护喂养与排敏时可选的辅食' },
  { kind: 'supplement-configs', label: '补剂管理', icon: '💊', tip: '维护补剂与默认剂量' },
  { kind: 'exercise-configs', label: '运动管理', icon: '🤸', tip: '维护运动类型与默认数量、单位' },
];

const babyThemes = [
  'linear-gradient(145deg,#387de9,#80c9ec)',
  'linear-gradient(145deg,#7558d5,#c296eb)',
  'linear-gradient(145deg,#149b8f,#82dccd)',
  'linear-gradient(145deg,#d87827,#f4c173)',
  'linear-gradient(145deg,#c64d82,#f19ab6)',
  'linear-gradient(145deg,#5268bd,#9bb0ee)',
];

function babyTheme(index: number) {
  return babyThemes[Math.max(0, index) % babyThemes.length];
}

function metricTexts(baby: MemberBaby, growth?: DashboardData['latestGrowth']) {
  const height = growth?.height ?? baby.birthHeight;
  const weight = growth?.weight ?? baby.birthWeight;
  return {
    heightText: height == null ? '身高 —' : '身高 ' + height.toFixed(1) + ' cm',
    weightText: weight == null ? '体重 —' : '体重 ' + weight.toFixed(1) + ' kg',
  };
}

async function latestGrowth(babyId: string): Promise<DashboardData['latestGrowth']> {
  try {
    const summary = await api<Pick<DashboardData, 'latestGrowth'>>('/dashboard', 'GET', { babyId });
    return summary.latestGrowth;
  } catch {
    return null;
  }
}

interface SwitchCard {
  id: string;
  avatar: string;
  displayName: string;
  genderLabel: string;
  birthday: string;
  age: MemberBaby['age'];
  heightText: string;
  weightText: string;
  theme: string;
}

interface StackCard extends SwitchCard {
  top: number;
  bottom: number;
  left: number;
  right: number;
  z: number;
}

interface AvatarEditorState {
  open: boolean;
  path: string;
  viewport: number;
  displayWidth: number;
  displayHeight: number;
  left: number;
  top: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  scalePercent: number;
  saving: boolean;
}

interface DragStart {
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
}

const STACK_DX = 56;
const STACK_DY = 20;
const SWITCHER_ANIMATION_MS = 280;

function emptyAvatarEditor(): AvatarEditorState {
  return {
    open: false,
    path: '',
    viewport: 0,
    displayWidth: 0,
    displayHeight: 0,
    left: 0,
    top: 0,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    scalePercent: 100,
    saving: false,
  };
}

function avatarOffsetBounds(editor: AvatarEditorState, scale: number) {
  return {
    x: Math.max(0, (editor.displayWidth * scale - editor.viewport) / 2),
    y: Math.max(0, (editor.displayHeight * scale - editor.viewport) / 2),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function imageInfo(path: string): Promise<WxImageInfo> {
  return new Promise((resolve, reject) => wx.getImageInfo({
    src: path,
    success: resolve,
    fail: (error) => reject(new Error(error.errMsg)),
  }));
}

function boxStyle(rect: { left: number; top: number; width: number; height: number }, radius: number) {
  return [
    'left:' + Math.round(rect.left * 10) / 10 + 'px',
    'top:' + Math.round(rect.top * 10) / 10 + 'px',
    'width:' + Math.round(rect.width * 10) / 10 + 'px',
    'height:' + Math.round(rect.height * 10) / 10 + 'px',
    'border-radius:' + radius + 'px',
  ].join(';');
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
    heightText: '身高 —',
    weightText: '体重 —',
    heroTheme: babyThemes[0],
    stackReserve: 0,
    stackBottom: 0,
    stackCards: [] as StackCard[],
    error: '',
    config,
    switcherOpen: false,
    switcherExpanded: false,
    switcherStyle: '',
    switchCards: [] as SwitchCard[],
    avatarEditor: emptyAvatarEditor(),
  },
  active: 0,
  avatarPicking: false,
  avatarScope: -1,
  returningFromAvatarPicker: false,
  disposed: false,
  switcherOriginStyle: '',
  switcherCloseTimer: undefined as number | undefined,
  avatarDragStart: null as DragStart | null,
  onShow() {
    applyAppearance(this, 'tab');
    const resumedFromPicker = this.returningFromAvatarPicker;
    this.returningFromAvatarPicker = false;
    if (this.avatarScope === revision() && isCurrentBaby(this.data.baby?.id)
      && (resumedFromPicker || this.avatarPicking || this.data.avatarEditor.open || this.data.avatarUploading)) return;
    if (this.avatarScope !== revision() || !isCurrentBaby(this.data.baby?.id)) {
      this.avatarPicking = false;
      this.setData({ ...(!isCurrentBaby(this.data.baby?.id) && { baby: null }), avatarEditor: emptyAvatarEditor(), avatarUploading: false });
    }
    void this.refresh();
  },
  onHide() {
    this.active++;
    if (this.avatarPicking) this.returningFromAvatarPicker = true;
    if (this.avatarPicking || this.data.avatarEditor.open || this.data.avatarUploading) return;
    if (this.switcherCloseTimer) {
      clearTimeout(this.switcherCloseTimer);
      this.switcherCloseTimer = undefined;
    }
    this.avatarDragStart = null;
    this.setData({
      baby: null,
      list: [],
      avatar: '',
      avatarUploading: false,
      displayName: '',
      stackCards: [],
      stackReserve: 0,
      stackBottom: 0,
      switcherOpen: false,
      switcherExpanded: false,
      switcherStyle: '',
      switchCards: [],
      avatarEditor: emptyAvatarEditor(),
    });
  },
  onUnload() {
    this.disposed = true;
    this.active++;
    clearTimeout(this.switcherCloseTimer);
  },
  async onPullDownRefresh() {
    try {
      if (!this.avatarPicking && !this.data.avatarEditor.open && !this.data.avatarUploading) await this.refresh();
    } finally {
      wx.stopPullDownRefresh();
    }
  },
  async refresh() {
    const request = ++this.active;
    this.setData({ error: '' });
    try {
      const context = await babyContext();
      const baby = context?.baby;
      if (!baby || request !== this.active) return;
      const roleLabel = USER_ROLE_LABELS[baby.membership.role];
      const cards: SwitchCard[] = await Promise.all(context.list.map(async (item, index) => {
        const [avatar, growth] = await Promise.all([
          avatarSource(item.avatar),
          latestGrowth(item.id),
        ]);
        return {
          id: item.id,
          avatar,
          displayName: item.nickname?.trim() ? `${item.nickname.trim()}（${item.name}）` : item.name,
          genderLabel: GENDER_LABELS[item.gender],
          birthday: item.birthday,
          age: item.age,
          theme: babyTheme(index),
          ...metricTexts(item, growth),
        };
      }));
      if (request !== this.active) return;
      const current = cards.find((card) => card.id === baby.id);
      if (!current) return;
      const otherCards = cards.filter((card) => card.id !== baby.id);
      const stackCards: StackCard[] = otherCards.map((card, index) => {
        const rank = index + 1;
        return {
          ...card,
          top: rank * STACK_DY,
          bottom: (otherCards.length - rank) * STACK_DY,
          left: rank * STACK_DX,
          right: (otherCards.length - rank) * STACK_DX,
          z: 10 - rank,
        };
      });
      this.setData({
        baby,
        list: context.list,
        roleCaption: [
          baby.membership.name === roleLabel ? '' : roleLabel,
          baby.membership.isAdmin ? '管理员' : '',
        ].filter(Boolean).join(' · ') || '家庭成员',
        gender: current.genderLabel,
        displayName: current.displayName,
        avatar: current.avatar,
        heightText: current.heightText,
        weightText: current.weightText,
        heroTheme: current.theme,
        stackReserve: otherCards.length * STACK_DX,
        stackBottom: otherCards.length * STACK_DY,
        stackCards,
      });
    } catch (error) {
      if (request === this.active) this.setData({ baby: null, list: [], avatar: '', displayName: '', error: explain(error) });
    }
  },
  switchCardsFromState() {
    const { baby, list, stackCards, avatar, displayName, gender, heightText, weightText, heroTheme } = this.data;
    if (!baby) return [];
    return list.map((item, index) => {
      if (item.id === String(baby.id)) {
        return {
          id: item.id,
          avatar,
          displayName,
          genderLabel: gender,
          birthday: baby.birthday,
          age: baby.age,
          heightText,
          weightText,
          theme: heroTheme,
        };
      }
      const stacked = stackCards.find((card) => card.id === item.id);
      if (stacked) {
        return {
          id: stacked.id,
          avatar: stacked.avatar,
          displayName: stacked.displayName,
          genderLabel: stacked.genderLabel,
          birthday: stacked.birthday,
          age: stacked.age,
          heightText: stacked.heightText,
          weightText: stacked.weightText,
          theme: stacked.theme,
        };
      }
      return {
        id: item.id,
        avatar: '',
        displayName: item.nickname?.trim() ? `${item.nickname.trim()}（${item.name}）` : item.name,
        genderLabel: GENDER_LABELS[item.gender],
        birthday: item.birthday,
        age: item.age,
        theme: babyTheme(index),
        ...metricTexts(item),
      };
    });
  },
  openSwitcher() {
    if (!this.data.list.length || this.data.switcherOpen) return;
    if (this.switcherCloseTimer) {
      clearTimeout(this.switcherCloseTimer);
      this.switcherCloseTimer = undefined;
    }
    wx.createSelectorQuery().in(this).select('.profileHeroMain').boundingClientRect((rect) => {
      if (!rect) return;
      const info = wx.getWindowInfo();
      const cards = this.switchCardsFromState();
      const sideMargin = Math.round(info.windowWidth * 38 / 750);
      const top = Math.max(8, Math.round(rect.top));
      const maxHeight = Math.max(rect.height, info.windowHeight - top - 24);
      const expandedHeight = Math.min(
        maxHeight,
        Math.max(rect.height + 40, 58 + cards.length * 194 + 62),
      );
      const originStyle = boxStyle(rect, 23);
      const expandedStyle = boxStyle({
        left: sideMargin,
        top,
        width: info.windowWidth - sideMargin * 2,
        height: expandedHeight,
      }, 24);
      this.switcherOriginStyle = originStyle;
      this.setData({
        switcherOpen: true,
        switcherExpanded: false,
        switcherStyle: originStyle,
        switchCards: cards,
      }, () => {
        setTimeout(() => {
          if (!this.data.switcherOpen) return;
          this.setData({ switcherExpanded: true, switcherStyle: expandedStyle });
        }, 20);
      });
    }).exec();
  },
  closeSwitcher() {
    if (!this.data.switcherOpen) return;
    if (this.switcherCloseTimer) clearTimeout(this.switcherCloseTimer);
    this.setData({ switcherExpanded: false, switcherStyle: this.switcherOriginStyle });
    this.switcherCloseTimer = setTimeout(() => {
      this.switcherCloseTimer = undefined;
      this.setData({ switcherOpen: false, switchCards: [] });
    }, SWITCHER_ANIMATION_MS);
  },
  noop() { /* 阻止弹层内点击穿透到遮罩 */ },
  chooseBaby(event: WxEvent) {
    const id = String(event.currentTarget.dataset.id ?? '');
    if (!id) return;
    if (id === String(this.data.baby?.id ?? '')) {
      this.closeSwitcher();
      return;
    }
    this.closeSwitcher();
    selectBaby(id);
    this.setData({ baby: null, avatar: '', displayName: '' });
    void this.refresh();
  },
  add() {
    this.closeSwitcher();
    wx.navigateTo({ url: '/pages/baby/index' });
  },
  edit() { wx.navigateTo({ url: '/pages/baby/index?edit=1' }); },
  members() { wx.navigateTo({ url: '/pages/members/index' }); },
  openConfig(event: WxEvent) { wx.navigateTo({ url: '/pages/config/index?kind=' + event.currentTarget.dataset.kind }); },
  chooseAvatar() {
    const baby = this.data.baby;
    if (!baby?.membership.isAdmin || !isCurrentBaby(baby.id) || this.avatarPicking || this.data.avatarUploading || this.data.avatarEditor.open) return;
    const scope = revision();
    this.avatarScope = scope;
    this.avatarPicking = true;
    this.active++;
    wx.chooseMedia({
      count: 1, mediaType: ['image'],
      fail: (error) => {
        if (this.disposed || revision() !== scope) return;
        this.avatarPicking = false;
        if (!error.errMsg.includes('cancel')) report(new Error(error.errMsg));
      },
      success: async (res) => {
        const picked = res.tempFiles[0];
        try {
          if (!picked || this.disposed || revision() !== scope) return;
          const info = await imageInfo(picked.tempFilePath);
          if (this.disposed || revision() !== scope) return;
          const windowInfo = wx.getWindowInfo();
          const viewport = Math.round(Math.min(
            windowInfo.windowWidth - 72,
            windowInfo.windowWidth * 520 / 750,
          ));
          const cover = avatarCover(info.width, info.height, viewport);
          this.setData({
            avatarEditor: {
              open: true,
              path: picked.tempFilePath,
              viewport,
              displayWidth: cover.displayWidth,
              displayHeight: cover.displayHeight,
              left: cover.left,
              top: cover.top,
              offsetX: 0,
              offsetY: 0,
              scale: 1,
              scalePercent: 100,
              saving: false,
            },
          });
        } catch (error) {
          if (!this.disposed && revision() === scope) report(error);
        } finally {
          if (revision() === scope) this.avatarPicking = false;
        }
      },
    });
  },
  avatarTouchStart(event: WxEvent) {
    const touch = event.touches?.[0];
    if (!touch) return;
    const editor = this.data.avatarEditor;
    this.avatarDragStart = {
      x: touch.clientX,
      y: touch.clientY,
      offsetX: editor.offsetX,
      offsetY: editor.offsetY,
    };
  },
  avatarTouchMove(event: WxEvent) {
    const touch = event.touches?.[0];
    const start = this.avatarDragStart;
    if (!touch || !start) return;
    const editor = this.data.avatarEditor;
    const bounds = avatarOffsetBounds(editor, editor.scale);
    this.setData({
      'avatarEditor.offsetX': clamp(start.offsetX + touch.clientX - start.x, -bounds.x, bounds.x),
      'avatarEditor.offsetY': clamp(start.offsetY + touch.clientY - start.y, -bounds.y, bounds.y),
    });
  },
  avatarTouchEnd() { this.avatarDragStart = null; },
  adjustAvatarZoom(event: WxEvent<{ value: number }>) {
    const percent = clamp(Math.round(event.detail.value), 100, 300);
    const scale = percent / 100;
    const editor = this.data.avatarEditor;
    const bounds = avatarOffsetBounds(editor, scale);
    this.setData({
      'avatarEditor.scalePercent': percent,
      'avatarEditor.scale': scale,
      'avatarEditor.offsetX': clamp(editor.offsetX, -bounds.x, bounds.x),
      'avatarEditor.offsetY': clamp(editor.offsetY, -bounds.y, bounds.y),
    });
  },
  cancelAvatarEdit() {
    if (this.data.avatarEditor.saving) return;
    this.avatarDragStart = null;
    this.setData({ avatarEditor: emptyAvatarEditor() });
  },
  async confirmAvatarEdit() {
    const baby = this.data.baby;
    const editor = this.data.avatarEditor;
    if (!baby?.membership.isAdmin || !isCurrentBaby(baby.id) || !editor.open || editor.saving) return;
    const scope = revision();
    this.avatarDragStart = null;
    this.setData({ avatarEditor: { ...editor, saving: true }, avatarUploading: true });
    try {
      const file = await prepareAvatar(editor.path, {
        viewport: editor.viewport,
        offsetX: editor.offsetX,
        offsetY: editor.offsetY,
        scale: editor.scale,
      });
      if (this.disposed || revision() !== scope) return;
      await uploadAvatar(baby.id, file);
      if (this.disposed || revision() !== scope) return;
      this.active++;
      this.setData({
        avatar: file,
        avatarEditor: emptyAvatarEditor(),
      });
      wx.showToast({ title: '头像已更新', icon: 'success' });
    } catch (error) {
      if (!this.disposed && revision() === scope) {
        this.setData({ avatarEditor: { ...editor, saving: false } });
        report(error);
      }
    } finally {
      if (!this.disposed && revision() === scope) this.setData({ avatarUploading: false });
    }
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
