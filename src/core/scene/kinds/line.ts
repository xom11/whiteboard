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
  render: () => null,
};

registerKind(def);
