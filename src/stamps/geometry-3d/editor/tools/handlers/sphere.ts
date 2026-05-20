import type { CollectedArg } from '../spec';
import type { Store, SceneObject } from '../../../../../core/scene';
import { nextLabel } from '../../../../../core/scene';
import { ensurePoint } from './_ensurePoint';

export function buildSphere(args: CollectedArg[], store: Store): string | null {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const center = ensurePoint(args[0].hit, store);
  const surface = ensurePoint(args[1].hit, store);
  if (!center || !surface || center === surface) return null;
  const id = `sp${store.getState().counter + 1}`;
  const label = nextLabel(store.getState(), 'sphere3d');
  const obj: SceneObject = {
    id,
    kind: 'sphere3d',
    label,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
    attrs: { center, surfacePoint: surface },
  };
  store.dispatch({ type: 'ADD', payload: { obj } });
  return id;
}
