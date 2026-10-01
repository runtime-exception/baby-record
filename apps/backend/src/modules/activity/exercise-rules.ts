import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';

export const EXERCISE_UNITS = ['分钟', '秒', '次'];
export function validateExerciseAmount(amount: string, unit: string) {
  if (!EXERCISE_UNITS.includes(unit)) {
    throw new BusinessException(ErrorCode.PARAM_INVALID, '运动单位只能为分钟、秒或次');
  }
  if (typeof amount !== 'string' || !/^\d+(\.\d+)?$/.test(amount.trim()) || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || (unit === '次' && !Number.isInteger(Number(amount)))) {
    throw new BusinessException(ErrorCode.PARAM_INVALID, '运动数量必须为正数，次数必须为整数');
  }
}
export function preferredExercise<T extends { defaultUnit: string }>(items: T[]): T {
  return items.find((item) => item.defaultUnit !== '次') ?? items[0];
}
