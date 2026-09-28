// src/stamps/geometry-2d/ai/intent-builders/add-point/midpoint.ts
//
// add-point constraint.kind=midpoint — move verbatim từ handleAddPoint switch (Phase 2b, #45).

import type { BuildState } from '../_types';
import { IntentBuilderError } from '../_types';
import { addPoint, ensureSegment, parseEnds } from '../shared';
import type { AddPointIntentT } from '../../intent';

export const buildMidpoint = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'midpoint') return;
  const name = intent.name;
  const ends = parseEnds(c.of);
  if (!ends) throw new IntentBuilderError(`midpoint.of không parse được: ${c.of}`, intent);
  if (c.hidden) {
    // Điểm phụ: không hiện, không vẽ đoạn.
    addPoint(s, { name, kind: 'midpoint', p1: ends[0], p2: ends[1], visible: false });
    return;
  }
  // Ensure segment for the midpoint reference (optional but nice for rendering)
  ensureSegment(s, ends[0], ends[1]);
  addPoint(s, { name, kind: 'midpoint', p1: ends[0], p2: ends[1] });
};
