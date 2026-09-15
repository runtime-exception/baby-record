import { http } from '@/utils/request';
import type {
  AllergyConclusion,
  FoodAllergyObservations,
  FoodAllergyRecordVo,
  PaginatedResult,
} from '@baby-record/shared';

export interface FoodAllergyPayload {
  babyId: number;
  foodId: number;
  exposureTime: string;
  observations: FoodAllergyObservations;
  finalConclusion: AllergyConclusion;
  remark?: string;
  creatorId: number;
}

export const foodAllergyApi = {
  list: (params: { babyId: number; startDate?: string; endDate?: string; page?: number; pageSize?: number }) =>
    http.get<PaginatedResult<FoodAllergyRecordVo>>('/food-allergies', params),
  detail: (id: number) => http.get<FoodAllergyRecordVo>(`/food-allergies/${id}`),
  create: (data: FoodAllergyPayload) => http.post<FoodAllergyRecordVo>('/food-allergies', data),
  update: (id: number, data: Partial<FoodAllergyPayload>) =>
    http.patch<FoodAllergyRecordVo>(`/food-allergies/${id}`, data),
  remove: (id: number) => http.delete<void>(`/food-allergies/${id}`),
};
