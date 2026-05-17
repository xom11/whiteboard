import { test, expect } from '@playwright/test';

/**
 * Smoke tests cho whiteboard demo.
 *
 * Mục tiêu: harness chạy được, verify happy path mount Excalidraw + stamp
 * menu inject vào "More tools" popover.
 *
 * Stamp button test-ids (xem `src/stamps/*\/index.tsx`):
 *   - geometry-2d  → `stamp-toolbar-geometry`
 *   - latex        → `stamp-toolbar-latex`
 *   - geometry-3d  → `stamp-toolbar-geometry3d` (opt-in, không có trong DEFAULT_STAMPS)
 *   - graph-2d     → `stamp-toolbar-graph2d` (opt-in)
 */
test.describe('Whiteboard smoke', () => {
  test('renders Excalidraw canvas', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.excalidraw').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('opens "More tools" popover and shows stamp menu items', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('.excalidraw').first()).toBeVisible({
      timeout: 15_000,
    });

    // Click "More tools" trigger — Excalidraw 0.18 dùng class
    // `.App-toolbar__extra-tools-trigger` (xem ToolbarInjector.tsx).
    const trigger = page.locator('.App-toolbar__extra-tools-trigger').first();
    await expect(trigger).toBeVisible({ timeout: 10_000 });
    await trigger.click();

    // Popover container mount.
    await expect(
      page.locator(
        '.App-toolbar__extra-tools-dropdown .dropdown-menu-container',
      ),
    ).toBeVisible({ timeout: 5_000 });

    // Stamp menu items đã được inject (DEFAULT_STAMPS = geometry + latex).
    await expect(
      page.locator('[data-testid="stamp-toolbar-geometry"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="stamp-toolbar-latex"]'),
    ).toBeVisible();
  });

  // TODO(#15): mở editor panel sau khi click stamp item — selector cho
  // editor panel (geometry-2d/latex) chưa stable, tạm skip để giữ harness
  // xanh. Bổ sung khi có data-testid trên EditorPanel root.
  test.skip('opens geometry stamp editor panel', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.excalidraw').first()).toBeVisible({
      timeout: 15_000,
    });
    await page.locator('.App-toolbar__extra-tools-trigger').first().click();
    await page.locator('[data-testid="stamp-toolbar-geometry"]').click();
    // Editor panel selector TBD.
  });

  // TODO(#15): dark-mode toggle — Excalidraw MainMenu có shortcut hoặc
  // toggle, nhưng selector phụ thuộc bản 0.18 + custom MainMenu của
  // whiteboard. Bổ sung khi chốt UX.
  test.skip('dark mode toggle persists theme', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.excalidraw').first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
