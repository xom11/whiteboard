// src/core/scene/kinds/plane3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';
import { planeConstructionWorld } from './constraint3d-math';

/**
 * Cách dựng MẶT phái sinh (mô phỏng 2D construction). Khi `construction` có mặt,
 * p1/p2/p3 bị bỏ qua — renderer dựng mặt từ 3 điểm TÍNH (function-based, đọc
 * State sống) để live-update đúng dù điểm gốc recreate mỗi frame.
 */
export type Plane3DConstruction =
  // Mặt qua `point` song song mặt `refPlane` (cùng cặp vector chỉ phương).
  | { kind: 'planeParallelThrough'; point: string; refPlane: string }
  // Mặt qua `point` vuông góc hướng lineA→lineB (2 điểm — pháp tuyến = hướng).
  | { kind: 'planePerpToLine'; point: string; lineA: string; lineB: string };

export type Plane3DAttrs = {
  /** 3-điểm fallback — bắt buộc khi KHÔNG có `construction`. */
  p1?: string;
  p2?: string;
  p3?: string;
  construction?: Plane3DConstruction;
  color?: string;
};

export function plane3dConstructionRefs(c: Plane3DConstruction): string[] {
  switch (c.kind) {
    case 'planeParallelThrough': return [c.point, c.refPlane];
    case 'planePerpToLine': return [c.point, c.lineA, c.lineB];
    default: {
      const _exhaustive: never = c;
      void _exhaustive;
      return [];
    }
  }
}

const def: KindDef<Plane3DAttrs> = {
  type: 'plane3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (a?.construction) return;
    if (!a?.p1 || !a?.p2 || !a?.p3) throw new Error('plane3d: cần 3 điểm (hoặc construction)');
  },
  dependsOn: (a) => (a.construction ? plane3dConstructionRefs(a.construction) : [a.p1!, a.p2!, a.p3!]),
  describe: (obj, state) => {
    const c = obj.attrs.construction;
    if (!c) {
      return `Mặt ${obj.label} qua ${labelOf(obj.attrs.p1!, state)}, ${labelOf(obj.attrs.p2!, state)}, ${labelOf(obj.attrs.p3!, state)}`;
    }
    switch (c.kind) {
      case 'planeParallelThrough':
        return `${obj.label} ∥ ${labelOf(c.refPlane, state)} qua ${labelOf(c.point, state)}`;
      case 'planePerpToLine':
        return `${obj.label} ⊥ ${labelOf(c.lineA, state)}${labelOf(c.lineB, state)} qua ${labelOf(c.point, state)}`;
      default: return obj.label;
    }
  },
  render: (obj, ctx) => {
    const view = ctx.jxg as any;
    const opts = {
      fillOpacity: 0.15,
      fillColor: obj.attrs.color ?? '#60a5fa',
      strokeColor: obj.attrs.color ?? '#60a5fa',
      visible: obj.visible,
    };
    const c = obj.attrs.construction;
    if (c) {
      // Mặt phái sinh: 3 điểm TÍNH tươi mỗi eval (function-coord) — KHÔNG capture
      // element gốc (gotcha recreate-mỗi-frame). needsRegularUpdate re-eval.
      const getState = ctx.getState;
      if (!getState) throw new Error('plane3d construction: cần ctx.getState');
      const pc = () => planeConstructionWorld(c, getState());
      // GOTCHA (verify Playwright): JSXGraph plane3d nhận [point, direction1,
      // direction2] với direction là toạ độ THÔ (vector từ gốc) — KHÔNG phải 3
      // điểm. Truyền 3 điểm thô → p2,p3 bị hiểu là vector-từ-gốc → mặt lệch khi
      // không qua gốc. Đúng: point + (p2−p1) + (p3−p1).
      const diff = (which: 'p2' | 'p3'): number[] => {
        const r = pc();
        const q = r[which];
        return [q[0] - r.p1[0], q[1] - r.p1[1], q[2] - r.p1[2]];
      };
      return view.create('plane3d', [() => pc().p1, () => diff('p2'), () => diff('p3')], {
        ...opts,
        needsRegularUpdate: true,
      });
    }
    return view.create('plane3d', [
      ctx.resolveRef(obj.attrs.p1!),
      ctx.resolveRef(obj.attrs.p2!),
      ctx.resolveRef(obj.attrs.p3!),
    ], opts);
  },
};

registerKind(def);
