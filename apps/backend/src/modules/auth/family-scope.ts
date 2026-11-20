import { Request } from 'express';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';

export interface FamilyRequest extends Request {
  accountId: number;
  channel: string;
  babyId: number;
}

export function canAccessBaby(member: { status: string; isAdmin: boolean } | null, admin: boolean) {
  return member?.status === 'APPROVED' && (!admin || member.isAdmin);
}

export function positiveId(value: unknown): number {
  const id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof id !== 'number' || !Number.isInteger(id) || id < 1 || id > 2147483647) {
    throw new BusinessException(ErrorCode.PARAM_INVALID, '请选择有效的宝宝或记录');
  }
  return id;
}
