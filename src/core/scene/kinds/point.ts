// src/core/scene/kinds/point.ts
import { registerKind } from '../registry';
import type { KindDef, RenderCtx } from '../types';
import { type Constraint2D, type TransformDef, constraintRefs2D } from './2d-constraint';

/**
 * Build mảng JSXGraph 'transform' elements cho TransformDef. Dilate → chain
 * 3 transform (T(-c) → S(k) → T(+c)) vì JSXGraph 'scale' không nhận center.
 *
 * Center là pointId; resolve qua ctx + dùng function-based để dilate cập nhật
 * live khi user kéo center.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildJxgTransforms(board: any, ctx: RenderCtx, t: TransformDef): any[] {
  switch (t.kind) {
    case 'translate':
      return [board.create('transform', [t.dx, t.dy], { type: 'translate' })];
    case 'rotate': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c: any = ctx.resolveRef(t.center);
      return [board.create('transform', [t.angleRad, c], { type: 'rotate' })];
    }
    case 'reflectPoint': {
      // Đối xứng qua điểm = quay π quanh điểm đó.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c: any = ctx.resolveRef(t.center);
      return [board.create('transform', [Math.PI, c], { type: 'rotate' })];
    }
    case 'reflectLine': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const l: any = ctx.resolveRef(t.line);
      return [board.create('transform', [l], { type: 'reflect' })];
    }
    case 'dilate': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c: any = ctx.resolveRef(t.center);
      // Function-based để chain cập nhật khi user kéo center.
      return [
        board.create('transform', [() => -c.X(), () => -c.Y()], { type: 'translate' }),
        board.create('transform', [t.k, t.k], { type: 'scale' }),
        board.create('transform', [() => c.X(), () => c.Y()], { type: 'translate' }),
      ];
    }
  }
}

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
    if (c.kind === 'transformed') {
      const t = c.transform;
      const op =
        t.kind === 'translate' ? `tịnh tiến (${t.dx.toFixed(2)}, ${t.dy.toFixed(2)})`
        : t.kind === 'rotate' ? `quay ${((t.angleRad * 180) / Math.PI).toFixed(0)}° quanh ${t.center}`
        : t.kind === 'reflectLine' ? `đối xứng qua ${t.line}`
        : t.kind === 'reflectPoint' ? `đối xứng qua điểm ${t.center}`
        : t.kind === 'dilate' ? `vị tự k=${t.k} quanh ${t.center}`
        : '';
      return `${obj.label} = ảnh của ${c.source} (${op})`;
    }
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
    if (c.kind === 'transformed') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const src: any = ctx.resolveRef(c.source);
      const transforms = buildJxgTransforms(board, ctx, c.transform);
      const parent = transforms.length === 1 ? transforms[0] : transforms;
      // JSXGraph: create('point', [src, transformParent]) — src first.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pt: any = board.create('point', [src, parent], opts);
      // Renderer dọn _helpers khi remove element (xem JxgRenderer.remove).
      pt._helpers = transforms;
      return pt;
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
