import { describe, expect, it } from 'vitest';
import { shouldDismissSheet } from '../useSheetGesture';

describe('sheet gesture', () => {
  it('dismisses after dragging past one quarter of the panel height', () => {
    expect(shouldDismissSheet(101, 0.1, 400)).toBe(true);
    expect(shouldDismissSheet(99, 0.1, 400)).toBe(false);
  });

  it('dismisses with a fast downward flick even below the distance threshold', () => {
    expect(shouldDismissSheet(20, 0.55, 400)).toBe(true);
    expect(shouldDismissSheet(20, 0.2, 400)).toBe(false);
  });
});
