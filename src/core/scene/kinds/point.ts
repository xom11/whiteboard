// src/core/scene/kinds/point.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { type Constraint2D, constraintRefs2D } from './2d-constraint';

export type PointAttrs = {
  constraint: Constraint2D;
  color?: string;
  showLabel?: boolean;
  showValue?: boolean;
  face?: 'o' | 'circle' | 'cross' | 'plus';
  size?: number;
};

const def: KindDef<PointAttrs> = {
  type: 'point',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a || !a.constraint || !a.constraint.kind) {
      throw new Error('point: constraint required');
    }
  },
  dependsOn: (a) => constraintRefs2D(a.constraint),
  describe: (obj) => {
    const c = obj.attrs.constraint;
    if (c.kind === 'free') return `${obj.label} = (${c.x.toFixed(2)}, ${c.y.toFixed(2)})`;
    if (c.kind === 'onAxis') return `${obj.label} trên trục ${c.axis} (t=${c.t.toFixed(2)})`;
    if (c.kind === 'onLine') return `${obj.label} trên đường ${c.lineId}`;
    if (c.kind === 'onSegment') return `${obj.label} trên đoạn ${c.segmentId}`;
    if (c.kind === 'onCircle') return `${obj.label} trên đường tròn ${c.circleId}`;
    if (c.kind === 'onPolygon') return `${obj.label} trên đa giác ${c.polygonId}`;
    if (c.kind === 'midpoint') return `${obj.label} = trung điểm ${c.p1}${c.p2}`;
    return obj.label;
  },
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const c = obj.attrs.constraint;
    const opts: Record<string, unknown> = {
      name: obj.label,
      withLabel: obj.attrs.showLabel ?? true,
      visible: obj.visible,
      fixed: obj.locked,
      strokeColor: obj.attrs.color ?? '#1e40af',
      fillColor: obj.attrs.color ?? '#1e40af',
      face: obj.attrs.face ?? 'o',
      size: obj.attrs.size ?? 4,
    };
    if (c.kind === 'free') return board.create('point', [c.x, c.y], opts);
    if (c.kind === 'onAxis') {
      const coords: [number, number] = c.axis === 'x' ? [c.t, 0] : [0, c.t];
      return board.create('point', coords, opts);
    }
    if (c.kind === 'onLine') {
      const line = ctx.resolveRef(c.lineId) as any;
      return board.create('glider', [c.t, c.t, line], opts);
    }
    if (c.kind === 'onSegment') {
      const seg = ctx.resolveRef(c.segmentId) as any;
      return board.create('glider', [c.t, c.t, seg], opts);
    }
    if (c.kind === 'onCircle') {
      const circle = ctx.resolveRef(c.circleId) as any;
      return board.create('glider', [Math.cos(c.theta), Math.sin(c.theta), circle], opts);
    }
    if (c.kind === 'onPolygon') {
      const poly = ctx.resolveRef(c.polygonId) as any;
      return board.create('glider', [c.u, c.v, poly], opts);
    }
    if (c.kind === 'midpoint') {
      const p1 = ctx.resolveRef(c.p1) as any;
      const p2 = ctx.resolveRef(c.p2) as any;
      return board.create('midpoint', [p1, p2], opts);
    }
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
