// src/stamps/geometry-3d/editor/tools/handlers/derived.ts
// Handler dựng ĐIỂM PHÁI SINH 3D (v1). Mỗi handler: resolve điểm gốc qua
// ensurePoint → addPoint(store, constraint phái sinh). (centroid/intersection/
// perpFoot bổ sung ở các batch v1 kế tiếp.)
import type { Store } from '../../../../../core/scene';
import type { CollectedArg } from '../spec';
import { addPoint, ensurePoint } from './_ensurePoint';

/** Trung điểm đoạn nối 2 điểm. */
export function buildMidpoint(args: CollectedArg[], store: Store): string | null {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1 = ensurePoint(args[0].hit, store);
  const p2 = ensurePoint(args[1].hit, store);
  if (!p1 || !p2 || p1 === p2) return null;
  return addPoint(store, { kind: 'midpoint', p1, p2 });
}
