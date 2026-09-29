import { FeedingType } from '@prisma/client';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';

export function resolveFeedingComponents(
  feedingType: FeedingType,
  components: FeedingType[] | undefined,
  foodIds: number[],
): FeedingType[] {
  const resolved = components ?? (feedingType === FeedingType.MIXED
    ? [FeedingType.BREAST_MILK, FeedingType.FORMULA, ...(foodIds.length ? [FeedingType.COMPLEMENTARY_FOOD] : [])]
    : [feedingType]);
  const unique = new Set(resolved);
  const expectedType = resolved.length > 1 ? FeedingType.MIXED : resolved[0];
  if (!resolved.length || unique.size !== resolved.length || unique.has(FeedingType.MIXED) || expectedType !== feedingType) {
    throw new BusinessException(ErrorCode.PARAM_INVALID, '喂养组合与类型不一致');
  }
  if (unique.has(FeedingType.COMPLEMENTARY_FOOD) !== (foodIds.length > 0)) {
    throw new BusinessException(ErrorCode.PARAM_INVALID, '辅食选择与喂养组合不一致');
  }
  return resolved;
}
