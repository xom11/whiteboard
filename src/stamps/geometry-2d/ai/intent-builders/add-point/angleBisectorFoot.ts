// src/stamps/geometry-2d/ai/intent-builders/add-point/angleBisectorFoot.ts
//
// add-point constraint.kind=angleBisectorFoot — move verbatim từ handleAddPoint switch (Phase 2b, #45).
// Multi-emit: angleBisector shape + ensureSegment + intersection point.

import type { BuildState } from '../_types';
import { IntentBuilderError } from '../_types';
import { addPoint, addShape, ensureSegment, parseEnds, resolveSegmentRef, uniqueShapeName } from '../shared';
import type { AddPointIntentT } from '../../intent';

export const buildAngleBisectorFoot = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'angleBisectorFoot') return;
  const name = intent.name;
  const ends = parseEnds(c.onLine);
  if (!ends) throw new IntentBuilderError(`angleBisectorFoot.onLine không parse: ${c.onLine}`, intent);
  const bisName = uniqueShapeName(s, `ab_${c.from}${c.onLine}`);
  addShape(s, { name: bisName, kind: 'angleBisector', p1: ends[0], vertex: c.from, p2: ends[1] });
  ensureSegment(s, ends[0], ends[1]);
  addPoint(s, { name, kind: 'intersection', ref1: bisName, ref2: resolveSegmentRef(s, c.onLine) });
};
