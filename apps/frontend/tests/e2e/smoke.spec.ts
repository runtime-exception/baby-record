import { expect, test } from '@playwright/test';

test('uses WeChat code, keeps the mobile layout in view, and reaches onboarding', async ({ page }) => {
  const response = (data: unknown) => ({ json: { code: 0, message: 'success', data } });
  const qrCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/gV8AAAAASUVORK5CYII=';
  await page.route('**/api/v1/auth/status', (route) => route.fulfill(response({ authenticated: false })));
  await page.route('**/api/v1/auth/web/start', (route) => route.fulfill(response({
    scene: '0123456789abcdef0123456789abcdef', qrCode, verificationCode: '376519', expiresIn: 120,
  })));
  await page.route('**/api/v1/auth/web/exchange', (route) => route.fulfill(response({ status: 'APPROVED', accountId: 123 })));
  await page.route('**/api/v1/babies', (route) => route.fulfill(response([])));

  await page.goto('/');
  await expect(page.getByRole('button', { name: '获取登录二维码' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: '获取登录二维码' }).click();
  await expect(page.getByText('确认码 376519')).toBeVisible();
  await expect(page.getByRole('link', { name: '添加宝宝' })).toBeVisible();
  await expect(page.getByRole('link', { name: '绑定已有宝宝' })).toBeVisible();
});

test('retries a failed first load and requires separate confirmation for growth measurements', async ({ page }) => {
  const response = (data: unknown) => ({ json: { code: 0, data } });
  const baby = {
    id: '0000000000000001', name: '测试宝宝', age: { monthAgeText: '6个月0天' },
    membership: { role: 'DAD', creatorId: 1, name: '爸爸', isAdmin: true },
  };
  let failBabyLoad = true;
  const submissions: unknown[] = [];
  await page.route('**/api/v1/auth/status', (route) => route.fulfill(response({ authenticated: true })));
  await page.route('**/api/v1/babies', (route) => failBabyLoad
    ? route.fulfill({ status: 503, json: { message: '服务暂不可用' } })
    : route.fulfill(response([baby])));
  await page.route('**/api/v1/supplement-configs*', (route) => route.fulfill(response([])));
  await page.route('**/api/v1/growths/latest?*', (route) => route.fulfill(response({ height: null, weight: 8 })));
  await page.route('**/api/v1/growths', (route) => {
    submissions.push(route.request().postDataJSON());
    return route.fulfill(response({ id: 1 }));
  });
  await page.route('**/api/v1/dashboard?*', (route) => route.fulfill({ status: 503, json: {} }));

  await page.goto('/record/activity');
  await expect(page.getByRole('heading', { name: '宝宝档案加载失败' })).toBeVisible();
  failBabyLoad = false;
  await page.getByRole('button', { name: '重新加载' }).click();
  await page.getByRole('button', { name: '⚖️ 体重', exact: true }).click();
  await page.getByRole('button', { name: '确认当前体重' }).click();
  await page.getByRole('button', { name: '📏 身高', exact: true }).click();
  await expect(page.getByRole('button', { name: '保存记录' })).toBeDisabled();
  expect(submissions).toHaveLength(0);
  await page.getByRole('button', { name: '确认当前身高' }).click();
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect.poll(() => submissions).toEqual([expect.objectContaining({ height: 50 })]);
  await expect(page).toHaveURL(/\/$/);
});

test('renders statistics with the updated chart dependencies', async ({ page }) => {
  const response = (data: unknown) => ({ json: { code: 0, data } });
  const baby = { id: '0000000000000001', membership: { role: 'DAD', creatorId: 1 }, name: '测试宝宝' };
  const failures: string[] = [];
  let failCharts = true;
  page.on('pageerror', (error) => failures.push(error.message));
  await page.route('**/api/v1/auth/status', (route) => route.fulfill(response({ authenticated: true })));
  await page.route('**/api/v1/babies', (route) => route.fulfill(response([baby])));
  await page.route('**/api/v1/growths/trend?*', (route) => {
    const metric = new URL(route.request().url()).searchParams.get('metric');
    return route.fulfill(response({
      metric, unit: metric === 'weight' ? 'kg' : 'cm', xAxis: [], actual: [], low: [], high: [],
      points: [], latest: null, sourceUrl: '',
    }));
  });
  await page.route('**/api/v1/statistics/supplement?*', (route) => route.fulfill(response({ count: 0, typeStats: [] })));
  await page.route('**/api/v1/charts/**', (route) => failCharts
    ? route.fulfill({ status: 503, json: {} }) : route.fulfill(response({
    xAxis: ['2026-01-10', '2026-01-11'],
    series: [{ name: '记录', data: [120, 360] }],
  })));
  await page.goto('/statistics');
  await expect(page.getByText('暂无身高记录', { exact: false })).toBeVisible();
  const retry = page.getByRole('button', { name: '统计加载失败，点击重试' });
  await expect(retry).toBeVisible();
  failCharts = false;
  await retry.click();
  await expect(page.locator('canvas').first()).toBeVisible();
  expect(failures).toEqual([]);
});

for (const kind of ['temperature', 'food-allergy'] as const) {
  test(`${kind} returns after saving even when the dashboard fails`, async ({ page }) => {
    const response = (data: unknown) => ({ json: { code: 0, data } });
    const baby = { id: '0000000000000001', name: '测试宝宝', age: { monthAgeText: '6个月' },
      membership: { role: 'DAD', creatorId: 1, name: '爸爸', isAdmin: true } };
    await page.route('**/api/v1/auth/status', (route) => route.fulfill(response({ authenticated: true })));
    await page.route('**/api/v1/babies', (route) => route.fulfill(response([baby])));
    await page.route('**/api/v1/dashboard?*', (route) => route.fulfill({ status: 503, json: {} }));
    await page.route('**/api/v1/temperatures/latest?*', (route) => route.fulfill(response(null)));
    await page.route('**/api/v1/foods?*', (route) => route.fulfill(response([{ id: 9, name: '米粉' }])));
    const submissions: unknown[] = [];
    await page.route('**/api/v1/' + (kind === 'temperature' ? 'temperatures' : 'food-allergies'), (route) => {
      submissions.push(route.request().postDataJSON());
      return route.fulfill(response({ id: 1 }));
    });
    await page.goto('/record/' + kind);
    if (kind === 'food-allergy') {
      await page.getByRole('button', { name: '请选择本次排敏的辅食' }).click();
      await page.getByRole('button', { name: '米粉' }).click();
      await page.getByRole('button', { name: '可能过敏', exact: true }).click();
    } else {
      await page.getByRole('combobox').first().selectOption('37');
    }
    await page.getByRole('button', { name: kind === 'temperature' ? '保存体温记录' : '保存排敏记录' }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(submissions).toEqual([expect.objectContaining(kind === 'temperature' ? { temperature: 37.5 } : { foodId: 9 })]);
  });
}
