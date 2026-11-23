declare interface WxError { errMsg: string }
declare interface WxEvent<T = Record<string, never>> {
  detail: T;
  currentTarget: { dataset: Record<string, string | number | boolean> };
}
declare interface WxInput extends WxEvent<{ value: string }> {}
declare interface WxSelection extends WxEvent<{ value: string[] }> {}
declare interface WxCanvas {
  setStrokeStyle(value: string): void;
  setFillStyle(value: string): void;
  setLineWidth(value: number): void;
  setFontSize(value: number): void;
  setLineDash(pattern: number[]): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  fill(): void;
  arc(x: number, y: number, radius: number, start: number, end: number): void;
  fillText(text: string, x: number, y: number): void;
  drawImage(src: string, sx: number, sy: number, sWidth: number, sHeight: number, dx: number, dy: number, dWidth: number, dHeight: number): void;
  draw(reserve?: boolean, callback?: () => void): void;
}
declare interface WxImageInfo {
  path: string;
  width: number;
  height: number;
  type: string;
}
declare const wx: {
  request<T>(options: { url: string; method: string; data?: object; header?: Record<string, string>; timeout?: number; success: (res: { statusCode: number; data: T }) => void; fail: (error: WxError) => void }): void;
  login(options: { success: (res: { code: string }) => void; fail: (error: WxError) => void }): void;
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, value: unknown): void;
  removeStorageSync(key: string): void;
  showToast(options: { title: string; icon?: 'none' | 'success' }): void;
  showModal(options: { title: string; content: string; confirmText?: string; success: (res: { confirm: boolean }) => void; fail?: () => void }): void;
  setClipboardData(options: { data: string }): void;
  navigateTo(options: { url: string }): void;
  navigateBack(options?: { delta?: number; fail?: () => void }): void;
  reLaunch(options: { url: string }): void;
  switchTab(options: { url: string }): void;
  setNavigationBarTitle(options: { title: string }): void;
  pageScrollTo(options: { scrollTop: number; duration: number }): void;
  stopPullDownRefresh(): void;
  chooseMedia(options: { count: number; mediaType: ['image']; success: (res: { tempFiles: { tempFilePath: string }[] }) => void }): void;
  uploadFile(options: { url: string; filePath: string; name: string; header: Record<string, string>; success: (res: { data: string; statusCode: number }) => void; fail: (error: WxError) => void }): void;
  downloadFile(options: { url: string; header: Record<string, string>; success: (res: { statusCode: number; tempFilePath: string }) => void; fail: (error: WxError) => void }): void;
  getAppBaseInfo(): { theme?: 'light' | 'dark' };
  setNavigationBarColor(options: { backgroundColor: string; frontColor: '#ffffff' | '#000000' }): void;
  setTabBarStyle(options: { backgroundColor: string; color: string; selectedColor: string; borderStyle: 'black' | 'white' }): void;
  getWindowInfo(): { windowWidth: number; statusBarHeight?: number };
  createCanvasContext(id: string): WxCanvas;
  getImageInfo(options: { src: string; success: (info: WxImageInfo) => void; fail: (error: WxError) => void }): void;
  canvasToTempFilePath(options: {
    canvasId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    destWidth: number;
    destHeight: number;
    fileType: 'jpg';
    quality: number;
    success: (res: { tempFilePath: string }) => void;
    fail: (error: WxError) => void;
  }): void;
};
declare function App(options: object): void;
declare function setInterval(handler: () => void, timeout?: number): number;
declare function clearInterval(id: number | undefined): void;
declare function Page<D, M>(options: { data: D } & M & ThisType<M & {
  data: D;
  setData(data: Partial<D> & Record<string, unknown>, callback?: () => void): void;
}>): void;
