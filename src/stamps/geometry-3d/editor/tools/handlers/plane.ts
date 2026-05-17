import type { CollectedArg } from '../spec';
import type { Scene3D } from '../../scene/Scene3D';
import { ensurePoint } from './_ensurePoint';
import { areCollinear3 } from '../../scene/geometryChecks';

export function buildPlane(args: CollectedArg[], scene: Scene3D): string | null {
  if (args.length < 3 || !args[0].hit || !args[1].hit || !args[2].hit) return null;
  const p1 = ensurePoint(args[0].hit, scene);
  const p2 = ensurePoint(args[1].hit, scene);
  const p3 = ensurePoint(args[2].hit, scene);
  if (!p1 || !p2 || !p3) return null;
  if (p1 === p2 || p2 === p3 || p1 === p3) return null;
  if (areCollinear3(p1, p2, p3, scene)) return null;
  return scene.addObject('plane', { p1, p2, p3 });
}
