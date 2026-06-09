'use client';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { MiniBoard2D, type MiniBoardHandle, type GeomTool, type ObjectSnapshot, type SelectionStateSnapshot, type TransformPopoverInfo } from './MiniBoard';
import { serializeBoard } from '../serialize';
import { renderGeometrySvgFromState } from '../render';
import { PropertiesPopover } from './PropertiesPopover';
import { MultiPropertiesPopover } from './MultiPropertiesPopover';
import { TransformParamPopover } from './TransformParamPopover';
import { buildObjectSnapshot } from './snapshot';
import { UndoIcon, RedoIcon } from './icons';
import { useEditorState, type State, type Store } from '../../../core/scene';
import { STAMP_PANEL_DESKTOP } from '../../shared/StampLeftPanel/constants';
import { ToastProvider, ToastHost, useToast } from '../../shared/Toast';
import type { GenerateGeometryFigure } from '../../shared/types';
import { AiFigurePrompt } from './AiFigurePrompt';
import { useGeometryDraftEmit } from './useGeometryDraftEmit';

interface Props {
  /** Scene store do Host tạo qua `useStampStore`. View info đã ở store.meta.view. */
  store: Store;
  onInsert: (jsonState: string, svgString: string) => void;
  onClose: () => void;
  /** Khi true, panel position offset left để chừa chỗ cho StampLeftPanel (240px). */
  withLeftPanel?: boolean;
  /** Controlled prop — host owns (Tier 2 F). */
  selectedTool: GeomTool;
  /** Controlled prop — host owns (Tier 2 F). */
  showAxis: boolean;
  /** Controlled prop — host owns (Tier 2 F). */
  showGrid: boolean;
  /** Notify host về canUndo/canRedo qua store subscribe (Tier 2 F). */
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  isDark?: boolean;
  /** Mobile mode: full-screen + hamburger header. */
  isMobile?: boolean;
  /** Click hamburger trên mobile để mở LeftPanel drawer. */
  onOpenDrawer?: () => void;
  /** Mobile header: undo/redo. Bypass LeftPanel để user truy cập nhanh. */
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  /** Báo lên Host khi selection đổi qua action trong editor. */
  onSelectionChange?: (id: string | undefined) => void;
  /** Client-safe bridge to a server-side AI generation call. */
  generateGeometryFigure?: GenerateGeometryFigure;
  /** Excalidraw imperative API — để đọc viewport khi build draft. */
  api?: any;
  /** Phát draft live (debounced) cho consumer. null = clear. */
  onGeometryDraft?: (draft: import('../../shared/draftTypes').GeometryDraftPreview | null) => void;
}

export interface GeometryEditorPanelHandle {
  /** Trigger Chèn programmatically (cho auto-insert khi click outside). */
  insert: () => boolean;
  /** Có nội dung để chèn không? */
  hasContent: () => boolean;
  /** Highlight object theo id từ bên ngoài (ObjectListPanel trong Host). */
  selectObject: (id: string | null) => void;
}

const GeometryEditorPanelInner = forwardRef<GeometryEditorPanelHandle, Props>(
  function GeometryEditorPanelInner(
    {
      store,
      onInsert,
      onClose,
      withLeftPanel = false,
      selectedTool,
      showAxis,
      showGrid,
      onHistoryChange,
      isDark,
      isMobile = false,
      onOpenDrawer,
      onUndo,
      onRedo,
      canUndo,
      canRedo,
      onSelectionChange,
      generateGeometryFigure,
      api,
      onGeometryDraft,
    },
    ref,
  ) {
    const { showToast } = useToast();
    const handleRef = useRef<MiniBoardHandle | null>(null);
    const [ready, setReady] = useState(false);
    const [hasContent, setHasContent] = useState(false);
    const [propsPopover, setPropsPopover] = useState<ObjectSnapshot | null>(null);
    /** Multi-select snapshot — render compact popover khi ids.length > 1. */
    const [multiSelection, setMultiSelection] = useState<SelectionStateSnapshot | null>(null);
    // Handlers emit cả 6 transform tool (rotate/dilate/regularPolygon/translate/
    // reflectLine/reflectPoint); TransformParamPopover chỉ render 3 tool có
    // numeric param — guard ở chỗ render.
    const [transformPopover, setTransformPopover] = useState<TransformPopoverInfo>(null);
    const onSelectionChangeRef = useRef(onSelectionChange);
    useEffect(() => { onSelectionChangeRef.current = onSelectionChange; }, [onSelectionChange]);
    const onGeometryDraftRef = useRef(onGeometryDraft);
    useEffect(() => { onGeometryDraftRef.current = onGeometryDraft; }, [onGeometryDraft]);

    // Tier 2 F — propagate canUndo/canRedo + keyboard shortcuts qua shared hook.
    useEditorState({ store, onHistoryChange });

    // Phát geometry draft (debounced) khi đang dựng hình.
    useGeometryDraftEmit({ store, handleRef, api, showAxis, showGrid, onGeometryDraft });

    // hasContent: track store size để gate Insert button.
    useEffect(() => {
      const sync = () => setHasContent(Object.keys(store.getState().objects).length > 0);
      sync();
      return store.subscribe(sync);
    }, [store]);

    const handleReady = useCallback(() => {
      const h = handleRef.current;
      if (!h) return;
      setReady(true);
      h.onSelect((snap: ObjectSnapshot) => {
        setPropsPopover(snap);
        setMultiSelection(null);
        onSelectionChangeRef.current?.(snap.id);
      });
      h.onTransformParam((info) => setTransformPopover(info));
      // selection-state channel: fire mỗi khi selectedSetRef đổi (click,
      // shift-click, marquee, clearSelection). Derive popover từ size:
      //   0  → ẩn cả 2 popover
      //   1  → single PropertiesPopover (derive ObjectSnapshot từ store)
      //   ≥2 → MultiPropertiesPopover (compact: color + delete)
      h.onSelectionState((snap) => {
        if (!snap || snap.ids.length === 0) {
          setPropsPopover(null);
          setMultiSelection(null);
          onSelectionChangeRef.current?.(undefined);
          return;
        }
        if (snap.ids.length === 1) {
          const id = snap.ids[0];
          const single = buildObjectSnapshot(store.getState(), id, snap.anchor);
          if (single) {
            setPropsPopover(single);
            setMultiSelection(null);
            onSelectionChangeRef.current?.(id);
          }
          return;
        }
        setMultiSelection(snap);
        setPropsPopover(null);
        onSelectionChangeRef.current?.(undefined);
      });
    }, [store]);

    const dismissPropsPopover = useCallback(() => {
      setPropsPopover(null);
      onSelectionChangeRef.current?.(undefined);
    }, []);

    const dismissMultiPopover = useCallback(() => {
      setMultiSelection(null);
      handleRef.current?.clearSelection();
      onSelectionChangeRef.current?.(undefined);
    }, []);

    const applyMultiColor = useCallback((color: string) => {
      const ids = multiSelection?.ids ?? [];
      const h = handleRef.current;
      if (!h) return;
      for (const id of ids) {
        h.mutateObject(id, { attrs: { strokeColor: color, color } });
      }
    }, [multiSelection]);

    const applyMultiDelete = useCallback(() => {
      const ids = multiSelection?.ids ?? [];
      const h = handleRef.current;
      if (!h) return;
      for (const id of ids) {
        h.mutateObject(id, { remove: true });
      }
      h.clearSelection();
      setMultiSelection(null);
      onSelectionChangeRef.current?.(undefined);
    }, [multiSelection]);

    // Build serialized state (format v2) — async vì SVG render offscreen
    // với light palette để Excalidraw filter tự đảo khi dark mode.
    const performInsert = useCallback((): boolean => {
      if (!handleRef.current) return false;
      const h = handleRef.current;
      const state = h.getState();
      if (Object.keys(state.objects).length === 0) return false;
      const bbox = h.getBbox();
      const jsonState = serializeBoard(state, { bbox, showAxis, showGrid });
      // Fire-and-forget. Caller (`tryInsert`) chỉ cần biết có nội dung không.
      void (async () => {
        try {
          const svgString = await renderGeometrySvgFromState(jsonState);
          onInsert(jsonState, svgString);
          onGeometryDraftRef.current?.(null);
        } catch (err) {
          console.error('Geometry insert failed:', err);
        }
      })();
      return true;
    }, [onInsert, showAxis, showGrid]);

    const loadAiFigure = useCallback((generated: State) => {
      handleRef.current?.clearSelection();
      setPropsPopover(null);
      setMultiSelection(null);
      setTransformPopover(null);
      onSelectionChangeRef.current?.(undefined);
      const current = store.getState();
      store.dispatch({
        type: 'LOAD',
        payload: { state: { ...generated, meta: current.meta } },
      });
    }, [store]);

    useImperativeHandle(ref, () => ({
      insert: performInsert,
      hasContent: () => Object.keys(handleRef.current?.getState().objects ?? {}).length > 0,
      selectObject: (id) => handleRef.current?.highlight(id),
    }), [performInsert]);

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
        aria-label="Dựng hình học"
        data-testid="geometry-editor-panel"
        data-stamp-area="true"
        data-mobile-editor={isMobile ? 'true' : undefined}
        style={wrapperStyle}
        className={[
          isDark ? 'theme--dark ' : '',
          'relative flex flex-col overflow-hidden bg-white',
          isMobile
            ? 'h-full w-full'
            : `${STAMP_PANEL_DESKTOP} rounded-lg border border-slate-300 shadow-2xl ring-1 ring-black/5`,
        ].join(' ')}
      >
        <header className="flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-white">
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
              <polygon points="3,18 12,3 21,18" />
              <circle cx="12" cy="3" r="1.5" fill="currentColor" />
              <circle cx="3" cy="18" r="1.5" fill="currentColor" />
              <circle cx="21" cy="18" r="1.5" fill="currentColor" />
            </svg>
            Dựng hình học
          </h3>
          {isMobile && (
            <>
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                aria-label="Hoàn tác"
                title="Hoàn tác (Ctrl/Cmd+Z)"
                data-testid="undo-btn-mobile"
                className="inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15 disabled:opacity-40"
              >
                <UndoIcon />
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                aria-label="Làm lại"
                title="Làm lại (Ctrl/Cmd+Shift+Z)"
                data-testid="redo-btn-mobile"
                className="inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15 disabled:opacity-40"
              >
                <RedoIcon />
              </button>
              <button
                type="button"
                onClick={performInsert}
                disabled={!ready || !hasContent}
                title={!hasContent ? 'Vẽ ít nhất một đối tượng trước khi chèn' : undefined}
                data-testid="geometry-insert-btn-mobile"
                className="rounded bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25 disabled:opacity-50"
              >
                Chèn
              </button>
            </>
          )}
          <button onClick={onClose} aria-label="Đóng" className="inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>
        {generateGeometryFigure && (
          <AiFigurePrompt generator={generateGeometryFigure} onGenerated={loadAiFigure} />
        )}
        <div className="flex min-h-0 flex-1">
          <div className="flex-1">
            <MiniBoard2D
              ref={handleRef}
              store={store}
              selectedTool={selectedTool}
              showAxis={showAxis}
              showGrid={showGrid}
              onReady={handleReady}
              isDark={isDark}
              toast={showToast}
            />
          </div>
        </div>
        {propsPopover && (
          propsPopover.kind === 'point' ? (
            <PropertiesPopover
              kind="point"
              anchor={propsPopover.screenCoords}
              isDark={isDark}
              currentName={propsPopover.name}
              currentColor={propsPopover.color}
              currentDash={propsPopover.dash}
              currentWidth={propsPopover.width}
              currentFace={propsPopover.face}
              currentShowLabel={propsPopover.showLabel}
              getAllNames={() => handleRef.current?.getAllPointNames() ?? []}
              onClose={dismissPropsPopover}
              onMutate={(patch) => {
                handleRef.current?.mutateObject(propsPopover.id, patch);
                if (patch.remove) dismissPropsPopover();
                // Refresh snapshot để UI checkbox phản ánh state mới
                if (typeof patch.valueLabel === 'boolean' || patch.attrs) {
                  setPropsPopover((cur) => cur ? { ...cur, showValue: patch.valueLabel ?? cur.showValue } : cur);
                }
              }}
            />
          ) : (
            <PropertiesPopover
              kind={propsPopover.kind}
              anchor={propsPopover.screenCoords}
              isDark={isDark}
              currentName={propsPopover.name}
              currentColor={propsPopover.color}
              currentDash={propsPopover.dash}
              currentWidth={propsPopover.width}
              currentShowLabel={propsPopover.showLabel}
              currentShowValue={propsPopover.showValue}
              getAllNames={() => handleRef.current?.getAllPointNames() ?? []}
              onClose={dismissPropsPopover}
              onMutate={(patch) => {
                handleRef.current?.mutateObject(propsPopover.id, patch);
                if (patch.remove) dismissPropsPopover();
                if (typeof patch.valueLabel === 'boolean') {
                  setPropsPopover((cur) => cur ? { ...cur, showValue: patch.valueLabel ?? cur.showValue } : cur);
                }
                if (patch.attrs && 'withLabel' in patch.attrs) {
                  setPropsPopover((cur) => cur ? { ...cur, showLabel: !!patch.attrs?.withLabel } : cur);
                }
              }}
            />
          )
        )}

        {multiSelection && multiSelection.ids.length > 1 && (
          <MultiPropertiesPopover
            anchor={multiSelection.anchor}
            count={multiSelection.ids.length}
            isDark={isDark}
            onColor={applyMultiColor}
            onDelete={applyMultiDelete}
            onClose={dismissMultiPopover}
          />
        )}

        {transformPopover && (transformPopover.tool === 'rotate' || transformPopover.tool === 'dilate' || transformPopover.tool === 'regularPolygon' || transformPopover.tool === 'circleCR') && (
          <TransformParamPopover
            kind={transformPopover.tool}
            anchor={transformPopover.anchor}
            defaultValue={
              transformPopover.tool === 'rotate' ? 90
                : transformPopover.tool === 'dilate' ? 2
                : transformPopover.tool === 'circleCR' ? 3
                : 6
            }
            isDark={isDark}
            onConfirm={(v) => { handleRef.current?.confirmTransformParam(v); setTransformPopover(null); }}
            onCancel={() => { handleRef.current?.cancelTransformParam(); setTransformPopover(null); }}
          />
        )}

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
                onClick={performInsert}
                disabled={!ready || !hasContent}
                title={!hasContent ? 'Vẽ ít nhất một đối tượng trước khi chèn' : undefined}
                data-testid="geometry-insert-btn"
                className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                Chèn
              </button>
            </div>
          </footer>
        )}
        <ToastHost />
      </div>
    );
  },
);

export const GeometryEditorPanel = forwardRef<GeometryEditorPanelHandle, Props>(
  function GeometryEditorPanel(props, ref) {
    return (
      <ToastProvider>
        <GeometryEditorPanelInner {...props} ref={ref} />
      </ToastProvider>
    );
  },
);
