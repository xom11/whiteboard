// src/stamps/geometry-2d/ai/intent-builders/draw-circle.ts
//
// op: draw-circle — move verbatim từ intentToDsl.ts handleDrawCircle (Phase 2b, #45).

import type { IntentBuilder } from './_types';
import { IntentBuilderError } from './_types';
import { addPoint, addShape, defaultFreeCoord } from './shared';
import type { DrawCircleIntentT } from '../intent';

export const buildDrawCircle: IntentBuilder<DrawCircleIntentT> = (s, intent) => {
  if (intent.spec === 'centerThrough') {
    if (!intent.center || !intent.through) {
      throw new IntentBuilderError('centerThrough cần center + through', intent);
    }
    addShape(s, {
      name: intent.name,
      kind: 'circleCP',
      center: intent.center,
      surfacePoint: intent.through,
    });
  } else if (intent.spec === 'through3') {
    if (!intent.points) {
      throw new IntentBuilderError('through3 cần points', intent);
    }
    addShape(s, {
      name: intent.name,
      kind: 'circle3',
      p1: intent.points[0],
      p2: intent.points[1],
      p3: intent.points[2],
    });
  } else if (intent.spec === 'centerRadius') {
    if (!intent.center || intent.radius === undefined) {
      throw new IntentBuilderError('centerRadius cần center + radius', intent);
    }
    if (!s.points.find((p) => p.name === intent.center)) {
      const [x, y] = defaultFreeCoord(s);
      addPoint(s, { name: intent.center!, kind: 'free', x, y });
    }
    addShape(s, { name: intent.name, kind: 'circleCR', center: intent.center, radius: intent.radius });
  } else if (intent.spec === 'diameter') {
    if (!intent.endpoints) {
      throw new IntentBuilderError('diameter cần endpoints', intent);
    }
    addShape(s, {
      name: intent.name,
      kind: 'circleDiameter',
      p1: intent.endpoints[0],
      p2: intent.endpoints[1],
    });
  } else if (intent.spec === 'inscribedIn') {
    if (!intent.triangle) throw new IntentBuilderError('inscribedIn cần triangle', intent);
    for (const v of intent.triangle) {
      if (!s.points.find((p) => p.name === v)) {
        throw new IntentBuilderError(`inscribedIn: vertex ${v} chưa định nghĩa`, intent);
      }
    }
    addShape(s, { name: intent.name, kind: 'incircle', vertices: intent.triangle });
  }
};
