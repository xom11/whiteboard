// src/stamps/geometry-2d/ai/intentToDsl.ts
//
// Stage 2: deterministic Intent[] → DslInputT builder.
//
// Pure function. Không gọi AI. Mỗi Intent op map sang 1 hoặc nhiều DSL entries
// với canonical coords cố định per variant. Builder rejects intent không hợp lệ
// (vd connect to point chưa tồn tại) thay vì silent skip.
//
// Phase 2b (#45): orchestrator mỏng — dispatch qua OP_BUILDERS registry.
// Thứ tự loop intents giữ nguyên (ordering dependency: draw-shape trước add-point
// tham chiếu điểm của nó). repairCircleIntersections chạy post-dispatch.

import type { DslInputT } from '../dsl/schema';
import type { IntentT } from './intent';
import { repairCircleIntersections } from './repairCircleIntersections';
import { layoutDisjointComponents } from './layout/disjointOffset';
import { newState } from './intent-builders/_types';
import { OP_BUILDERS } from './intent-builders/registry';

export { IntentBuilderError } from './intent-builders/_types';

export function intentsToDsl(intents: readonly IntentT[]): DslInputT {
  const s = newState();
  for (const intent of intents) {
    const build = OP_BUILDERS[intent.op];
    if (build) build(s, intent);
  }
  // Geometric repair: đảm bảo circle dùng cho circleIntersection thực sự cắt
  // nhau 2 điểm (dời center auto-inject nếu tiếp xúc/rời nhau).
  repairCircleIntersections(s.points, s.shapes);
  // Layout: tách các component RỜI NHAU theo trục ngang (không chồng origin).
  layoutDisjointComponents(s.points, s.shapes);
  return { version: 1, points: s.points, shapes: s.shapes };
}
