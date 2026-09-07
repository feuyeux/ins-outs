import { expect, test } from '@playwright/test';

test('production build reloads and deals cards while completely offline', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name === 'webkit', 'WebKit reports an internal reload error when its network is toggled offline; Chromium covers the service-worker path.');
  test.skip(!process.env.TEST_PRODUCTION, 'Run against a production preview with TEST_PRODUCTION=1.');
  await page.goto('/');
  await expect(page.getByRole('button', { name: '开始游戏' })).toBeEnabled();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => new Promise<void>(resolve => {
    if (navigator.serviceWorker.controller) return resolve();
    navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
  })));
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: '开始游戏' }).click();
  await expect(page.locator('.your-hand .playing-card:not(.back)')).toHaveCount(2);
  expect(await page.locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
});
