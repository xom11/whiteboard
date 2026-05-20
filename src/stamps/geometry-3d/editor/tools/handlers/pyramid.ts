import type { CollectedArg } from '../spec';
import type { Store, SceneObject } from '../../../../../core/scene';
import { nextLabel } from '../../../../../core/scene';
import { ensurePoint } from './_ensurePoint';
import { apexCoplanarWithBase } from '../../scene/geometryChecks';

export function buildPyramid(args: CollectedArg[], store: Store): string | null {
  const pointArgs = args.filter((a) => a.step.type === 'point');
  const baseArgs = pointArgs.slice(0, -1); // last 'point' arg is the apex
  const apexArg = pointArgs.slice(-1)[0];
  if (baseArgs.length < 3 || !apexArg?.hit) return null;
  const baseIds = baseArgs
    .map((a) => (a.hit ? ensurePoint(a.hit, store) : null))
    .filter((x): x is string => !!x);
  const apexId = ensurePoint(apexArg.hit, store);
  if (!apexId || baseIds.length < 3) return null;
  if (apexCoplanarWithBase(baseIds, apexId, store.getState())) return null;
  const vertices = [...baseIds, apexId];
  const apexIdx = vertices.length - 1;
  const faces: number[][] = [baseIds.map((_, i) => i)];
  for (let i = 0; i < baseIds.length; i++) {
    faces.push([i, (i + 1) % baseIds.length, apexIdx]);
  }
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
    attrs: { flavor: 'pyramid', vertices, faces },
  };
  store.dispatch({ type: 'ADD', payload: { obj } });
  return id;
}
