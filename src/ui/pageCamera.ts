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
 *   vách trái   -scrollX ≥ 0                  → scrollX ≤ 0
 *   vách phải   -scrollX + w/zoom ≤ pageWidth → scrollX ≥ w/zoom - pageWidth
 *   tồn tại khi w/zoom ≤ pageWidth            → zoom ≥ w/pageWidth
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
  return clamp(
    viewportWidth / pageWidth,
    EXCALIDRAW_MIN_ZOOM,
    EXCALIDRAW_MAX_ZOOM,
  );
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
  const rawZoom =
    Number.isFinite(camera.zoom) && camera.zoom > 0 ? camera.zoom : 1;
  const zoom = clamp(
    rawZoom,
    minZoomFor(viewportWidth, pageWidth),
    EXCALIDRAW_MAX_ZOOM,
  );

  const visibleWidth =
    Number.isFinite(viewportWidth) && viewportWidth > 0
      ? viewportWidth / zoom
      : pageWidth;

  let scrollX: number;
  if (visibleWidth > pageWidth + CAMERA_EPSILON) {
    // Khung nhìn rộng hơn cả trang — không có khoảng kẹp hợp lệ (cận dưới
    // vượt cận trên), nên căn giữa trang thay vì trả về rác.
    scrollX = (visibleWidth - pageWidth) / 2;
  } else {
    scrollX = clamp(camera.scrollX, visibleWidth - pageWidth, 0);
  }

  // Mép trên cứng, bên dưới vô tận.
  const scrollY = Number.isFinite(camera.scrollY)
    ? Math.min(camera.scrollY, 0)
    : 0;

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
