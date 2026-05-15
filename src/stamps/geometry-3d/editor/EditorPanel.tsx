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
}

export const EditorPanel = forwardRef<EditorPanelHandle, Props>(function EditorPanel(
  { isDark, initial, onInsert, onClose },
  ref,
) {
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

  return (
    <div
      data-testid="geom3d-editor-panel"
      data-stamp-area="true"
      style={{
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
      }}
    >
      <div
        style={{
          display: 'flex',
          padding: '8px 12px',
          borderBottom: '1px solid #eee',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 600 }}>Hình học không gian (3D)</span>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={onClose}>
          Đóng
        </button>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <LeftPanel
          handle={boardHandle}
          onResetView={handleResetView}
          onClose={onClose}
          isDark={isDark}
        />
        <div
          style={{
            position: 'absolute',
            left: 120,
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
