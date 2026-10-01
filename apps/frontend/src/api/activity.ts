import { http } from '@/utils/request';
import type { ActivityVo, ExerciseUnit, PaginatedResult } from '@baby-record/shared';

export interface ActivityQuery {
  babyId: number;
  startDate?: string;
  endDate?: string;
  eventType?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateActivityPayload {
  babyId: number;
  eventType: string;
  exerciseTypes?: string[];
  amount?: string | null;
  unit?: ExerciseUnit | null;
  eventTime: string;
  description?: string;
  remark?: string;
  creatorId: number;
}

export const activityApi = {
  list: (params: ActivityQuery) => http.get<PaginatedResult<ActivityVo>>('/activities', params),
  detail: (id: number) => http.get<ActivityVo>(`/activities/${id}`),
  create: (data: CreateActivityPayload) => http.post<ActivityVo>('/activities', data),
  update: (id: number, data: Partial<CreateActivityPayload>) =>
    http.patch<ActivityVo>(`/activities/${id}`, data),
  remove: (id: number) => http.delete<void>(`/activities/${id}`),
};
