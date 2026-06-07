// src/stamps/geometry-2d/ai/intent-builders/draw-shape.ts
//
// op: draw-shape — move verbatim từ intentToDsl.ts handleDrawShape (Phase 2b, #45).

import type { IntentBuilder } from './_types';
import { IntentBuilderError } from './_types';
import {
  addPoint, addShape, uniqueShapeName,
  SHAPE_VARIANTS, triangleCanonical, squareCanonical, rectangleCanonical,
  rhombusCanonical, trapezoidCanonical, parallelogramCanonical, quadrilateralCanonical,
  type Pt,
} from './shared';
import type { DrawShapeIntentT } from '../intent';

export const buildDrawShape: IntentBuilder<DrawShapeIntentT> = (s, intent) => {
  const labels = intent.labels;
  const explicit = intent.explicitCoords ?? {};

  // Validate variant ∈ allowed
  const allowed = SHAPE_VARIANTS[intent.shape];
  if (!allowed || !allowed.includes(intent.variant)) {
    // Fallback to default variant cho shape thay vì throw
    intent = { ...intent, variant: (allowed?.[0] ?? 'any') as typeof intent.variant };
  }

  let coords: readonly Pt[];
  switch (intent.shape) {
    case 'triangle': coords = triangleCanonical(intent.variant); break;
    case 'square': coords = squareCanonical(); break;
    case 'rectangle': coords = rectangleCanonical(intent.variant); break;
    case 'rhombus': coords = rhombusCanonical(); break;
    case 'trapezoid': coords = trapezoidCanonical(intent.variant); break;
    case 'parallelogram': coords = parallelogramCanonical(); break;
    case 'quadrilateral': coords = quadrilateralCanonical(); break;
    default:
      throw new IntentBuilderError(`Shape không hỗ trợ: ${intent.shape}`, intent);
  }

  if (coords.length !== labels.length) {
    throw new IntentBuilderError(
      `Shape ${intent.shape} cần ${coords.length} labels, nhận ${labels.length}`,
      intent,
    );
  }

  labels.forEach((label, i) => {
    const ec = explicit[label];
    const [x, y] = ec ?? coords[i];
    addPoint(s, { name: label, kind: 'free', x, y });
  });

  const polyName = uniqueShapeName(s, labels.join(''));
  addShape(s, { name: polyName, kind: 'polygon', vertices: [...labels] });
};
