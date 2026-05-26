// src/core/scene/kinds/slope2d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export interface Slope2DAttrs {
  pointId: string;
}

const def: KindDef<Slope2DAttrs> = {
  type: 'slope2d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a || typeof a.pointId !== 'string' || !a.pointId) {
      throw new Error('slope2d: pointId bắt buộc');
    }
  },
  dependsOn: (a) => [a.pointId],
  describe: (obj) => `Slope tại ${obj.attrs.pointId}`,
  render: (obj, ctx) => {
     
    const board = ctx.jxg as any;
    const pt = ctx.resolveRef(obj.attrs.pointId);
    if (!pt) return null;
    return board.create('slopetriangle', [pt], {
      name: obj.label,
      withLabel: true,
      fillColor: '#9333ea',
      strokeColor: '#9333ea',
      fillOpacity: 0.2,
    });
  },
};

registerKind(def);
