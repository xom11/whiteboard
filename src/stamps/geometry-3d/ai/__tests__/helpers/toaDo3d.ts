// Dựng hình 3D của một đề qua rule engine THẬT và trả toạ độ world từng điểm theo nhãn —
// để test hình ĐÚNG điều kiện đề (SA ⊥ đáy, tam giác SAB đều, chân đường cao ở trung
// điểm…), không chỉ "đủ tên điểm". Bản 3D của geometry-2d/.../toaDoHinh.ts.
import { tryDeterministicFigure3d } from '../../deterministic/tryDeterministicFigure3d';
import { constraintToWorld } from '../../../../../core/scene/kinds/constraint3d-math';
import type { State } from '../../../../../core/scene';

export type V3 = [number, number, number];

export interface Hinh3d { state: State; P: Record<string, V3> }

/** Đề → toạ độ mọi point3d (ném lỗi nếu engine không dựng ĐỦ). */
export function dung3d(de: string): Hinh3d {
  const r = tryDeterministicFigure3d(de);
  if (!r.ok) throw new Error(`không dựng đủ: ${r.reason} ${r.detail ?? ''}`);
  const P: Record<string, V3> = {};
  for (const o of Object.values(r.state.objects)) {
    if (o.kind !== 'point3d') continue;
    P[o.label] = constraintToWorld((o.attrs as { constraint: never }).constraint, r.state) as V3;
  }
  return { state: r.state, P };
}

export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
export const dist = (a: V3, b: V3): number => len(sub(a, b));
export const mid = (a: V3, b: V3): V3 => mul(add(a, b), 0.5);

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
