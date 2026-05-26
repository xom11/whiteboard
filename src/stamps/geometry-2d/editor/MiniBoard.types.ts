import type { State } from '../../../core/scene';
import type { Store } from '../../../core/scene/store';

/**
 * Snapshot dùng cho PropertiesPopover. `kind` thu hẹp về 3 nhóm visual
 * (point/line/circle) cho phép popover render đồng nhất; scene kind có thể
 * chi tiết hơn (segment, ray, vector, …) — mapping ở `buildObjectSnapshot`.
 */
export interface ObjectSnapshot {
  id: string;
  kind: 'point' | 'line' | 'circle';
  name: string;
  color: string;
  width: number;
  dash: number;
  face: 'o' | 'circle' | 'cross' | 'plus';
  showLabel: boolean;
  showValue: boolean;
  screenCoords: { x: number; y: number };
}

/**
 * Thông tin tool transform đang chờ user nhập param (rotate angle, dilate
 * factor, ...). Null = không có transform popover active.
 */
export type TransformPopoverInfo = {
  tool: 'rotate' | 'dilate' | 'regularPolygon' | 'translate' | 'reflectLine' | 'reflectPoint';
  anchor: { x: number; y: number };
} | null;

/**
 * Snapshot toàn bộ trạng thái selection (mỗi khi `selectedSetRef` đổi).
 * EditorPanel dùng để derive popover: 0 → ẩn, 1 → single PropertiesPopover,
 * >1 → compact MultiPropertiesPopover (color picker + delete).
 */
export interface SelectionStateSnapshot {
  /** Danh sách scene ids hiện đang chọn. */
  ids: string[];
  /** Anchor screen-coord (clientX/Y) của lần click chọn gần nhất. */
  anchor: { x: number; y: number };
}

/**
 * Imperative handle MiniBoard2D expose qua forwardRef. Parent (EditorPanel)
 * gọi methods sau khi nhận `onReady?.()` signal.
 *
 * Sau Tier 2 (F): tool / showAxis / showGrid / undo-redo do host owns.
 * Handle chỉ expose state read + popover + selection internal.
 */
export interface MiniBoardHandle {
  getContainer: () => HTMLDivElement | null;
  getBbox: () => [number, number, number, number];
  getState: () => State;
  getStore: () => Store;
  highlight: (ids: string | string[] | null) => void;
  snapshotObject: (id: string, anchorScreen: { x: number; y: number }) => ObjectSnapshot | null;
  mutateObject: (id: string, patch: { attrs?: Record<string, unknown>; remove?: boolean }) => void;
  getAllPointNames: () => string[];
  onSelect: (cb: (snap: ObjectSnapshot) => void) => () => void;
  /**
   * Đăng ký callback fire mỗi khi `selectedSetRef` đổi (click-select,
   * marquee, clearSelection, deleteSelection). EditorPanel dùng để
   * mount/dismiss PropertiesPopover theo selection size.
   */
  onSelectionState: (cb: (snap: SelectionStateSnapshot | null) => void) => () => void;
  onTransformParam: (cb: (info: TransformPopoverInfo) => void) => () => void;
  confirmTransformParam: (value: number) => void;
  cancelTransformParam: () => void;
  getSelectionSize: () => number;
  clearSelection: () => void;
  deleteSelection: () => void;
}
