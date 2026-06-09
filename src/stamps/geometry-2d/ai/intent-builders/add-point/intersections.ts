// src/stamps/geometry-2d/ai/intent-builders/add-point/intersections.ts
//
// add-point intersections: intersection/secondIntersection/circleIntersection
// — move verbatim từ handleAddPoint switch (Phase 2b, #45).

import type { BuildState } from '../_types';
import { addPoint, resolveSegmentRef } from '../shared';
import type { AddPointIntentT } from '../../intent';

export const buildIntersection = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'intersection') return;
  const r1 = resolveSegmentRef(s, c.of[0]);
  const r2 = resolveSegmentRef(s, c.of[1]);
  addPoint(s, {
    name: intent.name,
    kind: 'intersection',
    ref1: r1,
    ref2: r2,
    ...(c.branch !== undefined ? { branch: c.branch } : {}),
  });
};

export const buildSecondIntersection = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'secondIntersection') return;
  const lineRef = resolveSegmentRef(s, c.line);
  addPoint(s, {
    name: intent.name, kind: 'secondIntersection',
    line: lineRef, circle: c.circle, other: c.other,
  });
};

export const buildCircleIntersection = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'circleIntersection') return;
  addPoint(s, {
    name: intent.name, kind: 'circleIntersection',
    c1: c.c1, c2: c.c2, which: c.which,
  });
};

export const buildCircleSecondIntersection = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'circleSecondIntersection') return;
  addPoint(s, {
    name: intent.name, kind: 'circleSecondIntersection',
    c1: c.c1, c2: c.c2, exclude: c.exclude,
  });
};
