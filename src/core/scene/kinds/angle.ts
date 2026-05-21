// src/core/scene/kinds/angle.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';

/**
 * Angle measurement: cung tròn + label giá trị tại đỉnh.
 *
 * JSXGraph vẽ cung từ p1 → p2 theo chiều dương (CCW). Nếu cross(p1−v, p2−v) < 0
 * thì cung CCW > 180° (reflex) — đổi vai trò p1/p2 ở render-time để luôn hiển
 * thị góc nhọn/tù thay vì góc phản.
 */
export type AngleAttrs = {
  p1: string;
  vertex: string;
  p2: string;
  color?: string;
  fillOpacity?: number;
  radius?: number;
  showLabel?: boolean;
};

const def: KindDef<AngleAttrs> = {
  type: 'angle',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.p1 || !a?.vertex || !a?.p2) {
      throw new Error('angle: p1, vertex, p2 bắt buộc');
    }
  },
  dependsOn: (a) => [a.p1, a.vertex, a.p2],
  describe: (obj, state) => `Góc ${labelOf(obj.attrs.p1, state)}${labelOf(obj.attrs.vertex, state)}${labelOf(obj.attrs.p2, state)}`,
  render: (obj, ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const board = ctx.jxg as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pa: any = ctx.resolveRef(obj.attrs.p1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pv: any = ctx.resolveRef(obj.attrs.vertex);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pc: any = ctx.resolveRef(obj.attrs.p2);
    // Cross-product check: reorder để tránh cung reflex (> 180°). Chỉ check
    // một lần tại render-time (không live) — user có thể di chuyển điểm sau
    // và làm cung lật reflex; chấp nhận trade-off vì re-order live phức tạp.
    let parents = [pa, pv, pc];
    try {
      const ax = pa.X() - pv.X(), ay = pa.Y() - pv.Y();
      const cx = pc.X() - pv.X(), cy = pc.Y() - pv.Y();
      if (ax * cy - ay * cx < 0) parents = [pc, pv, pa];
    } catch { /* fallback giữ thứ tự gốc */ }
    return board.create('angle', parents, {
      name: obj.label,
      withLabel: obj.attrs.showLabel ?? true,
      radius: obj.attrs.radius ?? 1,
      fillColor: obj.attrs.color ?? '#22c55e',
      fillOpacity: obj.attrs.fillOpacity ?? 0.25,
      strokeColor: obj.attrs.color ?? '#16a34a',
      strokeWidth: 1.5,
      visible: obj.visible,
      fixed: obj.locked,
    });
  },
};

registerKind(def);
