import { SleepType } from '@prisma/client';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';

function ensureValidDate(value: Date): void {
  if (Number.isNaN(value.getTime())) {
    throw new BusinessException(ErrorCode.PARAM_INVALID, '睡眠时间无效');
  }
}

export function resolveSleepType(startTime: Date): SleepType {
  ensureValidDate(startTime);
  const minutes = startTime.getHours() * 60 + startTime.getMinutes();
  return minutes >= 6 * 60 && minutes <= 18 * 60
    ? SleepType.DAYTIME
    : SleepType.NIGHT;
}

export function calculateSleepDurationMinutes(startTime: Date, endTime: Date): number {
  ensureValidDate(startTime);
  ensureValidDate(endTime);
  if (endTime.getTime() <= startTime.getTime()) {
    throw new BusinessException(ErrorCode.PARAM_INVALID, '结束时间必须晚于开始时间');
  }
  return Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
}
