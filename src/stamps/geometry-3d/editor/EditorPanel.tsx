'use client';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { MiniBoard3D, type MiniBoard3DHandle } from './MiniBoard3D';
import { LeftPanel } from './LeftPanel';
import type { SerializedBoard3D } from '../serialize';

export interface EditorPanelHandle {
  tryInsert: () => boolean;
  hasContent: () => boolean;
}

interface Props {
  isDark: boolean;
  initial: SerializedBoard3D | null;
  onInsert: (jsonState: string, svgString: string, width: number, height: number) => void;
  onClose: () => void;
  isMobile?: boolean;
}

export const EditorPanel = forwardRef<EditorPanelHandle, Props>(function EditorPanel(
  { isDark, initial, onInsert, onClose, isMobile = false },
  ref,
) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Stable ref to the latest mounted handle so callbacks (tryInsert) read fresh state
  // without triggering re-renders when the handle updates internally.
  const boardRef = useRef<MiniBoard3DHandle | null>(null);
  // Re-render trigger for LeftPanel ONLY when the handle identity changes
  // (mount → handle, unmount → null). Functional-equality guard breaks the
  // ref-callback re-render loop seen with React 19 strict mode.
  const [boardHandle, setBoardHandle] = useState<MiniBoard3DHandle | null>(null);

  const setBoard = useCallback((h: MiniBoard3DHandle | null) => {
    boardRef.current = h;
    setBoardHandle((prev) => (prev === h ? prev : h));
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      tryInsert: () => {
        const board = boardRef.current;
        if (!board) return false;
        const log = board.getCreationLog();
        if (log.length === 0) return false;
        const view = board.getViewState();
        const state: SerializedBoard3D = {
          version: 1,
          bbox: board.getBbox(),
          view,
          showAxes: board.getShowAxes(),
          showMesh: board.getShowMesh(),
          elements: log,
        };
        const snap = board.snapshotSVG();
        onInsert(JSON.stringify(state), snap.svgString, snap.width, snap.height);
        return true;
      },
      hasContent: () => (boardRef.current?.getCreationLog().length ?? 0) > 0,
    }),
    [onInsert],
  );

  const handleResetView = useCallback(() => {
    boardRef.current?.resetView();
  }, []);

  const handleInsert = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const log = board.getCreationLog();
    if (log.length === 0) return;
    const view = board.getViewState();
    const state: SerializedBoard3D = {
      version: 1,
      bbox: board.getBbox(),
      view,
      showAxes: board.getShowAxes(),
      showMesh: board.getShowMesh(),
      elements: log,
    };
    const snap = board.snapshotSVG();
    onInsert(JSON.stringify(state), snap.svgString, snap.width, snap.height);
  }, [onInsert]);

  const wrapperStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        inset: 0,
        background: '#fff',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }
    : {
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 900,
        height: 700,
        background: '#fff',
        boxShadow: '0 6px 32px rgba(0,0,0,0.2)',
        borderRadius: 8,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      };

  return (
    <div
      data-testid="geom3d-editor-panel"
      data-stamp-area="true"
      data-mobile-editor={isMobile ? 'true' : undefined}
      style={wrapperStyle}
      className={isDark ? 'theme--dark' : undefined}
    >
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '8px 12px',
          borderBottom: '1px solid #eee',
          alignItems: 'center',
        }}
      >
        {isMobile && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Mở ngăn công cụ"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 40,
              width: 40,
              border: 0,
              background: 'transparent',
              borderRadius: 6,
              cursor: 'pointer',
              color: 'inherit',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        )}
        <span style={{ fontWeight: 600, flex: 1 }}>Hình học không gian (3D)</span>
        {isMobile && (
          <button
            type="button"
            onClick={handleInsert}
            data-testid="geom3d-insert-btn-mobile"
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 0,
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Chèn
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          style={{
            border: '1px solid #cbd5e1',
            background: '#fff',
            padding: isMobile ? '6px 10px' : '4px 10px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Đóng
        </button>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <LeftPanel
          handle={boardHandle}
          onResetView={handleResetView}
          onClose={onClose}
          isDark={isDark}
          isMobile={isMobile}
          drawerOpen={drawerOpen}
          onDrawerClose={() => setDrawerOpen(false)}
        />
        <div
          style={{
            position: 'absolute',
            left: isMobile ? 0 : 120,
            top: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
          }}
        >
          <MiniBoard3D ref={setBoard} isDark={isDark} initialState={initial} />
        </div>
      </div>
    </div>
  );
});
