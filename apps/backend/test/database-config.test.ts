import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validationSchema } from '../src/config/validation';

test('database configuration accepts a PostgreSQL URL or complete connection fields', () => {
  const fields = { DATABASE_HOST: 'db', DATABASE_NAME: 'baby', DATABASE_USERNAME: 'test', DATABASE_PASSWORD: 'test' };
  const validate = (config: object) => validationSchema.validate(config).error;
  assert.equal(validate({ ...fields, DATABASE_URL: '' }), undefined);
  assert.equal(validate({ DATABASE_URL: 'postgresql://test:p%40ss@db:5432/baby?schema=public' }), undefined);
  assert.equal(validate({ DATABASE_HOST: '', DATABASE_USERNAME: '', DATABASE_PASSWORD: '', DATABASE_URL: 'postgres://db/baby' }), undefined);
  assert.ok(validate({ DATABASE_URL: 'https://db/baby' }));
  for (const key of Object.keys(fields)) {
    assert.ok(validate({ ...fields, [key]: '', DATABASE_URL: '' }), key);
  }
});
