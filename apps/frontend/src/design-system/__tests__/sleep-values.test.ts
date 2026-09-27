import { describe, expect, it } from 'vitest';
import { validateCompletedSleepRange } from '@/design-system/sleep-values';

describe('completed sleep range validation', () => {
  const now = new Date('2026-09-27T10:00:00.000Z').getTime();

  it('accepts a valid range that crosses midnight', () => {
    expect(validateCompletedSleepRange(
      new Date('2026-09-26T23:30:00.000Z').getTime(),
      new Date('2026-09-27T01:00:00.000Z').getTime(),
      now,
    )).toBeNull();
  });

  it.each([
    ['equal', now - 60_000, now - 60_000],
    ['earlier', now - 60_000, now - 120_000],
  ])('rejects an end time that is %s to the start', (_label, start, end) => {
    expect(validateCompletedSleepRange(start, end, now)).toBe('结束时间必须晚于开始时间');
  });

  it('rejects an end time later than now', () => {
    expect(validateCompletedSleepRange(now - 60_000, now + 1, now)).toBe('结束时间不能晚于当前时间');
  });
});
