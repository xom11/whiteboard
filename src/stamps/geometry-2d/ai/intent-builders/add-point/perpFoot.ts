// src/stamps/geometry-2d/ai/intent-builders/add-point/perpFoot.ts
//
// add-point constraint.kind=perpFoot — move verbatim từ handleAddPoint switch (Phase 2b, #45).

import type { BuildState } from '../_types';
import { addPoint, resolveSegmentRef } from '../shared';
import type { AddPointIntentT } from '../../intent';

export const buildPerpFoot = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'perpFoot') return;
  const name = intent.name;
  const lineName = resolveSegmentRef(s, c.onLine);
  addPoint(s, { name, kind: 'perpFoot', from: c.from, onLine: lineName });
};
