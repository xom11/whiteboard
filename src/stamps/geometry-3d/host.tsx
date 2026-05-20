'use client';

import type React from 'react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { EditorPanel, type EditorPanelHandle } from './editor/EditorPanel';
import { LeftPanel } from './editor/LeftPanel';
import { createStore, createEmptyState, type Store, type State } from '../../core/scene';
import { GROUP_ORDER, TOOLS_FLAT } from './editor/toolPanel/groups';
import { useChordShortcut } from '../shared/useChordShortcut';
import { insertStampImage } from '../shared/insertImage';
import { useIsMobile } from '../shared/useIsMobile';
import { renderGeometry3DSvgFromState } from './render';
import {
  isGeometry3DCustomData,
  parseSerializedBoard3D,
  type Geometry3DCustomData,
  type SerializedBoard3D,
  type SerializedView3D,
} from './serialize';
import type {
  StampHostProps,
  StampHostHandle,
} from '../shared/types';
import type { ToolKey } from './editor/tools/spec';

function parseInitial(
  editingElement: StampHostProps['editingElement'],
): { state: State; view?: SerializedView3D } | null {
  if (!editingElement) return null;
  if (!isGeometry3DCustomData(editingElement.customData)) return null;
  try {
    return parseSerializedBoard3D(JSON.parse(editingElement.customData.jsonState));
  } catch {
    return null;
  }
}

export const Geometry3DStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function Geometry3DStampHost({ api, editingElement, onClose, isDark }, ref) {
    const editorRef = useRef<EditorPanelHandle | null>(null);
    const storeRef = useRef<Store | null>(null);
    if (!storeRef.current) storeRef.current = createStore(createEmptyState('3d'));
    const { isMobile } = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [ready, setReady] = useState(false);

    const [selectedTool, setSelectedTool] = useState<ToolKey>('move');
    const [showAxis, setShowAxis] = useState<boolean>(true);
    const [showGrid, setShowGrid] = useState<boolean>(true);
    const [canUndo, setCanUndo] = useState<boolean>(false);
    const [canRedo, setCanRedo] = useState<boolean>(false);
    const [hasContent, setHasContent] = useState<boolean>(false);
    const [selectedObjectId, setSelectedObjectId] = useState<string | undefined>(undefined);

    const handleHistoryChange = useCallback((u: boolean, r: boolean) => {
      setCanUndo(u);
      setCanRedo(r);
    }, []);

    const handleObjectSelect = useCallback((id: string) => {
      setSelectedObjectId(id);
      editorRef.current?.highlight(id);
    }, []);

    useEffect(() => {
      const store = storeRef.current;
      if (!store) return;
      const sync = () => setHasContent(Object.keys(store.getState().objects).length > 0);
      sync();
      // Any store change is a potential hasContent change.
      const unsub = store.subscribe(sync);
      return unsub;
    }, []);

    const handleUndo = useCallback(() => {
      editorRef.current?.undo();
    }, []);

    const handleRedo = useCallback(() => {
      editorRef.current?.redo();
    }, []);

    const initial = useMemo(
      () => parseInitial(editingElement),
      [editingElement],
    );

    const { chordGroup } = useChordShortcut({
      groupOrder: GROUP_ORDER,
      tools: TOOLS_FLAT,
      onSelect: (key) => {
        setSelectedTool(key as ToolKey);
        editorRef.current?.setTool(key as ToolKey);
      },
      enabled: !isMobile,
    });

    const handleSelectTool = useCallback((k: ToolKey) => {
      setSelectedTool(k);
      editorRef.current?.setTool(k);
    }, []);

    const performInsert = useCallback(
      async (board: SerializedBoard3D, width: number, height: number, svgString: string) => {
        if (!api) return;
        const jsonState = JSON.stringify(board);
        await insertStampImage(api, {
          svgString,
          makeCustomData: (): Geometry3DCustomData => ({
            kind: 'geometry3d',
            // Bump customData.version vẫn 2 (đã được hỗ trợ ở isGeometry3DCustomData)
            // — payload bên trong là envelope v2 mới của state.
            version: 2,
            jsonState,
            svgWidth: width,
            svgHeight: height,
          }),
          editingElementId: editingElement?.id ?? null,
        });
        onClose();
      },
      [api, editingElement, onClose],
    );

    const tryInsert = useCallback((): boolean => {
      if (!editorRef.current) return false;
      if (!editorRef.current.hasContent()) return false;
      const board = editorRef.current.serialize();
      if (Object.keys(board.state.objects).length === 0) return false;
      void (async () => {
        try {
          const jsonState = JSON.stringify(board);
          const { svgString, width, height } = await renderGeometry3DSvgFromState(jsonState);
          await performInsert(board, width, height, svgString);
        } catch (err) {
          console.error('Geometry3D insert failed:', err);
        }
      })();
      return true;
    }, [performInsert]);

    useImperativeHandle(
      ref,
      () => ({
        tryInsert,
        hasContent: () => editorRef.current?.hasContent() ?? false,
      }),
      [tryInsert],
    );

    const handleEditorInsert = useCallback(
      (board: SerializedBoard3D, width: number, height: number, svgString: string) => {
        void performInsert(board, width, height, svgString);
      },
      [performInsert],
    );

    const dialogStyle: React.CSSProperties = isMobile
      ? { position: 'fixed', inset: 0, zIndex: 40 }
      : {
          position: 'absolute',
          top: '50%',
          left: 'calc(50% + 120px)',
          transform: 'translate(-50%, -50%)',
          zIndex: 40,
        };

    return (
      <>
        {!isMobile && (
          <LeftPanel
            store={storeRef.current}
            selectedTool={selectedTool}
            onSelectTool={handleSelectTool}
            showAxis={showAxis}
            showGrid={showGrid}
            onShowAxisChange={setShowAxis}
            onShowGridChange={setShowGrid}
            onUndo={handleUndo}
            canUndo={canUndo}
            onRedo={handleRedo}
            canRedo={canRedo}
            onClose={onClose}
            isDark={isDark}
            chordGroup={chordGroup}
            selectedObjectId={selectedObjectId}
            onObjectSelect={handleObjectSelect}
          />
        )}
        <div
          role="dialog"
          aria-label="Dựng hình học 3D"
          data-testid="geom3d-host"
          data-stamp-area="true"
          style={dialogStyle}
          className={[
            isDark ? 'theme--dark ' : '',
            'flex flex-col overflow-hidden bg-white',
            isMobile
              ? 'h-full w-full'
              : 'h-[600px] max-h-[85vh] w-[800px] max-w-[calc(100vw-320px)] rounded-lg border border-slate-300 shadow-2xl ring-1 ring-black/5',
          ].join(' ')}
        >
          <header className="flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-white">
            {isMobile && (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
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
                <path d="M4 9 L4 20 L14 20 L14 9 Z M4 9 L10 4 L20 4 L14 9 Z M14 9 L20 4 L20 15 L14 20 Z" />
              </svg>
              Dựng hình học không gian
            </h3>
            {isMobile && (
              <button
                type="button"
                onClick={tryInsert}
                disabled={!ready || !hasContent}
                title={!hasContent ? 'Vẽ ít nhất một đối tượng trước khi chèn' : undefined}
                data-testid="geom3d-insert-btn-mobile"
                className="rounded bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25 disabled:opacity-50"
              >
                Chèn
              </button>
            )}
            <button
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
          <div className="min-h-0 flex-1">
            <EditorPanel
              ref={editorRef}
              isDark={isDark}
              initialState={initial}
              onInsert={handleEditorInsert}
              store={storeRef.current}
              selectedTool={selectedTool}
              onSelectedToolChange={setSelectedTool}
              showAxis={showAxis}
              showGrid={showGrid}
              onReadyChange={setReady}
              onHistoryChange={handleHistoryChange}
            />
          </div>
          {!isMobile && (
            <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-xs text-slate-500">Chọn công cụ bên trái, click trên bảng để dựng hình.</span>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Huỷ
                </button>
                <button
                  onClick={tryInsert}
                  disabled={!ready || !hasContent}
                  title={!hasContent ? 'Vẽ ít nhất một đối tượng trước khi chèn' : undefined}
                  data-testid="geom3d-insert-btn"
                  className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  Chèn
                </button>
              </div>
            </footer>
          )}
        </div>
        {isMobile && (
          <LeftPanel
            store={storeRef.current}
            selectedTool={selectedTool}
            onSelectTool={handleSelectTool}
            showAxis={showAxis}
            showGrid={showGrid}
            onShowAxisChange={setShowAxis}
            onShowGridChange={setShowGrid}
            onUndo={handleUndo}
            canUndo={canUndo}
            onRedo={handleRedo}
            canRedo={canRedo}
            onClose={onClose}
            isDark={isDark}
            isMobile
            drawerOpen={drawerOpen}
            onDrawerClose={() => setDrawerOpen(false)}
            chordGroup={chordGroup}
            selectedObjectId={selectedObjectId}
            onObjectSelect={handleObjectSelect}
          />
        )}
      </>
    );
  },
);
