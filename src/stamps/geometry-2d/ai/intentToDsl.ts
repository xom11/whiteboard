// src/stamps/geometry-2d/ai/intentToDsl.ts
//
// Stage 2: deterministic Intent[] → DslInputT builder.
//
// Pure function. Không gọi AI. Mỗi Intent op map sang 1 hoặc nhiều DSL entries
// với canonical coords cố định per variant. Builder rejects intent không hợp lệ
// (vd connect to point chưa tồn tại) thay vì silent skip.

import type { DslInputT } from '../dsl/schema';
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
import { newState, type BuildState } from './intent-builders/_types';
import {
  addPoint, addShape, uniqueShapeName, uniquePointName, defaultFreeCoord,
  ensureSegment, resolveSegmentRef, resolveLineRefWithFallback, parseEnds,
  SHAPE_VARIANTS, triangleCanonical, squareCanonical, rectangleCanonical,
  rhombusCanonical, trapezoidCanonical, parallelogramCanonical, quadrilateralCanonical,
  type Pt,
} from './intent-builders/shared';

export { IntentBuilderError } from './intent-builders/_types';
import { IntentBuilderError } from './intent-builders/_types';

// ---------------------------------------------------------------------------
// draw-shape
// ---------------------------------------------------------------------------

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
      const midName = uniquePointName(s, `mid_${c.a}${c.b}`);
      addPoint(s, { name: midName, kind: 'midpoint', p1: c.a, p2: c.b, visible: false });
      const circName = uniqueShapeName(s, `dia_${c.a}${c.b}`);
      addShape(s, { name: circName, kind: 'circleCP', center: midName, surfacePoint: c.a, visible: false });
      const lineRef = resolveSegmentRef(s, c.onLine);
      addPoint(s, { name, kind: 'intersection', ref1: lineRef, ref2: circName, branch: c.which ?? 0 });
      break;
    }
    case 'pointAtDistance':
      ensureSegment(s, c.from, c.through);
      addPoint(s, { name, kind: 'pointAtDistance', from: c.from, through: c.through, distance: c.distance });
      break;
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
