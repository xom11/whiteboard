import type { IntentBuilder3D } from './_types';
import { addPoint3dObj, resolveId, addShape3dObj } from './_types';
import { nextLabel } from '../../../../core/scene';

// Fields that are point/line/plane NAME references (resolve to ids);
// everything else is a numeric/param literal left intact.
const REF_FIELDS = new Set([
  'p1', 'p2', 'from', 'plane', 'a', 'b', 'a1', 'b1', 'a2', 'b2',
  'lineId', 'planeId', 'polygonId', 'sphereId',
]);

export const buildAddPoint3d: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'add-point-3d') return;
  const raw = intent.constraint as Record<string, unknown>;
  const kind = String(raw.kind);

  // Sugar: onSegmentEdge{a,b,t} → ensure a segment3d(a,b) then onLine{lineId,t}
  if (kind === 'onSegmentEdge') {
    const aId = resolveId(s, String(raw.a));
    const bId = resolveId(s, String(raw.b));
    const edgeLabel = nextLabel(s.store.getState(), 'segment3d');
    const lineId = addShape3dObj(s, 'segment3d', 'l', edgeLabel, { p1: aId, p2: bId }, false, false);
    addPoint3dObj(s, intent.name, { kind: 'onLine', lineId, t: typeof raw.t === 'number' ? raw.t : 0.5 });
    return;
  }

  // General path: resolve ref fields, leave numeric/param fields intact.
  const resolved: Record<string, unknown> = { kind };
  for (const [k, v] of Object.entries(raw)) {
    if (k === 'kind') continue;
    if (k === 'vertices' && Array.isArray(v)) {
      resolved[k] = v.map((name) => resolveId(s, String(name)));
    } else if (REF_FIELDS.has(k) && typeof v === 'string') {
      resolved[k] = resolveId(s, v);
    } else {
      resolved[k] = v;
    }
  }
  addPoint3dObj(s, intent.name, resolved);
};
