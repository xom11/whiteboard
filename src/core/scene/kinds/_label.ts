// src/core/scene/kinds/_label.ts
/** Offset nhãn (pixel) so với anchor. offset[1] dương = nhãn đi lên (quy ước JSXGraph). */
export type LabelOffset = [number, number];

/**
 * Opts cho `label` của một JSXGraph element: luôn `fixed:false` (kéo được).
 * `labelOffset` (nếu có) hoặc `dflt` (nếu có) thành `offset`. Không có cả hai
 * → chỉ `{ fixed:false }` (giữ default JSXGraph, byte-identical với hiện tại
 * cho line/circle vốn không set offset).
 */
export function labelOpts(
  labelOffset?: LabelOffset,
  dflt?: LabelOffset,
): { label: Record<string, unknown> } {
  const offset = labelOffset ?? dflt;
  return { label: { fixed: false, ...(offset ? { offset } : {}) } };
}

/**
 * Đọc offset-tổng (pixel) của một label JSXGraph sau khi user kéo, quy về dạng
 * thuần `offset` (để zero relativeCoords mà vị trí không đổi):
 *   x = offset[0] + rel.scrCoords[1]
 *   y = offset[1] - rel.scrCoords[2]   (screen-y xuống, offset-y lên)
 * Trả null nếu thiếu dữ liệu.
 */
export function readLabelOffset(label: {
  evalVisProp?: (k: string) => unknown;
  visProp?: { offset?: number[] };
  relativeCoords?: { scrCoords?: number[] };
}): LabelOffset | null {
  const off = (label.evalVisProp?.('offset') as number[] | undefined) ?? label.visProp?.offset;
  const rel = label.relativeCoords?.scrCoords;
  if (!off || !rel || off.length < 2 || rel.length < 3) return null;
  return [Math.round(off[0] + rel[1]), Math.round(off[1] - rel[2])];
}
