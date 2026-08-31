# Trang giấy có vách — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nền kẻ dòng có bề rộng giới hạn — kéo ngang dừng ở mép trang, zoom out dừng khi trang khít màn hình, chỉ cuộn xuống là vô hạn.

**Architecture:** Thêm một tầng ràng buộc camera cạnh lớp nền đã có. Lõi là hàm thuần `clampCamera()`; hook `usePageCamera` gọi nó sau mỗi `onScrollChange` rồi ghi ngược vào Excalidraw qua `updateScene`. Khả thi vì Excalidraw cập nhật camera cộng dồn từ state hiện tại chứ không từ gốc cử chỉ. CSS của lớp nền không đổi — vách được camera bảo đảm, không phải vẽ ra.

**Tech Stack:** React 19, TypeScript strict, `@excalidraw/excalidraw` 0.18.1, Jest 29 + jsdom + ts-jest, Playwright (Chromium headless).

**Spec:** `docs/superpowers/specs/2026-08-31-trang-giay-camera-design.md`

## Global Constraints

- Ràng buộc camera **chỉ sống khi nền kẻ dòng bật**. Tắt đi, bảng trở lại canvas vô tận, không dấu vết.
- `PAPER_PAGE_WIDTH = 1440` đơn vị scene. `PAPER_LINE_HEIGHT = 32` (đã có).
- Hằng của Excalidraw: `MIN_ZOOM = 0.1`, `MAX_ZOOM = 30`.
- Quy đổi đúng của Excalidraw: `screenY = (sceneY + scrollY) * zoom + offsetTop` — **dấu cộng**.
- Mọi `updateScene` của tính năng này phải mang `captureUpdate: 'NEVER'` — đổi camera là hiển thị, không được chiếm bậc undo của giáo viên.
- Comment và commit message viết tiếng Việt (prefix `feat`/`fix`/`docs` giữ tiếng Anh). **Không** thêm `Co-Authored-By`.
- Nhánh: `feature/trang-giay-camera`. Kiểm `git branch --show-current` trước mỗi commit.
- Lệnh: `npm test` (jest), `npm run typecheck`, `npm run lint`, `npx playwright test tests/e2e/paper-background.spec.ts`.

---

## File Structure

| Tệp | Trách nhiệm |
|---|---|
| `src/ui/paperStyle.ts` | **Sửa** — dấu của `paperMetrics`, thêm `PAPER_PAGE_WIDTH` |
| `src/ui/pageCamera.ts` | **Mới** — toàn bộ toán ràng buộc, hàm thuần, không React/DOM |
| `src/ui/usePageCamera.ts` | **Mới** — nối `pageCamera` với vòng đời Excalidraw |
| `src/ui/PaperBackground.tsx` | **Sửa** — gọi hook camera; JSX giữ nguyên |
| `src/ui/OffPageNotice.tsx` | **Mới** — dải cảnh báo nội dung ngoài trang (kèm phần dò của riêng nó) |
| `src/ui/paperBackground.css` | **Sửa** — chỉ thêm style cho dải cảnh báo |
| `src/Whiteboard.tsx` | **Sửa** — render `OffPageNotice` |

---

### Task 1: Sửa dấu `paperMetrics` và thay phép đo tautology

Việc này độc lập với ràng buộc camera và tự nó đã có giá trị: dòng kẻ đang trượt ngược nội dung.

**Files:**
- Modify: `src/ui/paperStyle.ts:39-70`
- Test: `src/ui/__tests__/paperStyle.test.ts:11-30,45-51`
- Test: `tests/e2e/paper-background.spec.ts:141-169`

**Interfaces:**
- Consumes: không có (task đầu).
- Produces: `paperMetrics(scrollY: number, zoom: number, lineHeight?: number): PaperMetrics` — chữ ký không đổi, chỉ đổi giá trị `offsetPx`.

- [ ] **Step 1: Sửa hai ca unit test sang giá trị đúng, để chúng đỏ**

Trong `src/ui/__tests__/paperStyle.test.ts`, sửa comment đầu file (dòng 11-16) thành:

```ts
/**
 * Nền giấy kẻ dòng chỉ là một lớp CSS sau canvas, nên toàn bộ phần khó
 * (dòng kẻ phải trôi khớp với nội dung khi pan/zoom) nằm ở hàm thuần
 * `paperMetrics`. Test ở đây khoá đúng phép quy đổi scene → screen mà
 * Excalidraw dùng: `screenY = (sceneY + scrollY) * zoom` — dấu CỘNG, đọc
 * từ `sceneCoordsToViewportCoords` trong dist/dev/chunk-4FTI6OG3.js.
 */
```

Thay ca ở dòng 27-30 bằng:

```ts
  test('scroll dương thì dòng kẻ trôi xuống đúng quãng đường', () => {
    // sceneY=0 nằm ở screenY=(0+10)*1=10 → dòng kẻ đầu tiên ở screenY=10.
    const m = paperMetrics(10, 1);
    expect(m.offsetPx).toBeCloseTo(10);
  });
```

Thay ca ở dòng 46-51 bằng:

```ts
  test('zoom vẫn dịch offset đúng tỉ lệ', () => {
    // scrollY=10 ở zoom 2 → sceneY=0 ở screenY=(0+10)*2=20, chu kỳ 64.
    const m = paperMetrics(10, 2);
    expect(m.offsetPx).toBeCloseTo(20);
  });
```

Thêm ngay dưới ca đó một ca khoá chiều dấu — đây là ca mà bản cũ không thể có:

```ts
  test('scroll âm và dương cho offset đối xứng qua gốc, không trùng nhau', () => {
    // Nếu lật dấu công thức, hai giá trị này sẽ hoán đổi cho nhau.
    expect(paperMetrics(10, 1).offsetPx).toBeCloseTo(10);
    expect(paperMetrics(-10, 1).offsetPx).toBeCloseTo(22);
  });
```

- [ ] **Step 2: Chạy để xác nhận đỏ**

Run: `npm test -- paperStyle`
Expected: FAIL — 3 ca đỏ, báo `Expected: 10, Received: 22` và `Expected: 20, Received: 44`.

Nếu chúng XANH thì dừng lại: nghĩa là `paperMetrics` đã đúng dấu và giả định của kế hoạch này sai.

- [ ] **Step 3: Sửa dấu trong `paperMetrics`**

Trong `src/ui/paperStyle.ts`, thay khối doc-comment của `paperMetrics` (dòng 39-50) và thân hàm:

```ts
/**
 * Quy đổi vị trí cuộn + zoom của Excalidraw thành hai con số CSS.
 *
 * Excalidraw đặt điểm scene `sceneY` lên màn hình tại
 * `screenY = (sceneY + scrollY) * zoom + offsetTop` — dấu CỘNG, đọc từ
 * `sceneCoordsToViewportCoords` (dist/dev/chunk-4FTI6OG3.js:1329). Đừng
 * tin trí nhớ ở chỗ này: bản đầu tiên của tính năng viết dấu trừ và dòng
 * kẻ trượt ngược nội dung suốt nhiều tháng vì test chép lại chính công
 * thức sai đó rồi so với nó.
 *
 * `offsetTop` triệt tiêu: `.wb-paper-layer` là `position:absolute;inset:0`
 * trong cùng hộp với container Excalidraw nên hai hệ có chung gốc.
 *
 * Dòng kẻ nằm ở mọi `sceneY = k * lineHeight`, nên chỉ cần lấy phần dư để
 * biết dòng đầu tiên rơi vào đâu — pattern CSS lặp lo phần còn lại.
 *
 * Chỉ phụ thuộc `scrollY`: dòng kẻ ngang chạy suốt bề rộng khung nhìn nên
 * cuộn ngang không đổi gì cả. Bề rộng TRANG do `pageCamera.ts` lo, không
 * phải chỗ này.
 */
export function paperMetrics(
  scrollY: number,
  zoom: number,
  lineHeight: number = PAPER_LINE_HEIGHT,
): PaperMetrics {
  const sizePx = lineHeight * zoom;
  if (!Number.isFinite(sizePx) || sizePx < PAPER_MIN_GAP_PX) {
    return { visible: false, sizePx: 0, offsetPx: 0 };
  }
  // `%` trong JS giữ dấu của số bị chia → cộng thêm một chu kỳ rồi lấy
  // dư lần nữa để offset luôn rơi vào [0, sizePx) khi scrollY âm.
  const offsetPx = (((scrollY * zoom) % sizePx) + sizePx) % sizePx;
  return { visible: true, sizePx, offsetPx };
}
```

- [ ] **Step 4: Chạy lại unit test**

Run: `npm test -- paperStyle`
Expected: PASS, toàn bộ file xanh.

- [ ] **Step 5: Thêm hằng `PAPER_PAGE_WIDTH`**

Trong `src/ui/paperStyle.ts`, ngay dưới `PAPER_LINE_HEIGHT`:

```ts
/**
 * Bề rộng trang giấy, đơn vị scene (= 45 dòng kẻ).
 *
 * Là hằng số trong KHÔNG GIAN SCENE chứ không phải px màn hình: bảng được
 * lưu rồi mở lại trên máy khác vẫn phải ra đúng bố cục. Zoom out tối đa
 * được suy ra từ nó (`minZoomFor` trong `pageCamera.ts`) chứ không đặt tay.
 */
export const PAPER_PAGE_WIDTH = 1440;
```

- [ ] **Step 6: Thay phép đo tautology trong e2e**

Trong `tests/e2e/paper-background.spec.ts`, thêm helper này ngay dưới `countLinePixels`:

```ts
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
      return (((theta / (2 * Math.PI)) * period) % period + period) % period;
    },
    { dataUrl: `data:image/png;base64,${shot.toString('base64')}`, period: size },
  );
}

/** Chênh lệch hai pha trên vòng tròn chu kỳ `size` — luôn trong [0, size/2]. */
function phaseGap(a: number, b: number, size: number): number {
  const d = Math.abs(a - b) % size;
  return Math.min(d, size - d);
}
```

Thay toàn bộ ca test `'cuộn bảng thì dòng kẻ trôi theo đúng quãng đường'` (dòng 141-169) bằng:

```ts
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
    const predicted = ((phaseBefore + contentShift) % size + size) % size;
    const measured = await linePhasePx(page, size);

    expect(phaseGap(measured, predicted, size)).toBeLessThan(2);

    // Và vẫn hiện ra thật sau khi cuộn.
    expect(await countLinePixels(page)).toBeGreaterThan(2000);
  });
```

- [ ] **Step 7: Chạy e2e để xác nhận phép đo mới bắt được bug**

Run: `git stash push src/ui/paperStyle.ts && npx playwright test tests/e2e/paper-background.spec.ts -g "cùng chiều"`
Expected: FAIL — chứng minh phép đo mới đỏ được khi dấu sai.

Rồi khôi phục và chạy lại:

Run: `git stash pop && npx playwright test tests/e2e/paper-background.spec.ts`
Expected: PASS toàn bộ.

Đây là đối chứng âm bắt buộc. Nếu bước stash vẫn XANH thì phép đo mới cũng vô dụng như phép đo cũ — dừng lại và sửa helper.

- [ ] **Step 8: Commit**

```bash
git branch --show-current   # phải là feature/trang-giay-camera
git add src/ui/paperStyle.ts src/ui/__tests__/paperStyle.test.ts tests/e2e/paper-background.spec.ts
git commit -m "fix(paper): dòng kẻ trôi ngược nội dung vì sai dấu scrollY

Excalidraw đặt scene lên màn hình bằng (sceneY + scrollY) * zoom — dấu
CỘNG, đọc từ sceneCoordsToViewportCoords. paperMetrics dùng dấu trừ nên
kéo bảng xuống thì nét vẽ đi xuống còn dòng kẻ đi lên.

Test cũ không bắt được vì nó chép lại đúng công thức của bản cài đặt rồi
so với chính bản cài đặt. Thay bằng phép đo pixel độc lập: trung bình vòng
trên độ đậm từng hàng, so pha trước/sau khi cuộn với quãng đường mà chính
Excalidraw báo. Đã kiểm đối chứng âm — lật lại dấu thì ca này đỏ.

Thêm hằng PAPER_PAGE_WIDTH cho tầng ràng buộc camera sắp tới."
```

---

### Task 2: Hàm thuần `pageCamera.ts`

**Files:**
- Create: `src/ui/pageCamera.ts`
- Test: `src/ui/__tests__/pageCamera.test.ts`

**Interfaces:**
- Consumes: `PAPER_PAGE_WIDTH` từ `src/ui/paperStyle.ts` (Task 1).
- Produces:
  - `interface Camera { scrollX: number; scrollY: number; zoom: number }`
  - `EXCALIDRAW_MIN_ZOOM = 0.1`, `EXCALIDRAW_MAX_ZOOM = 30`, `CAMERA_EPSILON = 1e-6`
  - `minZoomFor(viewportWidth: number, pageWidth?: number): number`
  - `clampCamera(camera: Camera, viewportWidth: number, pageWidth?: number): Camera`
  - `sameCamera(a: Camera, b: Camera): boolean`
  - `isOutsidePage(elements: readonly PageElement[], pageWidth?: number): boolean`
  - `interface PageElement { x: number; y: number; width: number; height: number; isDeleted?: boolean }`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/ui/__tests__/pageCamera.test.ts`:

```ts
import { PAPER_PAGE_WIDTH } from '../paperStyle';
import {
  CAMERA_EPSILON,
  EXCALIDRAW_MAX_ZOOM,
  EXCALIDRAW_MIN_ZOOM,
  clampCamera,
  isOutsidePage,
  minZoomFor,
  sameCamera,
  type Camera,
} from '../pageCamera';

/**
 * Trang chiếm nửa mặt phẳng sceneX ∈ [0, PAPER_PAGE_WIDTH], sceneY ≥ 0.
 * Excalidraw đặt scene lên màn bằng `screen = (scene + scroll) * zoom`, nên
 * vùng nhìn thấy theo trục ngang là [-scrollX, -scrollX + width/zoom].
 */
describe('minZoomFor', () => {
  test('zoom out tối đa là mức trang vừa khít bề ngang khung nhìn', () => {
    expect(minZoomFor(1440)).toBeCloseTo(1);
    expect(minZoomFor(720)).toBeCloseTo(0.5);
    expect(minZoomFor(2880)).toBeCloseTo(2);
  });

  test('không bao giờ xuống dưới sàn cứng của Excalidraw', () => {
    // Khung 100px: 100/1440 = 0.069 < MIN_ZOOM.
    expect(minZoomFor(100)).toBe(EXCALIDRAW_MIN_ZOOM);
  });

  test('khung nhìn rác không làm vỡ', () => {
    expect(minZoomFor(0)).toBe(EXCALIDRAW_MIN_ZOOM);
    expect(minZoomFor(-5)).toBe(EXCALIDRAW_MIN_ZOOM);
    expect(minZoomFor(Number.NaN)).toBe(EXCALIDRAW_MIN_ZOOM);
  });
});

describe('clampCamera — vách trái/phải', () => {
  const W = 1200; // khung nhìn; minZoom = 1200/1440 = 0.8333

  test('camera đang trong biên thì trả lại y nguyên', () => {
    const cam: Camera = { scrollX: -100, scrollY: -500, zoom: 1 };
    expect(clampCamera(cam, W)).toEqual(cam);
  });

  test('kéo quá mép trái thì dừng ở scrollX = 0', () => {
    const out = clampCamera({ scrollX: 300, scrollY: 0, zoom: 1 }, W);
    expect(out.scrollX).toBeCloseTo(0);
  });

  test('kéo quá mép phải thì dừng ở width/zoom - PAPER_PAGE_WIDTH', () => {
    const out = clampCamera({ scrollX: -9999, scrollY: 0, zoom: 1 }, W);
    expect(out.scrollX).toBeCloseTo(W / 1 - PAPER_PAGE_WIDTH); // -240
  });

  test('zoom càng sâu thì vách phải càng lùi (thấy ít trang hơn)', () => {
    const out = clampCamera({ scrollX: -9999, scrollY: 0, zoom: 2 }, W);
    expect(out.scrollX).toBeCloseTo(W / 2 - PAPER_PAGE_WIDTH); // -840
  });
});

describe('clampCamera — sàn zoom', () => {
  test('zoom out quá mức bị kéo lên minZoom', () => {
    const out = clampCamera({ scrollX: 0, scrollY: 0, zoom: 0.2 }, 1200);
    expect(out.zoom).toBeCloseTo(minZoomFor(1200));
  });

  test('ở đúng minZoom thì trang phủ kín bề ngang, scrollX chỉ còn một điểm', () => {
    const z = minZoomFor(1200);
    const out = clampCamera({ scrollX: -9999, scrollY: 0, zoom: z }, 1200);
    expect(out.scrollX).toBeCloseTo(0);
  });

  test('zoom in vẫn bị trần MAX_ZOOM của Excalidraw chặn', () => {
    const out = clampCamera({ scrollX: 0, scrollY: 0, zoom: 999 }, 1200);
    expect(out.zoom).toBe(EXCALIDRAW_MAX_ZOOM);
  });
});

describe('clampCamera — mép trên', () => {
  test('cuộn lên trên đỉnh trang thì dừng ở scrollY = 0', () => {
    expect(clampCamera({ scrollX: 0, scrollY: 250, zoom: 1 }, 1200).scrollY).toBe(0);
  });

  test('cuộn xuống thì không chặn gì cả', () => {
    const deep = -999_999;
    expect(clampCamera({ scrollX: 0, scrollY: deep, zoom: 1 }, 1200).scrollY).toBe(deep);
  });
});

describe('clampCamera — khung nhìn hẹp hơn sàn zoom cho phép', () => {
  // Khung 100px: minZoom bị sàn 0.1 chặn ⇒ thấy 1000 đơn vị scene < 1440,
  // vẫn vừa. Phải hẹp hơn nữa mới rơi vào ca không vừa: 100px ở zoom 0.1
  // thấy 1000 < 1440 → vừa. Dùng khung 100px với PAGE nhỏ hơn để ép ca này.
  test('không thể vừa trang vào khung thì căn giữa thay vì kẹp bậy', () => {
    // pageWidth 500, khung 1000, zoom 1 ⇒ thấy 1000 > 500: không vừa.
    const out = clampCamera({ scrollX: -9999, scrollY: 0, zoom: 1 }, 1000, 500);
    // Căn giữa: -scrollX + visible/2 = page/2 ⇒ scrollX = (visible - page)/2
    expect(out.scrollX).toBeCloseTo((1000 - 500) / 2); // 250
  });

  test('căn giữa cho ra biên đối xứng hai bên trang', () => {
    const out = clampCamera({ scrollX: 0, scrollY: 0, zoom: 1 }, 1000, 500);
    const leftMargin = -out.scrollX;               // sceneX trái nhìn thấy
    const rightMargin = -out.scrollX + 1000 - 500; // vượt quá mép phải trang
    expect(leftMargin).toBeCloseTo(-rightMargin);
  });
});

describe('sameCamera — chống dội vô tận', () => {
  test('lệch dưới epsilon coi như không đổi', () => {
    const a: Camera = { scrollX: -240, scrollY: -10, zoom: 1 };
    const b: Camera = { scrollX: -240 + CAMERA_EPSILON / 2, scrollY: -10, zoom: 1 };
    expect(sameCamera(a, b)).toBe(true);
  });

  test('lệch thật thì báo khác', () => {
    const a: Camera = { scrollX: -240, scrollY: -10, zoom: 1 };
    expect(sameCamera(a, { ...a, scrollX: -239 })).toBe(false);
    expect(sameCamera(a, { ...a, scrollY: -9 })).toBe(false);
    expect(sameCamera(a, { ...a, zoom: 1.5 })).toBe(false);
  });

  test('kẹp hai lần liên tiếp cho kết quả đứng yên', () => {
    // Đây là bất biến giữ vòng lặp không chạy mãi: kẹp(kẹp(x)) == kẹp(x).
    const once = clampCamera({ scrollX: -9999, scrollY: 500, zoom: 0.01 }, 1200);
    const twice = clampCamera(once, 1200);
    expect(sameCamera(once, twice)).toBe(true);
  });
});

describe('isOutsidePage', () => {
  const el = (x: number, y: number, width = 100, height = 100) => ({
    x, y, width, height,
  });

  test('bảng trống thì không có gì ngoài trang', () => {
    expect(isOutsidePage([])).toBe(false);
  });

  test('nằm gọn trong trang thì không báo', () => {
    expect(isOutsidePage([el(10, 10), el(1000, 5000)])).toBe(false);
  });

  test('tràn sang trái mép trang thì báo', () => {
    expect(isOutsidePage([el(-5, 10)])).toBe(true);
  });

  test('tràn lên trên đỉnh trang thì báo', () => {
    expect(isOutsidePage([el(10, -5)])).toBe(true);
  });

  test('tràn qua mép phải thì báo', () => {
    expect(isOutsidePage([el(PAPER_PAGE_WIDTH - 10, 10, 100)])).toBe(true);
  });

  test('kéo xuống sâu bao nhiêu cũng không phải ngoài trang', () => {
    expect(isOutsidePage([el(10, 999_999)])).toBe(false);
  });

  test('element đã xoá không tính', () => {
    expect(isOutsidePage([{ ...el(-500, 10), isDeleted: true }])).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy để xác nhận đỏ**

Run: `npm test -- pageCamera`
Expected: FAIL — `Cannot find module '../pageCamera'`.

- [ ] **Step 3: Viết `pageCamera.ts`**

```ts
/**
 * Ràng buộc camera cho nền giấy kẻ dòng — phần logic thuần (không React,
 * không DOM).
 *
 * Trang giấy chiếm nửa mặt phẳng `sceneX ∈ [0, PAPER_PAGE_WIDTH]`,
 * `sceneY ≥ 0`: bề ngang có vách, bên dưới vô tận.
 *
 * Excalidraw đặt scene lên màn hình bằng `screen = (scene + scroll) * zoom`
 * (dấu CỘNG — xem ghi chú trong `paperStyle.ts`), nên vùng nhìn thấy theo
 * trục ngang là `[-scrollX, -scrollX + viewportWidth / zoom]`. Ba ràng buộc
 * rơi ra từ đó:
 *
 *   vách trái   -scrollX ≥ 0                        → scrollX ≤ 0
 *   vách phải   -scrollX + w/zoom ≤ pageWidth       → scrollX ≥ w/zoom - pageWidth
 *   tồn tại khi w/zoom ≤ pageWidth                  → zoom ≥ w/pageWidth
 *
 * Mép trên tương tự: vùng nhìn thấy bắt đầu ở `sceneY = -scrollY`, muốn
 * không thấy `sceneY < 0` thì `scrollY ≤ 0`.
 */

import { PAPER_PAGE_WIDTH } from './paperStyle';

/** Ba con số quyết định khung nhìn của Excalidraw. */
export interface Camera {
  scrollX: number;
  scrollY: number;
  zoom: number;
}

/** Chỉ cần bấy nhiêu trường để biết một element có lọt ra ngoài trang không. */
export interface PageElement {
  x: number;
  y: number;
  width: number;
  height: number;
  isDeleted?: boolean;
}

/** Sàn/trần zoom của chính Excalidraw (`constants.ts`). */
export const EXCALIDRAW_MIN_ZOOM = 0.1;
export const EXCALIDRAW_MAX_ZOOM = 30;

/**
 * Lệch dưới ngưỡng này thì coi như camera không đổi.
 *
 * KHÔNG phải trang trí: `clampCamera` có thể trả về giá trị lệch cỡ 1e-15
 * so với đầu vào do dấu phẩy động. Ghi giá trị đó ngược vào Excalidraw sẽ
 * bắn `onScrollChange` → kẹp → ghi → vòng lặp vô tận ăn hết một nhân CPU.
 */
export const CAMERA_EPSILON = 1e-6;

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

/** Mức zoom mà tại đó trang vừa khít bề ngang khung nhìn. */
export function minZoomFor(
  viewportWidth: number,
  pageWidth: number = PAPER_PAGE_WIDTH,
): number {
  if (
    !Number.isFinite(viewportWidth) ||
    viewportWidth <= 0 ||
    !Number.isFinite(pageWidth) ||
    pageWidth <= 0
  ) {
    return EXCALIDRAW_MIN_ZOOM;
  }
  return clamp(viewportWidth / pageWidth, EXCALIDRAW_MIN_ZOOM, EXCALIDRAW_MAX_ZOOM);
}

/**
 * Kéo camera về trong biên của trang.
 *
 * Bất biến quan trọng: `clampCamera(clampCamera(x)) === clampCamera(x)`.
 * Vòng lặp kẹp-rồi-ghi chỉ dừng được nhờ tính chất này.
 */
export function clampCamera(
  camera: Camera,
  viewportWidth: number,
  pageWidth: number = PAPER_PAGE_WIDTH,
): Camera {
  const rawZoom = Number.isFinite(camera.zoom) && camera.zoom > 0 ? camera.zoom : 1;
  const zoom = clamp(rawZoom, minZoomFor(viewportWidth, pageWidth), EXCALIDRAW_MAX_ZOOM);

  const visibleWidth =
    Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth / zoom : pageWidth;

  let scrollX: number;
  if (visibleWidth > pageWidth + CAMERA_EPSILON) {
    // Khung nhìn rộng hơn cả trang — chỉ xảy ra khi sàn MIN_ZOOM của
    // Excalidraw không cho zoom vào đủ sâu. Không có khoảng kẹp hợp lệ
    // (cận dưới vượt cận trên), nên căn giữa trang thay vì trả về rác.
    scrollX = (visibleWidth - pageWidth) / 2;
  } else {
    scrollX = clamp(camera.scrollX, visibleWidth - pageWidth, 0);
  }

  // Mép trên cứng, bên dưới vô tận.
  const scrollY = Number.isFinite(camera.scrollY) ? Math.min(camera.scrollY, 0) : 0;

  return { scrollX, scrollY, zoom };
}

/** Hai camera có coi như trùng nhau không (xem `CAMERA_EPSILON`). */
export function sameCamera(a: Camera, b: Camera): boolean {
  return (
    Math.abs(a.scrollX - b.scrollX) < CAMERA_EPSILON &&
    Math.abs(a.scrollY - b.scrollY) < CAMERA_EPSILON &&
    Math.abs(a.zoom - b.zoom) < CAMERA_EPSILON
  );
}

/**
 * Có element nào nằm ngoài trang không — tức giáo viên sẽ không kéo tới xem
 * được chừng nào nền kẻ dòng còn bật.
 *
 * Chỉ chặn ba phía có vách. Kéo xuống sâu bao nhiêu cũng hợp lệ.
 */
export function isOutsidePage(
  elements: readonly PageElement[],
  pageWidth: number = PAPER_PAGE_WIDTH,
): boolean {
  for (const el of elements) {
    if (el.isDeleted) continue;
    if (el.x < -CAMERA_EPSILON) return true;
    if (el.y < -CAMERA_EPSILON) return true;
    if (el.x + el.width > pageWidth + CAMERA_EPSILON) return true;
  }
  return false;
}
```

- [ ] **Step 4: Chạy test**

Run: `npm test -- pageCamera`
Expected: PASS — toàn bộ file xanh.

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: cả hai sạch.

- [ ] **Step 6: Commit**

```bash
git branch --show-current   # phải là feature/trang-giay-camera
git add src/ui/pageCamera.ts src/ui/__tests__/pageCamera.test.ts
git commit -m "feat(paper): toán ràng buộc camera cho trang giấy

Hàm thuần, chưa nối vào đâu: minZoomFor, clampCamera, sameCamera,
isOutsidePage. Ba ràng buộc suy từ phép quy đổi scene→screen của
Excalidraw: scrollX ≤ 0, scrollX ≥ w/zoom − pageWidth, zoom ≥ w/pageWidth;
mép trên scrollY ≤ 0, bên dưới vô tận.

Hai ca biên có test riêng vì cả hai đều hỏng câm: sai số dấu phẩy động sinh
vòng lặp kẹp-rồi-ghi vô tận (CAMERA_EPSILON), và khung nhìn rộng hơn trang
làm cận dưới vượt cận trên nên phải căn giữa thay vì kẹp."
```

---

### Task 3: Nối ràng buộc vào bảng thật

**Files:**
- Create: `src/ui/usePageCamera.ts`
- Modify: `src/ui/PaperBackground.tsx`
- Test: `tests/e2e/paper-background.spec.ts`

**Interfaces:**
- Consumes: `clampCamera`, `sameCamera`, `minZoomFor`, `type Camera` từ `src/ui/pageCamera.ts` (Task 2).
- Produces: `usePageCamera(api: ExApi | null, enabled: boolean, layerRef: RefObject<HTMLElement | null>): void`

- [ ] **Step 1: Viết `usePageCamera.ts`**

```ts
'use client';

import { useEffect, type RefObject } from 'react';

import { clampCamera, sameCamera, type Camera } from './pageCamera';

 
type ExApi = any;

/**
 * Giữ camera của Excalidraw trong biên trang giấy.
 *
 * VÌ SAO KẸP SAU LẠI CHẠY ĐƯỢC: Excalidraw cập nhật camera cộng dồn từ
 * state hiện tại (`scrollX: this.state.scrollX - dx / this.state.zoom.value`
 * trong dist/prod/index.js), không phải từ gốc cử chỉ. Nên ghi giá trị đã
 * kẹp ngược vào state thì sự kiện kế tiếp tính TỪ giá trị đã kẹp — được
 * vách cứng, không giằng co. Nếu upstream đổi sang `originScroll + tổngDelta`
 * thì vách sẽ rung suốt lúc kéo và cách này phải bỏ.
 *
 * Không có cờ "đang tự ghi" nào cả: sau khi kẹp, camera đã nằm trong biên
 * nên lần gọi lại là no-op nhờ `sameCamera`. Đó là toàn bộ cơ chế chống dội.
 */
export function usePageCamera(
  api: ExApi | null,
  enabled: boolean,
  layerRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!api || !enabled) return;

    const clampNow = () => {
      let state: {
        scrollX?: number;
        scrollY?: number;
        zoom?: { value?: number };
        width?: number;
      } | null = null;
      try {
        state = api.getAppState?.() ?? null;
      } catch {
        // Excalidraw đã unmount trước ta.
        return;
      }
      if (!state) return;

      const current: Camera = {
        scrollX: state.scrollX ?? 0,
        scrollY: state.scrollY ?? 0,
        zoom: state.zoom?.value ?? 1,
      };
      const next = clampCamera(current, state.width ?? 0);
      if (sameCamera(current, next)) return;

      try {
        // captureUpdate 'NEVER': kéo camera về trong trang là hiển thị,
        // không phải thao tác vẽ — đừng chiếm một bậc undo của giáo viên.
        api.updateScene?.({
          appState: {
            scrollX: next.scrollX,
            scrollY: next.scrollY,
            zoom: { value: next.zoom },
          },
          captureUpdate: 'NEVER',
        });
      } catch {
        /* API chưa sẵn sàng — lần sự kiện sau sẽ thử lại. */
      }
    };

    // Lúc vừa bật, camera gần như luôn nằm ngoài biên (bảng đang zoom tự do).
    clampNow();

    const unsubscribe = api.onScrollChange?.(clampNow);

    // Cửa sổ co giãn KHÔNG đổi scrollY ⇒ onScrollChange không bắn ⇒ minZoom
    // mới không được áp và camera lặng lẽ nằm ngoài biên. Phải quan sát riêng.
    let observer: ResizeObserver | undefined;
    const layer = layerRef.current;
    if (layer && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(clampNow);
      observer.observe(layer);
    }

    return () => {
      unsubscribe?.();
      observer?.disconnect();
    };
  }, [api, enabled, layerRef]);
}
```

- [ ] **Step 2: Gọi hook trong `PaperBackground.tsx`**

Thêm import ở đầu tệp:

```ts
import { usePageCamera } from './usePageCamera';
```

Rồi thêm một dòng ngay SAU `const layerRef = useRef<HTMLDivElement | null>(null);` và TRƯỚC `useEffect` sẵn có:

```ts
  // PHẢI đứng trước early-return `style === 'none'` bên dưới — hook không
  // được gọi có điều kiện.
  usePageCamera(api, style !== 'none', layerRef);
```

- [ ] **Step 3: Chạy unit test hiện có để chắc không vỡ gì**

Run: `npm test`
Expected: PASS toàn bộ. Mock Excalidraw trong `Whiteboard.test.tsx` trả `width: 800`, `zoom 1`, `scrollX/Y 0` — nằm trong biên (minZoom = 800/1440 = 0.56 < 1) nên `updateScene` không bị gọi thêm và các ca `wb-paper-*` sẵn có giữ nguyên kết quả. Mock cũng không có `onScrollChange` và jsdom không có `ResizeObserver` — cả hai đều đã được optional-chaining và `typeof` che.

- [ ] **Step 4: Thêm ca e2e cho từng vách**

Trong `tests/e2e/paper-background.spec.ts`, thêm helper đọc camera ngay dưới `readLayerStyle`:

```ts
async function readCamera(page: Page) {
  return page.evaluate(() => {
    const st = window.__wbApi.getAppState();
    return {
      scrollX: st.scrollX as number,
      scrollY: st.scrollY as number,
      zoom: st.zoom.value as number,
      width: st.width as number,
    };
  });
}

/** Bề rộng trang, khớp PAPER_PAGE_WIDTH. */
const PAGE_WIDTH = 1440;
```

Thay ca `'zoom nhỏ hết cỡ thì tắt dòng kẻ thay vì bôi thành mảng xám'` (dòng 171-194) bằng ba ca dưới đây. Ca cũ phải đi: khi nền kẻ dòng bật, sàn zoom mới khiến `zoom = 0.15` không còn đạt tới được, nên tiền đề của nó không tồn tại nữa. Nhánh ẩn-khi-quá-dày vẫn còn và vẫn được `paperStyle.test.ts` phủ.

```ts
  test('kéo sang phải thì dừng ở mép phải trang', async ({ page }) => {
    await page.goto('/');
    await waitForBoard(page);
    await togglePaper(page);

    await page.mouse.move(600, 400);
    // Shift+wheel = cuộn ngang trong Excalidraw. Đẩy thật lực rồi xem nó dừng ở đâu.
    await page.keyboard.down('Shift');
    for (let i = 0; i < 50; i++) await page.mouse.wheel(0, 200);
    await page.keyboard.up('Shift');

    const cam = await readCamera(page);
    // Vách phải: scrollX ≥ width/zoom − PAGE_WIDTH.
    expect(cam.scrollX).toBeGreaterThan(cam.width / cam.zoom - PAGE_WIDTH - 1);
    expect(cam.scrollX).toBeCloseTo(cam.width / cam.zoom - PAGE_WIDTH, 0);
  });

  test('kéo sang trái thì dừng ở mép trái trang, cuộn lên dừng ở đỉnh', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForBoard(page);
    await togglePaper(page);

    await page.mouse.move(600, 400);
    await page.keyboard.down('Shift');
    for (let i = 0; i < 50; i++) await page.mouse.wheel(0, -200);
    await page.keyboard.up('Shift');
    for (let i = 0; i < 50; i++) await page.mouse.wheel(0, -200);

    const cam = await readCamera(page);
    expect(cam.scrollX).toBeCloseTo(0, 0);
    expect(cam.scrollY).toBeCloseTo(0, 0);
  });

  test('zoom out dừng khi trang khít bề ngang, dòng kẻ vẫn hiện', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForBoard(page);
    await togglePaper(page);

    // Bơm thẳng một mức zoom phi lý; ràng buộc phải kéo nó lên sàn.
    await page.evaluate(() => {
      window.__wbApi.updateScene({
        appState: { zoom: { value: 0.15 } },
        captureUpdate: 'NEVER',
      });
    });
    await page.waitForFunction(
      () => window.__wbApi.getAppState().zoom.value > 0.5,
      null,
      { timeout: 5_000 },
    );

    const cam = await readCamera(page);
    expect(cam.zoom).toBeCloseTo(cam.width / PAGE_WIDTH, 2);
    // Ở sàn zoom, trang phủ đúng bề ngang ⇒ không kéo ngang đi đâu được.
    expect(cam.scrollX).toBeCloseTo(0, 0);
    // Và dòng kẻ vẫn phải THẤY được — sàn zoom giữ khoảng cách trên ngưỡng 8px.
    expect(await countLinePixels(page)).toBeGreaterThan(2000);
  });

  test('tắt nền kẻ dòng thì bảng tự do trở lại', async ({ page }) => {
    await page.goto('/');
    await waitForBoard(page);
    await togglePaper(page);
    await togglePaper(page);

    await page.mouse.move(600, 400);
    await page.keyboard.down('Shift');
    for (let i = 0; i < 30; i++) await page.mouse.wheel(0, 200);
    await page.keyboard.up('Shift');

    const cam = await readCamera(page);
    // Không còn vách: kéo được quá mép phải của trang.
    expect(cam.scrollX).toBeLessThan(cam.width / cam.zoom - PAGE_WIDTH - 1);
  });
```

- [ ] **Step 5: Chạy e2e**

Run: `npx playwright test tests/e2e/paper-background.spec.ts`
Expected: PASS toàn bộ 6 ca.

Nếu ca "kéo sang phải" đỏ vì `Shift+wheel` không cuộn ngang trong bản Excalidraw này, đổi sang kéo bằng chuột giữa hoặc `page.mouse.wheel(200, 0)` (deltaX) và chạy lại — điều cần khẳng định là **scrollX dừng ở vách**, không phải cách đẩy nó tới đó.

- [ ] **Step 6: Đối chứng âm — gỡ ràng buộc phải làm test đỏ**

Run: `npx playwright test tests/e2e/paper-background.spec.ts -g "mép phải"` sau khi tạm đổi `usePageCamera` thành no-op (`if (!api || !enabled) return;` → `return;` ở đầu effect).
Expected: FAIL.

Rồi hoàn nguyên (dùng `git diff` để chắc đã trả đúng, KHÔNG dùng `git checkout` cho tệp chưa commit) và chạy lại: PASS.

- [ ] **Step 7: Commit**

```bash
git branch --show-current   # phải là feature/trang-giay-camera
git add src/ui/usePageCamera.ts src/ui/PaperBackground.tsx tests/e2e/paper-background.spec.ts
git commit -m "feat(paper): vách trang — khóa kéo ngang và zoom out khi bật nền kẻ dòng

Kẹp camera sau mỗi onScrollChange rồi ghi ngược qua updateScene. Chạy được
vì Excalidraw cập nhật camera cộng dồn từ state hiện tại, nên sự kiện kế
tiếp tính từ giá trị đã kẹp thay vì ghi đè nó.

ResizeObserver là bắt buộc chứ không thừa: cửa sổ co giãn không đổi scrollY
nên onScrollChange không bắn, minZoom mới không được áp và camera lặng lẽ
nằm ngoài biên.

Bỏ ca e2e 'zoom nhỏ hết cỡ thì tắt dòng kẻ': sàn zoom mới làm zoom 0.15
không còn đạt tới được khi nền kẻ dòng bật, tiền đề của ca đó không còn.
Nhánh ẩn-khi-quá-dày vẫn do paperStyle.test.ts phủ."
```

---

### Task 4: Dải cảnh báo nội dung ngoài trang

**Files:**
- Create: `src/ui/OffPageNotice.tsx`
- Modify: `src/ui/paperBackground.css`
- Modify: `src/Whiteboard.tsx`
- Test: `src/ui/__tests__/OffPageNotice.test.tsx`

**Interfaces:**
- Consumes: `isOutsidePage`, `type PageElement` từ `src/ui/pageCamera.ts` (Task 2).
- Produces: `<OffPageNotice api={api} enabled={boolean} />`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/ui/__tests__/OffPageNotice.test.tsx`:

```tsx
import { act, render } from '@testing-library/react';

import { OffPageNotice } from '../OffPageNotice';

/** API Excalidraw giả, đủ cho những gì OffPageNotice chạm vào. */
function fakeApi(elements: unknown[]) {
  const listeners: Array<() => void> = [];
  return {
    api: {
      getSceneElements: () => elements,
      onChange: (cb: () => void) => {
        listeners.push(cb);
        return () => {
          const i = listeners.indexOf(cb);
          if (i >= 0) listeners.splice(i, 1);
        };
      },
    },
    fire: () => listeners.forEach((cb) => cb()),
    listenerCount: () => listeners.length,
  };
}

const inside = [{ x: 10, y: 10, width: 100, height: 100 }];
const outside = [{ x: -500, y: 10, width: 100, height: 100 }];

describe('OffPageNotice', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('tắt nền kẻ dòng thì không bao giờ hiện', () => {
    const { api } = fakeApi(outside);
    const { container } = render(<OffPageNotice api={api} enabled={false} />);
    expect(container.querySelector('.wb-offpage-notice')).toBeNull();
  });

  test('bật mà mọi thứ nằm trong trang thì im lặng', () => {
    const { api } = fakeApi(inside);
    const { container } = render(<OffPageNotice api={api} enabled />);
    expect(container.querySelector('.wb-offpage-notice')).toBeNull();
  });

  test('bật mà có nội dung ngoài trang thì báo ngay', () => {
    const { api } = fakeApi(outside);
    const { container } = render(<OffPageNotice api={api} enabled />);
    const notice = container.querySelector('.wb-offpage-notice');
    expect(notice).not.toBeNull();
    expect(notice!.textContent).toContain('ngoài trang');
    expect(notice!.getAttribute('aria-live')).toBe('polite');
  });

  test('nội dung chèn SAU khi bật cũng được bắt, sau khi hết tiết lưu', () => {
    const elements: unknown[] = [...inside];
    const { api, fire } = fakeApi(elements);
    const { container } = render(<OffPageNotice api={api} enabled />);
    expect(container.querySelector('.wb-offpage-notice')).toBeNull();

    // Giáo viên import một trang PDF quá khổ.
    elements.push({ x: 2000, y: 10, width: 800, height: 600 });
    act(() => {
      fire();
    });
    // Chưa tới hạn tiết lưu thì chưa dò lại.
    expect(container.querySelector('.wb-offpage-notice')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(container.querySelector('.wb-offpage-notice')).not.toBeNull();
  });

  test('unmount thì gỡ listener và không còn hẹn giờ treo', () => {
    const { api, fire, listenerCount } = fakeApi([...inside]);
    const { unmount } = render(<OffPageNotice api={api} enabled />);
    act(() => {
      fire();
    });
    unmount();
    expect(listenerCount()).toBe(0);
    // Hẹn giờ còn treo sẽ setState sau unmount → React cảnh báo. Không được có.
    expect(() => jest.advanceTimersByTime(1000)).not.toThrow();
  });
});
```

- [ ] **Step 2: Chạy để xác nhận đỏ**

Run: `npm test -- OffPageNotice`
Expected: FAIL — `Cannot find module '../OffPageNotice'`.

- [ ] **Step 3: Viết `OffPageNotice.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';

import './paperBackground.css';
import { isOutsidePage, type PageElement } from './pageCamera';

 
type ExApi = any;

/** Dò lại nhiều nhất một lần mỗi ngần này ms. */
const CHECK_THROTTLE_MS = 500;

export interface OffPageNoticeProps {
  api: ExApi | null;
  /** Nền kẻ dòng có đang bật không. Tắt thì không có vách, không có gì để báo. */
  enabled: boolean;
}

/**
 * Báo cho giáo viên biết có nét vẽ nằm ngoài trang.
 *
 * Vách trang là vách CỨNG: nội dung ngoài trang không kéo tới xem được
 * chừng nào nền kẻ dòng còn bật. Ta cố ý KHÔNG tự thu nhỏ hay dịch nội dung
 * về trong trang — đó là scene của giáo viên, sửa hộ là ghi đè công sức của
 * họ. Chỉ nói ra rồi để họ quyết.
 *
 * Dò liên tục có tiết lưu chứ không chỉ lúc bật: ảnh PDF import SAU khi đã
 * bật cũng có thể rơi ra ngoài trang.
 */
export function OffPageNotice({ api, enabled }: OffPageNoticeProps) {
  const [outside, setOutside] = useState(false);

  useEffect(() => {
    if (!api || !enabled) {
      setOutside(false);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = () => {
      try {
        const elements = (api.getSceneElements?.() ?? []) as PageElement[];
        setOutside(isOutsidePage(elements));
      } catch {
        /* API chưa sẵn sàng — lần đổi scene sau sẽ thử lại. */
      }
    };

    check();

    const unsubscribe = api.onChange?.(() => {
      if (timer !== undefined) return;
      timer = setTimeout(() => {
        timer = undefined;
        check();
      }, CHECK_THROTTLE_MS);
    });

    return () => {
      unsubscribe?.();
      // Hẹn giờ còn treo sẽ setState sau unmount nếu không dọn.
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [api, enabled]);

  if (!enabled || !outside) return null;

  return (
    <div className="wb-offpage-notice" role="status" aria-live="polite">
      Có nội dung nằm ngoài trang. Tắt nền kẻ dòng để xem.
    </div>
  );
}
```

- [ ] **Step 4: Thêm style vào `paperBackground.css`**

Nối vào cuối tệp:

```css
/* Dải báo nội dung ngoài trang. Nổi trên bảng, không cản thao tác. */
.wb-offpage-notice {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 5;
  pointer-events: none;

  max-width: min(90%, 420px);
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #f0c674;
  background: #fdf6e3;
  color: #6b4e00;
  font-size: 13px;
  line-height: 1.4;
  text-align: center;
  box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
}

.theme--dark .wb-offpage-notice {
  border-color: #6b5a2a;
  background: #2a2418;
  color: #e8d9a8;
}
```

- [ ] **Step 5: Render trong `Whiteboard.tsx`**

Thêm import cạnh `PaperBackground`:

```ts
import { OffPageNotice } from './ui/OffPageNotice';
```

Rồi thêm ngay SAU `<PdfImporterButton enabled={!readOnly} onPick={handlePdfPick} />`:

```tsx
      <OffPageNotice api={api} enabled={paperStyle !== 'none'} />
```

- [ ] **Step 6: Chạy toàn bộ gate**

Run: `npm test && npm run typecheck && npm run lint`
Expected: cả ba sạch.

- [ ] **Step 7: Commit**

```bash
git branch --show-current   # phải là feature/trang-giay-camera
git add src/ui/OffPageNotice.tsx src/ui/__tests__/OffPageNotice.test.tsx src/ui/paperBackground.css src/Whiteboard.tsx
git commit -m "feat(paper): báo khi có nội dung nằm ngoài trang

Vách trang là vách cứng nên nét vẽ ngoài trang không kéo tới xem được. Cố ý
KHÔNG tự dịch nội dung về trong trang — đó là scene của giáo viên. Chỉ nói ra.

Dò liên tục có tiết lưu 500ms chứ không chỉ lúc bật, để ảnh PDF import sau
khi đã bật cũng được cảnh báo."
```

---

### Task 5: Ghi lại điều đã học và đóng nhánh

**Files:**
- Modify: `CLAUDE.md:234`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: toàn bộ Task 1-4.
- Produces: không có mã.

- [ ] **Step 1: Sửa gạch đầu dòng nền giấy trong `CLAUDE.md`**

Ở dòng 234, câu `Quy đổi \`screenY = (sceneY - scrollY) * zoom\`, chỉ phụ thuộc \`scrollY\`` đang **nói sai sự thật**. Thay cả cụm đó bằng:

```
Quy đổi `screenY = (sceneY + scrollY) * zoom` — **dấu CỘNG**, đọc từ
`sceneCoordsToViewportCoords` (`dist/dev/chunk-4FTI6OG3.js:1329`); bản đầu
viết dấu trừ nên dòng kẻ trượt ngược nội dung, và test không bắt được vì nó
chép lại chính công thức sai đó rồi so với nó (sửa 2026-08-31).
```

- [ ] **Step 2: Thêm gạch đầu dòng mới cho ràng buộc camera**

Ngay dưới gạch đầu dòng nền giấy:

```
- **Trang giấy = ràng buộc CAMERA, không phải vẽ thêm**: nền kẻ dòng bật thì
  bảng thành trang bề rộng `PAPER_PAGE_WIDTH` (1440 đơn vị scene), mép trên
  cứng, bên dưới vô tận. Excalidraw 0.18 **không có** `scrollConstraints` (grep
  `dist/`), nên tự kẹp: `src/ui/pageCamera.ts` (hàm thuần) + `usePageCamera.ts`
  (nghe `onScrollChange`, ghi ngược bằng `updateScene` + `captureUpdate:'NEVER'`).
  **Chạy được là nhờ Excalidraw cập nhật camera CỘNG DỒN từ state hiện tại**
  (`scrollX: this.state.scrollX - dx/zoom`) chứ không từ gốc cử chỉ — ghi giá
  trị đã kẹp vào thì sự kiện kế tiếp tính từ đó, được vách cứng thay vì rung.
  Bump 0.19 phải kiểm lại điểm này trước tiên. Ba bẫy đã trả giá: (1) không có
  epsilon khi so camera trước lúc ghi ⇒ sai số dấu phẩy động đẻ vòng lặp vô
  tận; (2) `ResizeObserver` là BẮT BUỘC vì cửa sổ co giãn không đổi `scrollY`
  nên `onScrollChange` không bắn và `minZoom` mới không được áp; (3) khung nhìn
  rộng hơn cả trang (sàn `MIN_ZOOM` 0.1 chặn) làm cận dưới vượt cận trên ⇒ phải
  căn giữa thay vì `clamp` bậy. Sàn zoom cũng làm nhánh ẩn-khi-dày-quá của
  `paperMetrics` thành không đạt tới được trên màn ≥360px.
```

- [ ] **Step 3: Thêm mục CHANGELOG**

Chèn ngay dưới dòng `# Changelog`:

```markdown
## Chưa phát hành

### Trang giấy có vách cho nền kẻ dòng

Bật nền kẻ dòng giờ biến bảng thành một trang giấy thật: bề ngang có giới hạn,
kéo sang trái/phải dừng ở mép trang, zoom out dừng lại khi trang vừa khít màn
hình. Chỉ còn cuộn xuống là vô hạn, và có mép trên nên luôn quay về đầu trang
được. Tắt nền kẻ dòng thì bảng trở lại canvas vô tận như cũ.

Nội dung nằm ngoài trang (ảnh PDF quá khổ, hoặc bảng vẽ tự do từ trước) không
bị dịch chuyển gì — bảng chỉ báo một dải nhắc tắt nền kẻ dòng để xem.

**Sửa lỗi:** dòng kẻ trước đây trôi *ngược* chiều với nội dung khi cuộn dọc, do
`paperMetrics` dùng sai dấu của `scrollY`.
```

- [ ] **Step 4: Chạy toàn bộ gate lần cuối**

Run: `npm test && npm run typecheck && npm run lint && npx playwright test tests/e2e/paper-background.spec.ts`
Expected: cả bốn xanh.

- [ ] **Step 5: Commit**

```bash
git branch --show-current   # phải là feature/trang-giay-camera
git add CLAUDE.md CHANGELOG.md
git commit -m "docs: ghi lại ràng buộc camera trang giấy + sửa câu nói sai về dấu scrollY

CLAUDE.md đang khẳng định screenY = (sceneY - scrollY) * zoom, ngược với
Excalidraw. Sửa lại kèm nguồn đọc được, và ghi ba bẫy của tầng ràng buộc
camera để lần bump 0.19 biết phải kiểm gì trước."
```

---

## Self-Review

**Spec coverage:**

| Yêu cầu trong spec | Task |
|---|---|
| Sửa dấu `paperMetrics` | Task 1, Step 3 |
| Thay phép đo tautology bằng đo pixel độc lập | Task 1, Step 6-7 |
| Hằng `PAPER_PAGE_WIDTH = 1440` | Task 1, Step 5 |
| `minZoom = width / PAPER_PAGE_WIDTH` | Task 2 (`minZoomFor`) |
| `scrollX` kẹp hai vách | Task 2 (`clampCamera`) |
| `scrollY ≤ 0`, dưới vô tận | Task 2 (`clampCamera`) |
| Ca biên epsilon | Task 2, test `sameCamera` + `CAMERA_EPSILON` |
| Ca biên khung hẹp hơn `MIN_ZOOM` | Task 2, test "căn giữa" |
| Ca biên `ResizeObserver` | Task 3, trong `usePageCamera` |
| Kẹp qua `onScrollChange` + `captureUpdate:'NEVER'` | Task 3 |
| CSS không đổi cho lớp nền | Task 3 (chỉ sửa `PaperBackground.tsx`, không đụng `paperBackground.css` phần nền) |
| Dải cảnh báo ngoài trang, tiết lưu | Task 4 |
| Không tự sửa scene giáo viên | Task 4, ghi trong doc-comment |
| E2E: dòng kẻ dính nội dung | Task 1, Step 6 |
| E2E: chạm vách phải / trái / trên | Task 3, Step 4 |
| E2E: sàn zoom | Task 3, Step 4 |
| E2E: tắt thì tự do trở lại | Task 3, Step 4 |
| Ràng buộc chỉ sống khi bật | Task 3 (`enabled`), Task 4 (`enabled`) |

Không có mục nào trong spec thiếu task.

**Placeholder scan:** không có "TBD"/"TODO"/"tương tự Task N". Mọi bước có mã đều kèm mã thật.

**Type consistency:** `Camera`, `PageElement`, `minZoomFor`, `clampCamera`, `sameCamera`, `isOutsidePage`, `CAMERA_EPSILON`, `EXCALIDRAW_MIN_ZOOM`, `EXCALIDRAW_MAX_ZOOM` khai ở Task 2 và dùng nguyên tên đó ở Task 3-4. `usePageCamera(api, enabled, layerRef)` khai ở Task 3 Step 1, gọi đúng ba tham số ở Step 2. `OffPageNotice` nhận `{api, enabled}` ở Task 4 Step 3, render đúng hai prop đó ở Step 5. `PAPER_PAGE_WIDTH` khai ở Task 1, import ở Task 2.

**Một điều chỉnh phát hiện lúc tự soát:** ca test "khung nhìn hẹp hơn sàn zoom cho phép" ban đầu định dùng khung 100px với trang 1440 — nhưng ở sàn `MIN_ZOOM = 0.1`, khung 100px thấy 1000 đơn vị scene, vẫn nhỏ hơn 1440 nên *vẫn vừa*, không kích hoạt được nhánh căn giữa. Đã đổi sang truyền `pageWidth` nhỏ (500) với khung 1000 để ép đúng nhánh đó. Comment trong test ghi lại lý do.
