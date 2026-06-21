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
  | { kind: 'planePlaneIntersection'; plane1: string; plane2: string };

export type Line3DAttrs = {
  /** Hai-điểm fallback — bắt buộc khi KHÔNG có `construction`. */
  p1?: string;
  p2?: string;
  construction?: Line3DConstruction;
  color?: string;
};

export function line3dConstructionRefs(c: Line3DConstruction): string[] {
  // NOTE: Line3DConstruction hiện 1 thành-viên → never-guard chưa narrow được
  // (TS chỉ tạo never cho union ≥2). Thêm `const _:never = c` ở default khi bổ
  // sung kind thứ 2 (construct kế của v1.5) — brief §8.
  switch (c.kind) {
    case 'planePlaneIntersection': return [c.plane1, c.plane2];
  }
  return [];
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
