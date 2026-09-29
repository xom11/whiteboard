// src/stamps/geometry-2d/ai/intent-builders/add-point/affine.ts
//
// add-point affine — điểm = Σ wᵢ·Pᵢ (Σ wᵢ = 1). Fail-safe: lệch độ dài, tổng ≠ 1
// hoặc tự tham chiếu ⇒ bỏ qua (điểm thiếu ⇒ named-missing, không vẽ sai). Điểm nguồn
// CHƯA dựng (vd trung điểm do rule priority thấp hơn) KHÔNG chặn ở đây: transpile báo
// UNKNOWN_REF ⇒ tryDeterministicFigure thử lại theo thứ tự phụ thuộc (intentTopo).
import type { BuildState } from '../_types';
import { addPoint } from '../shared';
import type { AddPointIntentT } from '../../intent';

export const buildAffine = (s: BuildState, intent: AddPointIntentT): void => {
  const c = intent.constraint;
  if (c.kind !== 'affine') return;
  if (c.points.length !== c.weights.length) return;
  if (Math.abs(c.weights.reduce((a, w) => a + w, 0) - 1) > 1e-9) return;
  if (c.points.some((p) => p === intent.name) || c.awayFrom === intent.name) return;
  if (c.rot && (c.rot.length !== c.points.length || Math.abs(c.rot.reduce((a, w) => a + w, 0)) > 1e-9)) return;
  addPoint(s, {
    name: intent.name, kind: 'affine', points: [...c.points], weights: [...c.weights],
    ...(c.rot ? { rot: [...c.rot] } : {}),
    ...(c.awayFrom ? { awayFrom: c.awayFrom } : {}),
  });
};
