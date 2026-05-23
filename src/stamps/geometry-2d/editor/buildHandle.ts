import { listObjects } from '../../../core/scene';
import type { Store } from '../../../core/scene/store';
import type { JxgRenderer } from '../../../core/scene/render/JxgRenderer';
import { safeJsx } from '../../shared/safeJsx';
import { applyMutatePatch } from './attrMapping';
import { finalizeTransform, type HandlerCtx, type TransformToolKey } from './handlers';
import type {
  MiniBoardHandle,
  ObjectSnapshot,
  TransformPopoverInfo,
} from './MiniBoard.types';
import { buildObjectSnapshot } from './snapshot';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export interface BuildHandleDeps {
  // refs
  containerRef: { readonly current: HTMLDivElement | null };
  boardRef: { readonly current: JxgObj };
  rendererRef: { readonly current: JxgRenderer | null };
  selectSubsRef: { readonly current: Set<(snap: ObjectSnapshot) => void> };
  transformSubsRef: { readonly current: Set<(info: TransformPopoverInfo) => void> };
  selectedSetRef: { readonly current: Set<string> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pendingTransformRef: { current: any };
  ctxRef: { readonly current: HandlerCtx | null };
  // callbacks / values
  store: Store;
  clearPending: () => void;
  clearSelection: () => void;
  deleteSelection: () => void;
  emitTransform: (info: TransformPopoverInfo) => void;
}

/**
 * Build MiniBoardHandle object cho `useImperativeHandle`. Methods read refs
 * trực tiếp nên handle có thể tạo trước khi board boot xong; gọi method
 * trước onReady?.() có thể trả stale refs.
 *
 * Tách ra file riêng để giảm size MiniBoard.tsx — handle có 25+ methods,
 * chiếm ~60 dòng object literal.
 */
export function buildMiniBoardHandle(d: BuildHandleDeps): MiniBoardHandle {
  return {
    getContainer: () => d.containerRef.current,
    getBbox: () => d.boardRef.current?.getBoundingBox() ?? [-10, 10, 10, -10],
    getState: () => d.store.getState(),
    getStore: () => d.store,
    highlight: (id) => { d.rendererRef.current?.highlight(id); },
    snapshotObject: (id, anchorScreen) => buildObjectSnapshot(d.store.getState(), id, anchorScreen),
    mutateObject: (id, patch) => applyMutatePatch(d.store, id, patch),
    getAllPointNames: () => listObjects(d.store.getState())
      .filter((o) => o.kind === 'point' || o.kind === 'intersection')
      .map((o) => o.label),
    onSelect: (cb) => {
      d.selectSubsRef.current.add(cb);
      return () => { d.selectSubsRef.current.delete(cb); };
    },
    onTransformParam: (cb) => {
      d.transformSubsRef.current.add(cb);
      return () => { d.transformSubsRef.current.delete(cb); };
    },
    confirmTransformParam: (value: number) => {
      const info = d.pendingTransformRef.current as
        | { tool: TransformToolKey; pendingIds: string[]; anchorScreen: { x: number; y: number } }
        | null;
      if (info && d.ctxRef.current) {
        safeJsx('buildHandle.finalizeTransform', () =>
          finalizeTransform(d.ctxRef.current!, info.tool, info.pendingIds, value),
        );
      }
      d.pendingTransformRef.current = null;
      d.emitTransform(null);
      d.clearPending();
    },
    cancelTransformParam: () => {
      d.pendingTransformRef.current = null;
      d.emitTransform(null);
      d.clearPending();
    },
    getSelectionSize: () => d.selectedSetRef.current.size,
    clearSelection: d.clearSelection,
    deleteSelection: d.deleteSelection,
  };
}
