import type { Scene3D } from './Scene3D';
import type { SerializedBoard3D } from '../../serialize';

/**
 * Stub implementations for Phase 7. The real Scene3D ↔ SerializedBoard3D
 * translation will be wired in Task 7.2; for now we return an empty board on
 * serialize and an empty scene on deserialize so the editor compiles and ships
 * v0.8.0-alpha. See plan Task 7.2 for the actual mapping.
 */
export function sceneToBoard(
  _scene: Scene3D,
  view: { azimuth: number; elevation: number; bbox3D: [number, number, number, number, number, number] },
  bbox: [number, number, number, number],
): SerializedBoard3D {
  return {
    version: 1,
    bbox,
    view,
    showAxes: true,
    showMesh: true,
    elements: [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function boardToScene(_board: SerializedBoard3D): Scene3D {
  // Lazy import to avoid circular deps if any.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Scene3D } = require('./Scene3D');
  return new Scene3D();
}
