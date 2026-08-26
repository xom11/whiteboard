/**
 * Logic thuần cho vị trí thanh công cụ chính của Excalidraw.
 *
 * Tách riêng khỏi `ToolbarDragger.tsx` để test được trong jsdom: mọi phép
 * tính ở đây chỉ nhận số, không đụng DOM.
 *
 * Hệ toạ độ: mọi `x`/`y` là offset (px) so với góc trên-trái của
 * `.FixedSideContainer_side_top` — khung "vùng an toàn" của Excalidraw,
 * đã trừ `--editor-container-padding` ở cả 4 phía. Đây cũng chính là
 * containing block khi ta cho `.shapes-section` thành `position:absolute`
 * (`.App-menu_top` là `static`, đo bằng Playwright trên DOM thật).
 */

export type ToolbarSide = 'top' | 'left' | 'right' | 'bottom';

export type ToolbarPosition =
  | { mode: 'dock'; side: ToolbarSide }
  | { mode: 'float'; x: number; y: number };

/** Mặc định = đúng vị trí gốc của Excalidraw (không đè CSS định vị nào). */
export const DEFAULT_TOOLBAR_POSITION: ToolbarPosition = {
  mode: 'dock',
  side: 'top',
};

/** Thả cách mép ≤ ngần này (px) thì hít vào mép đó. */
export const SNAP_PX = 80;

/**
 * Khoá cố định, KHÔNG kèm `storageKey` của scene: vị trí toolbar là sở
 * thích người dùng trên máy này, không phải nội dung bảng.
 */
export const TOOLBAR_POSITION_STORAGE_KEY = 'whiteboard:toolbar-pos';

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

const SIDES: readonly ToolbarSide[] = ['top', 'left', 'right', 'bottom'];

/** Kẹp toạ độ nổi để toolbar luôn nằm trọn trong khung. */
export function clampFloat(
  x: number,
  y: number,
  toolbar: Size,
  frame: Size,
): { x: number; y: number } {
  const maxX = Math.max(0, frame.width - toolbar.width);
  const maxY = Math.max(0, frame.height - toolbar.height);
  return {
    x: Math.min(Math.max(x, 0), maxX),
    y: Math.min(Math.max(y, 0), maxY),
  };
}

/**
 * Quyết định vị trí cuối cùng sau khi thả.
 *
 * Đo khoảng cách từ 4 CẠNH của toolbar tới 4 cạnh khung (không dùng tâm:
 * toolbar ngang rộng ~550px nên tâm luôn cách mép trái ~275px, ngưỡng hít
 * theo tâm sẽ không bao giờ kích hoạt). Cạnh gần nhất thắng; hoà thì ưu
 * tiên theo thứ tự `SIDES` — trên trước, tức nghiêng về mặc định.
 */
export function resolveDrop(rect: Rect, frame: Size): ToolbarPosition {
  // Khung chưa layout xong (0x0) → không suy diễn gì, giữ mặc định.
  if (frame.width <= 0 || frame.height <= 0) return DEFAULT_TOOLBAR_POSITION;

  const distance: Record<ToolbarSide, number> = {
    top: rect.y,
    left: rect.x,
    right: frame.width - (rect.x + rect.width),
    bottom: frame.height - (rect.y + rect.height),
  };

  let best: ToolbarSide = 'top';
  for (const side of SIDES) {
    if (distance[side] < distance[best]) best = side;
  }

  if (distance[best] <= SNAP_PX) return { mode: 'dock', side: best };

  return { mode: 'float', ...clampFloat(rect.x, rect.y, rect, frame) };
}

/** Toolbar hiển thị theo cột (dock trái/phải) hay theo hàng. */
export function isVerticalPosition(pos: ToolbarPosition): boolean {
  return pos.mode === 'dock' && (pos.side === 'left' || pos.side === 'right');
}

/** Giá trị dùng cho `data-wb-toolbar` trên wrapper. */
export function toolbarPositionAttr(pos: ToolbarPosition): string {
  return pos.mode === 'dock' ? pos.side : 'float';
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function parse(raw: string): ToolbarPosition | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;

  const obj = data as Record<string, unknown>;
  if (obj.mode === 'dock') {
    return SIDES.includes(obj.side as ToolbarSide)
      ? { mode: 'dock', side: obj.side as ToolbarSide }
      : null;
  }
  if (obj.mode === 'float') {
    return isFiniteNumber(obj.x) && isFiniteNumber(obj.y)
      ? { mode: 'float', x: obj.x, y: obj.y }
      : null;
  }
  return null;
}

/** Đọc vị trí đã lưu. Thiếu/hỏng/không đọc được → mặc định. */
export function loadToolbarPosition(storage: Storage | null): ToolbarPosition {
  if (!storage) return DEFAULT_TOOLBAR_POSITION;
  try {
    const raw = storage.getItem(TOOLBAR_POSITION_STORAGE_KEY);
    if (!raw) return DEFAULT_TOOLBAR_POSITION;
    return parse(raw) ?? DEFAULT_TOOLBAR_POSITION;
  } catch {
    // Safari private mode / storage bị chặn.
    return DEFAULT_TOOLBAR_POSITION;
  }
}

/** Lưu vị trí. Nuốt lỗi: không đáng để làm vỡ cả bảng. */
export function saveToolbarPosition(
  pos: ToolbarPosition,
  storage: Storage | null,
): void {
  if (!storage) return;
  try {
    storage.setItem(TOOLBAR_POSITION_STORAGE_KEY, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}
