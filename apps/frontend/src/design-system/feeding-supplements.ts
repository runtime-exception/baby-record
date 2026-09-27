import type { SupplementConfigVo } from '@baby-record/shared';
import type { CreateSupplementPayload } from '@/api/supplement';

interface FeedingSupplementContext {
  babyId: number;
  creatorId: number;
  feedingTime: string;
}

export function buildFeedingSupplementPayloads(
  configs: SupplementConfigVo[],
  selectedIds: number[],
  context: FeedingSupplementContext,
): CreateSupplementPayload[] {
  const byId = new Map(configs.map((config) => [config.id, config]));
  return selectedIds.flatMap((id) => {
    const config = byId.get(id);
    if (!config) return [];
    return [{
      babyId: context.babyId,
      creatorId: context.creatorId,
      takeTime: context.feedingTime,
      name: config.name,
      ...(config.defaultAmount ? { amount: config.defaultAmount } : {}),
      ...(config.defaultUnit ? { unit: config.defaultUnit } : {}),
    }];
  });
}

export function summarizeSupplementResults(results: PromiseSettledResult<unknown>[]) {
  const failedCount = results.filter((result) => result.status === 'rejected').length;
  return {
    failedCount,
    message: failedCount ? '喂养已保存，部分补剂记录失败' : '喂养记录已保存',
  };
}
