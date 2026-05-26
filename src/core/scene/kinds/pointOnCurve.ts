// src/core/scene/kinds/pointOnCurve.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export interface PointOnCurveAttrs {
  functionId: string;
  x: number;
}

const def: KindDef<PointOnCurveAttrs> = {
  type: 'pointOnCurve',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a || typeof a.functionId !== 'string' || !a.functionId) {
      throw new Error('pointOnCurve: functionId bắt buộc');
    }
    if (typeof a.x !== 'number' || !Number.isFinite(a.x)) {
      throw new Error('pointOnCurve: x phải là finite number');
    }
  },
  dependsOn: (a) => [a.functionId],
  describe: (obj) => `${obj.label} trên ${obj.attrs.functionId} tại x=${obj.attrs.x.toFixed(3)}`,
  render: (obj, ctx) => {
     
    const board = ctx.jxg as any;
    const curve = ctx.resolveRef(obj.attrs.functionId);
    if (!curve) return null;
    return board.create('glider', [obj.attrs.x, 0, curve], {
      name: obj.label,
      size: 3,
      withLabel: obj.label !== '',
      fillColor: '#000',
      strokeColor: '#000',
    });
  },
};

registerKind(def);
