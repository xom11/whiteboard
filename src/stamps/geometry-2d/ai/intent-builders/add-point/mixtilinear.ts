// src/stamps/geometry-2d/ai/intent-builders/add-point/mixtilinear.ts
import type { BuildState } from '../_types';
import { addPoint } from '../shared';
import type { AddPointIntentT } from '../../intent';

export const buildMixtilinearPoint = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'mixtilinearPoint') return;
  addPoint(s, { name: intent.name, kind: 'mixtilinearPoint', vertices: c.of, which: c.which });
};
