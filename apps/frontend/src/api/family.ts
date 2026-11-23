import { http } from '@/utils/request';
import type { FamilyApplication, FamilyMember, UserRole } from '@baby-record/shared';

export interface BindingPayload {
  babyId: string;
  memberName?: string;
  role: UserRole;
}

export const familyApi = {
  applications: () => http.get<FamilyApplication[]>('/family/applications'),
  apply: (data: BindingPayload) => http.post('/family/applications', data),
  claim: (data: BindingPayload & { code: string }) => http.post('/family/claim', data),
  members: (babyId: string) => http.get<FamilyMember[]>(`/family/${babyId}/members`),
  decide: (babyId: string, accountId: number, status: 'APPROVED' | 'REJECTED') =>
    http.patch(`/family/${babyId}/members/${accountId}`, { status }),
  remove: (babyId: string, accountId: number) => http.delete(`/family/${babyId}/members/${accountId}`),
};
