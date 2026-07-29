import { test, expect } from '@playwright/test';

/**
 * Issue hoctotbachkhoa#528 — nút thu gọn panel thuộc tính.
 *
 * Đo bằng boundingBox thật: jsdom không có layout nên unit test không
 * chứng minh được panel co lại.
 *
 * Chọn tool bằng phím `r` (rectangle) — KHÔNG dùng `p` vì phím đó đã bị
 * PdfImporterButton chiếm.
 *
 * LỆCH so với brief: Excalidraw render 2 lớp `<canvas>` chồng nhau bên
 * trong `.excalidraw` — lớp `static` (dưới, để render) và lớp
 * `interactive` (trên, nhận pointer event). `.excalidraw canvas` (không
 * lọc class) khớp `.first()` = canvas `static`, đứng dưới nên bị
 * `interactive` che khuất → Playwright coi là "intercepted", click
 * timeout 30s. Verify bằng script Playwright độc lập
 * (`.excalidraw canvas.interactive`) xác nhận: đổi sang canvas
 * `.interactive` thì click ăn ngay, panel hiện, mọi assertion
 * boundingBox bên dưới pass với số đo thật (200×554 / 32×32 / 200×554).
 */
test.describe('Thu gọn panel thuộc tính', () => {
  test('nút toggle thu panel về tab nhỏ rồi mở lại', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.excalidraw').first()).toBeVisible({
      timeout: 15_000,
    });

    // Chọn tool hình chữ nhật → Excalidraw hiện panel thuộc tính.
    // canvas.interactive (KHÔNG phải .excalidraw canvas trần) — xem ghi
    // chú "LỆCH so với brief" ở đầu file.
    await page.locator('.excalidraw canvas.interactive').first().click({ position: { x: 400, y: 300 } });
    await page.keyboard.press('r');

    const panel = page.locator('.App-menu__left');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.App-menu__left .panelColumn').first()).toBeVisible();

    const expanded = await panel.boundingBox();
    expect(expanded!.width).toBeGreaterThan(150);
    await page.screenshot({ path: 'test-results/props-panel-expanded.png' });

    // Thu gọn.
    const toggle = page.getByTestId('props-panel-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();

    await expect(page.locator('.App-menu__left .panelColumn').first()).toBeHidden();
    const collapsed = await panel.boundingBox();
    expect(collapsed!.width).toBeLessThan(60);
    expect(collapsed!.height).toBeLessThan(60);
    await page.screenshot({ path: 'test-results/props-panel-collapsed.png' });

    // Mở lại.
    await page.getByTestId('props-panel-toggle').click();
    await expect(page.locator('.App-menu__left .panelColumn').first()).toBeVisible();
    const reopened = await panel.boundingBox();
    expect(reopened!.width).toBeGreaterThan(150);
  });

  test('đổi tool khi đang thu gọn: panel remount vẫn ở trạng thái thu gọn', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('.excalidraw').first()).toBeVisible({
      timeout: 15_000,
    });

    await page.locator('.excalidraw canvas.interactive').first().click({ position: { x: 400, y: 300 } });
    await page.keyboard.press('r');
    await expect(page.locator('.App-menu__left')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('props-panel-toggle').click();
    await expect(page.locator('.App-menu__left .panelColumn').first()).toBeHidden();

    // Về selection (phím v) → Excalidraw gỡ panel, rồi chọn ellipse (phím o).
    await page.keyboard.press('v');
    await page.keyboard.press('o');

    await expect(page.locator('.App-menu__left')).toBeVisible();
    await expect(page.locator('.App-menu__left .panelColumn').first()).toBeHidden();
    const box = await page.locator('.App-menu__left').boundingBox();
    expect(box!.width).toBeLessThan(60);
    await expect(page.getByTestId('props-panel-toggle')).toBeVisible();
  });

  /**
   * F1 (review 2026-07-29) — cổng chặn regression.
   *
   * `.App-menu__left` là chính scroll container (`overflow-y:auto`, Excalidraw
   * set inline `max-height`). Nút toggle được portal vào BÊN TRONG nó (con
   * cuối cùng) — với CSS cũ (`position: absolute` chay), nút cuộn theo nội
   * dung và biến mất khỏi tầm nhìn ngay khi panel bị cuộn. Viewport 1000×620
   * đủ thấp để panel có scrollHeight > clientHeight thật (không phải mọi
   * viewport đều kích hoạt — MacBook 1440×900 thu gọn cũng dính, nhưng CI
   * cần con số ổn định nên hard-code viewport nhỏ ở đây).
   */
  test('cuộn panel xuống đáy: nút toggle vẫn nằm trong vùng nhìn thấy của panel', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1000, height: 620 });
    await page.goto('/');
    await expect(page.locator('.excalidraw').first()).toBeVisible({
      timeout: 15_000,
    });

    await page.locator('.excalidraw canvas.interactive').first().click({ position: { x: 400, y: 300 } });
    await page.keyboard.press('r');

    const panel = page.locator('.App-menu__left');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.App-menu__left .panelColumn').first()).toBeVisible();

    // Gate: nếu panel KHÔNG thật sự cuộn được thì test này vô nghĩa (không
    // đo được điều nó tuyên bố đo).
    const { scrollHeight, clientHeight } = await panel.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(scrollHeight).toBeGreaterThan(clientHeight);

    // Cuộn panel xuống đáy.
    await panel.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    const toggle = page.getByTestId('props-panel-toggle');
    await expect(toggle).toBeInViewport();

    const toggleBox = await toggle.boundingBox();
    const panelBox = await panel.boundingBox();
    expect(toggleBox).not.toBeNull();
    expect(panelBox).not.toBeNull();

    // Nút phải nằm trong dải y hiển thị của chính panel (không trôi lên trên
    // mép panel, không rơi xuống dưới mép panel) — đây là điều CSS cũ vi
    // phạm (nút cuộn theo nội dung, y âm sau khi cuộn).
    expect(toggleBox!.y).toBeGreaterThanOrEqual(panelBox!.y);
    expect(toggleBox!.y + toggleBox!.height).toBeLessThanOrEqual(
      panelBox!.y + panelBox!.height + 1,
    );
  });
});
