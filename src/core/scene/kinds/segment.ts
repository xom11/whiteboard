// src/core/scene/kinds/segment.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

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
  describe: (obj) => `Đoạn ${obj.attrs.p1}${obj.attrs.p2}`,
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
