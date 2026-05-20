'use client';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { deserializeIntoBoard, type SerializedBoard, type SerializedElement } from '../serialize';
import { getDefiningPoints, buildTransformSpec } from './transforms';
import {
  TOOLS,
  GROUP_LABELS,
  acceptMatches,
  objKind,
  type GeomTool,
  type ToolDef,
} from './tools';
import { paletteFor, resolveAttrColors, themeAxis, themeGrid, themeLabel } from './theme';
import { handleDown, handleUp, handleMove, type HandlerCtx } from './handlers';
import { hitObjectsAt, findNearestPointInList } from './hitTest';
import { safeJsx } from '../../shared/safeJsx';

// Re-export để backward-compat với consumer cũ.
export { TOOLS, GROUP_LABELS };
export type { GeomTool, ToolDef };

export interface MiniBoardHandle {
  getContainer: () => HTMLDivElement | null;
  getCreationLog: () => SerializedElement[];
  getBbox: () => [number, number, number, number];
  getShowAxis: () => boolean;
  getShowGrid: () => boolean;
  /** Đổi tool active từ bên ngoài (panel trái). */
  setTool: (t: GeomTool) => void;
  getTool: () => GeomTool;
  /** Toggle layout từ bên ngoài. */
  setShowAxis: (b: boolean) => void;
  setShowGrid: (b: boolean) => void;
  /** Undo bước cuối. */
  undo: () => void;
  /** Có gì để undo? */
  canUndo: () => boolean;
  /** Redo bước vừa undo. */
  redo: () => void;
  /** Có gì để redo? */
  canRedo: () => boolean;
  /** Subscribe khi state thay đổi (tool / showAxis / showGrid / undo). */
  subscribe: (cb: () => void) => () => void;
  /** Đọc snapshot thuộc tính object (cho popover). */
  snapshotObject: (obj: unknown, anchorScreen: { x: number; y: number }) => ObjectSnapshot | null;
  /** Mutate thuộc tính + sync log. */
  mutateObject: (obj: unknown, patch: { attrs?: Record<string, unknown>; remove?: boolean }) => void;
  /** Liệt kê tên của tất cả point hiện tại (để popover disambiguate khi rename). */
  getAllPointNames: () => string[];
  /** Subscribe selection-from-move-tool. Trả về unsubscribe. */
  onSelect: (cb: (snap: ObjectSnapshot) => void) => () => void;
  onTransformParam: (cb: (info: { tool: 'rotate' | 'dilate' | 'regularPolygon'; anchor: { x: number; y: number } } | null) => void) => () => void;
  confirmTransformParam: (value: number) => void;
  cancelTransformParam: () => void;
  /** Số đối tượng đang chọn (qua tool 'select'). */
  getSelectionSize: () => number;
  /** Bỏ chọn tất cả. */
  clearSelection: () => void;
  /** Xoá tất cả đối tượng đang chọn (cascade-aware). */
  deleteSelection: () => void;
}

export interface ObjectSnapshot {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any;
  kind: 'point' | 'line' | 'circle';
  name: string;
  color: string;
  dash: number;
  width: number;
  face: 'o' | 'circle' | 'cross' | 'plus';
  /** Đang hiển thị tên (label) hay không. */
  showLabel: boolean;
  /** Đang có value-label (text gắn động) hay không. */
  showValue: boolean;
  screenCoords: { x: number; y: number };
}

interface Props {
  onReady: (handle: MiniBoardHandle) => void;
  initialState: SerializedBoard | null;
  /** Khi true → board nền tối, điểm/đường/label dùng tone sáng để contrast. */
  isDark?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export const JSXGraphMiniBoard: React.FC<Props> = ({ onReady, initialState, isDark }) => {
  const isDarkRef = useRef(!!isDark);
  isDarkRef.current = !!isDark;
  const containerId = useId().replace(/:/g, '_') + '_jxgmini';
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<JxgObj>(null);
  const jxgRef = useRef<JxgObj>(null);
  const axisObjsRef = useRef<{ x?: JxgObj; y?: JxgObj }>({});
  const creationLogRef = useRef<SerializedElement[]>([]);
  const redoStackRef = useRef<SerializedElement[]>([]);

  const [tool, setTool] = useState<GeomTool>('move');
  const toolRef = useRef<GeomTool>('move');
  toolRef.current = tool;

  const [showAxis, setShowAxis] = useState<boolean>(initialState?.showAxis ?? false);
  const [showGrid, setShowGrid] = useState<boolean>(initialState?.showGrid ?? false);
  const showAxisRef = useRef(showAxis); showAxisRef.current = showAxis;
  const showGridRef = useRef(showGrid); showGridRef.current = showGrid;

  // Track JSXGraph point objects created during the session, indexed by our serialized id.
  // We also track the LAST object created (for non-point types like segment) so accept-matching works.
  const objMapRef = useRef<Map<string, JxgObj>>(new Map());

  // Map target line/circle → dynamic value-label text element (hiển thị độ dài
  // / bán kính). Khi user toggle "Show Value", ta tạo/xoá text này. Serialize:
  // entry type='valueLabel' trong creationLog với args=[targetLocalId].
  const valueLabelsRef = useRef<Map<JxgObj, JxgObj>>(new Map());

  // Pending picks for multi-click tools: array of JSXGraph object refs
  const pendingRef = useRef<JxgObj[]>([]);
  const [, setPendingCount] = useState(0);

  // Selection state — tool 'select' adds clicked objects here. Selected objects
  // get a cyan highlight stroke (original style preserved in selOriginalRef so
  // we can restore on deselect).
  const selectedSetRef = useRef<Set<JxgObj>>(new Set());
  const selOriginalRef = useRef<Map<JxgObj, { strokeColor?: unknown; strokeWidth?: unknown }>>(new Map());
  const [, setSelectionTick] = useState(0);
  // Marquee state during select-tool drag.
  const marqueeRef = useRef<{ startSx: number; startSy: number; rect?: JxgObj } | null>(null);

  // Live preview segments while building a polygon/area: drawn between
  // consecutive pending points so the user sees the shape forming.
  const previewSegRef = useRef<JxgObj[]>([]);
  // Phantom point that tracks mouse position for 2-3 click tool live preview.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const phantomRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previewShapeRef = useRef<any>(null);
  const previewRafRef = useRef<number | null>(null);
  // Tick state forces re-render so the undo button enable state stays in sync
  // with creationLogRef (which is mutated outside React).
  const [historyTick, setHistoryTick] = useState(0);
  // Transient warning shown when a strict construction tool gets a click that
  // didn't land on the required existing object (so the user knows why nothing
  // happened). Auto-clears.
  const [, setWarn] = useState<string | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashWarn = useCallback((msg: string) => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    setWarn(msg);
    warnTimerRef.current = setTimeout(() => setWarn(null), 1800);
  }, []);
  useEffect(() => () => { if (warnTimerRef.current) clearTimeout(warnTimerRef.current); }, []);

  // Scan-and-fill: trả về chữ A-Z đầu tiên chưa dùng giữa các điểm đang sống
  // trên board. Đồng nhất hành vi với 3D stamp (xem scene/labels.ts) — xoá C
  // rồi tạo điểm mới sẽ ra C, không phải D. User-renamed names (vd 'M', 'H')
  // được giữ lại trong 'used' nên không bị cấp lại.
  const nextLabel = useCallback(() => {
    const used = new Set<string>();
    const board = boardRef.current;
    if (board) {
      safeJsx('MiniBoard.nextLabel.scanNames', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const objs = (board as any).objectsList || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const o of objs as any[]) {
          if (objKind(o) === 'point' && typeof o.name === 'string' && o.name) {
            used.add(o.name);
          }
        }
      });
    }
    const A = 'A'.charCodeAt(0);
    for (let suffix = 0; suffix < 1000; suffix++) {
      for (let i = 0; i < 26; i++) {
        const letter = String.fromCharCode(A + i);
        const candidate = suffix === 0 ? letter : `${letter}${suffix}`;
        if (!used.has(candidate)) return candidate;
      }
    }
    return `P${used.size}`;
  }, []);

  const nextLocalId = useCallback(() => 'j' + creationLogRef.current.length, []);

  // Build a fresh JSXGraph object id resolver for serialization.
  // We log args using local string IDs ("j0"); resolve to JSXGraph objects in-memory via objMapRef.
  // Polygon edges (sub-segments) are referenced via "<polyId>:border:<i>" since
  // they're auto-created by JSXGraph as part of the polygon and don't carry a
  // separate top-level id of their own.
  const resolveArgs = useCallback((args: unknown[]): unknown[] => {
    return args.map((a) => {
      if (typeof a === 'string') {
        if (objMapRef.current.has(a)) return objMapRef.current.get(a);
        const m = /^(.+):border:(\d+)$/.exec(a);
        if (m) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const poly = objMapRef.current.get(m[1]) as any;
          const idx = parseInt(m[2], 10);
          if (poly && Array.isArray(poly.borders) && poly.borders[idx]) {
            return poly.borders[idx];
          }
        }
      }
      return a;
    });
  }, []);

  // Push entry mới vào creationLog + clear redoStack (chuẩn UX undo/redo).
  const pushCreationLog = useCallback((entry: SerializedElement) => {
    creationLogRef.current.push(entry);
    redoStackRef.current = [];
  }, []);

  const pushLog = useCallback(
    (id: string, type: string, args: unknown[], attrs: Record<string, unknown>, obj: JxgObj) => {
      pushCreationLog({ id, type, args, attrs });
      objMapRef.current.set(id, obj);
      setHistoryTick((t) => t + 1);
    },
    [pushCreationLog],
  );

  const create = useCallback(
    (type: string, args: unknown[], attrs: Record<string, unknown> = {}): JxgObj => {
      if (!boardRef.current) return null;
      const id = nextLocalId();
      const resolved = resolveArgs(args);
      // attrs có thể chứa sentinel `@stroke/@axis/@grid/@label` — log lưu nguyên
      // bản (theme-neutral), JSXGraph nhận màu thực resolve theo theme hiện tại.
      const resolvedAttrs = resolveAttrColors(attrs, paletteFor(isDarkRef.current));
      const obj = boardRef.current.create(type, resolved, resolvedAttrs);
      pushLog(id, type, args, attrs, obj);
      return obj;
    },
    [nextLocalId, resolveArgs, pushLog],
  );

  // Get local serialized id for a JSXGraph object (reverse lookup).
  // Falls back to "<polyId>:border:<i>" when obj is a polygon edge — lets
  // construct tools (perpendicular, parallel, ...) reference polygon cạnh as
  // a line input even though edges aren't tracked as top-level entries.
  const localIdOf = useCallback((obj: JxgObj): string | null => {
    if (!obj) return null;
    for (const [id, o] of objMapRef.current.entries()) {
      if (o === obj) return id;
    }
    for (const [id, o] of objMapRef.current.entries()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const borders = (o as any)?.borders;
      if (Array.isArray(borders)) {
        const idx = borders.indexOf(obj);
        if (idx >= 0) return `${id}:border:${idx}`;
      }
    }
    return null;
  }, []);

  const snapshotObject = useCallback((obj: unknown, anchorScreen: { x: number; y: number }): ObjectSnapshot | null => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const o: any = obj;
    const k = objKind(o);
    if (k !== 'point' && k !== 'line' && k !== 'circle') return null;
    // Polygon borders are sub-elements of a polygon — user's mental model treats
    // the polygon as one atomic object, so editing a single edge's color/dash
    // (without affecting siblings) is confusing. Reject the popover here; the
    // edge is still usable as a `line` input for construction tools.
    for (const owner of objMapRef.current.values()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const borders = (owner as any)?.borders;
      if (Array.isArray(borders) && borders.indexOf(o) >= 0) return null;
    }
    const v = o.visProp ?? {};
    const showLabel = v.withlabel !== false;
    const showValue = valueLabelsRef.current.has(o);
    return {
      obj: o,
      kind: k,
      name: typeof o.name === 'string' ? o.name : '',
      color: (v.strokecolor as string) ?? '#1e1e1e',
      dash: typeof v.dash === 'number' ? v.dash : 0,
      width: typeof v.strokewidth === 'number' ? v.strokewidth : 2,
      face: (v.face as ObjectSnapshot['face']) ?? 'o',
      showLabel,
      showValue,
      screenCoords: anchorScreen,
    };
  }, []);

  // Tạo text element động hiển thị giá trị (độ dài segment / bán kính circle).
  // Trả về JSXGraph text obj (chưa log). Cần obj có cùng "kind" được hỗ trợ.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createValueLabelFor = useCallback((target: any): any => {
    const b = boardRef.current;
    if (!b || !target) return null;
    const k = objKind(target);
    if (k === 'line') {
      // segment / line / arrow đều dùng point1 + point2
      const p1 = target.point1;
      const p2 = target.point2;
      if (!p1 || !p2) return null;
      const txt = b.create('text', [
        () => (p1.X() + p2.X()) / 2 + 0.15,
        () => (p1.Y() + p2.Y()) / 2 + 0.25,
        () => {
          const dx = p2.X() - p1.X();
          const dy = p2.Y() - p1.Y();
          const len = Math.hypot(dx, dy);
          const name = typeof target.name === 'string' && target.name ? target.name : 'd';
          return `${name} = ${len.toFixed(2)}`;
        },
      ], { fontSize: 12, color: '#dc2626', fixed: true, highlight: false });
      return txt;
    }
    if (k === 'circle') {
      const center = target.center ?? target.midpoint;
      if (!center) return null;
      const txt = b.create('text', [
        () => center.X() + 0.3,
        () => center.Y() + 0.3,
        () => {
          const r = typeof target.Radius === 'function' ? target.Radius() : 0;
          const name = typeof target.name === 'string' && target.name ? target.name : 'r';
          return `${name} = ${r.toFixed(2)}`;
        },
      ], { fontSize: 12, color: '#dc2626', fixed: true, highlight: false });
      return txt;
    }
    return null;
  }, []);

  const mutateObject = useCallback((obj: unknown, patch: { attrs?: Record<string, unknown>; remove?: boolean; valueLabel?: boolean }) => {
    if (!boardRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const o: any = obj;
    if (patch.remove) {
      // Nếu obj có value-label đính kèm → xoá luôn text đó để cascade không
      // bỏ sót.
      const vl = valueLabelsRef.current.get(o);
      if (vl) {
        safeJsx('MiniBoard.removeObject(valueLabel)', () => boardRef.current.removeObject(vl));
        valueLabelsRef.current.delete(o);
      }
      safeJsx('MiniBoard.removeObject(target)', () => boardRef.current.removeObject(o));
      // Cascade: walk log and drop entries whose JSXGraph object was also removed
      const board = boardRef.current;
      const aliveIds = new Set<string>();
      for (const [id, obj] of objMapRef.current.entries()) {
        // JSXGraph keeps objects in board.objects keyed by JSXGraph internal id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jxgId = (obj as any)?.id;
        if (jxgId && board && board.objects && board.objects[jxgId]) {
          aliveIds.add(id);
        }
      }
      // Drop dead entries from log + map
      creationLogRef.current = creationLogRef.current.filter((e) => aliveIds.has(e.id));
      for (const id of Array.from(objMapRef.current.keys())) {
        if (!aliveIds.has(id)) objMapRef.current.delete(id);
      }
      setHistoryTick((t) => t + 1);
      return;
    }
    if (typeof patch.valueLabel === 'boolean') {
      const has = valueLabelsRef.current.has(o);
      if (patch.valueLabel && !has) {
        const txt = createValueLabelFor(o);
        if (txt) {
          valueLabelsRef.current.set(o, txt);
          // Log entry tổng hợp để reload regenerate được. args=[targetLocalId].
          const targetId = localIdOf(o);
          if (targetId) {
            const id = nextLocalId();
            pushCreationLog({ id, type: 'valueLabel', args: [targetId], attrs: {} });
            objMapRef.current.set(id, txt);
            setHistoryTick((t) => t + 1);
          }
        }
      } else if (!patch.valueLabel && has) {
        const txt = valueLabelsRef.current.get(o);
        valueLabelsRef.current.delete(o);
        if (txt) {
          safeJsx('MiniBoard.removeObject(valueLabel.text)', () => boardRef.current.removeObject(txt));
          // Xoá log entry value-label tương ứng
          const txtId = localIdOf(txt);
          if (txtId) {
            creationLogRef.current = creationLogRef.current.filter((e) => e.id !== txtId);
            objMapRef.current.delete(txtId);
            setHistoryTick((t) => t + 1);
          }
        }
      }
    }
    if (patch.attrs) {
      safeJsx('MiniBoard.setAttribute', () => o.setAttribute(patch.attrs));
      const id = localIdOf(o);
      if (id) {
        const entry = creationLogRef.current.find((e) => e.id === id);
        if (entry) entry.attrs = { ...entry.attrs, ...patch.attrs };
        setHistoryTick((t) => t + 1);
      }
    }
    safeJsx('MiniBoard.board.update(mutate)', () => boardRef.current.update());
  }, [createValueLabelFor, localIdOf, nextLocalId]);

  const clearPreviewSegs = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    for (const s of previewSegRef.current) {
      safeJsx('MiniBoard.removeObject(previewSeg)', () => b.removeObject(s));
    }
    previewSegRef.current = [];
  }, []);

  const removePhantom = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    if (previewShapeRef.current) {
      safeJsx('MiniBoard.removeObject(previewShape)', () => b.removeObject(previewShapeRef.current));
      previewShapeRef.current = null;
    }
    if (phantomRef.current) {
      safeJsx('MiniBoard.removeObject(phantom)', () => b.removeObject(phantomRef.current));
      phantomRef.current = null;
    }
  }, []);

  const clearPending = useCallback(() => {
    removePhantom();
    clearPreviewSegs();
    pendingRef.current = [];
    setPendingCount(0);
  }, [clearPreviewSegs, removePhantom]);

  // === Selection helpers (used by the `select` tool) ===
  const applySelectionStyle = useCallback((obj: JxgObj) => {
    if (!obj || selOriginalRef.current.has(obj)) return;
    safeJsx('MiniBoard.applySelectionStyle', () => {
      const visProp = obj.visProp ?? {};
      selOriginalRef.current.set(obj, {
        strokeColor: visProp.strokecolor,
        strokeWidth: visProp.strokewidth,
      });
      const kind = objKind(obj);
      if (kind === 'point') {
        obj.setAttribute({ strokeColor: '#06b6d4', strokeWidth: 3 });
      } else {
        obj.setAttribute({ strokeColor: '#06b6d4', strokeWidth: 3 });
      }
    });
  }, []);

  const restoreSelectionStyle = useCallback((obj: JxgObj) => {
    const orig = selOriginalRef.current.get(obj);
    if (!orig) return;
    safeJsx('MiniBoard.restoreSelectionStyle', () => {
      const attrs: Record<string, unknown> = {};
      if (orig.strokeColor !== undefined) attrs.strokeColor = orig.strokeColor;
      if (orig.strokeWidth !== undefined) attrs.strokeWidth = orig.strokeWidth;
      obj.setAttribute(attrs);
    });
    selOriginalRef.current.delete(obj);
  }, []);

  const clearSelection = useCallback(() => {
    for (const o of selectedSetRef.current) {
      restoreSelectionStyle(o);
    }
    selectedSetRef.current.clear();
    setSelectionTick((t) => t + 1);
    safeJsx('MiniBoard.board.update(clearSelection)', () => boardRef.current?.update());
  }, [restoreSelectionStyle]);

  const toggleSelect = useCallback((obj: JxgObj, additive: boolean) => {
    if (!obj) return;
    if (!additive) {
      // Single-click replace: clear others first.
      for (const o of selectedSetRef.current) {
        if (o !== obj) restoreSelectionStyle(o);
      }
      selectedSetRef.current = new Set([obj]);
      applySelectionStyle(obj);
    } else {
      if (selectedSetRef.current.has(obj)) {
        restoreSelectionStyle(obj);
        selectedSetRef.current.delete(obj);
      } else {
        selectedSetRef.current.add(obj);
        applySelectionStyle(obj);
      }
    }
    setSelectionTick((t) => t + 1);
    safeJsx('MiniBoard.board.update(toggleSelect)', () => boardRef.current?.update());
  }, [applySelectionStyle, restoreSelectionStyle]);

  const deleteSelected = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    if (selectedSetRef.current.size === 0) return;
    // Drop highlight first so removal doesn't try to setAttribute on dead obj.
    for (const o of selectedSetRef.current) selOriginalRef.current.delete(o);
    for (const o of selectedSetRef.current) {
      safeJsx('MiniBoard.removeObject(selected)', () => board.removeObject(o));
    }
    selectedSetRef.current.clear();
    // Cascade-prune log (same approach as delete tool)
    const aliveIds = new Set<string>();
    for (const [id, o] of objMapRef.current.entries()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jxgId = (o as any)?.id;
      if (jxgId && board.objects && board.objects[jxgId]) aliveIds.add(id);
    }
    creationLogRef.current = creationLogRef.current.filter((e) => aliveIds.has(e.id));
    for (const id of Array.from(objMapRef.current.keys())) {
      if (!aliveIds.has(id)) objMapRef.current.delete(id);
    }
    setSelectionTick((t) => t + 1);
    setHistoryTick((t) => t + 1);
  }, []);

  // Build a transient preview shape (not logged) from pending picks + phantom point.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildPreview = useCallback((toolDef: ToolDef, picks: any[], phantom: any) => {
    const b = boardRef.current;
    if (!b) return null;
    const style = { strokeColor: '#3b82f6', strokeWidth: 1.5, strokeOpacity: 0.65, dash: 2, fixed: true, highlight: false, withLabel: false } as Record<string, unknown>;
    const circStyle = { ...style, fillColor: 'none', fillOpacity: 0 };
    try {
      switch (toolDef.key) {
        case 'segment':
        case 'midpoint':
        case 'distance':
          return b.create('segment', [picks[0], phantom], style);
        case 'line':
          return b.create('line', [picks[0], phantom], style);
        case 'ray':
          return b.create('line', [picks[0], phantom], { ...style, straightFirst: false, straightLast: true });
        case 'vector':
          return b.create('arrow', [picks[0], phantom], style);
        case 'circleCenter':
          return b.create('circle', [picks[0], phantom], circStyle);
        case 'circle3':
          if (picks.length === 1) return b.create('circle', [picks[0], phantom], circStyle);
          if (picks.length === 2) return b.create('circumcircle', [picks[0], picks[1], phantom], circStyle);
          return null;
        case 'angle':
          if (picks.length === 1) return b.create('segment', [picks[0], phantom], style);
          if (picks.length === 2) return b.create('angle', [picks[0], picks[1], phantom], { ...style, radius: 1, fillColor: '#22c55e', fillOpacity: 0.15 });
          return null;
        case 'perpBisector':
          return b.create('segment', [picks[0], phantom], style);
        case 'angleBisector':
          if (picks.length === 1) return b.create('segment', [picks[0], phantom], style);
          if (picks.length === 2) return b.create('bisector', [picks[0], picks[1], phantom], style);
          return null;
        case 'perpendicular':
        case 'parallel':
        case 'tangent':
          if (picks.length === 1) {
            const k = objKind(picks[0]);
            if (k === 'line' && toolDef.key !== 'tangent') {
              return b.create(toolDef.key, [picks[0], phantom], style);
            }
            if (k === 'circle' && toolDef.key === 'tangent') {
              const glider = b.create('glider', [phantom.X(), phantom.Y(), picks[0]], { visible: false, withLabel: false });
              return b.create('tangent', [glider], style);
            }
          }
          return null;
        default:
          return null;
      }
    } catch {
      return null;
    }
  }, []);

  // Tear down old preview shape and build a new one from current picks + phantom.
  const refreshPreview = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    // Tear down current preview shape (not the phantom)
    if (previewShapeRef.current) {
      safeJsx('MiniBoard.removeObject(refreshPreview)', () => b.removeObject(previewShapeRef.current));
      previewShapeRef.current = null;
    }
    const t = toolRef.current;
    const toolDef = TOOLS.find((td) => td.key === t);
    if (!toolDef) return;
    const picks = pendingRef.current;
    if (picks.length === 0 || toolDef.needs <= 0) return;
    if (picks.length >= toolDef.needs) return;
    // Create phantom if missing
    if (!phantomRef.current) {
      try {
        phantomRef.current = b.create('point', [0, 0], { visible: false, fixed: true, withLabel: false, name: '' });
      } catch { return; }
    }
    previewShapeRef.current = buildPreview(toolDef, picks, phantomRef.current);
  }, [buildPreview]);

  // Apply tool action with a sequence of picked refs
  const finalize = useCallback((toolDef: ToolDef, picks: JxgObj[]) => {
    if (!boardRef.current) return;
    const labels = picks.map(localIdOf).filter(Boolean) as string[];
    // For open shapes (segment, line, ray, vector). `color` shorthand also fills
    // closed shapes, so we use explicit strokeColor + transparent fillOpacity for
    // anything closed (circle, polygon, angle).
    const stroke = { strokeColor: '@stroke', strokeWidth: 2 };
    const strokeOnly = { ...stroke, fillColor: 'none', fillOpacity: 0 };
    const lblName = nextLabel();
    switch (toolDef.key) {
      case 'midpoint':
        create('midpoint', labels, { name: lblName, color: '@stroke', size: 3 });
        break;
      case 'segment':
        create('segment', labels, stroke);
        break;
      case 'line':
        create('line', labels, stroke);
        break;
      case 'ray': {
        // JSXGraph: 'line' with straightFirst:false, straightLast:true
        create('line', labels, { ...stroke, straightFirst: false, straightLast: true });
        break;
      }
      case 'vector':
        create('arrow', labels, stroke);
        break;
      case 'perpendicular': {
        // [point, line] in that order; JSXGraph perpendicular expects (line, point)
        const [p, l] = picks[0] && objKind(picks[0]) === 'point' ? [labels[0], labels[1]] : [labels[1], labels[0]];
        create('perpendicular', [l, p], stroke);
        break;
      }
      case 'parallel': {
        const [p, l] = picks[0] && objKind(picks[0]) === 'point' ? [labels[0], labels[1]] : [labels[1], labels[0]];
        create('parallel', [l, p], stroke);
        break;
      }
      case 'perpBisector': {
        // JSXGraph 1.12.x doesn't register a `perpendicularbisector` element
        // (only `perpendicular`, `perpendicularpoint`, `perpendicularsegment`).
        // Build it from primitives: midpoint M of P1P2, then a perpendicular
        // line to the segment P1P2 through M. Helpers are invisible but logged
        // so deserialize-on-reload reconstructs the dependency chain.
        const mid = create('midpoint', labels, { visible: false, withLabel: false, name: '' });
        const seg = create('segment', labels, { visible: false, withLabel: false });
        const midId = localIdOf(mid);
        const segId = localIdOf(seg);
        if (midId && segId) create('perpendicular', [segId, midId], stroke);
        break;
      }
      case 'angleBisector':
        create('bisector', labels, stroke);
        break;
      case 'circleCenter':
        create('circle', labels, strokeOnly);
        break;
      case 'circle3':
        create('circumcircle', labels, strokeOnly);
        break;
      case 'tangent': {
        // Need to find the actual point pick (not just by slot index) since
        // the user can click circle-then-point OR point-then-circle.
        const firstIsPoint = picks[0] && objKind(picks[0]) === 'point';
        const pointPick = firstIsPoint ? picks[0] : picks[1];
        const circleLabel = firstIsPoint ? labels[1] : labels[0];
        if (!pointPick || !circleLabel) break;
        const px = typeof pointPick.X === 'function' ? pointPick.X() : 0;
        const py = typeof pointPick.Y === 'function' ? pointPick.Y() : 0;
        const glider = create('glider', [px, py, circleLabel], { name: '', size: 2, strokeColor: '#666', visible: false });
        const gid = localIdOf(glider);
        if (gid) create('tangent', [gid], stroke);
        break;
      }
      case 'angle': {
        // JSXGraph vẽ cung từ BA → BC theo chiều dương (ngược chiều kim đồng hồ).
        // Nếu cross(BA, BC) < 0 thì cung CCW từ BA → BC > 180° → đổi vai trò A,C
        // để luôn hiển thị góc nhọn/tù thay vì góc phản (reflex).
        const [pa, pb, pc] = picks;
        let order: string[] = labels;
        try {
          const ax = pa.X() - pb.X(), ay = pa.Y() - pb.Y();
          const cx = pc.X() - pb.X(), cy = pc.Y() - pb.Y();
          const cross = ax * cy - ay * cx;
          if (cross < 0) order = [labels[2], labels[1], labels[0]];
        } catch { /* fallback giữ thứ tự */ }
        create('angle', order, {
          radius: 1,
          fillColor: '#22c55e',
          fillOpacity: 0.25,
          strokeColor: '#16a34a',
          strokeWidth: 1.5,
          name: '',
          withLabel: false,
        });
        break;
      }
      case 'distance': {
        const pA = picks[0], pB = picks[1];
        const dist = Math.hypot((pA.X() - pB.X()), (pA.Y() - pB.Y()));
        const midX = (pA.X() + pB.X()) / 2;
        const midY = (pA.Y() + pB.Y()) / 2;
        create('text', [midX, midY, `d = ${dist.toFixed(2)}`], { fontSize: 14, color: '#dc2626' });
        break;
      }
      case 'polygon': {
        create('polygon', labels, { fillColor: '#1e3a8a', fillOpacity: 0.10, borders: { strokeColor: '@stroke', strokeWidth: 2 } });
        break;
      }
      case 'area': {
        create('polygon', labels, { fillColor: '#3b82f6', fillOpacity: 0.18, borders: { strokeColor: '#1d4ed8', strokeWidth: 2 } });
        break;
      }
      case 'toggleLabel': {
        const obj = picks[0];
        safeJsx('MiniBoard.toggleLabel', () => {
          if (obj.label) {
            const visible = obj.label.visProp.visible !== false;
            obj.label.setAttribute({ visible: !visible });
          } else if (obj.setAttribute) {
            // For elements without explicit label, toggle 'withLabel'
            const cur = obj.visProp.withlabel !== false;
            obj.setAttribute({ withLabel: !cur });
          }
          boardRef.current.update();
        });
        break;
      }
      case 'toggleVisible': {
        const obj = picks[0];
        safeJsx('MiniBoard.toggleVisible', () => {
          const visible = obj.visProp.visible !== false;
          obj.setAttribute({ visible: !visible });
          boardRef.current.update();
        });
        break;
      }
      case 'delete': {
        const obj = picks[0];
        safeJsx('MiniBoard.deleteOne', () => {
          boardRef.current.removeObject(obj);
          // JSXGraph cascade-removes dependents (e.g. xoá point → segment dùng
          // point đó cũng biến mất). Đồng bộ log: walk objMap, giữ lại id nào
          // vẫn còn trong board.objects; còn lại drop khỏi log + map. Trước
          // patch, chỉ entry chính bị xoá → log dangling reference, replay sẽ
          // throw vì id phụ thuộc không resolve được.
          const board = boardRef.current;
          const aliveIds = new Set<string>();
          for (const [id, o] of objMapRef.current.entries()) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const jxgId = (o as any)?.id;
            if (jxgId && board && board.objects && board.objects[jxgId]) {
              aliveIds.add(id);
            }
          }
          creationLogRef.current = creationLogRef.current.filter((e) => aliveIds.has(e.id));
          for (const id of Array.from(objMapRef.current.keys())) {
            if (!aliveIds.has(id)) objMapRef.current.delete(id);
          }
          setHistoryTick((t) => t + 1);
        });
        break;
      }
    }
  }, [create, localIdOf, nextLabel]);

  const finalizeTransformCreate = useCallback((
    spec: { params: unknown[]; attrs: { type: 'translate' | 'rotate' | 'reflect' | 'scale' }; chain?: Array<{ params: unknown[]; attrs: { type: 'translate' | 'rotate' | 'reflect' | 'scale' } }> },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    source: any,
  ) => {
    if (!boardRef.current) return;
    const def = getDefiningPoints(source);
    if (!def) { flashWarn('Không thể biến đổi đối tượng này'); return; }

    // 1. Create + log transform entry/entries. Chain mode (dilate): create N
    // transforms in order, log each, and apply them as an array.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformObjs: any[] = [];
    const transformIds: string[] = [];
    const steps = spec.chain ?? [{ params: spec.params, attrs: spec.attrs }];
    for (const step of steps) {
      const stepLogArgs: unknown[] = [];
      for (const p of step.params) {
        if (typeof p === 'function') {
          flashWarn('Tham số transform không serialize được — bỏ qua');
          return;
        }
        if (p && typeof p === 'object') {
          const id = localIdOf(p);
          if (!id) {
            flashWarn('Đối tượng tham chiếu không nằm trong board — không thể biến đổi');
            return;
          }
          stepLogArgs.push(id);
        } else {
          stepLogArgs.push(p);
        }
      }
      const stepId = nextLocalId();
      const stepObj = boardRef.current.create('transform', step.params, step.attrs);
      pushCreationLog({ id: stepId, type: 'transform', args: stepLogArgs, attrs: step.attrs as Record<string, unknown> });
      objMapRef.current.set(stepId, stepObj);
      transformObjs.push(stepObj);
      transformIds.push(stepId);
    }
    const transformParent = transformObjs.length === 1 ? transformObjs[0] : transformObjs;
    const transformLogRef = transformObjs.length === 1 ? transformIds[0] : transformIds;

    // 2. Transform each defining point — log each.
    // JSXGraph signature: create('point', [parentElement, transformation|transformationArray])
    // — SOURCE element first, transformation second. Reversing the order made
    // JSXGraph reject the call ("Can't create point with parent types 'object'
    // and 'object'"), crashing the rotate tool prior to this fix.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedPoints: any[] = def.points.map((src) => {
      const srcId = localIdOf(src);
      const id = nextLocalId();
      const srcName = typeof src.name === 'string' ? src.name : '';
      const newName = srcName ? `${srcName}'` : nextLabel();
      const attrs = { name: newName, size: 3, color: '#0ea5e9', strokeColor: '#0ea5e9', fillColor: '#0ea5e9' };
      const obj = boardRef.current!.create('point', [src, transformParent], attrs);
      pushCreationLog({ id, type: 'point', args: [srcId ?? src, transformLogRef], attrs });
      objMapRef.current.set(id, obj);
      return obj;
    });

    // 3. Recreate same-kind object from transformed points
    const baseStyle = { ...def.attrs, strokeColor: '#0ea5e9' };
    const strokeOnly = { ...baseStyle, fillColor: 'none', fillOpacity: 0 };
    const ids = transformedPoints.map((p) => localIdOf(p)).filter((s): s is string => !!s);
    switch (def.kind) {
      case 'point': /* nothing — already created */ break;
      case 'segment': create('segment', ids, baseStyle); break;
      case 'line': create('line', ids, baseStyle); break;
      case 'ray': create('line', ids, { ...baseStyle, straightFirst: false, straightLast: true }); break;
      case 'arrow': create('arrow', ids, baseStyle); break;
      case 'circleCenter': create('circle', ids, strokeOnly); break;
      case 'circle3': create('circumcircle', ids, strokeOnly); break;
    }
    setHistoryTick((t) => t + 1);
  }, [create, flashWarn, localIdOf, nextLabel, nextLocalId]);

  // Tái dựng 1 object từ entry log đã serialize. Dùng chung cho cả
  // initial-state replay và redo. Trả về true nếu tạo thành công.
  const recreateFromLogEntry = useCallback((el: SerializedElement): boolean => {
    const board = boardRef.current;
    if (!board) return false;
    const idMap = objMapRef.current;
    // Phải khớp logic với deserializeIntoBoard (serialize.ts): hỗ trợ cả nested
    // array (dilate chain) lẫn "polyId:border:N" (perpendicular xuống cạnh
    // polygon — vd đường cao). Trước đây chỉ flat-lookup → entry tham chiếu
    // border bị skip → đường cao mất khi mở re-edit.
    const resolve = (a: unknown): unknown => {
      if (typeof a === 'string') {
        if (idMap.has(a)) return idMap.get(a);
        const m = /^(.+):border:(\d+)$/.exec(a);
        if (m) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const poly = idMap.get(m[1]) as any;
          const idx = parseInt(m[2], 10);
          if (poly && Array.isArray(poly.borders) && poly.borders[idx]) {
            return poly.borders[idx];
          }
        }
      }
      if (Array.isArray(a)) return a.map(resolve);
      return a;
    };
    const resolved = el.args.map(resolve);
    try {
      if (el.type === 'valueLabel') {
        const target = resolved[0];
        if (!target) return false;
        const txt = createValueLabelFor(target);
        if (!txt) return false;
        idMap.set(el.id, txt);
        valueLabelsRef.current.set(target, txt);
        return true;
      }
      const themedAttrs = resolveAttrColors({ ...el.attrs }, paletteFor(isDarkRef.current));
      const obj = board.create(el.type, resolved, themedAttrs);
      idMap.set(el.id, obj);
      return true;
    } catch (err) {
      console.warn('Recreate failed for', el.type, err);
      return false;
    }
  }, [createValueLabelFor]);

  // Undo: remove the most recently logged creation. Also clears any in-progress
  // polygon construction (pending picks + preview segments) so state is sane.
  const undoLast = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    while (creationLogRef.current.length > 0) {
      const last = creationLogRef.current.pop();
      if (!last) break;
      const obj = objMapRef.current.get(last.id);
      objMapRef.current.delete(last.id);
      if (obj) {
        safeJsx('MiniBoard.removeObject(undo)', () => b.removeObject(obj));
        clearPending();
        // Push entry này vào redoStack (chỉ entry có object thật).
        redoStackRef.current.push(last);
        setHistoryTick((t) => t + 1);
        safeJsx('MiniBoard.board.update(undo)', () => b.update());
        return;
      }
      // Skip stale log entry (object đã biến mất từ trước) — không push vào redoStack
    }
    setHistoryTick((t) => t + 1);
  }, [clearPending]);

  // Redo: pop entry cuối khỏi redoStack và tái tạo object.
  const redoNext = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    const entry = redoStackRef.current.pop();
    if (!entry) {
      setHistoryTick((t) => t + 1);
      return;
    }
    const ok = recreateFromLogEntry(entry);
    if (ok) {
      creationLogRef.current.push(entry);
    }
    setHistoryTick((t) => t + 1);
    safeJsx('MiniBoard.board.update(redo)', () => b.update());
  }, [recreateFromLogEntry]);

  // Global Ctrl/Cmd+Z + Esc while the panel is mounted. Skipped when focus is
  // in a text input so we don't hijack other undo flows. Capture phase + stop
  // propagation so Excalidraw's underlying undo doesn't also fire when the
  // panel is open on top of the whiteboard. Esc cancels in-progress picks.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement | null;
      const inField = !!(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (inField) return;
        e.preventDefault();
        e.stopPropagation();
        undoLastRef.current();
        return;
      }
      // Ctrl/Cmd+Shift+Z hoặc Ctrl+Y → redo
      if (
        (e.metaKey || e.ctrlKey) &&
        (
          (e.key.toLowerCase() === 'z' && e.shiftKey) ||
          (e.key.toLowerCase() === 'y' && !e.shiftKey)
        )
      ) {
        if (inField) return;
        e.preventDefault();
        e.stopPropagation();
        redoNextRef.current();
        return;
      }
      if (e.key === 'Escape' && !inField) {
        if (pendingRef.current.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          clearPendingRef.current();
        }
        if (selectedSetRef.current.size > 0) {
          e.preventDefault();
          e.stopPropagation();
          clearSelectionRef.current();
        }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !inField) {
        if (selectedSetRef.current.size > 0) {
          e.preventDefault();
          e.stopPropagation();
          deleteSelectedRef.current();
        }
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, []);

  // Translate a pointer event into JSXGraph SVG-pixel coords (the coord system
  // `hasPoint` uses). Falls back to manual rect math if `getMousePosition` is
  // unavailable (e.g. in tests with a mocked board).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const screenCoordsOf = useCallback((evt: any): [number, number] | null => {
    const b = boardRef.current;
    if (!b) return null;
    try {
      const mp = b.getMousePosition ? b.getMousePosition(evt) : null;
      if (mp && mp.length >= 2) return [mp[0], mp[1]];
    } catch { /* fall through */ }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const cx = evt.clientX ?? evt.touches?.[0]?.clientX ?? 0;
      const cy = evt.clientY ?? evt.touches?.[0]?.clientY ?? 0;
      return [cx - rect.left, cy - rect.top];
    }
    return null;
  }, []);

  // Find which JSXGraph object (if any) is at a given pointer event.
  // JSXGraph's `hasPoint` expects coords in the board's SVG pixel space, not
  // viewport-relative clientX/Y. Without this, hits are offset by the
  // container's page position and existing points never snap.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const objectsAt = useCallback((evt: any): JxgObj[] => {
    const b = boardRef.current;
    if (!b) return [];
    const sc = screenCoordsOf(evt);
    if (!sc) return [];
    const [sx, sy] = sc;
    let list: JxgObj[] = [];
    safeJsx('MiniBoard.objectsAt.loop', () => {
      // Exclude invisible cursor-phantom + live preview shape — cả 2 nằm trong
      // objectsList và sẽ shadow real hits nếu không loại trừ (bug freeze).
      const exclude = new Set<JxgObj>();
      if (phantomRef.current) exclude.add(phantomRef.current);
      if (previewShapeRef.current) exclude.add(previewShapeRef.current);
      list = hitObjectsAt(b.objectsList || [], sx, sy, exclude);
    });
    return list;
  }, [screenCoordsOf]);

  // Generous point-snap: JSXGraph's `hasPoint` for a point uses the visual
  // radius (~3px) which is too strict for click targeting. When a tool needs
  // a point pick, fall back to "nearest point within tolPx pixels".
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const findNearestPoint = useCallback((evt: any, tolPx: number = 12): JxgObj | null => {
    const b = boardRef.current;
    if (!b) return null;
    const sc = screenCoordsOf(evt);
    if (!sc) return null;
    const [sx, sy] = sc;
    let result: JxgObj | null = null;
    safeJsx('MiniBoard.findNearestPoint.loop', () => {
      // Exclude phantom — invisible point luôn kéo theo cursor; nếu không bỏ,
      // nó sẽ ăn mọi findNearestPoint(12px) → tool multi-điểm bị "đứng".
      const exclude = new Set<JxgObj>();
      if (phantomRef.current) exclude.add(phantomRef.current);
      result = findNearestPointInList(b.objectsList || [], sx, sy, tolPx, exclude);
    });
    return result;
  }, [screenCoordsOf]);

  // Label-aware snap: if the click landed on a JSXGraph text label (drawn near
  // each named element with `display:'internal'`), follow it back to the owning
  // element. Without this, clicking the "A" label of a point with the segment
  // tool falls through to `findNearestPoint` and — when the label center is
  // beyond the 12 px tolerance — creates a duplicate point right next to A.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const promoteLabel = useCallback((o: JxgObj): JxgObj => {
    if (!o) return o;
    const t = (o.elType || o.type || '').toString().toLowerCase();
    if (t !== 'text') return o;
    const b = boardRef.current;
    if (!b) return o;
    const promoted = safeJsx<JxgObj | null>('MiniBoard.promoteLabel', () => {
      for (const c of (b.objectsList || [])) {
        if (c.label === o) return c;
      }
      return null;
    }, null);
    return promoted ?? o;
  }, []);

  // Pending transform state for rotate/dilate/regularPolygon (needs param popover)
  interface PendingTransform {
    tool: 'rotate' | 'dilate' | 'regularPolygon';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    source: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    center: any;
    anchorScreen: { x: number; y: number };
  }
  const pendingTransformRef = useRef<PendingTransform | null>(null);
  type TransformPopoverInfo = { tool: 'rotate' | 'dilate' | 'regularPolygon'; anchor: { x: number; y: number } } | null;
  const transformSubsRef = useRef<Set<(info: TransformPopoverInfo) => void>>(new Set());
  const emitTransform = useCallback((info: TransformPopoverInfo) => {
    transformSubsRef.current.forEach((cb) => { safeJsx('MiniBoard.emitTransform.cb', () => cb(info)); });
  }, []);

  // Selection subscribers — emitted when Move tool single-clicks an object
  const selectSubsRef = useRef<Set<(snap: ObjectSnapshot) => void>>(new Set());
  const emitSelect = useCallback((snap: ObjectSnapshot) => {
    selectSubsRef.current.forEach((cb) => { safeJsx('MiniBoard.emitSelect.cb', () => cb(snap)); });
  }, []);

  // Track pointer-down position for click vs drag detection in Move tool
  const moveDownRef = useRef<{ sx: number; sy: number } | null>(null);
  // Track previous Move-tool click for double-click detection (open popover only
  // on 2nd click within 400ms on the same object).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastMoveClickRef = useRef<{ obj: any | null; time: number }>({ obj: null, time: 0 });

  // Initialize board
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    let cancelled = false;
    let wheelCleanup: (() => void) | null = null;
    (async () => {
      const JXG = (await import('jsxgraph')).default;
      if (cancelled || !containerRef.current) return;
      jxgRef.current = JXG;
      // Render text/labels as SVG <text> (default 'html' uses absolute-positioned
      // <div> overlays, which are NOT captured when we clone the SVG to export
      // the stamp → labels disappear in inserted image).
      safeJsx('MiniBoard.applyJxgOptions', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const opts = (JXG as any).Options;
        if (opts) {
          opts.text = opts.text || {};
          opts.text.display = 'internal';
          opts.text.useASCIIMathML = false;
          opts.text.useMathJax = false;
          opts.text.useKatex = false;
          opts.label = opts.label || {};
          opts.label.display = 'internal';
          // Label tone theo theme — JSXGraph mặc định stroke black cho text label.
          opts.label.strokeColor = themeLabel(isDarkRef.current);
          opts.text.strokeColor = themeLabel(isDarkRef.current);
        }
      });
      const board = JXG.JSXGraph.initBoard(containerId, {
        boundingbox: initialState?.bbox ?? [-10, 10, 10, -10],
        axis: false, // We manage axis manually via toggle for clean default
        grid: false,
        showCopyright: false,
        showNavigation: true,
        // Keep 1:1 user→pixel ratio so circles stay circular regardless of the
        // container aspect ratio (Excalidraw panel is taller than wide and
        // without this circles became ellipses after reload).
        keepAspectRatio: true,
        pan: { enabled: true, needShift: false },
        // Wheel zoom được tự xử lý bên dưới để bám phím Ctrl/Cmd như Excalidraw
        // (cuộn lên = phóng to, cuộn xuống = thu nhỏ, tâm zoom là vị trí chuột).
        // JSXGraph không có option `needCtrl` nên phải disable wheel built-in
        // và bind listener riêng.
        zoom: { wheel: false },
        // Looser hit-test radius so clicking on a thin segment/line/circle
        // actually registers without pixel-perfect aim. `precision` is a real
        // JSXGraph option (Options.precision) but isn't in the d.ts file.
        ...({ precision: { hasPoint: 8, mouse: 4, touch: 16 } } as Record<string, unknown>),
      });
      boardRef.current = board;

      // Ctrl/Cmd + wheel zoom (Excalidraw-style). Wheel không có Ctrl/Cmd thì
      // bỏ qua → page vẫn scroll bình thường. Tâm zoom đặt tại vị trí chuột.
      const wheelTarget = containerRef.current;
      if (wheelTarget) {
        const onWheel = (e: WheelEvent) => {
          if (!e.ctrlKey && !e.metaKey) return;
          e.preventDefault();
          e.stopPropagation();
          let cx: number | undefined;
          let cy: number | undefined;
          safeJsx('MiniBoard.wheelZoom.coords', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const usr = (board as any).getUsrCoordsOfMouse?.(e);
            if (Array.isArray(usr) && usr.length === 2
                && Number.isFinite(usr[0]) && Number.isFinite(usr[1])) {
              cx = usr[0] as number;
              cy = usr[1] as number;
            }
          });
          if (e.deltaY < 0) {
            safeJsx('MiniBoard.wheelZoom.in', () => board.zoomIn(cx, cy));
          } else if (e.deltaY > 0) {
            safeJsx('MiniBoard.wheelZoom.out', () => board.zoomOut(cx, cy));
          }
        };
        wheelTarget.addEventListener('wheel', onWheel, { passive: false });
        wheelCleanup = () => wheelTarget.removeEventListener('wheel', onWheel);
      }

      // Replay initial state if any
      if (initialState && initialState.elements.length > 0) {
        for (const el of initialState.elements) {
          recreateFromLogEntry(el);
        }
        creationLogRef.current = [...initialState.elements];
      }

      // Initial axis/grid
      if (showAxisRef.current) {
        safeJsx('MiniBoard.initAxes', () => {
          axisObjsRef.current.x = board.create('axis', [[0, 0], [1, 0]], { strokeColor: themeAxis(isDarkRef.current), name: '', withLabel: false });
          axisObjsRef.current.y = board.create('axis', [[0, 0], [0, 1]], { strokeColor: themeAxis(isDarkRef.current), name: '', withLabel: false });
        });
      }
      if (showGridRef.current) {
        safeJsx('MiniBoard.initGrid', () => board.create('grid', [], { strokeColor: themeGrid(isDarkRef.current), strokeOpacity: 1 }));
      }

      // Pointer down: handle click-driven tool actions.
      // Full dispatch logic lives in handlers.ts (handleDown). A stable ctx
      // object is built here so the closure captured at mount stays thin.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      board.on('down', (e: any) => {
        const ctx: HandlerCtx = {
          boardRef, toolRef, pendingRef, previewSegRef, axisObjsRef, selectedSetRef,
          marqueeRef, moveDownRef, lastMoveClickRef, pendingTransformRef,
          phantomRef, previewShapeRef, previewRafRef, jxgRef,
          screenCoordsOf, objectsAt, promoteLabel, findNearestPoint,
          toggleSelect, clearSelection, applySelectionStyle,
          localIdOf, nextLabel, create, finalize, finalizeTransformCreate,
          clearPending, clearPreviewSegs, refreshPreview, flashWarn,
          emitTransform, snapshotObject, emitSelect,
          setPendingCount, setSelectionTick,
        };
        handleDown(ctx, e);
      });

      // Pointer up: DOUBLE-click on Move tool emits selection. Full logic in handlers.ts.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      board.on('up', (e: any) => {
        const ctx: HandlerCtx = {
          boardRef, toolRef, pendingRef, previewSegRef, axisObjsRef, selectedSetRef,
          marqueeRef, moveDownRef, lastMoveClickRef, pendingTransformRef,
          phantomRef, previewShapeRef, previewRafRef, jxgRef,
          screenCoordsOf, objectsAt, promoteLabel, findNearestPoint,
          toggleSelect, clearSelection, applySelectionStyle,
          localIdOf, nextLabel, create, finalize, finalizeTransformCreate,
          clearPending, clearPreviewSegs, refreshPreview, flashWarn,
          emitTransform, snapshotObject, emitSelect,
          setPendingCount, setSelectionTick,
        };
        handleUp(ctx, e);
      });

      // Mouse move: update phantom + marquee. Full logic in handlers.ts.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      board.on('move', (e: any) => {
        const ctx: HandlerCtx = {
          boardRef, toolRef, pendingRef, previewSegRef, axisObjsRef, selectedSetRef,
          marqueeRef, moveDownRef, lastMoveClickRef, pendingTransformRef,
          phantomRef, previewShapeRef, previewRafRef, jxgRef,
          screenCoordsOf, objectsAt, promoteLabel, findNearestPoint,
          toggleSelect, clearSelection, applySelectionStyle,
          localIdOf, nextLabel, create, finalize, finalizeTransformCreate,
          clearPending, clearPreviewSegs, refreshPreview, flashWarn,
          emitTransform, snapshotObject, emitSelect,
          setPendingCount, setSelectionTick,
        };
        handleMove(ctx, e);
      });

      onReady({
        getContainer: () => containerRef.current,
        // Sync toạ độ live của free point về log trước khi trả ra. JSXGraph
        // cho phép drag free point (args=[x,y] không có ref), việc drag chỉ
        // cập nhật obj.X()/Y() trên board chứ không đụng log → re-edit + Chèn
        // sẽ serialize toạ độ cũ → SVG không đổi → fileId trùng → user thấy
        // "k thay đổi". Line/segment/circle/polygon tham chiếu point qua id
        // nên auto-update theo.
        getCreationLog: () => creationLogRef.current.map((e) => {
          if (e.type !== 'point') return { ...e };
          const args = e.args;
          if (!Array.isArray(args) || args.length !== 2) return { ...e };
          if (typeof args[0] !== 'number' || typeof args[1] !== 'number') return { ...e };
          const obj = objMapRef.current.get(e.id) as
            | { X?: () => number; Y?: () => number }
            | undefined;
          if (!obj || typeof obj.X !== 'function' || typeof obj.Y !== 'function') return { ...e };
          const x = obj.X();
          const y = obj.Y();
          if (!Number.isFinite(x) || !Number.isFinite(y)) return { ...e };
          return { ...e, args: [x, y] };
        }),
        getBbox: () => boardRef.current ? boardRef.current.getBoundingBox() : [-10, 10, 10, -10],
        getShowAxis: () => showAxisRef.current,
        getShowGrid: () => showGridRef.current,
        setTool: (t: GeomTool) => handleToolChangeRef.current(t),
        getTool: () => toolRef.current,
        setShowAxis: (b: boolean) => setShowAxisRef.current(b),
        setShowGrid: (b: boolean) => setShowGridRef.current(b),
        undo: () => undoLastRef.current(),
        canUndo: () => creationLogRef.current.length > 0,
        redo: () => redoNextRef.current(),
        canRedo: () => redoStackRef.current.length > 0,
        subscribe: (cb: () => void) => {
          subscribersRef.current.add(cb);
          return () => { subscribersRef.current.delete(cb); };
        },
        snapshotObject,
        mutateObject,
        getAllPointNames: () => {
          const b = boardRef.current;
          if (!b) return [];
          const out: string[] = [];
          safeJsx('MiniBoard.getAllPointNames', () => {
            const objs = b.objectsList || [];
            for (const o of objs) {
              if (objKind(o) === 'point' && typeof o.name === 'string' && o.name) {
                out.push(o.name);
              }
            }
          });
          return out;
        },
        onSelect: (cb: (snap: ObjectSnapshot) => void) => {
          selectSubsRef.current.add(cb);
          return () => { selectSubsRef.current.delete(cb); };
        },
        onTransformParam: (cb: (info: TransformPopoverInfo) => void) => {
          transformSubsRef.current.add(cb);
          return () => { transformSubsRef.current.delete(cb); };
        },
        confirmTransformParam: (value: number) => {
          const p = pendingTransformRef.current;
          if (!p) return;
          if (p.tool === 'regularPolygon') {
            const n = Math.max(3, Math.round(value));
            const p1Id = localIdOf(p.source);
            const p2Id = localIdOf(p.center);
            if (p1Id && p2Id && boardRef.current) {
              try {
                create('regularpolygon', [p1Id, p2Id, n], {
                  fillColor: '#1e3a8a',
                  fillOpacity: 0.10,
                  borders: { strokeColor: '@stroke', strokeWidth: 2 },
                });
              } catch (err) {
                console.warn('regularpolygon failed', err);
              }
            }
            pendingTransformRef.current = null;
            emitTransformRef.current(null);
            clearPendingRef.current();
            return;
          }
          const spec = p.tool === 'rotate'
            ? buildTransformSpec({ kind: 'rotate', center: p.center, angleDeg: value })
            : buildTransformSpec({ kind: 'dilate', center: p.center, k: value });
          finalizeTransformCreateRef.current(spec, p.source);
          pendingTransformRef.current = null;
          emitTransformRef.current(null);
          clearPendingRef.current();
        },
        cancelTransformParam: () => {
          pendingTransformRef.current = null;
          emitTransformRef.current(null);
          clearPendingRef.current();
        },
        getSelectionSize: () => selectedSetRef.current.size,
        clearSelection: () => clearSelectionRef.current(),
        deleteSelection: () => deleteSelectedRef.current(),
      });
    })();
    return () => {
      cancelled = true;
      if (wheelCleanup) {
        wheelCleanup();
        wheelCleanup = null;
      }
      if (previewRafRef.current != null) {
        cancelAnimationFrame(previewRafRef.current);
        previewRafRef.current = null;
      }
      if (boardRef.current && jxgRef.current) {
        safeJsx('MiniBoard.freeBoard', () => jxgRef.current!.JSXGraph.freeBoard(boardRef.current));
        boardRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId]);

  // React to axis/grid toggle changes after init
  useEffect(() => {
    const b = boardRef.current;
    if (!b) return;
    safeJsx('MiniBoard.toggleAxis', () => {
      // Remove existing axes if present
      if (axisObjsRef.current.x) { safeJsx('MiniBoard.removeObject(axisX)', () => b.removeObject(axisObjsRef.current.x)); axisObjsRef.current.x = undefined; }
      if (axisObjsRef.current.y) { safeJsx('MiniBoard.removeObject(axisY)', () => b.removeObject(axisObjsRef.current.y)); axisObjsRef.current.y = undefined; }
      if (showAxis) {
        axisObjsRef.current.x = b.create('axis', [[0, 0], [1, 0]], { strokeColor: themeAxis(isDarkRef.current), name: '', withLabel: false });
        axisObjsRef.current.y = b.create('axis', [[0, 0], [0, 1]], { strokeColor: themeAxis(isDarkRef.current), name: '', withLabel: false });
      }
      b.update();
    });
  }, [showAxis]);

  useEffect(() => {
    const b = boardRef.current;
    if (!b) return;
    safeJsx('MiniBoard.toggleGrid', () => {
      // Find existing grid objects and remove
      const objs = Object.values(b.objects || {}) as JxgObj[];
      for (const o of objs) {
        if (o && (o.elType === 'grid' || o.type === 'grid' || (o.visProp && o.visProp.type === 'grid'))) {
          safeJsx('MiniBoard.removeObject(grid)', () => b.removeObject(o));
        }
      }
      if (showGrid) {
        b.create('grid', [], { strokeColor: themeGrid(isDarkRef.current), strokeOpacity: 1 });
      }
      b.update();
    });
  }, [showGrid]);

  const handleToolChange = useCallback((t: GeomTool) => {
    clearPending();
    // Update the ref synchronously so subsequent pointer-down events (e.g. a
    // fast user click immediately after picking a tool) see the new tool
    // without waiting for React's commit phase.
    toolRef.current = t;
    setTool(t);
    // Disable JSXGraph pan while the user is in the select tool so that
    // drag-empty starts a marquee selection instead of panning the board.
    // Re-enable for every other tool (board pan is the default).
    const b = boardRef.current;
    if (b) {
      safeJsx('MiniBoard.setPanForTool', () => {
        if (b.attr?.pan) b.attr.pan.enabled = (t !== 'select');
      });
    }
  }, [clearPending]);

  // Stable ref so onReady closure (captured at mount) can call latest handler.
  const handleToolChangeRef = useRef(handleToolChange);
  handleToolChangeRef.current = handleToolChange;

  // Subscribers thông báo bên ngoài khi state thay đổi (tool / axis / grid / undo)
  const subscribersRef = useRef<Set<() => void>>(new Set());
  const notifySubscribers = useCallback(() => {
    subscribersRef.current.forEach((cb) => {
      safeJsx('MiniBoard.notifySubscriber.cb', () => cb());
    });
  }, []);

  // Phát tín hiệu khi state thay đổi
  useEffect(() => { notifySubscribers(); }, [tool, showAxis, showGrid, historyTick, notifySubscribers]);

  const undoLastRef = useRef(undoLast);
  undoLastRef.current = undoLast;
  const redoNextRef = useRef(redoNext);
  redoNextRef.current = redoNext;
  const clearPendingRef = useRef(clearPending);
  clearPendingRef.current = clearPending;
  const finalizeTransformCreateRef = useRef(finalizeTransformCreate);
  finalizeTransformCreateRef.current = finalizeTransformCreate;
  const clearSelectionRef = useRef(clearSelection);
  clearSelectionRef.current = clearSelection;
  const deleteSelectedRef = useRef(deleteSelected);
  deleteSelectedRef.current = deleteSelected;
  const emitTransformRef = useRef(emitTransform);
  emitTransformRef.current = emitTransform;
  const setShowAxisRef = useRef(setShowAxis);
  setShowAxisRef.current = setShowAxis;
  const setShowGridRef = useRef(setShowGrid);
  setShowGridRef.current = setShowGrid;

  return (
    <div
      ref={containerRef}
      id={containerId}
      data-testid="jxgmini-container"
      className="h-full min-h-0 bg-white"
      style={{ touchAction: 'none' }}
    />
  );
};
