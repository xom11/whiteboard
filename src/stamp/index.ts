export { StampToolButtons } from './StampToolButtons';
export { ToolbarInjector as ToolbarStampInjector } from '../stamps/shared/ToolbarInjector';
export { GeometryLeftPanel } from '../stamps/geometry-2d/editor/LeftPanel';
export { LatexLeftPanel } from '../stamps/latex/editor/LeftPanel';
export { LatexEditorPopover, type LatexEditorHandle } from '../stamps/latex/editor/EditorPopover';
export {
  GeometryEditorPanel,
  type GeometryEditorPanelHandle,
  type GeomBoardState,
} from '../stamps/geometry-2d/editor/EditorPanel';
export { useShortcuts as useStampShortcuts } from '../stamps/shared/useShortcuts';
export { isMathStamp, type MathStampCustomData } from './types';
export { svgToImageElement } from '../stamps/shared/svgToImage';
export { restoreMissingStampFiles as restoreMissingMathStampFiles } from '../stamps/shared/restoreStampFiles';
export type { SerializedBoard } from '../stamps/geometry-2d/serialize';

// Registry — Phase 2 stamp extensibility
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
} from '../stamps/shared/registry';
