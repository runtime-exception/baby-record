import { http } from '@/utils/request';
import type { DiaperVo, DiaperType, PaginatedResult } from '@baby-record/shared';

export interface DiaperQuery {
  babyId: string;
  startDate?: string;
  endDate?: string;
  type?: DiaperType;
  page?: number;
  pageSize?: number;
}

export interface CreateDiaperPayload {
  babyId: string;
  type: DiaperType;
  changeTime: string;
  remark?: string;
  creatorId: number;
}

export const diaperApi = {
  list: (params: DiaperQuery) => http.get<PaginatedResult<DiaperVo>>('/diapers', params),
  detail: (id: number) => http.get<DiaperVo>(`/diapers/${id}`),
  create: (data: CreateDiaperPayload) => http.post<DiaperVo>('/diapers', data),
  update: (id: number, data: Partial<CreateDiaperPayload>) => http.patch<DiaperVo>(`/diapers/${id}`, data),
  remove: (id: number) => http.delete<void>(`/diapers/${id}`),
};
