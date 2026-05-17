import type { CollectedArg } from '../spec';
import type { Scene3D } from '../../scene/Scene3D';
import { ensurePoint } from './_ensurePoint';

export function buildCone(args: CollectedArg[], scene: Scene3D): string | null {
  const points = args.filter((a) => a.step.type === 'point');
  const numberArg = args.find((a) => a.step.type === 'number');
  if (points.length < 2 || !points[0].hit || !points[1].hit || !numberArg || typeof numberArg.value !== 'number') return null;
  const radius = numberArg.value;
  if (radius <= 0) return null;
  const baseCenter = ensurePoint(points[0].hit, scene);
  const apex = ensurePoint(points[1].hit, scene);
  if (!baseCenter || !apex || baseCenter === apex) return null;
  return scene.addObject('cone', { baseCenter, apex, radius });
}
