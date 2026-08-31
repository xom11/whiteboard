import { test, expect, type Page } from '@playwright/test';

/**
 * Nền giấy kẻ dòng (tuỳ chọn, mặc định tắt).
 *
 * Vì sao phải đo trên trình duyệt thật: nền là một lớp CSS nằm SAU canvas
 * Excalidraw, chỉ nhìn thấy được khi `viewBackgroundColor` = 'transparent'
 * làm canvas trong suốt. jsdom không có layout lẫn pixel nên unit test
 * không chứng minh được điều quan trọng nhất — giáo viên có thật sự thấy
 * dòng kẻ hay không.
 *
 * Cách đếm: chụp một ô ở GIỮA bảng (tránh toolbar/panel) rồi decode ngược
 * bằng chính canvas của trang. Không thêm dependency giải mã PNG.
 */

/** Màu dòng kẻ trong `paperBackground.css` (#c7dcf5). */
const LINE_RGB = { r: 199, g: 220, b: 245 };

/** Ô mẫu giữa bảng: không dính toolbar trên, panel trái, footer dưới. */
const SAMPLE = { x: 420, y: 260, width: 360, height: 288 };

/** Khoảng cách dòng kẻ theo đơn vị scene — khớp PAPER_LINE_HEIGHT. */
const LINE_HEIGHT = 32;

async function waitForBoard(page: Page) {
  await expect(page.locator('.excalidraw').first()).toBeVisible({
    timeout: 20_000,
  });
  await page.waitForFunction(() => Boolean(window.__wbApi), null, {
    timeout: 20_000,
  });
}

/** Số pixel mang màu dòng kẻ trong ô mẫu. */
async function countLinePixels(page: Page): Promise<number> {
  const shot = await page.screenshot({ clip: SAMPLE });
  return page.evaluate(
    async ({ dataUrl, rgb }) => {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('decode failed'));
        img.src = dataUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let n = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (
          Math.abs(data[i] - rgb.r) < 14 &&
          Math.abs(data[i + 1] - rgb.g) < 14 &&
          Math.abs(data[i + 2] - rgb.b) < 14
        ) {
          n++;
        }
      }
      return n;
    },
    { dataUrl: `data:image/png;base64,${shot.toString('base64')}`, rgb: LINE_RGB },
  );
}

/**
 * Vị trí pha của hoa văn dòng kẻ trong ô mẫu, tính bằng px, trong [0, size).
 *
 * Đo bằng TRUNG BÌNH VÒNG (circular mean) trên độ đậm từng hàng pixel, không
 * bằng cách dò hàng đậm nhất: dòng kẻ 1px rơi vào toạ độ lẻ sẽ bị trình duyệt
 * tãi ra hai hàng, dò argmax thì nhảy ±1px và test rung. Trung bình vòng cho
 * kết quả dưới-pixel và tự xử lý ca dòng kẻ vắt qua mép ô mẫu (y=31 → y=0).
 *
 * Quan trọng: hàm này KHÔNG dùng công thức của `paperMetrics`. Nó chỉ đọc
 * pixel. Đó là toàn bộ lý do nó tồn tại — phép đo cũ ở chỗ này chép lại công
 * thức của bản cài đặt rồi so với chính nó nên không bao giờ đỏ được.
 */
async function linePhasePx(page: Page, size: number): Promise<number> {
  const shot = await page.screenshot({ clip: SAMPLE });
  return page.evaluate(
    async ({ dataUrl, period }) => {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('decode failed'));
        img.src = dataUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Độ đậm một hàng = tổng mức lệch khỏi nền trắng trên kênh đỏ.
      // Dòng kẻ #c7dcf5 lệch 56; pha trộn 50% vẫn còn 28, vẫn đo được.
      let sumSin = 0;
      let sumCos = 0;
      for (let y = 0; y < canvas.height; y++) {
        let weight = 0;
        for (let x = 0; x < canvas.width; x++) {
          weight += 255 - data[(y * canvas.width + x) * 4];
        }
        const angle = (2 * Math.PI * y) / period;
        sumSin += weight * Math.sin(angle);
        sumCos += weight * Math.cos(angle);
      }
      const theta = Math.atan2(sumSin, sumCos);
      return ((((theta / (2 * Math.PI)) * period) % period) + period) % period;
    },
    { dataUrl: `data:image/png;base64,${shot.toString('base64')}`, period: size },
  );
}

/** Chênh lệch hai pha trên vòng tròn chu kỳ `size` — luôn trong [0, size/2]. */
function phaseGap(a: number, b: number, size: number): number {
  const d = Math.abs(a - b) % size;
  return Math.min(d, size - d);
}

/**
 * Alpha của canvas static tại một điểm trống giữa bảng.
 * 255 = canvas tự sơn nền (không nhìn xuyên được), 0 = trong suốt.
 */
async function canvasAlphaAtCenter(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      'canvas.excalidraw__canvas.static',
    );
    if (!canvas) return -1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return -1;
    const { data } = ctx.getImageData(
      Math.floor(canvas.width / 2),
      Math.floor(canvas.height / 2),
      1,
      1,
    );
    return data[3];
  });
}

async function togglePaper(page: Page) {
  await page.locator('.dropdown-menu-button').first().click();
  await page.locator('[data-testid="wb-paper-toggle"]').click();
  // Đóng menu để nó không che ô mẫu.
  await page.keyboard.press('Escape');
}

async function readLayerStyle(page: Page) {
  return page.evaluate(() => {
    const layer = document.querySelector<HTMLElement>('.wb-paper-layer');
    if (!layer) return null;
    const cs = getComputedStyle(layer);
    const st = window.__wbApi.getAppState();
    return {
      backgroundSize: cs.backgroundSize,
      positionY: parseFloat(cs.backgroundPositionY),
      display: cs.display,
      scrollY: st.scrollY as number,
      zoom: st.zoom.value as number,
    };
  });
}

test.describe('Nền giấy kẻ dòng', () => {
  test('bật → canvas trong suốt và dòng kẻ hiện ra; tắt → trắng như cũ', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForBoard(page);

    // Mặc định: bảng trắng trơn, canvas tự sơn nền.
    expect(await countLinePixels(page)).toBeLessThan(50);
    expect(await canvasAlphaAtCenter(page)).toBe(255);
    await expect(page.locator('.wb-paper-layer')).toHaveCount(0);

    await togglePaper(page);

    // Rủi ro số 1 của thiết kế: canvas có chịu trong suốt không.
    await expect(page.locator('.wb-paper-layer')).toHaveCount(1);
    expect(await canvasAlphaAtCenter(page)).toBe(0);

    // Và dòng kẻ phải THẤY ĐƯỢC, không chỉ tồn tại trong DOM.
    // Ô mẫu cao 288px, cách dòng 32px ⇒ ~9 dòng × 360px.
    const lit = await countLinePixels(page);
    expect(lit).toBeGreaterThan(2000);

    await togglePaper(page);

    await expect(page.locator('.wb-paper-layer')).toHaveCount(0);
    expect(await canvasAlphaAtCenter(page)).toBe(255);
    expect(await countLinePixels(page)).toBeLessThan(50);
  });

  test('cuộn bảng thì dòng kẻ trôi CÙNG CHIỀU với nội dung', async ({ page }) => {
    await page.goto('/');
    await waitForBoard(page);
    await togglePaper(page);

    const before = await readLayerStyle(page);
    expect(before).not.toBeNull();
    const size = LINE_HEIGHT * before!.zoom;
    const phaseBefore = await linePhasePx(page, size);

    // Cuộn như giáo viên vẫn làm (wheel trên canvas), không bơm state.
    await page.mouse.move(600, 400);
    await page.mouse.wheel(0, 250);
    await page.waitForFunction(
      (prev) => window.__wbApi.getAppState().scrollY !== prev,
      before!.scrollY,
      { timeout: 5_000 },
    );

    const after = await readLayerStyle(page);
    expect(after!.scrollY).not.toBeCloseTo(before!.scrollY, 1);

    // Nội dung dịch đi (scrollY_sau − scrollY_trước) * zoom px trên màn hình.
    // Dòng kẻ là một phần của cùng hệ toạ độ scene nên phải dịch ĐÚNG BẰNG ẤY.
    // Lật dấu trong paperMetrics thì vế đo được sẽ ra dịch ngược lại và ca này đỏ.
    const contentShift = (after!.scrollY - before!.scrollY) * after!.zoom;
    const predicted = (((phaseBefore + contentShift) % size) + size) % size;
    const measured = await linePhasePx(page, size);

    expect(phaseGap(measured, predicted, size)).toBeLessThan(2);

    // Và vẫn hiện ra thật sau khi cuộn.
    expect(await countLinePixels(page)).toBeGreaterThan(2000);
  });

  test('zoom nhỏ hết cỡ thì tắt dòng kẻ thay vì bôi thành mảng xám', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForBoard(page);
    await togglePaper(page);

    await page.evaluate(() => {
      window.__wbApi.updateScene({
        appState: { zoom: { value: 0.15 } },
        captureUpdate: 'NEVER',
      });
    });
    await page.waitForFunction(
      () => window.__wbApi.getAppState().zoom.value < 0.3,
      null,
      { timeout: 5_000 },
    );

    const style = await readLayerStyle(page);
    expect(style!.display).toBe('none');
    expect(await countLinePixels(page)).toBeLessThan(50);
  });
});
