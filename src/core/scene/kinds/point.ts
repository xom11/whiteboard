// src/core/scene/kinds/point.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { constraintRefs2D } from './2d-constraint';
import { POINT_CONSTRAINTS } from './point-constraints/registry';
import { buildPointOpts } from './point-constraints/shared';
import { labelOpts } from './_label';

export type { PointAttrs } from './point-constraints/_types';
import type { PointAttrs } from './point-constraints/_types';

const def: KindDef<PointAttrs> = {
  type: 'point',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a || !a.constraint || !a.constraint.kind) {
      throw new Error('point: constraint required');
    }
    const c = a.constraint;
    POINT_CONSTRAINTS.get(c.kind)?.validate?.(c as never);
  },
  dependsOn: (a) => constraintRefs2D(a.constraint),
  measure: (obj) => {
    const c = obj.attrs.constraint;
    if (c.kind === 'free') {
      return [
        { label: 'x', value: c.x },
        { label: 'y', value: c.y },
      ];
    }
    return null;
  },
  describe: (obj, state) => {
    const c = obj.attrs.constraint;
    const mod = POINT_CONSTRAINTS.get(c.kind);
    if (mod) return mod.describe(obj, state, c as never);
    return `Điểm ${obj.label}`;
  },
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const c = obj.attrs.constraint;
    const opts = buildPointOpts(obj);
    const mod = POINT_CONSTRAINTS.get(c.kind);
    if (mod) return mod.render(obj, ctx, c as never, opts);
    return board.create('point', [0, 0], opts);
  },
  /**
   * Free → Free update giữ nguyên JxgObj identity (gọi setPositionDirectly +
   * setAttribute) để các object phụ thuộc (line/segment/...) không bị stale
   * parent ref. Đổi constraint kind → throw để renderer fallback recreate.
   *
   * Đây cũng là endpoint cho drag-sync dispatch trong JxgRenderer: khi user
   * kéo điểm, listener dispatch UPDATE_ATTRS → update hook chạy, vị trí đã
   * đúng sẵn nên setPositionDirectly là no-op nhưng vẫn cần để sync các attrs
   * khác (label/color/...).
   */
  update: (obj, prev, ctx, existing) => {
    const c = obj.attrs.constraint;
    const oldC = prev.attrs.constraint;
    if (c.kind === 'free' && oldC.kind === 'free') {
       
      const el = existing as any;
      // JXG.COORDS_BY_USER = 1 (hardcoded constant — JSXGraph không export
      // qua module API, lấy qua window.JXG sẽ phải gánh thêm phụ thuộc).
      if (typeof el.setPositionDirectly === 'function') {
        try { el.setPositionDirectly(1, [c.x, c.y]); } catch { /* ignore */ }
      }
      if (typeof el.setAttribute === 'function') {
        try {
          el.setAttribute({
            name: obj.label,
            withLabel: obj.attrs.showLabel ?? true,
            visible: obj.visible,
            fixed: obj.locked,
            strokeColor: obj.attrs.color ?? '#1e40af',
            fillColor: obj.attrs.color ?? '#1e40af',
            face: obj.attrs.face ?? 'o',
            size: obj.attrs.size ?? 4,
            ...labelOpts(obj.attrs.labelOffset, [10, 10]),
          });
        } catch { /* ignore */ }
      }
      void ctx;
      return;
    }
    throw new Error('point: constraint kind changed — recreate');
  },
};

registerKind(def);
