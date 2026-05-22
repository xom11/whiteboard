import type { Store } from '../../../../core/scene';
import type { GeomTool } from '../tools';
import type { ShowToastFn } from '../../../shared/Toast';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export type TransformToolKey =
  | 'translate'
  | 'rotate'
  | 'reflectLine'
  | 'reflectPoint'
  | 'dilate'
  | 'regularPolygon';

export interface HandlerCtx {
  // Refs (read .current at call time)
  boardRef: { current: JxgObj };
  toolRef: { current: GeomTool };
  pendingRef: { current: JxgObj[] };
  pendingIdsRef: { current: string[] };
  previewSegRef: { current: JxgObj[] };
  axisObjsRef: { current: { x?: JxgObj; y?: JxgObj } };
  selectedSetRef: { current: Set<string> };
  marqueeRef: { current: { startSx: number; startSy: number; rect?: JxgObj } | null };
  moveDownRef: { current: { sx: number; sy: number } | null };
  lastMoveClickRef: { current: { id: string | null; time: number } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pendingTransformRef: { current: any };
  phantomRef: { current: JxgObj };
  previewShapeRef: { current: JxgObj };
  previewRafRef: { current: number | null };
  jxgRef: { current: JxgObj };

  // Store-bound callbacks
  store: Store;
  jxgIdToSceneId: (jxgObj: JxgObj) => string | null;
  jxgFromSceneId: (id: string) => JxgObj;

  // Stable callbacks (identity doesn't change)
  screenCoordsOf: (evt: JxgObj) => [number, number] | null;
  objectsAt: (evt: JxgObj) => JxgObj[];
  promoteLabel: (o: JxgObj) => JxgObj;
  findNearestPointJxg: (evt: JxgObj, tolPx?: number) => JxgObj | null;
  toggleSelect: (id: string, additive: boolean) => void;
  clearSelection: () => void;
  nextLabel: (kind: string) => string;
  clearPending: () => void;
  clearPreviewSegs: () => void;
  refreshPreview: () => void;
  flashWarn: (msg: string) => void;
  /**
   * Stamp-editor toast. Optional vì handler unit-test xây HandlerCtx mà
   * không có ToastProvider. Dùng cho invalid-construction feedback (vd
   * tangent: P trong đường tròn).
   */
  toast?: ShowToastFn;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emitTransform: (info: any | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emitSelect: (snap: any) => void;
  setPendingCount: (n: number) => void;
  setSelectionTick: (fn: (t: number) => number) => void;
}
