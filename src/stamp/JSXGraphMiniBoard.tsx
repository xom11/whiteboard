'use client';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { deserializeIntoBoard, type SerializedBoard, type SerializedElement } from './serializeBoard';

type MiniTool = 'select' | 'point' | 'segment' | 'line' | 'circle' | 'delete';

export interface MiniBoardHandle {
  getContainer: () => HTMLDivElement | null;
  getCreationLog: () => SerializedElement[];
  getBbox: () => [number, number, number, number];
}

interface Props {
  onReady: (handle: MiniBoardHandle) => void;
  initialState: SerializedBoard | null;
}

const TOOLS: Array<{ key: MiniTool; label: string }> = [
  { key: 'select', label: 'Chọn' },
  { key: 'point', label: 'Điểm' },
  { key: 'segment', label: 'Đoạn' },
  { key: 'line', label: 'Đường thẳng' },
  { key: 'circle', label: 'Đường tròn' },
  { key: 'delete', label: 'Xoá đối tượng' },
];

export const JSXGraphMiniBoard: React.FC<Props> = ({ onReady, initialState }) => {
  const containerId = useId().replace(/:/g, '_') + '_jxgmini';
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boardRef = useRef<any>(null);
  const creationLogRef = useRef<SerializedElement[]>([]);
  const pendingPointsRef = useRef<string[]>([]);
  const [tool, setTool] = useState<MiniTool>('select');
  const toolRef = useRef<MiniTool>('select');
  toolRef.current = tool;

  const labelIdxRef = useRef(0);
  const nextLabel = useCallback(() => {
    const code = 'A'.charCodeAt(0) + (labelIdxRef.current % 26);
    const suffix = labelIdxRef.current >= 26 ? String(Math.floor(labelIdxRef.current / 26)) : '';
    labelIdxRef.current += 1;
    return String.fromCharCode(code) + suffix;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    let cancelled = false;
    (async () => {
      const JXG = (await import('jsxgraph')).default;
      if (cancelled || !containerRef.current) return;
      const board = JXG.JSXGraph.initBoard(containerId, {
        boundingbox: initialState?.bbox ?? [-10, 10, 10, -10],
        axis: true,
        grid: true,
        showCopyright: false,
        showNavigation: true,
        keepAspectRatio: false,
        pan: { enabled: true, needShift: false },
        zoom: { wheel: true },
      });
      boardRef.current = board;

      if (initialState && initialState.elements.length > 0) {
        deserializeIntoBoard(board, initialState);
        creationLogRef.current = [...initialState.elements];
        labelIdxRef.current = initialState.elements.filter(e => e.type === 'point').length;
      }

      board.on('down', (e: MouseEvent | TouchEvent) => {
        if (!boardRef.current) return;
        const t = toolRef.current;
        if (t === 'select' || t === 'delete') return;
        const coords = boardRef.current.getUsrCoordsOfMouse(e);
        const x = coords[0];
        const y = coords[1];

        if (t === 'point') {
          const id = 'j' + creationLogRef.current.length;
          const name = nextLabel();
          const attrs = { name, color: '#000', size: 3 };
          boardRef.current.create('point', [x, y], attrs);
          creationLogRef.current.push({ type: 'point', args: [x, y], attrs, id });
        } else if (t === 'segment' || t === 'line') {
          const id = 'j' + creationLogRef.current.length;
          const name = nextLabel();
          const ptAttrs = { name, color: '#000', size: 3 };
          boardRef.current.create('point', [x, y], ptAttrs);
          creationLogRef.current.push({ type: 'point', args: [x, y], attrs: ptAttrs, id });
          pendingPointsRef.current.push(id);
          if (pendingPointsRef.current.length === 2) {
            const a = pendingPointsRef.current[0];
            const b = pendingPointsRef.current[1];
            const sId = 'j' + creationLogRef.current.length;
            const sAttrs = { color: '#000', strokeWidth: 2 };
            boardRef.current.create(t, [a, b], sAttrs);
            creationLogRef.current.push({ type: t, args: [a, b], attrs: sAttrs, id: sId });
            pendingPointsRef.current = [];
          }
        } else if (t === 'circle') {
          const id = 'j' + creationLogRef.current.length;
          const name = nextLabel();
          const ptAttrs = { name, color: '#000', size: 3 };
          boardRef.current.create('point', [x, y], ptAttrs);
          creationLogRef.current.push({ type: 'point', args: [x, y], attrs: ptAttrs, id });
          pendingPointsRef.current.push(id);
          if (pendingPointsRef.current.length === 2) {
            const center = pendingPointsRef.current[0];
            const on = pendingPointsRef.current[1];
            const cId = 'j' + creationLogRef.current.length;
            const cAttrs = { color: '#000', strokeWidth: 2 };
            boardRef.current.create('circle', [center, on], cAttrs);
            creationLogRef.current.push({ type: 'circle', args: [center, on], attrs: cAttrs, id: cId });
            pendingPointsRef.current = [];
          }
        }
      });

      onReady({
        getContainer: () => containerRef.current,
        getCreationLog: () => [...creationLogRef.current],
        getBbox: () => boardRef.current ? boardRef.current.getBoundingBox() : [-10, 10, 10, -10],
      });
    })();
    return () => {
      cancelled = true;
      if (boardRef.current) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).JXG?.JSXGraph?.freeBoard?.(boardRef.current);
        } catch {
          /* ignore */
        }
        boardRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId]);

  const handleToolChange = useCallback((t: MiniTool) => {
    pendingPointsRef.current = [];
    setTool(t);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50">
        {TOOLS.map(t => (
          <button
            key={t.key}
            type="button"
            aria-label={t.label}
            aria-pressed={tool === t.key}
            onClick={() => handleToolChange(t.key)}
            className={`px-2 py-1 text-xs rounded ${tool === t.key ? 'bg-emerald-500 text-white' : 'bg-white hover:bg-gray-100 border'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        ref={containerRef}
        id={containerId}
        data-testid="jxgmini-container"
        className="flex-1 bg-white"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
};
