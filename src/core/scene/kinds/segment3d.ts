// src/core/scene/kinds/segment3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Segment3DAttrs = { p1: string; p2: string; color?: string };

const def: KindDef<Segment3DAttrs> = {
  type: 'segment3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.p1 || !a?.p2) throw new Error('segment3d: p1 và p2 bắt buộc');
  },
  dependsOn: (a) => [a.p1, a.p2],
  measure: (obj, state) => {
    const p1 = state.objects[obj.attrs.p1];
    const p2 = state.objects[obj.attrs.p2];
    if (!p1 || !p2) return null;
    const c1 = (p1.attrs as { constraint?: { kind: string; x?: number; y?: number; z?: number } }).constraint;
    const c2 = (p2.attrs as { constraint?: { kind: string; x?: number; y?: number; z?: number } }).constraint;
    if (c1?.kind !== 'free' || c2?.kind !== 'free') return null;
    const dx = (c2.x ?? 0) - (c1.x ?? 0);
    const dy = (c2.y ?? 0) - (c1.y ?? 0);
    const dz = (c2.z ?? 0) - (c1.z ?? 0);
    return [{ label: 'length', value: Math.hypot(dx, dy, dz) }];
  },
  describe: (obj) => `Đoạn ${obj.attrs.p1}${obj.attrs.p2}`,
  render: (obj, ctx) => {
    const view = ctx.jxg as any;
    const pA = ctx.resolveRef(obj.attrs.p1);
    const pB = ctx.resolveRef(obj.attrs.p2);
    return view.create('line3d', [pA, pB], {
      straightFirst: false,
      straightLast: false,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: 2,
      visible: obj.visible,
    });
  },
};

registerKind(def);
