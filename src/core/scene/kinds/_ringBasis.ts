// src/core/scene/kinds/_ringBasis.ts
// Cặp vector đơn vị ⊥ trục, để cone3d/cylinder3d dựng vành đáy NẰM TRÊN mặt ⊥ trục
// (thay vì luôn ngang XY). Trục ĐỨNG → vành ngang (backward-compat render cũ); trục
// NGHIÊNG (nón/trụ nội tiếp mặt nghiêng) → vành đúng trên mặt đáy.
export type V3 = [number, number, number];

export function perpBasis(axis: V3): [V3, V3] {
  const n = Math.hypot(axis[0], axis[1], axis[2]);
  if (n < 1e-12) return [[1, 0, 0], [0, 1, 0]]; // trục suy biến → XY (giữ hành vi cũ)
  const a: V3 = [axis[0] / n, axis[1] / n, axis[2] / n];
  // seed không song song trục (z-up trừ khi trục gần đứng → dùng x).
  const seed: V3 = Math.abs(a[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  // u = normalize(seed × a) ⊥ a
  let u: V3 = [
    seed[1] * a[2] - seed[2] * a[1],
    seed[2] * a[0] - seed[0] * a[2],
    seed[0] * a[1] - seed[1] * a[0],
  ];
  const un = Math.hypot(u[0], u[1], u[2]) || 1;
  u = [u[0] / un, u[1] / un, u[2] / un];
  // v = a × u (đơn vị, ⊥ cả a và u)
  const v: V3 = [
    a[1] * u[2] - a[2] * u[1],
    a[2] * u[0] - a[0] * u[2],
    a[0] * u[1] - a[1] * u[0],
  ];
  return [u, v];
}
