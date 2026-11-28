const AVATAR_CANVAS_ID = 'avatarCanvas';
const AVATAR_SIZE = 512;
const AVATAR_QUALITY = 0.9;

export interface AvatarCrop {
  viewport: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface AvatarCover {
  displayWidth: number;
  displayHeight: number;
  left: number;
  top: number;
  maxOffsetX: number;
  maxOffsetY: number;
}

export interface AvatarCropSource {
  x: number;
  y: number;
  size: number;
}

export function avatarCover(width: number, height: number, viewport: number): AvatarCover {
  const shortest = Math.min(width, height);
  const ratio = shortest > 0 ? viewport / shortest : 1;
  const displayWidth = width * ratio;
  const displayHeight = height * ratio;
  return {
    displayWidth,
    displayHeight,
    left: (viewport - displayWidth) / 2,
    top: (viewport - displayHeight) / 2,
    maxOffsetX: Math.max(0, (displayWidth - viewport) / 2),
    maxOffsetY: Math.max(0, (displayHeight - viewport) / 2),
  };
}

export function avatarCropSource(width: number, height: number, crop: AvatarCrop): AvatarCropSource {
  const cover = avatarCover(width, height, crop.viewport);
  const scale = Math.max(1, crop.scale);
  const pixelsPerCssPixel = width / cover.displayWidth / scale;
  const size = crop.viewport * pixelsPerCssPixel;
  const x = width / 2 - (crop.viewport / 2 + crop.offsetX) * pixelsPerCssPixel;
  const y = height / 2 - (crop.viewport / 2 + crop.offsetY) * pixelsPerCssPixel;
  const maxX = Math.max(0, width - size);
  const maxY = Math.max(0, height - size);
  return {
    x: Math.max(0, Math.min(maxX, x)),
    y: Math.max(0, Math.min(maxY, y)),
    size,
  };
}

export function prepareAvatar(filePath: string, crop?: AvatarCrop): Promise<string> {
  return new Promise((resolve, reject) => {
    const exportFailed = () => reject(new Error('头像裁剪失败，请重试'));
    const readFailed = () => reject(new Error('无法读取头像图片，请重新选择'));
    wx.getImageInfo({
      src: filePath,
      success: (info) => {
        if (!info.width || !info.height) { readFailed(); return; }
        const side = Math.min(info.width, info.height);
        const source = crop
          ? avatarCropSource(info.width, info.height, crop)
          : { x: (info.width - side) / 2, y: (info.height - side) / 2, size: side };
        const context = wx.createCanvasContext(AVATAR_CANVAS_ID);
        context.drawImage(
          info.path,
          source.x,
          source.y,
          source.size,
          source.size,
          0,
          0,
          AVATAR_SIZE,
          AVATAR_SIZE,
        );
        context.draw(false, () => {
          wx.canvasToTempFilePath({
            canvasId: AVATAR_CANVAS_ID,
            x: 0,
            y: 0,
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            destWidth: AVATAR_SIZE,
            destHeight: AVATAR_SIZE,
            fileType: 'jpg',
            quality: AVATAR_QUALITY,
            success: (res) => {
              if (!res.tempFilePath) { exportFailed(); return; }
              resolve(res.tempFilePath);
            },
            fail: exportFailed,
          });
        });
      },
      fail: readFailed,
    });
  });
}
