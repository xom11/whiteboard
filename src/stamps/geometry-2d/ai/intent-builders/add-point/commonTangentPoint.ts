// src/stamps/geometry-2d/ai/intent-builders/add-point/commonTangentPoint.ts
//
// add-point commonTangentPoint (spec mục A) — tiếp điểm tiếp tuyến CHUNG 2 đtròn.
// Builder validate 2 circle ref tồn tại trong build state (là shape kind circle)
// rồi emit DSL point. KHÔNG ensureSegment — circles là ref đtròn, không phải đoạn.
//
// Fail-safe (skip → point KHÔNG add → cascade UNKNOWN_REF / named-missing →
// escalate, KHÔNG render sai): 1 trong 2 circle ref không tồn tại hoặc không là
// đường tròn.
import type { BuildState } from '../_types';
import { addPoint } from '../shared';
import type { AddPointIntentT } from '../../intent';
import { CIRCLE_KINDS } from '../../../dsl/registry';

export const buildCommonTangentPoint = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'commonTangentPoint') return;
  const isCircle = (name: string): boolean => {
    const sh = s.shapes.find((x) => x.name === name);
    return !!sh && CIRCLE_KINDS.has(sh.kind);
  };
  if (!isCircle(c.circles[0]) || !isCircle(c.circles[1])) return; // fail-safe
  addPoint(s, {
    name: intent.name,
    kind: 'commonTangentPoint',
    circles: [c.circles[0], c.circles[1]],
    on: c.on,
    variant: c.variant,
    side: c.side,
  });
};
