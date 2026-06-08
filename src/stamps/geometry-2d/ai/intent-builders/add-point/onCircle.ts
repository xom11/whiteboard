// src/stamps/geometry-2d/ai/intent-builders/add-point/onCircle.ts
//
// add-point constraint.kind=onCircle — điểm trên đường tròn `circle` tại góc
// `theta` (glider). Map intent.circle → DSL circleId, theta default 0. Dùng cho
// đường thẳng Simson (issue #47): P trên đường tròn ngoại tiếp tam giác.

import type { BuildState } from '../_types';
import { addPoint } from '../shared';
import type { AddPointIntentT } from '../../intent';

export const buildOnCircle = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'onCircle') return;
  addPoint(s, { name: intent.name, kind: 'onCircle', circleId: c.circle, theta: c.theta ?? 0 });
};
