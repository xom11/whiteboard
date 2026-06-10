// src/stamps/geometry-2d/ai/intent-builders/draw-line.ts
//
// op: draw-line — move verbatim từ intentToDsl.ts handleDrawLine (Phase 2b, #45).

import type { IntentBuilder } from './_types';
import { IntentBuilderError } from './_types';
import { addShape, resolveLineRefWithFallback } from './shared';
import type { DrawLineIntentT } from '../intent';

export const buildDrawLine: IntentBuilder<DrawLineIntentT> = (s, intent) => {
  switch (intent.kind) {
    case 'perpThrough': {
      if (!intent.through || !intent.to) throw new IntentBuilderError('perpThrough cần through + to', intent);
      const toLine = resolveLineRefWithFallback(s, intent.to, intent.through);
      addShape(s, { name: intent.name, kind: 'perpendicular', throughPoint: intent.through, toLine });
      break;
    }
    case 'parallelThrough': {
      if (!intent.through || !intent.to) throw new IntentBuilderError('parallelThrough cần through + to', intent);
      const toLine = resolveLineRefWithFallback(s, intent.to, intent.through);
      addShape(s, { name: intent.name, kind: 'parallel', throughPoint: intent.through, toLine });
      break;
    }
    case 'tangentAt': {
      if (!intent.through || !intent.circle) throw new IntentBuilderError('tangentAt cần through + circle', intent);
      addShape(s, { name: intent.name, kind: 'tangent', throughPoint: intent.through, toCircle: intent.circle, branch: 'on' });
      break;
    }
    case 'tangentFromExt': {
      if (!intent.from || !intent.circle) throw new IntentBuilderError('tangentFromExt cần from + circle', intent);
      if (intent.which === 'both') {
        addShape(s, { name: `${intent.name}_0`, kind: 'tangent', throughPoint: intent.from, toCircle: intent.circle, branch: 0 });
        addShape(s, { name: `${intent.name}_1`, kind: 'tangent', throughPoint: intent.from, toCircle: intent.circle, branch: 1 });
      } else {
        const branch = intent.which === 'second' ? 1 : 0;
        addShape(s, { name: intent.name, kind: 'tangent', throughPoint: intent.from, toCircle: intent.circle, branch });
      }
      break;
    }
    case 'angleBisector': {
      // Phân giác TRONG của góc ∠(p1·vertex·p2), VISIBLE, KHÔNG sinh chân
      // (khác cevian "phân giác AD" → foot). vertex = đỉnh góc. Issue #46 nhóm A.
      if (!intent.p1 || !intent.vertex || !intent.p2) {
        throw new IntentBuilderError('angleBisector cần p1 + vertex + p2', intent);
      }
      addShape(s, {
        name: intent.name,
        kind: 'angleBisector',
        p1: intent.p1,
        vertex: intent.vertex,
        p2: intent.p2,
      });
      break;
    }
    case 'lineThrough': {
      // Đường qua ≥2 điểm đồng tuyến (vd Euler line qua G/H/O — issue #47).
      if (!intent.points || intent.points.length < 2) {
        throw new IntentBuilderError('lineThrough cần ≥2 điểm', intent);
      }
      addShape(s, { name: intent.name, kind: 'lineThrough', points: intent.points });
      break;
    }
    case 'radicalAxis': {
      // Trục đẳng phương 2 đường tròn (issue #47, construct 2).
      if (!intent.circle1 || !intent.circle2) {
        throw new IntentBuilderError('radicalAxis cần circle1 + circle2', intent);
      }
      addShape(s, { name: intent.name, kind: 'radicalAxis', circle1: intent.circle1, circle2: intent.circle2 });
      break;
    }
    case 'perpBisector': {
      // Trung trực đoạn p1p2 (line construction). Dùng cho tâm đường tròn tiếp
      // xúc đường tại 1 điểm + qua 1 điểm (tâm = perpBisector ∩ perp-tại-tiếp-điểm).
      if (!intent.p1 || !intent.p2) throw new IntentBuilderError('perpBisector cần p1 + p2', intent);
      addShape(s, { name: intent.name, kind: 'perpBisector', p1: intent.p1, p2: intent.p2 });
      break;
    }
  }
};
