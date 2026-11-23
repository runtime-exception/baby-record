import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BusinessException } from '../src/common/exceptions/business.exception';
import { parseBabyId } from '../src/common/utils/baby-id.util';
import { canAccessBaby } from '../src/modules/auth/family-scope';

test('only approved members can access a baby and only administrators can manage it', () => {
  assert.equal(canAccessBaby(null, false), false);
  assert.equal(canAccessBaby({ status: 'PENDING', isAdmin: false }, false), false);
  assert.equal(canAccessBaby({ status: 'REJECTED', isAdmin: false }, false), false);
  assert.equal(canAccessBaby({ status: 'REMOVED', isAdmin: false }, false), false);
  assert.equal(canAccessBaby({ status: 'APPROVED', isAdmin: false }, false), true);
  assert.equal(canAccessBaby({ status: 'APPROVED', isAdmin: false }, true), false);
  assert.equal(canAccessBaby({ status: 'APPROVED', isAdmin: true }, true), true);
});

test('baby IDs are 16-character random hexadecimal values', () => {
  assert.equal(parseBabyId('A1B2C3D4E5F60718'), 'a1b2c3d4e5f60718');
  for (const invalid of ['1', '12', '123456789012345', 'a1b2c3d4e5f6071g', '', null, 7]) {
    assert.throws(() => parseBabyId(invalid), BusinessException);
  }
});
