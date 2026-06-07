// src/core/scene/kinds/point.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { constraintRefs2D } from './2d-constraint';
import { POINT_CONSTRAINTS } from './point-constraints/registry';
import { buildJxgTransforms, buildPointOpts } from './point-constraints/shared';

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
    if (c.kind === 'perpFoot') {
      if (!c.from || !c.onLine) {
        throw new Error('point.perpFoot: from và onLine bắt buộc');
      }
    }
    if (c.kind === 'orthocenter') {
      if (!Array.isArray(c.vertices) || c.vertices.length !== 3) {
        throw new Error('point.orthocenter: vertices phải là tuple 3 id');
      }
      if (!c.vertices[0] || !c.vertices[1] || !c.vertices[2]) {
        throw new Error('point.orthocenter: 3 vertex id phải non-empty');
      }
    }
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
    if (c.kind === 'transformed') {
      const t = c.transform;
      const labelRef = (id: string) => state?.objects[id]?.label ?? id;
      const op =
        t.kind === 'translate' ? `tịnh tiến (${t.dx.toFixed(2)}, ${t.dy.toFixed(2)})`
        : t.kind === 'rotate' ? `quay ${((t.angleRad * 180) / Math.PI).toFixed(0)}° quanh ${labelRef(t.center)}`
        : t.kind === 'reflectLine' ? `đối xứng qua ${labelRef(t.line)}`
        : t.kind === 'reflectPoint' ? `đối xứng qua điểm ${labelRef(t.center)}`
        : t.kind === 'dilate' ? `vị tự k=${t.k} quanh ${labelRef(t.center)}`
        : '';
      return `${obj.label} = ảnh của ${labelRef(c.source)} (${op})`;
    }
    if (c.kind === 'orthocenter') {
      const labels = c.vertices.map((id) => state?.objects[id]?.label ?? id).join('');
      return `${obj.label} = trực tâm Δ${labels}`;
    }
    if (c.kind === 'tangentPointExt') {
      const fromLabel = state?.objects[c.from]?.label ?? c.from;
      const circleLabel = state?.objects[c.circle]?.label ?? c.circle;
      return `${obj.label} = tiếp điểm của (${circleLabel}) với tiếp tuyến từ ${fromLabel}`;
    }
    return `Điểm ${obj.label}`;
  },
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const c = obj.attrs.constraint;
    const opts = buildPointOpts(obj);
    const mod = POINT_CONSTRAINTS.get(c.kind);
    if (mod) return mod.render(obj, ctx, c as never, opts);
    if (c.kind === 'transformed') {
       
      const src: any = ctx.resolveRef(c.source);
      const transforms = buildJxgTransforms(board, ctx, c.transform);
      const parent = transforms.length === 1 ? transforms[0] : transforms;
      // JSXGraph: create('point', [src, transformParent]) — src first.
       
      const pt: any = board.create('point', [src, parent], opts);
      // Renderer dọn _helpers khi remove element (xem JxgRenderer.remove).
      pt._helpers = transforms;
      return pt;
    }
    if (c.kind === 'orthocenter') {

      const a: any = ctx.resolveRef(c.vertices[0]);

      const b: any = ctx.resolveRef(c.vertices[1]);

      const c3: any = ctx.resolveRef(c.vertices[2]);
      const hide = { visible: false, withLabel: false, fixed: true, name: '' };
      // Altitude A→BC: line BC + perpendicular từ A xuống BC.
      const lineBC = board.create('line', [b, c3], hide);
      const altA = board.create('perpendicular', [lineBC, a], hide);
      // Altitude B→AC: line AC + perpendicular từ B xuống AC.
      const lineAC = board.create('line', [a, c3], hide);
      const altB = board.create('perpendicular', [lineAC, b], hide);
      // Trực tâm = giao 2 altitude (branch 0 — chỉ có 1 giao điểm).

      const ortho: any = board.create('intersection', [altA, altB, 0], opts);
      ortho._helpers = [lineBC, altA, lineAC, altB];
      return ortho;
    }
    if (c.kind === 'onPerpendicular') {
      // Glider trên đường vuông góc qua `through`, vuông góc với line(perpToA, perpToB).
      // Aux line + perp line hidden; glider parent = perp line.

      const T: any = ctx.resolveRef(c.through);

      const A: any = ctx.resolveRef(c.perpToA);

      const B: any = ctx.resolveRef(c.perpToB);
      const hide = { visible: false, withLabel: false, fixed: true, name: '' };
      const refLine = board.create('line', [A, B], hide);
      const perpLine = board.create('perpendicular', [refLine, T], hide);
      // Initial coords: T + t * unit(perp(A→B))
      const dx = B.X() - A.X();
      const dy = B.Y() - A.Y();
      const len = Math.hypot(dx, dy) || 1;
      const ux = -dy / len;
      const uy = dx / len;
      const x0 = T.X() + c.t * ux;
      const y0 = T.Y() + c.t * uy;

      const gl: any = board.create('glider', [x0, y0, perpLine], opts);
      gl._helpers = [refLine, perpLine];
      return gl;
    }
    if (c.kind === 'onPerpBisector') {
      // Glider trên trung trực của (p1, p2). Build từ midpoint + perpendicular
      // (cùng pattern với line.ts perpBisector — JSXGraph 'perpendicular' trả
      // về line infinite, dùng làm parent cho glider an toàn hơn so với
      // 'perpendicularsegment').

      const A: any = ctx.resolveRef(c.p1);

      const B: any = ctx.resolveRef(c.p2);
      const hide = { visible: false, withLabel: false, fixed: true, name: '' };
      const refLine = board.create('line', [A, B], hide);
      const mid = board.create('midpoint', [A, B], hide);
      const bisLine = board.create('perpendicular', [refLine, mid], hide);
      const Mx = (A.X() + B.X()) / 2;
      const My = (A.Y() + B.Y()) / 2;
      const dx = B.X() - A.X();
      const dy = B.Y() - A.Y();
      const len = Math.hypot(dx, dy) || 1;
      const ux = -dy / len;
      const uy = dx / len;
      const x0 = Mx + c.t * ux;
      const y0 = My + c.t * uy;

      const gl: any = board.create('glider', [x0, y0, bisLine], opts);
      gl._helpers = [refLine, mid, bisLine];
      return gl;
    }
    if (c.kind === 'onCircleAroundPoint') {
      // Glider trên vòng tròn tâm `center`, qua `radiusPoint`.

      const C: any = ctx.resolveRef(c.center);

      const R: any = ctx.resolveRef(c.radiusPoint);
      const hide = { visible: false, withLabel: false, fixed: true, name: '' };
      const auxCircle = board.create('circle', [C, R], hide);
      const r = Math.hypot(R.X() - C.X(), R.Y() - C.Y());
      const x0 = C.X() + r * Math.cos(c.theta);
      const y0 = C.Y() + r * Math.sin(c.theta);

      const gl: any = board.create('glider', [x0, y0, auxCircle], opts);
      gl._helpers = [auxCircle];
      return gl;
    }
    if (c.kind === 'tangentPointExt') {
      // Tiếp điểm của tiếp tuyến vẽ từ điểm ngoài `from` tới đường tròn `circle`.
      // Construction: lấy O = tâm đường tròn → mid = trung điểm(from, O) → Thales
      // = đường tròn đường kính from-O (do góc nội tiếp 90° = tiếp tuyến vuông
      // góc với bán kính tại tiếp điểm). Tiếp điểm = giao của Thales với circle,
      // nhánh 0/1 chọn 1 trong 2 nghiệm.

      const P: any = ctx.resolveRef(c.from);
      const K: any = ctx.resolveRef(c.circle);
      const O: any = K.center ?? K.midpoint;
      const hide = { visible: false, withLabel: false, fixed: true, name: '' };
      const mid = board.create('midpoint', [P, O], hide);
      const thales = board.create('circle', [mid, P], hide);
      const inter: any = board.create('intersection', [thales, K, c.which], opts);
      inter._helpers = [mid, thales];
      return inter;
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
