/**
 * Nền giấy kẻ dòng cho bảng — phần logic thuần (không React, không DOM).
 *
 * Nền KHÔNG phải element trong scene: nó là một lớp CSS nằm sau canvas
 * Excalidraw (xem `PaperBackground.tsx`). Đổi lại, nó không xuất hiện khi
 * export ảnh — chấp nhận có chủ ý: giữ scene sạch, không có gì để học
 * sinh lỡ tay kéo/xoá, và không đụng tới serialize/persistence.
 */

export type PaperStyle = 'none' | 'lined';

/** Mặc định: bảng trắng trơn, y hệt trước khi có tính năng này. */
export const DEFAULT_PAPER_STYLE: PaperStyle = 'none';

/**
 * Khoá cố định, KHÔNG kèm `storageKey` của scene — kiểu nền là sở thích
 * người dùng trên máy này, không phải nội dung bảng (cùng lý lẽ với
 * `TOOLBAR_POSITION_STORAGE_KEY`).
 */
export const PAPER_STYLE_STORAGE_KEY = 'whiteboard:paper-bg';

/** Khoảng cách hai dòng kẻ, tính bằng đơn vị scene (không phải px). */
export const PAPER_LINE_HEIGHT = 32;

/**
 * Bề rộng trang giấy, đơn vị scene (= 45 dòng kẻ).
 *
 * Là hằng số trong KHÔNG GIAN SCENE chứ không phải px màn hình: bảng được
 * lưu rồi mở lại trên máy khác vẫn phải ra đúng bố cục. Zoom out tối đa
 * được suy ra từ nó (`minZoomFor` trong `pageCamera.ts`) chứ không đặt tay.
 */
export const PAPER_PAGE_WIDTH = 1440;

/**
 * Zoom nhỏ tới mức hai dòng kẻ cách nhau dưới ngần này px thì tắt hẳn:
 * dày quá sẽ thành một mảng xám đục, che mất nét vẽ.
 */
export const PAPER_MIN_GAP_PX = 8;

const PAPER_STYLES: readonly PaperStyle[] = ['none', 'lined'];

export interface PaperMetrics {
  /** false thì ẩn lớp nền đi (zoom quá nhỏ, hoặc zoom không hợp lệ). */
  visible: boolean;
  /** Khoảng cách dòng kẻ trên màn hình, px — dùng cho `background-size`. */
  sizePx: number;
  /** Dịch dòng kẻ đầu tiên, px — dùng cho `background-position-y`. */
  offsetPx: number;
}

/**
 * Quy đổi vị trí cuộn + zoom của Excalidraw thành hai con số CSS.
 *
 * Excalidraw đặt điểm scene `sceneY` lên màn hình tại
 * `screenY = (sceneY + scrollY) * zoom + offsetTop` — dấu CỘNG, đọc từ
 * `sceneCoordsToViewportCoords` (dist/dev/chunk-4FTI6OG3.js:1329). Đừng
 * tin trí nhớ ở chỗ này: bản đầu tiên của tính năng viết dấu trừ và dòng
 * kẻ trượt ngược nội dung, vì test chép lại chính công thức sai đó rồi so
 * với nó nên không bao giờ đỏ được.
 *
 * `offsetTop` triệt tiêu: `.wb-paper-layer` là `position:absolute;inset:0`
 * trong cùng hộp với container Excalidraw nên hai hệ có chung gốc.
 *
 * Dòng kẻ nằm ở mọi `sceneY = k * lineHeight`, nên chỉ cần lấy phần dư để
 * biết dòng đầu tiên rơi vào đâu — pattern CSS lặp lo phần còn lại, kể cả
 * khi người dùng cuộn vô tận.
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

function isPaperStyle(value: unknown): value is PaperStyle {
  return (
    typeof value === 'string' && PAPER_STYLES.includes(value as PaperStyle)
  );
}

/** Đọc lựa chọn đã lưu. Mọi trục trặc đều rơi về mặc định. */
export function loadPaperStyle(storage: Storage | null): PaperStyle {
  if (!storage) return DEFAULT_PAPER_STYLE;
  try {
    const raw = storage.getItem(PAPER_STYLE_STORAGE_KEY);
    return isPaperStyle(raw) ? raw : DEFAULT_PAPER_STYLE;
  } catch {
    // Safari private mode / storage bị chặn.
    return DEFAULT_PAPER_STYLE;
  }
}

/** Lưu lựa chọn. Nuốt lỗi: không đáng để làm vỡ cả bảng. */
export function savePaperStyle(
  style: PaperStyle,
  storage: Storage | null,
): void {
  if (!storage) return;
  try {
    storage.setItem(PAPER_STYLE_STORAGE_KEY, style);
  } catch {
    /* ignore */
  }
}
