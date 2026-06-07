// src/stamps/geometry-2d/ai/intent-builders/add-point/centers.ts
//
// add-point centers: centroid/circumcenter/incenter/orthocenter/excenter
// — move verbatim từ handleAddPoint switch (Phase 2b, #45).

import type { BuildState } from '../_types';
import { addPoint } from '../shared';
import type { AddPointIntentT } from '../../intent';

export const buildCentroid = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'centroid') return;
  addPoint(s, { name: intent.name, kind: 'centroid', vertices: c.of });
};

export const buildCircumcenter = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'circumcenter') return;
  addPoint(s, { name: intent.name, kind: 'circumcenter', vertices: c.of });
};

export const buildIncenter = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'incenter') return;
  addPoint(s, { name: intent.name, kind: 'incenter', vertices: c.of });
};

export const buildOrthocenter = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'orthocenter') return;
  addPoint(s, { name: intent.name, kind: 'orthocenter', vertices: c.of });
};

export const buildExcenter = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'excenter') return;
  addPoint(s, { name: intent.name, kind: 'excenter', vertices: c.of, opposite: c.opposite });
};
