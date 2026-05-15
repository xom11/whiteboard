export { StampToolButtons } from './StampToolButtons';
export { ToolbarStampInjector } from './ToolbarStampInjector';
export { GeometryLeftPanel, LatexLeftPanel } from './StampLeftPanel';
export { LatexEditorPopover, type LatexEditorHandle } from './LatexEditorPopover';
export {
  GeometryEditorPanel,
  type GeometryEditorPanelHandle,
  type GeomBoardState,
} from './GeometryEditorPanel';
export { useStampShortcuts } from './useStampShortcuts';
export { isMathStamp, type MathStampCustomData } from './types';
export { svgToImageElement } from '../stamps/shared/svgToImage';
export { restoreMissingMathStampFiles } from './restoreMathStampFiles';
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
