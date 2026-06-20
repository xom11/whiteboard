// src/stamps/geometry-3d/editor/tools/handlers/derived.ts
// Handler dựng ĐIỂM PHÁI SINH 3D (v1). Mỗi handler: resolve điểm gốc qua
// ensurePoint → addPoint(store, constraint phái sinh).
import type { Store } from '../../../../../core/scene';
import type { CollectedArg } from '../spec';
import { addPoint, ensurePoint } from './_ensurePoint';

// Resolve id các điểm từ những bước 'point' (theo thứ tự chọn). null nếu một
// hit không phân giải được điểm (empty / surface không hợp lệ).
function pointIds(args: CollectedArg[], store: Store): (string | null)[] {
  return args
    .filter((a) => a.step.type === 'point' && a.hit)
    .map((a) => ensurePoint(a.hit!, store));
}

/** Trung điểm đoạn nối 2 điểm. */
export function buildMidpoint(args: CollectedArg[], store: Store): string | null {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1 = ensurePoint(args[0].hit, store);
  const p2 = ensurePoint(args[1].hit, store);
  if (!p1 || !p2 || p1 === p2) return null;
  return addPoint(store, { kind: 'midpoint', p1, p2 });
}

/** Trọng tâm: trung bình các đỉnh đã chọn (≥3 đỉnh phân biệt). */
export function buildCentroid(args: CollectedArg[], store: Store): string | null {
  const ids = args
    .filter((a) => a.step.type === 'point' && a.hit)
    .map((a) => ensurePoint(a.hit!, store))
    .filter((x): x is string => !!x);
  const uniq = Array.from(new Set(ids));
  if (uniq.length < 3) return null;
  return addPoint(store, { kind: 'centroid', vertices: uniq });
}

/**
 * Giao 2 đường — mỗi đường xác định bởi 2 điểm: (a1,b1) & (a2,b2).
 * 4 bước 'point' theo thứ tự. Mỗi đường phải có 2 đầu mút phân biệt.
 */
export function buildIntersectionLines(args: CollectedArg[], store: Store): string | null {
  const ids = pointIds(args, store);
  if (ids.length < 4 || ids.slice(0, 4).some((x) => !x)) return null;
  const [a1, b1, a2, b2] = ids as string[];
  if (a1 === b1 || a2 === b2) return null; // đường suy biến
  return addPoint(store, { kind: 'intersectionLines', a1, b1, a2, b2 });
}

/**
 * Chân vuông góc từ điểm `from` xuống đường (a,b).
 * 3 bước 'point': from, rồi 2 điểm xác định đường (phân biệt).
 */
export function buildPerpFootLine(args: CollectedArg[], store: Store): string | null {
  const ids = pointIds(args, store);
  if (ids.length < 3 || ids.slice(0, 3).some((x) => !x)) return null;
  const [from, a, b] = ids as string[];
  if (a === b) return null; // đường suy biến
  return addPoint(store, { kind: 'perpFootLine', from, a, b });
}
