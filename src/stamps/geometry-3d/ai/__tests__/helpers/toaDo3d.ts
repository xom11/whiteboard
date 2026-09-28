// Dựng hình 3D của một đề bằng engine deterministic THẬT rồi trả toạ độ world từng điểm theo
// nhãn (constraintToWorld — cùng hàm renderer dùng). Test đo hình ĐÚNG điều kiện đề (SA ⊥ đáy
// thật sự vuông góc, H đúng là trung điểm, tam giác SAB đều…), không chỉ "đủ tên điểm".
// Bản 3D của geometry-2d/.../toaDoHinh.ts. (Hợp nhất helper lớp 11 + lớp 12.)
import type { State } from '../../../../../core/scene';
import { tryDeterministicFigure3d } from '../../deterministic/tryDeterministicFigure3d';
import { toaDo3d, auditFacts3d, type Vec3 } from '../../deterministic/factAudit3d';

export type { Vec3 };
export type V3 = Vec3;
export interface Hinh3d { state: State; P: Record<string, V3> }

/** Đề → state + toạ độ mọi point3d (ném lỗi nếu engine không dựng ĐỦ). */
export function dung3d(de: string): Hinh3d {
  const r = tryDeterministicFigure3d(de);
  if (!r.ok) throw new Error(`không dựng đủ: ${r.reason} ${r.detail ?? ''}`);
  return { state: r.state, P: toaDo3d(r.state) };
}

/** Đề → toạ độ mọi point3d (ném lỗi nếu không dựng đủ). */
export function toaDoDe3d(de: string): Record<string, Vec3> {
  return dung3d(de).P;
}

/** Các sự kiện đề nêu mà hình VI PHẠM (rỗng = đúng mọi điều kiện kiểm được). */
export function viPhamDe3d(de: string): string[] {
  const { state } = dung3d(de);
  return auditFacts3d(de, state).violated.map((f) => f.text);
}

export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
export const dist = (a: V3, b: V3): number => len(sub(a, b));
export const mid = (a: V3, b: V3): V3 => mul(add(a, b), 0.5);
/** cos góc giữa 2 vector (không dấu). */
export const cosAbs = (u: V3, v: V3) => Math.abs(dot(u, v)) / (len(u) * len(v));
/** Pháp tuyến (không chuẩn hoá) mặt qua 3 điểm. */
export const normal = (a: V3, b: V3, c: V3) => cross(sub(b, a), sub(c, a));
/** u ⊥ mặt (a,b,c) ⟺ u ∥ pháp tuyến. */
export const perpToPlane = (u: V3, a: V3, b: V3, c: V3) => Math.abs(cosAbs(u, normal(a, b, c)) - 1) < 1e-9;

/** Góc (độ) tại đỉnh B của tam giác ABC. */
export function goc(a: V3, b: V3, c: V3): number {
  const u = sub(a, b), v = sub(c, b);
  return (Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (len(u) * len(v))))) * 180) / Math.PI;
}

/** Pháp tuyến đơn vị mặt (a,b,c). */
export function phapTuyen(a: V3, b: V3, c: V3): V3 {
  const n = cross(sub(b, a), sub(c, a));
  return mul(n, 1 / len(n));
}

/** Hình chiếu vuông góc của p lên mặt (a,b,c). */
export function chieuLenMat(p: V3, a: V3, b: V3, c: V3): V3 {
  const n = phapTuyen(a, b, c);
  return sub(p, mul(n, dot(sub(p, a), n)));
}

/** Đường thẳng PQ ⊥ mặt (a,b,c): |PQ × n| ≈ 0. */
export function vuongGocMat(p: V3, q: V3, a: V3, b: V3, c: V3): boolean {
  const d = sub(q, p);
  return len(cross(d, phapTuyen(a, b, c))) < 1e-6 * Math.max(1, len(d));
}

/** Hai mặt (a,b,c) ⊥ (d,e,f): n1·n2 ≈ 0. */
export function haiMatVuong(t1: [V3, V3, V3], t2: [V3, V3, V3]): boolean {
  return Math.abs(dot(phapTuyen(...t1), phapTuyen(...t2))) < 1e-6;
}

export const gan = (a: number, b: number, tol = 1e-6): boolean => Math.abs(a - b) < tol * Math.max(1, Math.abs(b));
export const ganV = (a: V3, b: V3, tol = 1e-6): boolean => dist(a, b) < tol;
