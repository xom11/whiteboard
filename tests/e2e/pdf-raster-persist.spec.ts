import { test, expect, type Page } from '@playwright/test';

/**
 * Regression: trang PDF (image element raster) phải sống sót khi GV chuyển chế độ.
 *
 * Bug gốc: `Whiteboard` unmount → Excalidraw (class component) chạy
 * `componentWillUnmount` → `scene.destroy()` → `getSceneElements()` trả `[]`.
 * Cleanup useEffect của Whiteboard chạy SAU đó, `flushPrune()` đọc scene rỗng
 * → keep-set rỗng → `pruneFiles` xoá sạch raster của storageKey trong IndexedDB.
 * Quay lại bảng: element PDF còn (localStorage) nhưng binary file mất → ảnh trắng.
 *
 * Test chạy trên Excalidraw + IndexedDB thật, dùng chính
 * `insertRasterizedPagesIntoScene` của package (chỉ thay bước rasterize pdfjs
 * bằng 1 PNG đỏ đặc — không liên quan tới bug).
 */

const PDF_FILE_COLOR = { r: 220, g: 30, b: 30 };

declare global {
  interface Window {
    __wbApi: {
      getFiles: () => Record<string, unknown>;
      updateScene: (payload: unknown) => void;
    };
    __wbSetBoardMounted: (v: boolean) => void;
    __wbInsertPages: (
      pages: { pageNumber: number; dataURL: string; width: number; height: number; mimeType: string }[],
    ) => { fileIds: string[] };
  }
}

/** Đọc thẳng IndexedDB 'whiteboard-files' — phân biệt "bị xoá" với "chưa kịp ghi". */
async function idbFileIds(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const req = indexedDB.open('whiteboard-files');
        req.onerror = () => resolve([]);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('files')) return resolve([]);
          const keys = db.transaction('files', 'readonly').objectStore('files').getAllKeys();
          keys.onsuccess = () => resolve(keys.result as string[]);
          keys.onerror = () => resolve([]);
        };
      }),
  );
}

async function waitForBoard(page: Page) {
  await expect(page.locator('.excalidraw').first()).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => Boolean(window.__wbApi), null, { timeout: 20_000 });
}

/** Đếm pixel đỏ trên canvas static → "GV có thực sự nhìn thấy trang PDF không". */
async function countPdfPixels(page: Page): Promise<number> {
  return page.evaluate(({ r, g, b }) => {
    let n = 0;
    for (const c of Array.from(document.querySelectorAll('canvas.excalidraw__canvas.static'))) {
      const canvas = c as HTMLCanvasElement;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx || canvas.width === 0) continue;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < data.length; i += 4) {
        if (
          Math.abs(data[i] - r) < 40 &&
          Math.abs(data[i + 1] - g) < 40 &&
          Math.abs(data[i + 2] - b) < 40 &&
          data[i + 3] > 200
        ) {
          n++;
        }
      }
    }
    return n;
  }, PDF_FILE_COLOR);
}

/** Chèn 1 "trang PDF" qua đúng code path của package. */
async function insertFakePdfPage(page: Page): Promise<string> {
  return page.evaluate(({ r, g, b }) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, 400, 400);
    const { fileIds } = window.__wbInsertPages([
      {
        pageNumber: 1,
        dataURL: canvas.toDataURL('image/png'),
        width: 400,
        height: 400,
        mimeType: 'image/png',
      },
    ]);
    return fileIds[0];
  }, PDF_FILE_COLOR);
}

test.describe('PDF raster survives mode switch', () => {
  test('trang PDF đã persist, GV vẽ tiếp rồi chuyển chế độ → quay lại vẫn thấy', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForBoard(page);

    const fileId = await insertFakePdfPage(page);
    await expect.poll(() => countPdfPixels(page), { timeout: 15_000 }).toBeGreaterThan(1000);

    // Chờ file-throttle (1s) ghi raster xuống IndexedDB.
    await page.waitForTimeout(1500);
    expect(await idbFileIds(page)).toContain(fileId);

    // GV chạm vào bảng ngay trước khi chuyển chế độ → onChange đặt lại prune-throttle
    // (2s). Đây là điều kiện kích hoạt bug: prune còn pending lúc unmount.
    await page.evaluate(() => window.__wbApi.updateScene({ appState: {} }));
    await page.waitForTimeout(150);

    // GV chuyển sang chia sẻ màn hình / gọi HS lên bảng → Whiteboard unmount.
    await page.evaluate(() => window.__wbSetBoardMounted(false));
    await expect(page.getByTestId('other-mode')).toBeVisible();

    // IndexedDB không được bị prune xoá sạch khi unmount.
    expect(await idbFileIds(page)).toContain(fileId);

    // GV quay lại bảng trắng.
    await page.evaluate(() => window.__wbSetBoardMounted(true));
    await waitForBoard(page);

    // Binary file phải được nạp lại từ IndexedDB...
    await page.waitForFunction(
      (id) => Object.keys(window.__wbApi.getFiles() ?? {}).includes(id),
      fileId,
      { timeout: 15_000 },
    );
    // ...và trang PDF phải hiện ra trên canvas.
    await expect.poll(() => countPdfPixels(page), { timeout: 15_000 }).toBeGreaterThan(1000);
  });

  test('unmount ngay sau khi import (throttle chưa chạy) vẫn giữ trang PDF', async ({ page }) => {
    await page.goto('/');
    await waitForBoard(page);

    const fileId = await insertFakePdfPage(page);
    await expect.poll(() => countPdfPixels(page), { timeout: 15_000 }).toBeGreaterThan(1000);

    // Không chờ throttle: unmount cleanup phải flush file TRƯỚC khi prune.
    await page.evaluate(() => window.__wbSetBoardMounted(false));
    await expect(page.getByTestId('other-mode')).toBeVisible();

    await page.evaluate(() => window.__wbSetBoardMounted(true));
    await waitForBoard(page);

    await page.waitForFunction(
      (id) => Object.keys(window.__wbApi.getFiles() ?? {}).includes(id),
      fileId,
      { timeout: 15_000 },
    );
    await expect.poll(() => countPdfPixels(page), { timeout: 15_000 }).toBeGreaterThan(1000);
  });
});
