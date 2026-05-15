'use client';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { deserializeIntoBoard, type SerializedBoard, type SerializedElement } from './serializeBoard';
import { getDefiningPoints, buildTransformSpec } from './transforms';
import {
  TOOLS,
  GROUP_LABELS,
  acceptMatches,
  objKind,
  type GeomTool,
  type ToolDef,
} from './jsxgraph/tools';

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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export const JSXGraphMiniBoard: React.FC<Props> = ({ onReady, initialState }) => {
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
      const obj = boardRef.current.create(type, resolved, { ...attrs });
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
    const stroke = { strokeColor: '#0f172a', strokeWidth: 2 };
    const strokeOnly = { ...stroke, fillColor: 'none', fillOpacity: 0 };
    const lblName = nextLabel();
    switch (toolDef.key) {
      case 'midpoint':
        create('midpoint', labels, { name: lblName, color: '#000', size: 3 });
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
        create('polygon', labels, { fillColor: '#1e3a8a', fillOpacity: 0.10, borders: { strokeColor: '#0f172a', strokeWidth: 2 } });
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
          // Also remove from log (best effort)
          const id = localIdOf(obj);
          if (id) {
            creationLogRef.current = creationLogRef.current.filter(e => e.id !== id);
            objMapRef.current.delete(id);
            setHistoryTick((t) => t + 1);
          }
        } catch { /* ignore */ }
        break;
      }
    }
  }, [create, localIdOf, nextLabel]);

  const finalizeTransformCreate = useCallback((
    spec: { params: unknown[]; attrs: { type: 'translate' | 'rotate' | 'reflect' | 'scale' } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    source: any,
  ) => {
    if (!boardRef.current) return;
    const def = getDefiningPoints(source);
    if (!def) { flashWarn('Không thể biến đổi đối tượng này'); return; }

    // 1. Create + log transform entry
    const transformLogArgs: unknown[] = [];
    for (const p of spec.params) {
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
        transformLogArgs.push(id);
      } else {
        transformLogArgs.push(p);
      }
    }
    const tId = nextLocalId();
    const transformObj = boardRef.current.create('transform', spec.params, spec.attrs);
    creationLogRef.current.push({ id: tId, type: 'transform', args: transformLogArgs, attrs: spec.attrs as Record<string, unknown> });
    objMapRef.current.set(tId, transformObj);

    // 2. Transform each defining point — log each
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedPoints: any[] = def.points.map((src) => {
      const srcId = localIdOf(src);
      const id = nextLocalId();
      const srcName = typeof src.name === 'string' ? src.name : '';
      const newName = srcName ? `${srcName}'` : nextLabel();
      const attrs = { name: newName, size: 3, color: '#0ea5e9', strokeColor: '#0ea5e9', fillColor: '#0ea5e9' };
      const obj = boardRef.current!.create('point', [transformObj, src], attrs);
      creationLogRef.current.push({ id, type: 'point', args: [tId, srcId ?? src], attrs });
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
            const obj = board.create(el.type, resolved, { ...el.attrs });
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
          axisObjsRef.current.x = board.create('axis', [[0, 0], [1, 0]], { strokeColor: '#94a3b8', name: '', withLabel: false });
          axisObjsRef.current.y = board.create('axis', [[0, 0], [0, 1]], { strokeColor: '#94a3b8', name: '', withLabel: false });
        } catch { /* ignore */ }
      }
      if (showGridRef.current) {
        try { board.create('grid', [], { strokeColor: '#e2e8f0', strokeOpacity: 1 }); } catch { /* ignore */ }
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
        const toolDef = TOOLS.find(td => td.key === t);
        if (!toolDef) return;

        const coords = boardRef.current.getUsrCoordsOfMouse(e);
        const x = coords[0], y = coords[1];

        // Detect if click hits any existing object (snap target)
        const hits = objectsAt(e).filter(o => o !== axisObjsRef.current.x && o !== axisObjsRef.current.y);
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
              const attrs = { name, color: '#0f172a', size: 3, fillColor: '#0f172a', strokeColor: '#0f172a' };
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
          create('point', [x, y], { name, color: '#0f172a', size: 3, fillColor: '#0f172a', strokeColor: '#0f172a' });
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
          // Otherwise pick (snap-to-existing or create) a new vertex
          const pick: JxgObj = snappedPoint ?? (() => {
            const name = nextLabel();
            return create('point', [x, y], { name, color: '#0f172a', size: 3 });
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
          // through it). Otherwise bind by what's clicked.
          if (remaining.includes('point') && strictPoint) pick = strictPoint;
          else if (remaining.includes('line') && lineHit) pick = lineHit;
          else if (remaining.includes('circle') && circleHit) pick = circleHit;
          else if (remaining.includes('point')) {
            // generous snap fallback for small points
            const near = findNearestPoint(e, 12);
            if (near) pick = near;
          } else if (remaining.includes('any')) {
            pick = strictPoint ?? lineHit ?? circleHit ?? null;
          }
          if (!pick) {
            const needs = remaining.map((k) =>
              k === 'point' ? 'một điểm' : k === 'line' ? 'một đường/đoạn' : k === 'circle' ? 'một đường tròn' : 'một đối tượng',
            );
            flashWarn(`Còn cần click vào ${needs.join(' + ')} có sẵn`);
            return;
          }
        } else {
          // --- Mode B: lenient, all slots want a point ---
          const snapped = snapPointForPointSlot();
          if (snapped) pick = snapped;
          else {
            const name = nextLabel();
            pick = create('point', [x, y], { name, color: '#0f172a', size: 3, fillColor: '#0f172a', strokeColor: '#0f172a' });
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
        if (t !== 'move') return;
        const start = moveDownRef.current;
        moveDownRef.current = null;
        if (!start) return;
        const sc = screenCoordsOf(e);
        if (!sc) return;
        const [sx, sy] = sc;
        const moved = Math.hypot(sx - start.sx, sy - start.sy);
        if (moved > 4) return;  // drag, không phải click
        const hits = objectsAt(e).filter((o) => o !== axisObjsRef.current.x && o !== axisObjsRef.current.y);
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
                  borders: { strokeColor: '#0f172a', strokeWidth: 2 },
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
        axisObjsRef.current.x = b.create('axis', [[0, 0], [1, 0]], { strokeColor: '#94a3b8', name: '', withLabel: false });
        axisObjsRef.current.y = b.create('axis', [[0, 0], [0, 1]], { strokeColor: '#94a3b8', name: '', withLabel: false });
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
        b.create('grid', [], { strokeColor: '#e2e8f0', strokeOpacity: 1 });
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
