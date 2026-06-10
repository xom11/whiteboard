// src/stamps/geometry-2d/ai/intent-builders/add-point/onPerpBisector.ts
//
// add-point constraint.kind=onPerpBisector — điểm tự do trên trung trực (p1,p2).
import type { BuildState } from '../_types';
import { addPoint } from '../shared';
import type { AddPointIntentT } from '../../intent';

export const buildOnPerpBisector = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'onPerpBisector') return;
  addPoint(s, { name: intent.name, kind: 'onPerpBisector', p1: c.p1, p2: c.p2 });
};
