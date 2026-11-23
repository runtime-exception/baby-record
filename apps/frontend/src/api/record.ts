import { http } from '@/utils/request';
import type { DailyRecords } from '@baby-record/shared';

export const recordApi = {
  daily: (babyId: string, date: string) => http.get<DailyRecords>('/records/daily', { babyId, date }),
  range: (babyId: string, startDate: string, endDate: string) =>
    http.get<DailyRecords>('/records/range', { babyId, startDate, endDate }),
};
