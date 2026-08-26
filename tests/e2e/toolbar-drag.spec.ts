import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Kéo-thả thanh công cụ chính của Excalidraw + hít mép.
 *
 * Excalidraw 0.18 không có API nào cho việc này (`UIOptions` chỉ có
 * canvasActions/tools/dockedSidebarBreakpoint; upstream issue #7583 vẫn
 * mở) → cả tính năng dựa trên việc đè CSS lên class NỘI BỘ của Excalidraw
 * (`.shapes-section`, `.Island.App-toolbar`, `.Stack_horizontal`,
 * `.App-toolbar__divider`, `.FixedSideContainer_side_top`,
 * `.App-toolbar__extra-tools-dropdown`). File này là cổng regression cho
 * chỗ coupling đó — bump Excalidraw 0.19 PHẢI chạy lại, cùng với
 * `props-panel-collapse.spec.ts`.
 *
 * jsdom không có layout nên unit test không chứng minh được gì ở đây: mọi
 * assertion bên dưới đo `boundingBox()` thật.
 */

const SECTION = '.shapes-section';
const ISLAND = '.Island.App-toolbar';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box, 'phần tử phải có boundingBox').not.toBeNull();
  return box!;
}

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('.excalidraw').first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator(ISLAND).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('toolbar-drag-handle')).toBeVisible({
    timeout: 20_000,
  });
}

/** Kéo tay cầm tới một điểm tuyệt đối trên trang rồi thả. */
async function dragHandleTo(page: Page, target: { x: number; y: number }) {
  const handle = await boxOf(page.getByTestId('toolbar-drag-handle'));
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  // Hai nhịp: một số handler bỏ qua move đầu tiên trùng điểm nhấn.
  await page.mouse.move(target.x, target.y, { steps: 12 });
  await page.mouse.move(target.x, target.y);
  await page.mouse.up();
}

async function frameBox(page: Page): Promise<Box> {
  return boxOf(page.locator('.FixedSideContainer_side_top').first());
}

test.describe('Đổi vị trí thanh công cụ', () => {
  test('mặc định neo mép trên, nằm ngang', async ({ page }) => {
    await ready(page);
    const section = await boxOf(page.locator(SECTION).first());
    const frame = await frameBox(page);
    expect(section.width).toBeGreaterThan(section.height);
    expect(section.y - frame.y).toBeLessThan(8);
    await expect(page.locator('[data-wb-toolbar="top"]')).toHaveCount(1);
    await page.screenshot({ path: 'test-results/toolbar-default-top.png' });
  });

  test('kéo sang mép trái → hít vào, lật dọc, không đè panel thuộc tính', async ({
    page,
  }) => {
    await ready(page);
    const frame = await frameBox(page);

    await dragHandleTo(page, { x: frame.x + 20, y: frame.y + frame.height / 2 });

    await expect(page.locator('[data-wb-toolbar="left"]')).toHaveCount(1);

    const island = await boxOf(page.locator(ISLAND).first());
    // Lật dọc thật sự, không chỉ đổi chỗ.
    expect(island.height).toBeGreaterThan(island.width);
    expect(island.width).toBeLessThan(80);
    // Bám mép trái của vùng an toàn.
    expect(island.x - frame.x).toBeLessThan(8);
    // Nằm trọn trong khung.
    expect(island.y).toBeGreaterThanOrEqual(frame.y - 1);
    expect(island.y + island.height).toBeLessThanOrEqual(
      frame.y + frame.height + 1,
    );

    // Không đè nút ☰ (menu chính).
    const burger = await boxOf(
      page.locator('.App-menu_top__left .dropdown-menu-button').first(),
    );
    expect(overlaps(island, burger)).toBe(false);

    // Vạch ngăn phải canh giữa cột. Cột grid rộng theo icon (36px) còn vạch
    // khai width:1.5rem tường minh → thiếu `justify-self:center` thì nó dồn
    // về mép trái. Lỗi này KHÔNG lộ ra ở boundingBox của Island.
    const divider = await boxOf(
      page.locator(`${ISLAND} .App-toolbar__divider`).first(),
    );
    const dividerCenter = divider.x + divider.width / 2;
    const islandCenter = island.x + island.width / 2;
    expect(Math.abs(dividerCenter - islandCenter)).toBeLessThan(3);

    await page.screenshot({ path: 'test-results/toolbar-dock-left.png' });
  });

  test('dock trái: panel thuộc tính dịch sang phải, không chồng toolbar', async ({
    page,
  }) => {
    await ready(page);
    const frame = await frameBox(page);
    await dragHandleTo(page, { x: frame.x + 20, y: frame.y + frame.height / 2 });
    await expect(page.locator('[data-wb-toolbar="left"]')).toHaveCount(1);

    // Chọn tool hình chữ nhật → Excalidraw hiện panel thuộc tính.
    // canvas.interactive: canvas `static` nằm dưới nên click bị chặn — xem
    // ghi chú cùng vấn đề trong props-panel-collapse.spec.ts.
    await page
      .locator('.excalidraw canvas.interactive')
      .first()
      .click({ position: { x: 500, y: 400 } });
    await page.keyboard.press('r');

    const panel = page.locator('.App-menu__left');
    await expect(panel).toBeVisible({ timeout: 10_000 });

    const island = await boxOf(page.locator(ISLAND).first());
    const panelBox = await boxOf(panel);
    expect(overlaps(island, panelBox)).toBe(false);
    await page.screenshot({ path: 'test-results/toolbar-left-with-props.png' });
  });

  test('dock trái: toolbar vẫn bấm được và mở được More tools kèm nút stamp', async ({
    page,
  }) => {
    await ready(page);
    const frame = await frameBox(page);
    await dragHandleTo(page, { x: frame.x + 20, y: frame.y + frame.height / 2 });
    await expect(page.locator('[data-wb-toolbar="left"]')).toHaveCount(1);

    // Nút công cụ vẫn nhận click sau khi đổi vị trí.
    await page.locator(`${ISLAND} label.ToolIcon`).nth(3).click();

    // Popover More tools phải mở RA TRONG khung, không thò ra ngoài mép trái.
    await page.locator('.App-toolbar__extra-tools-trigger').click();
    const dropdown = page.locator(
      '.App-toolbar__extra-tools-dropdown .dropdown-menu-container',
    );
    await expect(dropdown).toBeVisible({ timeout: 10_000 });
    const dd = await boxOf(dropdown);
    expect(dd.x).toBeGreaterThanOrEqual(0);
    expect(dd.x + dd.width).toBeLessThanOrEqual(
      page.viewportSize()!.width + 1,
    );
    // Các nút stamp do ToolbarInjector cắm vào vẫn còn.
    await expect(
      page.locator('#stamp-menu-portal-wrapper button'),
    ).not.toHaveCount(0);
    await page.screenshot({ path: 'test-results/toolbar-left-dropdown.png' });
  });

  test('kéo sang mép phải → hít vào và lật dọc', async ({ page }) => {
    await ready(page);
    const frame = await frameBox(page);

    await dragHandleTo(page, {
      x: frame.x + frame.width - 20,
      y: frame.y + frame.height / 2,
    });

    await expect(page.locator('[data-wb-toolbar="right"]')).toHaveCount(1);
    const island = await boxOf(page.locator(ISLAND).first());
    expect(island.height).toBeGreaterThan(island.width);
    expect(frame.x + frame.width - (island.x + island.width)).toBeLessThan(8);
  });

  test('kéo xuống mép dưới → hít vào, giữ nằm ngang, popover mở ngược lên', async ({
    page,
  }) => {
    await ready(page);
    const frame = await frameBox(page);

    await dragHandleTo(page, {
      x: frame.x + frame.width / 2,
      y: frame.y + frame.height - 20,
    });

    await expect(page.locator('[data-wb-toolbar="bottom"]')).toHaveCount(1);
    const island = await boxOf(page.locator(ISLAND).first());
    expect(island.width).toBeGreaterThan(island.height);
    expect(frame.y + frame.height - (island.y + island.height)).toBeLessThan(8);

    await page.locator('.App-toolbar__extra-tools-trigger').click();
    const dropdown = page.locator(
      '.App-toolbar__extra-tools-dropdown .dropdown-menu-container',
    );
    await expect(dropdown).toBeVisible({ timeout: 10_000 });
    const dd = await boxOf(dropdown);
    // Mở NGƯỢC LÊN: đáy popover phải nằm trên đỉnh toolbar.
    expect(dd.y + dd.height).toBeLessThanOrEqual(island.y + 1);
    expect(dd.y).toBeGreaterThanOrEqual(0);
    await page.screenshot({ path: 'test-results/toolbar-dock-bottom.png' });
  });

  test('thả giữa canvas → nổi tự do tại chỗ, vẫn nằm ngang', async ({ page }) => {
    await ready(page);
    const frame = await frameBox(page);
    const target = { x: frame.x + 500, y: frame.y + 320 };

    await dragHandleTo(page, target);

    await expect(page.locator('[data-wb-toolbar="float"]')).toHaveCount(1);
    const island = await boxOf(page.locator(ISLAND).first());
    expect(island.width).toBeGreaterThan(island.height);
    // Thả ở nửa dưới khung → phải cách mép trên rõ rệt.
    expect(island.y - frame.y).toBeGreaterThan(100);
    await page.screenshot({ path: 'test-results/toolbar-float.png' });
  });

  test('kéo trở lại mép trên → về mặc định', async ({ page }) => {
    await ready(page);
    const frame = await frameBox(page);

    await dragHandleTo(page, { x: frame.x + 20, y: frame.y + frame.height / 2 });
    await expect(page.locator('[data-wb-toolbar="left"]')).toHaveCount(1);

    await dragHandleTo(page, { x: frame.x + frame.width / 2, y: frame.y + 10 });
    await expect(page.locator('[data-wb-toolbar="top"]')).toHaveCount(1);
    const island = await boxOf(page.locator(ISLAND).first());
    expect(island.width).toBeGreaterThan(island.height);
  });

  test('vị trí được nhớ sau khi tải lại trang', async ({ page }) => {
    await ready(page);
    const frame = await frameBox(page);
    await dragHandleTo(page, { x: frame.x + 20, y: frame.y + frame.height / 2 });
    await expect(page.locator('[data-wb-toolbar="left"]')).toHaveCount(1);

    await page.reload();
    await expect(page.locator(ISLAND).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-wb-toolbar="left"]')).toHaveCount(1);
    const island = await boxOf(page.locator(ISLAND).first());
    expect(island.height).toBeGreaterThan(island.width);
  });

  test('bàn phím: Enter đảo vòng qua các mép', async ({ page }) => {
    await ready(page);
    await page.getByTestId('toolbar-drag-handle').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-wb-toolbar="left"]')).toHaveCount(1);
    await page.getByTestId('toolbar-drag-handle').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-wb-toolbar="bottom"]')).toHaveCount(1);
  });

  test('kéo tay cầm KHÔNG vẽ ra nét nào trên canvas', async ({ page }) => {
    await ready(page);
    const frame = await frameBox(page);
    const before = await page.evaluate(
      () => (window as any).__wbElementCount?.() ?? null,
    );

    await dragHandleTo(page, { x: frame.x + 500, y: frame.y + 320 });
    await expect(page.locator('[data-wb-toolbar="float"]')).toHaveCount(1);

    // Không có hook đếm element thì kiểm gián tiếp: Excalidraw chỉ hiện
    // panel thuộc tính khi có element được chọn/vừa vẽ.
    if (before === null) {
      await expect(page.locator('.App-menu__left')).toHaveCount(0);
    }
  });
});
