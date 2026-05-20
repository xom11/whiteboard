// src/core/scene/kinds/cylinder3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Cylinder3DAttrs = { baseCenter: string; topCenter: string; radius: number; color?: string };

// Faceted cylinder: 16 segments, copied from old JxgRenderer faceted.ts approach.
const CURVED_SEGMENTS = 16;

registerKind<Cylinder3DAttrs>({
  type: 'cylinder3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.baseCenter || !a?.topCenter) throw new Error('cylinder3d: baseCenter/topCenter required');
    if (!(a.radius > 0)) throw new Error('cylinder3d: radius > 0');
  },
  dependsOn: (a) => [a.baseCenter, a.topCenter],
  describe: (obj) => `Trụ ${obj.label} R=${obj.attrs.radius.toFixed(2)}`,
  render: (obj, ctx) => {
    const view = ctx.jxg as any;
    const a = ctx.resolveRef(obj.attrs.baseCenter) as any;
    const b = ctx.resolveRef(obj.attrs.topCenter) as any;
    const r = obj.attrs.radius;
    // Read world coords from JSXGraph point3d objects at render time.
    const ax = a.X?.() ?? 0, ay = a.Y?.() ?? 0, az = a.Z?.() ?? 0;
    const bx = b.X?.() ?? 0, by = b.Y?.() ?? 0, bz = b.Z?.() ?? 0;
    // Build faceted cylinder vertices.
    const baseRing: [number, number, number][] = [];
    const topRing: [number, number, number][] = [];
    for (let i = 0; i < CURVED_SEGMENTS; i++) {
      const theta = (i / CURVED_SEGMENTS) * Math.PI * 2;
      const dx = r * Math.cos(theta);
      const dy = r * Math.sin(theta);
      baseRing.push([ax + dx, ay + dy, az]);
      topRing.push([bx + dx, by + dy, bz]);
    }
    const vertices = [...baseRing, ...topRing];
    const faces: number[][] = [];
    faces.push(baseRing.map((_, i) => i));
    faces.push(topRing.map((_, i) => CURVED_SEGMENTS + i));
    for (let i = 0; i < CURVED_SEGMENTS; i++) {
      const next = (i + 1) % CURVED_SEGMENTS;
      faces.push([i, next, CURVED_SEGMENTS + next, CURVED_SEGMENTS + i]);
    }
    const vertJxgs: unknown[] = vertices.map((v, i) =>
      view.create('point3d', v, {
        id: `${obj.id}.v${i}`,
        visible: false,
        fixed: true,
        withLabel: false,
      })
    );
    const faceJxgs: unknown[] = faces.map((face, fi) =>
      view.create('polygon3d', [face.map(idx => vertJxgs[idx])], {
        id: `${obj.id}.face${fi}`,
        fillOpacity: 0.25,
        fillColor: obj.attrs.color ?? '#f97316',
        strokeColor: '#0066cc',
        strokeWidth: 1.5,
        visible: obj.visible,
      })
    );
    return { _verts: vertJxgs, faces: faceJxgs };
  },
});
