'use client';
import React, { useCallback, useRef, useState } from 'react';
import { JSXGraphMiniBoard, type MiniBoardHandle } from './JSXGraphMiniBoard';
import { serializeBoard, type SerializedBoard } from './serializeBoard';
import { renderGeometryToSvg } from './renderGeometryToSvg';

interface Props {
  initialState: SerializedBoard | null;
  onInsert: (jsonState: string, svgString: string) => void;
  onClose: () => void;
}

export const GeometryEditorPanel: React.FC<Props> = ({ initialState, onInsert, onClose }) => {
  const handleRef = useRef<MiniBoardHandle | null>(null);
  const [ready, setReady] = useState(false);

  const handleReady = useCallback((h: MiniBoardHandle) => {
    handleRef.current = h;
    setReady(true);
  }, []);

  const handleInsert = useCallback(() => {
    if (!handleRef.current) return;
    const container = handleRef.current.getContainer();
    if (!container) return;
    try {
      const svgString = renderGeometryToSvg(container);
      const log = handleRef.current.getCreationLog();
      const bbox = handleRef.current.getBbox();
      const showAxis = handleRef.current.getShowAxis();
      const showGrid = handleRef.current.getShowGrid();
      const serialized = serializeBoard(
        { getBoundingBox: () => bbox, create: () => undefined },
        log,
        { showAxis, showGrid },
      );
      onInsert(JSON.stringify(serialized), svgString);
    } catch (err) {
      console.error('Geometry insert failed:', err);
    }
  }, [onInsert]);

  return (
    <aside
      role="dialog"
      aria-label="Dựng hình học"
      data-testid="geometry-editor-panel"
      className="absolute top-0 right-0 z-40 flex h-full w-[480px] min-w-[400px] max-w-[640px] flex-col border-l border-slate-200 bg-white shadow-2xl"
    >
      <header className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-white">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3,18 12,3 21,18"/>
            <circle cx="12" cy="3" r="1.5" fill="currentColor"/>
            <circle cx="3" cy="18" r="1.5" fill="currentColor"/>
            <circle cx="21" cy="18" r="1.5" fill="currentColor"/>
          </svg>
          Dựng hình học
        </h3>
        <button onClick={onClose} aria-label="Đóng" className="rounded p-1 hover:bg-white/15 transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
        </button>
      </header>
      <div className="min-h-0 flex-1">
        <JSXGraphMiniBoard onReady={handleReady} initialState={initialState} />
      </div>
      <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2">
        <span className="text-xs text-slate-500">Mẹo: chọn công cụ, click trên bảng để dựng hình.</span>
        <div className="flex gap-2">
          <button onClick={onClose} className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">Huỷ</button>
          <button
            onClick={handleInsert}
            disabled={!ready}
            data-testid="geometry-insert-btn"
            className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Chèn vào bảng
          </button>
        </div>
      </footer>
    </aside>
  );
};
