import type { CollectedArg } from '../spec';
import type { Store, SceneObject } from '../../../../../core/scene';
import { nextLabel } from '../../../../../core/scene';
import { ensurePoint } from './_ensurePoint';
import { areCollinear3 } from '../../scene/geometryChecks';

export function buildPlane(args: CollectedArg[], store: Store): string | null {
  if (args.length < 3 || !args[0].hit || !args[1].hit || !args[2].hit) return null;
  const p1 = ensurePoint(args[0].hit, store);
  const p2 = ensurePoint(args[1].hit, store);
  const p3 = ensurePoint(args[2].hit, store);
  if (!p1 || !p2 || !p3) return null;
  if (p1 === p2 || p2 === p3 || p1 === p3) return null;
  if (areCollinear3(p1, p2, p3, store.getState())) return null;
  const id = `pl${store.getState().counter + 1}`;
  const label = nextLabel(store.getState(), 'plane3d');
  const obj: SceneObject = {
    id,
    kind: 'plane3d',
    label,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
    attrs: { p1, p2, p3 },
  };
  store.dispatch({ type: 'ADD', payload: { obj } });
  return id;
}
