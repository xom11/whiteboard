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
import { DEFAULT_VIEW3D, VIEW3D_ATTRS, paletteFor } from './theme';
import type { GeomTool3D } from './tools';
import type { SerializedBoard3D, SerializedElement3D } from '../serialize';
import {
  createHandlerContext,
  handleToolStep,
  type ClickHit,
  type HandlerContext,
} from './handlers';

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
  const ctxRef = useRef<HandlerContext | null>(null);
  const pointerHandlerRef = useRef<{ el: HTMLElement | SVGElement; fn: EventListener } | null>(null);
  const [showAxes, setShowAxes] = useState(initialState?.showAxes ?? true);
  const [showMesh, setShowMesh] = useState(initialState?.showMesh ?? false);

  const notify = useCallback(() => {
    for (const cb of subsRef.current) cb();
  }, []);

  useEffect(() => {
    const div = containerRef.current;
    if (!div) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let JXG: any = null;
    let board: JxgBoard | null = null;

    void (async () => {
      JXG = (await import('jsxgraph')).default;
      if (cancelled || !containerRef.current) return;
      JXG.Options.text.display = 'internal';

      board = JXG.JSXGraph.initBoard(div, {
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

    // Wire pointer events to handlers
    let idCounter = 1;
    const ctx: HandlerContext = createHandlerContext({
      view,
      pushLog: (e) => {
        logRef.current.push(e);
        notify();
      },
      objMap: objMapRef.current,
      nextId: () => `obj_${Date.now().toString(36)}_${(idCounter++).toString(36)}`,
      isDark,
      promptCoords: (label) => {
        const raw = window.prompt(`${label}\n(định dạng "x,y,z")`, '0,0,0');
        if (!raw) return null;
        const parts = raw.split(',').map((s) => Number(s.trim()));
        if (parts.length !== 3 || parts.some((n) => !isFinite(n))) return null;
        return { x: parts[0], y: parts[1], z: parts[2] };
      },
      promptNumber: (label) => {
        const raw = window.prompt(label, '1');
        if (raw == null) return null;
        const n = Number(raw);
        return isFinite(n) ? n : null;
      },
      promptText: (label) => {
        const raw = window.prompt(label, '');
        return raw == null ? null : raw;
      },
      notify,
    });
    ctxRef.current = ctx;

    // Helper: find existing point3d under pointer (returns its id) so polygon
    // close + segment chaining work.
    //
    // Bug #10 root cause: JSXGraph 3D `point3d` objects don't expose `coords`
    // directly — the rendered position lives on the auto-generated 2D shadow
    // `element2D.coords.scrCoords`. The earlier code read `obj.coords` which
    // was always undefined, so every iteration `continue`'d and the hit-test
    // never matched. View3d's screen↔world projection isn't lossless, so the
    // user's click position can differ from the rendered point by 100+ px;
    // using the shadow's actual screen coords fixes both that drift and the
    // synthetic-test miss.
    function findExistingPointAt(clientX: number, clientY: number): string | undefined {
      const containerRect = (div as HTMLDivElement).getBoundingClientRect();
      const localX = clientX - containerRect.left;
      const localY = clientY - containerRect.top;
      const PICK = 18;
      const svg = (div as HTMLDivElement).querySelector('svg');
      if (!svg) return undefined;
      for (const [id, obj] of objMapRef.current) {
        const entry = obj as {
          elType?: string;
          element2D?: { coords?: { scrCoords?: number[] } };
        };
        if (entry?.elType !== 'point3d') continue;
        const sc = entry.element2D?.coords?.scrCoords;
        if (!sc || sc.length < 3) continue;
        const dx = sc[1] - localX;
        const dy = sc[2] - localY;
        if (dx * dx + dy * dy <= PICK * PICK) return id;
      }
      return undefined;
    }

    const handlePointerDown = (e: PointerEvent) => {
      const tool = toolRef.current;
      if (tool === 'move') return;
      // Suppress default JSXGraph drag/select for tool clicks
      const existingPointId = findExistingPointAt(e.clientX, e.clientY);
      let x3 = 0;
      let y3 = 0;
      const z3 = 0;
      try {
        // 2D world coords from screen, project onto z=0 plane.
        const board2d = boardRef.current as
          | { getCoordsTopLeftCorner?: unknown; getUsrCoordsOfMouse?: (ev: Event) => [number, number] }
          | null;
        if (board2d?.getUsrCoordsOfMouse) {
          const uc = board2d.getUsrCoordsOfMouse(e);
          if (Array.isArray(uc) && uc.length >= 2) {
            x3 = uc[0];
            y3 = uc[1];
          }
        }
      } catch {
        /* fall back to 0,0,0 */
      }
      const hit: ClickHit = { x3, y3, z3, existingPointId };
      handleToolStep(ctx, tool, hit);
    };

    const svgEl = (div as HTMLDivElement).querySelector('svg');
    const targetEl = (svgEl ?? (div as HTMLDivElement)) as HTMLElement | SVGElement;
    const handlePointerDownEv: EventListener = (e) => handlePointerDown(e as PointerEvent);
    targetEl.addEventListener('pointerdown', handlePointerDownEv);
    pointerHandlerRef.current = { el: targetEl, fn: handlePointerDownEv };

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
    })();

    return () => {
      cancelled = true;
      if (pointerHandlerRef.current) {
        pointerHandlerRef.current.el.removeEventListener(
          'pointerdown',
          pointerHandlerRef.current.fn,
        );
        pointerHandlerRef.current = null;
      }
      try {
        if (board && JXG) JXG.JSXGraph.freeBoard(board);
      } catch {
        /* ignore teardown errors in tests */
      }
      boardRef.current = null;
      viewRef.current = null;
      ctxRef.current = null;
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
    // Sync toạ độ live của free point3d về log trước khi trả ra. JSXGraph
    // cho phép drag point3d (parents=[x,y,z] không có ref), việc drag chỉ
    // cập nhật obj.X()/Y()/Z() chứ không đụng log → re-edit + Chèn sẽ
    // serialize toạ độ cũ → SVG không đổi → fileId trùng → user thấy
    // "k thay đổi". Line/plane/polygon/sphere tham chiếu point qua @id nên
    // auto-update theo.
    getCreationLog: () => logRef.current.map((e) => {
      if (e.type !== 'point3d') return { ...e };
      const parents = e.parents;
      if (!Array.isArray(parents) || parents.length !== 3) return { ...e };
      if (
        typeof parents[0] !== 'number' ||
        typeof parents[1] !== 'number' ||
        typeof parents[2] !== 'number'
      ) return { ...e };
      const obj = objMapRef.current.get(e.id) as
        | { X?: () => number; Y?: () => number; Z?: () => number }
        | undefined;
      if (
        !obj ||
        typeof obj.X !== 'function' ||
        typeof obj.Y !== 'function' ||
        typeof obj.Z !== 'function'
      ) return { ...e };
      const x = obj.X();
      const y = obj.Y();
      const z = obj.Z();
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return { ...e };
      return { ...e, parents: [x, y, z] };
    }),
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
        // Clip JSXGraph mesh3d/bounding-box paths that project outside the
        // board container (Bug #4) — without this they overlap LeftPanel and
        // block pointer events.
        overflow: 'hidden',
      }}
    />
  );
});
