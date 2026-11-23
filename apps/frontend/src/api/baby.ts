import { http } from '@/utils/request';
import type { BabyVo, MemberBaby, UserRole } from '@baby-record/shared';
import type { Gender } from '@baby-record/shared';

export interface CreateBabyPayload {
  name: string;
  nickname?: string;
  gender: Gender;
  birthday: string;
  birthWeight?: number;
  birthHeight?: number;
  headCircumference?: number;
  birthHospital?: string;
  remark?: string;
}

export const babyApi = {
  list: () => http.get<MemberBaby[]>('/babies'),
  detail: (id: string) => http.get<BabyVo>(`/babies/${id}`),
  create: (data: CreateBabyPayload & { memberName?: string; role: UserRole }) => http.post<BabyVo>('/babies', data),
  uploadAvatar: (id: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return http.post<BabyVo>(`/babies/${id}/avatar`, body);
  },
  update: (id: string, data: Partial<CreateBabyPayload>) => http.patch<BabyVo>(`/babies/${id}`, data),
};
