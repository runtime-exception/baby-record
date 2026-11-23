import { http } from '@/utils/request';
import type { PaginatedResult, TemperatureVo } from '@baby-record/shared';

export interface TemperaturePayload {
  babyId: string;
  temperature: number;
  measureTime: string;
  remark?: string;
  creatorId: number;
}

export const temperatureApi = {
  list: (params: { babyId: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) =>
    http.get<PaginatedResult<TemperatureVo>>('/temperatures', params),
  latest: (babyId: string) => http.get<TemperatureVo | null>('/temperatures/latest', { babyId }),
  create: (data: TemperaturePayload) => http.post<TemperatureVo>('/temperatures', data),
  update: (id: number, data: Partial<TemperaturePayload>) => http.patch<TemperatureVo>(`/temperatures/${id}`, data),
  remove: (id: number) => http.delete<void>(`/temperatures/${id}`),
};
