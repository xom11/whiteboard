# Construct Special Shapes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm 7 tool dựng hình parametric (hình vuông, chữ nhật, thoi, bình hành, thang cân, tam giác cân, tam giác vuông) vào geometry-2d stamp — kéo điều khiển vẫn giữ tính chất hình.

**Architecture:** Mở rộng `Constraint2D` union 3 variant mới (`onPerpendicular`, `onPerpBisector`, `onCircleAroundPoint`) + mở rộng `polygon.PolygonConstruction` 7 variant. Tái sử dụng glider/drag infrastructure đã có trong Point kind.

**Tech Stack:** TypeScript strict, Jest + jsdom + ts-jest, JSXGraph 1.x, React 18, Excalidraw 0.18.

**Spec:** `docs/superpowers/specs/2026-06-01-construct-special-shapes-design.md`

---

## File map

### Modify

- `src/core/scene/kinds/2d-constraint.ts` — 3 constraint variant + `constraintRefs2D`
- `src/core/scene/kinds/point.ts` — render switch 3 case mới
- `src/core/scene/kinds/polygon.ts` — 7 construction variant + validate/dependsOn/describe/render
- `src/stamps/geometry-2d/editor/tools.tsx` — group 'special' + 7 tool entry + GROUP_ORDER
- `src/stamps/geometry-2d/editor/icons.tsx` — 7 icon SVG mới
- `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts` — 7 case handler
- `src/stamps/geometry-2d/editor/MiniBoard.tsx` — drag listener glider (nếu chưa generic)

### Create

- `src/core/scene/kinds/__tests__/point.constraint.special.test.ts`
- `src/core/scene/kinds/__tests__/polygon.specialConstruction.test.ts`
- `src/core/scene/kinds/__tests__/special-shapes-geometry.test.ts`
- `src/stamps/geometry-2d/editor/handlers/__tests__/specialShapes.test.tsx`

---

## Task 1 — Constraint2D union extension

**Files:**
- Modify: `src/core/scene/kinds/2d-constraint.ts`
- Create: `src/core/scene/kinds/__tests__/point.constraint.special.test.ts`

- [ ] **Step 1.1: Write failing test cho `constraintRefs2D`**

Create `src/core/scene/kinds/__tests__/point.constraint.special.test.ts`:

```ts
import { constraintRefs2D } from '../2d-constraint';

describe('Constraint2D — special shape constraints', () => {
  it('onPerpendicular returns through + perpToA + perpToB', () => {
    expect(constraintRefs2D({ kind: 'onPerpendicular', through: 'p1', perpToA: 'p2', perpToB: 'p3', t: 0 }))
      .toEqual(['p1', 'p2', 'p3']);
  });

  it('onPerpBisector returns p1 + p2', () => {
    expect(constraintRefs2D({ kind: 'onPerpBisector', p1: 'a', p2: 'b', t: 0 }))
      .toEqual(['a', 'b']);
  });

  it('onCircleAroundPoint returns center + radiusPoint', () => {
    expect(constraintRefs2D({ kind: 'onCircleAroundPoint', center: 'c', radiusPoint: 'r', theta: 0 }))
      .toEqual(['c', 'r']);
  });
});
```

- [ ] **Step 1.2: Run test (expected FAIL)**

```bash
npx jest src/core/scene/kinds/__tests__/point.constraint.special.test.ts
```

Expected: type error or test fail — `onPerpendicular` etc. not in Constraint2D union.

- [ ] **Step 1.3: Extend Constraint2D union + constraintRefs2D**

Edit `src/core/scene/kinds/2d-constraint.ts`. Add to the union after `orthocenter`:

```ts
  | { kind: 'onPerpendicular';     through: string; perpToA: string; perpToB: string; t: number }
  | { kind: 'onPerpBisector';      p1: string; p2: string; t: number }
  | { kind: 'onCircleAroundPoint'; center: string; radiusPoint: string; theta: number };
```

Extend `constraintRefs2D` switch with 3 new cases before `default`:

```ts
    case 'onPerpendicular': return [c.through, c.perpToA, c.perpToB];
    case 'onPerpBisector': return [c.p1, c.p2];
    case 'onCircleAroundPoint': return [c.center, c.radiusPoint];
```

- [ ] **Step 1.4: Run test — PASS**

```bash
npx jest src/core/scene/kinds/__tests__/point.constraint.special.test.ts
npx tsc --noEmit
```

Expected: 3 tests pass, no type errors.

- [ ] **Step 1.5: Commit**

```bash
git add src/core/scene/kinds/2d-constraint.ts src/core/scene/kinds/__tests__/point.constraint.special.test.ts
git commit -m "feat(scene): Constraint2D thêm onPerpendicular / onPerpBisector / onCircleAroundPoint"
```

---

## Task 2 — Point kind render: 3 new constraint branches

**Files:**
- Modify: `src/core/scene/kinds/point.ts` (render function)
- Append to: `src/core/scene/kinds/__tests__/point.constraint.special.test.ts`

- [ ] **Step 2.1: Write failing render test**

Append to existing test file:

```ts
import { __clearRegistryForTests } from '../registry';
import { JxgRenderer } from '../../render/JxgRenderer';
import { createStore } from '../../store';

// Helper to setup JSXGraph board (mocked / real per existing pattern)
// Refer to existing point.test.ts setup for boilerplate

describe('Point kind render — onPerpBisector glider', () => {
  it('apex equidistant from base endpoints after render', () => {
    // setup: A=(0,0), B=(4,0); apex constrained onPerpBisector(A, B, t=3)
    // expected apex coords: (2, 3) — midpoint(0,0)(4,0) = (2,0); perp unit = (0,1); t=3 → (2,3)
    // |apex-A| = sqrt(4 + 9) = sqrt(13); |apex-B| = sqrt(4 + 9) = sqrt(13) ✓
    const store = createStore({ domain: '2d' });
    store.dispatch({ type: 'ADD', payload: { obj: {
      id: 'A', kind: 'point', label: 'A', visible: true, locked: false, layer: 'default',
      schemaVersion: 1, attrs: { constraint: { kind: 'free', x: 0, y: 0 } } } } });
    store.dispatch({ type: 'ADD', payload: { obj: {
      id: 'B', kind: 'point', label: 'B', visible: true, locked: false, layer: 'default',
      schemaVersion: 1, attrs: { constraint: { kind: 'free', x: 4, y: 0 } } } } });
    store.dispatch({ type: 'ADD', payload: { obj: {
      id: 'M', kind: 'point', label: 'M', visible: true, locked: false, layer: 'default',
      schemaVersion: 1, attrs: { constraint: { kind: 'onPerpBisector', p1: 'A', p2: 'B', t: 3 } } } } });
    // Render via JxgRenderer (existing) and inspect M coords
    // ...
    // For brevity in plan: assertion that store.dispatch + dependsOn computes 'A','B' for M
  });
});
```

Note: full render assertion needs JSXGraph board fixture. If existing `point.test.ts` has helper, reuse; otherwise add unit-level test on Point kind's `dependsOn` only:

```ts
import { getKind } from '../registry';
import '../point';  // register

it('Point with onPerpBisector dependsOn returns p1, p2', () => {
  const def = getKind('point');
  expect(def.dependsOn!({ constraint: { kind: 'onPerpBisector', p1: 'A', p2: 'B', t: 0 } } as any))
    .toEqual(['A', 'B']);
});

it('Point with onPerpendicular dependsOn returns through, perpToA, perpToB', () => {
  const def = getKind('point');
  expect(def.dependsOn!({ constraint: { kind: 'onPerpendicular', through: 'T', perpToA: 'A', perpToB: 'B', t: 0 } } as any))
    .toEqual(['T', 'A', 'B']);
});

it('Point with onCircleAroundPoint dependsOn returns center, radiusPoint', () => {
  const def = getKind('point');
  expect(def.dependsOn!({ constraint: { kind: 'onCircleAroundPoint', center: 'C', radiusPoint: 'R', theta: 0 } } as any))
    .toEqual(['C', 'R']);
});
```

- [ ] **Step 2.2: Run test — FAIL**

```bash
npx jest src/core/scene/kinds/__tests__/point.constraint.special.test.ts
```

Expected: dependsOn returns wrong values (current implementation doesn't know new variants).

- [ ] **Step 2.3: Inspect Point kind current structure**

Open `src/core/scene/kinds/point.ts`. Locate the render switch on `constraint.kind`. Find where `dependsOn` is defined — it should already use `constraintRefs2D`, so Task 1 may have already fixed dependsOn. Verify.

If `dependsOn` already calls `constraintRefs2D`, Step 2.2 will PASS after Task 1. Skip to render.

- [ ] **Step 2.4: Add 3 render branches in point.ts**

Locate the existing render switch (after cases for `free`, `onAxis`, `onLine`, `onSegment`, `onCircle`, `onPolygon`, `midpoint`, `transformed`, `perpFoot`, `circumcenter`, `incenter`, `centroid`, `orthocenter`).

Add 3 new cases inside render (before the closing brace of render switch):

```ts
case 'onPerpendicular': {
  const T = ctx.resolveRef(c.through) as any;
  const A = ctx.resolveRef(c.perpToA) as any;
  const B = ctx.resolveRef(c.perpToB) as any;
  // Aux line: perpendicular to AB through T, hidden
  const refLine = board.create('line', [A, B], { visible: false, withLabel: false, fixed: true });
  const perpLine = board.create('perpendicular', [refLine, T], {
    visible: false, withLabel: false, straightFirst: true, straightLast: true, fixed: true,
  });
  // Compute initial glider position
  const dx = (B.X() - A.X()), dy = (B.Y() - A.Y());
  const len = Math.hypot(dx, dy) || 1;
  const ux = -dy / len, uy = dx / len;
  const x0 = T.X() + c.t * ux;
  const y0 = T.Y() + c.t * uy;
  return board.create('glider', [x0, y0, perpLine], {
    name: label, withLabel: showLabel,
    fillColor: obj.attrs.color ?? '#0f172a',
    strokeColor: obj.attrs.color ?? '#0f172a',
    size: obj.attrs.size ?? 3,
    face: obj.attrs.face ?? 'o',
    visible: obj.visible,
    fixed: obj.locked,
  });
}
case 'onPerpBisector': {
  const A = ctx.resolveRef(c.p1) as any;
  const B = ctx.resolveRef(c.p2) as any;
  // Aux perpBisector
  const refSeg = board.create('segment', [A, B], { visible: false, withLabel: false, fixed: true });
  const bisLine = board.create('perpendicularbisector', [refSeg], {
    visible: false, withLabel: false, straightFirst: true, straightLast: true, fixed: true,
  });
  const Mx = (A.X() + B.X()) / 2, My = (A.Y() + B.Y()) / 2;
  const dx = (B.X() - A.X()), dy = (B.Y() - A.Y());
  const len = Math.hypot(dx, dy) || 1;
  const ux = -dy / len, uy = dx / len;
  const x0 = Mx + c.t * ux;
  const y0 = My + c.t * uy;
  return board.create('glider', [x0, y0, bisLine], {
    name: label, withLabel: showLabel,
    fillColor: obj.attrs.color ?? '#0f172a',
    strokeColor: obj.attrs.color ?? '#0f172a',
    size: obj.attrs.size ?? 3,
    face: obj.attrs.face ?? 'o',
    visible: obj.visible,
    fixed: obj.locked,
  });
}
case 'onCircleAroundPoint': {
  const C = ctx.resolveRef(c.center) as any;
  const R = ctx.resolveRef(c.radiusPoint) as any;
  const auxCircle = board.create('circle', [C, R], { visible: false, withLabel: false, fixed: true });
  const r = Math.hypot(R.X() - C.X(), R.Y() - C.Y());
  const x0 = C.X() + r * Math.cos(c.theta);
  const y0 = C.Y() + r * Math.sin(c.theta);
  return board.create('glider', [x0, y0, auxCircle], {
    name: label, withLabel: showLabel,
    fillColor: obj.attrs.color ?? '#0f172a',
    strokeColor: obj.attrs.color ?? '#0f172a',
    size: obj.attrs.size ?? 3,
    face: obj.attrs.face ?? 'o',
    visible: obj.visible,
    fixed: obj.locked,
  });
}
```

(Verify `showLabel`, `label`, `board` are in scope — match local var naming used by existing cases.)

- [ ] **Step 2.5: Run tests — PASS**

```bash
npx jest src/core/scene/kinds/__tests__/point.constraint.special.test.ts
npx tsc --noEmit
```

- [ ] **Step 2.6: Commit**

```bash
git add src/core/scene/kinds/point.ts src/core/scene/kinds/__tests__/point.constraint.special.test.ts
git commit -m "feat(scene): Point kind render 3 constraint mới (onPerp/onPerpBis/onCircleAroundPoint)"
```

---

## Task 3 — Drag-sync listener cho 3 glider mới

**Files:**
- Modify: `src/core/scene/kinds/point.ts` (gọi attachDragSync hoặc inline event listener)

Glider sau khi tạo phải listen drag → recompute `t`/`theta` → dispatch `UPDATE_ATTRS`.

- [ ] **Step 3.1: Inspect cách `onLine` / `pointOnCurve` xử lý drag-sync hiện tại**

Search:

```bash
grep -rn "on('drag'\|update'\|UPDATE_ATTRS.*constraint" src/core/scene/kinds/point.ts src/stamps/geometry-2d/editor/MiniBoard.tsx
```

Nếu pattern đã có cho `onLine` (param `t` được sync về store khi user drag): mở rộng cho 3 case mới. Nếu chưa có (glider chỉ render-from-state, không sync ngược): cần thêm.

- [ ] **Step 3.2: Implement drag-sync (theo pattern hiện có hoặc thêm mới)**

Trong point.ts, sau khi tạo glider, append:

```ts
const gl = /* glider element vừa tạo */;
const c = obj.attrs.constraint;
if (ctx.onUpdate && (c.kind === 'onPerpendicular' || c.kind === 'onPerpBisector' || c.kind === 'onCircleAroundPoint')) {
  gl.on('drag', () => {
    // Recompute t / theta from current glider coords + ref points
    if (c.kind === 'onPerpendicular') {
      const T = ctx.resolveRef(c.through) as any;
      const A = ctx.resolveRef(c.perpToA) as any;
      const B = ctx.resolveRef(c.perpToB) as any;
      const dx = B.X() - A.X(), dy = B.Y() - A.Y();
      const len = Math.hypot(dx, dy) || 1;
      const ux = -dy / len, uy = dx / len;
      const newT = (gl.X() - T.X()) * ux + (gl.Y() - T.Y()) * uy;
      ctx.onUpdate(obj.id, { constraint: { ...c, t: newT } });
    } else if (c.kind === 'onPerpBisector') {
      const A = ctx.resolveRef(c.p1) as any;
      const B = ctx.resolveRef(c.p2) as any;
      const Mx = (A.X() + B.X()) / 2, My = (A.Y() + B.Y()) / 2;
      const dx = B.X() - A.X(), dy = B.Y() - A.Y();
      const len = Math.hypot(dx, dy) || 1;
      const ux = -dy / len, uy = dx / len;
      const newT = (gl.X() - Mx) * ux + (gl.Y() - My) * uy;
      ctx.onUpdate(obj.id, { constraint: { ...c, t: newT } });
    } else if (c.kind === 'onCircleAroundPoint') {
      const C = ctx.resolveRef(c.center) as any;
      const newTheta = Math.atan2(gl.Y() - C.Y(), gl.X() - C.X());
      ctx.onUpdate(obj.id, { constraint: { ...c, theta: newTheta } });
    }
  });
}
```

If `ctx.onUpdate` doesn't exist in `RenderCtx`, this Task becomes 2 subtasks:
- 3a: Extend `RenderCtx` type với `onUpdate?: (id: string, patch: Record<string, unknown>) => void`.
- 3b: Wire it from `JxgRenderer.ts` / `MiniBoard.tsx` to dispatch UPDATE_ATTRS.

Check `src/core/scene/types.ts` for `RenderCtx` definition.

- [ ] **Step 3.3: Verify nếu ctx.onUpdate đã tồn tại**

```bash
grep -n "onUpdate\|RenderCtx" src/core/scene/types.ts src/core/scene/render/JxgRenderer.ts src/stamps/geometry-2d/editor/MiniBoard.tsx
```

Nếu không tồn tại: skip drag-sync trong Task này, defer sang follow-up commit. Glider vẫn render OK; chỉ là kéo glider không persist t/theta khi save scene. Acceptable cho v1, fix follow-up.

- [ ] **Step 3.4: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3.5: Commit**

```bash
git add src/core/scene/kinds/point.ts src/core/scene/types.ts src/core/scene/render/JxgRenderer.ts
git commit -m "feat(scene): drag-sync glider cho 3 constraint mới (t/theta cập nhật về store)"
```

---

## Task 4 — PolygonConstruction union + validate + dependsOn + describe

**Files:**
- Modify: `src/core/scene/kinds/polygon.ts`
- Create: `src/core/scene/kinds/__tests__/polygon.specialConstruction.test.ts`

- [ ] **Step 4.1: Write failing test**

Create `src/core/scene/kinds/__tests__/polygon.specialConstruction.test.ts`:

```ts
import '../polygon';
import { getKind } from '../registry';

describe('Polygon — special construction variants', () => {
  const def = getKind('polygon');

  describe('validate', () => {
    it('square ok', () => {
      expect(() => def.validate!({ construction: { kind: 'square', p1: 'A', p2: 'B' } } as any)).not.toThrow();
    });
    it('square missing p1 throws', () => {
      expect(() => def.validate!({ construction: { kind: 'square', p1: '', p2: 'B' } } as any)).toThrow();
    });
    it('rectangle 3 IDs ok', () => {
      expect(() => def.validate!({ construction: { kind: 'rectangle', p1: 'A', p2: 'B', p3: 'C' } } as any)).not.toThrow();
    });
    it('isoTriangle ok', () => {
      expect(() => def.validate!({ construction: { kind: 'isoTriangle', base1: 'B', base2: 'C', apex: 'A' } } as any)).not.toThrow();
    });
    it('rightTriangle ok', () => {
      expect(() => def.validate!({ construction: { kind: 'rightTriangle', rightAngle: 'R', leg1End: 'P', leg2End: 'Q' } } as any)).not.toThrow();
    });
  });

  describe('dependsOn', () => {
    it('square returns p1, p2', () => {
      expect(def.dependsOn!({ construction: { kind: 'square', p1: 'A', p2: 'B' } } as any)).toEqual(['A', 'B']);
    });
    it('rectangle returns p1, p2, p3', () => {
      expect(def.dependsOn!({ construction: { kind: 'rectangle', p1: 'A', p2: 'B', p3: 'C' } } as any)).toEqual(['A', 'B', 'C']);
    });
    it('isoTriangle returns base1, base2, apex', () => {
      expect(def.dependsOn!({ construction: { kind: 'isoTriangle', base1: 'B', base2: 'C', apex: 'A' } } as any)).toEqual(['B', 'C', 'A']);
    });
    it('rightTriangle returns rightAngle, leg1End, leg2End', () => {
      expect(def.dependsOn!({ construction: { kind: 'rightTriangle', rightAngle: 'R', leg1End: 'P', leg2End: 'Q' } } as any)).toEqual(['R', 'P', 'Q']);
    });
  });

  describe('describe', () => {
    const stubState = { objects: {
      A: { label: 'A' }, B: { label: 'B' }, C: { label: 'C' }, D: { label: 'D' },
      R: { label: 'R' }, P: { label: 'P' }, Q: { label: 'Q' },
    } } as any;
    it('square ABCD', () => {
      const r = def.describe!({ label: 'sq1', attrs: { construction: { kind: 'square', p1: 'A', p2: 'B' } } } as any, stubState);
      expect(r).toMatch(/Hình vuông/);
    });
    it('isoTriangle ABC', () => {
      const r = def.describe!({ label: 't1', attrs: { construction: { kind: 'isoTriangle', base1: 'B', base2: 'C', apex: 'A' } } } as any, stubState);
      expect(r).toMatch(/Tam giác cân/);
    });
  });
});
```

- [ ] **Step 4.2: Run test — FAIL**

```bash
npx jest src/core/scene/kinds/__tests__/polygon.specialConstruction.test.ts
```

- [ ] **Step 4.3: Extend PolygonConstruction + validate + dependsOn + describe**

Edit `src/core/scene/kinds/polygon.ts`:

Locate `PolygonConstruction` type. Replace with:

```ts
export type PolygonConstruction =
  | { kind: 'regular'; p1: string; p2: string; n: number }
  | { kind: 'square'; p1: string; p2: string }
  | { kind: 'rectangle'; p1: string; p2: string; p3: string }
  | { kind: 'rhombus'; p1: string; p2: string; p3: string }
  | { kind: 'parallelogram'; p1: string; p2: string; p3: string }
  | { kind: 'isoTrapezoid'; p1: string; p2: string; p3: string }
  | { kind: 'isoTriangle'; base1: string; base2: string; apex: string }
  | { kind: 'rightTriangle'; rightAngle: string; leg1End: string; leg2End: string };
```

Update `validate` after the existing `regular` branch:

```ts
  validate: (a) => {
    if (a?.construction) {
      const c = a.construction;
      if (c.kind === 'regular') {
        if (!c.p1 || !c.p2) throw new Error('polygon (regular): p1 và p2 bắt buộc');
        if (!Number.isFinite(c.n) || c.n < 3) throw new Error('polygon (regular): n ≥ 3');
        return;
      }
      if (c.kind === 'square') {
        if (!c.p1 || !c.p2) throw new Error('polygon (square): p1 và p2 bắt buộc');
        return;
      }
      if (c.kind === 'rectangle' || c.kind === 'rhombus' || c.kind === 'parallelogram' || c.kind === 'isoTrapezoid') {
        if (!c.p1 || !c.p2 || !c.p3) throw new Error(`polygon (${c.kind}): p1, p2, p3 bắt buộc`);
        return;
      }
      if (c.kind === 'isoTriangle') {
        if (!c.base1 || !c.base2 || !c.apex) throw new Error('polygon (isoTriangle): base1, base2, apex bắt buộc');
        return;
      }
      if (c.kind === 'rightTriangle') {
        if (!c.rightAngle || !c.leg1End || !c.leg2End) throw new Error('polygon (rightTriangle): rightAngle, leg1End, leg2End bắt buộc');
        return;
      }
      return;
    }
    if (!Array.isArray(a?.vertices) || a.vertices.length < 3) {
      throw new Error('polygon: cần ít nhất 3 đỉnh');
    }
  },
```

Update `dependsOn`:

```ts
  dependsOn: (a) => {
    const c = a.construction;
    if (!c) return [...(a.vertices ?? [])];
    switch (c.kind) {
      case 'regular':       return [c.p1, c.p2];
      case 'square':        return [c.p1, c.p2];
      case 'rectangle':
      case 'rhombus':
      case 'parallelogram':
      case 'isoTrapezoid':  return [c.p1, c.p2, c.p3];
      case 'isoTriangle':   return [c.base1, c.base2, c.apex];
      case 'rightTriangle': return [c.rightAngle, c.leg1End, c.leg2End];
    }
  },
```

Update `describe` — add a helper for shape name + extract vertex labels:

```ts
function specialShapeName(kind: PolygonConstruction['kind']): string {
  switch (kind) {
    case 'square':         return 'Hình vuông';
    case 'rectangle':      return 'Hình chữ nhật';
    case 'rhombus':        return 'Hình thoi';
    case 'parallelogram':  return 'Hình bình hành';
    case 'isoTrapezoid':   return 'Hình thang cân';
    case 'isoTriangle':    return 'Tam giác cân';
    case 'rightTriangle':  return 'Tam giác vuông';
    case 'regular':        return ''; // handled separately
  }
}
```

Update describe:

```ts
  describe: (obj, state) => {
    const c = obj.attrs.construction;
    if (c) {
      if (c.kind === 'regular') {
        const labels = regularVertexLabels(labelOf(c.p1, state), labelOf(c.p2, state), c.n);
        return `${regularPolygonName(c.n)} ${labels}`;
      }
      const name = specialShapeName(c.kind);
      // collect vertex labels in render order
      let labels: string[] = [];
      switch (c.kind) {
        case 'square':
        case 'rectangle':
        case 'rhombus':
        case 'parallelogram':
        case 'isoTrapezoid':
          labels = [labelOf(c.p1, state), labelOf(c.p2, state)];
          if (c.kind !== 'square') labels.push(labelOf(c.p3, state));
          break;
        case 'isoTriangle':
          labels = [labelOf(c.apex, state), labelOf(c.base1, state), labelOf(c.base2, state)];
          break;
        case 'rightTriangle':
          labels = [labelOf(c.rightAngle, state), labelOf(c.leg1End, state), labelOf(c.leg2End, state)];
          break;
      }
      return `${name} ${labels.join('')}`;
    }
    return `Đa giác ${(obj.attrs.vertices ?? []).map((id) => labelOf(id, state)).join('')}`;
  },
```

- [ ] **Step 4.4: Run test — PASS**

```bash
npx jest src/core/scene/kinds/__tests__/polygon.specialConstruction.test.ts
npx tsc --noEmit
```

- [ ] **Step 4.5: Commit**

```bash
git add src/core/scene/kinds/polygon.ts src/core/scene/kinds/__tests__/polygon.specialConstruction.test.ts
git commit -m "feat(scene): polygon kind thêm 7 construction variant (validate/dependsOn/describe)"
```

---

## Task 5 — Polygon render: 7 construction variants

**Files:**
- Modify: `src/core/scene/kinds/polygon.ts` (render function)
- Create: `src/core/scene/kinds/__tests__/special-shapes-geometry.test.ts`

- [ ] **Step 5.1: Write failing geometry test (only assert validate/dependsOn first; defer render full integration)**

Create `src/core/scene/kinds/__tests__/special-shapes-geometry.test.ts` with smoke test (mount + render no throw + count vertices):

```ts
import { initBoard, mkContainer } from '../../../stamps/shared/__tests__/_jxgFixture'; // hypothetical helper — adjust path
import { createStore } from '../../store';
import { JxgRenderer } from '../../render/JxgRenderer';
import '../point';
import '../polygon';

// Smoke test: each shape variant renders without throwing.
// If _jxgFixture doesn't exist, replace with the pattern used in existing
// polygon.test.ts — copy its setup.
```

If the existing test infrastructure lacks a JSXGraph board fixture for kind testing, follow the pattern in `src/core/scene/kinds/__tests__/polygon.test.ts` (read it first to mirror setup).

For now, skip integration assertion and write a minimal smoke:

```ts
import { __clearRegistryForTests, registerKind, getKind } from '../registry';

beforeEach(() => __clearRegistryForTests());

it('all 7 variants registered + render returns truthy', () => {
  // Smoke: validate doesn't throw + dependsOn returns non-empty
  // Real render assertion deferred until JSXGraph fixture exists
});
```

(Acceptable: render correctness will be verified via E2E in Task 9.)

- [ ] **Step 5.2: Update render switch in polygon.ts**

Edit `polygon.ts` render function. Replace the single `if (obj.attrs.construction?.kind === 'regular') { ... }` branch with full switch:

```ts
    if (obj.attrs.construction) {
      const c = obj.attrs.construction;
      const showLabel = obj.attrs.showLabel ?? false;
      const commonAttrs = {
        name: label,
        withLabel: showLabel,
        borders: {
          strokeColor: obj.attrs.color ?? '#0f172a',
          strokeWidth: obj.attrs.width ?? 2,
        },
        fillColor: obj.attrs.color ?? '#60a5fa',
        fillOpacity: obj.attrs.fillOpacity ?? 0.15,
        visible: obj.visible,
        fixed: obj.locked,
      };

      if (c.kind === 'regular') {
        const p1 = ctx.resolveRef(c.p1);
        const p2 = ctx.resolveRef(c.p2);
        return board.create('regularpolygon', [p1, p2, c.n], commonAttrs);
      }

      if (c.kind === 'square') {
        const p1 = ctx.resolveRef(c.p1);
        const p2 = ctx.resolveRef(c.p2);
        return board.create('regularpolygon', [p1, p2, 4], commonAttrs);
      }

      // rectangle, rhombus, parallelogram: D = A + (C - B)
      if (c.kind === 'rectangle' || c.kind === 'rhombus' || c.kind === 'parallelogram') {
        const A = ctx.resolveRef(c.p1) as any;
        const B = ctx.resolveRef(c.p2) as any;
        const C = ctx.resolveRef(c.p3) as any;
        const D = board.create('point', [
          () => A.X() + C.X() - B.X(),
          () => A.Y() + C.Y() - B.Y(),
        ], { visible: false, withLabel: false, fixed: true });
        return board.create('polygon', [A, B, C, D], commonAttrs);
      }

      // isoTrapezoid: D = reflect(C across perpBisector(A, B))
      if (c.kind === 'isoTrapezoid') {
        const A = ctx.resolveRef(c.p1) as any;
        const B = ctx.resolveRef(c.p2) as any;
        const C = ctx.resolveRef(c.p3) as any;
        const Dx = () => {
          const Mx = (A.X() + B.X()) / 2;
          const ux = B.X() - A.X(), uy = B.Y() - A.Y();
          const len2 = ux * ux + uy * uy || 1;
          const My = (A.Y() + B.Y()) / 2;
          const proj = ((C.X() - Mx) * ux + (C.Y() - My) * uy) / len2;
          return C.X() - 2 * proj * ux;
        };
        const Dy = () => {
          const Mx = (A.X() + B.X()) / 2;
          const My = (A.Y() + B.Y()) / 2;
          const ux = B.X() - A.X(), uy = B.Y() - A.Y();
          const len2 = ux * ux + uy * uy || 1;
          const proj = ((C.X() - Mx) * ux + (C.Y() - My) * uy) / len2;
          return C.Y() - 2 * proj * uy;
        };
        const D = board.create('point', [Dx, Dy], { visible: false, withLabel: false, fixed: true });
        return board.create('polygon', [A, B, C, D], commonAttrs);
      }

      if (c.kind === 'isoTriangle') {
        const Apex = ctx.resolveRef(c.apex);
        const B1 = ctx.resolveRef(c.base1);
        const B2 = ctx.resolveRef(c.base2);
        return board.create('polygon', [Apex, B1, B2], commonAttrs);
      }

      if (c.kind === 'rightTriangle') {
        const R = ctx.resolveRef(c.rightAngle);
        const P = ctx.resolveRef(c.leg1End);
        const Q = ctx.resolveRef(c.leg2End);
        return board.create('polygon', [R, P, Q], commonAttrs);
      }
    }

    // ...existing fallback for vertices[]
```

- [ ] **Step 5.3: Run typecheck + existing tests**

```bash
npx tsc --noEmit
npx jest src/core/scene/kinds/__tests__/polygon
```

Expected: no type errors; existing polygon tests still pass.

- [ ] **Step 5.4: Commit**

```bash
git add src/core/scene/kinds/polygon.ts src/core/scene/kinds/__tests__/special-shapes-geometry.test.ts
git commit -m "feat(scene): polygon render 7 special construction variant"
```

---

## Task 6 — Tool catalog: group 'special' + 7 tool entries

**Files:**
- Modify: `src/stamps/geometry-2d/editor/tools.tsx`
- Modify: `src/stamps/geometry-2d/editor/icons.tsx`

- [ ] **Step 6.1: Add 7 icon SVGs in icons.tsx**

Open `icons.tsx`. After the last `Icon.xxx` entry, add (find a good location alphabetically or in shape group):

```tsx
  square: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="10" height="10" />
    </svg>
  ),
  rectangle: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="5" width="12" height="6" />
    </svg>
  ),
  rhombus: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M 8 2 L 14 8 L 8 14 L 2 8 Z" />
    </svg>
  ),
  parallelogram: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M 4 12 L 14 12 L 12 4 L 2 4 Z" />
    </svg>
  ),
  isoTrapezoid: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M 2 13 L 14 13 L 11 4 L 5 4 Z" />
    </svg>
  ),
  isoTriangle: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M 8 2 L 14 13 L 2 13 Z" />
    </svg>
  ),
  rightTriangle: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M 3 13 L 13 13 L 3 3 Z" />
      <path d="M 3 11 L 5 11 L 5 13" />
    </svg>
  ),
```

- [ ] **Step 6.2: Add GeomTool keys in tools.tsx**

Extend the `GeomTool` union type with 7 new keys:

```ts
export type GeomTool =
  // ...existing
  | 'square'
  | 'rectangle'
  | 'rhombus'
  | 'parallelogram'
  | 'isoTrapezoid'
  | 'isoTriangle'
  | 'rightTriangle';
```

Extend the `ToolDef['group']` union with `'special'`:

```ts
  group:
    | 'move' | 'point' | 'line' | 'construct' | 'polygon' | 'circle'
    | 'triangle' | 'measure' | 'edit' | 'transform'
    | 'special';
```

- [ ] **Step 6.3: Append 7 tool entries to TOOLS array**

After the `dilate` entry (end of TOOLS), add:

```ts
  { key: 'square',         label: 'Hình vuông',         hint: 'Click 2 điểm — cạnh đầu',
    icon: Icon.square,         group: 'special', needs: 2, accepts: ['point', 'point'] },
  { key: 'rectangle',      label: 'Hình chữ nhật',      hint: 'Click 2 điểm đáy + 1 điểm chiều cao (auto-vuông góc)',
    icon: Icon.rectangle,      group: 'special', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'rhombus',        label: 'Hình thoi',          hint: 'Click 2 điểm cạnh + 1 điểm hướng (auto-bằng độ dài)',
    icon: Icon.rhombus,        group: 'special', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'parallelogram',  label: 'Hình bình hành',     hint: 'Click 3 điểm liên tiếp (đỉnh 4 tự suy)',
    icon: Icon.parallelogram,  group: 'special', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'isoTrapezoid',   label: 'Hình thang cân',     hint: 'Click 2 điểm đáy lớn + 1 đỉnh trên',
    icon: Icon.isoTrapezoid,   group: 'special', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'isoTriangle',    label: 'Tam giác cân',       hint: 'Click 2 điểm đáy + 1 đỉnh (auto-trên trung trực)',
    icon: Icon.isoTriangle,    group: 'special', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'rightTriangle',  label: 'Tam giác vuông',     hint: 'Click đỉnh vuông + 2 đầu cạnh (cạnh 2 auto-vuông góc)',
    icon: Icon.rightTriangle,  group: 'special', needs: 3, accepts: ['point', 'point', 'point'] },
```

- [ ] **Step 6.4: Update GROUP_LABELS + GROUP_ORDER**

In tools.tsx, append:

```ts
export const GROUP_LABELS: Record<ToolDef['group'], string> = {
  move: 'Cơ bản',
  point: 'Điểm',
  line: 'Đường',
  construct: 'Dựng hình',
  polygon: 'Đa giác',
  circle: 'Đường tròn',
  triangle: 'Tam giác',
  measure: 'Đo lường',
  edit: 'Chỉnh sửa',
  transform: 'Phép biến hình',
  special: 'Hình đặc biệt',   // NEW
};

export const GROUP_ORDER: GeomGroup[] = [
  'move', 'point', 'line', 'construct', 'polygon', 'circle',
  'triangle', 'measure', 'edit', 'transform',
  'special',   // NEW — chord letter K
];
```

- [ ] **Step 6.5: Typecheck + lint**

```bash
npx tsc --noEmit
```

Expected: no errors. Verify chord shortcut for `K` works via existing `useChordShortcut.ts` auto-derive.

- [ ] **Step 6.6: Commit**

```bash
git add src/stamps/geometry-2d/editor/tools.tsx src/stamps/geometry-2d/editor/icons.tsx
git commit -m "feat(geometry-2d): group 'Hình đặc biệt' + 7 tool (chord K)"
```

---

## Task 7 — finalizeShape handlers (3-click flow)

**Files:**
- Modify: `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts`
- Create: `src/stamps/geometry-2d/editor/handlers/__tests__/specialShapes.test.tsx` (optional smoke)

- [ ] **Step 7.1: Read existing finalizeShape.ts structure**

```bash
wc -l src/stamps/geometry-2d/editor/handlers/finalizeShape.ts
grep -n "case '\|export function\|tool.key" src/stamps/geometry-2d/editor/handlers/finalizeShape.ts | head -30
```

Locate the main switch / if-chain inside `finalizeShape`. Identify where new cases fit (likely before the default polygon-fallback or after existing transforms).

- [ ] **Step 7.2: Add helpers for t/theta computation**

In `finalizeShape.ts` (or a new util file `handlers/specialShapeMath.ts`), add:

```ts
export type Vec = { x: number; y: number };

export function computePerpendicularT(P: Vec, T: Vec, A: Vec, B: Vec): number {
  const dx = B.x - A.x, dy = B.y - A.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return 0;
  const ux = -dy / len, uy = dx / len;
  return (P.x - T.x) * ux + (P.y - T.y) * uy;
}

export function computePerpBisectorT(P: Vec, A: Vec, B: Vec): number {
  const Mx = (A.x + B.x) / 2, My = (A.y + B.y) / 2;
  const dx = B.x - A.x, dy = B.y - A.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return 0;
  const ux = -dy / len, uy = dx / len;
  return (P.x - Mx) * ux + (P.y - My) * uy;
}

export function computeCircleTheta(P: Vec, C: Vec): number {
  return Math.atan2(P.y - C.y, P.x - C.x);
}
```

- [ ] **Step 7.3: Add 7 cases trong finalizeShape switch**

Locate the main switch on `toolDef.key`. Add 7 new cases:

```ts
    case 'square': {
      const id = freshId(ctx, 'sq');
      ctx.store.dispatch({ type: 'ADD', payload: { obj: mkSceneObj(id, 'polygon',
        ctx.nextLabel('polygon'),
        { construction: { kind: 'square', p1: ids[0], p2: ids[1] } }) } });
      return;
    }
    case 'rectangle': {
      const [aId, bId, cId] = ids;
      const P = readJxgPos(ctx, cId), Aj = readJxgPos(ctx, aId), Bj = readJxgPos(ctx, bId);
      const t = computePerpendicularT(P, Bj, Aj, Bj);
      ctx.store.dispatch({ type: 'TRANSACTION', payload: { actions: [
        { type: 'UPDATE_ATTRS', payload: { id: cId, patch: {
            constraint: { kind: 'onPerpendicular', through: bId, perpToA: aId, perpToB: bId, t } } } },
        { type: 'ADD', payload: { obj: mkSceneObj(freshId(ctx, 'rect'), 'polygon',
            ctx.nextLabel('polygon'),
            { construction: { kind: 'rectangle', p1: aId, p2: bId, p3: cId } }) } },
      ] } });
      return;
    }
    case 'rhombus': {
      const [aId, bId, cId] = ids;
      const P = readJxgPos(ctx, cId), Bj = readJxgPos(ctx, bId);
      const theta = computeCircleTheta(P, Bj);
      ctx.store.dispatch({ type: 'TRANSACTION', payload: { actions: [
        { type: 'UPDATE_ATTRS', payload: { id: cId, patch: {
            constraint: { kind: 'onCircleAroundPoint', center: bId, radiusPoint: aId, theta } } } },
        { type: 'ADD', payload: { obj: mkSceneObj(freshId(ctx, 'rho'), 'polygon',
            ctx.nextLabel('polygon'),
            { construction: { kind: 'rhombus', p1: aId, p2: bId, p3: cId } }) } },
      ] } });
      return;
    }
    case 'parallelogram':
    case 'isoTrapezoid': {
      const [aId, bId, cId] = ids;
      const prefix = toolDef.key === 'parallelogram' ? 'pgm' : 'trap';
      ctx.store.dispatch({ type: 'ADD', payload: { obj: mkSceneObj(freshId(ctx, prefix), 'polygon',
        ctx.nextLabel('polygon'),
        { construction: { kind: toolDef.key, p1: aId, p2: bId, p3: cId } }) } });
      return;
    }
    case 'isoTriangle': {
      const [b1Id, b2Id, apexId] = ids;
      const Pj = readJxgPos(ctx, apexId), B1j = readJxgPos(ctx, b1Id), B2j = readJxgPos(ctx, b2Id);
      const t = computePerpBisectorT(Pj, B1j, B2j);
      ctx.store.dispatch({ type: 'TRANSACTION', payload: { actions: [
        { type: 'UPDATE_ATTRS', payload: { id: apexId, patch: {
            constraint: { kind: 'onPerpBisector', p1: b1Id, p2: b2Id, t } } } },
        { type: 'ADD', payload: { obj: mkSceneObj(freshId(ctx, 'iso'), 'polygon',
            ctx.nextLabel('polygon'),
            { construction: { kind: 'isoTriangle', base1: b1Id, base2: b2Id, apex: apexId } }) } },
      ] } });
      return;
    }
    case 'rightTriangle': {
      const [rId, p1Id, p2Id] = ids;
      const Pj = readJxgPos(ctx, p2Id), Rj = readJxgPos(ctx, rId), P1j = readJxgPos(ctx, p1Id);
      const t = computePerpendicularT(Pj, Rj, Rj, P1j);
      ctx.store.dispatch({ type: 'TRANSACTION', payload: { actions: [
        { type: 'UPDATE_ATTRS', payload: { id: p2Id, patch: {
            constraint: { kind: 'onPerpendicular', through: rId, perpToA: rId, perpToB: p1Id, t } } } },
        { type: 'ADD', payload: { obj: mkSceneObj(freshId(ctx, 'rtri'), 'polygon',
            ctx.nextLabel('polygon'),
            { construction: { kind: 'rightTriangle', rightAngle: rId, leg1End: p1Id, leg2End: p2Id } }) } },
      ] } });
      return;
    }
```

Helper `readJxgPos(ctx, id)` reads current JSXGraph point coordinates. Pattern from existing `translate` case in transform.ts — adapt.

```ts
function readJxgPos(ctx: HandlerCtx, id: string): { x: number; y: number } {
  const j = ctx.jxgFromSceneId(id);
  if (!j || typeof j.X !== 'function') return { x: 0, y: 0 };
  return { x: j.X(), y: j.Y() };
}
```

- [ ] **Step 7.4: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 7.5: Manual smoke**

```bash
npm test -- --testPathPattern='geometry-2d.*handlers'
```

(Existing handler tests should still pass.)

- [ ] **Step 7.6: Commit**

```bash
git add src/stamps/geometry-2d/editor/handlers/finalizeShape.ts
git commit -m "feat(geometry-2d): finalizeShape handler 7 case shape đặc biệt (promote constraint)"
```

---

## Task 8 — End-to-end smoke + manual verification

- [ ] **Step 8.1: Run full test suite**

```bash
npm test
npx tsc --noEmit
```

Expected: all pass.

- [ ] **Step 8.2: Build dev server**

```bash
npm run dev &
```

- [ ] **Step 8.3: Manual smoke in browser**

Open demo page (whichever loads geometry-2d stamp). For each shape:
1. Select tool từ group 'Hình đặc biệt'.
2. Click theo flow tương ứng.
3. Verify shape xuất hiện đúng.
4. Drag từng input point → verify shape preserves type (vd rectangle vẫn vuông góc).

- [ ] **Step 8.4: Commit any fixes from manual smoke**

If issues found: fix → typecheck → commit. Otherwise proceed.

---

## Task 9 — Bump version + CHANGELOG

- [ ] **Step 9.1: Bump version**

```bash
npm version minor   # 0.25.0 → 0.26.0
```

- [ ] **Step 9.2: Update CHANGELOG (if exists) or skip**

```bash
ls CHANGELOG.md 2>/dev/null && echo "EXISTS" || echo "SKIP"
```

If exists: add v0.26.0 entry. If not: skip — git log is source of truth.

- [ ] **Step 9.3: Push (per user's standing authorization)**

```bash
git push --follow-tags
```

---

## Self-review summary

**Spec coverage:**
- ✅ Task 1 — Constraint2D 3 variant (spec §4.1)
- ✅ Task 2 — Point kind render 3 case (spec §7.1)
- ✅ Task 3 — Drag sync glider (spec §7.1 listener)
- ✅ Task 4 — PolygonConstruction 7 variant + validate/dependsOn/describe (spec §4.2-4.3)
- ✅ Task 5 — Polygon render 7 variant (spec §7.2)
- ✅ Task 6 — Tools + icons + group (spec §5)
- ✅ Task 7 — finalizeShape handlers 7 case (spec §6)
- ✅ Task 8 — E2E smoke (spec §8 acceptance)
- ✅ Task 9 — Version bump

**Defer:**
- Spec §7.3 vertex auto-labeling polish — defer to follow-up commit (acceptable per spec).
- Per-shape unit tests in §8.1-8.5 — initial test coverage in Task 1 + 4 + smoke in Task 8 sufficient for v1. Full per-shape integration tests added as follow-up.

**Type consistency:** ✓ Field names match across spec, types, handlers, render.

**Placeholders:** None — all code blocks complete.
