import type { CollectedArg } from '../spec';
import type { Store, SceneObject } from '../../../../../core/scene';
import { nextLabel } from '../../../../../core/scene';
import { ensurePoint } from './_ensurePoint';

export function buildCylinder(args: CollectedArg[], store: Store): string | null {
  const points = args.filter((a) => a.step.type === 'point');
  const numberArg = args.find((a) => a.step.type === 'number');
  if (points.length < 2 || !points[0].hit || !points[1].hit || !numberArg || typeof numberArg.value !== 'number') return null;
  const radius = numberArg.value;
  if (radius <= 0) return null;
  const baseCenter = ensurePoint(points[0].hit, store);
  const topCenter = ensurePoint(points[1].hit, store);
  if (!baseCenter || !topCenter || baseCenter === topCenter) return null;
  const id = `cy${store.getState().counter + 1}`;
  const label = nextLabel(store.getState(), 'cylinder3d');
  const obj: SceneObject = {
    id,
    kind: 'cylinder3d',
    label,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
    attrs: { baseCenter, topCenter, radius },
  };
  store.dispatch({ type: 'ADD', payload: { obj } });
  return id;
}
