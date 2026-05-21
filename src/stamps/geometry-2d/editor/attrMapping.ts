import type { Store } from '../../../core/scene/store';

export interface MutatePatch {
  attrs?: Record<string, unknown>;
  remove?: boolean;
}

/**
 * Áp patch từ PropertiesPopover lên scene store.
 *
 * PropertiesPopover phát attrs theo tên JSXGraph (strokeColor, strokeWidth,
 * withLabel, name, …). Scene attrs dùng tên ngắn gọn (color, width,
 * showLabel, …) và `label` là field top-level của SceneObject (không nằm
 * trong attrs). Map ở đây để popover khỏi cần biết shape của scene.
 *
 * - `remove: true` → dispatch DELETE.
 * - `attrs.name` (string) → dispatch UPDATE với `label` patch.
 * - JSXGraph attr names → scene names (strokeColor → color, strokeWidth →
 *   width, withLabel → showLabel). `fillColor` cũng map sang `color` (fallback
 *   khi popover không truyền strokeColor).
 */
export function applyMutatePatch(store: Store, id: string, patch: MutatePatch): void {
  if (patch.remove) {
    store.dispatch({ type: 'DELETE', payload: { id } });
    return;
  }
  if (!patch.attrs) return;
  const { name, withLabel, strokeColor, fillColor, strokeWidth, ...rest } = patch.attrs as {
    name?: unknown;
    withLabel?: unknown;
    strokeColor?: unknown;
    fillColor?: unknown;
    strokeWidth?: unknown;
    [k: string]: unknown;
  };
  if (typeof name === 'string') {
    store.dispatch({ type: 'UPDATE', payload: { id, patch: { label: name } } });
  }
  const mapped: Record<string, unknown> = { ...rest };
  // strokeColor / fillColor cùng đại diện cho cùng 1 thuộc tính `color` ở
  // scene. PropertiesPopover thường thêm sẵn `color` cùng strokeColor —
  // ưu tiên `color` (đã có trong rest); fallback strokeColor → fillColor.
  if (strokeColor !== undefined && mapped.color === undefined) mapped.color = strokeColor;
  if (fillColor !== undefined && mapped.color === undefined) mapped.color = fillColor;
  if (strokeWidth !== undefined && mapped.width === undefined) mapped.width = strokeWidth;
  if (withLabel !== undefined && mapped.showLabel === undefined) mapped.showLabel = withLabel;
  if (Object.keys(mapped).length > 0) {
    store.dispatch({ type: 'UPDATE_ATTRS', payload: { id, patch: mapped } });
  }
}
