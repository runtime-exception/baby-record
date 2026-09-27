import assert from 'node:assert/strict';
import { SleepType } from '@prisma/client';
import { BusinessException } from '../src/common/exceptions/business.exception';
import {
  calculateSleepDurationMinutes,
  ensureSleepEndNotInFuture,
  resolveSleepType,
} from '../src/modules/sleep/sleep-rules';

function localTime(hour: number, minute: number): Date {
  return new Date(2026, 8, 27, hour, minute, 0, 0);
}

assert.equal(resolveSleepType(localTime(5, 59)), SleepType.NIGHT);
assert.equal(resolveSleepType(localTime(6, 0)), SleepType.DAYTIME);
assert.equal(resolveSleepType(localTime(18, 0)), SleepType.DAYTIME);
assert.equal(resolveSleepType(localTime(18, 1)), SleepType.NIGHT);

assert.equal(
  calculateSleepDurationMinutes(localTime(23, 30), new Date(2026, 8, 28, 1, 0, 0, 0)),
  90,
);

for (const endTime of [localTime(10, 0), localTime(9, 59)]) {
  assert.throws(
    () => calculateSleepDurationMinutes(localTime(10, 0), endTime),
    (error) => error instanceof BusinessException && error.getErrorCode() === 40001,
  );
}

assert.throws(
  () => ensureSleepEndNotInFuture(localTime(10, 1), localTime(10, 0)),
  (error) => error instanceof BusinessException && error.getErrorCode() === 40001,
);
assert.doesNotThrow(() => ensureSleepEndNotInFuture(localTime(10, 0), localTime(10, 0)));

console.log('sleep rules tests passed');
