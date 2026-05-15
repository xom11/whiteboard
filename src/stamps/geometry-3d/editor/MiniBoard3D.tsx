'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import JXG from 'jsxgraph';
import { DEFAULT_VIEW3D, VIEW3D_ATTRS, paletteFor } from './theme';
import type { GeomTool3D } from './tools';
import type { SerializedBoard3D, SerializedElement3D } from '../serialize';

export interface MiniBoard3DHandle {
  getContainer: () => HTMLDivElement | null;
  getTool: () => GeomTool3D;
  setTool: (t: GeomTool3D) => void;
  getCreationLog: () => SerializedElement3D[];
  pushLog: (e: SerializedElement3D) => void;
  getViewState: () => {
    azimuth: number;
    elevation: number;
    bbox3D: [number, number, number, number, number, number];
  };
  getBbox: () => [number, number, number, number];
  getShowAxes: () => boolean;
  getShowMesh: () => boolean;
  setShowAxes: (b: boolean) => void;
  setShowMesh: (b: boolean) => void;
  resetView: () => void;
  undo: () => void;
  canUndo: () => boolean;
  snapshotSVG: () => { svgString: string; width: number; height: number };
  subscribe: (cb: () => void) => () => void;
}

interface Props {
  isDark: boolean;
  initialState?: SerializedBoard3D | null;
}

// JSXGraph board / view types are not published — use minimal local shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgBoard = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgView = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export const MiniBoard3D = forwardRef<MiniBoard3DHandle, Props>(function MiniBoard3D(
  { isDark, initialState },
  ref,
) {
  const reactId = useId();
  const containerId = `geom3d_${reactId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<JxgBoard>(null);
  const viewRef = useRef<JxgView>(null);
  const toolRef = useRef<GeomTool3D>('move');
  const logRef = useRef<SerializedElement3D[]>([]);
  const objMapRef = useRef<Map<string, JxgObj>>(new Map());
  const subsRef = useRef<Set<() => void>>(new Set());
  const initialBbox3D = useRef<[number, number, number, number, number, number]>(
    initialState?.view.bbox3D ?? DEFAULT_VIEW3D.bbox3D,
  );
  const [showAxes, setShowAxes] = useState(initialState?.showAxes ?? true);
  const [showMesh, setShowMesh] = useState(initialState?.showMesh ?? false);

  const notify = useCallback(() => {
    for (const cb of subsRef.current) cb();
  }, []);

  useEffect(() => {
    const div = containerRef.current;
    if (!div) return;
    JXG.Options.text.display = 'internal';

    const board: JxgBoard = JXG.JSXGraph.initBoard(div, {
      boundingbox: [-6, 6, 6, -6],
      axis: false,
      showCopyright: false,
      showNavigation: false,
      renderer: 'svg',
    });
    boardRef.current = board;

    const initView = initialState?.view ?? DEFAULT_VIEW3D;
    const baseAttrs = VIEW3D_ATTRS(isDark);
    const view: JxgView = board.create(
      'view3d',
      [
        [-5, -5],
        [10, 10],
        [
          [initView.bbox3D[0], initView.bbox3D[3]],
          [initView.bbox3D[1], initView.bbox3D[4]],
          [initView.bbox3D[2], initView.bbox3D[5]],
        ],
      ],
      {
        ...baseAttrs,
        az: { ...baseAttrs.az, value: initView.azimuth },
        el: { ...baseAttrs.el, value: initView.elevation },
      },
    );
    viewRef.current = view;

    if (initialState?.elements?.length) {
      const map = objMapRef.current;
      for (const el of initialState.elements) {
        const parents = el.parents.map((p) =>
          typeof p === 'string' && p.startsWith('@id:') ? map.get(p.slice(4)) : p,
        );
        const obj = view.create(el.type, parents, {
          ...el.attributes,
          id: el.id,
          name: el.label,
        });
        map.set(el.id, obj);
        logRef.current.push(el);
      }
    }

    return () => {
      try {
        JXG.JSXGraph.freeBoard(board);
      } catch {
        /* ignore teardown errors in tests */
      }
      boardRef.current = null;
      viewRef.current = null;
      objMapRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRef = useRef<MiniBoard3DHandle | null>(null);
  handleRef.current = {
    getContainer: () => containerRef.current,
    getTool: () => toolRef.current,
    setTool: (t) => {
      toolRef.current = t;
      notify();
    },
    getCreationLog: () => [...logRef.current],
    pushLog: (e) => {
      logRef.current.push(e);
      notify();
    },
    getViewState: () => {
      const v = viewRef.current as { az?: { Value?: () => number }; el?: { Value?: () => number } } | null;
      return {
        azimuth: v?.az?.Value?.() ?? DEFAULT_VIEW3D.azimuth,
        elevation: v?.el?.Value?.() ?? DEFAULT_VIEW3D.elevation,
        bbox3D: initialBbox3D.current,
      };
    },
    getBbox: () => [-6, 6, 6, -6],
    getShowAxes: () => showAxes,
    getShowMesh: () => showMesh,
    setShowAxes: (b) => {
      setShowAxes(b);
      notify();
    },
    setShowMesh: (b) => {
      setShowMesh(b);
      notify();
    },
    resetView: () => {
      notify();
    },
    undo: () => {
      logRef.current.pop();
      notify();
    },
    canUndo: () => logRef.current.length > 0,
    snapshotSVG: () => {
      const div = containerRef.current;
      if (!div) return { svgString: '', width: 0, height: 0 };
      const svg = div.querySelector('svg');
      if (!svg) return { svgString: '', width: 0, height: 0 };
      const clone = svg.cloneNode(true) as SVGElement;
      const rect = svg.getBoundingClientRect();
      const width = rect.width || 600;
      const height = rect.height || 600;
      clone.setAttribute('width', String(width));
      clone.setAttribute('height', String(height));
      return {
        svgString: new XMLSerializer().serializeToString(clone),
        width,
        height,
      };
    },
    subscribe: (cb) => {
      subsRef.current.add(cb);
      return () => {
        subsRef.current.delete(cb);
      };
    },
  };

  useImperativeHandle(ref, () => handleRef.current!, []);

  const p = paletteFor(isDark);

  return (
    <div
      ref={containerRef}
      id={containerId}
      style={{
        width: '100%',
        height: '100%',
        background: p.view3dBg,
        position: 'relative',
      }}
    />
  );
});
