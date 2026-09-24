import { describe, expect, it } from 'vitest';
import {
  dateInputToTimestamp,
  timestampToDateInput,
} from '../date-values';
import { toggleSelection } from '../select-values';

describe('design system form adapters', () => {
  it('round-trips a date without UTC day drift', () => {
    const timestamp = dateInputToTimestamp('2026-09-24', 'date');
    expect(timestampToDateInput(timestamp, 'date')).toBe('2026-09-24');
  });

  it('toggles multiple selection values without duplicating them', () => {
    expect(toggleSelection([1, 2], 2)).toEqual([1]);
    expect(toggleSelection([1], 2)).toEqual([1, 2]);
  });
});
