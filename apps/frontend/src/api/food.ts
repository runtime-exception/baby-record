import { http } from '@/utils/request';
import type { FoodVo } from '@baby-record/shared';

export const foodApi = {
  list: (includeInactive = false) => http.get<FoodVo[]>('/foods', { includeInactive }),
  create: (name: string) => http.post<FoodVo>('/foods', { name }),
  update: (id: number, data: { name?: string; isActive?: boolean }) =>
    http.patch<FoodVo>(`/foods/${id}`, data),
  remove: (id: number) => http.delete<void>(`/foods/${id}`),
};
