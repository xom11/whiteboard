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

  // Hình thứ hai dùng chung đỉnh với hình trước ("hai tam giác ABC và ECD", "vẽ tam
  // giác ACD sao cho …"): đỉnh MỚI đặt theo toạ độ mẫu có thể trùng khít một điểm tự
  // do đã có (E ≡ A, D ≡ C) — hình suy biến mà vẫn qua mọi gate. Chỉ khi TRÙNG mới
  // dời đỉnh mới (không trùng thì giữ nguyên toạ độ như cũ).
  const freeXY = (n: string): Pt | undefined => {
    const q = s.points.find((p) => p.name === n && p.kind === 'free') as { x: number; y: number } | undefined;
    return q ? [q.x, q.y] : undefined;
  };
  const trung = (x: number, y: number) =>
    s.points.some((q) => q.kind === 'free' && Math.abs((q as { x: number }).x - x) < 1e-9 && Math.abs((q as { y: number }).y - y) < 1e-9);
  const daCo = labels.map((l) => (s.pointNames.has(l) ? freeXY(l) : undefined));
  const viTriMoi = (i: number, x: number, y: number): Pt => {
    const biet = labels.map((l, j) => [l, daCo[j]] as const).filter((e): e is readonly [string, Pt] => !!e[1]);
    if (biet.length >= 2) {
      // Dựng về phía KHÔNG chứa các điểm khác của cạnh chung.
      const [P, Q] = [biet[0][1], biet[1][1]];
      const M: Pt = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
      const d = Math.hypot(Q[0] - P[0], Q[1] - P[1]);
      let n: Pt = [-(Q[1] - P[1]) / d, (Q[0] - P[0]) / d];
      const khac = s.points.filter((q) => q.kind === 'free' && !biet.some((b) => b[0] === q.name)) as unknown as { x: number; y: number }[];
      if (khac.length) {
        const gx = khac.reduce((t, q) => t + q.x, 0) / khac.length;
        const gy = khac.reduce((t, q) => t + q.y, 0) / khac.length;
        if ((gx - M[0]) * n[0] + (gy - M[1]) * n[1] > 0) n = [-n[0], -n[1]];
      }
      return [M[0] + n[0] * 0.8 * d, M[1] + n[1] * 0.8 * d];
    }
    if (biet.length === 1) {
      // Neo hình mẫu vào đỉnh đã có.
      const j = labels.indexOf(biet[0][0]);
      return [x + biet[0][1][0] - coords[j][0], y + biet[0][1][1] - coords[j][1]];
    }
    // Hình rời hẳn (không đỉnh chung): layout/disjointOffset dời cả hình sau.
    return [x, y];
  };

  labels.forEach((label, i) => {
    const ec = explicit[label];
    let [x, y] = ec ?? coords[i];
    if (!ec && !s.pointNames.has(label) && trung(x, y)) {
      const [nx, ny] = viTriMoi(i, x, y);
      if (!trung(nx, ny)) [x, y] = [nx, ny];
    }
    addPoint(s, { name: label, kind: 'free', x, y });
  });

  const polyName = uniqueShapeName(s, labels.join(''));
  addShape(s, { name: polyName, kind: 'polygon', vertices: [...labels] });
};
