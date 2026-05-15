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

  const labelIdxRef = useRef(0);
  const nextLabel = useCallback(() => {
    const idx = labelIdxRef.current;
    const suffix = idx >= 26 ? String(Math.floor(idx / 26)) : '';
    const code = 'A'.charCodeAt(0) + (idx % 26);
    labelIdxRef.current = idx + 1;
    return String.fromCharCode(code) + suffix;
  }, []);

  const nextLocalId = useCallback(() => 'j' + creationLogRef.current.length, []);

  // Build a fresh JSXGraph object id resolver for serialization.
  // We log args using local string IDs ("j0"); resolve to JSXGraph objects in-memory via objMapRef.
  const resolveArgs = useCallback((args: unknown[]): unknown[] => {
    return args.map((a) => {
      if (typeof a === 'string' && objMapRef.current.has(a)) {
        return objMapRef.current.get(a);
      }
      return a;
    });
  }, []);

  const pushLog = useCallback(
    (id: string, type: string, args: unknown[], attrs: Record<string, unknown>, obj: JxgObj) => {
      creationLogRef.current.push({ id, type, args, attrs });
      objMapRef.current.set(id, obj);
      setHistoryTick((t) => t + 1);
    },
    [],
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
  const localIdOf = useCallback((obj: JxgObj): string | null => {
    for (const [id, o] of objMapRef.current.entries()) {
      if (o === obj) return id;
    }
    return null;
  }, []);

  const snapshotObject = useCallback((obj: unknown, anchorScreen: { x: number; y: number }): ObjectSnapshot | null => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const o: any = obj;
    const k = objKind(o);
    if (k !== 'point' && k !== 'line' && k !== 'circle') return null;
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
        try { boardRef.current.removeObject(vl); } catch { /* ignore */ }
        valueLabelsRef.current.delete(o);
      }
      try { boardRef.current.removeObject(o); } catch { /* ignore */ }
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
            creationLogRef.current.push({ id, type: 'valueLabel', args: [targetId], attrs: {} });
            objMapRef.current.set(id, txt);
            setHistoryTick((t) => t + 1);
          }
        }
      } else if (!patch.valueLabel && has) {
        const txt = valueLabelsRef.current.get(o);
        valueLabelsRef.current.delete(o);
        if (txt) {
          try { boardRef.current.removeObject(txt); } catch { /* ignore */ }
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
      try { o.setAttribute(patch.attrs); } catch { /* ignore */ }
      const id = localIdOf(o);
      if (id) {
        const entry = creationLogRef.current.find((e) => e.id === id);
        if (entry) entry.attrs = { ...entry.attrs, ...patch.attrs };
        setHistoryTick((t) => t + 1);
      }
    }
    try { boardRef.current.update(); } catch { /* ignore */ }
  }, [createValueLabelFor, localIdOf, nextLocalId]);

  const clearPreviewSegs = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    for (const s of previewSegRef.current) {
      try { b.removeObject(s); } catch { /* ignore */ }
    }
    previewSegRef.current = [];
  }, []);

  const removePhantom = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    if (previewShapeRef.current) {
      try { b.removeObject(previewShapeRef.current); } catch { /* ignore */ }
      previewShapeRef.current = null;
    }
    if (phantomRef.current) {
      try { b.removeObject(phantomRef.current); } catch { /* ignore */ }
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
    try {
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
    } catch { /* ignore */ }
  }, []);

  const restoreSelectionStyle = useCallback((obj: JxgObj) => {
    const orig = selOriginalRef.current.get(obj);
    if (!orig) return;
    try {
      const attrs: Record<string, unknown> = {};
      if (orig.strokeColor !== undefined) attrs.strokeColor = orig.strokeColor;
      if (orig.strokeWidth !== undefined) attrs.strokeWidth = orig.strokeWidth;
      obj.setAttribute(attrs);
    } catch { /* ignore */ }
    selOriginalRef.current.delete(obj);
  }, []);

  const clearSelection = useCallback(() => {
    for (const o of selectedSetRef.current) {
      restoreSelectionStyle(o);
    }
    selectedSetRef.current.clear();
    setSelectionTick((t) => t + 1);
    try { boardRef.current?.update(); } catch { /* ignore */ }
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
    try { boardRef.current?.update(); } catch { /* ignore */ }
  }, [applySelectionStyle, restoreSelectionStyle]);

  const deleteSelected = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    if (selectedSetRef.current.size === 0) return;
    // Drop highlight first so removal doesn't try to setAttribute on dead obj.
    for (const o of selectedSetRef.current) selOriginalRef.current.delete(o);
    for (const o of selectedSetRef.current) {
      try { board.removeObject(o); } catch { /* ignore */ }
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
      try { b.removeObject(previewShapeRef.current); } catch { /* ignore */ }
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
        try {
          if (obj.label) {
            const visible = obj.label.visProp.visible !== false;
            obj.label.setAttribute({ visible: !visible });
          } else if (obj.setAttribute) {
            // For elements without explicit label, toggle 'withLabel'
            const cur = obj.visProp.withlabel !== false;
            obj.setAttribute({ withLabel: !cur });
          }
          boardRef.current.update();
        } catch { /* ignore */ }
        break;
      }
      case 'toggleVisible': {
        const obj = picks[0];
        try {
          const visible = obj.visProp.visible !== false;
          obj.setAttribute({ visible: !visible });
          boardRef.current.update();
        } catch { /* ignore */ }
        break;
      }
      case 'delete': {
        const obj = picks[0];
        try {
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
        } catch { /* ignore */ }
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
      creationLogRef.current.push({ id: stepId, type: 'transform', args: stepLogArgs, attrs: step.attrs as Record<string, unknown> });
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
      creationLogRef.current.push({ id, type: 'point', args: [srcId ?? src, transformLogRef], attrs });
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
        try { b.removeObject(obj); } catch { /* ignore */ }
        clearPending();
        setHistoryTick((t) => t + 1);
        try { b.update(); } catch { /* ignore */ }
        return;
      }
      // Skip stale log entry (object already gone) and continue popping
    }
    setHistoryTick((t) => t + 1);
  }, [clearPending]);

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
    const list: JxgObj[] = [];
    try {
      const objs = b.objectsList || [];
      for (const o of objs) {
        try {
          if (o.hasPoint && o.hasPoint(sx, sy)) list.push(o);
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
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
    const tol2 = tolPx * tolPx;
    let best: { obj: JxgObj; d2: number } | null = null;
    try {
      const objs = b.objectsList || [];
      for (const o of objs) {
        try {
          if (objKind(o) !== 'point') continue;
          const pc = o.coords?.scrCoords;
          if (!pc) continue;
          const dx = pc[1] - sx;
          const dy = pc[2] - sy;
          const d2 = dx * dx + dy * dy;
          if (d2 <= tol2 && (!best || d2 < best.d2)) best = { obj: o, d2 };
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    return best ? best.obj : null;
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
    try {
      for (const c of (b.objectsList || [])) {
        if (c.label === o) return c;
      }
    } catch { /* ignore */ }
    return o;
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
    transformSubsRef.current.forEach((cb) => { try { cb(info); } catch { /* ignore */ } });
  }, []);

  // Initialize board
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    let cancelled = false;
    (async () => {
      const JXG = (await import('jsxgraph')).default;
      if (cancelled || !containerRef.current) return;
      jxgRef.current = JXG;
      // Render text/labels as SVG <text> (default 'html' uses absolute-positioned
      // <div> overlays, which are NOT captured when we clone the SVG to export
      // the stamp → labels disappear in inserted image).
      try {
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
      } catch { /* ignore */ }
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
        zoom: { wheel: true },
        // Looser hit-test radius so clicking on a thin segment/line/circle
        // actually registers without pixel-perfect aim. `precision` is a real
        // JSXGraph option (Options.precision) but isn't in the d.ts file.
        ...({ precision: { hasPoint: 8, mouse: 4, touch: 16 } } as Record<string, unknown>),
      });
      boardRef.current = board;

      // Replay initial state if any
      if (initialState && initialState.elements.length > 0) {
        const idMap = objMapRef.current;
        for (const el of initialState.elements) {
          const resolved = el.args.map(a => (typeof a === 'string' && idMap.has(a)) ? idMap.get(a) : a);
          try {
            if (el.type === 'valueLabel') {
              // Synthetic: regenerate dynamic text gắn với target.
              const target = resolved[0];
              if (target) {
                const txt = createValueLabelFor(target);
                if (txt) {
                  idMap.set(el.id, txt);
                  valueLabelsRef.current.set(target, txt);
                }
              }
              continue;
            }
            const themedAttrs = resolveAttrColors({ ...el.attrs }, paletteFor(isDarkRef.current));
            const obj = board.create(el.type, resolved, themedAttrs);
            idMap.set(el.id, obj);
          } catch (err) {
            console.warn('Replay failed for', el.type, err);
          }
        }
        creationLogRef.current = [...initialState.elements];
        labelIdxRef.current = initialState.elements.filter(e => e.type === 'point').length;
      }

      // Initial axis/grid
      if (showAxisRef.current) {
        try {
          axisObjsRef.current.x = board.create('axis', [[0, 0], [1, 0]], { strokeColor: themeAxis(isDarkRef.current), name: '', withLabel: false });
          axisObjsRef.current.y = board.create('axis', [[0, 0], [0, 1]], { strokeColor: themeAxis(isDarkRef.current), name: '', withLabel: false });
        } catch { /* ignore */ }
      }
      if (showGridRef.current) {
        try { board.create('grid', [], { strokeColor: themeGrid(isDarkRef.current), strokeOpacity: 1 }); } catch { /* ignore */ }
      }

      // Pointer down: handle click-driven tool actions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      board.on('down', (e: any) => {
        if (!boardRef.current) return;
        const t = toolRef.current;
        if (t === 'move') {
          const sc = screenCoordsOf(e);
          if (!sc) return;
          const [sx, sy] = sc;
          moveDownRef.current = { sx, sy };
          return;
        }
        if (t === 'select') {
          const sc = screenCoordsOf(e);
          if (!sc) return;
          const [sx, sy] = sc;
          const hits = objectsAt(e)
            .map(promoteLabel)
            .filter((o) => o !== axisObjsRef.current.x && o !== axisObjsRef.current.y);
          const obj = hits.find((o) => objKind(o) === 'point') ?? hits[0] ?? findNearestPoint(e, 12);
          if (obj) {
            const shift = !!(e.shiftKey || e.altKey);
            toggleSelect(obj, shift);
            // Stash so 'up' handler doesn't treat this as a marquee end.
            moveDownRef.current = { sx, sy };
            marqueeRef.current = null;
            return;
          }
          // Empty space: start marquee. We disable board pan while marqueeing
          // by not setting moveDownRef (board's internal pan listener relies on
          // it being null elsewhere; here we record marquee start separately).
          marqueeRef.current = { startSx: sx, startSy: sy };
          // Clear current selection unless shift is held (additive marquee).
          if (!(e.shiftKey || e.altKey)) clearSelection();
          return;
        }
        const toolDef = TOOLS.find(td => td.key === t);
        if (!toolDef) return;

        const coords = boardRef.current.getUsrCoordsOfMouse(e);
        const x = coords[0], y = coords[1];

        // Detect if click hits any existing object (snap target). Text labels
        // are promoted to their owning element so a click on the "A" label
        // counts as a click on the point A.
        const hits = objectsAt(e)
          .map(promoteLabel)
          .filter(o => o !== axisObjsRef.current.x && o !== axisObjsRef.current.y);
        // Prefer points over other elements when present
        const bestHit: JxgObj | null = hits.find(o => objKind(o) === 'point') ?? hits[0] ?? null;
        // Generous fallback used when a slot expects a point: JSXGraph's `hasPoint`
        // for a small point is ~3px which is too tight for clicking, so we look up
        // the nearest existing point within 12px. Only applied where the active
        // tool slot needs a point — otherwise we'd shadow valid line/circle hits.
        const snapPointForPointSlot = (): JxgObj | null =>
          bestHit && objKind(bestHit) === 'point' ? bestHit : findNearestPoint(e, 12);

        // Tool: point — nếu click trúng ≥2 đường/đường tròn → tạo giao điểm
        // ràng buộc (khi kéo các đường, điểm này luôn là giao). Trường hợp 1
        // đường + click thường vẫn tạo điểm tự do (không glide để tránh ràng
        // buộc ngoài ý muốn).
        if (t === 'point') {
          const curves = hits.filter((o) => objKind(o) === 'line' || objKind(o) === 'circle');
          if (curves.length >= 2) {
            const a = curves[0];
            const b = curves[1];
            const aId = localIdOf(a);
            const bId = localIdOf(b);
            if (aId && bId) {
              const name = nextLabel();
              const attrs = { name, color: '@stroke', size: 3, fillColor: '@stroke', strokeColor: '@stroke' };
              try {
                // intersection trả về element [obj1, obj2] với giao gần (x, y).
                // JSXGraph cần index i (0 hoặc 1) cho trường hợp 2 giao (line-circle, circle-circle).
                // Chọn index dựa vào điểm gần click hơn.
                const isLineLine = objKind(a) === 'line' && objKind(b) === 'line';
                if (isLineLine) {
                  create('intersection', [aId, bId, 0], attrs);
                } else {
                  // Thử cả 2 index, chọn cái gần click hơn
                  const tmp0 = boardRef.current.create('intersection', [a, b, 0], { visible: false, withLabel: false });
                  const tmp1 = boardRef.current.create('intersection', [a, b, 1], { visible: false, withLabel: false });
                  const d0 = Math.hypot((tmp0.X?.() ?? 0) - x, (tmp0.Y?.() ?? 0) - y);
                  const d1 = Math.hypot((tmp1.X?.() ?? 0) - x, (tmp1.Y?.() ?? 0) - y);
                  try { boardRef.current.removeObject(tmp0); } catch { /* ignore */ }
                  try { boardRef.current.removeObject(tmp1); } catch { /* ignore */ }
                  const idx = d0 <= d1 ? 0 : 1;
                  create('intersection', [aId, bId, idx], attrs);
                }
                return;
              } catch {
                // fallback: tạo điểm tự do
              }
            }
          }
          const name = nextLabel();
          create('point', [x, y], { name, color: '@stroke', size: 3, fillColor: '@stroke', strokeColor: '@stroke' });
          return;
        }

        // Edit / single-target tools (toggleLabel, toggleVisible, delete)
        if (toolDef.needs === 1 && toolDef.accepts) {
          // Fall back to generous point snap if hasPoint missed a small point.
          const hit = bestHit ?? findNearestPoint(e, 12);
          if (hit) finalize(toolDef, [hit]);
          else flashWarn('Click vào một đối tượng để áp dụng');
          return;
        }

        // Polygon / area: variable-length, close on click near starting point
        if (toolDef.needs === -1) {
          const snappedPoint = snapPointForPointSlot();
          // Close ring first: if user clicks back on the first pending point
          // (with at least 3 points already), finalize. Done before push so the
          // first point isn't duplicated into pending.
          if (pendingRef.current.length >= 3 && snappedPoint && snappedPoint === pendingRef.current[0]) {
            clearPreviewSegs();
            finalize(toolDef, pendingRef.current);
            clearPending();
            return;
          }
          // Reject re-picking an interior pending vertex (would create a degenerate edge).
          if (snappedPoint && pendingRef.current.includes(snappedPoint)) {
            flashWarn('Đỉnh này đã có — click điểm khác hoặc click lại điểm đầu để đóng');
            return;
          }
          // Otherwise pick (snap-to-existing or create) a new vertex
          const pick: JxgObj = snappedPoint ?? (() => {
            const name = nextLabel();
            return create('point', [x, y], { name, color: '@stroke', size: 3 });
          })();
          // Live preview: draw an edge from the previous pending vertex to
          // this new one so the user sees the polygon being built.
          if (pendingRef.current.length > 0 && boardRef.current) {
            const prev = pendingRef.current[pendingRef.current.length - 1];
            try {
              const seg = boardRef.current.create('segment', [prev, pick], {
                strokeColor: '#3b82f6',
                strokeWidth: 1.5,
                strokeOpacity: 0.75,
                fixed: true,
                highlight: false,
                withLabel: false,
              });
              previewSegRef.current.push(seg);
            } catch { /* ignore */ }
          }
          pendingRef.current.push(pick);
          setPendingCount(pendingRef.current.length);
          return;
        }

        // Multi-click branch. Two sub-modes:
        //   A) Strict + order-flexible: tool declared `accepts`. We bind each
        //      click to whatever required kind is still unfilled, regardless
        //      of click order. E.g. perpendicular accepts ['point', 'line']
        //      and the user can click line-then-point or point-then-line.
        //   B) Lenient + order-fixed: tool has no `accepts` (segment, line,
        //      ray, vector, circle*, ...). All slots want points; missing
        //      snaps create a fresh point.
        let pick: JxgObj | null = null;

        if (toolDef.accepts) {
          // --- Mode A: strict, order-flexible ---
          const usedKinds = pendingRef.current.map((p) => objKind(p));
          const remaining: Array<'point' | 'line' | 'circle' | 'any'> = [...toolDef.accepts];
          for (const u of usedKinds) {
            if (u === 'other') continue;
            const i = remaining.indexOf(u);
            if (i >= 0) remaining.splice(i, 1);
          }
          const strictPoint = hits.find((o) => objKind(o) === 'point') ?? null;
          const lineHit = hits.find((o) => objKind(o) === 'line') ?? null;
          const circleHit = hits.find((o) => objKind(o) === 'circle') ?? null;
          // Priority: an exact point hit binds to 'point' first (so a click
          // landing right on a vertex isn't stolen by a line/circle passing
          // through it). Typed line/circle bind next. 'any' slot accepts any
          // remaining hit (point/line/circle). Generous point-snap is the
          // last resort when only a 'point' slot is open.
          //
          // Previously 'any' was checked AFTER the snap fallback for point,
          // which meant tools like dilate (accepts ['any', 'point']) couldn't
          // pick a segment for the 'any' slot — the snap branch absorbed the
          // click and 'any' was never evaluated.
          if (remaining.includes('point') && strictPoint) pick = strictPoint;
          else if (remaining.includes('line') && lineHit) pick = lineHit;
          else if (remaining.includes('circle') && circleHit) pick = circleHit;
          else if (remaining.includes('any') && (strictPoint || lineHit || circleHit)) {
            pick = strictPoint ?? lineHit ?? circleHit;
          } else if (remaining.includes('point')) {
            const near = findNearestPoint(e, 12);
            if (near) pick = near;
          }
          if (!pick) {
            const needs = remaining.map((k) =>
              k === 'point' ? 'một điểm' : k === 'line' ? 'một đường/đoạn' : k === 'circle' ? 'một đường tròn' : 'một đối tượng',
            );
            flashWarn(`Còn cần click vào ${needs.join(' + ')} có sẵn`);
            return;
          }
          // Reject duplicate picks (e.g. click the same point twice for midpoint
          // would produce a degenerate object pointing at itself).
          if (pendingRef.current.includes(pick)) {
            flashWarn('Đã chọn đối tượng này — chọn đối tượng khác');
            return;
          }
        } else {
          // --- Mode B: lenient, all slots want a point ---
          const snapped = snapPointForPointSlot();
          if (snapped && pendingRef.current.includes(snapped)) {
            // Same point clicked twice → would produce a zero-length segment / etc.
            flashWarn('Đã chọn điểm này — chọn điểm khác hoặc click chỗ trống');
            return;
          }
          if (snapped) pick = snapped;
          else {
            const name = nextLabel();
            pick = create('point', [x, y], { name, color: '@stroke', size: 3, fillColor: '@stroke', strokeColor: '@stroke' });
          }
        }

        if (!pick) return;
        pendingRef.current.push(pick);
        setPendingCount(pendingRef.current.length);

        if (pendingRef.current.length >= toolDef.needs) {
          const tk = toolDef.key;
          if (tk === 'rotate' || tk === 'dilate') {
            const source = pendingRef.current[0];
            const center = pendingRef.current[1];
            const cx = ((e.clientX ?? 0) as number) + 8;
            const cy = ((e.clientY ?? 0) as number) + 8;
            pendingTransformRef.current = { tool: tk, source, center, anchorScreen: { x: cx, y: cy } };
            emitTransform({ tool: tk, anchor: { x: cx, y: cy } });
            // Don't clearPending here — wait for confirm/cancel
            return;
          }
          if (tk === 'regularPolygon') {
            const p1 = pendingRef.current[0];
            const p2 = pendingRef.current[1];
            const cx = ((e.clientX ?? 0) as number) + 8;
            const cy = ((e.clientY ?? 0) as number) + 8;
            pendingTransformRef.current = { tool: tk, source: p1, center: p2, anchorScreen: { x: cx, y: cy } };
            emitTransform({ tool: tk, anchor: { x: cx, y: cy } });
            return;
          }
          if (tk === 'translate') {
            const source = pendingRef.current[0];
            const spec = buildTransformSpec({ kind: 'translate', vectorPoints: [pendingRef.current[1], pendingRef.current[2]] });
            finalizeTransformCreate(spec, source);
            clearPending();
            return;
          }
          if (tk === 'reflectLine') {
            const source = pendingRef.current[0];
            const spec = buildTransformSpec({ kind: 'reflectLine', line: pendingRef.current[1] });
            finalizeTransformCreate(spec, source);
            clearPending();
            return;
          }
          if (tk === 'reflectPoint') {
            const source = pendingRef.current[0];
            const spec = buildTransformSpec({ kind: 'reflectPoint', center: pendingRef.current[1] });
            finalizeTransformCreate(spec, source);
            clearPending();
            return;
          }
          finalize(toolDef, pendingRef.current);
          clearPending();
        } else {
          refreshPreview();
        }
      });

      // Pointer up: DOUBLE-click on Move tool emits selection (single-click chỉ
      // dùng để drag đối tượng). Theo dõi click trước đó: nếu click thứ 2 trong
      // 400ms vào CÙNG đối tượng → mở popover.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      board.on('up', (e: any) => {
        const t = toolRef.current;
        if (t === 'select') {
          // Finalize marquee: any object hit-tested inside the rectangle gets
          // added to the selection. Single click on object was already handled
          // in `down`; here we only care about drag end.
          const mq = marqueeRef.current;
          marqueeRef.current = null;
          moveDownRef.current = null;
          if (!mq) return;
          const sc = screenCoordsOf(e);
          if (!sc) return;
          const [ex, ey] = sc;
          if (mq.rect) { try { boardRef.current?.removeObject(mq.rect); } catch { /* ignore */ } }
          if (Math.hypot(ex - mq.startSx, ey - mq.startSy) < 4) return;  // not a real drag
          const x1 = Math.min(mq.startSx, ex), x2 = Math.max(mq.startSx, ex);
          const y1 = Math.min(mq.startSy, ey), y2 = Math.max(mq.startSy, ey);
          const board = boardRef.current;
          if (!board) return;
          const list = (board.objectsList || []) as JxgObj[];
          for (const o of list) {
            if (o === axisObjsRef.current.x || o === axisObjsRef.current.y) continue;
            // Points: include if their screen coord falls inside the rect.
            const kind = objKind(o);
            if (kind === 'point') {
              const pc = o.coords?.scrCoords;
              if (!pc) continue;
              if (pc[1] >= x1 && pc[1] <= x2 && pc[2] >= y1 && pc[2] <= y2) {
                if (!selectedSetRef.current.has(o)) {
                  selectedSetRef.current.add(o);
                  applySelectionStyle(o);
                }
              }
            }
            // Lines/segments/circles: simple test — include if either defining
            // point falls inside (good enough for marquee UX without doing
            // expensive line-rectangle intersections).
            else if (kind === 'line' || kind === 'circle') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const defs: any[] = [o.point1, o.point2, o.center, o.midpoint, o.point3].filter(Boolean);
              const anyInside = defs.some((p) => {
                const pc = p?.coords?.scrCoords;
                return pc && pc[1] >= x1 && pc[1] <= x2 && pc[2] >= y1 && pc[2] <= y2;
              });
              if (anyInside && !selectedSetRef.current.has(o)) {
                selectedSetRef.current.add(o);
                applySelectionStyle(o);
              }
            }
          }
          setSelectionTick((tt) => tt + 1);
          try { board.update(); } catch { /* ignore */ }
          return;
        }
        if (t !== 'move') return;
        const start = moveDownRef.current;
        moveDownRef.current = null;
        if (!start) return;
        const sc = screenCoordsOf(e);
        if (!sc) return;
        const [sx, sy] = sc;
        const moved = Math.hypot(sx - start.sx, sy - start.sy);
        if (moved > 4) return;  // drag, không phải click
        const hits = objectsAt(e)
          .map(promoteLabel)
          .filter((o) => o !== axisObjsRef.current.x && o !== axisObjsRef.current.y);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const best: any = hits.find((o) => objKind(o) === 'point') ?? hits[0] ?? findNearestPoint(e, 12);
        if (!best) {
          lastMoveClickRef.current = { obj: null, time: 0 };
          return;
        }
        const now = Date.now();
        const isDouble = lastMoveClickRef.current.obj === best && (now - lastMoveClickRef.current.time) < 400;
        lastMoveClickRef.current = { obj: best, time: now };
        if (!isDouble) return;
        const cx = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) as number;
        const cy = (e.clientY ?? e.touches?.[0]?.clientY ?? 0) as number;
        const snap = snapshotObject(best, { x: cx + 8, y: cy + 8 });
        if (snap) emitSelect(snap);
      });

      // Mouse move: update phantom position so preview shape tracks cursor.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      board.on('move', (e: any) => {
        // Marquee rectangle redraw while user drags with the select tool on empty space.
        if (toolRef.current === 'select' && marqueeRef.current) {
          const sc = screenCoordsOf(e);
          if (sc && boardRef.current) {
            const [sx, sy] = sc;
            const { startSx, startSy } = marqueeRef.current;
            // Convert screen px to user coords for JSXGraph polygon overlay.
            const b = boardRef.current;
            const ux1 = b.screenCoords2userCoords?.([Math.min(startSx, sx), Math.min(startSy, sy)]) ?? null;
            const ux2 = b.screenCoords2userCoords?.([Math.max(startSx, sx), Math.max(startSy, sy)]) ?? null;
            // JSXGraph internal: getUsrCoordsByScreenCoords may not exist; fall
            // back to using a known board API.
            const toUsr = (px: number, py: number): [number, number] => {
              // Coords.getMouseCoordinates equivalent — use board.origin + unitX/Y.
              const ox = b.origin?.scrCoords?.[1] ?? 0;
              const oy = b.origin?.scrCoords?.[2] ?? 0;
              const ux = (px - ox) / b.unitX;
              const uy = (oy - py) / b.unitY;
              return [ux, uy];
            };
            const [x1u, y1u] = ux1 && ux1.length >= 2 ? [ux1[0], ux1[1]] : toUsr(Math.min(startSx, sx), Math.min(startSy, sy));
            const [x2u, y2u] = ux2 && ux2.length >= 2 ? [ux2[0], ux2[1]] : toUsr(Math.max(startSx, sx), Math.max(startSy, sy));
            const rect = marqueeRef.current.rect;
            if (rect) {
              try { boardRef.current.removeObject(rect); } catch { /* ignore */ }
            }
            try {
              marqueeRef.current.rect = boardRef.current.create('polygon', [
                [x1u, y1u], [x2u, y1u], [x2u, y2u], [x1u, y2u],
              ], {
                fillColor: '#06b6d4', fillOpacity: 0.08,
                borders: { strokeColor: '#06b6d4', strokeWidth: 1, dash: 2 },
                vertices: { visible: false },
                fixed: true, highlight: false, withLabel: false,
              });
            } catch { /* ignore */ }
          }
          return;
        }
        const ph = phantomRef.current;
        if (!ph || !boardRef.current) return;
        if (previewRafRef.current != null) return;
        previewRafRef.current = requestAnimationFrame(() => {
          previewRafRef.current = null;
          if (!boardRef.current || !phantomRef.current) return;
          try {
            const coords = boardRef.current.getUsrCoordsOfMouse(e);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const JXG: any = jxgRef.current;
            if (!JXG) return;
            phantomRef.current.setPositionDirectly(JXG.COORDS_BY_USER, [coords[0], coords[1]]);
            boardRef.current.update();
          } catch { /* ignore */ }
        });
      });

      onReady({
        getContainer: () => containerRef.current,
        getCreationLog: () => [...creationLogRef.current],
        getBbox: () => boardRef.current ? boardRef.current.getBoundingBox() : [-10, 10, 10, -10],
        getShowAxis: () => showAxisRef.current,
        getShowGrid: () => showGridRef.current,
        setTool: (t: GeomTool) => handleToolChangeRef.current(t),
        getTool: () => toolRef.current,
        setShowAxis: (b: boolean) => setShowAxisRef.current(b),
        setShowGrid: (b: boolean) => setShowGridRef.current(b),
        undo: () => undoLastRef.current(),
        canUndo: () => creationLogRef.current.length > 0,
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
          try {
            const objs = b.objectsList || [];
            for (const o of objs) {
              if (objKind(o) === 'point' && typeof o.name === 'string' && o.name) {
                out.push(o.name);
              }
            }
          } catch { /* ignore */ }
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
      if (previewRafRef.current != null) {
        cancelAnimationFrame(previewRafRef.current);
        previewRafRef.current = null;
      }
      if (boardRef.current && jxgRef.current) {
        try { jxgRef.current.JSXGraph.freeBoard(boardRef.current); } catch { /* ignore */ }
        boardRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId]);

  // React to axis/grid toggle changes after init
  useEffect(() => {
    const b = boardRef.current;
    if (!b) return;
    try {
      // Remove existing axes if present
      if (axisObjsRef.current.x) { try { b.removeObject(axisObjsRef.current.x); } catch { /* ignore */ } axisObjsRef.current.x = undefined; }
      if (axisObjsRef.current.y) { try { b.removeObject(axisObjsRef.current.y); } catch { /* ignore */ } axisObjsRef.current.y = undefined; }
      if (showAxis) {
        axisObjsRef.current.x = b.create('axis', [[0, 0], [1, 0]], { strokeColor: themeAxis(isDarkRef.current), name: '', withLabel: false });
        axisObjsRef.current.y = b.create('axis', [[0, 0], [0, 1]], { strokeColor: themeAxis(isDarkRef.current), name: '', withLabel: false });
      }
      b.update();
    } catch { /* ignore */ }
  }, [showAxis]);

  useEffect(() => {
    const b = boardRef.current;
    if (!b) return;
    try {
      // Find existing grid objects and remove
      const objs = Object.values(b.objects || {}) as JxgObj[];
      for (const o of objs) {
        if (o && (o.elType === 'grid' || o.type === 'grid' || (o.visProp && o.visProp.type === 'grid'))) {
          try { b.removeObject(o); } catch { /* ignore */ }
        }
      }
      if (showGrid) {
        b.create('grid', [], { strokeColor: themeGrid(isDarkRef.current), strokeOpacity: 1 });
      }
      b.update();
    } catch { /* ignore */ }
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
      try {
        if (b.attr?.pan) b.attr.pan.enabled = (t !== 'select');
      } catch { /* ignore */ }
    }
  }, [clearPending]);

  // Stable ref so onReady closure (captured at mount) can call latest handler.
  const handleToolChangeRef = useRef(handleToolChange);
  handleToolChangeRef.current = handleToolChange;

  // Subscribers thông báo bên ngoài khi state thay đổi (tool / axis / grid / undo)
  const subscribersRef = useRef<Set<() => void>>(new Set());
  const notifySubscribers = useCallback(() => {
    subscribersRef.current.forEach((cb) => {
      try { cb(); } catch { /* ignore */ }
    });
  }, []);

  // Selection subscribers — emitted when Move tool single-clicks an object
  const selectSubsRef = useRef<Set<(snap: ObjectSnapshot) => void>>(new Set());
  const emitSelect = useCallback((snap: ObjectSnapshot) => {
    selectSubsRef.current.forEach((cb) => { try { cb(snap); } catch { /* ignore */ } });
  }, []);

  // Track pointer-down position for click vs drag detection in Move tool
  const moveDownRef = useRef<{ sx: number; sy: number } | null>(null);
  // Track previous Move-tool click for double-click detection (open popover only
  // on 2nd click within 400ms on the same object).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastMoveClickRef = useRef<{ obj: any | null; time: number }>({ obj: null, time: 0 });

  // Phát tín hiệu khi state thay đổi
  useEffect(() => { notifySubscribers(); }, [tool, showAxis, showGrid, historyTick, notifySubscribers]);

  const undoLastRef = useRef(undoLast);
  undoLastRef.current = undoLast;
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
