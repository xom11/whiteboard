import type { CollectedArg } from '../spec';
import type { Store, SceneObject } from '../../../../../core/scene';
import { nextLabel } from '../../../../../core/scene';
import { ensurePoint, addPoint } from './_ensurePoint';
import { constraintToWorld } from '../../scene/constraintMath';
import type { Point3DAttrs } from '../../../../../core/scene/kinds/point3d';

export function buildTetrahedron(args: CollectedArg[], store: Store): string | null {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1Id = ensurePoint(args[0].hit, store);
  const p2Id = ensurePoint(args[1].hit, store);
  if (!p1Id || !p2Id || p1Id === p2Id) return null;
  const state0 = store.getState();
  const p1Obj = state0.objects[p1Id];
  const p2Obj = state0.objects[p2Id];
  if (!p1Obj || p1Obj.kind !== 'point3d' || !p2Obj || p2Obj.kind !== 'point3d') return null;
  const p1 = constraintToWorld((p1Obj.attrs as Point3DAttrs).constraint, state0);
  const p2 = constraintToWorld((p2Obj.attrs as Point3DAttrs).constraint, state0);
  // Force base plane to z = min(p1.z, p2.z); project both points there.
  const z0 = Math.min(p1[2], p2[2]);
  const baseA: [number, number, number] = [p1[0], p1[1], z0];
  const baseB: [number, number, number] = [p2[0], p2[1], z0];
  const dx = baseB[0] - baseA[0];
  const dy = baseB[1] - baseA[1];
  const edge = Math.hypot(dx, dy);
  if (edge < 1e-9) return null;
  // Third base vertex: rotate (baseB - baseA) by 60° in xy and add to baseA midpoint
  const mid: [number, number, number] = [(baseA[0] + baseB[0]) / 2, (baseA[1] + baseB[1]) / 2, z0];
  const perpX = -dy;
  const perpY = dx;
  const perpLen = Math.hypot(perpX, perpY);
  const height = edge * Math.sqrt(3) / 2;
  const baseC: [number, number, number] = [mid[0] + (perpX / perpLen) * height, mid[1] + (perpY / perpLen) * height, z0];
  // Apex: centroid + edge*sqrt(2/3)
  const centroid: [number, number, number] = [
    (baseA[0] + baseB[0] + baseC[0]) / 3,
    (baseA[1] + baseB[1] + baseC[1]) / 3,
    z0,
  ];
  const apexHeight = edge * Math.sqrt(2 / 3);
  const apex: [number, number, number] = [centroid[0], centroid[1], z0 + apexHeight];

  const cId = addPoint(store, { kind: 'free', x: baseC[0], y: baseC[1], z: baseC[2] });
  const apexId = addPoint(store, { kind: 'free', x: apex[0], y: apex[1], z: apex[2] });

  const vertices = [p1Id, p2Id, cId, apexId];
  const faces: number[][] = [
    [0, 1, 2],     // base
    [0, 1, 3],     // face p1-p2-apex
    [1, 2, 3],     // face p2-c-apex
    [2, 0, 3],     // face c-p1-apex
  ];
  const id = `ph${store.getState().counter + 1}`;
  const label = nextLabel(store.getState(), 'polyhedron3d');
  const obj: SceneObject = {
    id,
    kind: 'polyhedron3d',
    label,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
    attrs: { flavor: 'tetrahedron', vertices, faces },
  };
  store.dispatch({ type: 'ADD', payload: { obj } });
  return id;
}
