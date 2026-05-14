'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { renderLatexToSvg } from './renderLatexToSvg';

interface Props {
  x: number;
  y: number;
  initialValue: string;
  onInsert: (svgString: string, src: string, displayMode: boolean) => void;
  onClose: () => void;
}

const DEBOUNCE_MS = 100;

export const LatexEditorPopover: React.FC<Props> = ({ x, y, initialValue, onInsert, onClose }) => {
  const [value, setValue] = useState(initialValue);
  const [displayMode, setDisplayMode] = useState(false);
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const svg = await renderLatexToSvg(value, displayMode);
        setPreviewSvg(svg);
        setError(null);
      } catch (err) {
        setPreviewSvg(null);
        setError((err as Error).message);
      }
    }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, displayMode]);

  const handleInsert = useCallback(() => {
    if (!previewSvg) return;
    onInsert(previewSvg, value, displayMode);
  }, [previewSvg, value, displayMode, onInsert]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInsert(); }
  }, [onClose, handleInsert]);

  return (
    <div
      style={{ position: 'absolute', top: y, left: x, zIndex: 50 }}
      className="w-56 bg-white border border-gray-300 rounded shadow-lg"
      role="dialog"
      aria-label="Nhập công thức LaTeX"
    >
      <div className="px-2 py-1 bg-gray-100 border-b text-xs font-semibold">∑ Nhập LaTeX</div>
      <div className="p-2 space-y-2">
        <input
          type="text"
          role="textbox"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Vd: \frac{a^2+b^2}{c}"
          className="w-full px-1 py-1 text-xs border rounded font-mono"
          autoFocus
        />
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={displayMode} onChange={(e) => setDisplayMode(e.target.checked)} />
          Block math
        </label>
        <div className={`p-2 border rounded text-center min-h-[40px] flex items-center justify-center ${error ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 bg-gray-50'}`}>
          {error
            ? <span className="text-xs">Lỗi: {error.slice(0, 60)}</span>
            : previewSvg
              ? <span dangerouslySetInnerHTML={{ __html: previewSvg }} />
              : <span className="text-gray-400 text-xs">(xem trước)</span>}
        </div>
        <div className="flex gap-1 justify-end">
          <button onClick={onClose} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">Huỷ</button>
          <button
            onClick={handleInsert}
            disabled={!previewSvg || !!error}
            className="px-2 py-1 text-xs bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 rounded"
          >
            Chèn
          </button>
        </div>
      </div>
    </div>
  );
};
