import type { Store, SceneObject } from '../../../../core/scene';
import type { Intent3DT } from '../intent';

export interface BuildState3D {
  store: Store;
  nameToId: Map<string, string>;
}

export class IntentBuilder3DError extends Error {
  constructor(message: string, public readonly intent?: Intent3DT) {
    super(message);
    this.name = 'IntentBuilder3DError';
  }
}

export type IntentBuilder3D = (s: BuildState3D, intent: Intent3DT) => void;

export function resolveId(s: BuildState3D, name: string): string {
  const id = s.nameToId.get(name);
  if (!id) throw new IntentBuilder3DError(`tham chiếu không tồn tại: ${name}`);
  return id;
}

export function addPoint3dObj(
  s: BuildState3D,
  label: string,
  constraint: Record<string, unknown>,
): string {
  const st = s.store.getState();
  const id = `p${st.counter + 1}`;
  const obj: SceneObject = {
    id,
    kind: 'point3d',
    label,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
    attrs: { constraint },
  };
  s.store.dispatch({ type: 'ADD', payload: { obj } });
  s.nameToId.set(label, id);
  return id;
}

export function addShape3dObj(
  s: BuildState3D,
  kind: string,
  prefix: string,
  label: string,
  attrs: Record<string, unknown>,
  visible = true,
): string {
  const st = s.store.getState();
  const id = `${prefix}${st.counter + 1}`;
  const obj: SceneObject = {
    id,
    kind,
    label,
    visible,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
    attrs,
  };
  s.store.dispatch({ type: 'ADD', payload: { obj } });
  if (label) s.nameToId.set(label, id);
  return id;
}
