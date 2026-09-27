import { describe, expect, it } from 'vitest';
import { applySupplementDefaults, resolveSupplementEmoji } from '../supplement-config';

describe('supplement configuration values', () => {
  it('prefers a saved emoji and falls back to the neutral supplement icon', () => {
    expect(resolveSupplementEmoji('维生素D', ' ☀️ ')).toBe('☀️');
    expect(resolveSupplementEmoji('DHA', null)).toBe('💊');
    expect(resolveSupplementEmoji('钙', '   ')).toBe('💊');
  });

  it('maps configuration defaults to an immutable record snapshot', () => {
    expect(
      applySupplementDefaults({
        id: 1,
        name: '维生素D',
        emoji: '☀️',
        defaultAmount: '1.5',
        defaultUnit: '滴',
        isActive: true,
        createdTime: '2026-09-27T08:00:00.000Z',
        updatedTime: '2026-09-27T08:00:00.000Z',
      }),
    ).toEqual({ name: '维生素D', amount: '1.5', unit: '滴' });

    expect(
      applySupplementDefaults({
        id: 2,
        name: '临时补剂',
        emoji: null,
        defaultAmount: null,
        defaultUnit: null,
        isActive: true,
        createdTime: '2026-09-27T08:00:00.000Z',
        updatedTime: '2026-09-27T08:00:00.000Z',
      }),
    ).toEqual({ name: '临时补剂', amount: null, unit: null });
  });
});
