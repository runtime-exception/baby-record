import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, cpSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const connection = process.env.TEST_DATABASE_URL;
if (!connection) throw new Error('提供独立测试 PostgreSQL 的 TEST_DATABASE_URL');
const url = new URL(connection);
url.searchParams.set('schema', 'test_wechat_' + randomBytes(6).toString('hex'));
const prisma = join(process.cwd(), 'node_modules/prisma/build/index.js');
const env = { ...process.env, DATABASE_URL: url.href, TEST_DATABASE_URL: url.href };
const temporary = mkdtempSync(join(tmpdir(), 'baby-legacy-'));
const schema = join(temporary, 'schema.prisma');
const migration = '20261120000000_wechat_family';

function run(args, input) {
  const result = spawnSync(process.execPath, args, { env, input, stdio: [input ? 'pipe' : 'inherit', 'inherit', 'inherit'] });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Test command failed: ' + args.at(-1));
}

try {
  cpSync('prisma/schema.prisma', schema);
  mkdirSync(join(temporary, 'migrations'));
  for (const name of readdirSync('prisma/migrations').filter((entry) => entry < migration || entry === 'migration_lock.toml')) {
    cpSync(join('prisma/migrations', name), join(temporary, 'migrations', name), { recursive: true });
  }

  run([prisma, 'migrate', 'deploy', '--schema', schema]);
  run([prisma, 'db', 'execute', '--schema', 'prisma/schema.prisma', '--file', 'test/legacy-wechat-fixture.sql']);
  run([prisma, 'migrate', 'deploy']);
  run(['test/wechat-family.integration.cjs']);
} finally {
  const isolatedSchema = url.searchParams.get('schema');
  try {
    run([prisma, 'db', 'execute', '--schema', 'prisma/schema.prisma', '--stdin'], 'DROP SCHEMA IF EXISTS ' + isolatedSchema + ' CASCADE;');
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
