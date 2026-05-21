'use client';
import * as React from 'react';
import {
  DEFAULT_VIEW3D,
  GROUND_PLANE_ATTRS,
  GROUND_PLANE_RANGE,
  VIEW3D_ATTRS,
  paletteFor,
} from './theme';
import { attachJxgWheelZoom } from '../../shared/attachJxgWheelZoom';
import { initJxgBoard } from '../../shared/initJxgBoard';

// JSXGraph board / view types are not published — use minimal local shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgBoard = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgView3D = any;

export interface MiniBoard3DProps {
  isDark: boolean;
  onView3DReady?: (view: JxgView3D, board: JxgBoard) => void;
  onPointerClick?: (screen: { x: number; y: number }) => void;
  onPointerMove?: (screen: { x: number; y: number }) => void;
  onPointerLeave?: () => void;
  /**
   * Called on pointerdown. Return true to switch the upcoming drag from the
   * default view-rotate mode into a delegated point-drag (passed to
   * onPointerDrag / onPointerDragEnd). The screen coord is in user-space.
   */
  shouldStartPointDrag?: (screen: { x: number; y: number }) => boolean;
  onPointerDrag?: (screen: { x: number; y: number }) => void;
  /**
   * Called at the end of a point-drag gesture (also invoked defensively on
   * pointerleave during an in-flight drag). The screen coord is in user-space.
   * Consumers that only need a "drag ended" notification may ignore the arg.
   */
  onPointerDragEnd?: (screen: { x: number; y: number }) => void;
  /**
   * Called on pointermove (khi không đang drag) để biết có hover object không.
   * Return true → cursor đổi 'pointer'; false → cursor reset về ''. Apply mọi
   * tool — báo hiệu "object click/drag được".
   */
  isHoveringObject?: (screen: { x: number; y: number }) => boolean;
}

export interface MiniBoard3DHandle {
  getBoard: () => JxgBoard | null;
  getView3D: () => JxgView3D | null;
  /** Returns the current SVG element of the board for export. */
  getSvgElement: () => SVGSVGElement | null;
}

export const MiniBoard3D = React.forwardRef<MiniBoard3DHandle, MiniBoard3DProps>(
  function MiniBoard3D(props, ref) {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const boardRef = React.useRef<JxgBoard | null>(null);
    const viewRef = React.useRef<JxgView3D | null>(null);
    const {
      isDark,
      onView3DReady,
      onPointerClick,
      onPointerMove,
      onPointerLeave,
      shouldStartPointDrag,
      onPointerDrag,
      onPointerDragEnd,
      isHoveringObject,
    } = props;

    // Keep latest callback refs stable across re-renders so the init effect
    // doesn't have to re-run when handlers change.
    const onView3DReadyRef = React.useRef(onView3DReady);
    const onPointerClickRef = React.useRef(onPointerClick);
    const onPointerMoveRef = React.useRef(onPointerMove);
    const onPointerLeaveRef = React.useRef(onPointerLeave);
    const shouldStartPointDragRef = React.useRef(shouldStartPointDrag);
    const onPointerDragRef = React.useRef(onPointerDrag);
    const onPointerDragEndRef = React.useRef(onPointerDragEnd);
    const isHoveringObjectRef = React.useRef(isHoveringObject);
    onView3DReadyRef.current = onView3DReady;
    onPointerClickRef.current = onPointerClick;
    onPointerMoveRef.current = onPointerMove;
    onPointerLeaveRef.current = onPointerLeave;
    shouldStartPointDragRef.current = shouldStartPointDrag;
    onPointerDragRef.current = onPointerDrag;
    onPointerDragEndRef.current = onPointerDragEnd;
    isHoveringObjectRef.current = isHoveringObject;

    React.useImperativeHandle(
      ref,
      () => ({
        getBoard: () => boardRef.current,
        getView3D: () => viewRef.current,
        getSvgElement: () => containerRef.current?.querySelector('svg') ?? null,
      }),
      [],
    );

    React.useEffect(() => {
      const div = containerRef.current;
      if (!div) return;
      let cancelled = false;
      let board: JxgBoard | null = null;
      let svgEl: SVGSVGElement | null = null;
      let handlePointerDown: ((e: PointerEvent) => void) | null = null;
      let handlePointerMove: ((e: PointerEvent) => void) | null = null;
      let handlePointerUp: ((e: PointerEvent) => void) | null = null;
      let handlePointerLeave: (() => void) | null = null;
      let wheelCleanup: (() => void) | null = null;
      let freeBoard: (() => void) | null = null;

      void (async () => {
        let initResult;
        try {
          initResult = await initJxgBoard(div, {
            label: 'MiniBoard.3d',
            defaults: { disableElementHighlight: true },
            boardOptions: {
              boundingbox: [-6, 6, 6, -6],
              keepaspectratio: true,
              axis: false,
              showCopyright: false,
              showNavigation: false,
              renderer: 'svg',
              // Wheel zoom được tự xử lý bằng Ctrl/Cmd + wheel ở dưới (Excalidraw-style).
              zoom: { wheel: false },
            },
          });
        } catch {
          return;
        }
        if (cancelled || !containerRef.current) { initResult.cleanup(); return; }
        board = initResult.board;
        freeBoard = initResult.cleanup;
        if (cancelled || !board) return;
        boardRef.current = board;

        // Ctrl/Cmd + wheel zoom: cuộn lên phóng to, cuộn xuống thu nhỏ. Không
        // có modifier thì để page scroll bình thường.
        wheelCleanup = attachJxgWheelZoom(div, board, 'MiniBoard.3d');

        let view: JxgView3D | null = null;
        try {
          const baseAttrs = VIEW3D_ATTRS(isDark);
          view = board.create(
            'view3d',
            [
              [-5, -5],
              [10, 10],
              [
                [DEFAULT_VIEW3D.bbox3D[0], DEFAULT_VIEW3D.bbox3D[3]],
                [DEFAULT_VIEW3D.bbox3D[1], DEFAULT_VIEW3D.bbox3D[4]],
                [DEFAULT_VIEW3D.bbox3D[2], DEFAULT_VIEW3D.bbox3D[5]],
              ],
            ],
            {
              ...baseAttrs,
              // JSXGraph view3d đọc giá trị khởi tạo từ az.slider.start (không
              // phải az.value). Pass nhầm `value` → JSXGraph dùng default
              // 1.0/0.3, khiến DEFAULT_VIEW3D bị bỏ qua.
              az: { ...baseAttrs.az, slider: { ...baseAttrs.az.slider, start: DEFAULT_VIEW3D.azimuth } },
              el: { ...baseAttrs.el, slider: { ...baseAttrs.el.slider, start: DEFAULT_VIEW3D.elevation } },
            },
          );
        } catch {
          /* ignore — mock or jsdom limitation */
        }
        viewRef.current = view;
        if (view) {
          // GeoGebra-style XY ground plane through origin (z=0), drawn behind
          // any user-created geometry. View3D's built-in zPlaneRear sits at the
          // bbox floor (z=zMin), not at the axes — so we draw an explicit one.
          try {
            (view as { create: (k: string, p: unknown[], a: unknown) => unknown }).create(
              'plane3d',
              [
                [0, 0, 0],
                [1, 0, 0],
                [0, 1, 0],
                GROUND_PLANE_RANGE,
                GROUND_PLANE_RANGE,
              ],
              GROUND_PLANE_ATTRS(isDark),
            );
          } catch {
            /* swallow — older JSXGraph or mock may not support 5-arg plane3d */
          }
          onView3DReadyRef.current?.(view, board);
        }

        svgEl = (containerRef.current?.querySelector('svg') ?? null) as SVGSVGElement | null;
        if (svgEl) {
          const p = paletteFor(isDark);
          svgEl.style.background = p.view3dBg;

          // Convert browser pixel coords to JSXGraph user-space coords so that
          // hitTest math (which compares against view.project3DTo2D output, also
          // in user-space) is in the same coordinate system.
          const pixelToUser = (e: PointerEvent): { x: number; y: number } => {
            const rect = svgEl!.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const b = board as any;
            if (!b || !b.origin || !b.origin.scrCoords) {
              return { x: px, y: py };
            }
            const ox = b.origin.scrCoords[1];
            const oy = b.origin.scrCoords[2];
            const ux = b.unitX || 1;
            const uy = b.unitY || 1;
            return { x: (px - ox) / ux, y: (oy - py) / uy };
          };
          // Drag-to-rotate: track pointerdown start; if pointer travels past
          // DRAG_THRESHOLD before pointerup → rotate az/el and suppress click.
          const DRAG_THRESHOLD = 4;
          const AZ_PER_PX = 0.01;
          const EL_PER_PX = 0.01;
          const EL_LIMIT = Math.PI / 2 - 0.05;
          let dragStart: { x: number; y: number } | null = null;
          let dragging = false;
          let pointDragMode = false;
          let startAz = 0;
          let startEl = 0;
          const readAng = (s: { Value?: () => number; value?: number } | undefined): number => {
            if (!s) return 0;
            if (typeof s.Value === 'function') {
              try { return s.Value(); } catch { /* fallthrough */ }
            }
            return typeof s.value === 'number' ? s.value : 0;
          };
          const setAng = (
            s: { setValue?: (v: number) => void; value?: number } | undefined,
            v: number,
          ): void => {
            if (!s) return;
            if (typeof s.setValue === 'function') {
              try { s.setValue(v); return; } catch { /* fallthrough */ }
            }
            s.value = v;
          };

          handlePointerDown = (e: PointerEvent) => {
            if (!svgEl) return;
            dragStart = { x: e.clientX, y: e.clientY };
            dragging = false;
            pointDragMode = false;
            // If the consumer claims this drag (e.g. cursor is over an existing
            // point), enter point-drag mode and skip view-rotation.
            const screen = pixelToUser(e);
            try {
              pointDragMode = shouldStartPointDragRef.current?.(screen) ?? false;
            } catch { pointDragMode = false; }
            if (!pointDragMode) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const v = viewRef.current as any;
              startAz = readAng(v?.az_slide ?? v?.az);
              startEl = readAng(v?.el_slide ?? v?.el);
            }
            try { svgEl.setPointerCapture?.(e.pointerId); } catch { /* ignore */ }
          };
          handlePointerMove = (e: PointerEvent) => {
            if (!svgEl) return;
            if (dragStart) {
              const dx = e.clientX - dragStart.x;
              const dy = e.clientY - dragStart.y;
              if (!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) dragging = true;
              if (dragging) {
                if (pointDragMode) {
                  onPointerDragRef.current?.(pixelToUser(e));
                  return;
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const v = viewRef.current as any;
                const newAz = startAz + dx * AZ_PER_PX;
                let newEl = startEl - dy * EL_PER_PX;
                if (newEl > EL_LIMIT) newEl = EL_LIMIT;
                if (newEl < -EL_LIMIT) newEl = -EL_LIMIT;
                setAng(v?.az_slide ?? v?.az, newAz);
                setAng(v?.el_slide ?? v?.el, newEl);
                try { v?.board?.update?.(); } catch { /* ignore */ }
                return;
              }
            }
            const screen = pixelToUser(e);
            onPointerMoveRef.current?.(screen);
            // Hover cursor: pointer khi hover object (point/edge/...). Apply
            // mọi tool — báo hiệu draggable/clickable. Khi đang drag thì skip
            // (dragging branch ở trên đã return sớm).
            const hovering = isHoveringObjectRef.current?.(screen) ?? false;
            svgEl.style.cursor = hovering ? 'pointer' : '';
          };
          handlePointerUp = (e: PointerEvent) => {
            if (!svgEl) return;
            const wasDrag = dragging;
            const hadDown = dragStart !== null;
            const wasPointDrag = pointDragMode;
            dragStart = null;
            dragging = false;
            pointDragMode = false;
            try { svgEl.releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }
            // When the consumer claimed the gesture (pointDragMode), it owns
            // both placement and finalisation. Always run onPointerDragEnd so
            // any consumer-side refs are cleared (and an undo checkpoint can
            // be pushed), and SKIP onPointerClick to avoid double-handling
            // (e.g. Point-tool place-and-lift creates the point in
            // shouldStartPointDrag; we mustn't also fire the
            // click→consumeHit→buildPoint path).
            if (hadDown && wasPointDrag) {
              onPointerDragEndRef.current?.(pixelToUser(e));
              return;
            }
            if (hadDown && !wasDrag) {
              onPointerClickRef.current?.(pixelToUser(e));
            }
          };
          handlePointerLeave = () => {
            if (pointDragMode) {
              // Best-effort cleanup so a stray pointerleave during a drag
              // doesn't leak the consumer's draggedPointRef.
              try { onPointerDragEndRef.current?.({ x: 0, y: 0 }); } catch { /* ignore */ }
            }
            dragStart = null;
            dragging = false;
            pointDragMode = false;
            onPointerLeaveRef.current?.();
          };
          svgEl.addEventListener('pointerdown', handlePointerDown);
          svgEl.addEventListener('pointermove', handlePointerMove);
          svgEl.addEventListener('pointerup', handlePointerUp);
          svgEl.addEventListener('pointercancel', handlePointerUp);
          svgEl.addEventListener('pointerleave', handlePointerLeave);
        }
      })();

      return () => {
        cancelled = true;
        if (wheelCleanup) {
          wheelCleanup();
          wheelCleanup = null;
        }
        if (svgEl) {
          if (handlePointerDown) svgEl.removeEventListener('pointerdown', handlePointerDown);
          if (handlePointerMove) svgEl.removeEventListener('pointermove', handlePointerMove);
          if (handlePointerUp) {
            svgEl.removeEventListener('pointerup', handlePointerUp);
            svgEl.removeEventListener('pointercancel', handlePointerUp);
          }
          if (handlePointerLeave) svgEl.removeEventListener('pointerleave', handlePointerLeave);
        }
        if (freeBoard) { freeBoard(); freeBoard = null; }
        boardRef.current = null;
        viewRef.current = null;
      };
    }, [isDark]);

    const p = paletteFor(isDark);

    return (
      <div
        data-testid="mini-board-3d"
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 400,
          background: p.view3dBg,
          position: 'relative',
          // Clip JSXGraph mesh3d paths projecting outside the container.
          overflow: 'hidden',
        }}
      />
    );
  },
);
