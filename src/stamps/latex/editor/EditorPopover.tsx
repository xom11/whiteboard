'use client';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { renderLatexToSvg } from '../render';

interface Props {
  /**
   * Legacy: vị trí absolute x/y nếu cần (test). Khi cả 2 = 0 và `centered` !== false,
   * popover sẽ tự center floating ở giữa khu vực bảng. Khi `withLeftPanel` = true,
   * vị trí center được offset 120px để chừa chỗ panel trái.
   */
  x: number;
  y: number;
  initialValue: string;
  onInsert: (svgString: string, src: string, displayMode: boolean) => void;
  onClose: () => void;
  /** Khi controlled từ parent (StampLeftPanel), parent set giá trị này. */
  displayMode?: boolean;
  onDisplayModeChange?: (b: boolean) => void;
  /** Khi true, position center offset cho panel trái. */
  withLeftPanel?: boolean;
  /** Mobile mode: full-screen + hamburger header. */
  isMobile?: boolean;
  /** Trigger mở snippet drawer trên mobile. */
  onOpenDrawer?: () => void;
}

export interface EditorPopoverHandle {
  /** Chèn snippet vào vị trí con trỏ trong textbox. */
  insertAtCursor: (snippet: string) => void;
  /** Có content hợp lệ để chèn không (input không rỗng + preview ok). */
  hasContent: () => boolean;
  /** Trigger insert programmatically — return true nếu chèn thành công. */
  tryInsert: () => boolean;
}

const DEBOUNCE_MS = 100;

export const EditorPopover = forwardRef<EditorPopoverHandle, Props>(function EditorPopover(
  {
    x,
    y,
    initialValue,
    onInsert,
    onClose,
    displayMode: controlledDisplayMode,
    onDisplayModeChange,
    withLeftPanel = false,
    isMobile = false,
    onOpenDrawer,
  },
  ref,
) {
  const [value, setValue] = useState(initialValue);
  const [internalDisplayMode] = useState(false);
  const displayMode = controlledDisplayMode ?? internalDisplayMode;
  // onDisplayModeChange chỉ dùng khi controlled từ parent — không cần local setter
  void onDisplayModeChange;

  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, displayMode]);

  const handleInsert = useCallback(() => {
    if (!previewSvg) return;
    onInsert(previewSvg, value, displayMode);
  }, [previewSvg, value, displayMode, onInsert]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleInsert();
      }
    },
    [onClose, handleInsert],
  );

  // Imperative API: snippet button trong panel trái gọi vào, click-outside auto-insert.
  useImperativeHandle(
    ref,
    () => ({
      insertAtCursor: (snippet: string) => {
        const el = inputRef.current;
        if (!el) {
          setValue((v) => v + snippet);
          return;
        }
        const start = el.selectionStart ?? value.length;
        const end = el.selectionEnd ?? value.length;
        const next = value.slice(0, start) + snippet + value.slice(end);
        setValue(next);
        requestAnimationFrame(() => {
          el.focus();
          const pos = start + snippet.length;
          try {
            el.setSelectionRange(pos, pos);
          } catch {
            /* ignore */
          }
        });
      },
      hasContent: () => value.trim().length > 0 && !!previewSvg && !error,
      tryInsert: () => {
        if (!previewSvg || error || !value.trim()) return false;
        onInsert(previewSvg, value, displayMode);
        return true;
      },
    }),
    [value, previewSvg, error, displayMode, onInsert],
  );

  // Position: nếu x/y > 0 → dùng legacy absolute (cho tests cũ). Còn không thì center floating.
  const isLegacyPosition = x > 0 || y > 0;
  const wrapperStyle: React.CSSProperties = isMobile
    ? { position: 'fixed', inset: 0, zIndex: 50 }
    : isLegacyPosition
      ? { position: 'absolute', top: y, left: x, zIndex: 50 }
      : {
          position: 'absolute',
          top: '50%',
          left: withLeftPanel ? 'calc(50% + 120px)' : '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 50,
        };

  return (
    <div
      style={wrapperStyle}
      data-stamp-area="true"
      data-mobile-editor={isMobile ? 'true' : undefined}
      className={
        isMobile
          ? 'flex h-full w-full flex-col bg-white'
          : 'w-[420px] max-w-[calc(100vw-280px)] rounded-lg border border-slate-300 bg-white shadow-2xl ring-1 ring-black/5'
      }
      role="dialog"
      aria-label="Nhập công thức LaTeX"
    >
      <header className={`flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2 text-white${isMobile ? '' : ' rounded-t-lg'}`}>
        {isMobile && (
          <button
            type="button"
            onClick={onOpenDrawer}
            aria-label="Mở ngăn snippet"
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
          <span className="text-base leading-none">∑</span>
          Công thức LaTeX
        </h3>
        {isMobile && (
          <button
            type="button"
            onClick={handleInsert}
            disabled={!previewSvg || !!error}
            data-testid="latex-insert-btn-mobile"
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </header>
      <div className={`space-y-2 p-3${isMobile ? ' flex min-h-0 flex-1 flex-col' : ''}`}>
        <input
          ref={inputRef}
          type="text"
          role="textbox"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Vd: \frac{a^2+b^2}{c}"
          className={`w-full rounded border border-slate-300 px-2 py-1.5 font-mono outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200${
            isMobile ? ' min-h-[44px] text-base' : ' text-sm'
          }`}
          autoFocus
        />
        <div
          className={[
            'flex items-center justify-center rounded border p-3 text-center',
            isMobile ? 'min-h-0 flex-1 overflow-auto' : 'min-h-[64px]',
            error ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50',
          ].join(' ')}
        >
          {error ? (
            <span className="text-xs">Lỗi: {error.slice(0, 80)}</span>
          ) : previewSvg ? (
            <span dangerouslySetInnerHTML={{ __html: previewSvg }} />
          ) : (
            <span className="text-xs text-slate-400">(xem trước)</span>
          )}
        </div>
        {!isMobile && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {displayMode ? 'Block' : 'Inline'} · Enter để chèn
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Huỷ
              </button>
              <button
                onClick={handleInsert}
                disabled={!previewSvg || !!error}
                className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                Chèn
              </button>
            </div>
          </div>
        )}
        {isMobile && (
          <div className="text-center text-[11px] text-slate-500">
            {displayMode ? 'Block' : 'Inline'} · Bấm Chèn ở thanh trên
          </div>
        )}
      </div>
    </div>
  );
});

// Back-compat aliases
export { EditorPopover as LatexEditorPopover };
export type { EditorPopoverHandle as LatexEditorHandle };
