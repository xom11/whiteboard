// src/stamps/geometry-2d/ai/intent-builders/add-point/onSegment-free.ts
//
// add-point onSegment/free — move verbatim từ handleAddPoint switch (Phase 2b, #45).

import type { BuildState } from '../_types';
import { addPoint, defaultFreeCoord, resolveSegmentRef } from '../shared';
import type { AddPointIntentT } from '../../intent';

export const buildOnSegment = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'onSegment') return;
  const ref = resolveSegmentRef(s, c.of);
  addPoint(s, { name: intent.name, kind: 'onSegment', segmentId: ref, t: c.t ?? 0.5 });
};

export const buildFree = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'free') return;
  const [x, y] = c.at ?? defaultFreeCoord(s);
  addPoint(s, { name: intent.name, kind: 'free', x, y });
};
