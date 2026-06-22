import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId } from './_types';

// Đa giác từ nhãn điểm tường minh (mặt cắt qua trục). registerInNameMap=false: không được ref.
export const buildPolygon: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'polygon') return;
  addShape3dObj(s, 'polygon3d', 'sec', intent.name ?? '', {
    vertices: intent.vertices.map((v) => resolveId(s, v)),
    color: '#60a5fa',
  }, true, false);
};
