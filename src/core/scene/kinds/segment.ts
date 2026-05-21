// src/core/scene/kinds/segment.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
import { labelOf } from './labelOf';

export type SegmentAttrs = {
  p1: string;
  p2: string;
  color?: string;
  width?: number;
  dash?: number;
  showLabel?: boolean;
  showValue?: boolean;
};

const def: KindDef<SegmentAttrs> = {
  type: 'segment',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.p1 || !a?.p2) throw new Error('segment: p1 và p2 bắt buộc');
  },
  dependsOn: (a) => [a.p1, a.p2],
  measure: (obj, state) => {
    const p1 = state.objects[obj.attrs.p1];
    const p2 = state.objects[obj.attrs.p2];
    if (!p1 || !p2) return null;
    const c1 = (p1.attrs as { constraint?: { kind: string; x?: number; y?: number } }).constraint;
    const c2 = (p2.attrs as { constraint?: { kind: string; x?: number; y?: number } }).constraint;
    if (c1?.kind !== 'free' || c2?.kind !== 'free') return null;
    const dx = (c2.x ?? 0) - (c1.x ?? 0);
    const dy = (c2.y ?? 0) - (c1.y ?? 0);
    return [{ label: 'length', value: Math.hypot(dx, dy) }];
  },
  describe: (obj, state) => `Đoạn thẳng ${labelOf(obj.attrs.p1, state)}${labelOf(obj.attrs.p2, state)}`,
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const p1 = ctx.resolveRef(obj.attrs.p1);
    const p2 = ctx.resolveRef(obj.attrs.p2);
    return board.create('segment', [p1, p2], {
      name: obj.label,
      withLabel: obj.attrs.showLabel ?? false,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: obj.attrs.width ?? 2,
      dash: obj.attrs.dash ?? 0,
      visible: obj.visible,
      fixed: obj.locked,
    });
  },
};

registerKind(def);
