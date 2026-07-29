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
   * Vùng cuộn thật của panel là `.App-menu__left .panelColumn` (fix round 2
   * tách vùng cuộn ra khỏi `.App-menu__left` — xem comment trong
   * `propsPanelToggle.css`; `.App-menu__left` bản thân giờ KHÔNG còn cuộn,
   * `overflow: hidden`). Với CSS trước fix (nút `position: absolute` chay
   * trong chính scroll container), nút cuộn theo nội dung và biến mất khỏi
   * tầm nhìn ngay khi panel bị cuộn. Viewport 1000×620 đủ thấp để panel có
   * scrollHeight > clientHeight thật (không phải mọi viewport đều kích
   * hoạt — MacBook 1440×900 thu gọn cũng dính, nhưng CI cần con số ổn định
   * nên hard-code viewport nhỏ ở đây).
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
    const scrollArea = page.locator('.App-menu__left .panelColumn').first();
    await expect(scrollArea).toBeVisible();

    // Gate: nếu vùng cuộn KHÔNG thật sự cuộn được thì test này vô nghĩa
    // (không đo được điều nó tuyên bố đo).
    const { scrollHeight, clientHeight } = await scrollArea.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(scrollHeight).toBeGreaterThan(clientHeight);

    // Cuộn vùng nội dung xuống đáy.
    await scrollArea.evaluate((el) => {
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

  /**
   * Fix round 2 (2026-07-29) — cổng chặn regression cho "nút đè lên control".
   *
   * Vẽ + giữ 1 hình chữ nhật đang chọn để panel có nhiều control thật
   * (color-picker, input, v.v — khớp cách reviewer đo). Cuộn `.panelColumn`
   * tới 0%/50%/100% rồi kiểm 2 lớp bằng chứng:
   *
   * 1. `elementFromPoint` tại tâm nút → PHẢI là chính nút (hoặc con của nó).
   *    Đây là phép đo sát với trải nghiệm thật nhất: "click vào đúng chỗ
   *    nút có luôn trúng nút không" — độc lập với việc phần tử khác có bị
   *    CLIP (ẩn, không thể click) bởi overflow của `.panelColumn` hay không.
   * 2. Diện tích giao nhau giữa boundingBox() của nút và boundingBox() ĐÃ
   *    CẮT THEO VÙNG NHÌN THẤY (clip theo `.panelColumn`) của mọi
   *    button/input/label/.color-picker__button/[role="radio"]/h3/legend/
   *    .control-label còn lại trong panel — phải bằng 0. Dùng rect ĐÃ CLIP
   *    (không phải rect thô) vì raw `getBoundingClientRect()` KHÔNG phản
   *    ánh việc phần tử bị `.panelColumn`'s `overflow-y:auto` cắt mất — đo
   *    thực nghiệm cho thấy rect thô vẫn báo "chồng lấn" ở một số mốc cuộn
   *    (vd 50%) dù phần tử đó đã bị cắt khỏi vùng nhìn thấy (verify bằng
   *    `elementFromPoint` tại đúng điểm đó trả về `<path>` bên trong nút
   *    toggle, KHÔNG phải control kia) — tức đó là false positive của phép
   *    đo thô, không phải bug thật.
   *
   * Fix round 3 (2026-07-29): danh sách ứng viên ban đầu chỉ gồm phần tử
   * TƯƠNG TÁC (button/input/label/...) nên BỎ SÓT heading/nhãn nhóm không
   * tương tác (`<h3 aria-hidden="true">Stroke</h3>`, `<legend>`,
   * `.control-label`) mà Excalidraw luôn render phía trên mỗi nhóm control
   * — nút đè lên CHỮ "Stroke" (không phải 1 control cụ thể) lọt qua cổng
   * cũ hoàn toàn. Reviewer chứng minh bằng tiêm CSS mô phỏng quên
   * `flex-shrink:0` (`.wb-props-toggle-mount{height:0 !important}`): nút
   * đè thật lên "Stroke" (216px²) nhưng cổng cũ báo `totalOverlap: 0` (bỏ
   * sót vì `<h3>` không khớp selector cũ). Thêm `h3, legend,
   * .control-label` vào danh sách ứng viên — vẫn giữ nguyên cách clip
   * theo `.panelColumn` (không quay lại clip theo Island, đã có bài học
   * false positive 252px² ở round 2).
   */
  test('cuộn panel ở 3 mốc 0/50/100%: nút toggle không đè (thật) lên control nào', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1000, height: 620 });
    await page.goto('/');
    await expect(page.locator('.excalidraw').first()).toBeVisible({
      timeout: 15_000,
    });

    const canvas = page.locator('.excalidraw canvas.interactive').first();
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.keyboard.press('r');
    // Vẽ 1 hình chữ nhật thật (giữ nguyên trạng thái "đang chọn") để panel
    // có đầy đủ control (color-picker, v.v) — khớp cách reviewer đo.
    await page.mouse.move(300, 250);
    await page.mouse.down();
    await page.mouse.move(500, 400, { steps: 10 });
    await page.mouse.up();

    const panel = page.locator('.App-menu__left');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    const scrollArea = page.locator('.App-menu__left .panelColumn').first();
    await expect(scrollArea).toBeVisible();

    const { scrollHeight, clientHeight } = await scrollArea.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(scrollHeight).toBeGreaterThan(clientHeight);

    for (const pct of [0, 0.5, 1]) {
      await scrollArea.evaluate((el, p) => {
        el.scrollTop = Math.round((el.scrollHeight - el.clientHeight) * p);
      }, pct);
      await page.waitForTimeout(30);

      const result = await page.evaluate(() => {
        const btn = document.querySelector<HTMLElement>('.wb-props-toggle');
        const mount = document.querySelector<HTMLElement>('.wb-props-toggle-mount');
        const panelEl = document.querySelector<HTMLElement>('.App-menu__left');
        const scrollBox = document.querySelector<HTMLElement>(
          '.App-menu__left .panelColumn',
        );
        if (!btn || !mount || !panelEl || !scrollBox) {
          return { error: 'missing element' };
        }

        const b = btn.getBoundingClientRect();
        const clip = scrollBox.getBoundingClientRect();

        // elementFromPoint tại tâm nút — phải trúng chính nút.
        const cx = b.left + b.width / 2;
        const cy = b.top + b.height / 2;
        const hitEl = document.elementFromPoint(cx, cy);
        const hitsToggle = !!hitEl && (hitEl === btn || btn.contains(hitEl));

        // Diện tích giao nhau với rect ĐÃ CLIP theo vùng nhìn thấy của
        // panelColumn (mọi control nằm trong panelColumn không thể hiển thị
        // ngoài rect này). Gồm CẢ heading/nhãn nhóm không tương tác (h3,
        // legend, .control-label) — round 3: cổng cũ chỉ xét phần tử tương
        // tác nên bỏ sót "nút đè lên CHỮ Stroke" (không phải 1 control).
        const candidates = Array.from(
          panelEl.querySelectorAll<HTMLElement>(
            'button, input, label, .color-picker__button, [role="radio"], h3, legend, .control-label',
          ),
        ).filter((el) => !mount.contains(el));

        let totalOverlap = 0;
        const hits: Array<{ tag: string; label: string | null; area: number }> = [];
        for (const el of candidates) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          // Clip candidate rect vào vùng nhìn thấy của panelColumn nếu nó
          // nằm trong đó (nếu không thuộc panelColumn, dùng rect thô).
          const insideScrollBox = scrollBox.contains(el);
          const clipped = insideScrollBox
            ? {
                left: Math.max(r.left, clip.left),
                top: Math.max(r.top, clip.top),
                right: Math.min(r.right, clip.right),
                bottom: Math.min(r.bottom, clip.bottom),
              }
            : r;
          const overlapX = Math.max(
            0,
            Math.min(b.right, clipped.right) - Math.max(b.left, clipped.left),
          );
          const overlapY = Math.max(
            0,
            Math.min(b.bottom, clipped.bottom) - Math.max(b.top, clipped.top),
          );
          const area = overlapX * overlapY;
          if (area > 0) {
            totalOverlap += area;
            hits.push({
              tag: el.tagName,
              label: el.getAttribute('aria-label') || el.getAttribute('title'),
              area,
            });
          }
        }

        return { hitsToggle, totalOverlap, hits };
      });

      expect(result.error, `pct=${pct}`).toBeUndefined();
      expect(result.hitsToggle, `pct=${pct}: click tại tâm nút phải trúng nút`).toBe(
        true,
      );
      expect(
        result.totalOverlap,
        `pct=${pct}: overlap=0 — hits=${JSON.stringify(result.hits)}`,
      ).toBe(0);
    }
  });
});
