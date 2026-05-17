'use client';
import * as React from 'react';
import { DEFAULT_VIEW3D, VIEW3D_ATTRS, paletteFor } from './theme';

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
  onPointerDragEnd?: () => void;
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
    const { isDark, onView3DReady, onPointerClick, onPointerMove, onPointerLeave, onPointerDragEnd } = props;

    // Keep latest callback refs stable across re-renders so the init effect
    // doesn't have to re-run when handlers change.
    const onView3DReadyRef = React.useRef(onView3DReady);
    const onPointerClickRef = React.useRef(onPointerClick);
    const onPointerMoveRef = React.useRef(onPointerMove);
    const onPointerLeaveRef = React.useRef(onPointerLeave);
    const onPointerDragEndRef = React.useRef(onPointerDragEnd);
    onView3DReadyRef.current = onView3DReady;
    onPointerClickRef.current = onPointerClick;
    onPointerMoveRef.current = onPointerMove;
    onPointerLeaveRef.current = onPointerLeave;
    onPointerDragEndRef.current = onPointerDragEnd;

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let JXG: any = null;
      let board: JxgBoard | null = null;
      let svgEl: SVGSVGElement | null = null;
      let handlePointerDown: ((e: PointerEvent) => void) | null = null;
      let handlePointerMove: ((e: PointerEvent) => void) | null = null;
      let handlePointerLeave: (() => void) | null = null;
      let handlePointerUp: (() => void) | null = null;

      void (async () => {
        try {
          JXG = (await import('jsxgraph')).default;
        } catch {
          return;
        }
        if (cancelled || !containerRef.current) return;
        try {
          JXG.Options.text.display = 'internal';
        } catch {
          /* ignore option set error in some mocks */
        }

        try {
          board = JXG.JSXGraph.initBoard(div, {
            boundingbox: [-6, 6, 6, -6],
            keepaspectratio: true,
            axis: false,
            showCopyright: false,
            showNavigation: false,
            renderer: 'svg',
          });
        } catch {
          return;
        }
        if (cancelled || !board) return;
        boardRef.current = board;

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
              az: { ...baseAttrs.az, value: DEFAULT_VIEW3D.azimuth },
              el: { ...baseAttrs.el, value: DEFAULT_VIEW3D.elevation },
            },
          );
        } catch {
          /* ignore — mock or jsdom limitation */
        }
        viewRef.current = view;
        if (view) onView3DReadyRef.current?.(view, board);

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
          handlePointerDown = (e: PointerEvent) => {
            if (!svgEl) return;
            onPointerClickRef.current?.(pixelToUser(e));
          };
          handlePointerMove = (e: PointerEvent) => {
            if (!svgEl) return;
            onPointerMoveRef.current?.(pixelToUser(e));
          };
          handlePointerLeave = () => onPointerLeaveRef.current?.();
          handlePointerUp = () => onPointerDragEndRef.current?.();
          svgEl.addEventListener('pointerdown', handlePointerDown);
          svgEl.addEventListener('pointermove', handlePointerMove);
          svgEl.addEventListener('pointerleave', handlePointerLeave);
          svgEl.addEventListener('pointerup', handlePointerUp);
        }
      })();

      return () => {
        cancelled = true;
        if (svgEl) {
          if (handlePointerDown) svgEl.removeEventListener('pointerdown', handlePointerDown);
          if (handlePointerMove) svgEl.removeEventListener('pointermove', handlePointerMove);
          if (handlePointerLeave) svgEl.removeEventListener('pointerleave', handlePointerLeave);
          if (handlePointerUp) svgEl.removeEventListener('pointerup', handlePointerUp);
        }
        try {
          if (board && JXG) JXG.JSXGraph.freeBoard(board);
        } catch {
          /* swallow teardown errors in tests */
        }
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
