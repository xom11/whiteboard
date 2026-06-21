// src/core/scene/kinds/line3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';
import { lineConstructionWorld } from './constraint3d-math';

/**
 * Cách dựng ĐƯỜNG phái sinh (mô phỏng 2D LineConstruction). Khi `construction`
 * có mặt, `p1`/`p2` bị bỏ qua — renderer dựng đường từ toạ độ TÍNH (function-
 * based, đọc State sống) để live-update đúng dù điểm gốc bị recreate mỗi frame
 * kéo (gotcha recreate-mỗi-frame, xem constraint3d-math.ts / design doc v1).
 */
export type Line3DConstruction =
  // Giao tuyến 2 mặt phẳng (object). a,b = 2 điểm trên giao tuyến.
  | { kind: 'planePlaneIntersection'; plane1: string; plane2: string }
  // Đường qua `point` song song hướng dirA→dirB (2 điểm — hitTest chưa pick được
  // đường nên dùng 2 điểm xác định hướng, mô phỏng v1 intersectionLines).
  | { kind: 'lineParallelThrough'; point: string; dirA: string; dirB: string }
  // Đường qua `point` vuông góc với mặt `plane` (hướng = pháp tuyến mặt).
  | { kind: 'linePerpToPlane'; point: string; plane: string };

export type Line3DAttrs = {
  /** Hai-điểm fallback — bắt buộc khi KHÔNG có `construction`. */
  p1?: string;
  p2?: string;
  construction?: Line3DConstruction;
  color?: string;
};

export function line3dConstructionRefs(c: Line3DConstruction): string[] {
  switch (c.kind) {
    case 'planePlaneIntersection': return [c.plane1, c.plane2];
    case 'lineParallelThrough': return [c.point, c.dirA, c.dirB];
    case 'linePerpToPlane': return [c.point, c.plane];
    default: {
      const _exhaustive: never = c;
      void _exhaustive;
      return [];
    }
  }
}

const def: KindDef<Line3DAttrs> = {
  type: 'line3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (a?.construction) return;
    if (!a?.p1 || !a?.p2) throw new Error('line3d: p1/p2 required (hoặc construction)');
  },
  dependsOn: (a) => (a.construction ? line3dConstructionRefs(a.construction) : [a.p1!, a.p2!]),
  describe: (obj, state) => {
    const c = obj.attrs.construction;
    if (!c) return `Đường ${obj.label} qua ${labelOf(obj.attrs.p1!, state)}, ${labelOf(obj.attrs.p2!, state)}`;
    switch (c.kind) {
      case 'planePlaneIntersection':
        return `Giao tuyến ${obj.label} = ${labelOf(c.plane1, state)} ∩ ${labelOf(c.plane2, state)}`;
      case 'lineParallelThrough':
        return `${obj.label} ∥ ${labelOf(c.dirA, state)}${labelOf(c.dirB, state)} qua ${labelOf(c.point, state)}`;
      case 'linePerpToPlane':
        return `${obj.label} ⊥ ${labelOf(c.plane, state)} qua ${labelOf(c.point, state)}`;
      default: return obj.label;
    }
  },
  render: (obj, ctx) => {
    const view = ctx.jxg as any;
    const baseOpts = {
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: 2,
      visible: obj.visible,
    };
    const c = obj.attrs.construction;
    if (c) {
      // Đường phái sinh: toạ độ TÍNH tươi mỗi eval (KHÔNG capture element gốc —
      // gotcha recreate-mỗi-frame). Hàm-điểm + needsRegularUpdate (giống point3d).
      const getState = ctx.getState;
      if (!getState) throw new Error('line3d construction: cần ctx.getState');
      const lc = () => lineConstructionWorld(c, getState());
      return view.create('line3d', [() => lc().a, () => lc().b], {
        ...baseOpts,
        straightFirst: true,
        straightLast: true,
        needsRegularUpdate: true,
      });
    }
    const pA = ctx.resolveRef(obj.attrs.p1!);
    const pB = ctx.resolveRef(obj.attrs.p2!);
    return view.create('line3d', [pA, pB], {
      ...baseOpts,
      straightFirst: true,
      straightLast: true,
    });
  },
};

registerKind(def);
