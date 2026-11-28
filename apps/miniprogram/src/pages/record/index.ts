import { applyAppearance } from '../../lib/appearance';

Page({
  data: { entry: '', recordId: 0 },
  onLoad(query: { kind?: string; id?: string }) {
    this.setData({ entry: query.kind || 'feeding', recordId: Number(query.id) || 0 });
  },
  onShow() { applyAppearance(this, 'detail'); },
  back() { wx.navigateBack(); },
  saved() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/history/index' }) }); },
});
