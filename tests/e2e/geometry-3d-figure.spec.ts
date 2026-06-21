import { test, expect } from '@playwright/test';

// Render-verify for the AI-generated 3D figure pipeline.
// Catches the plane3d-class render bugs that unit mocks miss (a misaligned/absent
// solid surfaces only in a real JSXGraph view3d). Mirrors the manual Playwright-MCP
// verification done during T17.
test('AI dựng hình: hình chóp render đúng trong editor 3D', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto('/');
  // toolbar ready
  await expect(page.locator('[data-testid="dropdown-menu-button"]').first()).toBeVisible({
    timeout: 15_000,
  });

  // open the 3D geometry stamp editor
  await page.locator('[data-testid="dropdown-menu-button"]').first().click();
  await page.locator('[data-testid="stamp-toolbar-geometry3d"]').click();
  await expect(page.locator('[data-testid="mini-board-3d"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => !!(window as { JXG?: unknown }).JXG, undefined, {
    timeout: 10_000,
  });

  // type a pyramid + midpoint problem and generate
  await page
    .locator('[data-testid="ai-generate-3d-input"]')
    .fill('Cho hình chóp S.ABCD có đáy ABCD là hình vuông. Gọi M là trung điểm của SC.');
  await page.locator('[data-testid="ai-generate-3d-btn"]').click();

  // wait for the pyramid faces (1 base + 4 lateral = 5 polygon3d) to populate the board
  await page.waitForFunction(
    () => {
      const JXG = (window as { JXG?: { boards?: Record<string, unknown> } }).JXG;
      if (!JXG?.boards) return false;
      for (const b of Object.values(JXG.boards) as Array<{ objects: Record<string, { elType?: string }> }>) {
        const polys = Object.values(b.objects).filter((o) => o.elType === 'polygon3d');
        if (polys.length >= 5) return true;
      }
      return false;
    },
    undefined,
    { timeout: 8_000 },
  );

  const counts = await page.evaluate(() => {
    const JXG = (window as { JXG: { boards: Record<string, unknown> } }).JXG;
    let best = { point3d: 0, polygon3d: 0 };
    for (const b of Object.values(JXG.boards) as Array<{ objects: Record<string, { elType?: string }> }>) {
      const objs = Object.values(b.objects);
      const c = {
        point3d: objs.filter((o) => o.elType === 'point3d').length,
        polygon3d: objs.filter((o) => o.elType === 'polygon3d').length,
      };
      if (c.polygon3d > best.polygon3d) best = c;
    }
    return best;
  });

  expect(counts.polygon3d).toBeGreaterThanOrEqual(5); // 1 base + 4 lateral faces
  expect(counts.point3d).toBeGreaterThanOrEqual(6); // A,B,C,D,S + M
  // the plane3d [point,dir1,dir2] bug class manifests as a thrown render error
  expect(errors.join('\n')).not.toMatch(/plane3d|Cannot read|undefined is not/i);
});
