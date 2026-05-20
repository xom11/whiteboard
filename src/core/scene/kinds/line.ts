// src/core/scene/kinds/line.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type LineAttrs = {
  p1: string;
  p2: string;
  color?: string;
  width?: number;
  dash?: number;
  showLabel?: boolean;
};

const def: KindDef<LineAttrs> = {
  type: 'line',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.p1 || !a?.p2) throw new Error('line: p1 và p2 bắt buộc');
  },
  dependsOn: (a) => [a.p1, a.p2],
  describe: (obj) => `Đường thẳng ${obj.attrs.p1}${obj.attrs.p2}`,
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const p1 = ctx.resolveRef(obj.attrs.p1);
    const p2 = ctx.resolveRef(obj.attrs.p2);
    return board.create('line', [p1, p2], {
      name: obj.label,
      withLabel: obj.attrs.showLabel ?? false,
      straightFirst: true,
      straightLast: true,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: obj.attrs.width ?? 2,
      dash: obj.attrs.dash ?? 0,
      visible: obj.visible,
      fixed: obj.locked,
    });
  },
};

registerKind(def);
