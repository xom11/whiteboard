import { test, expect, type Page } from '@playwright/test';

/**
 * E2E cho tính năng KÉO NHÃN độc lập với điểm (draggable labels).
 *
 * Verify round-trip thật trong JSXGraph runtime (không mock):
 *   1. Tạo 1 điểm tự do (tool 'point') → có nhãn.
 *   2. Mô phỏng kéo nhãn bằng chính `setPositionDirectly(COORDS_BY_SCREEN, …)`
 *      của JXG (đúng code path khi user kéo) → cập nhật relativeCoords.
 *   3. Fire event 'up' trên nhãn → listener attachLabelDragSync chạy → dispatch
 *      UPDATE_ATTRS { labelOffset } → update-hook áp offset + zero relativeCoords.
 *   4. Assert: (a) offset attribute = offset-tổng đúng dấu; (b) vị trí nhãn
 *      KHÔNG nhảy (X/Y user-coords bất biến qua 'up'); (c) chuột phải reset.
 *
 * Đây là bài test then chốt cho rủi ro "quy ước dấu offset" trong spec.
 */

async function open2DEditor(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.excalidraw').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('.App-toolbar__extra-tools-trigger').first().click();
  await page.locator('[data-testid="stamp-toolbar-geometry"]').click();
  await expect(page.locator('[data-testid="geometry-editor-panel"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(
    () => !!document.querySelector('[data-testid="jxgmini-container"] svg'),
    { timeout: 10_000 },
  );
  await page.waitForTimeout(400);
}

async function clickBoard(page: Page, boardX: number, boardY: number): Promise<void> {
  await page.evaluate(
    ([bx, by]) => {
      const c = document.querySelector('[data-testid="jxgmini-container"]') as HTMLElement;
      const svg = c.querySelector('svg') as SVGSVGElement;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const JXG = (window as any).JXG;
      const board = JXG.boards['jxgBoard1'];
      const scr = new JXG.Coords(JXG.COORDS_BY_USER, [bx, by], board);
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
}

async function pickTool(page: Page, key: string): Promise<void> {
  const btn = page.locator(`[data-tool="${key}"]`);
  await expect(btn).toBeVisible({ timeout: 3_000 });
  await btn.click();
  await page.waitForTimeout(150);
}

/** Tìm điểm tự do có nhãn đầu tiên trên board, trả id JXG. */
async function firstLabeledPointId(page: Page): Promise<string> {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const board = (window as any).JXG.boards['jxgBoard1'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pt = Object.values(board.objects).find((o: any) =>
      o.elType === 'point' && o.label && o.label.visProp && o.label.evalVisProp('islabel'),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (pt as any)?.id ?? '';
  });
}

test.describe('Geometry 2D — kéo nhãn điểm', () => {
  test('kéo nhãn → offset persist đúng dấu + nhãn không nhảy', async ({ page }) => {
    await open2DEditor(page);
    await pickTool(page, 'point');
    await clickBoard(page, 0, 0);

    const id = await firstLabeledPointId(page);
    expect(id).not.toBe('');

    const result = await page.evaluate((pointId) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const JXG = (window as any).JXG;
      const board = JXG.boards['jxgBoard1'];
      const pt = board.objects[pointId];
      const label = pt.label;

      const offBefore = label.evalVisProp('offset').slice(0, 2);

      // Mô phỏng kéo nhãn +40px phải, +20px xuống (screen) — đúng path drag.
      const sc = label.coords.scrCoords;
      label.setPositionDirectly(JXG.COORDS_BY_SCREEN, [sc[1] + 40, sc[2] + 20]);
      board.update();
      // Vị trí NGAY SAU kéo (trước 'up') — mốc để kiểm tra "không nhảy".
      const xMid = label.X();
      const yMid = label.Y();

      // Thả nhãn → listener attachLabelDragSync chạy (dispatch + update-hook).
      label.triggerEventHandlers(['up'], [{}]);

      const offAfter = label.evalVisProp('offset').slice(0, 2);
      const rel = label.relativeCoords.scrCoords.slice(0, 3);
      return {
        offBefore,
        offAfter,
        rel,
        xMid, yMid,
        xAfter: label.X(), yAfter: label.Y(),
      };
    }, id);

    // (a) offset-tổng đúng dấu: x +40, y -20 (screen-y xuống ↔ offset-y lên).
    expect(result.offAfter[0]).toBeCloseTo(result.offBefore[0] + 40, 0);
    expect(result.offAfter[1]).toBeCloseTo(result.offBefore[1] - 20, 0);
    // relativeCoords đã zero (gộp vào offset) → không double-count.
    expect(result.rel[1]).toBeCloseTo(0, 1);
    expect(result.rel[2]).toBeCloseTo(0, 1);
    // (b) nhãn KHÔNG nhảy khi 'up' chuẩn hoá offset: vị trí trước/sau 'up' bằng nhau.
    expect(result.xAfter).toBeCloseTo(result.xMid, 1);
    expect(result.yAfter).toBeCloseTo(result.yMid, 1);
  });

  test('chuột phải nhãn → reset về default', async ({ page }) => {
    await open2DEditor(page);
    await pickTool(page, 'point');
    await clickBoard(page, 0, 0);
    const id = await firstLabeledPointId(page);
    expect(id).not.toBe('');

    const offAfterReset = await page.evaluate((pointId) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const JXG = (window as any).JXG;
      const board = JXG.boards['jxgBoard1'];
      const pt = board.objects[pointId];
      const label = pt.label;

      // Kéo lệch trước.
      const sc = label.coords.scrCoords;
      label.setPositionDirectly(JXG.COORDS_BY_SCREEN, [sc[1] + 60, sc[2] + 60]);
      board.update();
      label.triggerEventHandlers(['up'], [{}]);

      // Chuột phải lên nhãn → reset (labelOffset undefined → default [10,10]).
      label.rendNode.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

      return board.objects[pointId].label.evalVisProp('offset').slice(0, 2);
    }, id);

    expect(offAfterReset[0]).toBeCloseTo(10, 0);
    expect(offAfterReset[1]).toBeCloseTo(10, 0);
  });
});
