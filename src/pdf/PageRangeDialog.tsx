'use client';
 

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { parsePageRange } from './parseRange';
import { renderAllThumbnails } from './rasterize';

interface Props {
  doc: PDFDocumentProxy;
  fileName: string;
  onConfirm: (pages: number[]) => void;
  onCancel: () => void;
}

interface ThumbInfo {
  dataURL: string;
  width: number;
  height: number;
}

/**
 * Set<number> → chuỗi range compact dạng "1-3,5,7-9".
 * Dùng cho hiển thị + sync ngược về text input khi user click thumbnails.
 */
function serializeSelection(pages: number[]): string {
  if (pages.length === 0) return '';
  const sorted = [...pages].sort((a, b) => a - b);
  const groups: string[] = [];
  let start = sorted[0];
  let prev = start;
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i];
    if (n === prev + 1) {
      prev = n;
    } else {
      groups.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = n;
      prev = n;
    }
  }
  groups.push(start === prev ? `${start}` : `${start}-${prev}`);
  return groups.join(',');
}

/**
 * Modal chọn trang PDF với thumbnail grid.
 *
 * Hai chiều sync:
 *   - Gõ text input → parse → update selectedSet → highlight thumbnails.
 *   - Click thumbnail → toggle pageNum trong selectedSet → re-serialize text.
 *
 * Source of truth: `selectedSet`. Text input là derived view (user-editable).
 * Khi user đang gõ (focus) → giữ raw `inputValue`, không overwrite. Chỉ
 * re-derive text khi click thumbnail HOẶC input mất focus với value valid.
 */
export function PageRangeDialog({ doc, fileName, onConfirm, onCancel }: Props) {
  const totalPages = doc.numPages;
  const defaultPages = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages],
  );

  const [selectedSet, setSelectedSet] = useState<Set<number>>(
    () => new Set(defaultPages),
  );
  const [inputValue, setInputValue] = useState(serializeSelection(defaultPages));
  const [inputError, setInputError] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<number, ThumbInfo>>({});
  const [thumbProgress, setThumbProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ---- Render thumbnails khi mount ----
  useEffect(() => {
    const ctrl = new AbortController();
    void renderAllThumbnails(
      doc,
      (pageNum, dataURL, width, height) => {
        setThumbs((prev) => ({ ...prev, [pageNum]: { dataURL, width, height } }));
        setThumbProgress((prev) => prev + 1);
      },
      { scale: 0.3, quality: 0.7, concurrency: 3, signal: ctrl.signal },
    ).catch((err) => {
      if (ctrl.signal.aborted) return;
      console.warn('[PageRangeDialog] render thumbnails lỗi:', err);
    });
    return () => ctrl.abort();
  }, [doc]);

  // ---- Esc đóng dialog ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [onCancel]);

  // ---- Text input handlers ----
  const handleInputChange = (next: string) => {
    setInputValue(next);
    try {
      const pages = parsePageRange(next, totalPages);
      setInputError(null);
      setSelectedSet(new Set(pages));
    } catch (e) {
      setInputError((e as Error).message);
    }
  };

  // ---- Thumbnail click handler ----
  const toggleThumb = (pageNum: number) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) next.delete(pageNum);
      else next.add(pageNum);
      const serialized = serializeSelection([...next]);
      setInputValue(serialized);
      setInputError(null);
      return next;
    });
  };

  // ---- Quick select helpers ----
  const selectAll = () => {
    setSelectedSet(new Set(defaultPages));
    setInputValue(serializeSelection(defaultPages));
    setInputError(null);
  };

  const clearAll = () => {
    setSelectedSet(new Set());
    setInputValue('');
    setInputError(null);
  };

  const canSubmit = inputError === null && selectedSet.size > 0;
  const sortedSelected = useMemo(
    () => [...selectedSet].sort((a, b) => a - b),
    [selectedSet],
  );

  const handleSubmit = () => {
    if (!canSubmit) return;
    onConfirm(sortedSelected);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-range-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          background: 'var(--popup-bg-color, #fff)',
          color: 'var(--text-primary-color, #1b1b1f)',
          borderRadius: 12,
          padding: '20px 22px',
          width: 'min(880px, 92vw)',
          maxHeight: '88vh',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
          fontFamily: 'inherit',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2
            id="pdf-range-title"
            style={{ margin: 0, fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}
          >
            Chèn PDF
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.7 }}>
            {fileName} — {totalPages} trang
            {thumbProgress < totalPages && (
              <> · đang tải preview {thumbProgress}/{totalPages}…</>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label
              style={{ display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.75 }}
            >
              Trang cần chèn (vd: 1,3,5-10) — hoặc click thumbnail bên dưới
            </label>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 10px',
                fontSize: 14,
                borderRadius: 6,
                border: `1px solid ${inputError ? '#dc2626' : 'rgba(0,0,0,0.2)'}`,
                outline: 'none',
                background: 'var(--input-bg-color, #fff)',
                color: 'inherit',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, paddingTop: 18 }}>
            <button
              type="button"
              onClick={selectAll}
              style={quickBtnStyle}
              title="Chọn tất cả trang"
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={clearAll}
              style={quickBtnStyle}
              title="Bỏ chọn tất cả"
            >
              Bỏ hết
            </button>
          </div>
        </div>

        <div style={{ minHeight: 18, fontSize: 12 }} data-testid="pdf-range-status">
          {inputError ? (
            <span style={{ color: '#dc2626' }}>{inputError}</span>
          ) : (
            <span style={{ opacity: 0.75 }}>
              Đã chọn <strong>{selectedSet.size}</strong> / {totalPages} trang
            </span>
          )}
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 240,
            maxHeight: '60vh',
            overflow: 'auto',
            padding: 8,
            background: 'rgba(0,0,0,0.04)',
            borderRadius: 8,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 10,
            alignContent: 'start',
          }}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
            const thumb = thumbs[pageNum];
            const selected = selectedSet.has(pageNum);
            return (
              <ThumbnailItem
                key={pageNum}
                pageNum={pageNum}
                thumb={thumb}
                selected={selected}
                onToggle={() => toggleThumb(pageNum)}
              />
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            paddingTop: 4,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 14px',
              fontSize: 13,
              borderRadius: 6,
              border: '1px solid rgba(0,0,0,0.15)',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              borderRadius: 6,
              border: 'none',
              background: canSubmit ? '#4f46e5' : 'rgba(0,0,0,0.15)',
              color: '#fff',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontWeight: 500,
            }}
          >
            Chèn {selectedSet.size > 0 ? `${selectedSet.size} trang` : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const quickBtnStyle: React.CSSProperties = {
  padding: '7px 10px',
  fontSize: 12,
  borderRadius: 6,
  border: '1px solid rgba(0,0,0,0.15)',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

interface ThumbProps {
  pageNum: number;
  thumb: ThumbInfo | undefined;
  selected: boolean;
  onToggle: () => void;
}

function ThumbnailItem({ pageNum, thumb, selected, onToggle }: ThumbProps) {
  const aspect = thumb ? thumb.width / thumb.height : 0.77; // A4 portrait default
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={`Trang ${pageNum}${selected ? ' (đã chọn)' : ''}`}
      title={`Trang ${pageNum}`}
      style={{
        position: 'relative',
        padding: 0,
        background: '#fff',
        border: `2px solid ${selected ? '#4f46e5' : 'rgba(0,0,0,0.12)'}`,
        borderRadius: 6,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: selected ? '0 0 0 3px rgba(79,70,229,0.18)' : 'none',
        transition: 'border-color 80ms ease, box-shadow 80ms ease',
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: aspect.toString(),
          background: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {thumb ? (
          <img
            src={thumb.dataURL}
            alt=""
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
            draggable={false}
          />
        ) : (
          <div style={{ fontSize: 11, opacity: 0.5 }}>…</div>
        )}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          left: 4,
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 6px',
          borderRadius: 4,
          background: selected ? '#4f46e5' : 'rgba(0,0,0,0.6)',
          color: '#fff',
        }}
      >
        {pageNum}
      </div>
      {selected && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#4f46e5',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        >
          ✓
        </div>
      )}
    </button>
  );
}
