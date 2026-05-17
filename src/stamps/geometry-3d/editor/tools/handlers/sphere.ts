import type { CollectedArg } from '../spec';
import type { Scene3D } from '../../scene/Scene3D';
import { ensurePoint } from './_ensurePoint';

export function buildSphere(args: CollectedArg[], scene: Scene3D): string | null {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const center = ensurePoint(args[0].hit, scene);
  const surface = ensurePoint(args[1].hit, scene);
  if (!center || !surface || center === surface) return null;
  return scene.addObject('sphere', { center, surfacePoint: surface });
}
