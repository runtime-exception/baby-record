import { http } from '@/utils/request';
import type { SupplementVo, PaginatedResult } from '@baby-record/shared';

export interface SupplementQuery {
  babyId: string;
  startDate?: string;
  endDate?: string;
  name?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateSupplementPayload {
  babyId: string;
  name: string;
  amount?: string;
  unit?: string;
  takeTime: string;
  remark?: string;
  creatorId: number;
}

export const supplementApi = {
  list: (params: SupplementQuery) => http.get<PaginatedResult<SupplementVo>>('/supplements', params),
  detail: (id: number) => http.get<SupplementVo>(`/supplements/${id}`),
  create: (data: CreateSupplementPayload) => http.post<SupplementVo>('/supplements', data),
  update: (id: number, data: Partial<CreateSupplementPayload>) =>
    http.patch<SupplementVo>(`/supplements/${id}`, data),
  remove: (id: number) => http.delete<void>(`/supplements/${id}`),
};
