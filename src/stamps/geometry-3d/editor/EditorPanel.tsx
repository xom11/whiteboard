'use client';
import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { MiniBoard3D, type MiniBoard3DHandle } from './MiniBoard3D';
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
  /** Mobile mode: full-screen + hamburger header. */
  isMobile?: boolean;
  /** Khi true, panel position offset left để chừa chỗ cho LeftPanel (240px). */
  withLeftPanel?: boolean;
  /** Callback expose board handle ra Host để LeftPanel sibling dùng được. */
  onBoardReady?: (handle: MiniBoard3DHandle | null) => void;
  /** Click hamburger trên mobile để mở LeftPanel drawer. */
  onOpenDrawer?: () => void;
}

export const EditorPanel = forwardRef<EditorPanelHandle, Props>(function EditorPanel(
  { isDark, initial, onInsert, onClose, isMobile = false, withLeftPanel = false, onBoardReady, onOpenDrawer },
  ref,
) {
  const boardRef = useRef<MiniBoard3DHandle | null>(null);
  const [ready, setReady] = useState(false);
  const onBoardReadyRef = useRef(onBoardReady);
  onBoardReadyRef.current = onBoardReady;

  const setBoard = useCallback((h: MiniBoard3DHandle | null) => {
    boardRef.current = h;
    setReady(!!h);
    onBoardReadyRef.current?.(h);
  }, []);

  const performInsert = useCallback((): boolean => {
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
  }, [onInsert]);

  useImperativeHandle(
    ref,
    () => ({
      tryInsert: performInsert,
      hasContent: () => (boardRef.current?.getCreationLog().length ?? 0) > 0,
    }),
    [performInsert],
  );

  const handleInsert = useCallback(() => {
    performInsert();
  }, [performInsert]);

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
      aria-label="Dựng hình học 3D"
      data-testid="geom3d-editor-panel"
      data-stamp-area="true"
      data-mobile-editor={isMobile ? 'true' : undefined}
      style={wrapperStyle}
      className={[
        isDark ? 'theme--dark ' : '',
        'flex flex-col overflow-hidden bg-white',
        isMobile
          ? 'h-full w-full'
          : 'h-[600px] max-h-[85vh] w-[760px] max-w-[calc(100vw-280px)] rounded-lg border border-slate-300 shadow-2xl ring-1 ring-black/5',
      ].join(' ')}
    >
      <header className="flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-2 text-white">
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
            <path d="M4 7 L14 4 L20 7 L14 10 Z M4 7 L4 17 L14 20 L14 10 M14 20 L20 17 L20 7" />
          </svg>
          Hình học không gian (3D)
        </h3>
        {isMobile && (
          <button
            type="button"
            onClick={handleInsert}
            disabled={!ready}
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
        <MiniBoard3D ref={setBoard} isDark={isDark} initialState={initial} />
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
              onClick={handleInsert}
              disabled={!ready}
              data-testid="geom3d-insert-btn"
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              Chèn
            </button>
          </div>
        </footer>
      )}
    </div>
  );
});
