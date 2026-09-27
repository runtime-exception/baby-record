import { http } from '@/utils/request';
import type { SupplementConfigVo } from '@baby-record/shared';

export interface SupplementConfigInput {
  name: string;
  emoji?: string | null;
  defaultAmount?: string | null;
  defaultUnit?: string | null;
}

export const supplementConfigApi = {
  list: (includeInactive = false) =>
    http.get<SupplementConfigVo[]>('/supplement-configs', { includeInactive }),
  create: (data: SupplementConfigInput) =>
    http.post<SupplementConfigVo>('/supplement-configs', data),
  update: (
    id: number,
    data: Partial<SupplementConfigInput> & { isActive?: boolean },
  ) => http.patch<SupplementConfigVo>(`/supplement-configs/${id}`, data),
  remove: (id: number) => http.delete<void>(`/supplement-configs/${id}`),
};
