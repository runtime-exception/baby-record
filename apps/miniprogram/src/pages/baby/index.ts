import { applyAppearance } from '../../lib/appearance';
import { USER_ROLE_LABELS, type UserRole } from '@baby-record/shared';
import { api, babyContext, report, selectBaby } from '../../lib/api';
import { dateString } from '../../lib/format';

const roles = Object.keys(USER_ROLE_LABELS) as UserRole[];
const labels = roles.map((role) => USER_ROLE_LABELS[role]);
const fields = [
  { key: 'name', label: '姓名', type: 'text', required: true }, { key: 'nickname', label: '昵称', type: 'text' },
  { key: 'birthWeight', label: '出生体重（kg）', type: 'digit' }, { key: 'birthHeight', label: '出生身高（cm）', type: 'digit' },
  { key: 'headCircumference', label: '出生头围（cm）', type: 'digit' }, { key: 'birthHospital', label: '出生医院', type: 'text' },
  { key: 'remark', label: '备注', type: 'text' },
];

Page({
  onShow() { applyAppearance(this); },
  data: { today: dateString(), birthday: dateString(), gender: 'MALE', memberName: '', role: '', roleLabel: '', fields, labels, values: {} as Record<string, string>, editing: 0, busy: false, ready: false },
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
        wx.setNavigationBarTitle({ title: '编辑宝宝' });
      }
      this.setData({ ready: true });
    } catch (error) { report(error); }
  },
  field(event: WxInput) {
    this.setData({ values: { ...this.data.values, [String(event.currentTarget.dataset.key)]: event.detail.value } });
  },
  setBirthday(event: WxInput) { this.setData({ birthday: event.detail.value }); },
  setGender(event: WxEvent) { this.setData({ gender: String(event.currentTarget.dataset.value) }); },
  setName(event: WxInput) { this.setData({ memberName: event.detail.value }); },
  setRole(event: WxInput) {
    const role = roles[Number(event.detail.value)];
    this.setData({ role, roleLabel: USER_ROLE_LABELS[role] });
  },
  async submit() {
    const { editing, values, gender, birthday, role, memberName, busy, ready } = this.data;
    if (!ready || busy) return;
    if (!values.name?.trim() || (!editing && (!memberName.trim() || !role))) {
      return report(new Error('请填写宝宝姓名及你的身份'));
    }
    const payload = Object.fromEntries(fields.map(({ key, type }) => {
      const value = values[key]?.trim() ?? '';
      return [key, type === 'digit' ? (value ? Number(value) : null) : value];
    }));
    this.setData({ busy: true });
    try {
      const result = await api<{ id: number }>(editing ? '/babies/' + editing : '/babies', editing ? 'PATCH' : 'POST', {
        ...payload, gender, birthday, ...(!editing && { role, memberName: memberName.trim() }),
      });
      selectBaby(result.id);
      wx.showToast({ title: '已保存', icon: 'success' });
      wx.switchTab({ url: editing ? '/pages/profile/index' : '/pages/home/index' });
    } catch (error) { report(error); }
    finally { this.setData({ busy: false }); }
  },
});
