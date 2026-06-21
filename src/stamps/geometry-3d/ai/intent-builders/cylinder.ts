import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId } from './_types';

// Vẽ khối trụ qua 2 tâm đáy + bán kính (số literal). registerInNameMap=false.
export const buildCylinder: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'cylinder') return;
  addShape3dObj(s, 'cylinder3d', 'cy', intent.name ?? '', {
    baseCenter: resolveId(s, intent.baseCenter),
    topCenter: resolveId(s, intent.topCenter),
    radius: intent.radius,
  }, true, false);
};
