// src/stamps/geometry-2d/ai/intent-builders/add-point/onSegment-free.ts
//
// add-point onSegment/free — move verbatim từ handleAddPoint switch (Phase 2b, #45).

import type { BuildState } from '../_types';
import { addPoint, defaultFreeCoord, resolveSegmentRef } from '../shared';
import type { AddPointIntentT } from '../../intent';
import { LINE_LIKE_SHAPE_KINDS } from '../../../dsl/registry';

export const buildOnSegment = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'onSegment') return;
  const ref = resolveSegmentRef(s, c.of);
  // Nếu ref trỏ tới một shape line-like KHÔNG phải 'segment' (vd 'tangent',
  // 'perpendicular', 'parallel', 'ray', 'lineThrough') → glider phải dùng DSL
  // kind 'onLine' (lineId), không phải 'onSegment' (segmentId) — onSegment chỉ
  // chấp nhận đoạn thẳng (KIND_MISMATCH ngược lại). Dùng để đặt điểm trên tiếp
  // tuyến đặt tên (Bài 7: "lấy trên tiếp tuyến Ax một điểm P").
  const shape = s.shapes.find((sh) => sh.name === ref);
  if (shape && shape.kind !== 'segment' && LINE_LIKE_SHAPE_KINDS.has(shape.kind)) {
    addPoint(s, { name: intent.name, kind: 'onLine', lineId: ref, t: c.t ?? 0.5 });
    return;
  }
  addPoint(s, { name: intent.name, kind: 'onSegment', segmentId: ref, t: c.t ?? 0.5 });
};

export const buildFree = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'free') return;
  const [x, y] = c.at ?? defaultFreeCoord(s);
  addPoint(s, { name: intent.name, kind: 'free', x, y });
};
