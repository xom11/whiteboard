// src/core/scene/kinds/cone3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Cone3DAttrs = { baseCenter: string; apex: string; radius: number; color?: string };

// Faceted cone: 16 segments, copied from old JxgRenderer faceted.ts approach.
const CURVED_SEGMENTS = 16;

registerKind<Cone3DAttrs>({
  type: 'cone3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.baseCenter || !a?.apex) throw new Error('cone3d: baseCenter/apex required');
    if (!(a.radius > 0)) throw new Error('cone3d: radius > 0');
  },
  dependsOn: (a) => [a.baseCenter, a.apex],
  describe: (obj) => `Nón ${obj.label} R=${obj.attrs.radius.toFixed(2)}`,
  render: (obj, ctx) => {
    const view = ctx.jxg as any;
    const base = ctx.resolveRef(obj.attrs.baseCenter) as any;
    const apexPt = ctx.resolveRef(obj.attrs.apex) as any;
    const r = obj.attrs.radius;
    // Read world coords from JSXGraph point3d objects at render time.
    const bx = base.X?.() ?? 0, by = base.Y?.() ?? 0, bz = base.Z?.() ?? 0;
    const apexCoords: [number, number, number] = [
      apexPt.X?.() ?? 0,
      apexPt.Y?.() ?? 0,
      apexPt.Z?.() ?? 0,
    ];
    // Build faceted cone vertices.
    const baseRing: [number, number, number][] = [];
    for (let i = 0; i < CURVED_SEGMENTS; i++) {
      const theta = (i / CURVED_SEGMENTS) * Math.PI * 2;
      baseRing.push([bx + r * Math.cos(theta), by + r * Math.sin(theta), bz]);
    }
    const apexIdx = baseRing.length;
    const vertices = [...baseRing, apexCoords];
    const faces: number[][] = [baseRing.map((_, i) => i)];
    for (let i = 0; i < CURVED_SEGMENTS; i++) {
      faces.push([i, (i + 1) % CURVED_SEGMENTS, apexIdx]);
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
        fillColor: obj.attrs.color ?? '#f59e0b',
        strokeColor: '#0066cc',
        strokeWidth: 1.5,
        visible: obj.visible,
      })
    );
    return { _verts: vertJxgs, faces: faceJxgs };
  },
});
