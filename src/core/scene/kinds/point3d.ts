// src/core/scene/kinds/point3d.ts
import { registerKind } from '../registry';
import type { KindDef, RenderCtx, SceneObject } from '../types';
import { type Constraint3D, constraintRefs } from './3d-constraint';

export type Point3DAttrs = {
  constraint: Constraint3D;
  color?: string;
};

const def: KindDef<Point3DAttrs> = {
  type: 'point3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a || !a.constraint || !a.constraint.kind) {
      throw new Error('point3d: constraint required');
    }
  },
  dependsOn: (a) => constraintRefs(a.constraint),
  measure: (obj) => {
    const c = obj.attrs.constraint;
    if (c.kind === 'free') {
      return [
        { label: 'x', value: c.x },
        { label: 'y', value: c.y },
        { label: 'z', value: c.z },
      ];
    }
    if (c.kind === 'onGround') {
      return [
        { label: 'x', value: c.x },
        { label: 'y', value: c.y },
        { label: 'z', value: 0 },
      ];
    }
    return null;
  },
  describe: (obj) => {
    const c = obj.attrs.constraint;
    if (c.kind === 'free') return `${obj.label} = (${c.x.toFixed(2)}, ${c.y.toFixed(2)}, ${c.z.toFixed(2)})`;
    if (c.kind === 'onGround') return `${obj.label} = (${c.x.toFixed(2)}, ${c.y.toFixed(2)}, 0)`;
    if (c.kind === 'onAxis') return `${obj.label} trên trục ${c.axis} (t=${c.t.toFixed(2)})`;
    if (c.kind === 'onPlane') return `${obj.label} trên mặt ${c.planeId}`;
    if (c.kind === 'onLine') return `${obj.label} trên đường ${c.lineId}`;
    if (c.kind === 'onPolygon') return `${obj.label} trên đa giác ${c.polygonId}`;
    if (c.kind === 'onSphere') return `${obj.label} trên mặt cầu ${c.sphereId}`;
    return obj.label;
  },
  render: (obj, ctx: RenderCtx) => {
    const view = ctx.jxg as any;
    const c = obj.attrs.constraint;
    const opts = {
      name: obj.label,
      visible: obj.visible,
      fixed: obj.locked,
      strokeColor: obj.attrs.color ?? '#1e40af',
      fillColor: obj.attrs.color ?? '#1e40af',
      size: 4,
    };
    if (c.kind === 'free') {
      return view.create('point3d', [c.x, c.y, c.z], opts);
    } else if (c.kind === 'onGround') {
      return view.create('point3d', [c.x, c.y, 0], opts);
    } else if (c.kind === 'onAxis') {
      const coords =
        c.axis === 'x' ? [c.t, 0, 0] :
        c.axis === 'y' ? [0, c.t, 0] :
                         [0, 0, c.t];
      return view.create('point3d', coords, opts);
    } else if (c.kind === 'onPlane') {
      const plane = ctx.resolveRef(c.planeId) as any;
      return view.create('point3d', [
        () => plane.F(c.u, c.v)[0],
        () => plane.F(c.u, c.v)[1],
        () => plane.F(c.u, c.v)[2],
      ], opts);
    } else if (c.kind === 'onLine') {
      const line = ctx.resolveRef(c.lineId) as any;
      return view.create('point3d', [
        () => line.F(c.t)[0],
        () => line.F(c.t)[1],
        () => line.F(c.t)[2],
      ], opts);
    } else if (c.kind === 'onPolygon') {
      const poly = ctx.resolveRef(c.polygonId) as any;
      return view.create('point3d', [
        () => poly.F(c.u, c.v)[0],
        () => poly.F(c.u, c.v)[1],
        () => poly.F(c.u, c.v)[2],
      ], opts);
    } else if (c.kind === 'onSphere') {
      const sph = ctx.resolveRef(c.sphereId) as any;
      return view.create('point3d', [
        () => sph.F(c.theta, c.phi)[0],
        () => sph.F(c.theta, c.phi)[1],
        () => sph.F(c.theta, c.phi)[2],
      ], opts);
    }
    return view.create('point3d', [0, 0, 0], opts);
  },
};

registerKind(def);
