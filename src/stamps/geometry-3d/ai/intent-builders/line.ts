import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId } from './_types';
import { nextLabel } from '../../../../core/scene';

export const buildLine3d: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'line') return;
  // line3dIntent factory routes non-(name|kind) keys into refs record.
  const refs = (intent.refs ?? {}) as Record<string, unknown>;
  const label = intent.name ?? nextLabel(s.store.getState(), 'line3d');

  if (intent.kind === 'planePlaneIntersection') {
    addShape3dObj(s, 'line3d', 'l', label, {
      construction: {
        kind: 'planePlaneIntersection',
        plane1: resolveId(s, String((intent as any).plane1 ?? refs.plane1)),
        plane2: resolveId(s, String((intent as any).plane2 ?? refs.plane2)),
      },
    });
    return;
  }

  if (intent.kind === 'perpToPlane') {
    addShape3dObj(s, 'line3d', 'l', label, {
      construction: {
        kind: 'linePerpToPlane',
        point: resolveId(s, String((intent as any).point ?? refs.point)),
        plane: resolveId(s, String((intent as any).plane ?? refs.plane)),
      },
    });
    return;
  }

  // segment/line/ray fall back to two-point
  const p1 = resolveId(s, String((intent as any).p1 ?? refs.p1));
  const p2 = resolveId(s, String((intent as any).p2 ?? refs.p2));
  const kind = intent.kind === 'line' ? 'line3d' : intent.kind === 'ray' ? 'ray3d' : 'segment3d';
  addShape3dObj(s, kind, 'l', label, { p1, p2 });
};
