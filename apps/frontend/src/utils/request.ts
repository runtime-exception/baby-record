import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import { $message } from './feedback';
import type { ApiResponse } from '@baby-record/shared';

const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 15000,
  withCredentials: true,
});

let requestBaby: number | null = null;
export function setRequestBaby(id: number | null) { requestBaby = id; }

instance.interceptors.request.use((config) => {
  if (requestBaby && /^\/(foods|exercise-configs|supplement-configs)(?:\/|$)/.test(config.url ?? '')) {
    config.headers.set('X-Baby-Id', String(requestBaby));
  }
  return config;
}, undefined, { synchronous: true });

export function mediaUrl(path: string) {
  if (path.startsWith('data:')) return path;
  return (instance.defaults.baseURL ?? '').replace(/\/$/, '') + '/' + path;
}

// 响应拦截：统一拆包 { code, message, data }
instance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    const res = response.data;
    if (res.code === 0) {
      return res.data as unknown as AxiosResponse;
    }
    // 业务错误
    $message.error(res.message || '请求失败');
    return Promise.reject(new Error(res.message || '请求失败'));
  },
  (error) => {
    const msg = error?.response?.data?.message || error?.message || '网络异常，请稍后重试';
    const isLoginRequest = String(error?.config?.url || '').startsWith('/auth/web/');
    if (error?.response?.status === 401 && !isLoginRequest) {
      const current = `${window.location.pathname}${window.location.search}`;
      if (window.location.pathname !== '/login') {
        window.location.assign(`/login?redirect=${encodeURIComponent(current)}`);
      }
      return Promise.reject(error);
    }
    if (isLoginRequest) return Promise.reject(error);
    $message.error(msg);
    return Promise.reject(error);
  },
);

/** 统一 HTTP 调用封装，直接返回业务 data */
export const http = {
  get<T>(url: string, params?: object): Promise<T> {
    return instance.get(url, { params }) as unknown as Promise<T>;
  },
  post<T>(url: string, data?: object): Promise<T> {
    if (data instanceof FormData) return instance.post(url, data) as unknown as Promise<T>;
    return dedupe('post', url, data, () => instance.post(url, data));
  },
  patch<T>(url: string, data?: object): Promise<T> {
    return dedupe('patch', url, data, () => instance.patch(url, data));
  },
  put<T>(url: string, data?: object): Promise<T> {
    return dedupe('put', url, data, () => instance.put(url, data));
  },
  delete<T>(url: string): Promise<T> {
    return instance.delete(url) as unknown as Promise<T>;
  },
};

// ---- 写操作请求级去重（防重复提交）----
// 对进行中的相同写请求（method + url + body 一致）复用同一个 Promise，
// 从根源避免因网络延迟、连点或刷新前已飞出而导致的重复提交。
const inflight = new Map<string, Promise<unknown>>();
// 兜底超时：与实例 timeout 对齐，防止极端情况下 key 异常驻留
const DEDUPE_TIMEOUT = 15000;

function dedupeKey(method: string, url: string, data?: object): string {
  return `${requestBaby} ${method} ${url} ${data == null ? '' : JSON.stringify(data)}`;
}

function dedupe<T>(
  method: string,
  url: string,
  data: object | undefined,
  run: () => Promise<AxiosResponse>,
): Promise<T> {
  const key = dedupeKey(method, url, data);
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = run() as unknown as Promise<T>;
  inflight.set(key, promise);

  // 兜底清理：即便 Promise 因故未 settle，超时后也允许后续重新提交
  const timer = setTimeout(() => inflight.delete(key), DEDUPE_TIMEOUT);
  const cleanup = () => {
    clearTimeout(timer);
    inflight.delete(key);
  };
  promise.then(cleanup, cleanup);

  return promise;
}

export type { AxiosRequestConfig };
