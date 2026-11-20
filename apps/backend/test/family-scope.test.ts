import assert from 'node:assert/strict';
import { test } from 'node:test';
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
