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

