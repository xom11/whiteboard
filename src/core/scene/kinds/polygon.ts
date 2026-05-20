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
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const verts = obj.attrs.vertices.map(id => ctx.resolveRef(id));
    return board.create('polygon', verts, {
      name: obj.label,
      withLabel: obj.attrs.showLabel ?? false,
      borders: {
        strokeColor: obj.attrs.color ?? '#0f172a',
        strokeWidth: obj.attrs.width ?? 2,
      },
      fillColor: obj.attrs.color ?? '#60a5fa',
      fillOpacity: obj.attrs.fillOpacity ?? 0.15,
      visible: obj.visible,
      fixed: obj.locked,
    });
  },
};

registerKind(def);
