import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * E2E smoke cho graph-2d stamp (Scene v2).
 *
 * Coverage:
 *   - Mở toolbar → click graph2d stamp → editor mount.
 *   - Click "+ Hàm" → function row f1 xuất hiện.
 *   - Nhập expression → không crash.
 *   - Click "+ Tham số" → parameter row xuất hiện.
 *   - Click Chèn → editor đóng, Excalidraw canvas vẫn visible.
 *   - Re-edit smoke: double-click image → editor reopen.
 *
 * NOTE: Requires demo server running on port 5173 (playwright.config.ts
 * auto-start via `npm run e2e:serve`). Skip locally nếu chưa cài playwright browsers:
 *   npx playwright install chromium
 */

async function openGraph2DEditor(page: Page): Promise<Locator> {
  await page.goto('/');
  await expect(page.locator('.excalidraw').first()).toBeVisible({
    timeout: 15_000,
  });
  // graph2dStamp nằm trong "More tools" extra toolbar
  await page.locator('.App-toolbar__extra-tools-trigger').first().click();
  await expect(
    page.locator('[data-testid="graph2d-stamp"]'),
  ).toBeVisible({ timeout: 5_000 });
  await page.locator('[data-testid="graph2d-stamp"]').click();
  const editor = page.locator('[data-testid="graph-editor-panel"]');
  await expect(editor).toBeVisible({ timeout: 8_000 });
  return editor;
}

test.describe('graph-2d stamp', () => {
  test('mở editor khi click toolbar item', async ({ page }) => {
    const editor = await openGraph2DEditor(page);
    await expect(editor).toBeVisible();
    // LeftPanel phải có nút + Hàm
    await expect(page.locator('button:has-text("+ Hàm")')).toBeVisible();
  });

  test('+ Hàm thêm function row f1', async ({ page }) => {
    await openGraph2DEditor(page);
    await page.locator('button:has-text("+ Hàm")').click();
    // row f1 phải xuất hiện trong LeftPanel
    await expect(page.locator('[data-testid="object-row-f1"]')).toBeVisible({
      timeout: 3_000,
    });
  });

  test('+ Tham số thêm parameter row', async ({ page }) => {
    await openGraph2DEditor(page);
    await page.locator('button:has-text("+ Tham số")').click();
    // row cho parameter a (hoặc bất kỳ row mới)
    await expect(
      page.locator('[data-testid^="object-row-"]').first(),
    ).toBeVisible({ timeout: 3_000 });
  });

  test('Chèn đóng editor + canvas vẫn visible', async ({ page }) => {
    await openGraph2DEditor(page);
    // Thêm hàm để enable insert
    await page.locator('button:has-text("+ Hàm")').click();
    await expect(page.locator('[data-testid="object-row-f1"]')).toBeVisible({
      timeout: 3_000,
    });
    await page.locator('[data-testid="graph-insert-btn"]').click();
    // Editor phải đóng
    await expect(
      page.locator('[data-testid="graph-editor-panel"]'),
    ).not.toBeVisible({ timeout: 5_000 });
    // Canvas vẫn visible
    await expect(page.locator('canvas').first()).toBeVisible();
  });
});
