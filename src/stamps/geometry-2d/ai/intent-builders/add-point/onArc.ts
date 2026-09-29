// src/stamps/geometry-2d/ai/intent-builders/add-point/onArc.ts
//
// add-point constraint.kind=onArc — điểm chạy trên cung ab (nhỏ/lớn/không chứa
// ref/chứa ref). t mặc định 0.35: lệch khỏi giữa cung để hình không gợi "điểm
// chính giữa cung" mà đề không cho.
import type { BuildState } from '../_types';
import { addPoint } from '../shared';
import type { AddPointIntentT } from '../../intent';

export const buildOnArc = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'onArc') return;
  addPoint(s, {
    name: intent.name, kind: 'onArc', circle: c.circle, a: c.a, b: c.b, mode: c.mode,
    t: c.t ?? 0.35, ...(c.ref ? { ref: c.ref } : {}),
  });
};
