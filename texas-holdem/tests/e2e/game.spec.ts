import { expect, test } from "@playwright/test";

test("desktop table plays and all utility views work", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "开始游戏" })).toBeEnabled();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: "test-results/desktop-ready.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("button", { name: "3×" }).click();
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await page.getByRole("button", { name: "开始游戏" }).click();
  await expect(page.locator(".your-hand .playing-card:not(.back)")).toHaveCount(
    2,
  );
  await page.waitForTimeout(800);
  await page.screenshot({
    path: "test-results/desktop-playing.png",
    fullPage: true,
  });
  for (let i = 0; i < 70; i++) {
    if (
      await page
        .getByRole("button", { name: "下一手", exact: true })
        .isVisible()
    )
      break;
    const call = page.locator(".call-button");
    if (await call.isEnabled()) await call.click();
    await page.waitForTimeout(500);
  }
  await expect(
    page.getByRole("button", { name: "下一手", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/desktop-result.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "牌局记录", exact: true }).click();
  await expect(page.locator(".history-item")).toHaveCount(1);
  await page.locator(".history-item>button").click();
  await expect(page.locator(".history-detail")).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "牌型与规则" }).click();
  await expect(page.locator(".hand-ranks>div")).toHaveCount(10);
  expect(errors).toEqual([]);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 360, height: 800 },
  { width: 844, height: 390 },
]) {
  test(`responsive layout ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("button", { name: "开始游戏" })).toBeEnabled();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: `test-results/mobile-${viewport.width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const images = await page
      .locator("img")
      .evaluateAll((imgs) =>
        imgs.every((img) => (img as HTMLImageElement).naturalWidth > 0),
      );
    expect(images).toBe(true);
    await page.getByRole("button", { name: "开始游戏" }).click();
    await expect(
      page.locator(".your-hand .playing-card:not(.back)"),
    ).toHaveCount(2);
    await page.waitForTimeout(800);
    await page.screenshot({
      path: `test-results/mobile-playing-${viewport.width}.png`,
      fullPage: true,
    });
  });
}
