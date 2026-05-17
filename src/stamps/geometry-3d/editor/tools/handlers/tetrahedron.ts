import type { CollectedArg } from '../spec';
import type { Scene3D } from '../../scene/Scene3D';
import { ensurePoint } from './_ensurePoint';
import { constraintToWorld } from '../../scene/constraintMath';

export function buildTetrahedron(args: CollectedArg[], scene: Scene3D): string | null {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1Id = ensurePoint(args[0].hit, scene);
  const p2Id = ensurePoint(args[1].hit, scene);
  if (!p1Id || !p2Id || p1Id === p2Id) return null;
  const p1Obj = scene.get(p1Id);
  const p2Obj = scene.get(p2Id);
  if (!p1Obj || p1Obj.kind !== 'point' || !p2Obj || p2Obj.kind !== 'point') return null;
  const p1 = constraintToWorld(p1Obj.constraint, scene);
  const p2 = constraintToWorld(p2Obj.constraint, scene);
  // Force base plane to z = min(p1.z, p2.z); project both points there.
  const z0 = Math.min(p1[2], p2[2]);
  const baseA: [number, number, number] = [p1[0], p1[1], z0];
  const baseB: [number, number, number] = [p2[0], p2[1], z0];
  const dx = baseB[0] - baseA[0];
  const dy = baseB[1] - baseA[1];
  const edge = Math.hypot(dx, dy);
  if (edge < 1e-9) return null;
  // Third base vertex: rotate (baseB - baseA) by 60° in xy and add to baseA midpoint
  const mid: [number, number, number] = [(baseA[0]+baseB[0])/2, (baseA[1]+baseB[1])/2, z0];
  const perpX = -dy;
  const perpY = dx;
  const perpLen = Math.hypot(perpX, perpY);
  const height = edge * Math.sqrt(3) / 2;
  const baseC: [number, number, number] = [mid[0] + (perpX/perpLen)*height, mid[1] + (perpY/perpLen)*height, z0];
  // Apex: centroid + edge*sqrt(2/3)
  const centroid: [number, number, number] = [
    (baseA[0]+baseB[0]+baseC[0])/3,
    (baseA[1]+baseB[1]+baseC[1])/3,
    z0,
  ];
  const apexHeight = edge * Math.sqrt(2/3);
  const apex: [number, number, number] = [centroid[0], centroid[1], z0 + apexHeight];

  const cId = scene.addPoint({ kind: 'free', x: baseC[0], y: baseC[1], z: baseC[2] });
  const apexId = scene.addPoint({ kind: 'free', x: apex[0], y: apex[1], z: apex[2] });

  const vertices = [p1Id, p2Id, cId, apexId];
  const faces: number[][] = [
    [0, 1, 2],     // base
    [0, 1, 3],     // face p1-p2-apex
    [1, 2, 3],     // face p2-c-apex
    [2, 0, 3],     // face c-p1-apex
  ];
  return scene.addObject('polyhedron', { flavor: 'tetrahedron', vertices, faces });
}
