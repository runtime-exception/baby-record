import { applyAppearance } from '../../lib/appearance';
import { USER_ROLE_LABELS, type UserRole } from '@baby-record/shared';
import { api, babyContext, report, selectBaby } from '../../lib/api';
import { dateString } from '../../lib/format';

const roles = Object.keys(USER_ROLE_LABELS) as UserRole[];
const labels = roles.map((role) => USER_ROLE_LABELS[role]);
const fields = [
  { key: 'name', label: '姓名', type: 'text', required: true }, { key: 'nickname', label: '昵称', type: 'text' },
  { key: 'birthWeight', label: '体重（kg）', type: 'digit', placeholder: '3.5' }, { key: 'birthHeight', label: '身高（cm）', type: 'digit', placeholder: '50' },
  { key: 'headCircumference', label: '头围（cm）', type: 'digit', placeholder: '34' }, { key: 'birthHospital', label: '出生医院', type: 'text' },
  { key: 'remark', label: '备注', type: 'text' },
];

Page({
  onShow() { applyAppearance(this, 'detail'); },
  onUnload() { this.clearCountdown(); },
  back() { wx.navigateBack(); },
  copyId() { if (this.data.editing) wx.setClipboardData({ data: this.data.editing }); },
  countdownTimer: 0,
  data: {
    today: dateString(),
    birthday: dateString(),
    gender: 'MALE',
    role: '',
    roleLabel: '',
    measurements: fields.filter((item) => item.type === 'digit'),
    labels,
    values: {} as Record<string, string>,
    editing: '',
    busy: false,
    ready: false,
    deleteOpen: false,
    deleteCountdown: 0,
    deleting: false,
    deleteInfo: { displayName: '', genderLabel: '', birthday: '' },
  },
  async onLoad(query: { edit?: string }) {
    try {
      const context = await babyContext(false);
      if (!context) return;
      if (query.edit) {
        const baby = context.baby;
        if (!baby?.membership.isAdmin) return report(new Error('只有管理员可以编辑宝宝档案'));
        this.setData({
          editing: baby.id, birthday: baby.birthday, gender: baby.gender,
          values: Object.fromEntries(fields.map(({ key }) => [key, String(baby[key as keyof typeof baby] ?? '')])),
        });
      }
      this.setData({ ready: true });
    } catch (error) { report(error); }
  },
  field(event: WxInput) {
    this.setData({ values: { ...this.data.values, [String(event.currentTarget.dataset.key)]: event.detail.value } });
  },
  setBirthday(event: WxInput) { this.setData({ birthday: event.detail.value }); },
  setGender(event: WxEvent) { this.setData({ gender: String(event.currentTarget.dataset.value) }); },
  setRole(event: WxInput) {
    const role = roles[Number(event.detail.value)];
    this.setData({ role, roleLabel: USER_ROLE_LABELS[role] });
  },
  askDelete() {
    const { editing, values, gender, birthday } = this.data;
    if (!editing || this.data.deleteOpen) return;
    this.setData({
      deleteOpen: true,
      deleting: false,
      deleteCountdown: 10,
      deleteInfo: {
        displayName: values.nickname?.trim() ? `${values.nickname.trim()}（${values.name}）` : values.name,
        genderLabel: gender === 'MALE' ? '男' : '女',
        birthday,
      },
    });
    this.clearCountdown();
    this.countdownTimer = setInterval(() => {
      const next = this.data.deleteCountdown - 1;
      if (next <= 0) {
        this.clearCountdown();
        this.setData({ deleteCountdown: 0 });
      } else {
        this.setData({ deleteCountdown: next });
      }
    }, 1000);
  },
  clearCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = 0;
    }
  },
  closeDelete() {
    this.clearCountdown();
    this.setData({ deleteOpen: false, deleteCountdown: 0, deleting: false });
  },
  noop() { /* 阻止弹层内点击穿透到遮罩 */ },
  async confirmDelete() {
    const id = this.data.editing;
    if (!id || this.data.deleteCountdown > 0 || this.data.deleting) return;
    this.setData({ deleting: true });
    this.clearCountdown();
    try {
      await api('/babies/' + id, 'DELETE');
      selectBaby('');
      this.setData({ deleteOpen: false, deleteCountdown: 0, deleting: false });
      wx.showToast({ title: '宝宝已删除', icon: 'success' });
      wx.switchTab({ url: '/pages/profile/index' });
    } catch (error) {
      this.setData({ deleting: false });
      report(error);
    }
  },
  async submit() {
    const { editing, values, gender, birthday, role, busy, ready } = this.data;
    if (!ready || busy) return;
    if (!values.name?.trim() || (!editing && !role)) {
      return report(new Error('请填写宝宝姓名并选择与宝宝的关系'));
    }
    const payload = Object.fromEntries(fields.map(({ key, type }) => {
      const value = values[key]?.trim() ?? '';
      return [key, type === 'digit' ? (value ? Number(value) : null) : value];
    }));
    this.setData({ busy: true });
    try {
      const result = await api<{ id: string }>(editing ? '/babies/' + editing : '/babies', editing ? 'PATCH' : 'POST', {
        ...payload, gender, birthday, ...(!editing && { role }),
      });
      selectBaby(result.id);
      wx.showToast({ title: '已保存', icon: 'success' });
      wx.switchTab({ url: editing ? '/pages/profile/index' : '/pages/home/index' });
    } catch (error) { report(error); }
    finally { this.setData({ busy: false }); }
  },
});
