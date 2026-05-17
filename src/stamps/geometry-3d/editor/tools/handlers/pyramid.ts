import type { CollectedArg } from '../spec';
import type { Scene3D } from '../../scene/Scene3D';
import { ensurePoint } from './_ensurePoint';
import { apexCoplanarWithBase } from '../../scene/geometryChecks';

export function buildPyramid(args: CollectedArg[], scene: Scene3D): string | null {
  const pointArgs = args.filter((a) => a.step.type === 'point');
  const baseArgs = pointArgs.slice(0, -1); // last 'point' arg is the apex
  const apexArg = pointArgs.slice(-1)[0];
  if (baseArgs.length < 3 || !apexArg?.hit) return null;
  const baseIds = baseArgs.map((a) => (a.hit ? ensurePoint(a.hit, scene) : null)).filter((x): x is string => !!x);
  const apexId = ensurePoint(apexArg.hit, scene);
  if (!apexId || baseIds.length < 3) return null;
  if (apexCoplanarWithBase(baseIds, apexId, scene)) return null;
  const vertices = [...baseIds, apexId];
  const apexIdx = vertices.length - 1;
  const faces: number[][] = [baseIds.map((_, i) => i)];
  for (let i = 0; i < baseIds.length; i++) {
    faces.push([i, (i + 1) % baseIds.length, apexIdx]);
  }
  return scene.addObject('polyhedron', { flavor: 'pyramid', vertices, faces });
}
