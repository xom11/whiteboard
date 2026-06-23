import type { Store, SceneObject } from '../../../../core/scene';
import { constraintToWorld } from '../../../../core/scene/kinds/constraint3d-math';
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

// Toạ độ world của 1 điểm (đã resolve id) tại thời điểm build (mirror crossSection builder).
export function resolveWorld3d(s: BuildState3D, id: string): [number, number, number] {
  const st = s.store.getState();
  const obj = st.objects[id];
  if (!obj) throw new IntentBuilder3DError(`điểm không tồn tại: ${id}`);
  return constraintToWorld((obj.attrs as { constraint: never }).constraint, st) as [number, number, number];
}

// Bán kính phái sinh = khoảng cách từ baseCenter tới radiusTo, CHIẾU ⊥ trục (baseCenter→axisEnd).
// radiusTo trên đường tròn đáy (đỉnh/trung điểm cạnh/chân ⊥) → ra inradius/circumradius mặt.
export function projectedRadius3d(s: BuildState3D, baseId: string, axisEndId: string, radiusToId: string): number {
  const C = resolveWorld3d(s, baseId), E = resolveWorld3d(s, axisEndId), R = resolveWorld3d(s, radiusToId);
  const ax: [number, number, number] = [E[0] - C[0], E[1] - C[1], E[2] - C[2]];
  const an = Math.hypot(ax[0], ax[1], ax[2]) || 1;
  const u: [number, number, number] = [ax[0] / an, ax[1] / an, ax[2] / an];
  const v: [number, number, number] = [R[0] - C[0], R[1] - C[1], R[2] - C[2]];
  const proj = v[0] * u[0] + v[1] * u[1] + v[2] * u[2];
  return Math.hypot(v[0] - proj * u[0], v[1] - proj * u[1], v[2] - proj * u[2]);
}

export function addShape3dObj(
  s: BuildState3D,
  kind: string,
  prefix: string,
  label: string,
  attrs: Record<string, unknown>,
  visible = true,
  registerInNameMap = true,
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
  if (label && registerInNameMap) s.nameToId.set(label, id);
  return id;
}
