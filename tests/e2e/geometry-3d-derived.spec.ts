import { test, expect, type Page } from '@playwright/test';

/**
 * E2E gate cho ĐƯỜNG/MẶT PHÁI SINH 3D (construction-variant, v1.5).
 *
 * Kiến trúc đường phái sinh render bằng JSXGraph `line3d` với 2 đầu mút là HÀM
 * trả toạ độ tính (đọc State sống) + `needsRegularUpdate` → live-update khi điểm
 * gốc đổi mỗi frame kéo (gotcha recreate-mỗi-frame). Giả định LOAD-BEARING:
 * JSXGraph `view.create('line3d', [() => [x,y,z], () => [x,y,z]])` chấp nhận
 * điểm-HÀM và re-eval qua `board.update()`.
 *
 * Spec này verify giả định đó trên JSXGraph THẬT (không mock) — guard khi nâng
 * cấp jsxgraph. (Logic dispatch của renderer + toán giao tuyến verify ở unit:
 * JxgRenderer3D.derivedLine.test.ts + construction3d-math.test.ts.)
 *
 * KHÔNG drive tool tạo 2 mặt phẳng qua click (3D pick math flaky — xem
 * geometry-3d.spec.ts) → probe khả năng JSXGraph trực tiếp trên view3d thật.
 */

async function open3DEditor(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.excalidraw').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('.App-toolbar__extra-tools-trigger').first().click();
  await expect(page.locator('[data-testid="stamp-toolbar-geometry3d"]')).toBeVisible({ timeout: 5_000 });
  await page.locator('[data-testid="stamp-toolbar-geometry3d"]').click();
  await expect(page.locator('[data-testid="editor-panel-3d"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => !!(window as unknown as { JXG?: unknown }).JXG, undefined, { timeout: 10_000 });
}

test.describe('Geometry 3D — đường phái sinh (function-coord line3d)', () => {
  test('JSXGraph line3d nhận điểm-hàm + live-update qua board.update()', async ({ page }) => {
    await open3DEditor(page);

    const result = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const JXG = (window as any).JXG;
      if (!JXG) return { error: 'no window.JXG' };
      const div = document.createElement('div');
      div.id = 'probe3d-derived';
      div.style.cssText = 'width:300px;height:300px;position:absolute;left:-9999px;top:0;';
      document.body.appendChild(div);
      try {
        const board = JXG.JSXGraph.initBoard('probe3d-derived', {
          boundingbox: [-8, 8, 8, -8], showCopyright: false, showNavigation: false, axis: false,
        });
        const view = board.create('view3d', [[-6, -3], [8, 8], [[-5, 5], [-5, 5], [-5, 5]]], {});
        let zEnd = 0;
        const line = view.create('line3d', [() => [0, 0, 0], () => [2, 0, zEnd]], {
          needsRegularUpdate: true, straightFirst: true, straightLast: true,
        });
        const readEnd = (): number[] | null => {
          const p = line.point2;
          if (!p) return null;
          if (typeof p.X === 'function') return [p.X(), p.Y(), p.Z()];
          if (p.coords && p.coords.usrCoords) return Array.from(p.coords.usrCoords).slice(1) as number[];
          return null;
        };
        const before = readEnd();
        zEnd = 4;
        board.update();
        const after = readEnd();
        return { created: !!line, point2Exists: !!line.point2, before, after };
      } catch (e) {
        return { error: String((e as Error)?.message ?? e) };
      } finally {
        div.remove();
      }
    });

    expect(result.error).toBeUndefined();
    expect(result.created).toBe(true);
    expect(result.point2Exists).toBe(true);
    // Đầu mút hàm đọc đúng giá trị ban đầu…
    expect(result.before?.[2]).toBeCloseTo(0, 6);
    // …và LIVE-UPDATE sau board.update() khi biến nền đổi (z: 0 → 4).
    expect(result.after?.[2]).toBeCloseTo(4, 6);
  });
});
