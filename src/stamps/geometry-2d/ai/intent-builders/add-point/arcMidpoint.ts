// src/stamps/geometry-2d/ai/intent-builders/add-point/arcMidpoint.ts
//
// add-point constraint.kind=arcMidpoint (Cụm A) — move verbatim từ handleAddPoint switch (Phase 2b, #45).

import type { BuildState } from '../_types';
import { addPoint } from '../shared';
import type { AddPointIntentT } from '../../intent';

export const buildArcMidpoint = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'arcMidpoint') return;
  addPoint(s, {
    name: intent.name, kind: 'arcMidpoint', circle: c.circle, a: c.a, b: c.b,
    ...(c.containing ? { containing: c.containing } : { notContaining: c.notContaining }),
  });
};
