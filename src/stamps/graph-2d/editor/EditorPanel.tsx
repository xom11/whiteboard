'use client';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { MiniBoard, type MiniBoardHandle } from './MiniBoard';
import { useEditorState, type Store } from '../../../core/scene';
import type { GraphTool } from './tools';
import { STAMP_PANEL_DESKTOP } from '../../shared/StampLeftPanel/constants';
import { ToastProvider, ToastHost } from '../../shared/Toast';

// ---------- Public handle ----------

export interface GraphEditorPanelHandle {
  insert: () => boolean;
  hasContent: () => boolean;
  getStore: () => Store | null;
  highlight: (id: string | null) => void;
}

// ---------- Props ----------

export interface GraphEditorPanelProps {
  /** Scene store do Host tạo qua `useStampStore`. */
  store: Store;
  onInsert: (jsonState: string, svgString: string) => void;
  onClose: () => void;
  /** Callback khi selection thay đổi qua editor action. */
  onSelectionChange?: (id: string | undefined) => void;
  /** Controlled prop — host owns (Tier 2 F). */
  selectedTool: GraphTool;
  /** Controlled prop — host owns (Tier 2 F). */
  showAxis: boolean;
  /** Controlled prop — host owns (Tier 2 F). */
  showGrid: boolean;
  /** Notify host về canUndo/canRedo qua store subscribe (Tier 2 F). */
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  isDark?: boolean;
  /** Khi true (desktop) panel offset left chừa chỗ LeftPanel. */
  withLeftPanel?: boolean;
  /** Mobile mode: full-screen + hamburger header. */
  isMobile?: boolean;
  /** Click hamburger trên mobile để mở LeftPanel drawer. */
  onOpenDrawer?: () => void;
  /** Mobile header: undo/redo/insert buttons. */
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

// ---------- Component ----------

const GraphEditorPanelInner = forwardRef<GraphEditorPanelHandle, GraphEditorPanelProps>(
  function GraphEditorPanel(
    {
      store,
      onInsert,
      onClose,
      onSelectionChange,
      selectedTool,
      showAxis,
      showGrid,
      onHistoryChange,
      isDark,
      withLeftPanel = false,
      isMobile = false,
      onOpenDrawer,
      onUndo,
      onRedo,
      canUndo,
      canRedo,
    },
    ref,
  ) {
    const miniRef = useRef<MiniBoardHandle | null>(null);
    const [ready, setReady] = useState(false);
    const [hasContent, setHasContent] = useState(false);
    const onSelectionChangeRef = useRef(onSelectionChange);
    useEffect(() => { onSelectionChangeRef.current = onSelectionChange; }, [onSelectionChange]);

    // Tier 2 F — propagate canUndo/canRedo + keyboard shortcuts qua shared hook.
    useEditorState({ store, onHistoryChange });

    useEffect(() => {
      const sync = () => setHasContent(Object.keys(store.getState().objects).length > 0);
      sync();
      return store.subscribe(sync);
    }, [store]);

    const handleReady = useCallback(() => {
      setReady(true);
    }, []);

    // ---------- Insert ----------

    const performInsert = useCallback((): boolean => {
      const h = miniRef.current;
      if (!h) return false;
      const state = h.getState();
      if (Object.keys(state.objects).length === 0) return false;
      // Fire async SVG export
      void (async () => {
        try {
          const { renderGraphSvgFromState } = await import('../render');
          const { stringifySceneState } = await import('../serialize');
          const jsonState = stringifySceneState(state);
          const svgString = await renderGraphSvgFromState(state, !!isDark);
          onInsert(jsonState, svgString);
        } catch (err) {
          console.error('[GraphEditorPanel] insert failed:', err);
        }
      })();
      return true;
    }, [isDark, onInsert]);

    useImperativeHandle(ref, () => ({
      insert: performInsert,
      hasContent: () => Object.keys(miniRef.current?.getState().objects ?? {}).length > 0,
      getStore: () => miniRef.current?.getStore() ?? null,
      highlight: (id) => miniRef.current?.highlight(id),
    }), [performInsert]);

    // ---------- Layout ----------

    const wrapperStyle: React.CSSProperties = isMobile
      ? { position: 'fixed', inset: 0, zIndex: 40 }
      : {
          position: 'absolute',
          top: '50%',
          left: withLeftPanel ? 'calc(50% + 120px)' : '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 40,
        };

    return (
      <div
        role="dialog"
        aria-label="Đồ thị hàm số"
        data-testid="graph-editor-panel"
        data-stamp-area="true"
        data-mobile-editor={isMobile ? 'true' : undefined}
        style={wrapperStyle}
        className={[
          isDark ? 'theme--dark ' : '',
          'relative flex flex-col overflow-hidden bg-white',
          isMobile
            ? 'h-full w-full'
            : `${STAMP_PANEL_DESKTOP} rounded-lg border border-slate-300 shadow-2xl ring-1 ring-black/5`,
        ].join(' ')}
      >
        <header className="flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-white">
          {isMobile && (
            <button
              type="button"
              onClick={onOpenDrawer}
              aria-label="Mở ngăn công cụ"
              className="-ml-1 inline-flex h-10 w-10 items-center justify-center rounded transition hover:bg-white/15"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          )}
          <h3 className="flex flex-1 items-center gap-2 text-sm font-semibold">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3 L3 21 L21 21" />
              <path d="M6 14 Q9 8 12 10 Q15 12 18 6" />
            </svg>
            Đồ thị hàm số
          </h3>
          {isMobile && (
            <>
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                aria-label="Hoàn tác"
                title="Hoàn tác (Ctrl/Cmd+Z)"
                data-testid="undo-btn-mobile"
                className="inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15 disabled:opacity-40"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 10 L8 5 L8 8 L15 8 A5 5 0 0 1 20 13 L20 16" />
                  <path d="M3 10 L8 15 L8 12" />
                </svg>
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                aria-label="Làm lại"
                title="Làm lại (Ctrl/Cmd+Shift+Z)"
                data-testid="redo-btn-mobile"
                className="inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15 disabled:opacity-40"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 10 L16 5 L16 8 L9 8 A5 5 0 0 0 4 13 L4 16" />
                  <path d="M21 10 L16 15 L16 12" />
                </svg>
              </button>
              <button
                type="button"
                onClick={performInsert}
                disabled={!ready || !hasContent}
                title={!hasContent ? 'Vẽ ít nhất một đối tượng trước khi chèn' : undefined}
                data-testid="graph-insert-btn-mobile"
                className="rounded bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25 disabled:opacity-50"
              >
                Chèn
              </button>
            </>
          )}
          <button
            type="button"
            data-testid="graph-editor-close-btn"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        {/* MiniBoard */}
        <div className="flex-1 min-h-0">
          <MiniBoard
            ref={miniRef}
            store={store}
            selectedTool={selectedTool}
            showAxis={showAxis}
            showGrid={showGrid}
            isDark={isDark}
            onReady={handleReady}
            onSelectionChange={(id) => {
              onSelectionChangeRef.current?.(id);
            }}
          />
        </div>

        {!isMobile && (
          <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-xs text-slate-500">Chọn công cụ bên trái, nhấp trên bảng để tương tác.</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={performInsert}
                disabled={!ready || !hasContent}
                title={!hasContent ? 'Vẽ ít nhất một đối tượng trước khi chèn' : undefined}
                data-testid="graph-insert-btn"
                className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                Chèn
              </button>
            </div>
          </footer>
        )}
        <ToastHost />
      </div>
    );
  },
);

export const GraphEditorPanel = forwardRef<GraphEditorPanelHandle, GraphEditorPanelProps>(
  function GraphEditorPanel(props, ref) {
    return (
      <ToastProvider>
        <GraphEditorPanelInner {...props} ref={ref} />
      </ToastProvider>
    );
  },
);
