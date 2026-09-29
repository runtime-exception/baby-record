import assert from 'node:assert/strict';
import { FeedingType } from '@prisma/client';
import { resolveFeedingComponents } from '../src/modules/feeding/feeding-composition';

const { BREAST_MILK, FORMULA, COMPLEMENTARY_FOOD, MIXED } = FeedingType;

assert.deepEqual(resolveFeedingComponents(MIXED, [BREAST_MILK, COMPLEMENTARY_FOOD], [1]), [BREAST_MILK, COMPLEMENTARY_FOOD]);
assert.deepEqual(resolveFeedingComponents(MIXED, [FORMULA, COMPLEMENTARY_FOOD], [1]), [FORMULA, COMPLEMENTARY_FOOD]);
assert.deepEqual(resolveFeedingComponents(MIXED, undefined, []), [BREAST_MILK, FORMULA]);
assert.throws(() => resolveFeedingComponents(BREAST_MILK, [BREAST_MILK, COMPLEMENTARY_FOOD], [1]));
assert.throws(() => resolveFeedingComponents(MIXED, [BREAST_MILK, COMPLEMENTARY_FOOD], []));
assert.throws(() => resolveFeedingComponents(MIXED, [MIXED], []));

console.log('feeding composition checks passed');
