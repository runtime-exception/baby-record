import { applyAppearance } from '../../lib/appearance';
import { babyContext, logout, report } from '../../lib/api';

Page({
  data: {},
  async onShow() { applyAppearance(this);
    try {
      const context = await babyContext(false);
      if (context?.baby) wx.switchTab({ url: '/pages/home/index' });
    } catch (error) { report(error); }
  },
  add() { wx.navigateTo({ url: '/pages/baby/index' }); },
  bind() { wx.navigateTo({ url: '/pages/family/index' }); },
  logout,
});
