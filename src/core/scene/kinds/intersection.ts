// src/core/scene/kinds/intersection.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type IntersectionAttrs =
  | { kind: 'lineLine'; ref1: string; ref2: string; color?: string }
  | { kind: 'lineCircle'; ref1: string; ref2: string; branch: 0 | 1; color?: string }
  | { kind: 'circleCircle'; ref1: string; ref2: string; branch: 0 | 1; color?: string };

const def: KindDef<IntersectionAttrs> = {
  type: 'intersection',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a || !('kind' in a)) throw new Error('intersection: kind bắt buộc');
    if (!a.ref1 || !a.ref2) throw new Error('intersection: ref1 và ref2 bắt buộc');
    if (a.kind === 'lineLine') return;
    if (a.kind === 'lineCircle' || a.kind === 'circleCircle') {
      if (a.branch !== 0 && a.branch !== 1) {
        throw new Error(`intersection.${a.kind}: branch phải là 0 hoặc 1`);
      }
      return;
    }
    throw new Error(`intersection: kind không hợp lệ "${(a as { kind: string }).kind}"`);
  },
  dependsOn: (a) => [a.ref1, a.ref2],
  describe: (obj) => {
    const a = obj.attrs;
    return `${obj.label} = giao ${a.ref1} ∩ ${a.ref2}`;
  },
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const a = ctx.resolveRef(obj.attrs.ref1);
    const b = ctx.resolveRef(obj.attrs.ref2);
    const opts: Record<string, unknown> = {
      name: obj.label,
      withLabel: true,
      strokeColor: obj.attrs.color ?? '#dc2626',
      fillColor: obj.attrs.color ?? '#dc2626',
      visible: obj.visible,
      fixed: obj.locked,
    };
    if (obj.attrs.kind === 'lineLine') {
      return board.create('intersection', [a, b, 0], opts);
    }
    // lineCircle hoặc circleCircle: branch 0/1
    const branch = obj.attrs.branch ?? 0;
    return board.create('intersection', [a, b, branch], opts);
  },
};

registerKind(def);
