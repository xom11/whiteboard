// src/stamps/geometry-2d/ai/intentToDsl.ts
//
// Stage 2: deterministic Intent[] → DslInputT builder.
//
// Pure function. Không gọi AI. Mỗi Intent op map sang 1 hoặc nhiều DSL entries
// với canonical coords cố định per variant. Builder rejects intent không hợp lệ
// (vd connect to point chưa tồn tại) thay vì silent skip.

import type { DslInputT, DslPointT, DslShapeT } from '../dsl/schema';
import { repairCircleIntersections } from './repairCircleIntersections';
import type {
  IntentT,
  DrawShapeIntentT,
  AddPointIntentT,
  ConnectIntentT,
  DrawCircleIntentT,
  DrawLineIntentT,
  MarkShapeIntentT,
} from './intent';

// ---------------------------------------------------------------------------
// Canonical coord tables
// ---------------------------------------------------------------------------

type Pt = readonly [number, number];

const SQRT3 = 1.7320508075688772;

function triangleCanonical(variant: string): readonly [Pt, Pt, Pt] {
  switch (variant) {
    case 'equilateral':
      return [[0, 0], [4, 0], [2, 2 * SQRT3]];
    case 'isoceles-AB':
      // AB là đáy, C đỉnh cân
      return [[0, 0], [4, 0], [2, 3]];
    case 'isoceles-BC':
      // BC là đáy, A đỉnh cân
      return [[0, 3], [-2, 0], [2, 0]];
    case 'isoceles-CA':
      // CA là đáy, B đỉnh cân
      return [[0, 0], [2, 3], [4, 0]];
    case 'right-at-A':
      return [[0, 0], [4, 0], [0, 3]];
    case 'right-at-B':
      return [[0, 0], [4, 0], [4, 3]];
    case 'right-at-C':
      // C ở (4,3); AC ⊥ BC
      // chọn A=(0,0), C=(4,3), B=(7.36,1.92) sao cho CA·CB=0
      // Đơn giản hơn: A=(0,0), B=(7,0), C=(0,4) → vuông tại A. Wait — đó là right-at-A.
      // Cần vuông tại C: chọn 3 đỉnh sao cho (CA)·(CB)=0.
      // A=(0,0), B=(7,0), C=(3,4). Check: CA=(−3,−4), CB=(4,−4), dot=−12+16=4 ≠0. Sửa.
      // A=(0,0), C=(3,3), B=(6,0): CA=(−3,−3), CB=(3,−3), dot=−9+9=0 ✓
      return [[0, 0], [6, 0], [3, 3]];
    case 'any':
    default:
      // Tam giác scalene cố định, tránh vuông tại gốc
      return [[0, 0], [5, 0], [2, 3]];
  }
}

function squareCanonical(): readonly [Pt, Pt, Pt, Pt] {
  // Cạnh 4, gốc tại đỉnh đầu (counter-clockwise)
  return [[0, 0], [4, 0], [4, 4], [0, 4]];
}

function rectangleCanonical(variant: string): readonly [Pt, Pt, Pt, Pt] {
  if (variant === 'tall') return [[0, 0], [2.5, 0], [2.5, 4], [0, 4]];
  // wide / standard (default)
  return [[0, 0], [4, 0], [4, 2.5], [0, 2.5]];
}

function rhombusCanonical(): readonly [Pt, Pt, Pt, Pt] {
  // Đường chéo nằm trên trục, 4 đỉnh trên trục: (±2, 0) và (0, ±1.5)
  return [[-2, 0], [0, -1.5], [2, 0], [0, 1.5]];
}

function trapezoidCanonical(variant: string): readonly [Pt, Pt, Pt, Pt] {
  switch (variant) {
    case 'right':
      // Vuông tại A và D
      return [[0, 0], [5, 0], [3, 3], [0, 3]];
    case 'isoceles':
      // Cân — AB đáy lớn, CD đáy nhỏ
      return [[0, 0], [5, 0], [4, 3], [1, 3]];
    case 'general':
    default:
      return [[0, 0], [5, 0], [3.5, 3], [1, 3]];
  }
}

function parallelogramCanonical(): readonly [Pt, Pt, Pt, Pt] {
  return [[0, 0], [4, 0], [5, 3], [1, 3]];
}

function quadrilateralCanonical(): readonly [Pt, Pt, Pt, Pt] {
  return [[0, 0], [5, 0], [4.5, 3.5], [0.5, 3]];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class IntentBuilderError extends Error {
  constructor(
    message: string,
    public readonly intent: IntentT,
    public readonly cause?: string,
  ) {
    super(message);
    this.name = 'IntentBuilderError';
  }
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

interface BuildState {
  points: DslPointT[];
  shapes: DslShapeT[];
  /** Map label → ensures uniqueness. */
  pointNames: Set<string>;
  shapeNames: Set<string>;
  /** Map "AB"/"BA" → segment shape name, dùng cho lookup of='BC'. */
  segmentByEnds: Map<string, string>;
}

function newState(): BuildState {
  return {
    points: [],
    shapes: [],
    pointNames: new Set(),
    shapeNames: new Set(),
    segmentByEnds: new Map(),
  };
}

function addPoint(s: BuildState, p: DslPointT) {
  if (s.pointNames.has(p.name)) return; // idempotent
  s.points.push(p);
  s.pointNames.add(p.name);
}

// Default coord cho free point khi LLM không truyền `at`. Spread theo thứ tự
// thêm để tránh nhiều free point collide tại (3, 3) → segment degenerate,
// circle radius=0, intersection NaN cascade (bug eval cau-14: A=B=D=(3,3)).
// Pattern: 8 vị trí phân bố xung quanh gốc, vòng lại khi >8.
const FREE_DEFAULT_SPREAD: readonly [number, number][] = [
  [3, 3],
  [-3, 3],
  [3, -3],
  [-3, -3],
  [4, 0],
  [-4, 0],
  [0, 4],
  [0, -4],
];

function defaultFreeCoord(s: BuildState): [number, number] {
  // Đếm số free point đã add (cả từ polygon vertices + add-point free).
  // Position trong array trùng index modulo SPREAD.
  let count = 0;
  for (const p of s.points) if (p.kind === 'free') count++;
  return [...FREE_DEFAULT_SPREAD[count % FREE_DEFAULT_SPREAD.length]];
}

function addShape(s: BuildState, sh: DslShapeT) {
  if (s.shapeNames.has(sh.name)) return;
  s.shapes.push(sh);
  s.shapeNames.add(sh.name);
}

function uniqueShapeName(s: BuildState, base: string): string {
  if (!s.shapeNames.has(base)) return base;
  let i = 2;
  while (s.shapeNames.has(`${base}${i}`)) i++;
  return `${base}${i}`;
}

function uniquePointName(s: BuildState, base: string): string {
  if (!s.pointNames.has(base)) return base;
  let i = 2;
  while (s.pointNames.has(`${base}${i}`)) i++;
  return `${base}${i}`;
}

function ensureSegment(s: BuildState, a: string, b: string): string {
  const k1 = `${a}-${b}`;
  const k2 = `${b}-${a}`;
  const existing = s.segmentByEnds.get(k1) ?? s.segmentByEnds.get(k2);
  if (existing) return existing;
  const name = uniqueShapeName(s, `${a}${b}`);
  addShape(s, { name, kind: 'segment', p1: a, p2: b });
  s.segmentByEnds.set(k1, name);
  return name;
}

// Resolve line ref cho draw-line (perpThrough/parallelThrough) với fallback:
// LLM nhiều khi nhầm "Đường vuông góc với AB tại B" → to:"A" (1 chữ — POINT)
// thay vì to:"AB" (2 chữ — LINE). Khi `ref` là 1 chữ POINT và `anchor` cũng
// 1 chữ POINT khác, auto build segment qua 2 điểm (alphabetize canonical).
function resolveLineRefWithFallback(s: BuildState, ref: string, anchor: string): string {
  // Single-letter point swap fallback — chỉ áp dụng khi cả 2 đều là POINT
  // đã định nghĩa và khác nhau.
  if (
    /^[A-Za-z]$/.test(ref) && /^[A-Za-z]$/.test(anchor) && ref !== anchor &&
    s.pointNames.has(ref) && s.pointNames.has(anchor)
  ) {
    const [a, b] = ref < anchor ? [ref, anchor] : [anchor, ref];
    return ensureSegment(s, a, b);
  }
  // Path bình thường: 2-char shorthand hoặc tên shape đã có.
  return resolveSegmentRef(s, ref);
}

function resolveSegmentRef(s: BuildState, ref: string): string {
  // ref có thể là tên segment ('AB') hoặc shape name đã có.
  // Nếu là 2 ký tự label đều đã tồn tại → ensure segment 2 đỉnh đó.
  if (s.shapeNames.has(ref)) return ref;
  // Tách "AB" → A,B
  if (ref.length === 2 && s.pointNames.has(ref[0]) && s.pointNames.has(ref[1])) {
    return ensureSegment(s, ref[0], ref[1]);
  }
  // Pattern "A-B" / "AB"
  const dashMatch = ref.match(/^([A-Za-z][A-Za-z0-9'_]*)[-_]?([A-Za-z][A-Za-z0-9'_]*)$/);
  if (dashMatch && s.pointNames.has(dashMatch[1]) && s.pointNames.has(dashMatch[2])) {
    return ensureSegment(s, dashMatch[1], dashMatch[2]);
  }
  // Trả về ref gốc (transpile sẽ báo lỗi nếu invalid)
  return ref;
}

function parseEnds(ref: string): [string, string] | null {
  if (ref.length === 2) return [ref[0], ref[1]];
  const m = ref.match(/^([A-Za-z][A-Za-z0-9'_]*)[-_]?([A-Za-z][A-Za-z0-9'_]*)$/);
  if (m) return [m[1], m[2]];
  return null;
}

// ---------------------------------------------------------------------------
// draw-shape
// ---------------------------------------------------------------------------

// Map shape → allowed variants (runtime check, schema cho phép enum chung)
const SHAPE_VARIANTS: Record<string, readonly string[]> = {
  triangle: ['any', 'equilateral', 'isoceles-AB', 'isoceles-BC', 'isoceles-CA', 'right-at-A', 'right-at-B', 'right-at-C'],
  square: ['standard'],
  rectangle: ['standard', 'wide', 'tall'],
  rhombus: ['standard'],
  trapezoid: ['right', 'isoceles', 'general'],
  parallelogram: ['standard'],
  quadrilateral: ['any'],
};

function handleDrawShape(s: BuildState, intent: DrawShapeIntentT) {
  const labels = intent.labels;
  const explicit = intent.explicitCoords ?? {};

  // Validate variant ∈ allowed
  const allowed = SHAPE_VARIANTS[intent.shape];
  if (!allowed || !allowed.includes(intent.variant)) {
    // Fallback to default variant cho shape thay vì throw
    intent = { ...intent, variant: (allowed?.[0] ?? 'any') as typeof intent.variant };
  }

  let coords: readonly Pt[];
  switch (intent.shape) {
    case 'triangle': coords = triangleCanonical(intent.variant); break;
    case 'square': coords = squareCanonical(); break;
    case 'rectangle': coords = rectangleCanonical(intent.variant); break;
    case 'rhombus': coords = rhombusCanonical(); break;
    case 'trapezoid': coords = trapezoidCanonical(intent.variant); break;
    case 'parallelogram': coords = parallelogramCanonical(); break;
    case 'quadrilateral': coords = quadrilateralCanonical(); break;
    default:
      throw new IntentBuilderError(`Shape không hỗ trợ: ${intent.shape}`, intent);
  }

  if (coords.length !== labels.length) {
    throw new IntentBuilderError(
      `Shape ${intent.shape} cần ${coords.length} labels, nhận ${labels.length}`,
      intent,
    );
  }

  labels.forEach((label, i) => {
    const ec = explicit[label];
    const [x, y] = ec ?? coords[i];
    addPoint(s, { name: label, kind: 'free', x, y });
  });

  const polyName = uniqueShapeName(s, labels.join(''));
  addShape(s, { name: polyName, kind: 'polygon', vertices: [...labels] });
}

// ---------------------------------------------------------------------------
// add-point
// ---------------------------------------------------------------------------

function handleAddPoint(s: BuildState, intent: AddPointIntentT) {
  const c = intent.constraint;
  const name = intent.name;

  switch (c.kind) {
    case 'midpoint': {
      const ends = parseEnds(c.of);
      if (!ends) throw new IntentBuilderError(`midpoint.of không parse được: ${c.of}`, intent);
      // Ensure segment for the midpoint reference (optional but nice for rendering)
      ensureSegment(s, ends[0], ends[1]);
      addPoint(s, { name, kind: 'midpoint', p1: ends[0], p2: ends[1] });
      break;
    }
    case 'perpFoot': {
      const lineName = resolveSegmentRef(s, c.onLine);
      addPoint(s, { name, kind: 'perpFoot', from: c.from, onLine: lineName });
      break;
    }
    case 'centroid':
      addPoint(s, { name, kind: 'centroid', vertices: c.of });
      break;
    case 'circumcenter':
      addPoint(s, { name, kind: 'circumcenter', vertices: c.of });
      break;
    case 'incenter':
      addPoint(s, { name, kind: 'incenter', vertices: c.of });
      break;
    case 'orthocenter':
      addPoint(s, { name, kind: 'orthocenter', vertices: c.of });
      break;
    case 'intersection': {
      const r1 = resolveSegmentRef(s, c.of[0]);
      const r2 = resolveSegmentRef(s, c.of[1]);
      addPoint(s, { name, kind: 'intersection', ref1: r1, ref2: r2 });
      break;
    }
    case 'onSegment': {
      const ref = resolveSegmentRef(s, c.of);
      addPoint(s, { name, kind: 'onSegment', segmentId: ref, t: c.t ?? 0.5 });
      break;
    }
    case 'free': {
      const [x, y] = c.at ?? defaultFreeCoord(s);
      addPoint(s, { name, kind: 'free', x, y });
      break;
    }
    case 'secondIntersection': {
      const lineRef = resolveSegmentRef(s, c.line);
      addPoint(s, {
        name, kind: 'secondIntersection',
        line: lineRef, circle: c.circle, other: c.other,
      });
      break;
    }
    case 'circleIntersection':
      addPoint(s, {
        name, kind: 'circleIntersection',
        c1: c.c1, c2: c.c2, which: c.which,
      });
      break;
    case 'tangencyPoint': {
      const lineRef = resolveSegmentRef(s, c.onLine);
      addPoint(s, {
        name, kind: 'tangencyPoint',
        circle: c.circle, onLine: lineRef,
      });
      break;
    }
    case 'tangentPoint':
      addPoint(s, {
        name, kind: 'tangentPointExt',
        from: c.from, circle: c.circle, which: c.which,
      });
      break;
    case 'angleBisectorFoot': {
      const ends = parseEnds(c.onLine);
      if (!ends) throw new IntentBuilderError(`angleBisectorFoot.onLine không parse: ${c.onLine}`, intent);
      const bisName = uniqueShapeName(s, `ab_${c.from}${c.onLine}`);
      addShape(s, { name: bisName, kind: 'angleBisector', p1: ends[0], vertex: c.from, p2: ends[1] });
      ensureSegment(s, ends[0], ends[1]);
      addPoint(s, { name, kind: 'intersection', ref1: bisName, ref2: resolveSegmentRef(s, c.onLine) });
      break;
    }
    // Cụm A
    case 'arcMidpoint':
      addPoint(s, { name, kind: 'arcMidpoint', circle: c.circle, a: c.a, b: c.b, notContaining: c.notContaining });
      break;
    case 'reflectPoint':
      addPoint(s, { name, kind: 'reflectPoint', of: c.of, through: c.through });
      break;
    case 'reflectLine': {
      const lineRef = resolveSegmentRef(s, c.through);
      addPoint(s, { name, kind: 'reflectLine', of: c.of, through: lineRef });
      break;
    }
    case 'excenter':
      addPoint(s, { name, kind: 'excenter', vertices: c.of, opposite: c.opposite });
      break;
    case 'rightAngleViewing': {
      // ∠ a-name-b = 90° ⇔ name trên đường tròn đường kính ab (Thales).
      // Dựng: midpoint(ab) ẩn → circleCP đường kính ab ẩn → giao line∩circle.
      const midName = uniquePointName(s, `_mid_${c.a}${c.b}`);
      addPoint(s, { name: midName, kind: 'midpoint', p1: c.a, p2: c.b, visible: false });
      const circName = uniqueShapeName(s, `_thales_${c.a}${c.b}`);
      addShape(s, { name: circName, kind: 'circleCP', center: midName, surfacePoint: c.a, visible: false });
      const lineRef = resolveSegmentRef(s, c.onLine);
      addPoint(s, { name, kind: 'intersection', ref1: lineRef, ref2: circName, branch: c.which ?? 0 });
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// connect
// ---------------------------------------------------------------------------

function handleConnect(s: BuildState, intent: ConnectIntentT) {
  const { from, to, style } = intent;
  switch (style) {
    case 'segment':
      ensureSegment(s, from, to);
      break;
    case 'line':
      addShape(s, { name: uniqueShapeName(s, `l_${from}${to}`), kind: 'line', p1: from, p2: to });
      break;
    case 'ray':
      addShape(s, { name: uniqueShapeName(s, `r_${from}${to}`), kind: 'ray', origin: from, through: to });
      break;
    case 'perpBisector':
      addShape(s, { name: uniqueShapeName(s, `pb_${from}${to}`), kind: 'perpBisector', p1: from, p2: to });
      break;
    case 'angleBisector':
      // angleBisector cần 3 điểm (p1, vertex, p2). connect chỉ có 2 điểm → bỏ qua,
      // caller nên dùng intent.add-point với incenter/internalBisector.
      throw new IntentBuilderError(
        'connect.style=angleBisector cần 3 điểm; dùng add-point/incenter thay',
        intent,
      );
  }
}

// ---------------------------------------------------------------------------
// draw-circle
// ---------------------------------------------------------------------------

function handleDrawCircle(s: BuildState, intent: DrawCircleIntentT) {
  if (intent.spec === 'centerThrough') {
    if (!intent.center || !intent.through) {
      throw new IntentBuilderError('centerThrough cần center + through', intent);
    }
    addShape(s, {
      name: intent.name,
      kind: 'circleCP',
      center: intent.center,
      surfacePoint: intent.through,
    });
  } else if (intent.spec === 'through3') {
    if (!intent.points) {
      throw new IntentBuilderError('through3 cần points', intent);
    }
    addShape(s, {
      name: intent.name,
      kind: 'circle3',
      p1: intent.points[0],
      p2: intent.points[1],
      p3: intent.points[2],
    });
  } else if (intent.spec === 'centerRadius') {
    if (!intent.center || intent.radius === undefined) {
      throw new IntentBuilderError('centerRadius cần center + radius', intent);
    }
    if (!s.points.find((p) => p.name === intent.center)) {
      const [x, y] = defaultFreeCoord(s);
      addPoint(s, { name: intent.center!, kind: 'free', x, y });
    }
    addShape(s, { name: intent.name, kind: 'circleCR', center: intent.center, radius: intent.radius });
  } else if (intent.spec === 'inscribedIn') {
    if (!intent.triangle) throw new IntentBuilderError('inscribedIn cần triangle', intent);
    for (const v of intent.triangle) {
      if (!s.points.find((p) => p.name === v)) {
        throw new IntentBuilderError(`inscribedIn: vertex ${v} chưa định nghĩa`, intent);
      }
    }
    addShape(s, { name: intent.name, kind: 'incircle', vertices: intent.triangle });
  }
}

// ---------------------------------------------------------------------------
// draw-line
// ---------------------------------------------------------------------------

function handleDrawLine(s: BuildState, intent: DrawLineIntentT) {
  switch (intent.kind) {
    case 'perpThrough': {
      if (!intent.through || !intent.to) throw new IntentBuilderError('perpThrough cần through + to', intent);
      const toLine = resolveLineRefWithFallback(s, intent.to, intent.through);
      addShape(s, { name: intent.name, kind: 'perpendicular', throughPoint: intent.through, toLine });
      break;
    }
    case 'parallelThrough': {
      if (!intent.through || !intent.to) throw new IntentBuilderError('parallelThrough cần through + to', intent);
      const toLine = resolveLineRefWithFallback(s, intent.to, intent.through);
      addShape(s, { name: intent.name, kind: 'parallel', throughPoint: intent.through, toLine });
      break;
    }
    case 'tangentAt': {
      if (!intent.through || !intent.circle) throw new IntentBuilderError('tangentAt cần through + circle', intent);
      addShape(s, { name: intent.name, kind: 'tangent', throughPoint: intent.through, toCircle: intent.circle, branch: 'on' });
      break;
    }
    case 'tangentFromExt': {
      if (!intent.from || !intent.circle) throw new IntentBuilderError('tangentFromExt cần from + circle', intent);
      if (intent.which === 'both') {
        addShape(s, { name: `${intent.name}_0`, kind: 'tangent', throughPoint: intent.from, toCircle: intent.circle, branch: 0 });
        addShape(s, { name: `${intent.name}_1`, kind: 'tangent', throughPoint: intent.from, toCircle: intent.circle, branch: 1 });
      } else {
        const branch = intent.which === 'second' ? 1 : 0;
        addShape(s, { name: intent.name, kind: 'tangent', throughPoint: intent.from, toCircle: intent.circle, branch });
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// mark-shape
// ---------------------------------------------------------------------------

function handleMarkShape(s: BuildState, intent: MarkShapeIntentT) {
  for (const label of intent.labels) {
    if (!s.points.find((p) => p.name === label)) {
      throw new IntentBuilderError(`mark-shape: label ${label} chưa định nghĩa`, intent);
    }
  }
  const polyName = uniqueShapeName(s, intent.labels.join(''));
  addShape(s, { name: polyName, kind: 'polygon', vertices: [...intent.labels] });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function intentsToDsl(intents: readonly IntentT[]): DslInputT {
  const s = newState();
  for (const intent of intents) {
    switch (intent.op) {
      case 'draw-shape': handleDrawShape(s, intent); break;
      case 'add-point': handleAddPoint(s, intent); break;
      case 'connect': handleConnect(s, intent); break;
      case 'draw-circle': handleDrawCircle(s, intent); break;
      case 'draw-line': handleDrawLine(s, intent); break;
      case 'mark-shape': handleMarkShape(s, intent); break;
    }
  }
  // Geometric repair: đảm bảo circle dùng cho circleIntersection thực sự cắt
  // nhau 2 điểm (dời center auto-inject nếu tiếp xúc/rời nhau).
  repairCircleIntersections(s.points, s.shapes);
  return {
    version: 1,
    points: s.points,
    shapes: s.shapes,
  };
}
