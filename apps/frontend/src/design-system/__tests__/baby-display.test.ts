import { describe, expect, it } from 'vitest';
import { formatBabyDisplayName } from '../../utils/baby-display';

describe('formatBabyDisplayName', () => {
  it('shows nickname followed by the real name', () => {
    expect(formatBabyDisplayName('杨小宝', '小宝')).toBe('小宝（杨小宝）');
  });

  it('falls back to the real name without a nickname', () => {
    expect(formatBabyDisplayName('杨小宝', null)).toBe('杨小宝');
    expect(formatBabyDisplayName('杨小宝', '   ')).toBe('杨小宝');
  });

  it('avoids duplicating an identical nickname and name', () => {
    expect(formatBabyDisplayName('小宝', '小宝')).toBe('小宝');
  });
});
