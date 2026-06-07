// src/stamps/geometry-2d/ai/intent-builders/add-point/reflect.ts
//
// add-point reflectPoint/reflectLine (Cụm A) — move verbatim từ handleAddPoint switch (Phase 2b, #45).

import type { BuildState } from '../_types';
import { addPoint, resolveSegmentRef } from '../shared';
import type { AddPointIntentT } from '../../intent';

export const buildReflectPoint = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'reflectPoint') return;
  addPoint(s, { name: intent.name, kind: 'reflectPoint', of: c.of, through: c.through });
};

export const buildReflectLine = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'reflectLine') return;
  const lineRef = resolveSegmentRef(s, c.through);
  addPoint(s, { name: intent.name, kind: 'reflectLine', of: c.of, through: lineRef });
};
