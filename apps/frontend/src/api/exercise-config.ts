import { http } from '@/utils/request';
import type { ExerciseConfigVo, ExerciseUnit } from '@baby-record/shared';

export interface ExerciseConfigInput {
  name: string;
  emoji?: string | null;
  defaultAmount?: string;
  defaultUnit?: ExerciseUnit;
}

export const exerciseConfigApi = {
  list: (includeInactive = false) =>
    http.get<ExerciseConfigVo[]>('/exercise-configs', { includeInactive }),
  create: (data: ExerciseConfigInput) =>
    http.post<ExerciseConfigVo>('/exercise-configs', data),
  update: (
    id: number,
    data: Partial<ExerciseConfigInput> & { isActive?: boolean },
  ) => http.patch<ExerciseConfigVo>(`/exercise-configs/${id}`, data),
  remove: (id: number) => http.delete<void>(`/exercise-configs/${id}`),
};
