/**
 * Thang độ dày nét cho thanh trượt (thay hàng 3 nút thin/bold/extraBold).
 *
 * Excalidraw 0.18 khoá cứng 3 mức `STROKE_WIDTH = {thin:1, bold:2, extraBold:4}`
 * (`dist/dev/chunk-4FTI6OG3.js:366`) và `actionChangeStrokeWidth` render đúng 3
 * nút đó — `UIOptions` không có chỗ nào thêm mức. Nhưng `strokeWidth` chỉ là
 * một con số trên element/appState, KHÔNG bị clamp ở đâu, nên đặt giá trị
 * ngoài bộ ba là hợp lệ.
 *
 * Vì sao cần mức mảnh hơn: bút vẽ tay (freedraw) được Excalidraw nhân
 * `strokeWidth * 4.25` khi dựng đường (`getFreeDrawSvgPath`,
 * `chunk-4FTI6OG3.js:9320`) — nên mức "thin" cũ (=1) ra nét ~4.25px, đậm hơn
 * hẳn shape/line cùng giá trị (roughjs vẽ đúng 1px). Đó là lý do GV thấy "nét
 * nhỏ nhất vẫn đậm".
 */

/** Nấc mảnh nhất — nét bút ~1.06px. */
export const STROKE_WIDTH_MIN = 0.25;
/** Giữ bằng `extraBold` của Excalidraw để không lệch parity. */
export const STROKE_WIDTH_MAX = 4;
/**
 * 0.25 là luỹ thừa 2 → mọi nấc biểu diễn nhị phân chính xác, bong bóng giá trị
 * không bao giờ hiện "1.7000000000000002". Đổi step sang 0.1 là vỡ điều này.
 */
export const STROKE_WIDTH_STEP = 0.25;

/** Mặc định của Excalidraw (`DEFAULT_ELEMENT_PROPS.strokeWidth`). */
export const DEFAULT_STROKE_WIDTH = 2;

/** Hệ số Excalidraw nhân lên khi dựng nét bút tay. Chỉ để tính/đối chiếu. */
export const FREEDRAW_SIZE_FACTOR = 4.25;

/** Kẹp vào [min, max] rồi hút về nấc gần nhất. */
export function snapStrokeWidth(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_STROKE_WIDTH;
  const clamped = Math.min(STROKE_WIDTH_MAX, Math.max(STROKE_WIDTH_MIN, value));
  return Math.round(clamped / STROKE_WIDTH_STEP) * STROKE_WIDTH_STEP;
}

/** Danh sách mọi nấc, min → max. */
export function strokeWidthStops(): number[] {
  const stops: number[] = [];
  for (let v = STROKE_WIDTH_MIN; v <= STROKE_WIDTH_MAX; v += STROKE_WIDTH_STEP) {
    stops.push(v);
  }
  return stops;
}

/** Chỉ cần đủ hình dạng để đọc — nhận thẳng `readonly ExcalidrawElement[]`. */
interface StrokeWidthCarrier {
  id: string;
  isDeleted?: boolean;
  strokeWidth?: number;
}

/**
 * Độ dày chung của các element đang chọn, hoặc `null` nếu không chọn gì / giá
 * trị lẫn lộn. `null` để caller rơi về `appState.currentItemStrokeWidth` —
 * giống `getFormValue` của Excalidraw, và quan trọng là slider KHÔNG bịa ra
 * một con số khi selection không đồng nhất.
 */
export function commonStrokeWidth(
  elements: readonly StrokeWidthCarrier[],
  selectedElementIds: Readonly<Record<string, boolean>>,
): number | null {
  let common: number | null = null;
  for (const el of elements) {
    if (el.isDeleted) continue;
    if (!selectedElementIds[el.id]) continue;
    if (typeof el.strokeWidth !== 'number') continue;
    const width = snapStrokeWidth(el.strokeWidth);
    if (common === null) common = width;
    else if (common !== width) return null;
  }
  return common;
}

/**
 * Giá trị slider phải hiển thị. Theo đúng luật `getFormValue` của Excalidraw:
 *
 * - CÓ selection mang nét → giá trị chung, hoặc `null` khi lẫn lộn.
 * - KHÔNG có selection → `currentItemStrokeWidth` (nét sẽ dùng cho hình kế tiếp).
 *
 * Hai ca cùng cho `null` từ `commonStrokeWidth` nhưng ý nghĩa khác hẳn nhau —
 * gộp lại là slider nhảy về giá trị của công cụ mỗi khi GV chọn 2 hình khác nét.
 */
export function displayedStrokeWidth(
  elements: readonly StrokeWidthCarrier[],
  selectedElementIds: Readonly<Record<string, boolean>>,
  currentItemStrokeWidth: number | undefined,
): number | null {
  const hasSelection = elements.some(
    (el) =>
      !el.isDeleted &&
      selectedElementIds[el.id] &&
      typeof el.strokeWidth === 'number',
  );
  if (hasSelection) return commonStrokeWidth(elements, selectedElementIds);
  return snapStrokeWidth(currentItemStrokeWidth ?? DEFAULT_STROKE_WIDTH);
}
