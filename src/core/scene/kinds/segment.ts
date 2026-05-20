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
  render: () => null,
};

registerKind(def);
