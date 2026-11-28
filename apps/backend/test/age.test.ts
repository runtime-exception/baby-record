import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AgeUtil } from '../src/common/utils/age.util';

test('month-end birthdays use the last valid day and never show negative days', () => {
  assert.equal(AgeUtil.calc('2026-01-31', new Date(2026, 1, 27)).monthAgeText, '0个月27天');
  assert.equal(AgeUtil.calc('2026-01-31', new Date(2026, 1, 28)).monthAgeText, '1个月0天');
  assert.equal(AgeUtil.calc('2026-01-31', new Date(2026, 2, 1)).monthAgeText, '1个月1天');
  assert.equal(AgeUtil.calc('2024-02-29', new Date(2025, 1, 28)).monthAgeText, '12个月0天');
});
