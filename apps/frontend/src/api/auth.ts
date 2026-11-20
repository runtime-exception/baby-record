import { http } from '@/utils/request';

export interface AuthStatus {
  authenticated: boolean;
  accountId?: number;
}

export interface WebChallenge {
  scene: string;
  qrCode: string;
  verificationCode: string;
  expiresIn: number;
}

export const authApi = {
  status: () => http.get<AuthStatus>('/auth/status'),
  start: () => http.post<WebChallenge>('/auth/web/start'),
  exchange: (scene: string) => http.post<{ status: 'PENDING' | 'APPROVED' | 'EXPIRED'; accountId?: number }>('/auth/web/exchange', { scene }),
  cancel: (scene: string) => http.post<{ status: string }>('/auth/web/cancel', { scene }),
  logout: () => http.post<AuthStatus>('/auth/logout'),
};
