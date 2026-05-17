import type { CollectedArg } from '../spec';
import type { Scene3D } from '../../scene/Scene3D';
import { ensurePoint } from './_ensurePoint';
import { constraintToWorld } from '../../scene/constraintMath';

export function buildPrism(args: CollectedArg[], scene: Scene3D): string | null {
  const baseArgs = args.filter((a) => a.step.type === 'point');
  const numberArg = args.find((a) => a.step.type === 'number');
  if (baseArgs.length < 3 || !numberArg || typeof numberArg.value !== 'number') return null;
  const height = numberArg.value;
  if (height <= 0) return null;
  const baseIds = baseArgs.map((a) => (a.hit ? ensurePoint(a.hit, scene) : null)).filter((x): x is string => !!x);
  if (baseIds.length < 3) return null;
  const topIds: string[] = [];
  for (const id of baseIds) {
    const p = scene.get(id);
    if (!p || p.kind !== 'point') return null;
    const w = constraintToWorld(p.constraint, scene);
    topIds.push(scene.addPoint({ kind: 'free', x: w[0], y: w[1], z: w[2] + height }));
  }
  const n = baseIds.length;
  const vertices = [...baseIds, ...topIds];
  const faces: number[][] = [
    baseIds.map((_, i) => i),
    topIds.map((_, i) => n + i),
  ];
  for (let i = 0; i < n; i++) {
    faces.push([i, (i + 1) % n, n + ((i + 1) % n), n + i]);
  }
  return scene.addObject('polyhedron', { flavor: 'prism', vertices, faces });
}
