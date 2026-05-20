// src/core/scene/kinds/point.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';
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
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const c = obj.attrs.constraint;
    const opts: Record<string, unknown> = {
      name: obj.label,
      withLabel: obj.attrs.showLabel ?? true,
      visible: obj.visible,
      fixed: obj.locked,
      strokeColor: obj.attrs.color ?? '#1e40af',
      fillColor: obj.attrs.color ?? '#1e40af',
      face: obj.attrs.face ?? 'o',
      size: obj.attrs.size ?? 4,
    };
    if (c.kind === 'free') return board.create('point', [c.x, c.y], opts);
    if (c.kind === 'onAxis') {
      const coords: [number, number] = c.axis === 'x' ? [c.t, 0] : [0, c.t];
      return board.create('point', coords, opts);
    }
    if (c.kind === 'onLine') {
      const line = ctx.resolveRef(c.lineId) as any;
      return board.create('glider', [c.t, c.t, line], opts);
    }
    if (c.kind === 'onSegment') {
      const seg = ctx.resolveRef(c.segmentId) as any;
      return board.create('glider', [c.t, c.t, seg], opts);
    }
    if (c.kind === 'onCircle') {
      const circle = ctx.resolveRef(c.circleId) as any;
      return board.create('glider', [Math.cos(c.theta), Math.sin(c.theta), circle], opts);
    }
    if (c.kind === 'onPolygon') {
      const poly = ctx.resolveRef(c.polygonId) as any;
      return board.create('glider', [c.u, c.v, poly], opts);
    }
    return board.create('point', [0, 0], opts);
  },
};

registerKind(def);
