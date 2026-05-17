import type { CollectedArg } from '../spec';
import type { Scene3D } from '../../scene/Scene3D';
import { ensurePoint } from './_ensurePoint';
import { constraintToWorld } from '../../scene/constraintMath';

export function buildCube(args: CollectedArg[], scene: Scene3D): string | null {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1Id = ensurePoint(args[0].hit, scene);
  const p2Id = ensurePoint(args[1].hit, scene);
  if (!p1Id || !p2Id || p1Id === p2Id) return null;
  const p1Obj = scene.get(p1Id);
  const p2Obj = scene.get(p2Id);
  if (!p1Obj || p1Obj.kind !== 'point' || !p2Obj || p2Obj.kind !== 'point') return null;
  const p1 = constraintToWorld(p1Obj.constraint, scene);
  const p2 = constraintToWorld(p2Obj.constraint, scene);
  // Require both on the ground (z = 0); reject otherwise
  if (Math.abs(p1[2]) > 1e-6 || Math.abs(p2[2]) > 1e-6) return null;
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const edge = Math.hypot(dx, dy);
  if (edge < 1e-9) return null;
  // Bottom face: p1, p2, p3 = p2 + perp, p4 = p1 + perp where perp = rotate (p2-p1) by +90°
  const perpX = -dy;
  const perpY = dx;
  const p3: [number, number, number] = [p2[0] + perpX, p2[1] + perpY, 0];
  const p4: [number, number, number] = [p1[0] + perpX, p1[1] + perpY, 0];
  // Top face: same x, y; z = edge
  const t1: [number, number, number] = [p1[0], p1[1], edge];
  const t2: [number, number, number] = [p2[0], p2[1], edge];
  const t3: [number, number, number] = [p3[0], p3[1], edge];
  const t4: [number, number, number] = [p4[0], p4[1], edge];

  const p3Id = scene.addPoint({ kind: 'onGround', x: p3[0], y: p3[1] });
  const p4Id = scene.addPoint({ kind: 'onGround', x: p4[0], y: p4[1] });
  const t1Id = scene.addPoint({ kind: 'free', x: t1[0], y: t1[1], z: t1[2] });
  const t2Id = scene.addPoint({ kind: 'free', x: t2[0], y: t2[1], z: t2[2] });
  const t3Id = scene.addPoint({ kind: 'free', x: t3[0], y: t3[1], z: t3[2] });
  const t4Id = scene.addPoint({ kind: 'free', x: t4[0], y: t4[1], z: t4[2] });

  const vertices = [p1Id, p2Id, p3Id, p4Id, t1Id, t2Id, t3Id, t4Id];
  // Faces by index in vertices:
  const faces: number[][] = [
    [0, 1, 2, 3], // bottom
    [4, 5, 6, 7], // top
    [0, 1, 5, 4], // front
    [1, 2, 6, 5], // right
    [2, 3, 7, 6], // back
    [3, 0, 4, 7], // left
  ];
  return scene.addObject('polyhedron', { flavor: 'cube', vertices, faces });
}
