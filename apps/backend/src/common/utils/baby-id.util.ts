import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../enums/error-code.enum';

export const BABY_ID_PATTERN = /^[a-f0-9]{16}$/i;

export function parseBabyId(value: unknown): string {
  if (typeof value !== 'string' || !BABY_ID_PATTERN.test(value)) {
    throw new BusinessException(ErrorCode.PARAM_INVALID, '宝宝 ID 必须是 16 位十六进制字符');
  }
  return value.toLowerCase();
}
