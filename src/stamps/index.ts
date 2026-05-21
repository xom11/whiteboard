// src/stamps/index.ts
// Barrel cho tất cả stamps + shared. Public API của package re-export từ đây.

export {
  STABLE_STAMPS,
  EXPERIMENTAL_STAMPS,
  ALL_STAMPS,
  DEFAULT_STAMPS,
  findStampForCustomData,
  isStampElement,
  geometryStamp,
  latexStamp,
  geometry3dStamp,
  graph2dStamp,
  type StampType,
  type BaseStampCustomData,
  type GeometryCustomData,
  type LatexCustomData,
  type Geometry3DCustomData,
  type Graph2DCustomData,
} from './shared/registry';

export type {
  StampHostProps,
  StampHostHandle,
  StampHostComponent,
} from './shared/types';

export { svgToImageElement } from './shared/svgToImage';
export { insertStampImage } from './shared/insertImage';
export { restoreMissingStampFiles } from './shared/restoreStampFiles';

export { ToolbarInjector } from './shared/ToolbarInjector';
export { useShortcuts } from './shared/useShortcuts';

// Union helper for consumers
import type {
  GeometryCustomData,
  LatexCustomData,
  Geometry3DCustomData,
  Graph2DCustomData,
} from './shared/registry';
export type StampCustomData =
  | GeometryCustomData
  | LatexCustomData
  | Geometry3DCustomData
  | Graph2DCustomData;
