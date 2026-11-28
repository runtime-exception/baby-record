import { http } from '@/utils/request';
import type { GrowthMetric, GrowthRecordVo, GrowthTrendVo, PaginatedResult } from '@baby-record/shared';

export interface GrowthPayload {
  babyId: string;
  height?: number;
  weight?: number;
  headCircumference?: number;
  measureTime: string;
  remark?: string;
  creatorId: number;
}

export const growthApi = {
  list: (params: { babyId: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) =>
    http.get<PaginatedResult<GrowthRecordVo>>('/growths', params),
  latest: (babyId: string, metric?: GrowthMetric) => http.get<GrowthRecordVo | null>('/growths/latest', { babyId, metric }),
  trend: (babyId: string, metric: GrowthMetric) =>
    http.get<GrowthTrendVo>('/growths/trend', { babyId, metric }),
  create: (data: GrowthPayload) => http.post<GrowthRecordVo>('/growths', data),
  update: (id: number, data: Partial<Omit<GrowthPayload, 'height' | 'weight' | 'headCircumference'>> & Partial<Pick<GrowthRecordVo, 'height' | 'weight' | 'headCircumference'>>) =>
    http.patch<GrowthRecordVo>(`/growths/${id}`, data),
  remove: (id: number) => http.delete<void>(`/growths/${id}`),
};
