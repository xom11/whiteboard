// src/core/scene/kinds/point.ts
import { registerKind } from '../registry';
import type { KindDef, RenderCtx } from '../types';
import { type Constraint2D, constraintRefs2D } from './2d-constraint';

export type PointAttrs = {
  constraint: Constraint2D;
  color?: string;
  showLabel?: boolean;
  showValue?: boolean;
  face?: 'o' | 'circle' | 'cross' | 'plus';
  size?: number;
};

const def: KindDef<PointAttrs> = {
  type: 'point',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a || !a.constraint || !a.constraint.kind) {
      throw new Error('point: constraint required');
    }
  },
  dependsOn: (a) => constraintRefs2D(a.constraint),
  describe: (obj) => {
    const c = obj.attrs.constraint;
    if (c.kind === 'free') return `${obj.label} = (${c.x.toFixed(2)}, ${c.y.toFixed(2)})`;
    if (c.kind === 'onAxis') return `${obj.label} trên trục ${c.axis} (t=${c.t.toFixed(2)})`;
    if (c.kind === 'onLine') return `${obj.label} trên đường ${c.lineId}`;
    if (c.kind === 'onSegment') return `${obj.label} trên đoạn ${c.segmentId}`;
    if (c.kind === 'onCircle') return `${obj.label} trên đường tròn ${c.circleId}`;
    if (c.kind === 'onPolygon') return `${obj.label} trên đa giác ${c.polygonId}`;
    return obj.label;
  },
  render: (_obj, _ctx: RenderCtx) => {
    // Render thực được implement ở JxgRenderer (PR 2.2 task 2.2.2).
    return null;
  },
};

registerKind(def);
