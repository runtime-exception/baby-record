const AVATAR_MAX_SIDE = 512;
const AVATAR_QUALITY = 0.86;
/** 压缩后的头像 Data URL 目标长度，超过则继续降质，避免请求体过大导致更新超时 */
const AVATAR_TARGET_LENGTH = 400_000;
const MAX_SOURCE_SIZE = 20 * 1024 * 1024;

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // 部分浏览器不支持图片位图解码，回退到 <img>
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片解析失败，请换一张图片试试'));
      img.src = url;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('图片读取失败，请重试'));
    reader.readAsDataURL(file);
  });
}

/**
 * 把用户选择的图片处理成正方形小头像（居中裁剪 + 压缩）。
 * 头像以 Data URL 持久化，压缩后可显著降低请求体积，避免保存超时。
 */
export async function prepareAvatarDataUrl(file: File): Promise<string> {
  if (file.size > MAX_SOURCE_SIZE) {
    throw new Error('图片体积过大，请选择 20MB 以内的图片');
  }

  let decoded: DecodedImage;
  try {
    decoded = await decodeImage(file);
  } catch {
    throw new Error('图片解析失败，请换一张图片试试');
  }

  try {
    const side = Math.min(decoded.width, decoded.height);
    if (!side) throw new Error('图片尺寸异常，请换一张图片试试');

    const canvas = document.createElement('canvas');
    const targetSide = Math.min(AVATAR_MAX_SIDE, side);
    canvas.width = targetSide;
    canvas.height = targetSide;
    const context = canvas.getContext('2d');
    if (!context) {
      if (file.size <= AVATAR_TARGET_LENGTH) return readAsDataUrl(file);
      throw new Error('当前设备无法压缩图片，请换一张更小的图片');
    }

    const sx = (decoded.width - side) / 2;
    const sy = (decoded.height - side) / 2;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(decoded.source, sx, sy, side, side, 0, 0, targetSide, targetSide);

    let quality = AVATAR_QUALITY;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length > AVATAR_TARGET_LENGTH && quality > 0.5) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
    return dataUrl;
  } finally {
    decoded.release();
  }
}
