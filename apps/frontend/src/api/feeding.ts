import { http } from '@/utils/request';
import type { FeedingVo, FeedingType, PaginatedResult } from '@baby-record/shared';

export interface FeedingQuery {
  babyId: number;
  startDate?: string;
  endDate?: string;
  feedingType?: FeedingType;
  page?: number;
  pageSize?: number;
}

export interface CreateFeedingPayload {
  babyId: number;
  feedingType: FeedingType;
  feedingTime: string;
  amountMl?: number;
  durationMinutes?: number;
  foodIds?: number[];
  remark?: string;
  creatorId: number;
}

export const feedingApi = {
  list: (params: FeedingQuery) => http.get<PaginatedResult<FeedingVo>>('/feedings', params),
  detail: (id: number) => http.get<FeedingVo>(`/feedings/${id}`),
  create: (data: CreateFeedingPayload) => http.post<FeedingVo>('/feedings', data),
  update: (id: number, data: Partial<CreateFeedingPayload>) => http.patch<FeedingVo>(`/feedings/${id}`, data),
  remove: (id: number) => http.delete<void>(`/feedings/${id}`),
};
