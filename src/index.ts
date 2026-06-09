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
  STAMP_CATALOG,
  findCatalogEntry,
  type StampType,
  type BaseStampCustomData,
  type StampCatalogEntry,
  type GeometryCustomData,
  type LatexCustomData,
  type Geometry3DCustomData,
  type Graph2DCustomData,
  type StampCustomData,
} from './stamps';
export { restoreMissingStampFiles } from './stamps';

// PDF import API (không phải stamp — không re-edit, không customData)
export {
  insertPdfPages,
  insertRasterizedPagesIntoScene,
  type InsertPdfPagesOptions,
  type InsertPdfPagesResult,
  type InsertRasterizedPagesOptions,
  type InsertRasterizedPagesResult,
} from './pdf/insertPdfPages';
export {
  configurePdfWorker,
  loadPdfDocument,
  closePdfDocument,
  rasterizePdf,
  type RasterizedPage,
  type RasterizeOptions,
} from './pdf/rasterize';
export { parsePageRange } from './pdf/parseRange';

// AI types (safe for browser)
export type {
  AiFigureUiResult,
  AiFigureProgress,
  GenerateGeometryFigure,
} from './stamps/shared/types';
export type { GeometryDraftPreview } from './stamps/shared/draftTypes';

// Vision / OCR public API.
export {
  handleExtractProblem,
  type HandleExtractProblemOptions,
  type ExtractUiResult,
} from './stamps/geometry-2d/ai/handleExtractProblem';
export {
  type ImagePart,
  type VisionRequest,
} from './stamps/geometry-2d/ai/providers/types';
