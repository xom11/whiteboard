// src/core/scene/kinds/circle.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';
import { excenter } from './pointConstructions';

/**
 * Cách dựng đường tròn phái sinh. Khi `construction` có mặt, `center`/
 * `surfacePoint` bị bỏ qua — renderer dùng JSXGraph `circumcircle` để dựng
 * đường tròn ngoại tiếp 3 điểm.
 */
export type CircleConstruction =
  | { kind: 'circumscribed'; p1: string; p2: string; p3: string }
  | { kind: 'incircle'; p1: string; p2: string; p3: string }
  | { kind: 'excircle'; p1: string; p2: string; p3: string; opposite: string }
  // Đường tròn đường kính p1p2: tâm = trung điểm p1p2, bán kính = |p1p2|/2.
  | { kind: 'diameter'; p1: string; p2: string };

export type CircleAttrs = {
  /** Hai-điểm fallback — bắt buộc khi không có `construction` / `radius`. */
  center?: string;
  surfacePoint?: string;
  /** Số bán kính (mode `center + radius`, DSL `circleCR`). */
  radius?: number;
  construction?: CircleConstruction;
  color?: string;
  width?: number;
  dash?: number;
  showLabel?: boolean;
  showValue?: boolean;
  /** Offset nhãn (pixel) so với anchor; undefined = default JSXGraph. */
  labelOffset?: [number, number];
};

function asConstruction(a: CircleAttrs): CircleConstruction | undefined {
  if (a.construction) return a.construction;
  const raw = a as CircleAttrs & { kind?: string; vertices?: [string, string, string] };
  if (raw.kind === 'incircle' && raw.vertices) {
    return {
      kind: 'incircle',
      p1: raw.vertices[0],
      p2: raw.vertices[1],
      p3: raw.vertices[2],
    };
  }
  return undefined;
}

function constructionRefs(c: CircleConstruction): string[] {
  switch (c.kind) {
    case 'circumscribed': return [c.p1, c.p2, c.p3];
    case 'incircle': return [c.p1, c.p2, c.p3];
    case 'excircle': return [c.p1, c.p2, c.p3];
    case 'diameter': return [c.p1, c.p2];
  }
}

const def: KindDef<CircleAttrs> = {
  type: 'circle',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (asConstruction(a)) return;
    if (typeof a?.radius === 'number') {
      if (!a.center) throw new Error('circle: center bắt buộc khi dùng radius');
      if (!(a.radius > 0)) throw new Error('circle: radius phải > 0');
      return;
    }
    if (!a?.center || !a?.surfacePoint) {
      throw new Error('circle: center và surfacePoint bắt buộc (hoặc construction / radius)');
    }
  },
  dependsOn: (a) => {
    const c = asConstruction(a);
    if (c) return constructionRefs(c);
    if (typeof a.radius === 'number') return [a.center!];
    return [a.center!, a.surfacePoint!];
  },
  measure: (obj, state) => {
    // Circumscribed circles need full geometric derivation — skip for now.
    if (asConstruction(obj.attrs)) return null;
    if (typeof obj.attrs.radius === 'number') {
      return [{ label: 'r', value: obj.attrs.radius }];
    }
    const center = obj.attrs.center ? state.objects[obj.attrs.center] : undefined;
    const surface = obj.attrs.surfacePoint ? state.objects[obj.attrs.surfacePoint] : undefined;
    if (!center || !surface) return null;
    const c1 = (center.attrs as { constraint?: { kind: string; x?: number; y?: number } }).constraint;
    const c2 = (surface.attrs as { constraint?: { kind: string; x?: number; y?: number } }).constraint;
    if (c1?.kind !== 'free' || c2?.kind !== 'free') return null;
    const dx = (c2.x ?? 0) - (c1.x ?? 0);
    const dy = (c2.y ?? 0) - (c1.y ?? 0);
    return [{ label: 'r', value: Math.hypot(dx, dy) }];
  },
  describe: (obj, state) => {
    const L = (id: string) => labelOf(id, state);
    const c = asConstruction(obj.attrs);
    if (c?.kind === 'circumscribed') {
      return `Đường tròn đi qua ${L(c.p1)}${L(c.p2)}${L(c.p3)}`;
    }
    if (c?.kind === 'incircle') {
      return `Đường tròn nội tiếp Δ${L(c.p1)}${L(c.p2)}${L(c.p3)}`;
    }
    if (c?.kind === 'excircle') {
      return `Đường tròn bàng tiếp Δ${L(c.p1)}${L(c.p2)}${L(c.p3)} đối diện ${L(c.opposite)}`;
    }
    if (c?.kind === 'diameter') {
      return `Đường tròn đường kính ${L(c.p1)}${L(c.p2)}`;
    }
    if (typeof obj.attrs.radius === 'number') {
      return `Đường tròn tâm ${L(obj.attrs.center!)} bán kính ${obj.attrs.radius}`;
    }
    return `Đường tròn tâm ${L(obj.attrs.center!)} bán kính ${L(obj.attrs.center!)}${L(obj.attrs.surfacePoint!)}`;
  },
  render: (obj, ctx) => {

    const board = ctx.jxg as any;
    
    /** Kiểm tra label có phải tên tâm (vd O, I, O1) hay không. */
    const isCenterLabel = (l: string) => /^[A-Z]['′]?\d*$/u.test(l);
    const isCenter = isCenterLabel(obj.label);

    const baseOpts: Record<string, unknown> = {
      name: obj.label,
      withLabel: isCenter ? (obj.attrs.showLabel ?? false) : true,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: obj.attrs.width ?? 2,
      dash: obj.attrs.dash ?? 0,
      fillColor: 'none',
      visible: obj.visible,
      fixed: obj.locked,
    };

    const c = asConstruction(obj.attrs);
    if (c?.kind === 'circumscribed') {
      const p1 = ctx.resolveRef(c.p1);
      const p2 = ctx.resolveRef(c.p2);
      const p3 = ctx.resolveRef(c.p3);
      if (isCenter) {
        // Nếu tên là tâm (O), tạo circumcenter có nhãn.
        const center = board.create('circumcenter', [p1, p2, p3], {
          visible: obj.visible,
          withLabel: true,
          fixed: true,
          name: obj.label,
        });
        const circ: any = board.create('circumcircle', [p1, p2, p3], { ...baseOpts, withLabel: false });
        circ.center = circ.center ?? center;
        circ._helpers = [center];
        return circ;
      }
      return board.create('circumcircle', [p1, p2, p3], baseOpts);
    }
    if (c?.kind === 'incircle') {
      const p1 = ctx.resolveRef(c.p1);
      const p2 = ctx.resolveRef(c.p2);
      const p3 = ctx.resolveRef(c.p3);
      if (isCenter) {
        const center = board.create('incenter', [p1, p2, p3], {
          visible: obj.visible,
          withLabel: true,
          fixed: true,
          name: obj.label,
        });
        const circ: any = board.create('incircle', [p1, p2, p3], { ...baseOpts, withLabel: false });
        circ.center = circ.center ?? center;
        circ._helpers = [center];
        return circ;
      }
      // Tên không phải tâm (vd alpha) -> nhãn gán cho đường tròn.
      return board.create('incircle', [p1, p2, p3], baseOpts);
    }
    if (c?.kind === 'excircle') {

      const P = [ctx.resolveRef(c.p1), ctx.resolveRef(c.p2), ctx.resolveRef(c.p3)] as any[];
      const ids = [c.p1, c.p2, c.p3];
      const oppIdx = Math.max(0, ids.indexOf(c.opposite)) as 0 | 1 | 2;
      const verts = (): [[number, number], [number, number], [number, number]] => [
        [P[0].X(), P[0].Y()], [P[1].X(), P[1].Y()], [P[2].X(), P[2].Y()],
      ];
      const ctr = () => excenter(verts(), oppIdx);
      const radius = () => {
        const I = ctr();
        const others = [0, 1, 2].filter((i) => i !== oppIdx);
        const v = verts();
        const a = v[others[0]]; const b = v[others[1]];
        const dx = b[0] - a[0]; const dy = b[1] - a[1];
        const len = Math.hypot(dx, dy) || 1;
        return Math.abs((I[0] - a[0]) * dy - (I[1] - a[1]) * dx) / len;
      };
      const center = board.create('point', [() => ctr()[0], () => ctr()[1]], { visible: false, withLabel: false, fixed: true, name: '' });

      const circ: any = board.create('circle', [center, () => radius()], baseOpts);
      circ._helpers = [center];
      return circ;
    }
    if (c?.kind === 'diameter') {
      const p1 = ctx.resolveRef(c.p1);
      const p2 = ctx.resolveRef(c.p2);
      // Tâm = trung điểm p1p2 (ẩn); circle qua p2 → bán kính = |tâm p2| = |p1p2|/2.
      const center = board.create('midpoint', [p1, p2], { visible: false, withLabel: false, fixed: true, name: '' });
      const circ: any = board.create('circle', [center, p2], baseOpts);
      circ._helpers = [center];
      return circ;
    }
    if (typeof obj.attrs.radius === 'number') {
      const center = ctx.resolveRef(obj.attrs.center!);
      return board.create('circle', [center, obj.attrs.radius], baseOpts);
    }
    const center = ctx.resolveRef(obj.attrs.center!);
    const surface = ctx.resolveRef(obj.attrs.surfacePoint!);
    return board.create('circle', [center, surface], baseOpts);
  },
};

registerKind(def);
