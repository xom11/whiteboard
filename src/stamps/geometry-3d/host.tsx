'use client';

import type React from 'react';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { EditorPanel, type EditorPanelHandle } from './editor/EditorPanel';
import { insertStampImage } from '../shared/insertImage';
import { useIsMobile } from '../shared/useIsMobile';
import {
  isGeometry3DCustomData,
  parseSerializedBoard3D,
  serializeBoard3D,
  type Geometry3DCustomData,
  type SerializedBoard3D,
} from './serialize';
import type {
  StampHostProps,
  StampHostHandle,
} from '../shared/types';

function parseInitial(
  editingElement: StampHostProps['editingElement'],
): SerializedBoard3D | null {
  if (!editingElement) return null;
  if (!isGeometry3DCustomData(editingElement.customData)) return null;
  try {
    return parseSerializedBoard3D(editingElement.customData.jsonState);
  } catch {
    return null;
  }
}

export const Geometry3DStampHost = forwardRef<StampHostHandle, StampHostProps>(
  function Geometry3DStampHost({ api, editingElement, onClose, isDark }, ref) {
    const editorRef = useRef<EditorPanelHandle | null>(null);
    const { isMobile } = useIsMobile();

    const initial = useMemo(
      () => parseInitial(editingElement),
      [editingElement],
    );

    const performInsert = useCallback(
      async (board: SerializedBoard3D, width: number, height: number, svgString: string) => {
        if (!api) return;
        const jsonState = serializeBoard3D(board);
        await insertStampImage(api, {
          svgString,
          makeCustomData: (): Geometry3DCustomData => ({
            kind: 'geometry3d',
            version: 1,
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
      // Without a renderer yet (Phase 7 stub returns empty elements), skip
      // inserting when the serialized board has no elements — preserves the
      // legacy "no content → return false" semantic.
      if (board.elements.length === 0) return false;
      // SVG capture: best-effort via DOM. Phase 7 will replace stub with real
      // SVG snapshotter; for now we pass empty string + 0 dims.
      void performInsert(board, 0, 0, '');
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

    const wrapperStyle: React.CSSProperties = isMobile
      ? { position: 'fixed', inset: 0, zIndex: 40 }
      : {
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 40,
        };

    return (
      <div
        role="dialog"
        aria-label="Dựng hình học 3D"
        data-testid="geom3d-host"
        data-stamp-area="true"
        style={wrapperStyle}
        className={[
          isDark ? 'theme--dark ' : '',
          'flex flex-col overflow-hidden bg-white',
          isMobile
            ? 'h-full w-full'
            : 'h-[600px] max-h-[85vh] w-[1040px] max-w-[calc(100vw-80px)] rounded-lg border border-slate-300 shadow-2xl ring-1 ring-black/5',
        ].join(' ')}
      >
        <header className="flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-2 text-white">
          <h3 className="flex flex-1 items-center gap-2 text-sm font-semibold">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7 L14 4 L20 7 L14 10 Z M4 7 L4 17 L14 20 L14 10 M14 20 L20 17 L20 7" />
            </svg>
            Hình học không gian (3D)
          </h3>
          <button
            type="button"
            onClick={tryInsert}
            data-testid="geom3d-insert-btn"
            className="rounded bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25"
          >
            Chèn
          </button>
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
            onClose={onClose}
          />
        </div>
      </div>
    );
  },
);
