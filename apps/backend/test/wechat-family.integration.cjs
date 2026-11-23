const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

const connection = process.env.TEST_DATABASE_URL;
if (!connection || !new URL(connection).searchParams.get('schema')?.startsWith('test_wechat_')) {
  throw new Error('Use a disposable PostgreSQL schema named test_wechat_*');
}
const prisma = new PrismaClient({ datasources: { db: { url: connection } } });
const port = Number(process.env.TEST_API_PORT ?? '55671');
const origin = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['--require', './test/wechat-fixture.cjs', './dist/main.js'], {
  env: { ...process.env, NODE_ENV: 'test', APP_PORT: String(port), API_PREFIX: 'api/v1',
    DATABASE_URL: connection, DATABASE_HOST: '127.0.0.1', DATABASE_NAME: 'postgres', DATABASE_USERNAME: 'test',
    DATABASE_PASSWORD: 'test', BABY_RECORD_COOKIE_SECURE: 'false', WECHAT_APP_ID: 'fixture-app', WECHAT_APP_SECRET: 'fixture-secret' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
server.stdout.on('data', (bytes) => { serverLog += bytes; });
server.stderr.on('data', (bytes) => { serverLog += bytes; });
const hash = (value) => createHash('sha256').update(value).digest('hex');

async function send(path, { body, token, cookie, scope, method = body === undefined ? 'GET' : 'POST' } = {}) {
  const response = await fetch(origin + '/api/v1' + path, {
    method,
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    headers: {
      ...(body !== undefined && !(body instanceof FormData) && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: 'Bearer ' + token }), ...(cookie && { Cookie: cookie }),
      ...(scope && { 'X-Baby-Id': String(scope) }),
    },
  });
  const parsed = response.headers.get('content-type')?.startsWith('image/') ? Buffer.from(await response.arrayBuffer()) : await response.json();
  return { response, parsed, data: parsed.data, code: parsed.code, cookie: response.headers.getSetCookie()[0]?.split(';')[0] };
}

async function okay(path, options) {
  const result = await send(path, options);
  assert.equal(result.code, 0, path + ' ' + JSON.stringify(result.parsed));
  return result.data;
}

async function blocked(path, options) {
  const result = await send(path, options);
  assert.notEqual(result.code, 0, path + ' should be inaccessible');
  assert.equal(result.data, null);
  return result;
}

async function main() {
  for (let attempt = 0; ; attempt++) {
    try { await fetch(origin + '/api/v1/auth/status'); break; }
    catch (error) {
      if (attempt === 60 || server.exitCode !== null) throw error;
      await delay(100);
    }
  }
  const legacy = await prisma.baby.findMany({ where: { name: { startsWith: 'Legacy' } }, orderBy: { id: 'asc' } });
  assert.equal(legacy.length, 2);
  assert.match(legacy[0].id, /^[a-f0-9]{16}$/);
  assert.match(legacy[1].id, /^[a-f0-9]{16}$/);
  const history = await prisma.feeding.findMany({
    where: { babyId: { in: legacy.map((item) => item.id) } },
    include: { creator: true, foods: { include: { food: true } } }, orderBy: { id: 'asc' },
  });
  assert.equal(history.length, 2);
  assert.equal(history[0].creator.name, '历史记录人');
  assert.equal(history[0].foods[0].food.name, '历史辅食');
  assert.equal(history[0].foods[0].food.babyId, legacy[0].id);
  assert.equal(history[1].foods[0].food.babyId, legacy[1].id);
  assert.equal(await prisma.foodAllergyRecord.count({ where: { babyId: legacy[0].id, foodId: history[0].foods[0].foodId } }), 1);
  assert.equal(await prisma.supplementConfig.count({ where: { babyId: legacy[0].id, name: '历史补剂' } }), 1);
  assert.equal(await prisma.exerciseConfig.count({ where: { babyId: legacy[1].id, name: '历史运动' } }), 1);

  const [dad, mom, outsider] = await Promise.all(['dad', 'mom', 'outsider'].map((role) =>
    okay('/auth/wechat', { body: { code: 'fixture-' + role } })));
  const dadAuth = { token: dad.token };
  const momAuth = { token: mom.token };
  const otherAuth = { token: outsider.token };
  assert.deepEqual(await okay('/babies', dadAuth), []);
  assert.equal((await send('/babies', { cookie: 'baby_record_session=obsolete' })).response.status, 401);

  const enrollment = { gender: 'MALE', birthday: '2025-01-01', memberName: '家长', role: 'DAD' };
  const baby = await okay('/babies', { ...dadAuth, body: { ...enrollment, name: '宝宝甲' } });
  const otherBaby = await okay('/babies', { ...otherAuth, body: { ...enrollment, name: '宝宝乙' } });
  assert.match(baby.id, /^[a-f0-9]{16}$/);
  assert.match(otherBaby.id, /^[a-f0-9]{16}$/);
  assert.equal((await okay('/babies', dadAuth))[0].membership.isAdmin, true);
  assert.equal((await okay('/babies', otherAuth)).length, 1);
  await blocked('/babies/' + baby.id, otherAuth);
  await blocked('/dashboard?babyId=' + baby.id, otherAuth);
  await blocked('/statistics/overview?babyId=' + baby.id, otherAuth);
  await blocked('/foods', { ...otherAuth, scope: baby.id });
  await blocked('/family/' + baby.id + '/members', otherAuth);
  const record = await okay('/feedings', {
    ...dadAuth, body: { babyId: baby.id, creatorId: 9999, feedingType: 'FORMULA', feedingTime: '2026-11-20T01:00:00Z', amountMl: 120 },
  });
  assert.equal(record.creatorId, (await okay('/babies', dadAuth))[0].membership.creatorId);
  await blocked('/feedings/' + record.id, otherAuth);
  await blocked('/feedings/' + record.id, { ...otherAuth, method: 'PATCH', body: { babyId: otherBaby.id, amountMl: 3 } });
  await blocked('/feedings/' + record.id, { ...otherAuth, method: 'DELETE' });
  await blocked('/feedings', dadAuth);
  const scopedFoods = await okay('/foods', { ...otherAuth, scope: otherBaby.id });
  await blocked('/foods/' + scopedFoods[0].id, { ...dadAuth, scope: baby.id, method: 'PATCH', body: { name: '越权' } });
  await blocked('/feedings', { ...dadAuth, body: {
    babyId: baby.id, feedingType: 'COMPLEMENTARY_FOOD', foodIds: [scopedFoods[0].id], feedingTime: '2026-11-20T01:00:00Z',
  } });
  await blocked('/users', dadAuth);

  const profileImage = new FormData();
  profileImage.append('file', new Blob([Buffer.from('89504e470d0a1a0a', 'hex')], { type: 'image/png' }), 'test.png');
  const avatar = await okay('/babies/' + baby.id + '/avatar', { ...dadAuth, body: profileImage });
  assert.match(avatar.avatar, /^babies\/[a-f0-9]{16}\/avatar/);
  await blocked('/' + avatar.avatar, otherAuth);
  assert.equal((await send('/' + avatar.avatar, dadAuth)).response.headers.get('Cache-Control'), 'private, no-store');

  const application = { babyId: baby.id, memberName: '妈妈', role: 'MOM' };
  await Promise.all([okay('/family/applications', { ...momAuth, body: application }), okay('/family/applications', { ...momAuth, body: application })]);
  assert.equal((await okay('/family/applications', momAuth)).length, 1);
  await blocked('/feedings/' + record.id, momAuth);
  const memberPath = '/family/' + baby.id + '/members/' + mom.accountId;
  await okay(memberPath, { ...dadAuth, method: 'PATCH', body: { status: 'APPROVED' } });
  assert.equal((await okay('/babies', momAuth))[0].membership.role, 'MOM');
  await okay('/feedings/' + record.id, { ...momAuth, method: 'PATCH', body: { amountMl: 130 } });
  await blocked('/babies/' + baby.id, { ...momAuth, method: 'PATCH', body: { name: '非管理员' } });

  await okay('/family/applications', { ...momAuth, body: { ...application, babyId: otherBaby.id, role: 'GRANDMA_P' } });
  await okay('/family/' + otherBaby.id + '/members/' + mom.accountId, { ...otherAuth, method: 'PATCH', body: { status: 'APPROVED' } });
  const identities = await okay('/babies', momAuth);
  assert.deepEqual(identities.map((item) => item.membership.role), ['MOM', 'GRANDMA_P']);
  await okay(memberPath, { ...dadAuth, method: 'DELETE' });
  await blocked('/feedings/' + record.id, momAuth);
  await blocked('/' + avatar.avatar, momAuth);
  await blocked('/foods', { ...momAuth, scope: baby.id });
  await okay('/family/applications', { ...otherAuth, body: { ...application, role: 'DAD' } });
  await okay('/family/' + baby.id + '/members/' + outsider.accountId, { ...dadAuth, method: 'PATCH', body: { status: 'REJECTED' } });
  assert.equal((await okay('/family/applications', otherAuth))[0].status, 'REJECTED');
  await blocked('/babies/' + baby.id, otherAuth);

  const code = '0123456789abcdef0123456789abcdef';
  await prisma.babyClaim.create({ data: { babyId: legacy[0].id, codeHash: hash(code), expiresAt: new Date(Date.now() + 60000) } });
  const claim = { ...application, babyId: legacy[0].id, code };
  const claimResults = await Promise.all([send('/family/claim', { ...dadAuth, body: claim }), send('/family/claim', { ...otherAuth, body: claim })]);
  assert.equal(claimResults.filter((result) => result.code === 0).length, 1);
  assert.equal(await prisma.babyMember.count({ where: { babyId: legacy[0].id, isAdmin: true } }), 1);
  await blocked('/family/claim', { ...momAuth, body: claim });
  await prisma.babyClaim.create({ data: { babyId: legacy[1].id, codeHash: hash(code), expiresAt: new Date(Date.now() - 1000) } });
  await blocked('/family/claim', { ...momAuth, body: { ...claim, babyId: legacy[1].id } });

  const challenge = await send('/auth/web/start', { method: 'POST' });
  assert.ok(challenge.cookie);
  const scene = { scene: challenge.data.scene };
  assert.equal((await okay('/auth/web/inspect', { ...momAuth, body: scene })).verificationCode, challenge.data.verificationCode);
  await okay('/auth/web/confirm', { ...momAuth, body: scene });
  assert.equal((await okay('/auth/web/exchange', { body: scene })).status, 'EXPIRED');
  const exchange = await send('/auth/web/exchange', { body: scene, cookie: challenge.cookie });
  assert.equal(exchange.data.status, 'APPROVED');
  assert.equal((await okay('/babies', { cookie: exchange.cookie }))[0].id, otherBaby.id);
  assert.equal((await okay('/auth/web/exchange', { body: scene, cookie: challenge.cookie })).status, 'EXPIRED');
  const pending = await send('/auth/web/start', { method: 'POST' });
  const pendingScene = { scene: pending.data.scene };
  await okay('/auth/web/cancel', { body: pendingScene, cookie: pending.cookie });
  await blocked('/auth/web/confirm', { ...momAuth, body: pendingScene });
  await okay('/auth/logout', { ...momAuth, method: 'POST' });
  assert.equal((await send('/babies', momAuth)).response.status, 401);
  console.log('PASS migration, three accounts, isolated data, creator attribution, approval/rejection/removal, protected avatar, claim contention, Web login and login replay');
}

main().catch((error) => {
  console.error(error);
  console.error(serverLog);
  process.exitCode = 1;
}).finally(async () => {
  server.kill();
  await prisma.$disconnect();
});
