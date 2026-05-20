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
    // Render thực được implement ở JxgRenderer3D (task 1.3.2).
    // Helper này chỉ cần giữ signature; renderer gọi nó với jxg = view3d.
    return null;
  },
};

registerKind(def);
