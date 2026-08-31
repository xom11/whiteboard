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

describe('clampCamera — khung nhìn rộng hơn cả trang', () => {
  /*
   * Nhánh căn giữa chỉ với tới được khi TRẦN MAX_ZOOM chặn, không phải sàn.
   *
   * `minZoomFor` đã bảo đảm `zoom ≥ w/pageWidth`, tức `visibleWidth ≤ pageWidth`
   * — trang luôn vừa. Trừ khi `w/pageWidth > MAX_ZOOM`: lúc đó zoom bị chặn ở
   * 30, `visibleWidth = w/30` vẫn lớn hơn trang, cận dưới của scrollX vượt cận
   * trên, và `clamp(x, low, high)` với `low > high` trả về `high` — tức dán
   * cứng vào mép trái thay vì căn giữa.
   *
   * Sàn MIN_ZOOM thì KHÔNG với tới được: `w/pageWidth < 0.1` nghĩa là
   * `pageWidth > 10w`, mà `visibleWidth = w/0.1 = 10w < pageWidth` — vẫn vừa.
   *
   * Với PAPER_PAGE_WIDTH = 1440 thật thì cần khung > 43200px mới chạm nhánh
   * này. Giữ lại vì nó là hàm thuần có tham số `pageWidth`, và vì `clamp` với
   * biên đảo ngược là loại lỗi trả về số trông-hợp-lý nên không ai để ý.
   */
  const W = 1000;
  const NARROW_PAGE = 10; // W/NARROW_PAGE = 100 > MAX_ZOOM 30
  const visibleWidth = W / EXCALIDRAW_MAX_ZOOM; // 33.33

  test('trần MAX_ZOOM chặn thì căn giữa trang thay vì dán vào mép', () => {
    const out = clampCamera({ scrollX: -9999, scrollY: 0, zoom: 1 }, W, NARROW_PAGE);
    expect(out.zoom).toBe(EXCALIDRAW_MAX_ZOOM);
    // Căn giữa: -scrollX + visible/2 = page/2 ⇒ scrollX = (visible - page)/2
    expect(out.scrollX).toBeCloseTo((visibleWidth - NARROW_PAGE) / 2);
  });

  test('căn giữa cho ra lề đối xứng hai bên trang', () => {
    const out = clampCamera({ scrollX: 0, scrollY: 0, zoom: 1 }, W, NARROW_PAGE);
    const visibleLeft = -out.scrollX;
    const visibleRight = visibleLeft + visibleWidth;
    expect(0 - visibleLeft).toBeCloseTo(visibleRight - NARROW_PAGE);
  });

  test('kéo hướng nào cũng ra cùng một chỗ — không còn bậc tự do ngang', () => {
    const left = clampCamera({ scrollX: 9999, scrollY: 0, zoom: 1 }, W, NARROW_PAGE);
    const right = clampCamera({ scrollX: -9999, scrollY: 0, zoom: 1 }, W, NARROW_PAGE);
    expect(sameCamera(left, right)).toBe(true);
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
    x,
    y,
    width,
    height,
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
