'use client';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { deserializeIntoBoard, type SerializedBoard, type SerializedElement } from './serializeBoard';

// Tool keys — match GeoGebra-style toolset
export type GeomTool =
  | 'move'
  | 'point'
  | 'midpoint'
  | 'segment'
  | 'line'
  | 'ray'
  | 'vector'
  | 'perpendicular'
  | 'parallel'
  | 'perpBisector'
  | 'angleBisector'
  | 'polygon'
  | 'circleCenter'
  | 'circle3'
  | 'tangent'
  | 'angle'
  | 'distance'
  | 'area'
  | 'toggleLabel'
  | 'toggleVisible'
  | 'delete';

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
}

interface Props {
  onReady: (handle: MiniBoardHandle) => void;
  initialState: SerializedBoard | null;
}

export interface ToolDef {
  key: GeomTool;
  label: string;
  hint: string;
  icon: React.ReactNode;
  group: 'move' | 'point' | 'line' | 'construct' | 'polygon' | 'circle' | 'measure' | 'edit';
  needs: number; // number of clicks / points required before action fires
  // accepts: 'any' (point or non-point), 'point', 'line', 'circle'
  accepts?: Array<'point' | 'line' | 'circle' | 'any'>;
}

// Tool icons — simple inline SVG for crispness
const Icon = {
  cursor: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4 L20 12 L13 13 L11 20 Z"/></svg>
  ),
  point: (
    <svg width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>
  ),
  midpoint: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="12" x2="20" y2="12"/><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="20" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>
  ),
  segment: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="18" x2="19" y2="6"/><circle cx="5" cy="18" r="1.7" fill="currentColor"/><circle cx="19" cy="6" r="1.7" fill="currentColor"/></svg>
  ),
  line: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="20" x2="22" y2="4"/><circle cx="8" cy="16" r="1.6" fill="currentColor"/><circle cx="16" cy="8" r="1.6" fill="currentColor"/></svg>
  ),
  ray: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="19" x2="22" y2="2"/><circle cx="5" cy="19" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
  ),
  vector: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="20" x2="20" y2="4"/><polyline points="14,4 20,4 20,10"/></svg>
  ),
  perpendicular: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="18" x2="21" y2="18"/><line x1="12" y1="18" x2="12" y2="4"/><rect x="12" y="14" width="4" height="4" fill="none"/></svg>
  ),
  parallel: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="9" x2="21" y2="5"/><line x1="3" y1="19" x2="21" y2="15"/></svg>
  ),
  perpBisector: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="18" x2="20" y2="18"/><line x1="12" y1="4" x2="12" y2="22" strokeDasharray="3 2"/><circle cx="6" cy="18" r="1.5" fill="currentColor"/><circle cx="18" cy="18" r="1.5" fill="currentColor"/></svg>
  ),
  bisector: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="20" x2="20" y2="4"/><line x1="4" y1="20" x2="20" y2="20"/><line x1="4" y1="20" x2="22" y2="12" strokeDasharray="3 2"/></svg>
  ),
  polygon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><polygon points="6,6 18,6 22,14 12,22 4,14"/></svg>
  ),
  circleCenter: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>
  ),
  circle3: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="4" r="1.5" fill="currentColor"/><circle cx="20" cy="14" r="1.5" fill="currentColor"/><circle cx="5" cy="16" r="1.5" fill="currentColor"/></svg>
  ),
  tangent: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="13" r="6"/><line x1="2" y1="20" x2="22" y2="2"/></svg>
  ),
  angle: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="20" x2="20" y2="20"/><line x1="4" y1="20" x2="20" y2="6"/><path d="M14 20 A 10 10 0 0 0 11 13" /></svg>
  ),
  distance: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="8" x2="4" y2="16"/><line x1="20" y1="8" x2="20" y2="16"/></svg>
  ),
  area: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5,6 19,6 21,14 13,21 3,15" fill="currentColor" fillOpacity="0.2"/></svg>
  ),
  toggleLabel: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><text x="3" y="18" fontSize="16" fontFamily="serif" fontWeight="700" fill="currentColor" stroke="none">A</text><text x="13" y="14" fontSize="11" fontFamily="serif" fontWeight="700" fill="currentColor" stroke="none">A</text></svg>
  ),
  toggleVisible: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3.5" fill="currentColor" fillOpacity="0.4"/><circle cx="12" cy="12" r="3.5"/><circle cx="20" cy="6" r="1.5" fill="currentColor"/></svg>
  ),
  trash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6 l-1 14 a 2 2 0 0 1 -2 2 H 8 a 2 2 0 0 1 -2 -2 l-1 -14"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
  ),
};

export const TOOLS: ToolDef[] = [
  { key: 'move', label: 'Di chuyển', hint: 'Kéo điểm hoặc xoay nền', icon: Icon.cursor, group: 'move', needs: 0 },
  { key: 'point', label: 'Điểm mới', hint: 'Click để thêm điểm', icon: Icon.point, group: 'point', needs: 1 },
  { key: 'midpoint', label: 'Trung điểm', hint: 'Click 2 điểm có sẵn', icon: Icon.midpoint, group: 'point', needs: 2, accepts: ['point', 'point'] },
  { key: 'segment', label: 'Đoạn thẳng', hint: 'Click 2 điểm', icon: Icon.segment, group: 'line', needs: 2 },
  { key: 'line', label: 'Đường thẳng qua 2 điểm', hint: 'Click 2 điểm', icon: Icon.line, group: 'line', needs: 2 },
  { key: 'ray', label: 'Tia qua 2 điểm', hint: 'Click 2 điểm', icon: Icon.ray, group: 'line', needs: 2 },
  { key: 'vector', label: 'Vector', hint: 'Click 2 điểm', icon: Icon.vector, group: 'line', needs: 2 },
  { key: 'perpendicular', label: 'Đường vuông góc', hint: 'Click 1 điểm + 1 đường có sẵn', icon: Icon.perpendicular, group: 'construct', needs: 2, accepts: ['point', 'line'] },
  { key: 'parallel', label: 'Đường song song', hint: 'Click 1 điểm + 1 đường có sẵn', icon: Icon.parallel, group: 'construct', needs: 2, accepts: ['point', 'line'] },
  { key: 'perpBisector', label: 'Đường trung trực', hint: 'Click 2 điểm có sẵn', icon: Icon.perpBisector, group: 'construct', needs: 2, accepts: ['point', 'point'] },
  { key: 'angleBisector', label: 'Đường phân giác', hint: 'Click 3 điểm có sẵn (đỉnh ở giữa)', icon: Icon.bisector, group: 'construct', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'polygon', label: 'Đa giác', hint: 'Click các điểm, click lại điểm đầu để đóng', icon: Icon.polygon, group: 'polygon', needs: -1 },
  { key: 'circleCenter', label: 'Đường tròn (tâm + điểm)', hint: 'Click tâm rồi 1 điểm trên đường tròn', icon: Icon.circleCenter, group: 'circle', needs: 2 },
  { key: 'circle3', label: 'Đường tròn qua 3 điểm', hint: 'Click 3 điểm', icon: Icon.circle3, group: 'circle', needs: 3 },
  { key: 'tangent', label: 'Tiếp tuyến', hint: 'Click 1 điểm + 1 đường tròn có sẵn', icon: Icon.tangent, group: 'circle', needs: 2, accepts: ['point', 'circle'] },
  { key: 'angle', label: 'Góc', hint: 'Click 3 điểm có sẵn (đỉnh ở giữa)', icon: Icon.angle, group: 'measure', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'distance', label: 'Khoảng cách', hint: 'Click 2 điểm có sẵn', icon: Icon.distance, group: 'measure', needs: 2, accepts: ['point', 'point'] },
  { key: 'area', label: 'Diện tích', hint: 'Click các đỉnh, click lại điểm đầu để đóng', icon: Icon.area, group: 'measure', needs: -1 },
  { key: 'toggleLabel', label: 'Hiện/ẩn tên', hint: 'Click vào đối tượng', icon: Icon.toggleLabel, group: 'edit', needs: 1, accepts: ['any'] },
  { key: 'toggleVisible', label: 'Hiện/ẩn đối tượng', hint: 'Click vào đối tượng', icon: Icon.toggleVisible, group: 'edit', needs: 1, accepts: ['any'] },
  { key: 'delete', label: 'Xoá', hint: 'Click vào đối tượng', icon: Icon.trash, group: 'edit', needs: 1, accepts: ['any'] },
];

export const GROUP_LABELS: Record<ToolDef['group'], string> = {
  move: 'Cơ bản',
  point: 'Điểm',
  line: 'Đường',
  construct: 'Dựng hình',
  polygon: 'Đa giác',
  circle: 'Đường tròn',
  measure: 'Đo lường',
  edit: 'Chỉnh sửa',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

// Categorize a JSXGraph element type for accept-matching
function objKind(obj: JxgObj): 'point' | 'line' | 'circle' | 'other' {
  if (!obj) return 'other';
  const e = (obj.elType || obj.type || '').toString().toLowerCase();
  if (e === 'point' || e === 'glider' || e === 'midpoint') return 'point';
  if (e === 'line' || e === 'segment' || e === 'arrow' || e === 'axis' || e === 'normal' || e === 'parallel' || e === 'perpendicular' || e === 'tangent' || e === 'bisector' || e === 'perpendicularsegment') return 'line';
  if (e === 'circle' || e === 'circumcircle') return 'circle';
  return 'other';
}

function acceptMatches(tool: ToolDef, slot: number, kind: 'point' | 'line' | 'circle' | 'other'): boolean {
  if (!tool.accepts) return kind === 'point' || tool.key === 'point';
  const a = tool.accepts[slot];
  if (!a) return false;
  if (a === 'any') return kind !== 'other';
  return a === kind;
}

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

  // Pending picks for multi-click tools: array of JSXGraph object refs
  const pendingRef = useRef<JxgObj[]>([]);
  const [, setPendingCount] = useState(0);

  // Live preview segments while building a polygon/area: drawn between
  // consecutive pending points so the user sees the shape forming.
  const previewSegRef = useRef<JxgObj[]>([]);
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

  const clearPreviewSegs = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    for (const s of previewSegRef.current) {
      try { b.removeObject(s); } catch { /* ignore */ }
    }
    previewSegRef.current = [];
  }, []);

  const clearPending = useCallback(() => {
    clearPreviewSegs();
    pendingRef.current = [];
    setPendingCount(0);
  }, [clearPreviewSegs]);

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
      case 'angle':
        create('angle', labels, { radius: 1, fillColor: '#22c55e', fillOpacity: 0.25, strokeColor: '#16a34a', strokeWidth: 1.5, name: lblName });
        break;
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

  // Global Ctrl/Cmd+Z while the panel is mounted. Skipped when focus is in a
  // text input so we don't hijack other undo flows. Capture phase + stop
  // propagation so Excalidraw's underlying undo doesn't also fire when the
  // panel is open on top of the whiteboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey)) return;
      const ae = document.activeElement as HTMLElement | null;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
      e.preventDefault();
      e.stopPropagation();
      undoLast();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [undoLast]);

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
        if (t === 'move') return;
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

        // Tool: point — always create a new free point at click
        if (t === 'point') {
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
          finalize(toolDef, pendingRef.current);
          clearPending();
        }
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
      });
    })();
    return () => {
      cancelled = true;
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

  // Phát tín hiệu khi state thay đổi
  useEffect(() => { notifySubscribers(); }, [tool, showAxis, showGrid, historyTick, notifySubscribers]);

  const undoLastRef = useRef(undoLast);
  undoLastRef.current = undoLast;
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
