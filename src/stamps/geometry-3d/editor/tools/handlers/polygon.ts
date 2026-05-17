import type { CollectedArg } from '../spec';
import type { Scene3D } from '../../scene/Scene3D';
import { ensurePoint } from './_ensurePoint';

export function buildPolygon(args: CollectedArg[], scene: Scene3D): string | null {
  // Drop the final closingPoint arg, keep all 'point'-step hits as vertices.
  const vertexArgs = args.filter((a) => a.step.type === 'point');
  const vertexIds = vertexArgs.map((a) => (a.hit ? ensurePoint(a.hit, scene) : null)).filter((x): x is string => !!x);
  if (vertexIds.length < 3) return null;
  return scene.addObject('polygon', { vertices: vertexIds });
}
