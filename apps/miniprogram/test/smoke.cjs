const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { dirname, join } = require('node:path');
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
const { avatarCover, avatarCropSource, prepareAvatar } = require('../dist/lib/avatar.js');
const respond = (request, data, code = 0) => request.success({ statusCode: 200, data: { code, data } });

function templateWithIncludes(file) {
  return readFileSync(file, 'utf8').replace(/<include src="([^"]+)"\s*\/>/g, (_, include) =>
    templateWithIncludes(join(dirname(file), include)));
}

test('the native package registers all declared pages and their template events', () => {
  const manifest = require('../dist/app.json');
  assert.equal(manifest.lazyCodeLoading, 'requiredComponents');
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
    const template = templateWithIncludes(join(root, page + '.wxml'));
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

  const reload = babyContext(false);
  respond(requests.shift(), [{ id: 1, name: '示例' }, { id: 2, name: '二号' }]);
  assert.equal((await reload).baby.id, 2);
  const afterReload = api('/foods');
  assert.equal(requests[0].header['X-Baby-Id'], '2');
  respond(requests.shift(), []);
  assert.deepEqual(await afterReload, []);
});

test('missing backend routes are reported in Chinese', async () => {
  const pending = api('/babies/1', 'DELETE');
  const request = requests.shift();
  request.success({
    statusCode: 200,
    data: { code: 40004, message: 'Cannot DELETE /api/v1/babies/1' },
  });
  await assert.rejects(pending, /删除功能暂不可用/);
});

test('avatar cropping maps the visible viewport back to source pixels', () => {
  const viewport = 200;
  assert.deepEqual(avatarCover(1000, 1000, viewport), {
    displayWidth: 200,
    displayHeight: 200,
    left: 0,
    top: 0,
    maxOffsetX: 0,
    maxOffsetY: 0,
  });
  assert.deepEqual(
    avatarCropSource(1000, 1000, { viewport, offsetX: 0, offsetY: 0, scale: 1 }),
    { x: 0, y: 0, size: 1000 },
  );

  const landscape = { viewport, offsetX: 0, offsetY: 0, scale: 1 };
  assert.deepEqual(avatarCropSource(2000, 1000, landscape), { x: 500, y: 0, size: 1000 });
  assert.deepEqual(
    avatarCropSource(2000, 1000, { ...landscape, offsetX: 100 }),
    { x: 0, y: 0, size: 1000 },
  );

  const zoomed = { viewport, offsetX: 0, offsetY: 0, scale: 2 };
  assert.deepEqual(
    avatarCropSource(1000, 1000, zoomed),
    { x: 250, y: 250, size: 500 },
  );
});

test('avatar preparation exports the dragged and zoomed crop or reports failure', async (t) => {
  const originalWx = global.wx;
  t.after(() => { global.wx = originalWx; });
  const crop = { viewport: 200, offsetX: 100, offsetY: -50, scale: 2 };
  const original = 'original.jpg';
  const cropped = 'cropped.jpg';
  global.wx = {
    getImageInfo: ({ success }) => success({ path: original, width: 2000, height: 1000 }),
    createCanvasContext: () => ({
      drawImage: (...args) => assert.deepEqual(args, [original, 500, 375, 500, 500, 0, 0, 512, 512]),
      draw: (_reserve, callback) => callback(),
    }),
    canvasToTempFilePath: ({ success }) => success({ tempFilePath: cropped }),
  };
  assert.equal(await prepareAvatar(original, crop), cropped);

  global.wx.canvasToTempFilePath = ({ fail }) => fail({ errMsg: 'export failed' });
  await assert.rejects(prepareAvatar(original, crop), /头像裁剪失败/);

  global.wx.canvasToTempFilePath = ({ success }) => success({ tempFilePath: '' });
  await assert.rejects(prepareAvatar(original, crop), /头像裁剪失败/);
});

test('the profile keeps the card during photo selection and can save or cancel repeatedly', async (t) => {
  const profilePath = require.resolve('../dist/pages/profile/index.js');
  delete require.cache[profilePath];
  let profile;
  let picker;
  let uploads = 0;
  const originalPage = global.Page;
  global.Page = (definition) => { profile = definition; };
  t.after(() => { global.Page = originalPage; });
  require(profilePath);
  const baby = { id: 'avatar-sample', membership: { isAdmin: true } };
  selectBaby(baby.id);
  Object.assign(profile.data, { baby, avatar: 'existing.jpg' });
  profile.setData = (patch) => Object.assign(profile.data, patch);
  t.mock.method(profile, 'refresh', async () => assert.fail('opening the picker must not reload the profile'));
  const originalWx = global.wx;
  t.after(() => { global.wx = originalWx; });
  global.wx = {
    ...originalWx,
    chooseMedia: (options) => { picker = options; },
    getWindowInfo: () => ({ windowWidth: 390 }),
    setTabBarStyle: () => {},
    getImageInfo: ({ success }) => success({ path: 'picked.jpg', width: 800, height: 600 }),
    createCanvasContext: () => ({ drawImage: () => {}, draw: (_reserve, done) => done() }),
    canvasToTempFilePath: ({ success }) => success({ tempFilePath: 'cropped.jpg' }),
    uploadFile: ({ filePath, success }) => {
      uploads++;
      assert.equal(filePath, 'cropped.jpg');
      success({ data: JSON.stringify({ code: 0 }) });
    },
    showToast: () => {},
  };
  profile.chooseAvatar();
  profile.onHide();
  profile.onShow();
  assert.equal(profile.data.baby, baby);
  assert.equal(profile.data.avatar, 'existing.jpg');
  picker.fail({ errMsg: 'chooseMedia:fail cancel' });
  profile.chooseAvatar();
  profile.onHide();
  picker.fail({ errMsg: 'chooseMedia:fail cancel' });
  profile.onShow();
  assert.equal(profile.data.baby, baby);
  profile.chooseAvatar();
  profile.onHide();
  await picker.success({ tempFiles: [{ tempFilePath: 'picked.jpg' }] });
  profile.onShow();
  assert.equal(profile.data.avatarEditor.open, true);
  await profile.confirmAvatarEdit();
  assert.equal(profile.data.avatar, 'cropped.jpg');
  assert.equal(profile.data.avatarUploading, false);
  assert.equal(profile.data.avatarEditor.open, false);
  assert.equal(uploads, 1);

  for (const fail of [false, true]) {
    selectBaby(baby.id);
    Object.assign(profile.data, { baby, avatar: 'existing.jpg' });
    profile.chooseAvatar();
    await picker.success({ tempFiles: [{ tempFilePath: 'picked.jpg' }] });
    let finishUpload;
    const started = new Promise((resolve) => {
      global.wx.uploadFile = ({ success, fail: reject }) => {
        finishUpload = () => fail ? reject({ errMsg: 'upload failed' }) : success({ data: '{"code":0}' });
        resolve();
      };
    });
    const saving = profile.confirmAvatarEdit();
    await started;
    profile.onHide();
    selectBaby('second-baby');
    profile.refresh.mock.mockImplementation(async () => {
      profile.setData({ baby: { ...baby, id: 'second-baby' }, avatar: 'second.jpg' });
    });
    profile.onShow();
    assert.equal(profile.data.avatarEditor.open, false);
    const generation = profile.active;
    finishUpload();
    await saving;
    assert.equal(profile.active, generation);
    assert.equal(profile.data.avatar, 'second.jpg');
    assert.equal(profile.data.avatarUploading, false);
    assert.equal(profile.data.avatarEditor.open, false);
  }
});

test('new growth forms save only the entered measurement once, and history retains editable values', async (t) => {
  let definition;
  const original = global.Component;
  global.Component = (value) => { definition = value; };
  t.after(() => { global.Component = original; });
  require('../dist/components/record-form/index.js');
  const methods = definition.methods;
  const babyId = 'growth-sample';
  const lib = require('../dist/lib/api.js');
  selectBaby(babyId);
  t.mock.method(lib, 'babyContext', async () => ({ baby: { id: babyId } }));
  t.mock.method(lib, 'report', () => {});
  const originalWx = global.wx;
  global.wx = { ...originalWx, showToast: () => {} };
  t.after(() => { global.wx = originalWx; });
  const writes = [];
  t.mock.method(lib, 'api', async (path, method, payload) => {
    if (path === '/growths/1' && !method) return { babyId, height: 71, weight: 8, measureTime: '2026-01-10T00:00:00Z' };
    assert.ok(['PATCH', 'POST'].includes(method), 'unexpected request ' + path);
    writes.push({ path, payload });
  });
  function mount(entry, recordId = 0, embedded = false) {
    return { ...methods, data: { ...structuredClone(definition.data), entry, recordId, embedded },
      setData(patch) { Object.assign(this.data, patch); }, triggerEvent() {} };
  }
  for (const [metric, value] of [['height', '72'], ['weight', '8.2']]) {
    const form = mount(metric, 0, true);
    await form.initialize();
    assert.equal(form.data.ready, true);
    const before = writes.length;
    await form.submit();
    assert.equal(writes.length, before);
    form.field({ currentTarget: { dataset: { key: metric } }, detail: { value } });
    await form.submit();
    await form.submit();
    assert.equal(writes.length, before + 1);
    const payload = writes.at(-1).payload;
    assert.equal(payload[metric], Number(value));
    assert.equal(payload[metric === 'height' ? 'weight' : 'height'], undefined);
  }
  const edit = mount('growth', 1);
  await edit.initialize();
  assert.equal(edit.data.height, '71');
  assert.equal(edit.data.weight, '8');
  const other = mount('other');
  await other.initialize();
  assert.equal(other.data.kind, 'activity');
  assert.equal(other.data.other[other.data.otherIndex].event, '其他');
});
