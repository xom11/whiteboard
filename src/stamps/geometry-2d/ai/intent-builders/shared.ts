// src/stamps/geometry-2d/ai/intent-builders/shared.ts
//
// Shared helpers + canonical coord tables + SHAPE_VARIANTS cho intent-builders.
// Move verbatim từ intentToDsl.ts (Phase 2a, #45) — không đổi logic.

import type { DslPointT, DslShapeT } from '../../dsl/schema';
import type { BuildState } from './_types';

// ---------------------------------------------------------------------------
// Canonical coord tables
// ---------------------------------------------------------------------------

export type Pt = readonly [number, number];

export const SQRT3 = 1.7320508075688772;

export function triangleCanonical(variant: string): readonly [Pt, Pt, Pt] {
  switch (variant) {
    case 'equilateral':
      return [[0, 0], [4, 0], [2, 2 * SQRT3]];
    case 'isoceles-AB':
      // AB là đáy, C đỉnh cân
      return [[0, 0], [4, 0], [2, 3]];
    case 'isoceles-BC':
      // BC là đáy, A đỉnh cân
      return [[0, 3], [-2, 0], [2, 0]];
    case 'isoceles-CA':
      // CA là đáy, B đỉnh cân
      return [[0, 0], [2, 3], [4, 0]];
    case 'right-at-A':
      return [[0, 0], [4, 0], [0, 3]];
    case 'right-at-B':
      return [[0, 0], [4, 0], [4, 3]];
    case 'right-at-C':
      // C ở (4,3); AC ⊥ BC
      // chọn A=(0,0), C=(4,3), B=(7.36,1.92) sao cho CA·CB=0
      // Đơn giản hơn: A=(0,0), B=(7,0), C=(0,4) → vuông tại A. Wait — đó là right-at-A.
      // Cần vuông tại C: chọn 3 đỉnh sao cho (CA)·(CB)=0.
      // A=(0,0), B=(7,0), C=(3,4). Check: CA=(−3,−4), CB=(4,−4), dot=−12+16=4 ≠0. Sửa.
      // A=(0,0), C=(3,3), B=(6,0): CA=(−3,−3), CB=(3,−3), dot=−9+9=0 ✓
      return [[0, 0], [6, 0], [3, 3]];
    case 'any':
    default:
      // Tam giác scalene cố định, tránh vuông tại gốc
      return [[0, 0], [5, 0], [2, 3]];
  }
}

export function squareCanonical(): readonly [Pt, Pt, Pt, Pt] {
  // Cạnh 4, gốc tại đỉnh đầu (counter-clockwise)
  return [[0, 0], [4, 0], [4, 4], [0, 4]];
}

export function rectangleCanonical(variant: string): readonly [Pt, Pt, Pt, Pt] {
  if (variant === 'tall') return [[0, 0], [2.5, 0], [2.5, 4], [0, 4]];
  // wide / standard (default)
  return [[0, 0], [4, 0], [4, 2.5], [0, 2.5]];
}

export function rhombusCanonical(): readonly [Pt, Pt, Pt, Pt] {
  // Đường chéo nằm trên trục, 4 đỉnh trên trục: (±2, 0) và (0, ±1.5)
  return [[-2, 0], [0, -1.5], [2, 0], [0, 1.5]];
}

export function trapezoidCanonical(variant: string): readonly [Pt, Pt, Pt, Pt] {
  switch (variant) {
    case 'right':
      // Vuông tại A và D
      return [[0, 0], [5, 0], [3, 3], [0, 3]];
    case 'isoceles':
      // Cân — AB đáy lớn, CD đáy nhỏ
      return [[0, 0], [5, 0], [4, 3], [1, 3]];
    case 'general':
    default:
      return [[0, 0], [5, 0], [3.5, 3], [1, 3]];
  }
}

export function parallelogramCanonical(): readonly [Pt, Pt, Pt, Pt] {
  return [[0, 0], [4, 0], [5, 3], [1, 3]];
}

export function quadrilateralCanonical(): readonly [Pt, Pt, Pt, Pt] {
  return [[0, 0], [5, 0], [4.5, 3.5], [0.5, 3]];
}

// ---------------------------------------------------------------------------
// Build helpers
// ---------------------------------------------------------------------------

export function addPoint(s: BuildState, p: DslPointT) {
  if (s.pointNames.has(p.name)) return; // idempotent
  s.points.push(p);
  s.pointNames.add(p.name);
}

// Default coord cho free point khi LLM không truyền `at`. Spread theo thứ tự
// thêm để tránh nhiều free point collide tại (3, 3) → segment degenerate,
// circle radius=0, intersection NaN cascade (bug eval cau-14: A=B=D=(3,3)).
// Pattern: 8 vị trí phân bố xung quanh gốc, vòng lại khi >8.
export const FREE_DEFAULT_SPREAD: readonly [number, number][] = [
  [3, 3],
  [-3, 3],
  [3, -3],
  [-3, -3],
  [4, 0],
  [-4, 0],
  [0, 4],
  [0, -4],
];

export function defaultFreeCoord(s: BuildState): [number, number] {
  // Đếm số free point đã add (cả từ polygon vertices + add-point free).
  // Position trong array trùng index modulo SPREAD.
  let count = 0;
  for (const p of s.points) if (p.kind === 'free') count++;
  return [...FREE_DEFAULT_SPREAD[count % FREE_DEFAULT_SPREAD.length]];
}

export function addShape(s: BuildState, sh: DslShapeT) {
  if (s.shapeNames.has(sh.name)) return;
  s.shapes.push(sh);
  s.shapeNames.add(sh.name);
}

export function uniqueShapeName(s: BuildState, base: string): string {
  if (!s.shapeNames.has(base)) return base;
  let i = 2;
  while (s.shapeNames.has(`${base}${i}`)) i++;
  return `${base}${i}`;
}

export function uniquePointName(s: BuildState, base: string): string {
  if (!s.pointNames.has(base)) return base;
  let i = 2;
  while (s.pointNames.has(`${base}${i}`)) i++;
  return `${base}${i}`;
}

export function ensureSegment(s: BuildState, a: string, b: string): string {
  const k1 = `${a}-${b}`;
  const k2 = `${b}-${a}`;
  const existing = s.segmentByEnds.get(k1) ?? s.segmentByEnds.get(k2);
  if (existing) return existing;
  const name = uniqueShapeName(s, `${a}${b}`);
  addShape(s, { name, kind: 'segment', p1: a, p2: b });
  s.segmentByEnds.set(k1, name);
  return name;
}

// Resolve line ref cho draw-line (perpThrough/parallelThrough) với fallback:
// LLM nhiều khi nhầm "Đường vuông góc với AB tại B" → to:"A" (1 chữ — POINT)
// thay vì to:"AB" (2 chữ — LINE). Khi `ref` là 1 chữ POINT và `anchor` cũng
// 1 chữ POINT khác, auto build segment qua 2 điểm (alphabetize canonical).
export function resolveLineRefWithFallback(s: BuildState, ref: string, anchor: string): string {
  // Single-letter point swap fallback — chỉ áp dụng khi cả 2 đều là POINT
  // đã định nghĩa và khác nhau.
  if (
    /^[A-Za-z]$/.test(ref) && /^[A-Za-z]$/.test(anchor) && ref !== anchor &&
    s.pointNames.has(ref) && s.pointNames.has(anchor)
  ) {
    const [a, b] = ref < anchor ? [ref, anchor] : [anchor, ref];
    return ensureSegment(s, a, b);
  }
  // Path bình thường: 2-char shorthand hoặc tên shape đã có.
  return resolveSegmentRef(s, ref);
}

export function resolveSegmentRef(s: BuildState, ref: string): string {
  // ref có thể là tên segment ('AB') hoặc shape name đã có.
  // Nếu là 2 ký tự label đều đã tồn tại → ensure segment 2 đỉnh đó.
  if (s.shapeNames.has(ref)) return ref;
  // Tách "AB" → A,B
  if (ref.length === 2 && s.pointNames.has(ref[0]) && s.pointNames.has(ref[1])) {
    return ensureSegment(s, ref[0], ref[1]);
  }
  // Pattern "A-B" / "AB"
  const dashMatch = ref.match(/^([A-Za-z][A-Za-z0-9'_]*)[-_]?([A-Za-z][A-Za-z0-9'_]*)$/);
  if (dashMatch && s.pointNames.has(dashMatch[1]) && s.pointNames.has(dashMatch[2])) {
    return ensureSegment(s, dashMatch[1], dashMatch[2]);
  }
  // Trả về ref gốc (transpile sẽ báo lỗi nếu invalid)
  return ref;
}

export function parseEnds(ref: string): [string, string] | null {
  if (ref.length === 2) return [ref[0], ref[1]];
  const m = ref.match(/^([A-Za-z][A-Za-z0-9'_]*)[-_]?([A-Za-z][A-Za-z0-9'_]*)$/);
  if (m) return [m[1], m[2]];
  return null;
}

// ---------------------------------------------------------------------------
// draw-shape variants
// ---------------------------------------------------------------------------

// Map shape → allowed variants (runtime check, schema cho phép enum chung)
export const SHAPE_VARIANTS: Record<string, readonly string[]> = {
  triangle: ['any', 'equilateral', 'isoceles-AB', 'isoceles-BC', 'isoceles-CA', 'right-at-A', 'right-at-B', 'right-at-C'],
  square: ['standard'],
  rectangle: ['standard', 'wide', 'tall'],
  rhombus: ['standard'],
  trapezoid: ['right', 'isoceles', 'general'],
  parallelogram: ['standard'],
  quadrilateral: ['any'],
};
