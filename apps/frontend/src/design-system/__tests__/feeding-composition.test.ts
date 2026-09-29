import { describe, expect, it } from 'vitest';
import { feedingTypeForComponents, componentsForFeeding } from '@/design-system/feeding-composition';

describe('feeding composition', () => {
  it('derives mixed for every combination of two or more basics', () => {
    expect(feedingTypeForComponents(['BREAST_MILK'])).toBe('BREAST_MILK');
    expect(feedingTypeForComponents(['COMPLEMENTARY_FOOD'])).toBe('COMPLEMENTARY_FOOD');
    expect(feedingTypeForComponents(['BREAST_MILK', 'FORMULA'])).toBe('MIXED');
    expect(feedingTypeForComponents(['BREAST_MILK', 'COMPLEMENTARY_FOOD'])).toBe('MIXED');
    expect(feedingTypeForComponents(['FORMULA', 'COMPLEMENTARY_FOOD'])).toBe('MIXED');
  });

  it('restores saved components and understands historical mixed records', () => {
    expect(componentsForFeeding({ feedingType: 'MIXED', components: ['FORMULA', 'COMPLEMENTARY_FOOD'], foods: [{ id: 1 }] })).toEqual(['FORMULA', 'COMPLEMENTARY_FOOD']);
    expect(componentsForFeeding({ feedingType: 'MIXED', foods: [{ id: 1 }] })).toEqual(['BREAST_MILK', 'FORMULA', 'COMPLEMENTARY_FOOD']);
  });
});
