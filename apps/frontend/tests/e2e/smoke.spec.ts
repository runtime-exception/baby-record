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
