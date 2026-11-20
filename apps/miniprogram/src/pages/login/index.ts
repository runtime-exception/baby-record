import { applyAppearance } from '../../lib/appearance';
import { babyContext, login, report } from '../../lib/api';

Page({
  onShow() { applyAppearance(this); },
  data: { scene: '', busy: false },
  onLoad(query: { scene?: string }) { this.setData({ scene: query.scene || '' }); },
  async submit() {
    if (this.data.busy) return;
    this.setData({ busy: true });
    try {
      await login();
      if (this.data.scene) {
        wx.reLaunch({ url: '/pages/web-login/index?scene=' + encodeURIComponent(this.data.scene) });
        return;
      }
      const context = await babyContext(false);
      wx.reLaunch({ url: context?.baby ? '/pages/home/index' : '/pages/onboarding/index' });
    } catch (error) { report(error); }
    finally { this.setData({ busy: false }); }
  },
});
