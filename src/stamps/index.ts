// src/stamps/index.ts
// Barrel cho tất cả stamps + shared. Public API của package re-export từ đây.

export {
  DEFAULT_STAMPS,
  findStampForCustomData,
  isStampElement,
  geometryStamp,
  latexStamp,
  type StampType,
  type BaseStampCustomData,
  type GeometryCustomData,
  type LatexCustomData,
  isGeometryCustomData,
  isLatexCustomData,
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

// Union helper for consumers — extended in Phase B with Geometry3DCustomData
import type { GeometryCustomData, LatexCustomData } from './shared/registry';
export type StampCustomData = GeometryCustomData | LatexCustomData;
