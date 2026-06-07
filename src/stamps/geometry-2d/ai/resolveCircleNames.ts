// src/stamps/geometry-2d/ai/resolveCircleNames.ts
//
// Preprocessor giải quyết naming collision giữa circle name và point ref.
// DSL schema enforce global-unique name (point + shape share namespace), nên
// circle X + point X không cùng tồn tại được. Notation Việt "(O)" thường ám
// chỉ TÂM (point) của đường tròn, nhưng Claude/LLM hay đặt circle name là "O"
// → connect M→O segment fail KIND_MISMATCH.
//
// Pure function — không gọi AI, idempotent:
//   1. Detect circle names được reference như point trong intent khác
//   2. Inject add-point center (circumcenter/incenter dựa trên spec) BEFORE circle
//   3. Rename circle "X" → "X_c"
//   4. Rewrite các CIRCLE-context ref tới circle name → "X_c"

import type { IntentT } from './intent';

export function resolveCircleNameCollisions(intents: readonly IntentT[]): IntentT[] {
  const circleNames = new Set<string>();
  for (const i of intents) {
    if (i.op === 'draw-circle') circleNames.add(i.name);
  }
  if (circleNames.size === 0) return [...intents];

  const pointRefs = collectPointRefs(intents);

  const existingPoints = new Set<string>();
  for (const i of intents) {
    if (i.op === 'draw-shape') {
      for (const l of i.labels) existingPoints.add(l);
    } else if (i.op === 'add-point') {
      existingPoints.add(i.name);
    }
  }

  const collisions = new Set<string>();
  for (const name of circleNames) {
    if (pointRefs.has(name)) collisions.add(name);
  }
  if (collisions.size === 0) return [...intents];

  const rename = new Map<string, string>();
  for (const name of collisions) {
    rename.set(name, `${name}_c`);
  }

  const result: IntentT[] = [];
  for (const i of intents) {
    if (i.op === 'draw-circle' && collisions.has(i.name)) {
      if (!existingPoints.has(i.name)) {
        const centerIntent = makeCenterIntent(i);
        if (centerIntent) {
          result.push(centerIntent);
          existingPoints.add(i.name);
        }
      }
      result.push({ ...i, name: rename.get(i.name)! });
    } else {
      result.push(rewriteCircleRefs(i, rename));
    }
  }

  return result;
}

function makeCenterIntent(circle: Extract<IntentT, { op: 'draw-circle' }>): IntentT | null {
  if (circle.spec === 'through3' && circle.points) {
    return {
      op: 'add-point',
      name: circle.name,
      constraint: { kind: 'circumcenter', of: circle.points },
    };
  }
  if (circle.spec === 'inscribedIn' && circle.triangle) {
    return {
      op: 'add-point',
      name: circle.name,
      constraint: { kind: 'incenter', of: circle.triangle },
    };
  }
  // centerThrough/centerRadius: AI nhiều khi đặt `center === name` (vd `(O)` =
  // circle "O" có center "O") — cần inject `add-point name=center kind=free`
  // để point tồn tại sau khi circle được rename. Trường hợp center khác name
  // thì caller phải đảm bảo point center đã tồn tại (preprocessor không derive).
  if (
    (circle.spec === 'centerThrough' || circle.spec === 'centerRadius') &&
    circle.center === circle.name
  ) {
    return {
      op: 'add-point',
      name: circle.name,
      constraint: { kind: 'free' },
    };
  }
  return null;
}

function collectPointRefs(intents: readonly IntentT[]): Set<string> {
  const refs = new Set<string>();
  // 2-letter line/edge ref (vd "BC", "AO") → tách thành single-letter chars.
  // Cần thiết để detect collision khi line ref CHỨA tên circle (vd `line:"AO"`
  // + circle name "O" → O dùng như point ở "AO", phải inject center O).
  const addEdgeRef = (ref: string) => {
    if (/^[A-Za-z]{2}$/.test(ref)) {
      refs.add(ref[0]);
      refs.add(ref[1]);
    }
  };
  for (const i of intents) {
    if (i.op === 'connect') {
      refs.add(i.from);
      refs.add(i.to);
    } else if (i.op === 'add-point') {
      const c = i.constraint;
      if (c.kind === 'centroid' || c.kind === 'circumcenter' || c.kind === 'incenter' || c.kind === 'orthocenter') {
        for (const v of c.of) refs.add(v);
      } else if (c.kind === 'perpFoot' || c.kind === 'angleBisectorFoot') {
        refs.add(c.from);
        addEdgeRef(c.onLine);
      } else if (c.kind === 'tangentPoint') {
        refs.add(c.from);
      } else if (c.kind === 'secondIntersection') {
        refs.add(c.other);
        addEdgeRef(c.line);
      } else if (c.kind === 'tangencyPoint') {
        addEdgeRef(c.onLine);
      } else if (c.kind === 'midpoint' || c.kind === 'onSegment') {
        addEdgeRef(c.of);
      } else if (c.kind === 'intersection') {
        for (const r of c.of) addEdgeRef(r);
      }
    } else if (i.op === 'draw-circle') {
      if (i.center) refs.add(i.center);
      if (i.through) refs.add(i.through);
      if (i.points) for (const p of i.points) refs.add(p);
      if (i.triangle) for (const p of i.triangle) refs.add(p);
    } else if (i.op === 'draw-line') {
      if (i.through) refs.add(i.through);
      if (i.from) refs.add(i.from);
      if (i.to) addEdgeRef(i.to);
      // i.circle là circle ref — skip.
    } else if (i.op === 'mark-shape') {
      for (const l of i.labels) refs.add(l);
    }
  }
  return refs;
}

function rewriteCircleRefs(intent: IntentT, rename: Map<string, string>): IntentT {
  if (intent.op === 'add-point') {
    const c = intent.constraint;
    if (
      c.kind === 'tangencyPoint' ||
      c.kind === 'tangentPoint' ||
      c.kind === 'secondIntersection' ||
      c.kind === 'externalToCircle'
    ) {
      const newCircle = rename.get(c.circle);
      if (newCircle) {
        return { ...intent, constraint: { ...c, circle: newCircle } };
      }
    } else if (c.kind === 'circleIntersection') {
      const newC1 = rename.get(c.c1) ?? c.c1;
      const newC2 = rename.get(c.c2) ?? c.c2;
      if (newC1 !== c.c1 || newC2 !== c.c2) {
        return { ...intent, constraint: { ...c, c1: newC1, c2: newC2 } };
      }
    }
  } else if (intent.op === 'draw-line') {
    if (intent.circle && rename.has(intent.circle)) {
      return { ...intent, circle: rename.get(intent.circle)! };
    }
  }
  return intent;
}
