import type { CollectedArg } from '../spec';
import type { Scene3D } from '../../scene/Scene3D';
import { hitToConstraint } from './_ensurePoint';

export function buildPoint(args: CollectedArg[], scene: Scene3D): string | null {
  const hit = args[0]?.hit;
  if (!hit) return null;
  if (hit.kind === 'existingPoint') return hit.pointId;
  const c = hitToConstraint(hit);
  if (!c) return null;
  return scene.addPoint(c);
}

export const buildPointOnObject = buildPoint;  // identical semantics; step.allowNewOn is the only difference
