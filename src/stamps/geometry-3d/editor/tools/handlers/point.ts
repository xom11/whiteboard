import type { CollectedArg } from '../spec';
import type { Store } from '../../../../../core/scene';
import { hitToConstraint, addPoint } from './_ensurePoint';

export function buildPoint(args: CollectedArg[], store: Store): string | null {
  const hit = args[0]?.hit;
  if (!hit) return null;
  if (hit.kind === 'existingPoint') return hit.pointId;
  const c = hitToConstraint(hit);
  if (!c) return null;
  return addPoint(store, c);
}

export const buildPointOnObject = buildPoint;  // identical semantics; step.allowNewOn is the only difference
