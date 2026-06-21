// src/stamps/geometry-3d/editor/tools/handlers/construct3d.ts
// Handler dựng ĐƯỜNG/MẶT phái sinh 3D (construction-variant, v1.5). Khác
// derived.ts (điểm phái sinh): ở đây tạo object line3d/plane3d với `construction`.
import type { CollectedArg } from '../spec';
import type { Store, SceneObject } from '../../../../../core/scene';
import { nextLabel } from '../../../../../core/scene';
import { hitObjectId } from './_ensurePoint';

function addShape(store: Store, kind: string, prefix: string, attrs: Record<string, unknown>): string {
  const id = `${prefix}${store.getState().counter + 1}`;
  const label = nextLabel(store.getState(), kind);
  const obj: SceneObject = {
    id, kind, label, visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs,
  };
  store.dispatch({ type: 'ADD', payload: { obj } });
  return id;
}

// Id mặt phẳng từ các bước 'object' (theo thứ tự chọn).
function objectPlaneIds(args: CollectedArg[]): (string | null)[] {
  return args.filter((a) => a.step.type === 'object' && a.hit).map((a) => hitObjectId(a.hit!));
}

/** Giao tuyến 2 mặt phẳng → line3d construction planePlaneIntersection. */
export function buildPlanePlaneIntersection(args: CollectedArg[], store: Store): string | null {
  const planes = objectPlaneIds(args);
  if (planes.length < 2 || !planes[0] || !planes[1] || planes[0] === planes[1]) return null;
  return addShape(store, 'line3d', 'l', {
    construction: { kind: 'planePlaneIntersection', plane1: planes[0], plane2: planes[1] },
  });
}
