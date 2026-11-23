import type { ApiResponse, MemberBaby } from '@baby-record/shared';
import { apiBase } from './config';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
const tokenKey = 'baby-record:wechat-session';
const babyKey = 'baby-record:baby-id';
let token = String(wx.getStorageSync(tokenKey) ?? '');
let babyId = String(wx.getStorageSync(babyKey) ?? '');
let sessionRevision = 0;
let scopeRevision = 0;

export function currentBabyId() { return babyId; }
export function revision() { return scopeRevision; }
export function isCurrentBaby(id: string | number | null | undefined) {
  return String(id ?? '') === babyId;
}

export function selectBaby(id: string | number | null | undefined) {
  const next = String(id ?? '');
  if (babyId === next) return;
  babyId = next;
  scopeRevision++;
  if (next) wx.setStorageSync(babyKey, next);
  else wx.removeStorageSync(babyKey);
}

export function clearSession() {
  token = '';
  sessionRevision++;
  scopeRevision++;
  wx.removeStorageSync(tokenKey);
  selectBaby('');
}

class ApiError extends Error {
  constructor(readonly code: number, message: string) { super(message); }
}

function requestMessage(message?: string) {
  const text = String(message ?? '').trim();
  if (!text) return '请求失败，请稍后重试';
  if (/^Cannot\s+DELETE\s+\//i.test(text)) return '删除功能暂不可用，请稍后再试';
  if (/^Cannot\s+(GET|POST|PATCH|PUT)\s+\//i.test(text) || /^Not Found$/i.test(text)) {
    return '该功能暂不可用，请稍后重试';
  }
  if (/^Internal server error$/i.test(text)) return '服务暂时不可用，请稍后重试';
  return text;
}

export function explain(error: unknown) {
  return error instanceof Error ? error.message : '网络异常，请稍后重试';
}

export function report(error: unknown) {
  wx.showToast({ title: explain(error), icon: 'none' });
}

export function api<T>(path: string, method: Method = 'GET', data?: object, scope = babyId): Promise<T> {
  const session = sessionRevision;
  const selected = scopeRevision;
  return new Promise((resolve, reject) => wx.request<ApiResponse<T>>({
    url: apiBase + path, method, data, timeout: 15000,
    header: { ...(token && { Authorization: 'Bearer ' + token }), ...(scope && { 'X-Baby-Id': String(scope) }) },
    success(res) {
      if (session !== sessionRevision || selected !== scopeRevision) return reject(new Error('页面已切换'));
      if (res.statusCode === 401 && path !== '/auth/wechat' && path !== '/auth/status') {
        clearSession();
        const redirect = path.startsWith('/auth/web/') && 'scene' in (data ?? {})
          ? '?scene=' + encodeURIComponent((data as { scene: string }).scene) : '';
        wx.reLaunch({ url: '/pages/login/index' + redirect });
      }
      if (res.data?.code === 0) resolve(res.data.data);
      else reject(new ApiError(res.data?.code ?? 0, requestMessage(res.data?.message)));
    },
    fail: (error) => reject(new Error(error.errMsg)),
  }));
}

export async function login() {
  const code = await new Promise<string>((resolve, reject) => wx.login({
    success: (result) => result.code ? resolve(result.code) : reject(new Error('微信未返回登录凭证')),
    fail: (error) => reject(new Error(error.errMsg)),
  }));
  const result = await api<{ token: string }>('/auth/wechat', 'POST', { code });
  clearSession();
  token = result.token;
  wx.setStorageSync(tokenKey, token);
}

export async function babyContext(requireBaby = true, loginScene?: string) {
  if (!token) {
    wx.reLaunch({ url: '/pages/login/index' + (loginScene ? '?scene=' + encodeURIComponent(loginScene) : '') });
    return null;
  }
  const list = await api<MemberBaby[]>('/babies');
  const baby = list.find((item) => String(item.id) === babyId) ?? list[0] ?? null;
  selectBaby(baby?.id);
  if (!baby && requireBaby) wx.reLaunch({ url: '/pages/onboarding/index' });
  return { baby, list };
}

export async function logout() {
  try { if (token) await api('/auth/logout', 'POST'); }
  finally {
    clearSession();
    wx.reLaunch({ url: '/pages/login/index' });
  }
}

export function uploadAvatar(id: string, file: string) {
  return new Promise<void>((resolve, reject) => wx.uploadFile({
    url: apiBase + '/babies/' + id + '/avatar', filePath: file, name: 'file',
    header: { Authorization: 'Bearer ' + token },
    success: (res) => {
      try {
        const result = JSON.parse(res.data) as ApiResponse<unknown>;
        if (result.code !== 0) throw new Error(result.message || '头像上传失败');
        resolve();
      } catch (error) { reject(error); }
    },
    fail: (error) => reject(new Error(error.errMsg)),
  }));
}

export function avatarSource(path: string | null) {
  if (!path || path.startsWith('data:')) return Promise.resolve(path ?? '');
  return new Promise<string>((resolve) => wx.downloadFile({
    url: apiBase + '/' + path, header: { Authorization: 'Bearer ' + token },
    success: (res) => resolve(res.statusCode === 200 ? res.tempFilePath : ''),
    fail: () => resolve(''),
  }));
}
