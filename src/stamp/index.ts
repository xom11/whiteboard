export { StampToolButtons } from './StampToolButtons';
export { ToolbarInjector as ToolbarStampInjector } from '../stamps/shared/ToolbarInjector';
export { GeometryLeftPanel, LatexLeftPanel } from './StampLeftPanel';
export { LatexEditorPopover, type LatexEditorHandle } from './LatexEditorPopover';
export {
  GeometryEditorPanel,
  type GeometryEditorPanelHandle,
  type GeomBoardState,
} from './GeometryEditorPanel';
export { useShortcuts as useStampShortcuts } from '../stamps/shared/useShortcuts';
export { isMathStamp, type MathStampCustomData } from './types';
export { svgToImageElement } from '../stamps/shared/svgToImage';
export { restoreMissingStampFiles as restoreMissingMathStampFiles } from '../stamps/shared/restoreStampFiles';
export type { SerializedBoard } from './serializeBoard';

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
