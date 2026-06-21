import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId, IntentBuilder3DError } from './_types';
import type { State } from '../../../../core/scene';
import { constraintToWorld, planeConstructionWorld } from '../../../../core/scene/kinds/constraint3d-math';
import {
  planeFrame, signedDistance, edgePlaneCrossing, extractEdges, orderAroundPerimeter,
  type Vec3,
} from '../crossSectionGeometry';

const ON_PLANE_EPS = 1e-6;

function pointWorld(state: State, id: string): Vec3 {
  return constraintToWorld((state.objects[id].attrs as { constraint: unknown }).constraint as never, state) as Vec3;
}

function planeWorldPoints(state: State, planeId: string): [Vec3, Vec3, Vec3] {
  const pl = state.objects[planeId];
  if (!pl || pl.kind !== 'plane3d') throw new IntentBuilder3DError(`không phải mặt phẳng: ${planeId}`);
  const a = pl.attrs as { p1?: string; p2?: string; p3?: string; construction?: unknown };
  if (a.construction) {
    const w = planeConstructionWorld(a.construction as never, state);
    return [w.p1, w.p2, w.p3];
  }
  return [pointWorld(state, a.p1 as string), pointWorld(state, a.p2 as string), pointWorld(state, a.p3 as string)];
}

function uniqueSolidId(state: State): string {
  const solids = Object.values(state.objects).filter((o) => o.kind === 'polyhedron3d');
  if (solids.length !== 1) throw new IntentBuilder3DError(`cross-section cần đúng 1 khối, có ${solids.length}`);
  return solids[0].id;
}

export const buildCrossSection: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'cross-section') return;
  const state = s.store.getState();
  const planeId = resolveId(s, intent.plane);
  const solidId = intent.solid ? resolveId(s, intent.solid) : uniqueSolidId(state);

  const [pp1, pp2, pp3] = planeWorldPoints(state, planeId);
  const frame = planeFrame(pp1, pp2, pp3);

  const solidObj = state.objects[solidId];
  const verts = (solidObj.attrs as { vertices: string[] }).vertices;
  const faces = (solidObj.attrs as { faces: number[][] }).faces;

  const sv: Array<{ id: string; world: Vec3 }> = [];
  const seenId = new Set<string>();

  // 1) solid vertices ON the plane → reuse existing id.
  const onPlane = new Set<number>();
  verts.forEach((vid, idx) => {
    const w = pointWorld(state, vid);
    if (Math.abs(signedDistance(w, frame)) < ON_PLANE_EPS) {
      onPlane.add(idx);
      if (!seenId.has(vid)) { seenId.add(vid); sv.push({ id: vid, world: w }); }
    }
  });

  // 2) edges with a strict crossing → a derived intersectionLinePlane point.
  for (const [i, j] of extractEdges(faces)) {
    if (onPlane.has(i) || onPlane.has(j)) continue;
    const aw = pointWorld(state, verts[i]);
    const bw = pointWorld(state, verts[j]);
    const t = edgePlaneCrossing(aw, bw, frame);
    if (t == null) continue;
    const w: Vec3 = [
      aw[0] + t * (bw[0] - aw[0]),
      aw[1] + t * (bw[1] - aw[1]),
      aw[2] + t * (bw[2] - aw[2]),
    ];
    const id = addShape3dObj(
      s, 'point3d', 'p', '',
      { constraint: { kind: 'intersectionLinePlane', a: verts[i], b: verts[j], plane: planeId } },
      true, false,
    );
    sv.push({ id, world: w });
  }

  // 3) fail-soft: need ≥3 vertices to form a polygon.
  if (sv.length < 3) return;

  // 4) order around perimeter, 5) emit polygon3d.
  const order = orderAroundPerimeter(sv.map((p) => p.world), frame);
  const orderedIds = order.map((idx) => sv[idx].id);
  const label = intent.name ?? '';
  addShape3dObj(s, 'polygon3d', 'poly', label, { vertices: orderedIds, color: '#34d399' }, true, !!intent.name);
};
