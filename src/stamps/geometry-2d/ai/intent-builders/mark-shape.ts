// src/stamps/geometry-2d/ai/intent-builders/mark-shape.ts
//
// op: mark-shape — move verbatim từ intentToDsl.ts handleMarkShape (Phase 2b, #45).

import type { IntentBuilder } from './_types';
import { IntentBuilderError } from './_types';
import { addShape, uniqueShapeName } from './shared';
import type { MarkShapeIntentT } from '../intent';

export const buildMarkShape: IntentBuilder<MarkShapeIntentT> = (s, intent) => {
  for (const label of intent.labels) {
    if (!s.points.find((p) => p.name === label)) {
      throw new IntentBuilderError(`mark-shape: label ${label} chưa định nghĩa`, intent);
    }
  }
  const polyName = uniqueShapeName(s, intent.labels.join(''));
  addShape(s, { name: polyName, kind: 'polygon', vertices: [...intent.labels] });
};
