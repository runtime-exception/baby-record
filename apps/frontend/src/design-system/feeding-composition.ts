import type { FeedingType, FeedingComponent } from '@baby-record/shared';
export type { FeedingComponent } from '@baby-record/shared';

export function feedingTypeForComponents(components: FeedingComponent[]): FeedingType {
  return components.length > 1 ? 'MIXED' : components[0];
}

export function componentsForFeeding(record: {
  feedingType: FeedingType;
  components?: FeedingComponent[];
  foods: { id: number }[];
}): FeedingComponent[] {
  if (record.components?.length) return record.components;
  if (record.feedingType === 'MIXED') {
    return ['BREAST_MILK', 'FORMULA', ...(record.foods.length ? ['COMPLEMENTARY_FOOD' as const] : [])];
  }
  return [record.feedingType];
}
