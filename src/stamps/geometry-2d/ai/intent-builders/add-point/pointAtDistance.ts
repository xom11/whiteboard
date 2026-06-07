// src/stamps/geometry-2d/ai/intent-builders/add-point/pointAtDistance.ts
//
// add-point constraint.kind=pointAtDistance (Cụm B) — move verbatim từ handleAddPoint switch (Phase 2b, #45).
// Multi-emit: ensureSegment + pointAtDistance point.

import type { BuildState } from '../_types';
import { addPoint, ensureSegment } from '../shared';
import type { AddPointIntentT } from '../../intent';

export const buildPointAtDistance = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'pointAtDistance') return;
  ensureSegment(s, c.from, c.through);
  addPoint(s, { name: intent.name, kind: 'pointAtDistance', from: c.from, through: c.through, distance: c.distance });
};
