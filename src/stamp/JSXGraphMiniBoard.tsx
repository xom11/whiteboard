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
}

interface Props {
  onReady: (handle: MiniBoardHandle) => void;
  initialState: SerializedBoard | null;
}

interface ToolDef {
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

const TOOLS: ToolDef[] = [
  { key: 'move', label: 'Di chuyển', hint: 'Kéo điểm hoặc xoay nền', icon: Icon.cursor, group: 'move', needs: 0 },
  { key: 'point', label: 'Điểm mới', hint: 'Click để thêm điểm', icon: Icon.point, group: 'point', needs: 1 },
  { key: 'midpoint', label: 'Trung điểm', hint: 'Click 2 điểm', icon: Icon.midpoint, group: 'point', needs: 2, accepts: ['point', 'point'] },
  { key: 'segment', label: 'Đoạn thẳng', hint: 'Click 2 điểm', icon: Icon.segment, group: 'line', needs: 2 },
  { key: 'line', label: 'Đường thẳng qua 2 điểm', hint: 'Click 2 điểm', icon: Icon.line, group: 'line', needs: 2 },
  { key: 'ray', label: 'Tia qua 2 điểm', hint: 'Click 2 điểm', icon: Icon.ray, group: 'line', needs: 2 },
  { key: 'vector', label: 'Vector', hint: 'Click 2 điểm', icon: Icon.vector, group: 'line', needs: 2 },
  { key: 'perpendicular', label: 'Đường vuông góc', hint: 'Click 1 điểm + 1 đường', icon: Icon.perpendicular, group: 'construct', needs: 2, accepts: ['point', 'line'] },
  { key: 'parallel', label: 'Đường song song', hint: 'Click 1 điểm + 1 đường', icon: Icon.parallel, group: 'construct', needs: 2, accepts: ['point', 'line'] },
  { key: 'perpBisector', label: 'Đường trung trực', hint: 'Click 2 điểm', icon: Icon.perpBisector, group: 'construct', needs: 2, accepts: ['point', 'point'] },
  { key: 'angleBisector', label: 'Đường phân giác', hint: 'Click 3 điểm', icon: Icon.bisector, group: 'construct', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'polygon', label: 'Đa giác', hint: 'Click các điểm, click lại điểm đầu để đóng', icon: Icon.polygon, group: 'polygon', needs: -1 },
  { key: 'circleCenter', label: 'Đường tròn (tâm + điểm)', hint: 'Click tâm rồi 1 điểm trên đường tròn', icon: Icon.circleCenter, group: 'circle', needs: 2 },
  { key: 'circle3', label: 'Đường tròn qua 3 điểm', hint: 'Click 3 điểm', icon: Icon.circle3, group: 'circle', needs: 3 },
  { key: 'tangent', label: 'Tiếp tuyến', hint: 'Click 1 điểm + 1 đường tròn', icon: Icon.tangent, group: 'circle', needs: 2, accepts: ['point', 'circle'] },
  { key: 'angle', label: 'Góc', hint: 'Click 3 điểm (đỉnh ở giữa)', icon: Icon.angle, group: 'measure', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'distance', label: 'Khoảng cách', hint: 'Click 2 điểm', icon: Icon.distance, group: 'measure', needs: 2, accepts: ['point', 'point'] },
  { key: 'area', label: 'Diện tích', hint: 'Click các đỉnh, click lại điểm đầu để đóng', icon: Icon.area, group: 'measure', needs: -1 },
  { key: 'toggleLabel', label: 'Hiện/ẩn tên', hint: 'Click vào đối tượng', icon: Icon.toggleLabel, group: 'edit', needs: 1, accepts: ['any'] },
  { key: 'toggleVisible', label: 'Hiện/ẩn đối tượng', hint: 'Click vào đối tượng', icon: Icon.toggleVisible, group: 'edit', needs: 1, accepts: ['any'] },
  { key: 'delete', label: 'Xoá', hint: 'Click vào đối tượng', icon: Icon.trash, group: 'edit', needs: 1, accepts: ['any'] },
];

const GROUP_LABELS: Record<ToolDef['group'], string> = {
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
  const [pendingCount, setPendingCount] = useState(0);

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

  const clearPending = useCallback(() => {
    pendingRef.current = [];
    setPendingCount(0);
  }, []);

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
      case 'perpBisector':
        create('perpendicularbisector', labels, stroke);
        break;
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
        const [, c] = picks[0] && objKind(picks[0]) === 'point' ? [labels[0], labels[1]] : [labels[1], labels[0]];
        // JSXGraph tangent: needs a glider on the circle. Create glider then tangent.
        const px = picks[0]?.X ? picks[0].X() : 0;
        const py = picks[0]?.Y ? picks[0].Y() : 0;
        const glider = create('glider', [px, py, c], { name: '', size: 2, strokeColor: '#666', visible: false });
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
          }
        } catch { /* ignore */ }
        break;
      }
    }
  }, [create, localIdOf, nextLabel]);

  // Find which JSXGraph object (if any) is at a given mouse event.
  // We use board.getAllObjectsUnderMouse from JSXGraph if available; otherwise iterate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const objectsAt = useCallback((evt: any): JxgObj[] => {
    const b = boardRef.current;
    if (!b) return [];
    try {
      const list: JxgObj[] = [];
      const objs = b.objectsList || [];
      for (const o of objs) {
        try {
          if (o.hasPoint && o.hasPoint(evt.clientX ? evt.clientX : (evt.touches ? evt.touches[0].clientX : 0), evt.clientY ? evt.clientY : (evt.touches ? evt.touches[0].clientY : 0))) {
            list.push(o);
          }
        } catch { /* ignore */ }
      }
      return list;
    } catch {
      return [];
    }
  }, []);

  // Initialize board
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    let cancelled = false;
    (async () => {
      const JXG = (await import('jsxgraph')).default;
      if (cancelled || !containerRef.current) return;
      jxgRef.current = JXG;
      const board = JXG.JSXGraph.initBoard(containerId, {
        boundingbox: initialState?.bbox ?? [-10, 10, 10, -10],
        axis: false, // We manage axis manually via toggle for clean default
        grid: false,
        showCopyright: false,
        showNavigation: true,
        keepAspectRatio: false,
        pan: { enabled: true, needShift: false },
        zoom: { wheel: true },
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

        // Tool: point — always create a new free point at click
        if (t === 'point') {
          const name = nextLabel();
          create('point', [x, y], { name, color: '#0f172a', size: 3, fillColor: '#0f172a', strokeColor: '#0f172a' });
          return;
        }

        // Edit / single-target tools (toggleLabel, toggleVisible, delete)
        if (toolDef.needs === 1 && toolDef.accepts) {
          if (bestHit) finalize(toolDef, [bestHit]);
          return;
        }

        // Polygon / area: variable-length, close on click near starting point
        if (toolDef.needs === -1) {
          // First click: ensure starting point picked or create
          const pick: JxgObj = bestHit && objKind(bestHit) === 'point' ? bestHit : (() => {
            const name = nextLabel();
            return create('point', [x, y], { name, color: '#0f172a', size: 3 });
          })();
          // Check close ring: if click hits first picked point, close polygon
          if (pendingRef.current.length >= 3 && bestHit && bestHit === pendingRef.current[0]) {
            finalize(toolDef, pendingRef.current);
            clearPending();
            return;
          }
          pendingRef.current.push(pick);
          setPendingCount(pendingRef.current.length);
          return;
        }

        // Multi-click fixed tools (segment, line, midpoint, circle, etc.)
        const slot = pendingRef.current.length;
        const kindRequired = toolDef.accepts ? toolDef.accepts[slot] : 'point';
        let pick: JxgObj | null = null;

        if (kindRequired === 'point') {
          if (bestHit && objKind(bestHit) === 'point') {
            pick = bestHit;
          } else {
            const name = nextLabel();
            pick = create('point', [x, y], { name, color: '#0f172a', size: 3, fillColor: '#0f172a', strokeColor: '#0f172a' });
          }
        } else if (kindRequired === 'line') {
          if (bestHit && objKind(bestHit) === 'line') pick = bestHit;
          else return; // must click an existing line
        } else if (kindRequired === 'circle') {
          if (bestHit && objKind(bestHit) === 'circle') pick = bestHit;
          else return;
        } else if (kindRequired === 'any' || !kindRequired) {
          // Default: create new point
          if (bestHit && objKind(bestHit) === 'point') pick = bestHit;
          else {
            const name = nextLabel();
            pick = create('point', [x, y], { name, color: '#0f172a', size: 3 });
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

  const handleClearPending = useCallback(() => {
    clearPending();
  }, [clearPending]);

  const currentToolDef = TOOLS.find(t => t.key === tool);

  // Group tools by category for UI display
  const grouped = TOOLS.reduce<Record<string, ToolDef[]>>((acc, t) => {
    (acc[t.group] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* Toolbar */}
      <div className="border-b bg-white">
        <div className="flex flex-wrap items-center gap-2 px-2 py-1.5">
          {(Object.keys(grouped) as Array<ToolDef['group']>).map((group) => (
            <div key={group} className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50/60 p-0.5">
              <span className="px-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">{GROUP_LABELS[group]}</span>
              {grouped[group].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  title={t.label + (t.hint ? ' — ' + t.hint : '')}
                  aria-label={t.label}
                  aria-pressed={tool === t.key}
                  data-tool={t.key}
                  onClick={() => handleToolChange(t.key)}
                  className={`flex h-7 w-7 items-center justify-center rounded transition ${
                    tool === t.key
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  {t.icon}
                </button>
              ))}
            </div>
          ))}

          <div className="ml-auto flex items-center gap-2 pl-2">
            <label className="flex items-center gap-1 text-xs text-slate-600 select-none">
              <input
                type="checkbox"
                checked={showAxis}
                onChange={(e) => setShowAxis(e.target.checked)}
                data-testid="toggle-axis"
              />
              Trục
            </label>
            <label className="flex items-center gap-1 text-xs text-slate-600 select-none">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                data-testid="toggle-grid"
              />
              Lưới
            </label>
          </div>
        </div>

        {/* Hint bar */}
        <div className="flex items-center justify-between gap-2 border-t bg-slate-50 px-3 py-1 text-xs text-slate-600">
          <span>
            <span className="font-medium text-slate-800">{currentToolDef?.label}</span>
            {currentToolDef?.hint && <span className="ml-2 text-slate-500">— {currentToolDef.hint}</span>}
          </span>
          {pendingCount > 0 && (
            <span className="flex items-center gap-2">
              <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">Đã chọn {pendingCount}</span>
              <button onClick={handleClearPending} className="text-slate-500 hover:text-slate-900 underline-offset-2 hover:underline">huỷ</button>
            </span>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        id={containerId}
        data-testid="jxgmini-container"
        className="flex-1 bg-white"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
};
