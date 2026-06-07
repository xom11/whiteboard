// src/stamps/geometry-2d/ai/intent-builders/add-point/externalToCircle.ts
//
// add-point externalToCircle — điểm A nằm NGOÀI đường tròn `circle` (free
// external point). Builder đọc circle shape từ build state, tính tâm+bán kính,
// rồi đặt A = free tại [cx + d, cy] với d = max(r*2, r+2) (đảm bảo distance > r
// → A NGOÀI). Unblock tangentFromExt render END-TO-END (đề "Lấy A ngoài (O), kẻ
// 2 tiếp tuyến").
//
// Fail-safe (skip → A KHÔNG add → tangent UNKNOWN_REF / named-missing →
// escalate, KHÔNG render sai):
//   - circle shape không tồn tại trong build state.
//   - tâm/bán kính không xác định được (tâm không phải free, surfacePoint thiếu).
//
// Field name theo dsl/schema.ts: circleCR = { center, radius }; circleCP =
// { center, surfacePoint } (KHÔNG phải `through`).
import type { BuildState } from '../_types';
import { addPoint } from '../shared';
import type { AddPointIntentT } from '../../intent';

export const buildExternalToCircle = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'externalToCircle') return;
  const circle = s.shapes.find((sh) => sh.name === c.circle);
  if (!circle) return; // fail-safe: A không add → escalate

  let cx: number | undefined;
  let cy: number | undefined;
  let r: number | undefined;

  if (circle.kind === 'circleCR') {
    const center = s.points.find((p) => p.name === circle.center);
    if (center && center.kind === 'free') {
      cx = center.x;
      cy = center.y;
      r = circle.radius;
    }
  } else if (circle.kind === 'circleCP') {
    const center = s.points.find((p) => p.name === circle.center);
    const surf = s.points.find((p) => p.name === circle.surfacePoint);
    if (center && center.kind === 'free' && surf && surf.kind === 'free') {
      cx = center.x;
      cy = center.y;
      r = Math.hypot(surf.x - cx, surf.y - cy);
    }
  }

  if (cx === undefined || cy === undefined || r === undefined || !(r > 0)) return; // fail-safe
  const d = Math.max(r * 2, r + 2);
  addPoint(s, { name: intent.name, kind: 'free', x: cx + d, y: cy });
};
