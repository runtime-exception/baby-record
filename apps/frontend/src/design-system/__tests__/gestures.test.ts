import { describe, expect, it } from 'vitest';
import {
  consumeSuppressedClick,
  exceedsLongPressTolerance,
  hasReachedRefreshThreshold,
  shouldStartPullRefresh,
} from '../gesture-values';

describe('mobile gestures', () => {
  it('cancels long press after moving beyond tolerance', () => {
    expect(exceedsLongPressTolerance(0, 0, 7, 7, 10)).toBe(false);
    expect(exceedsLongPressTolerance(0, 0, 11, 0, 10)).toBe(true);
  });

  it('starts pull refresh only from the top edge and downward', () => {
    expect(shouldStartPullRefresh(0, 18)).toBe(true);
    expect(shouldStartPullRefresh(1, 18)).toBe(false);
    expect(shouldStartPullRefresh(0, -18)).toBe(false);
  });

  it('requires the configured refresh distance', () => {
    expect(hasReachedRefreshThreshold(71, 72)).toBe(false);
    expect(hasReachedRefreshThreshold(72, 72)).toBe(true);
  });

  it('consumes one click after a long press and then resets', () => {
    const state = { value: true };

    expect(consumeSuppressedClick(state)).toBe(true);
    expect(consumeSuppressedClick(state)).toBe(false);
  });
});
