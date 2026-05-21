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
import { GraphLeftPanel } from './LeftPanel';
import type { Store } from '../../../core/scene/store';
import type { State } from '../../../core/scene/types';
import type { GraphTool } from './tools';

// ---------- Public handle ----------

export interface GraphEditorPanelHandle {
  insert: () => boolean;
  hasContent: () => boolean;
  getStore: () => Store | null;
}

// ---------- Props ----------

export interface GraphEditorPanelProps {
  /** Serialized state để restore. null = mới. */
  initialState: State | null;
  onInsert: (jsonState: string, svgString: string) => void;
  onClose: () => void;
  /** Callback khi store sẵn sàng sau MiniBoard.onReady. */
  onStoreReady?: (store: Store) => void;
  /** Callback khi selection thay đổi qua editor action. */
  onSelectionChange?: (id: string | undefined) => void;
  isDark?: boolean;
  withLeftPanel?: boolean;
}

// ---------- Component ----------

export const GraphEditorPanel = forwardRef<GraphEditorPanelHandle, GraphEditorPanelProps>(
  function GraphEditorPanel(
    { initialState, onInsert, onClose, onStoreReady, onSelectionChange, isDark, withLeftPanel = false },
    ref,
  ) {
    const miniRef = useRef<MiniBoardHandle | null>(null);
    const onStoreReadyRef = useRef(onStoreReady);
    const onSelectionChangeRef = useRef(onSelectionChange);
    useEffect(() => { onStoreReadyRef.current = onStoreReady; }, [onStoreReady]);
    useEffect(() => { onSelectionChangeRef.current = onSelectionChange; }, [onSelectionChange]);

    const [activeTool, setActiveTool] = useState<GraphTool>('move');
    const [selectedObjectId, setSelectedObjectId] = useState<string | undefined>(undefined);
    // Store ref for LeftPanel — available after onReady
    const [store, setStore] = useState<Store | null>(null);

    const emit = useCallback(() => {
      const h = miniRef.current;
      if (!h) return;
      const s = h.getStore();
      setStore(s);
      onStoreReadyRef.current?.(s);
    }, []);

    // ---------- Add function / parameter ----------

    const handleAddFunction = useCallback(() => {
      const h = miniRef.current;
      if (!h) return;
      const s = h.getStore();
      const existing = Object.values(s.getState().objects).filter((o) => o.kind === 'function2d');
      const id = `f${existing.length + 1}`;
      s.dispatch({
        type: 'ADD',
        payload: {
          obj: {
            id,
            kind: 'function2d',
            label: id,
            visible: true,
            locked: false,
            layer: 'default',
            schemaVersion: 1,
            attrs: { expression: 'x', color: '#2563eb', visible: true },
          },
        },
      });
    }, []);

    const handleAddParameter = useCallback(() => {
      const h = miniRef.current;
      if (!h) return;
      const s = h.getStore();
      const existing = Object.values(s.getState().objects).filter((o) => o.kind === 'parameter');
      const labels = 'abcdefghijklmnopqrstuvwxyz';
      const usedLabels = new Set(existing.map((o) => o.label));
      let label = 'a';
      for (const c of labels) {
        if (!usedLabels.has(c)) { label = c; break; }
      }
      const id = label;
      s.dispatch({
        type: 'ADD',
        payload: {
          obj: {
            id,
            kind: 'parameter',
            label,
            visible: true,
            locked: false,
            layer: 'default',
            schemaVersion: 1,
            attrs: { value: 1, min: -5, max: 5, step: 0.1 },
          },
        },
      });
    }, []);

    // ---------- Insert ----------

    const performInsert = useCallback((): boolean => {
      const h = miniRef.current;
      if (!h) return false;
      const state = h.getStore().getState();
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
    }), [performInsert]);

    // ---------- Layout ----------

    const wrapperStyle: React.CSSProperties = {
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
        style={wrapperStyle}
        className={[
          isDark ? 'theme--dark ' : '',
          'flex h-[540px] max-h-[85vh] w-[640px] max-w-[calc(100vw-280px)] overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xl ring-1 ring-black/5',
        ].join('')}
      >
        {/* LeftPanel */}
        <GraphLeftPanel
          store={store ?? miniRef.current?.getStore() ?? createFallbackStore()}
          activeTool={activeTool}
          onToolChange={(t) => {
            setActiveTool(t);
            miniRef.current?.setTool(t);
          }}
          onAddFunction={handleAddFunction}
          onAddParameter={handleAddParameter}
          onClose={onClose}
          isDark={isDark}
          selectedObjectId={selectedObjectId}
          onObjectSelect={(id) => {
            setSelectedObjectId(id ?? undefined);
            miniRef.current?.highlight(id);
            onSelectionChangeRef.current?.(id ?? undefined);
          }}
        />

        {/* Board area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Header */}
          <header className="flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-white">
            <h3 className="flex flex-1 items-center gap-2 text-sm font-semibold">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3 L3 21 L21 21" />
                <path d="M6 14 Q9 8 12 10 Q15 12 18 6" />
              </svg>
              Đồ thị hàm số
            </h3>
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
              initialState={initialState ?? undefined}
              isDark={isDark}
              onReady={emit}
              onSelectionChange={(id) => {
                setSelectedObjectId(id);
                onSelectionChangeRef.current?.(id);
              }}
            />
          </div>

          {/* Footer */}
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
                data-testid="graph-insert-btn"
                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                Chèn
              </button>
            </div>
          </footer>
        </div>
      </div>
    );
  },
);

// Minimal stub store for initial render before MiniBoard is ready.
// This avoids passing undefined to LeftPanel which requires a real Store.
function createFallbackStore(): Store {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createStore } = require('../../../core/scene/store');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createEmptyState } = require('../../../core/scene/types');
  return createStore(createEmptyState('graph2d'));
}
