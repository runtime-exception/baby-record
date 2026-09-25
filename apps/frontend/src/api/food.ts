import { http } from '@/utils/request';
import type { FoodVo } from '@baby-record/shared';

export const foodApi = {
  list: (includeInactive = false) => http.get<FoodVo[]>('/foods', { includeInactive }),
  create: (name: string, emoji?: string | null) => http.post<FoodVo>('/foods', { name, emoji }),
  update: (id: number, data: { name?: string; emoji?: string | null; isActive?: boolean }) =>
    http.patch<FoodVo>(`/foods/${id}`, data),
  remove: (id: number) => http.delete<void>(`/foods/${id}`),
};
