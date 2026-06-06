// src/core/scene/kinds/point.ts
import { registerKind } from '../registry';
import type { KindDef, RenderCtx } from '../types';
import { type Constraint2D, type ConstraintDistanceSpec, type TransformDef, constraintRefs2D } from './2d-constraint';
import { arcMidpoint, excenter, pointAtDistanceCoord } from './pointConstructions';

/**
 * Build mảng JSXGraph 'transform' elements cho TransformDef. Dilate → chain
 * 3 transform (T(-c) → S(k) → T(+c)) vì JSXGraph 'scale' không nhận center.
 *
 * Center là pointId; resolve qua ctx + dùng function-based để dilate cập nhật
 * live khi user kéo center.
 */
 
function buildJxgTransforms(board: any, ctx: RenderCtx, t: TransformDef): any[] {
  switch (t.kind) {
    case 'translate':
      return [board.create('transform', [t.dx, t.dy], { type: 'translate' })];
    case 'rotate': {
       
      const c: any = ctx.resolveRef(t.center);
      return [board.create('transform', [t.angleRad, c], { type: 'rotate' })];
    }
    case 'reflectPoint': {
      // Đối xứng qua điểm = quay π quanh điểm đó.
       
      const c: any = ctx.resolveRef(t.center);
      return [board.create('transform', [Math.PI, c], { type: 'rotate' })];
    }
    case 'reflectLine': {
       
      const l: any = ctx.resolveRef(t.line);
      return [board.create('transform', [l], { type: 'reflect' })];
    }
    case 'dilate': {
       
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

/** Trả hàm tính khoảng cách `d` reactive cho pointAtDistance. */
function makeDistanceFn(ctx: RenderCtx, d: ConstraintDistanceSpec): () => number {
  if (d.kind === 'literal') return () => d.value;
  if (d.kind === 'segmentLength') {
    const p = ctx.resolveRef(d.p1) as any;
    const q = ctx.resolveRef(d.p2) as any;
    return () => Math.hypot(p.X() - q.X(), p.Y() - q.Y());
  }
  const circle = ctx.resolveRef(d.circle) as any;
  return () => circle.Radius();
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
    const c = a.constraint;
    if (c.kind === 'perpFoot') {
      if (!c.from || !c.onLine) {
        throw new Error('point.perpFoot: from và onLine bắt buộc');
      }
    }
    if (c.kind === 'circumcenter') {
      if (!Array.isArray(c.vertices) || c.vertices.length !== 3) {
        throw new Error('point.circumcenter: vertices phải là tuple 3 id');
      }
      if (!c.vertices[0] || !c.vertices[1] || !c.vertices[2]) {
        throw new Error('point.circumcenter: 3 vertex id phải non-empty');
      }
    }
    if (c.kind === 'incenter') {
      if (!Array.isArray(c.vertices) || c.vertices.length !== 3) {
        throw new Error('point.incenter: vertices phải là tuple 3 id');
      }
      if (!c.vertices[0] || !c.vertices[1] || !c.vertices[2]) {
        throw new Error('point.incenter: 3 vertex id phải non-empty');
      }
    }
    if (c.kind === 'centroid') {
      if (!Array.isArray(c.vertices) || c.vertices.length !== 3) {
        throw new Error('point.centroid: vertices phải là tuple 3 id');
      }
      if (!c.vertices[0] || !c.vertices[1] || !c.vertices[2]) {
        throw new Error('point.centroid: 3 vertex id phải non-empty');
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
    if (c.kind === 'arcMidpoint') {
      if (!c.circle || !c.a || !c.b || !c.notContaining) {
        throw new Error('point.arcMidpoint: circle, a, b, notContaining bắt buộc');
      }
    }
    if (c.kind === 'excenter') {
      if (!Array.isArray(c.vertices) || c.vertices.length !== 3) {
        throw new Error('point.excenter: vertices phải là tuple 3 id');
      }
      if (!c.opposite) throw new Error('point.excenter: opposite bắt buộc');
      if (!c.vertices[0] || !c.vertices[1] || !c.vertices[2]) {
        throw new Error('point.excenter: 3 vertex id phải non-empty');
      }
      if (!c.vertices.includes(c.opposite)) {
        throw new Error('point.excenter: opposite phải là một trong vertices');
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
    if (c.kind === 'free') return `Điểm ${obj.label}`;
    if (c.kind === 'onAxis') return `${obj.label} trên trục ${c.axis}`;
    if (c.kind === 'onLine') return `${obj.label} trên đường ${state?.objects[c.lineId]?.label ?? c.lineId}`;
    if (c.kind === 'onSegment') return `${obj.label} trên đoạn ${state?.objects[c.segmentId]?.label ?? c.segmentId}`;
    if (c.kind === 'onCircle') return `${obj.label} trên đường tròn ${state?.objects[c.circleId]?.label ?? c.circleId}`;
    if (c.kind === 'onPolygon') return `${obj.label} trên đa giác ${state?.objects[c.polygonId]?.label ?? c.polygonId}`;
    if (c.kind === 'midpoint') {
      const l1 = state?.objects[c.p1]?.label ?? c.p1;
      const l2 = state?.objects[c.p2]?.label ?? c.p2;
      return `${obj.label} = trung điểm ${l1}${l2}`;
    }
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
    if (c.kind === 'perpFoot') {
      const fromLabel = state?.objects[c.from]?.label ?? c.from;
      const lineLabel = state?.objects[c.onLine]?.label ?? c.onLine;
      return `${obj.label} = chân ⟂ từ ${fromLabel} xuống ${lineLabel}`;
    }
    if (c.kind === 'circumcenter') {
      const labels = c.vertices.map((id) => state?.objects[id]?.label ?? id).join('');
      return `${obj.label} = tâm ngoại tiếp Δ${labels}`;
    }
    if (c.kind === 'incenter') {
      const labels = c.vertices.map((id) => state?.objects[id]?.label ?? id).join('');
      return `${obj.label} = tâm nội tiếp Δ${labels}`;
    }
    if (c.kind === 'centroid') {
      const labels = c.vertices.map((id) => state?.objects[id]?.label ?? id).join('');
      return `${obj.label} = trọng tâm Δ${labels}`;
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
    if (c.kind === 'arcMidpoint') {
      const al = state?.objects[c.a]?.label ?? c.a;
      const bl = state?.objects[c.b]?.label ?? c.b;
      const nl = state?.objects[c.notContaining]?.label ?? c.notContaining;
      return `${obj.label} = trung điểm cung ${al}${bl} (không chứa ${nl})`;
    }
    if (c.kind === 'excenter') {
      const labels = c.vertices.map((id) => state?.objects[id]?.label ?? id).join('');
      const opp = state?.objects[c.opposite]?.label ?? c.opposite;
      return `${obj.label} = tâm bàng tiếp Δ${labels} đối diện ${opp}`;
    }
    if (c.kind === 'pointAtDistance') {
      const fromL = state?.objects[c.from]?.label ?? c.from;
      const thrL = state?.objects[c.through]?.label ?? c.through;
      const d = c.distance;
      const dLabel = d.kind === 'literal' ? `${d.value}`
        : d.kind === 'segmentLength'
          ? `${state?.objects[d.p1]?.label ?? d.p1}${state?.objects[d.p2]?.label ?? d.p2}`
          : `bán kính (${state?.objects[d.circle]?.label ?? d.circle})`;
      return `${obj.label} = trên tia ${fromL}${thrL} kéo dài, cách ${thrL} khoảng ${dLabel}`;
    }
    return `Điểm ${obj.label}`;
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
      const p1 = line.point1; const p2 = line.point2;
      const sx = (p1 && p2) ? p1.X() + c.t * (p2.X() - p1.X()) : c.t;
      const sy = (p1 && p2) ? p1.Y() + c.t * (p2.Y() - p1.Y()) : c.t;
      return board.create('glider', [sx, sy, line], opts);
    }
    if (c.kind === 'onSegment') {
      const seg = ctx.resolveRef(c.segmentId) as any;
      const p1 = seg.point1; const p2 = seg.point2;
      const sx = (p1 && p2) ? p1.X() + c.t * (p2.X() - p1.X()) : c.t;
      const sy = (p1 && p2) ? p1.Y() + c.t * (p2.Y() - p1.Y()) : c.t;
      return board.create('glider', [sx, sy, seg], opts);
    }
    if (c.kind === 'onCircle') {
      const circle = ctx.resolveRef(c.circleId) as any;
      const O = circle.center ?? circle.midpoint;
      const ox = O ? O.X() : 0; const oy = O ? O.Y() : 0;
      return board.create('glider', [ox + Math.cos(c.theta), oy + Math.sin(c.theta), circle], opts);
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
       
      const src: any = ctx.resolveRef(c.source);
      const transforms = buildJxgTransforms(board, ctx, c.transform);
      const parent = transforms.length === 1 ? transforms[0] : transforms;
      // JSXGraph: create('point', [src, transformParent]) — src first.
       
      const pt: any = board.create('point', [src, parent], opts);
      // Renderer dọn _helpers khi remove element (xem JxgRenderer.remove).
      pt._helpers = transforms;
      return pt;
    }
    if (c.kind === 'perpFoot') {
       
      const from: any = ctx.resolveRef(c.from);
       
      const onLine: any = ctx.resolveRef(c.onLine);
      // JSXGraph 'perpendicularpoint': create('perpendicularpoint', [line, point])
      //   → trả về chân vuông góc của point xuống line.
      return board.create('perpendicularpoint', [onLine, from], opts);
    }
    if (c.kind === 'circumcenter') {
       
      const a: any = ctx.resolveRef(c.vertices[0]);
       
      const b: any = ctx.resolveRef(c.vertices[1]);
       
      const c3: any = ctx.resolveRef(c.vertices[2]);
      // JSXGraph 'circumcenter': create('circumcenter', [A, B, C])
      return board.create('circumcenter', [a, b, c3], opts);
    }
    if (c.kind === 'incenter') {
       
      const a: any = ctx.resolveRef(c.vertices[0]);
       
      const b: any = ctx.resolveRef(c.vertices[1]);
       
      const c3: any = ctx.resolveRef(c.vertices[2]);
      return board.create('incenter', [a, b, c3], opts);
    }
    if (c.kind === 'centroid') {
       
      const a: any = ctx.resolveRef(c.vertices[0]);
       
      const b: any = ctx.resolveRef(c.vertices[1]);
       
      const c3: any = ctx.resolveRef(c.vertices[2]);
      // JSXGraph function-based point: parents = [() => x, () => y]
      // Function được gọi lại mỗi frame → live update khi user kéo vertex.
      return board.create('point', [
        () => (a.X() + b.X() + c3.X()) / 3,
        () => (a.Y() + b.Y() + c3.Y()) / 3,
      ], opts);
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
    if (c.kind === 'circleIntersection') {
      // Giao 2 đường tròn — JSXGraph 'intersection' nhận branch 0/1.

      const k1: any = ctx.resolveRef(c.c1);

      const k2: any = ctx.resolveRef(c.c2);
      return board.create('intersection', [k1, k2, c.which], opts);
    }
    if (c.kind === 'secondIntersection') {
      // Giao điểm thứ hai của line ∩ circle, biết giao điểm thứ nhất `other`.
      // JSXGraph 'otherintersection' nhận [curve, line, knownPoint].

      const line: any = ctx.resolveRef(c.line);

      const circle: any = ctx.resolveRef(c.circle);

      const other: any = ctx.resolveRef(c.other);
      return board.create('otherintersection', [circle, line, other], opts);
    }
    if (c.kind === 'tangencyPoint') {
      // Tiếp điểm = chân vuông góc hạ từ tâm đường tròn xuống đường tiếp tuyến.

      const circle: any = ctx.resolveRef(c.circle);

      const line: any = ctx.resolveRef(c.onLine);
      const O = circle?.center ?? circle?.midpoint ?? circle;
      return board.create('perpendicularpoint', [line, O], opts);
    }
    if (c.kind === 'arcMidpoint') {
      const circle: any = ctx.resolveRef(c.circle);
      const A: any = ctx.resolveRef(c.a);
      const B: any = ctx.resolveRef(c.b);
      const N: any = ctx.resolveRef(c.notContaining);
      const O = circle?.center ?? circle?.midpoint ?? circle;
      const am = () => arcMidpoint(
        [O.X(), O.Y()], circle.Radius(),
        [A.X(), A.Y()], [B.X(), B.Y()], [N.X(), N.Y()],
      );
      return board.create('point', [() => am()[0], () => am()[1]], opts);
    }
    if (c.kind === 'excenter') {
      const a: any = ctx.resolveRef(c.vertices[0]);
      const b: any = ctx.resolveRef(c.vertices[1]);
      const c3: any = ctx.resolveRef(c.vertices[2]);
      const oppIdx = c.vertices.indexOf(c.opposite) as 0 | 1 | 2;
      const idx = (oppIdx < 0 ? 0 : oppIdx) as 0 | 1 | 2;
      const ex = () => excenter(
        [[a.X(), a.Y()], [b.X(), b.Y()], [c3.X(), c3.Y()]], idx,
      );
      return board.create('point', [() => ex()[0], () => ex()[1]], opts);
    }
    if (c.kind === 'pointAtDistance') {
      const A: any = ctx.resolveRef(c.from);
      const B: any = ctx.resolveRef(c.through);
      const dFn = makeDistanceFn(ctx, c.distance);
      const pc = () => pointAtDistanceCoord([A.X(), A.Y()], [B.X(), B.Y()], dFn());
      return board.create('point', [() => pc()[0], () => pc()[1]], opts);
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
