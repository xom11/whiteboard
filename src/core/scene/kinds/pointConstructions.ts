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
 * tròn. Cung không chứa `reference` nằm KHÁC PHÍA dây AB so với reference,
 * nên chọn ứng viên có dấu side khác dấu side của reference.
 *
 * `sameSide=true` → đảo lựa chọn: lấy ứng viên CÙNG PHÍA reference = trung điểm
 * cung CHỨA reference (= antipode qua tâm của ứng viên "không chứa").
 */
export function arcMidpoint(
  center: XY, radius: number, a: XY, b: XY, reference?: XY, sameSide = false,
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

  // Không có reference (cung KHÔNG mơ hồ, vd nửa đường tròn đường kính AB):
  // chọn ứng viên ở phía dương pháp tuyến (deterministic) — đỉnh "trên" của cung.
  if (!reference) return cand1[1] >= cand2[1] ? cand1 : cand2;

  const notContaining = reference;
  const sN = sideOf(a, b, notContaining);
  if (Math.abs(sN) < 1e-9) {
    // reference nằm trên đường AB → side-test suy biến: chọn ứng viên xa reference
    // hơn (notContaining), hoặc gần hơn khi sameSide.
    const far = dist(cand1, notContaining) >= dist(cand2, notContaining) ? cand1 : cand2;
    const near = far === cand1 ? cand2 : cand1;
    return sameSide ? near : far;
  }
  const s1 = sideOf(a, b, cand1);
  // notContaining: khác phía ⇔ tích dấu < 0. sameSide: cùng phía ⇔ tích dấu > 0.
  const opp = s1 * sN < 0 ? cand1 : cand2;
  const same = opp === cand1 ? cand2 : cand1;
  return sameSide ? same : opp;
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
/** Tâm đường tròn ngoại tiếp tam giác (giao 2 trung trực). */
function circumcenterXY(a: XY, b: XY, c: XY): XY {
  const ax = a[0], ay = a[1], bx = b[0], by = b[1], cx = c[0], cy = c[1];
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-12) return [(ax + bx + cx) / 3, (ay + by + cy) / 3];
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
  return [ux, uy];
}

/**
 * Tâm đường tròn mixtilinear nội tiếp ứng đỉnh A: tiếp xúc 2 cạnh AB, AC và tiếp
 * xúc TRONG đường tròn ngoại tiếp (O,R). Tâm K trên phân giác trong từ A, cách A
 * khoảng d; bán kính r = d·sin(A/2). Điều kiện tiếp xúc trong |OK| = R − r giải ra
 *   d = 2( bis·(O−A) − R·sin(A/2) ) / cos²(A/2).
 * `which='center'` → K; `which='touch'` → tiếp điểm S với (O) = O + R·unit(K−O).
 */
export function mixtilinearPoint(a: XY, b: XY, c: XY, which: 'center' | 'touch'): XY {
  const O = circumcenterXY(a, b, c);
  const R = Math.hypot(O[0] - a[0], O[1] - a[1]);
  const ux1 = (b[0] - a[0]) / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1);
  const uy1 = (b[1] - a[1]) / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1);
  const ux2 = (c[0] - a[0]) / (Math.hypot(c[0] - a[0], c[1] - a[1]) || 1);
  const uy2 = (c[1] - a[1]) / (Math.hypot(c[0] - a[0], c[1] - a[1]) || 1);
  let bx = ux1 + ux2, by = uy1 + uy2;
  const bl = Math.hypot(bx, by) || 1;
  bx /= bl; by /= bl; // unit bisector từ A
  const cosA = ux1 * ux2 + uy1 * uy2; // cos góc A
  const sinHalf = Math.sqrt(Math.max(0, (1 - cosA) / 2)); // sin(A/2)
  const cos2Half = Math.max(1e-9, (1 + cosA) / 2); // cos²(A/2)
  const dotAO = bx * (O[0] - a[0]) + by * (O[1] - a[1]);
  const d = (2 * (dotAO - R * sinHalf)) / cos2Half;
  const K: XY = [a[0] + d * bx, a[1] + d * by];
  if (which === 'center') return K;
  // Tiếp điểm S trên (O) theo hướng O→K (tiếp xúc trong).
  const kl = Math.hypot(K[0] - O[0], K[1] - O[1]) || 1;
  return [O[0] + (R * (K[0] - O[0])) / kl, O[1] + (R * (K[1] - O[1])) / kl];
}

export function pointAtDistanceCoord(from: XY, through: XY, d: number): XY {
  const dx = through[0] - from[0];
  const dy = through[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  return [through[0] + (d * dx) / len, through[1] + (d * dy) / len];
}

/**
 * Chân trục đẳng phương 2 đường tròn (o1,r1),(o2,r2) trên đường nối tâm O₁O₂.
 * F = O₁ + t·(O₂−O₁), t = (d²+r₁²−r₂²)/(2d²). Đồng tâm (d≈0) → trả o1 (suy biến,
 * caller escalate trước khi tới đây).
 */
export function radicalAxisFoot(o1: XY, r1: number, o2: XY, r2: number): XY {
  const dx = o2[0] - o1[0], dy = o2[1] - o1[1];
  const d2 = dx * dx + dy * dy;
  if (d2 < 1e-12) return o1;
  const t = (d2 + r1 * r1 - r2 * r2) / (2 * d2);
  return [o1[0] + t * dx, o1[1] + t * dy];
}
