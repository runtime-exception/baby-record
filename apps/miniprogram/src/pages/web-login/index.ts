import { applyAppearance } from '../../lib/appearance';
import { api, babyContext, explain } from '../../lib/api';

Page({
  onShow() { applyAppearance(this); },
  data: { scene: '', code: '', error: '', busy: false, approved: false },
  async onLoad(query: { scene?: string }) {
    const scene = query.scene || '';
    this.setData({ scene });
    if (!/^[0-9a-f]{32}$/.test(scene)) {
      this.setData({ error: '二维码无效，请重新扫描' });
      return;
    }
    try {
      if (!await babyContext(false, scene)) return;
      const result = await api<{ verificationCode: string }>('/auth/web/inspect', 'POST', { scene });
      this.setData({ code: result.verificationCode });
    } catch (error) { this.setData({ error: explain(error) }); }
  },
  async approve() {
    if (!this.data.code || this.data.busy) return;
    this.setData({ busy: true });
    try {
      await api('/auth/web/confirm', 'POST', { scene: this.data.scene });
      this.setData({ approved: true });
    } catch (error) { this.setData({ error: explain(error), code: '' }); }
    finally { this.setData({ busy: false }); }
  },
  finish() { wx.switchTab({ url: '/pages/home/index' }); },
});
