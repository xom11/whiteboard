import { test, expect, type Page } from '@playwright/test';

/**
 * E2E cho tangent rework + Toast (commits 4068bdf, 61e7671, ff0bd61).
 *
 * Flow chung:
 *   1. Mở "More tools" → click stamp-toolbar-geometry → editor panel mount.
 *   2. Tool circleCenter: click (0, 0) tâm + click (4, 0) rìa → circle r=4.
 *   3. Tool tangent: pick P (board coord) + pick rim → finalize 1 trong 3
 *      nhánh inside/on/outside.
 *
 * Click trên board dispatch PointerEvent trực tiếp lên SVG, dùng JXG Coords
 * API để map board → screen (account cho keepAspectRatio làm bbox stretch).
 *
 * JXG element types để count:
 *   - 'on' branch: `board.create('tangent', [glider])` → elType = 'tangent'
 *   - 'outside' branch (0|1): `board.create('line', [P, T])` → elType = 'line'
 *   Test count cả 2 (tangentLike = line ∪ tangent).
 */

interface Helpers {
  click: (boardX: number, boardY: number) => Promise<void>;
  pickTool: (key: string) => Promise<void>;
  countTangentLike: () => Promise<number>;
  getToastText: () => Promise<string | null>;
}

async function open2DEditor(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.excalidraw').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('.App-toolbar__extra-tools-trigger').first().click();
  await page.locator('[data-testid="stamp-toolbar-geometry"]').click();
  await expect(page.locator('[data-testid="geometry-editor-panel"]')).toBeVisible({ timeout: 10_000 });
  // Đợi JXG board mount (SVG xuất hiện trong container).
  await page.waitForFunction(
    () => !!document.querySelector('[data-testid="jxgmini-container"] svg'),
    { timeout: 10_000 },
  );
  await page.waitForTimeout(400);
}

function makeHelpers(page: Page): Helpers {
  return {
    click: async (boardX, boardY) => {
      await page.evaluate(
        ([bx, by]) => {
          const c = document.querySelector('[data-testid="jxgmini-container"]') as HTMLElement;
          const svg = c.querySelector('svg') as SVGSVGElement;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const board = (window as any).JXG.boards['jxgBoard1'];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const scr = new (window as any).JXG.Coords((window as any).JXG.COORDS_BY_USER, [bx, by], board);
          const box = c.getBoundingClientRect();
          const x = box.x + scr.scrCoords[1];
          const y = box.y + scr.scrCoords[2];
          for (const type of ['pointerdown', 'pointerup'] as const) {
            svg.dispatchEvent(new PointerEvent(type, {
              bubbles: true, cancelable: true,
              clientX: x, clientY: y, pointerType: 'mouse', button: 0,
              buttons: type === 'pointerdown' ? 1 : 0,
            }));
          }
        },
        [boardX, boardY],
      );
      await page.waitForTimeout(280);
    },
    pickTool: async (key) => {
      const btn = page.locator(`[data-tool="${key}"]`);
      await expect(btn).toBeVisible({ timeout: 3_000 });
      await btn.click();
      await expect(btn).toHaveAttribute('aria-pressed', 'true', { timeout: 2_000 });
      await page.waitForTimeout(200);
    },
    countTangentLike: async () => page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const board = (window as any).JXG.boards['jxgBoard1'];
      return Object.values(board.objects).filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (o: any) => o.elType === 'line' || o.elType === 'tangent',
      ).length;
    }),
    getToastText: async () => page.evaluate(() => {
      const t = document.querySelector('[role="status"]');
      return t ? t.textContent : null;
    }),
  };
}

async function buildCircleRadius4(h: Helpers): Promise<void> {
  await h.pickTool('circleCenter');
  await h.click(0, 0);
  await h.click(4, 0);
}

test.describe('Geometry 2D — Tangent to circle (3 cases)', () => {
  test('point INSIDE circle → toast appears + no new tangent line', async ({ page }) => {
    await open2DEditor(page);
    const h = makeHelpers(page);
    await buildCircleRadius4(h);

    await h.pickTool('tangent');
    const before = await h.countTangentLike();
    // pick #1: empty area inside (board 1, 0) → auto-create free point
    // pick #2: rim top (board 0, 4) → pick circle → finalize → 'inside'
    await h.click(1, 0);
    await h.click(0, 4);

    expect(await h.countTangentLike() - before).toBe(0);
    const toast = await h.getToastText();
    expect(toast).toMatch(/trong đường tròn/);
  });

  test('point OUTSIDE circle → 2 tangent lines created', async ({ page }) => {
    await open2DEditor(page);
    const h = makeHelpers(page);
    await buildCircleRadius4(h);

    await h.pickTool('tangent');
    const before = await h.countTangentLike();
    // pick #1: empty area outside (board 7, 0) → auto-create free point
    // pick #2: rim top → finalize → 'outside' → 2 ADDs branch 0|1
    await h.click(7, 0);
    await h.click(0, 4);

    expect(await h.countTangentLike() - before).toBe(2);
    expect(await h.getToastText()).toBeNull();
  });

  test('point ON circle (rim point B) → 1 tangent line created', async ({ page }) => {
    await open2DEditor(page);
    const h = makeHelpers(page);
    await buildCircleRadius4(h);

    await h.pickTool('tangent');
    const before = await h.countTangentLike();
    // pick #1: click rim point B tại (4, 0) → snap existing point
    // pick #2: rim left (-4, 0) → finalize → 'on' → 1 ADD branch='on'
    await h.click(4, 0);
    await h.click(-4, 0);

    expect(await h.countTangentLike() - before).toBe(1);
    expect(await h.getToastText()).toBeNull();
  });
});
