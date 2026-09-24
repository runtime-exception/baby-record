import { expect, test } from '@playwright/test';

test.describe('frontend smoke', () => {
  test('shows the login screen and does not overflow horizontally', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: '进入系统' })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
