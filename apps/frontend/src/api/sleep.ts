import { http } from '@/utils/request';
import type { SleepVo, SleepType, PaginatedResult } from '@baby-record/shared';

export interface SleepQuery {
  babyId: number;
  startDate?: string;
  endDate?: string;
  sleepType?: SleepType;
  ongoing?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateSleepPayload {
  babyId: number;
  sleepType?: SleepType;
  startTime: string;
  endTime?: string;
  remark?: string;
  creatorId: number;
}

export interface StartSleepPayload {
  babyId: number;
  sleepType?: SleepType;
  startTime?: string;
  remark?: string;
  creatorId: number;
}

export interface EndSleepPayload {
  endTime?: string;
  remark?: string;
}

export const sleepApi = {
  list: (params: SleepQuery) => http.get<PaginatedResult<SleepVo>>('/sleeps', params),
  detail: (id: number) => http.get<SleepVo>(`/sleeps/${id}`),
  create: (data: CreateSleepPayload) => http.post<SleepVo>('/sleeps', data),
  update: (id: number, data: Partial<CreateSleepPayload>) => http.patch<SleepVo>(`/sleeps/${id}`, data),
  remove: (id: number) => http.delete<void>(`/sleeps/${id}`),
  start: (data: StartSleepPayload) => http.post<SleepVo>('/sleeps/start', data),
  end: (id: number, data: EndSleepPayload) => http.patch<SleepVo>(`/sleeps/${id}/end`, data),
};
