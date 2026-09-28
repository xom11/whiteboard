// Dựng hình 3D của một đề bằng engine deterministic THẬT rồi trả toạ độ world từng điểm theo
// nhãn (constraintToWorld — cùng hàm renderer dùng). Test đo hình ĐÚNG điều kiện đề (SA ⊥ đáy
// thật sự vuông góc, H đúng là trung điểm…), không chỉ "đủ tên điểm".
import { tryDeterministicFigure3d } from '../../deterministic/tryDeterministicFigure3d';
import { toaDo3d, auditFacts3d, type Vec3 } from '../../deterministic/factAudit3d';

export type { Vec3 };

export function toaDoDe3d(de: string): Record<string, Vec3> {
  const r = tryDeterministicFigure3d(de);
  if (!r.ok) throw new Error(`không dựng đủ: ${r.reason} ${r.detail ?? ''}`);
  return toaDo3d(r.state);
}

/** Các sự kiện đề nêu mà hình VI PHẠM (rỗng = đúng mọi điều kiện kiểm được). */
export function viPhamDe3d(de: string): string[] {
  const r = tryDeterministicFigure3d(de);
  if (!r.ok) throw new Error(`không dựng đủ: ${r.reason} ${r.detail ?? ''}`);
  return auditFacts3d(de, r.state).violated.map((f) => f.text);
}

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: Vec3) => Math.sqrt(dot(a, a));
export const dist = (a: Vec3, b: Vec3) => len(sub(a, b));
export const mid = (a: Vec3, b: Vec3): Vec3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
/** cos góc giữa 2 vector (không dấu). */
export const cosAbs = (u: Vec3, v: Vec3) => Math.abs(dot(u, v)) / (len(u) * len(v));
/** Pháp tuyến mặt qua 3 điểm. */
export const normal = (a: Vec3, b: Vec3, c: Vec3) => cross(sub(b, a), sub(c, a));
/** u ⊥ mặt (a,b,c) ⟺ u ∥ pháp tuyến. */
export const perpToPlane = (u: Vec3, a: Vec3, b: Vec3, c: Vec3) => Math.abs(cosAbs(u, normal(a, b, c)) - 1) < 1e-9;
