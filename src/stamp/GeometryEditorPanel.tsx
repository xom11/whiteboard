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
      const serialized = serializeBoard(
        { getBoundingBox: () => bbox, create: () => undefined },
        log,
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
      className="absolute top-0 right-0 h-full w-2/5 min-w-[320px] max-w-[600px] bg-white border-l shadow-xl z-40 flex flex-col"
    >
      <header className="flex items-center justify-between p-2 bg-gray-100 border-b">
        <h3 className="text-sm font-semibold">📐 Dựng hình học</h3>
        <button onClick={onClose} aria-label="Đóng" className="text-gray-500 hover:text-gray-900">✕</button>
      </header>
      <div className="flex-1 min-h-0">
        <JSXGraphMiniBoard onReady={handleReady} initialState={initialState} />
      </div>
      <footer className="flex justify-end gap-2 p-2 border-t bg-gray-50">
        <button onClick={onClose} className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded">Huỷ</button>
        <button
          onClick={handleInsert}
          disabled={!ready}
          className="px-3 py-1 text-xs bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 rounded"
        >
          Chèn
        </button>
      </footer>
    </aside>
  );
};
