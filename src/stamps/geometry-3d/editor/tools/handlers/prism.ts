import type { CollectedArg } from '../spec';
import type { Store, SceneObject } from '../../../../../core/scene';
import { nextLabel } from '../../../../../core/scene';
import { ensurePoint, addPoint } from './_ensurePoint';
import { constraintToWorld } from '../../scene/constraintMath';
import type { Point3DAttrs } from '../../../../../core/scene/kinds/point3d';

export function buildPrism(args: CollectedArg[], store: Store): string | null {
  const baseArgs = args.filter((a) => a.step.type === 'point');
  const numberArg = args.find((a) => a.step.type === 'number');
  if (baseArgs.length < 3 || !numberArg || typeof numberArg.value !== 'number') return null;
  const height = numberArg.value;
  if (height <= 0) return null;
  const baseIds = baseArgs
    .map((a) => (a.hit ? ensurePoint(a.hit, store) : null))
    .filter((x): x is string => !!x);
  if (baseIds.length < 3) return null;
  const topIds: string[] = [];
  for (const id of baseIds) {
    const state = store.getState();
    const p = state.objects[id];
    if (!p || p.kind !== 'point3d') return null;
    const attrs = p.attrs as Point3DAttrs;
    const w = constraintToWorld(attrs.constraint, state);
    topIds.push(addPoint(store, { kind: 'free', x: w[0], y: w[1], z: w[2] + height }));
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
    attrs: { flavor: 'prism', vertices, faces },
  };
  store.dispatch({ type: 'ADD', payload: { obj } });
  return id;
}
