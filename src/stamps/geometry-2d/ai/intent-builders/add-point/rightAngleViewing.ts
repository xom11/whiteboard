// src/stamps/geometry-2d/ai/intent-builders/add-point/rightAngleViewing.ts
//
// add-point constraint.kind=rightAngleViewing — move verbatim từ handleAddPoint switch (Phase 2b, #45).
// Multi-emit: hidden midpoint + hidden circleCP (Thales diameter) + intersection line∩circle.

import type { BuildState } from '../_types';
import { addPoint, addShape, resolveSegmentRef, uniquePointName, uniqueShapeName } from '../shared';
import type { AddPointIntentT } from '../../intent';

export const buildRightAngleViewing = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'rightAngleViewing') return;
  const name = intent.name;
  // ∠ a-name-b = 90° ⇔ name trên đường tròn đường kính ab (Thales).
  // Dựng: midpoint(ab) ẩn → circleCP đường kính ab ẩn → giao line∩circle.
  const midName = uniquePointName(s, `mid_${c.a}${c.b}`);
  addPoint(s, { name: midName, kind: 'midpoint', p1: c.a, p2: c.b, visible: false });
  const circName = uniqueShapeName(s, `dia_${c.a}${c.b}`);
  addShape(s, { name: circName, kind: 'circleCP', center: midName, surfacePoint: c.a, visible: false });
  const lineRef = resolveSegmentRef(s, c.onLine);
  addPoint(s, { name, kind: 'intersection', ref1: lineRef, ref2: circName, branch: c.which ?? 0 });
};
