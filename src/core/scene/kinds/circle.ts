// src/core/scene/kinds/circle.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type CircleAttrs = {
  center: string;
  surfacePoint: string;
  color?: string;
  width?: number;
  dash?: number;
  showLabel?: boolean;
  showValue?: boolean;
};

const def: KindDef<CircleAttrs> = {
  type: 'circle',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.center || !a?.surfacePoint) {
      throw new Error('circle: center và surfacePoint bắt buộc');
    }
  },
  dependsOn: (a) => [a.center, a.surfacePoint],
  describe: (obj) => `Đường tròn tâm ${obj.attrs.center} qua ${obj.attrs.surfacePoint}`,
  render: () => null,
};

registerKind(def);
