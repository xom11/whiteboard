// src/stamps/index.ts
// Barrel cho tất cả stamps + shared. Public API của package re-export từ đây.

export {
  DEFAULT_STAMPS,
  findStampForCustomData,
  isStampElement,
  geometryStamp,
  latexStamp,
  geometry3dStamp,
  type StampType,
  type BaseStampCustomData,
  type GeometryCustomData,
  type LatexCustomData,
  type Geometry3DCustomData,
  isGeometryCustomData,
  isLatexCustomData,
  isGeometry3DCustomData,
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
import type { GeometryCustomData, LatexCustomData, Geometry3DCustomData } from './shared/registry';
export type StampCustomData = GeometryCustomData | LatexCustomData | Geometry3DCustomData;
