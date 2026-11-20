const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const root = join(__dirname, '../dist');
const requests = [];
const navigation = [];
const storage = new Map();
global.wx = {
  getStorageSync: (key) => storage.get(key),
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: (key) => storage.delete(key),
  reLaunch: ({ url }) => navigation.push(url),
  login: ({ success }) => success({ code: 'wx-code' }),
  request: (options) => requests.push(options),
};
const { api, babyContext, login, selectBaby } = require('../dist/lib/api.js');
const respond = (request, data, code = 0) => request.success({ statusCode: 200, data: { code, data } });

test('the native package registers all declared pages and their template events', () => {
  const manifest = require('../dist/app.json');
  assert.deepEqual(manifest.tabBar.list.map((item) => item.text), ['首页', '记录', '统计', '我的']);
  for (const tab of manifest.tabBar.list) {
    assert.ok(existsSync(join(root, tab.iconPath)));
    assert.ok(existsSync(join(root, tab.selectedIconPath)));
  }
  for (const page of manifest.pages) {
    let registration;
    global.Page = (value) => { registration = value; };
    require(join(root, page + '.js'));
    assert.ok(registration, page);
    assert.ok(existsSync(join(root, page + '.json')), page);
    const template = readFileSync(join(root, page + '.wxml'), 'utf8');
    for (const event of template.matchAll(/\b(?:bind|catch)(?::)?[\w-]+="([\w]+)"/g)) {
      assert.equal(typeof registration[event[1]], 'function', page + ' ' + event[1]);
    }
  }
});

test('login stores the bearer session and switching babies discards earlier responses', async () => {
  assert.equal(await babyContext(), null);
  assert.equal(navigation.pop(), '/pages/login/index');
  const signedIn = login();
  await Promise.resolve();
  assert.equal(requests[0].url.endsWith('/auth/wechat'), true);
  assert.deepEqual(requests[0].data, { code: 'wx-code' });
  respond(requests.shift(), { token: 'fixture-session' });
  await signedIn;

  const load = babyContext(false);
  const membership = { id: 1, name: '示例' };
  assert.equal(requests[0].header.Authorization, 'Bearer fixture-session');
  respond(requests.shift(), [membership]);
  assert.equal((await load).baby.id, 1);

  const previous = api('/foods');
  assert.equal(requests[0].header['X-Baby-Id'], '1');
  selectBaby(2);
  const rejected = assert.rejects(previous, /页面已切换/);
  respond(requests.shift(), [{ name: '原宝宝的配置' }]);
  await rejected;
  const current = api('/foods');
  assert.equal(requests[0].header['X-Baby-Id'], '2');
  respond(requests.shift(), [{ name: '新宝宝的配置' }]);
  assert.deepEqual(await current, [{ name: '新宝宝的配置' }]);
});
