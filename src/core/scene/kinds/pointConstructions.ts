// src/core/scene/kinds/pointConstructions.ts
//
// Toán dựng hình thuần (không phụ thuộc JSXGraph) cho các point-constraint mới.
// Renderer point.ts gọi qua function-coordinate points để reactive khi user kéo.

export type XY = readonly [number, number];

function dist(p: XY, q: XY): number {
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}

/** Dấu của (B-A) × (P-A): >0 trái, <0 phải, 0 thẳng hàng với AB. */
function sideOf(a: XY, b: XY, p: XY): number {
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
}

/**
 * Trung điểm cung AB của đường tròn (center, radius), nằm ở cung KHÔNG chứa
 * `notContaining`. Trả về toạ độ [x, y].
 *
 * Hai ứng viên = giao của đường thẳng (center → trung điểm dây AB) với đường
 * tròn. Cung không chứa notContaining nằm KHÁC PHÍA dây AB so với notContaining,
 * nên chọn ứng viên có dấu side khác dấu side của notContaining.
 */
export function arcMidpoint(
  center: XY, radius: number, a: XY, b: XY, notContaining: XY,
): XY {
  const mcx = (a[0] + b[0]) / 2;
  const mcy = (a[1] + b[1]) / 2;
  let ux = mcx - center[0];
  let uy = mcy - center[1];
  let len = Math.hypot(ux, uy);
  if (len < 1e-9) {
    // AB là đường kính → hướng từ tâm tới dây suy biến. Dùng pháp tuyến của AB.
    ux = -(b[1] - a[1]);
    uy = b[0] - a[0];
    len = Math.hypot(ux, uy) || 1;
  }
  ux /= len; uy /= len;
  const cand1: XY = [center[0] + radius * ux, center[1] + radius * uy];
  const cand2: XY = [center[0] - radius * ux, center[1] - radius * uy];

  const sN = sideOf(a, b, notContaining);
  if (Math.abs(sN) < 1e-9) {
    // notContaining nằm trên đường AB → side-test suy biến: chọn ứng viên xa notContaining hơn.
    return dist(cand1, notContaining) >= dist(cand2, notContaining) ? cand1 : cand2;
  }
  const s1 = sideOf(a, b, cand1);
  // Khác phía ⇔ tích dấu < 0.
  return s1 * sN < 0 ? cand1 : cand2;
}

/**
 * Tâm bàng tiếp tam giác `vertices` đối diện đỉnh index `oppositeIndex` (0|1|2).
 * Công thức trọng tâm có dấu: trọng số = độ dài cạnh đối mỗi đỉnh, lật dấu ở
 * đỉnh đối diện. I = Σ wᵢ·Vᵢ / Σ wᵢ.
 */
export function excenter(
  vertices: readonly [XY, XY, XY], oppositeIndex: 0 | 1 | 2,
): XY {
  const [A, B, C] = vertices;
  const a = dist(B, C); // cạnh đối A
  const b = dist(C, A); // cạnh đối B
  const c = dist(A, B); // cạnh đối C
  const w: [number, number, number] = [a, b, c];
  w[oppositeIndex] = -w[oppositeIndex];
  const sum = w[0] + w[1] + w[2];
  if (Math.abs(sum) < 1e-9) return A; // tam giác suy biến — fallback
  return [
    (w[0] * A[0] + w[1] * B[0] + w[2] * C[0]) / sum,
    (w[0] * A[1] + w[1] * B[1] + w[2] * C[1]) / sum,
  ];
}

/**
 * Điểm trên tia `from → through` kéo dài QUA `through`, cách `through` khoảng `d`.
 * C = through + d · (through − from)/|through − from|.
 * `from ≡ through` (hướng suy biến) → trả về chính `through` (d bị nuốt vì len=1 guard).
 */
export function pointAtDistanceCoord(from: XY, through: XY, d: number): XY {
  const dx = through[0] - from[0];
  const dy = through[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  return [through[0] + (d * dx) / len, through[1] + (d * dy) / len];
}
