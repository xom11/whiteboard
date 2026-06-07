// src/stamps/geometry-2d/ai/intent-builders/add-point/tangency.ts
//
// add-point tangency: tangencyPoint/tangentPoint — move verbatim từ handleAddPoint switch (Phase 2b, #45).

import type { BuildState } from '../_types';
import { addPoint, resolveSegmentRef } from '../shared';
import type { AddPointIntentT } from '../../intent';

export const buildTangencyPoint = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'tangencyPoint') return;
  const lineRef = resolveSegmentRef(s, c.onLine);
  addPoint(s, {
    name: intent.name, kind: 'tangencyPoint',
    circle: c.circle, onLine: lineRef,
  });
};

export const buildTangentPoint = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'tangentPoint') return;
  addPoint(s, {
    name: intent.name, kind: 'tangentPointExt',
    from: c.from, circle: c.circle, which: c.which,
  });
};
