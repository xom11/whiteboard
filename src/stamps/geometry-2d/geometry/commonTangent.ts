// src/stamps/geometry-2d/geometry/commonTangent.ts
//
// Tiếp điểm của tiếp tuyến CHUNG 2 đường tròn (external/internal). Hàm THUẦN —
// dùng cho cả render functional (point-constraints/commonTangentPoint) lẫn unit
// test hình học. Spec: docs/superpowers/specs/2026-06-20-two-circle-relations-design.md (mục A).
//
// Hình học. 2 đtròn tâm O1,O2 bán kính r1,r2; d=|O1O2|; β=hướng O1→O2.
// Pháp tuyến đơn vị n̂ tới đường tiếp tuyến thoả (P−O_i)·n̂ = ±r_i:
//   - external: cos γ = (r1−r2)/d ; T1=O1+r1·n̂ ; T2=O2+r2·n̂. Bền kể cả 2 đtròn
//     cắt nhau, cần KHÔNG lồng nhau (|ratio|≤1 ⇔ d≥|r1−r2|).
//   - internal: cos γ = (r1+r2)/d ; T1=O1+r1·n̂ ; T2=O2−r2·n̂. Cần 2 đtròn đủ
//     tách (|ratio|≤1 ⇔ d≥r1+r2).
// side chọn 1 trong 2 tiếp tuyến cùng loại (s=±1).

type XY = [number, number];

const EPS = 1e-9;

export function computeCommonTangentPoint(
  O1: XY, r1: number,
  O2: XY, r2: number,
  on: 0 | 1, variant: 'external' | 'internal', side: 0 | 1,
): XY | null {
  const dx = O2[0] - O1[0];
  const dy = O2[1] - O1[1];
  const d = Math.hypot(dx, dy);
  if (d < EPS) return null;

  const beta = Math.atan2(dy, dx);
  const ratio = variant === 'external' ? (r1 - r2) / d : (r1 + r2) / d;
  if (Math.abs(ratio) > 1) return null; // tiếp tuyến loại đó KHÔNG tồn tại.

  const gamma = Math.acos(ratio);
  const s = side === 0 ? 1 : -1;
  const angle = beta + s * gamma;
  const nx = Math.cos(angle);
  const ny = Math.sin(angle);

  if (on === 0) {
    return [O1[0] + r1 * nx, O1[1] + r1 * ny];
  }
  // on === 1
  if (variant === 'external') {
    return [O2[0] + r2 * nx, O2[1] + r2 * ny];
  }
  return [O2[0] - r2 * nx, O2[1] - r2 * ny];
}
