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

export function ensureSleepEndNotInFuture(endTime: Date, now = new Date()): void {
  ensureValidDate(endTime);
  ensureValidDate(now);
  if (endTime.getTime() > now.getTime()) {
    throw new BusinessException(ErrorCode.PARAM_INVALID, '结束时间不能晚于当前时间');
  }
}

export function sleepOverlappingRange(babyId: string, start: Date, end: Date) {
  return {
    babyId,
    startTime: { lte: end },
    OR: [{ endTime: { gt: start } }, { startTime: { gte: start }, endTime: null }],
  };
}

export function sleepMinutesInRange(sleep: { startTime: Date; endTime: Date | null }, start: Date, end: Date) {
  if (!sleep.endTime) return 0;
  const elapsed = (time: number) => Math.floor(Math.max(0, time - sleep.startTime.getTime()) / 60_000);
  return Math.max(0, elapsed(Math.min(sleep.endTime.getTime(), end.getTime() + 1)) - elapsed(start.getTime()));
}
