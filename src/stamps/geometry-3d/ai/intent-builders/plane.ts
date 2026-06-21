import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId } from './_types';

export const buildPlane3d: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'plane') return;
  const spec = intent.spec as Record<string, unknown>;
  const kind = String(spec.kind);

  if (kind === 'threePoints') {
    addShape3dObj(s, 'plane3d', 'mp', intent.name, {
      p1: resolveId(s, String(spec.p1)),
      p2: resolveId(s, String(spec.p2)),
      p3: resolveId(s, String(spec.p3)),
    });
    return;
  }

  if (kind === 'parallelThrough') {
    addShape3dObj(s, 'plane3d', 'mp', intent.name, {
      construction: {
        kind: 'planeParallelThrough',
        point: resolveId(s, String(spec.point)),
        refPlane: resolveId(s, String(spec.refPlane)),
      },
    });
    return;
  }

  if (kind === 'perpToLine') {
    addShape3dObj(s, 'plane3d', 'mp', intent.name, {
      construction: {
        kind: 'planePerpToLine',
        point: resolveId(s, String(spec.point)),
        lineA: resolveId(s, String(spec.lineA)),
        lineB: resolveId(s, String(spec.lineB)),
      },
    });
    return;
  }
};
