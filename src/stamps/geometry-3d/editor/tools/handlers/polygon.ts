import type { CollectedArg } from '../spec';
import type { Store, SceneObject } from '../../../../../core/scene';
import { nextLabel } from '../../../../../core/scene';
import { ensurePoint } from './_ensurePoint';

export function buildPolygon(args: CollectedArg[], store: Store): string | null {
  // Drop the final closingPoint arg, keep all 'point'-step hits as vertices.
  const vertexArgs = args.filter((a) => a.step.type === 'point');
  const vertexIds = vertexArgs
    .map((a) => (a.hit ? ensurePoint(a.hit, store) : null))
    .filter((x): x is string => !!x);
  if (vertexIds.length < 3) return null;

  const id = `pg${store.getState().counter + 1}`;
  const label = nextLabel(store.getState(), 'polygon3d');
  const obj: SceneObject = {
    id,
    kind: 'polygon3d',
    label,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
    attrs: { vertices: vertexIds },
  };
  store.dispatch({ type: 'ADD', payload: { obj } });
  return id;
}
