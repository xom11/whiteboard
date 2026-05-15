// src/index.ts — public API của @xom11/whiteboard

export { Whiteboard } from './Whiteboard';
export type { WhiteboardProps } from './Whiteboard';
export { pickSyncableAppState } from './serialize';
export type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
  AppState,
  BinaryFiles,
  SyncableAppState,
  ExcalidrawSceneSnapshot,
} from './types';

// Stamps API
export {
  DEFAULT_STAMPS,
  findStampForCustomData,
  isStampElement,
  geometryStamp,
  latexStamp,
  geometry3dStamp,
  isGeometryCustomData,
  isLatexCustomData,
  isGeometry3DCustomData,
  type StampType,
  type BaseStampCustomData,
  type GeometryCustomData,
  type LatexCustomData,
  type Geometry3DCustomData,
  type StampCustomData,
} from './stamps';
export { restoreMissingStampFiles } from './stamps';

// ===========================================================================
// Aliases @deprecated — sẽ xoá ở 0.6.0
// ===========================================================================

import {
  isStampElement,
  restoreMissingStampFiles as _restoreMissingStampFiles,
  type StampCustomData,
} from './stamps';

/** @deprecated Dùng `isStampElement` thay vì `isMathStamp`. Sẽ xoá ở 0.6.0. */
export const isMathStamp = isStampElement;

/** @deprecated Dùng `StampCustomData` thay vì `MathStampCustomData`. Sẽ xoá ở 0.6.0. */
export type MathStampCustomData = StampCustomData;

/** @deprecated Dùng `restoreMissingStampFiles` thay vì `restoreMissingMathStampFiles`. Sẽ xoá ở 0.6.0. */
export const restoreMissingMathStampFiles = _restoreMissingStampFiles;
