import { test, expect } from '@playwright/test';

/**
 * Thanh trượt độ dày nét — thay hàng 3 nút thin/bold/extraBold của Excalidraw.
 *
 * Vì sao phải e2e chứ không chỉ jsdom:
 *
 * 1. **Coupling với DOM nội bộ Excalidraw** (`[data-testid="strokeWidth-thin"]`
 *    làm neo, `.buttonList` bị CSS ẩn). Unit test dựng DOM giả nên nó chỉ chứng
 *    minh code khớp với DOM MÌNH TỰ VIẾT RA. Bump 0.19 đổi cấu trúc panel →
 *    chỉ file này bắt được.
 * 2. **Câu hỏi trung tâm của tính năng là "nét có MẢNH THẬT không"** — mà điều
 *    đó chỉ đo được bằng pixel trên canvas thật. Excalidraw nhân
 *    `strokeWidth * 4.25` cho bút tay; nếu ở đâu đó có kẹp giá trị về min 1 thì
 *    mọi unit test vẫn xanh còn GV vẫn thấy nét đậm y như cũ.
 *
 * Dùng `canvas.interactive` (KHÔNG phải `.excalidraw canvas` trần) — canvas
 * `static` nằm dưới nên click bị coi là intercepted, xem ghi chú dài trong
 * `props-panel-collapse.spec.ts`.
 */

const SLIDER = '[data-testid="wb-stroke-width-slider"]';

/** Chọn công cụ bút tay rồi mở panel thuộc tính. */
async function pickFreedraw(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.locator('.excalidraw').first()).toBeVisible({ timeout: 15_000 });
  await page
    .locator('.excalidraw canvas.interactive')
    .first()
    .click({ position: { x: 400, y: 300 } });
  // `x` = freedraw trong Excalidraw 0.18.
  await page.keyboard.press('x');
  await expect(page.locator('.App-menu__left')).toBeVisible({ timeout: 10_000 });
}

/** Đặt giá trị slider rồi bắn `input` như React mong đợi. */
async function setSlider(page: import('@playwright/test').Page, value: string) {
  await page.locator(SLIDER).evaluate((el, v) => {
    const input = el as HTMLInputElement;
    // Qua setter NGUYÊN BẢN để vượt value-tracker của React (gán thẳng
    // `input.value` sẽ cập nhật tracker và onChange KHÔNG bắn).
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )!.set!;
    setter.call(input, v);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

/**
 * Vẽ một nét ngang rồi đếm pixel không-nền trên dải đó.
 *
 * Đếm pixel là phép đo ĐỘC LẬP với công thức của mình (bài học từ
 * `paper-background.spec.ts`: test cũ chép lại chính công thức sai rồi so với
 * nó nên không bao giờ đỏ được).
 */
async function drawAndCountInk(page: import('@playwright/test').Page, y: number) {
  await page.mouse.move(250, y);
  await page.mouse.down();
  await page.mouse.move(650, y, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(120);

  return page.evaluate(
    ({ yy }) => {
      const canvas = document.querySelector<HTMLCanvasElement>(
        '.excalidraw canvas.static',
      )!;
      const ctx = canvas.getContext('2d')!;
      const dpr = canvas.width / canvas.getBoundingClientRect().width;
      const rect = canvas.getBoundingClientRect();
      // Cắt một dải quanh nét vừa vẽ, quy đổi từ toạ độ CSS sang pixel canvas.
      const sx = Math.round((300 - rect.left) * dpr);
      const sy = Math.round((yy - 30 - rect.top) * dpr);
      const w = Math.round(300 * dpr);
      const h = Math.round(60 * dpr);
      const { data } = ctx.getImageData(sx, sy, w, h);
      let ink = 0;
      for (let i = 0; i < data.length; i += 4) {
        // Nền bảng là trắng; mọi pixel tối hơn hẳn là mực.
        if (data[i + 3] > 10 && data[i] < 200) ink++;
      }
      return ink;
    },
    { yy: y },
  );
}

test.describe('Thanh trượt độ dày nét', () => {
  test('slider thay hàng 3 nút gốc trong panel thuộc tính', async ({ page }) => {
    await pickFreedraw(page);

    const slider = page.locator(SLIDER);
    await expect(slider).toBeVisible();

    // Neo đúng fieldset độ dày nét, và hàng nút gốc bị ẩn (vẫn còn trong DOM —
    // React sở hữu nó, ta chỉ giấu bằng CSS).
    const info = await page.evaluate(() => {
      const anchor = document.querySelector('[data-testid="strokeWidth-thin"]');
      const fieldset = anchor?.closest('fieldset');
      const buttonList = fieldset?.querySelector('.buttonList');
      return {
        sliderInSameFieldset: !!fieldset?.querySelector(
          '[data-testid="wb-stroke-width-slider"]',
        ),
        buttonListExists: !!buttonList,
        buttonListVisible: buttonList
          ? getComputedStyle(buttonList).display !== 'none'
          : null,
      };
    });
    expect(info.sliderInSameFieldset).toBe(true);
    expect(info.buttonListExists).toBe(true);
    expect(info.buttonListVisible).toBe(false);
  });

  test('dải trượt xuống dưới mức "thin" cũ của Excalidraw', async ({ page }) => {
    await pickFreedraw(page);
    const slider = page.locator(SLIDER);
    // Lý do tồn tại của tính năng: min phải NHỎ HƠN 1 (thin cũ).
    expect(Number(await slider.getAttribute('min'))).toBeLessThan(1);
    expect(Number(await slider.getAttribute('max'))).toBe(4);
  });

  test('nét vẽ ra MẢNH THẬT khi kéo xuống dưới mức thin', async ({ page }) => {
    await pickFreedraw(page);

    // Mức "thin" cũ của Excalidraw.
    await setSlider(page, '1');
    const inkThin = await drawAndCountInk(page, 220);

    // Mảnh nhất của thang mới.
    await page.keyboard.press('x');
    await setSlider(page, '0.25');
    const inkThinner = await drawAndCountInk(page, 420);

    // Gate: nếu nét "thin" không để lại mực thì phép đo hỏng, không phải
    // tính năng đúng.
    expect(inkThin).toBeGreaterThan(200);
    // Nét mảnh nhất phải ít mực hơn HẲN — 0.25 vs 1 là 1/4 bề rộng.
    expect(inkThinner).toBeLessThan(inkThin * 0.6);
  });

  test('nhớ độ dày nét qua lần tải lại trang', async ({ page }) => {
    await pickFreedraw(page);
    await setSlider(page, '0.5');
    await expect(page.locator('.wb-stroke-width-bubble')).toHaveText('0.5');

    // Vẽ 1 nét để scene được persist (useScenePersist ghi theo onChange).
    await page.mouse.move(300, 500);
    await page.mouse.down();
    await page.mouse.move(500, 500, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(1200);

    await page.reload();
    await expect(page.locator('.excalidraw').first()).toBeVisible({ timeout: 15_000 });
    // Click canvas trước khi gõ phím: sau reload chưa có focus nên `x` rơi vào
    // document chứ không tới Excalidraw, panel sẽ không bao giờ hiện.
    await page
      .locator('.excalidraw canvas.interactive')
      .first()
      .click({ position: { x: 400, y: 200 } });
    await page.keyboard.press('x');
    await expect(page.locator('.App-menu__left')).toBeVisible({ timeout: 10_000 });

    await expect(page.locator(SLIDER)).toHaveValue('0.5');
  });
});
