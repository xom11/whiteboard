import type { IntentBuilder3D } from './_types';
import { IntentBuilder3DError, addShape3dObj, resolveId } from './_types';
import { nextLabel } from '../../../../core/scene';

export const buildLine3d: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'line') return;
  // line3dIntent factory routes non-(name|kind) keys into refs record.
  const refs = (intent.refs ?? {}) as Record<string, unknown>;
  const label = intent.name ?? nextLabel(s.store.getState(), 'line3d');
  const lineKind = intent.kind;

  // Helper: read a required string ref and resolve to scene id.
  function need(field: string): string {
    const v = refs[field];
    if (typeof v !== 'string') throw new IntentBuilder3DError(`thiếu ref '${field}' cho line kind '${lineKind}'`, intent);
    return resolveId(s, v);
  }

  if (intent.kind === 'planePlaneIntersection') {
    addShape3dObj(s, 'line3d', 'l', label, {
      construction: {
        kind: 'planePlaneIntersection',
        plane1: need('plane1'),
        plane2: need('plane2'),
      },
    });
    return;
  }

  if (intent.kind === 'parallelThrough') {
    addShape3dObj(s, 'line3d', 'l', label, {
      construction: {
        kind: 'lineParallelThrough',
        point: need('point'),
        dirA: need('dirA'),
        dirB: need('dirB'),
      },
    });
    return;
  }

  if (intent.kind === 'perpToPlane') {
    addShape3dObj(s, 'line3d', 'l', label, {
      construction: {
        kind: 'linePerpToPlane',
        point: need('point'),
        plane: need('plane'),
      },
    });
    return;
  }

  if (intent.kind === 'segment' || intent.kind === 'line' || intent.kind === 'ray') {
    const p1 = need('p1');
    const p2 = need('p2');
    const kind = intent.kind === 'line' ? 'line3d' : intent.kind === 'ray' ? 'ray3d' : 'segment3d';
    addShape3dObj(s, kind, 'l', label, { p1, p2 }, true, false);
    return;
  }

  throw new IntentBuilder3DError(`line kind chưa hỗ trợ: ${lineKind}`, intent);
};
