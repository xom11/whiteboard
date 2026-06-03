// src/core/scene/kinds/circle.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';

/**
 * Cách dựng đường tròn phái sinh. Khi `construction` có mặt, `center`/
 * `surfacePoint` bị bỏ qua — renderer dùng JSXGraph `circumcircle` để dựng
 * đường tròn ngoại tiếp 3 điểm.
 */
export type CircleConstruction =
  | { kind: 'circumscribed'; p1: string; p2: string; p3: string };

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
};

function constructionRefs(c: CircleConstruction): string[] {
  switch (c.kind) {
    case 'circumscribed': return [c.p1, c.p2, c.p3];
  }
}

const def: KindDef<CircleAttrs> = {
  type: 'circle',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (a?.construction) return;
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
    if (a.construction) return constructionRefs(a.construction);
    if (typeof a.radius === 'number') return [a.center!];
    return [a.center!, a.surfacePoint!];
  },
  measure: (obj, state) => {
    // Circumscribed circles need full geometric derivation — skip for now.
    if (obj.attrs.construction) return null;
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
    const c = obj.attrs.construction;
    if (c?.kind === 'circumscribed') {
      return `Đường tròn đi qua ${L(c.p1)}${L(c.p2)}${L(c.p3)}`;
    }
    if (typeof obj.attrs.radius === 'number') {
      return `Đường tròn tâm ${L(obj.attrs.center!)} bán kính ${obj.attrs.radius}`;
    }
    return `Đường tròn tâm ${L(obj.attrs.center!)} bán kính ${L(obj.attrs.center!)}${L(obj.attrs.surfacePoint!)}`;
  },
  render: (obj, ctx) => {

    const board = ctx.jxg as any;
    const baseOpts: Record<string, unknown> = {
      name: obj.label,
      withLabel: obj.attrs.showLabel ?? false,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: obj.attrs.width ?? 2,
      dash: obj.attrs.dash ?? 0,
      fillColor: 'none',
      visible: obj.visible,
      fixed: obj.locked,
    };
    const c = obj.attrs.construction;
    if (c?.kind === 'circumscribed') {
      const p1 = ctx.resolveRef(c.p1);
      const p2 = ctx.resolveRef(c.p2);
      const p3 = ctx.resolveRef(c.p3);
      return board.create('circumcircle', [p1, p2, p3], baseOpts);
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
