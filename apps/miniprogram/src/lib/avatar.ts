const AVATAR_CANVAS_ID = 'avatarCanvas';
const AVATAR_SIZE = 512;
const AVATAR_QUALITY = 0.9;

/**
 * 居中裁剪为正方形并压缩头像，避免原图 Data URL 过大导致上传慢、
 * 列表接口返回体膨胀；任何一步失败都回退原图，不阻断上传。
 */
export function prepareAvatar(filePath: string): Promise<string> {
  return new Promise((resolve) => {
    wx.getImageInfo({
      src: filePath,
      success: (info) => {
        const side = Math.min(info.width, info.height);
        if (!side) { resolve(filePath); return; }
        const output = Math.min(AVATAR_SIZE, side);
        const context = wx.createCanvasContext(AVATAR_CANVAS_ID);
        context.drawImage(
          info.path,
          (info.width - side) / 2,
          (info.height - side) / 2,
          side,
          side,
          0,
          0,
          output,
          output,
        );
        context.draw(false, () => {
          wx.canvasToTempFilePath({
            canvasId: AVATAR_CANVAS_ID,
            x: 0,
            y: 0,
            width: output,
            height: output,
            destWidth: output,
            destHeight: output,
            fileType: 'jpg',
            quality: AVATAR_QUALITY,
            success: (res) => resolve(res.tempFilePath || filePath),
            fail: () => resolve(filePath),
          });
        });
      },
      fail: () => resolve(filePath),
    });
  });
}
