import { safeJsx } from '../../shared/safeJsx';
import { buildPreviewShape, createPhantomPoint } from './preview';
import { TOOLS } from './tools';
import type { ToolStateMachine } from '../../shared/useToolStateMachine';
import type { GeomTool } from './tools';

 
type JxgObj = any;

export interface PreviewRefs {
  previewSegRef: { current: JxgObj[] };
  phantomRef: { current: JxgObj };
  previewShapeRef: { current: JxgObj };
  pendingRef: { current: JxgObj[] };
}

/**
 * Xoá tất cả preview segment objects (preview vertex-by-vertex của polygon
 * tool). Reset previewSegRef.current về mảng rỗng.
 */
export function clearPreviewSegs(
  board: JxgObj,
  previewSegRef: { current: JxgObj[] },
): void {
  if (!board) return;
  for (const s of previewSegRef.current) {
    safeJsx('previewActions.removePreviewSeg', () => board.removeObject(s));
  }
  previewSegRef.current = [];
}

/**
 * Xoá phantom point + preview shape (cả 2 đều transient, không nằm trong
 * scene store). Phantom là invisible point JSXGraph theo cursor; preview
 * shape là live-preview của shape user đang dựng.
 */
export function removePhantom(
  board: JxgObj,
  refs: { previewShapeRef: { current: JxgObj }; phantomRef: { current: JxgObj } },
): void {
  if (!board) return;
  if (refs.previewShapeRef.current) {
    safeJsx('previewActions.removePreviewShape', () => board.removeObject(refs.previewShapeRef.current));
    refs.previewShapeRef.current = null;
  }
  if (refs.phantomRef.current) {
    safeJsx('previewActions.removePhantom', () => board.removeObject(refs.phantomRef.current));
    refs.phantomRef.current = null;
  }
}

/**
 * Tear down old preview shape và build fresh từ current picks + phantom.
 * Phantom được tạo lazily — không spawn hidden point trước khi user có ít
 * nhất 1 real pick. Skip nếu tool variable-length (polygon: needs === -1)
 * vì handlers.ts emit per-vertex segments riêng qua previewSegRef.
 */
export function refreshPreviewShape(
  board: JxgObj,
  toolSM: ToolStateMachine<GeomTool>,
  refs: PreviewRefs,
): void {
  if (!board) return;
  if (refs.previewShapeRef.current) {
    safeJsx('previewActions.removePreviewShape', () => board.removeObject(refs.previewShapeRef.current));
    refs.previewShapeRef.current = null;
  }
  const t = toolSM.toolRef.current;
  const toolDef = TOOLS.find((td) => td.key === t);
  if (!toolDef) return;
  const picks = refs.pendingRef.current;
  if (picks.length === 0 || toolDef.needs <= 0) return;
  if (picks.length >= toolDef.needs) return;
  if (!refs.phantomRef.current) {
    refs.phantomRef.current = createPhantomPoint(board);
    if (!refs.phantomRef.current) return;
  }
  refs.previewShapeRef.current = buildPreviewShape(board, toolDef, picks, refs.phantomRef.current);
}
