import { http } from '@/utils/request';
import type { IntervalResult } from '@baby-record/shared';

export const intervalApi = {
  feeding: (babyId: string) => http.get<IntervalResult>('/intervals/feeding', { babyId }),
  diaper: (babyId: string) => http.get<IntervalResult>('/intervals/diaper', { babyId }),
  sleep: (babyId: string) => http.get<IntervalResult>('/intervals/sleep', { babyId }),
};
