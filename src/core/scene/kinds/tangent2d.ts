// src/core/scene/kinds/tangent2d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export interface Tangent2DAttrs {
  pointId: string;
}

const def: KindDef<Tangent2DAttrs> = {
  type: 'tangent2d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a || typeof a.pointId !== 'string' || !a.pointId) {
      throw new Error('tangent2d: pointId bắt buộc');
    }
  },
  dependsOn: (a) => [a.pointId],
  describe: (obj) => `Tiếp tuyến tại ${obj.attrs.pointId}`,
  render: (obj, ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const board = ctx.jxg as any;
    const pt = ctx.resolveRef(obj.attrs.pointId);
    if (!pt) return null;
    return board.create('tangent', [pt], {
      strokeColor: '#65a30d',
      strokeWidth: 1.5,
      dash: 2,
      withLabel: false,
    });
  },
};

registerKind(def);
