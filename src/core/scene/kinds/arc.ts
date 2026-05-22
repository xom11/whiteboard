// src/core/scene/kinds/arc.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';

export type ArcConstruction =
  | { kind: 'semicircle'; p1: string; p2: string }
  | { kind: 'byCenter';   center: string; p1: string; p2: string }
  | { kind: 'by3Points';  p1: string; p2: string; p3: string };

export type ArcAttrs = {
  construction: ArcConstruction;
  color?: string;
  width?: number;
  dash?: number;
  showLabel?: boolean;
};

function constructionRefs(c: ArcConstruction): string[] {
  switch (c.kind) {
    case 'semicircle': return [c.p1, c.p2];
    case 'byCenter':   return [c.center, c.p1, c.p2];
    case 'by3Points':  return [c.p1, c.p2, c.p3];
  }
}

const def: KindDef<ArcAttrs> = {
  type: 'arc',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    const c = a?.construction;
    if (!c) throw new Error('arc: construction bắt buộc');
    if (c.kind === 'semicircle') {
      if (!c.p1 || !c.p2) throw new Error('arc.semicircle: p1, p2 bắt buộc');
    } else if (c.kind === 'byCenter') {
      if (!c.center || !c.p1 || !c.p2) throw new Error('arc.byCenter: center, p1, p2 bắt buộc');
    } else if (c.kind === 'by3Points') {
      if (!c.p1 || !c.p2 || !c.p3) throw new Error('arc.by3Points: p1, p2, p3 bắt buộc');
    }
  },
  dependsOn: (a) => constructionRefs(a.construction),
  describe: (obj, state) => {
    const L = (id: string) => labelOf(id, state);
    const c = obj.attrs.construction;
    switch (c.kind) {
      case 'semicircle': return `Nửa đường tròn đường kính ${L(c.p1)}${L(c.p2)}`;
      case 'byCenter':   return `Cung tròn tâm ${L(c.center)} từ ${L(c.p1)} đến ${L(c.p2)}`;
      case 'by3Points':  return `Cung tròn qua ${L(c.p1)}${L(c.p2)}${L(c.p3)}`;
    }
  },
  render: (obj, ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    if (c.kind === 'semicircle') {
      const p1 = ctx.resolveRef(c.p1);
      const p2 = ctx.resolveRef(c.p2);
      return board.create('semicircle', [p1, p2], baseOpts);
    }
    if (c.kind === 'byCenter') {
      const O = ctx.resolveRef(c.center);
      const A = ctx.resolveRef(c.p1);
      const B = ctx.resolveRef(c.p2);
      return board.create('arc', [O, A, B], baseOpts);
    }
    // by3Points
    const A = ctx.resolveRef(c.p1);
    const B = ctx.resolveRef(c.p2);
    const C = ctx.resolveRef(c.p3);
    return board.create('circumcirclearc', [A, B, C], baseOpts);
  },
};

registerKind(def);
