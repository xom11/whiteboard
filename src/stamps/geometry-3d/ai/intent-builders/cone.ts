import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId } from './_types';

// Vẽ khối nón qua tâm đáy + đỉnh + bán kính (số literal). registerInNameMap=false.
export const buildCone: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'cone') return;
  addShape3dObj(s, 'cone3d', 'co', intent.name ?? '', {
    baseCenter: resolveId(s, intent.baseCenter),
    apex: resolveId(s, intent.apex),
    radius: intent.radius,
  }, true, false);
};
