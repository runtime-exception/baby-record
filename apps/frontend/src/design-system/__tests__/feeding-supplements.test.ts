import { describe, expect, it } from 'vitest';
import {
  buildFeedingSupplementPayloads,
  summarizeSupplementResults,
} from '@/design-system/feeding-supplements';

const configs = [
  {
    id: 1,
    name: '维生素D',
    emoji: '☀️',
    defaultAmount: '1',
    defaultUnit: '滴',
    isActive: true,
    createdTime: '2026-09-27T08:00:00.000Z',
    updatedTime: '2026-09-27T08:00:00.000Z',
  },
  {
    id: 2,
    name: 'DHA',
    emoji: '🐟',
    defaultAmount: '2',
    defaultUnit: '粒',
    isActive: true,
    createdTime: '2026-09-27T08:00:00.000Z',
    updatedTime: '2026-09-27T08:00:00.000Z',
  },
];

describe('feeding supplement integration', () => {
  it('builds one snapshot payload per selected preset with a shared feeding time', () => {
    expect(buildFeedingSupplementPayloads(configs, [2, 1], {
      babyId: 7,
      creatorId: 9,
      feedingTime: '2026-09-27T10:30:00.000Z',
    })).toEqual([
      {
        babyId: 7,
        creatorId: 9,
        takeTime: '2026-09-27T10:30:00.000Z',
        name: 'DHA',
        amount: '2',
        unit: '粒',
      },
      {
        babyId: 7,
        creatorId: 9,
        takeTime: '2026-09-27T10:30:00.000Z',
        name: '维生素D',
        amount: '1',
        unit: '滴',
      },
    ]);
  });

  it('reports partial failure without asking to recreate the feeding', () => {
    const results: PromiseSettledResult<unknown>[] = [
      { status: 'fulfilled', value: { id: 1 } },
      { status: 'rejected', reason: new Error('network') },
    ];
    expect(summarizeSupplementResults(results)).toEqual({
      failedCount: 1,
      message: '喂养已保存，部分补剂记录失败',
    });
  });

  it('keeps the normal success message when every supplement succeeds', () => {
    expect(summarizeSupplementResults([
      { status: 'fulfilled', value: { id: 1 } },
    ])).toEqual({ failedCount: 0, message: '喂养记录已保存' });
  });
});
