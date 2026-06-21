import { createEmptyState, createStore } from '../../../core/scene';
import type { State } from '../../../core/scene';
import type { Intent3DT } from './intent';
import { OP_BUILDERS_3D } from './intent-builders/registry';
import { IntentBuilder3DError, type BuildState3D } from './intent-builders/_types';
import { orderIntents3dByDependency } from './intentTopo3d';

export { IntentBuilder3DError };

export function intentToScene3d(intents: readonly Intent3DT[]): State {
  const store = createStore(createEmptyState('3d'));
  const s: BuildState3D = { store, nameToId: new Map() };
  for (const intent of orderIntents3dByDependency(intents)) {
    const builder = OP_BUILDERS_3D[intent.op];
    if (!builder) throw new IntentBuilder3DError(`không có builder cho op=${intent.op}`, intent);
    builder(s, intent);
  }
  // Override meta.view so render.ts (which unpacks bbox3D as
  // x=[bbox[0],bbox[3]], y=[bbox[1],bbox[4]], z=[bbox[2],bbox[5]])
  // gets the correct axis ordering [xmin,ymin,zmin,xmax,ymax,zmax].
  // DEFAULT_VIEW_3D uses [xmin,xmax,ymin,ymax,zmin,zmax] which would invert axes.
  const st = store.getState();
  return {
    ...st,
    meta: {
      domain: '3d',
      version: st.meta.version,
      // azimuth/elevation chosen for a clear 3/4 textbook view of solids — verified
      // via Playwright that the editor default el≈0.4 squashes the horizontal base
      // edge-on; el≈0.6 looks down enough to show the base as a proper polygon.
      view: { bbox3D: [-3, -3, -3, 3, 3, 3], azimuth: 1.0, elevation: 0.6 },
    },
  } as State;
}
