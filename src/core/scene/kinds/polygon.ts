// src/core/scene/kinds/polygon.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type PolygonAttrs = {
  vertices: string[];
  color?: string;
  fillOpacity?: number;
  width?: number;
  showLabel?: boolean;
  showValue?: boolean;   // hiển thị diện tích
};

const def: KindDef<PolygonAttrs> = {
  type: 'polygon',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!Array.isArray(a?.vertices) || a.vertices.length < 3) {
      throw new Error('polygon: cần ít nhất 3 đỉnh');
    }
  },
  dependsOn: (a) => [...a.vertices],
  describe: (obj) => `Đa giác ${obj.attrs.vertices.join('')}`,
  render: () => null,
};

registerKind(def);
