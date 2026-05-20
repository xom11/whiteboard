# Scene Refactor — Phase 2 (port stamp 2D) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port stamp 2D từ pattern `creationLogRef`/`objMapRef` sang dùng store ở `src/core/scene/`. Xoá monolithic 1469 dòng `MiniBoard.tsx` thành `<500` dòng. Release `v0.13.0`.

**Architecture:**
- Reuse module pure TypeScript `src/core/scene/` đã xây dựng ở Phase 1 (store + reducer + registry + selectors + migrations).
- Thêm 8 kind 2D vào `src/core/scene/kinds/` (point, segment, line, ray, vector, circle, polygon, intersection) cùng `2d-constraint.ts` cho `Vec2`/`Constraint2D` union.
- Thêm `JxgRenderer` 2D class ở `src/core/scene/render/JxgRenderer.ts` (analog `JxgRenderer3D`) — subscribe store, diff state, apply qua `kind.render(obj, ctx)`.
- Port `MiniBoard.tsx` + `EditorPanel.tsx` + `LeftPanel.tsx` + `PropertiesPopover.tsx` + handlers + serialize + render/renderInline sang dispatch action thay vì append `creationLogRef`. Xoá `objMapRef` (renderer giữ internal Map).
- No backcompat: file 2D cũ format `SerializedBoard.elements[]` (creation log replay) → wipe + reset (giống Phase 1). Format mới = `{ version: 2, state: State }`.
- Commit straight to main (không PR, không worktree) — đã thống nhất.

**Tech Stack:** TypeScript strict, React 18, Immer (đã có), JSXGraph 1.12, Jest 29 + jsdom + ts-jest, Playwright (E2E harness sẵn có).

**Spec reference:** `docs/superpowers/specs/2026-05-20-scene-v2-design.md`
**Phase 1 plan (template):** `docs/superpowers/plans/2026-05-20-scene-phase-1-3d.md`
**Issue:** #21
**Tag baseline:** `v0.12.0` (commit `f1ad07b`)

**Out of scope** (sẽ ở Phase 3):
- Object list panel cho 2D + 3D (selector-based).
- Action recorder demo.

---

## Pre-flight checklist (đầu session)

- [ ] Đọc spec section 4–7 (Components & API, Data flow, Error handling, Testing strategy).
- [ ] Đọc Phase 1 plan đoạn PR 1.2 (kinds 3D), PR 1.3 (JxgRenderer3D), PR 1.4 (port pattern) — đây là template trực tiếp cho Phase 2.
- [ ] Manual smoke test Phase 1: `npm run demo` → 3D stamp → vẽ điểm A, B, C → polygon ABC → drag A → undo 4 lần → redo 4 lần → insert canvas → re-edit. Nếu hỏng phải fix trước khi đi Phase 2.
- [ ] `git pull origin main` để chắc chắn ở tip.
- [ ] `npm run typecheck && npm test` — baseline phải clean.

---

## File Structure

### Files created

```
src/core/scene/kinds/2d-constraint.ts                       # Vec2 + Constraint2D union
src/core/scene/kinds/point.ts                               # KindDef cho point 2D
src/core/scene/kinds/segment.ts
src/core/scene/kinds/line.ts                                # qua 2 điểm, vô hạn cả 2 đầu
src/core/scene/kinds/ray.ts
src/core/scene/kinds/vector.ts
src/core/scene/kinds/circle.ts                              # tâm + điểm trên đường tròn
src/core/scene/kinds/polygon.ts
src/core/scene/kinds/intersection.ts                        # discriminator lineLine | lineCircle | circleCircle
src/core/scene/kinds/__tests__/point.test.ts
src/core/scene/kinds/__tests__/segment.test.ts
src/core/scene/kinds/__tests__/line.test.ts
src/core/scene/kinds/__tests__/ray.test.ts
src/core/scene/kinds/__tests__/vector.test.ts
src/core/scene/kinds/__tests__/circle.test.ts
src/core/scene/kinds/__tests__/polygon.test.ts
src/core/scene/kinds/__tests__/intersection.test.ts
src/core/scene/render/types2d.ts                            # Theme2D + RenderCtx2D
src/core/scene/render/JxgRenderer.ts                        # subscribe store → diff → JXG.Board
src/core/scene/render/__tests__/JxgRenderer.test.ts
src/stamps/geometry-2d/editor/useSceneStore.ts              # React hook wrapper quanh createStore
src/stamps/geometry-2d/editor/useToolStateMachine.ts        # Tool state machine (pending picks, transforms, marquee)
src/stamps/geometry-2d/editor/__tests__/useSceneStore.test.ts
src/stamps/geometry-2d/editor/__tests__/useToolStateMachine.test.ts
```

### Files modified

```
src/core/scene/kinds/index.ts                               # import thêm 8 kind 2D
src/core/scene/__tests__/registry-smoke.test.ts             # expect 19 kind (11 3D + 8 2D)
src/stamps/geometry-2d/serialize.ts                         # version 2 format { version: 2, state: State }
src/stamps/geometry-2d/render.ts                            # offscreen render qua store + JxgRenderer
src/stamps/geometry-2d/renderInline.ts                      # giữ (chỉ wrap container DOM → SVG)
src/stamps/geometry-2d/editor/MiniBoard.tsx                 # 1469 → < 500 dòng. XOÁ creationLogRef + objMapRef + redoStackRef.
src/stamps/geometry-2d/editor/EditorPanel.tsx               # own store + JxgRenderer
src/stamps/geometry-2d/editor/LeftPanel.tsx                 # giữ (UI thuần, không touch store)
src/stamps/geometry-2d/editor/PropertiesPopover.tsx         # dispatch UPDATE_ATTRS thay onMutate
src/stamps/geometry-2d/editor/handlers.ts                   # dispatch actions thay vì ctx.create
src/stamps/geometry-2d/editor/hitTest.ts                    # nhận State thay vì list JxgObj
src/stamps/geometry-2d/editor/transforms.ts                 # nhận State + SceneObject
src/stamps/geometry-2d/host.tsx                             # undo/redo wire qua store (canUndo/canRedo)
src/stamps/geometry-2d/index.tsx                            # nếu có import serialize cũ
src/stamps/geometry-2d/__tests__/serialize.test.ts          # viết lại cho format v2
src/stamps/geometry-2d/__tests__/render.test.ts             # giữ (containerDimsForBbox không đụng store)
src/stamps/geometry-2d/__tests__/renderInline.test.ts       # giữ
src/stamps/geometry-2d/__tests__/tools.test.ts              # giữ
src/stamps/geometry-2d/__tests__/transforms.test.ts         # update signature nếu transforms.ts đổi
src/stamps/geometry-2d/__tests__/MiniBoard.smoke.test.tsx   # smoke giữ
src/stamps/geometry-2d/__tests__/EditorPanel.test.tsx       # update assertions cho store-based onInsert
src/stamps/geometry-2d/__tests__/PropertiesPopover.test.tsx # update onMutate → dispatch UPDATE_ATTRS
package.json                                                # bump 0.12.0 → 0.13.0
```

### Files deleted

```
src/stamps/geometry-2d/__tests__/hitTest.test.ts            # API cũ (list JxgObj) → viết lại nếu cần ở Phase 3
```

> Test cũ nào còn dùng `findNearestPointInList(list, ...)` không port được sang `(state, ...)` → xoá, chấp nhận regression risk như Phase 1 đã chấp nhận (28 test 3D đã xoá ở Phase 1). Viết integration test mới ở Phase 3 sau khi object list panel ổn định.

---

## PR 2.1 — 8 kind 2D + tests (~3 ngày)

**Mục tiêu:** thêm 8 kind 2D + `2d-constraint.ts` vào `src/core/scene/kinds/`. Mỗi kind có ≥3 test (validate, dependsOn, describe). Mỗi kind 1 commit nhỏ — pattern y hệt Phase 1 PR 1.2.

> **Lưu ý:** render function trả `null` ở PR này — phần render thực sẽ implement ở PR 2.2 khi đã có RenderCtx2D. Store/reducer hoạt động độc lập với renderer.

### Task 2.1.1: `2d-constraint.ts` — Vec2 + Constraint2D union

**Files:**
- Create: `src/core/scene/kinds/2d-constraint.ts`

- [ ] **Step 2.1.1.1: Tạo file constraint**

```ts
// src/core/scene/kinds/2d-constraint.ts
export type Vec2 = [number, number];

export type Constraint2D =
  | { kind: 'free'; x: number; y: number }
  | { kind: 'onAxis'; axis: 'x' | 'y'; t: number }
  | { kind: 'onLine'; lineId: string; t: number }
  | { kind: 'onSegment'; segmentId: string; t: number }
  | { kind: 'onCircle'; circleId: string; theta: number }
  | { kind: 'onPolygon'; polygonId: string; u: number; v: number };

export function constraintRefs2D(c: Constraint2D): string[] {
  switch (c.kind) {
    case 'onLine': return [c.lineId];
    case 'onSegment': return [c.segmentId];
    case 'onCircle': return [c.circleId];
    case 'onPolygon': return [c.polygonId];
    default: return [];
  }
}
```

- [ ] **Step 2.1.1.2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 2.1.1.3: Commit**

```bash
git add src/core/scene/kinds/2d-constraint.ts
git commit -m "feat(scene/kinds): 2d-constraint — Vec2 + Constraint2D union (free/onAxis/onLine/onSegment/onCircle/onPolygon)"
```

---

### Task 2.1.2: Kind `point` (2D)

**Files:**
- Create: `src/core/scene/kinds/point.ts`
- Test: `src/core/scene/kinds/__tests__/point.test.ts`

- [ ] **Step 2.1.2.1: Viết test point**

```ts
// src/core/scene/kinds/__tests__/point.test.ts
import '../point';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/point (2D)', () => {
  test('đã đăng ký với registry', () => {
    const def = getKind('point');
    expect(def.schemaVersion).toBe(1);
  });

  test('validate throw nếu thiếu constraint', () => {
    const def = getKind('point');
    expect(() => def.validate?.({} as never)).toThrow(/constraint/);
  });

  test('dependsOn free → []', () => {
    const def = getKind('point');
    expect(def.dependsOn({ constraint: { kind: 'free', x: 0, y: 0 } } as never))
      .toEqual([]);
  });

  test('dependsOn onLine → [lineId]', () => {
    const def = getKind('point');
    expect(def.dependsOn({ constraint: { kind: 'onLine', lineId: 'l1', t: 0.5 } } as never))
      .toEqual(['l1']);
  });

  test('dependsOn onCircle → [circleId]', () => {
    const def = getKind('point');
    expect(def.dependsOn({ constraint: { kind: 'onCircle', circleId: 'c1', theta: 0 } } as never))
      .toEqual(['c1']);
  });

  test('describe in toạ độ', () => {
    const def = getKind('point');
    const obj = mkObj('point', 'A', { constraint: { kind: 'free', x: 1.5, y: 2.5 } });
    expect(def.describe(obj)).toMatch(/A.*1\.50.*2\.50/);
  });
});
```

- [ ] **Step 2.1.2.2: Chạy test xem fail**

Run: `npm test -- --testPathPattern 'kinds/__tests__/point\.test'`
Expected: FAIL — "Cannot find module '../point'".

- [ ] **Step 2.1.2.3: Implement point.ts**

```ts
// src/core/scene/kinds/point.ts
import { registerKind } from '../registry';
import type { KindDef, RenderCtx } from '../types';
import { type Constraint2D, constraintRefs2D } from './2d-constraint';

export type PointAttrs = {
  constraint: Constraint2D;
  color?: string;
  showLabel?: boolean;
  showValue?: boolean;
  face?: 'o' | 'circle' | 'cross' | 'plus';
  size?: number;
};

const def: KindDef<PointAttrs> = {
  type: 'point',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a || !a.constraint || !a.constraint.kind) {
      throw new Error('point: constraint required');
    }
  },
  dependsOn: (a) => constraintRefs2D(a.constraint),
  describe: (obj) => {
    const c = obj.attrs.constraint;
    if (c.kind === 'free') return `${obj.label} = (${c.x.toFixed(2)}, ${c.y.toFixed(2)})`;
    if (c.kind === 'onAxis') return `${obj.label} trên trục ${c.axis} (t=${c.t.toFixed(2)})`;
    if (c.kind === 'onLine') return `${obj.label} trên đường ${c.lineId}`;
    if (c.kind === 'onSegment') return `${obj.label} trên đoạn ${c.segmentId}`;
    if (c.kind === 'onCircle') return `${obj.label} trên đường tròn ${c.circleId}`;
    if (c.kind === 'onPolygon') return `${obj.label} trên đa giác ${c.polygonId}`;
    return obj.label;
  },
  render: (_obj, _ctx: RenderCtx) => {
    // Render thực được implement ở JxgRenderer (PR 2.2 task 2.2.2).
    return null;
  },
};

registerKind(def);
```

- [ ] **Step 2.1.2.4: Verify test pass**

Run: `npm test -- --testPathPattern 'kinds/__tests__/point\.test'`
Expected: PASS, 6 tests.

- [ ] **Step 2.1.2.5: Update barrel `kinds/index.ts`**

```ts
// src/core/scene/kinds/index.ts
import './point3d';
import './segment3d';
import './line3d';
import './ray3d';
import './vector3d';
import './plane3d';
import './polygon3d';
import './sphere3d';
import './polyhedron3d';
import './cylinder3d';
import './cone3d';
import './point';
export {};
```

- [ ] **Step 2.1.2.6: Commit**

```bash
git add src/core/scene/kinds/point.ts \
        src/core/scene/kinds/__tests__/point.test.ts \
        src/core/scene/kinds/index.ts
git commit -m "feat(scene/kinds): point 2D với Constraint2D + describe"
```

---

### Task 2.1.3: Kind `segment` (2D)

**Files:**
- Create: `src/core/scene/kinds/segment.ts`
- Test: `src/core/scene/kinds/__tests__/segment.test.ts`

- [ ] **Step 2.1.3.1: Viết test**

```ts
// src/core/scene/kinds/__tests__/segment.test.ts
import '../segment';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/segment (2D)', () => {
  test('registered', () => {
    expect(getKind('segment').schemaVersion).toBe(1);
  });

  test('validate throw nếu thiếu p1/p2', () => {
    const def = getKind('segment');
    expect(() => def.validate?.({ p1: '', p2: 'x' } as never)).toThrow();
    expect(() => def.validate?.({ p1: 'x', p2: '' } as never)).toThrow();
  });

  test('dependsOn = [p1, p2]', () => {
    const def = getKind('segment');
    expect(def.dependsOn({ p1: 'a', p2: 'b' } as never)).toEqual(['a', 'b']);
  });

  test('describe in nhãn 2 đầu', () => {
    const def = getKind('segment');
    const obj = mkObj('segment', 's1', { p1: 'A', p2: 'B' });
    expect(def.describe(obj)).toContain('A');
    expect(def.describe(obj)).toContain('B');
  });
});
```

- [ ] **Step 2.1.3.2: Chạy fail**

Run: `npm test -- --testPathPattern 'kinds/__tests__/segment\.test'`
Expected: FAIL.

- [ ] **Step 2.1.3.3: Implement**

```ts
// src/core/scene/kinds/segment.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type SegmentAttrs = {
  p1: string;
  p2: string;
  color?: string;
  width?: number;
  dash?: number;
  showLabel?: boolean;
  showValue?: boolean;
};

const def: KindDef<SegmentAttrs> = {
  type: 'segment',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.p1 || !a?.p2) throw new Error('segment: p1 và p2 bắt buộc');
  },
  dependsOn: (a) => [a.p1, a.p2],
  describe: (obj) => `Đoạn ${obj.attrs.p1}${obj.attrs.p2}`,
  render: () => null,
};

registerKind(def);
```

- [ ] **Step 2.1.3.4: Verify pass + update barrel**

```ts
// src/core/scene/kinds/index.ts — thêm dòng:
import './segment';
```

Run: `npm test -- --testPathPattern 'kinds/__tests__/segment\.test'`
Expected: PASS, 4 tests.

- [ ] **Step 2.1.3.5: Commit**

```bash
git add src/core/scene/kinds/segment.ts \
        src/core/scene/kinds/__tests__/segment.test.ts \
        src/core/scene/kinds/index.ts
git commit -m "feat(scene/kinds): segment 2D — đoạn thẳng qua 2 điểm"
```

---

### Task 2.1.4: Kind `line` (2D)

**Files:**
- Create: `src/core/scene/kinds/line.ts`
- Test: `src/core/scene/kinds/__tests__/line.test.ts`

- [ ] **Step 2.1.4.1: Viết test**

```ts
// src/core/scene/kinds/__tests__/line.test.ts
import '../line';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/line (2D)', () => {
  test('registered', () => {
    expect(getKind('line').schemaVersion).toBe(1);
  });

  test('validate throw nếu thiếu p1/p2', () => {
    const def = getKind('line');
    expect(() => def.validate?.({ p1: 'a' } as never)).toThrow();
  });

  test('dependsOn = [p1, p2]', () => {
    expect(getKind('line').dependsOn({ p1: 'a', p2: 'b' } as never)).toEqual(['a', 'b']);
  });

  test('describe', () => {
    const obj = mkObj('line', 'l1', { p1: 'A', p2: 'B' });
    expect(getKind('line').describe(obj)).toMatch(/Đường|AB/);
  });
});
```

- [ ] **Step 2.1.4.2: Implement + barrel + commit**

```ts
// src/core/scene/kinds/line.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type LineAttrs = {
  p1: string;
  p2: string;
  color?: string;
  width?: number;
  dash?: number;
  showLabel?: boolean;
};

const def: KindDef<LineAttrs> = {
  type: 'line',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.p1 || !a?.p2) throw new Error('line: p1 và p2 bắt buộc');
  },
  dependsOn: (a) => [a.p1, a.p2],
  describe: (obj) => `Đường thẳng ${obj.attrs.p1}${obj.attrs.p2}`,
  render: () => null,
};

registerKind(def);
```

Thêm `import './line';` vào `src/core/scene/kinds/index.ts`.

Run: `npm test -- --testPathPattern 'kinds/__tests__/line\.test'`
Expected: PASS, 4 tests.

```bash
git add src/core/scene/kinds/line.ts \
        src/core/scene/kinds/__tests__/line.test.ts \
        src/core/scene/kinds/index.ts
git commit -m "feat(scene/kinds): line 2D — đường thẳng vô hạn qua 2 điểm"
```

---

### Task 2.1.5: Kind `ray` (2D)

**Files:**
- Create: `src/core/scene/kinds/ray.ts`
- Test: `src/core/scene/kinds/__tests__/ray.test.ts`

- [ ] **Step 2.1.5.1: Viết test**

```ts
// src/core/scene/kinds/__tests__/ray.test.ts
import '../ray';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/ray (2D)', () => {
  test('registered + schemaVersion 1', () => {
    expect(getKind('ray').schemaVersion).toBe(1);
  });

  test('validate throw thiếu origin/through', () => {
    const def = getKind('ray');
    expect(() => def.validate?.({ origin: '', through: 'b' } as never)).toThrow();
    expect(() => def.validate?.({ origin: 'a', through: '' } as never)).toThrow();
  });

  test('dependsOn = [origin, through]', () => {
    expect(getKind('ray').dependsOn({ origin: 'A', through: 'B' } as never))
      .toEqual(['A', 'B']);
  });

  test('describe', () => {
    const obj = mkObj('ray', 'r1', { origin: 'A', through: 'B' });
    expect(getKind('ray').describe(obj)).toMatch(/Tia|AB/);
  });
});
```

- [ ] **Step 2.1.5.2: Implement + barrel + commit**

```ts
// src/core/scene/kinds/ray.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type RayAttrs = {
  origin: string;
  through: string;
  color?: string;
  width?: number;
  dash?: number;
};

const def: KindDef<RayAttrs> = {
  type: 'ray',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.origin || !a?.through) throw new Error('ray: origin và through bắt buộc');
  },
  dependsOn: (a) => [a.origin, a.through],
  describe: (obj) => `Tia ${obj.attrs.origin}${obj.attrs.through}`,
  render: () => null,
};

registerKind(def);
```

Thêm `import './ray';` vào barrel.

Run: `npm test -- --testPathPattern 'kinds/__tests__/ray\.test'`
Expected: PASS, 4 tests.

```bash
git add src/core/scene/kinds/ray.ts \
        src/core/scene/kinds/__tests__/ray.test.ts \
        src/core/scene/kinds/index.ts
git commit -m "feat(scene/kinds): ray 2D — tia từ origin qua điểm"
```

---

### Task 2.1.6: Kind `vector` (2D)

**Files:**
- Create: `src/core/scene/kinds/vector.ts`
- Test: `src/core/scene/kinds/__tests__/vector.test.ts`

- [ ] **Step 2.1.6.1: Viết test**

```ts
// src/core/scene/kinds/__tests__/vector.test.ts
import '../vector';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/vector (2D)', () => {
  test('registered', () => {
    expect(getKind('vector').schemaVersion).toBe(1);
  });

  test('validate throw thiếu from/to', () => {
    const def = getKind('vector');
    expect(() => def.validate?.({ from: '', to: 'b' } as never)).toThrow();
  });

  test('dependsOn = [from, to]', () => {
    expect(getKind('vector').dependsOn({ from: 'A', to: 'B' } as never))
      .toEqual(['A', 'B']);
  });

  test('describe', () => {
    const obj = mkObj('vector', 'v1', { from: 'A', to: 'B' });
    expect(getKind('vector').describe(obj)).toMatch(/AB|vector/i);
  });
});
```

- [ ] **Step 2.1.6.2: Implement + barrel + commit**

```ts
// src/core/scene/kinds/vector.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type VectorAttrs = {
  from: string;
  to: string;
  color?: string;
  width?: number;
};

const def: KindDef<VectorAttrs> = {
  type: 'vector',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.from || !a?.to) throw new Error('vector: from và to bắt buộc');
  },
  dependsOn: (a) => [a.from, a.to],
  describe: (obj) => `Vector ${obj.attrs.from}${obj.attrs.to}`,
  render: () => null,
};

registerKind(def);
```

Thêm `import './vector';` vào barrel.

Run: `npm test -- --testPathPattern 'kinds/__tests__/vector\.test'`
Expected: PASS, 4 tests.

```bash
git add src/core/scene/kinds/vector.ts \
        src/core/scene/kinds/__tests__/vector.test.ts \
        src/core/scene/kinds/index.ts
git commit -m "feat(scene/kinds): vector 2D — vector có hướng"
```

---

### Task 2.1.7: Kind `circle` (2D)

**Files:**
- Create: `src/core/scene/kinds/circle.ts`
- Test: `src/core/scene/kinds/__tests__/circle.test.ts`

- [ ] **Step 2.1.7.1: Viết test**

```ts
// src/core/scene/kinds/__tests__/circle.test.ts
import '../circle';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/circle (2D)', () => {
  test('registered', () => {
    expect(getKind('circle').schemaVersion).toBe(1);
  });

  test('validate throw thiếu center/surfacePoint', () => {
    const def = getKind('circle');
    expect(() => def.validate?.({ center: '', surfacePoint: 'b' } as never)).toThrow();
    expect(() => def.validate?.({ center: 'a', surfacePoint: '' } as never)).toThrow();
  });

  test('dependsOn = [center, surfacePoint]', () => {
    expect(getKind('circle').dependsOn({ center: 'O', surfacePoint: 'A' } as never))
      .toEqual(['O', 'A']);
  });

  test('describe', () => {
    const obj = mkObj('circle', 'c1', { center: 'O', surfacePoint: 'A' });
    expect(getKind('circle').describe(obj)).toMatch(/đường tròn|O.*A/i);
  });
});
```

- [ ] **Step 2.1.7.2: Implement + barrel + commit**

```ts
// src/core/scene/kinds/circle.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type CircleAttrs = {
  center: string;
  surfacePoint: string;
  color?: string;
  width?: number;
  dash?: number;
  showLabel?: boolean;
  showValue?: boolean;
};

const def: KindDef<CircleAttrs> = {
  type: 'circle',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.center || !a?.surfacePoint) {
      throw new Error('circle: center và surfacePoint bắt buộc');
    }
  },
  dependsOn: (a) => [a.center, a.surfacePoint],
  describe: (obj) => `Đường tròn tâm ${obj.attrs.center} qua ${obj.attrs.surfacePoint}`,
  render: () => null,
};

registerKind(def);
```

Thêm `import './circle';` vào barrel.

Run: `npm test -- --testPathPattern 'kinds/__tests__/circle\.test'`
Expected: PASS, 4 tests.

```bash
git add src/core/scene/kinds/circle.ts \
        src/core/scene/kinds/__tests__/circle.test.ts \
        src/core/scene/kinds/index.ts
git commit -m "feat(scene/kinds): circle 2D — đường tròn tâm + điểm trên"
```

---

### Task 2.1.8: Kind `polygon` (2D)

**Files:**
- Create: `src/core/scene/kinds/polygon.ts`
- Test: `src/core/scene/kinds/__tests__/polygon.test.ts`

- [ ] **Step 2.1.8.1: Viết test**

```ts
// src/core/scene/kinds/__tests__/polygon.test.ts
import '../polygon';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/polygon (2D)', () => {
  test('registered', () => {
    expect(getKind('polygon').schemaVersion).toBe(1);
  });

  test('validate throw nếu < 3 đỉnh', () => {
    const def = getKind('polygon');
    expect(() => def.validate?.({ vertices: ['A', 'B'] } as never)).toThrow(/3/);
    expect(() => def.validate?.({ vertices: [] } as never)).toThrow();
  });

  test('validate OK với 3+ đỉnh', () => {
    const def = getKind('polygon');
    expect(() => def.validate?.({ vertices: ['A', 'B', 'C'] } as never)).not.toThrow();
  });

  test('dependsOn = vertices', () => {
    expect(getKind('polygon').dependsOn({ vertices: ['A', 'B', 'C', 'D'] } as never))
      .toEqual(['A', 'B', 'C', 'D']);
  });

  test('describe in danh sách đỉnh', () => {
    const obj = mkObj('polygon', 'p1', { vertices: ['A', 'B', 'C'] });
    expect(getKind('polygon').describe(obj)).toContain('A');
    expect(getKind('polygon').describe(obj)).toContain('B');
    expect(getKind('polygon').describe(obj)).toContain('C');
  });
});
```

- [ ] **Step 2.1.8.2: Implement + barrel + commit**

```ts
// src/core/scene/kinds/polygon.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type PolygonAttrs = {
  vertices: string[];
  color?: string;
  fillOpacity?: number;
  width?: number;
  showLabel?: boolean;
  showValue?: boolean;   // hiển thị diện tích
};

const def: KindDef<PolygonAttrs> = {
  type: 'polygon',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!Array.isArray(a?.vertices) || a.vertices.length < 3) {
      throw new Error('polygon: cần ít nhất 3 đỉnh');
    }
  },
  dependsOn: (a) => [...a.vertices],
  describe: (obj) => `Đa giác ${obj.attrs.vertices.join('')}`,
  render: () => null,
};

registerKind(def);
```

Thêm `import './polygon';` vào barrel.

Run: `npm test -- --testPathPattern 'kinds/__tests__/polygon\.test'`
Expected: PASS, 5 tests.

```bash
git add src/core/scene/kinds/polygon.ts \
        src/core/scene/kinds/__tests__/polygon.test.ts \
        src/core/scene/kinds/index.ts
git commit -m "feat(scene/kinds): polygon 2D — đa giác ≥3 đỉnh"
```

---

### Task 2.1.9: Kind `intersection` (2D) — derived point

**Files:**
- Create: `src/core/scene/kinds/intersection.ts`
- Test: `src/core/scene/kinds/__tests__/intersection.test.ts`

> **Quyết định scope chốt:** intersection là 1 kind riêng (không dùng `constraint: { kind: 'onIntersection' }` ở point) với discriminator `kind: 'lineLine' | 'lineCircle' | 'circleCircle'`. Lý do: branch (0/1) khác biệt theo từng case; xét rời để dependsOn + render rõ ràng.

- [ ] **Step 2.1.9.1: Viết test**

```ts
// src/core/scene/kinds/__tests__/intersection.test.ts
import '../intersection';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/intersection (2D)', () => {
  test('registered', () => {
    expect(getKind('intersection').schemaVersion).toBe(1);
  });

  test('validate throw thiếu kind/ref1/ref2', () => {
    const def = getKind('intersection');
    expect(() => def.validate?.({ ref1: 'a', ref2: 'b' } as never)).toThrow();
    expect(() => def.validate?.({ kind: 'lineLine', ref1: '', ref2: 'b' } as never)).toThrow();
    expect(() => def.validate?.({ kind: 'lineLine', ref1: 'a', ref2: '' } as never)).toThrow();
  });

  test('validate OK với kind lineLine', () => {
    const def = getKind('intersection');
    expect(() => def.validate?.({ kind: 'lineLine', ref1: 'l1', ref2: 'l2' } as never)).not.toThrow();
  });

  test('validate OK với lineCircle + branch', () => {
    const def = getKind('intersection');
    expect(() => def.validate?.({ kind: 'lineCircle', ref1: 'l1', ref2: 'c1', branch: 0 } as never)).not.toThrow();
    expect(() => def.validate?.({ kind: 'lineCircle', ref1: 'l1', ref2: 'c1', branch: 1 } as never)).not.toThrow();
  });

  test('validate reject branch không phải 0/1', () => {
    const def = getKind('intersection');
    expect(() => def.validate?.({ kind: 'lineCircle', ref1: 'l1', ref2: 'c1', branch: 2 } as never)).toThrow();
  });

  test('dependsOn = [ref1, ref2]', () => {
    const def = getKind('intersection');
    expect(def.dependsOn({ kind: 'lineLine', ref1: 'l1', ref2: 'l2' } as never))
      .toEqual(['l1', 'l2']);
    expect(def.dependsOn({ kind: 'circleCircle', ref1: 'c1', ref2: 'c2', branch: 1 } as never))
      .toEqual(['c1', 'c2']);
  });

  test('describe in giao 2 ref', () => {
    const obj = mkObj('intersection', 'I1', { kind: 'lineLine' as const, ref1: 'l1', ref2: 'l2' });
    expect(getKind('intersection').describe(obj)).toMatch(/I1.*l1.*l2|giao/i);
  });
});
```

- [ ] **Step 2.1.9.2: Implement + barrel + commit**

```ts
// src/core/scene/kinds/intersection.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type IntersectionAttrs =
  | { kind: 'lineLine'; ref1: string; ref2: string; color?: string }
  | { kind: 'lineCircle'; ref1: string; ref2: string; branch: 0 | 1; color?: string }
  | { kind: 'circleCircle'; ref1: string; ref2: string; branch: 0 | 1; color?: string };

const def: KindDef<IntersectionAttrs> = {
  type: 'intersection',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a || !('kind' in a)) throw new Error('intersection: kind bắt buộc');
    if (!a.ref1 || !a.ref2) throw new Error('intersection: ref1 và ref2 bắt buộc');
    if (a.kind === 'lineLine') return;
    if (a.kind === 'lineCircle' || a.kind === 'circleCircle') {
      if (a.branch !== 0 && a.branch !== 1) {
        throw new Error(`intersection.${a.kind}: branch phải là 0 hoặc 1`);
      }
      return;
    }
    throw new Error(`intersection: kind không hợp lệ "${(a as { kind: string }).kind}"`);
  },
  dependsOn: (a) => [a.ref1, a.ref2],
  describe: (obj) => {
    const a = obj.attrs;
    return `${obj.label} = giao ${a.ref1} ∩ ${a.ref2}`;
  },
  render: () => null,
};

registerKind(def);
```

Thêm `import './intersection';` vào barrel.

Run: `npm test -- --testPathPattern 'kinds/__tests__/intersection\.test'`
Expected: PASS, 7 tests.

```bash
git add src/core/scene/kinds/intersection.ts \
        src/core/scene/kinds/__tests__/intersection.test.ts \
        src/core/scene/kinds/index.ts
git commit -m "feat(scene/kinds): intersection 2D — derived point cho giao lineLine/lineCircle/circleCircle"
```

---

### Task 2.1.10: Smoke test registry 19 kind

**Files:**
- Modify: `src/core/scene/__tests__/registry-smoke.test.ts`

- [ ] **Step 2.1.10.1: Update smoke test expect 19 kind**

```ts
// src/core/scene/__tests__/registry-smoke.test.ts
import '../kinds';
import { listKinds } from '../registry';

describe('registry smoke (sau khi import barrel kinds)', () => {
  test('có đủ 19 kind (11 3D + 8 2D) đã đăng ký', () => {
    const types = listKinds().map(k => k.type).sort();
    expect(types).toEqual([
      'circle',
      'cone3d',
      'cylinder3d',
      'intersection',
      'line',
      'line3d',
      'plane3d',
      'point',
      'point3d',
      'polygon',
      'polygon3d',
      'polyhedron3d',
      'ray',
      'ray3d',
      'segment',
      'segment3d',
      'sphere3d',
      'vector',
      'vector3d',
    ]);
  });

  test('mọi kind có describe và dependsOn', () => {
    for (const def of listKinds()) {
      expect(typeof def.describe).toBe('function');
      expect(typeof def.dependsOn).toBe('function');
    }
  });
});
```

- [ ] **Step 2.1.10.2: Run test + typecheck**

Run: `npm test -- --testPathPattern 'registry-smoke' && npm run typecheck`
Expected: PASS.

- [ ] **Step 2.1.10.3: Commit**

```bash
git add src/core/scene/__tests__/registry-smoke.test.ts
git commit -m "test(scene): smoke check đủ 19 kind (11 3D + 8 2D)"
```

---

## PR 2.2 — `JxgRenderer` 2D (~2 ngày)

**Mục tiêu:** subscribe store → diff state → render qua JSXGraph board 2D. Tương đương Phase 1 PR 1.3 nhưng cho board 2D (không phải view3d).

### Task 2.2.1: `Theme2D` + `RenderCtx2D` types

**Files:**
- Create: `src/core/scene/render/types2d.ts`

- [ ] **Step 2.2.1.1: Tạo file types**

```ts
// src/core/scene/render/types2d.ts
import type { RenderCtx } from '../types';

export type Theme2D = {
  stroke: string;
  fill: string;
  label: string;
  axis: string;
  grid: string;
  pointFill: string;
};

export const DEFAULT_THEME_2D: Theme2D = {
  stroke: '#0f172a',
  fill: '#60a5fa',
  label: '#0f172a',
  axis: '#94a3b8',
  grid: '#e2e8f0',
  pointFill: '#1e40af',
};

export type RenderCtx2D = RenderCtx & {
  theme: Theme2D;
};
```

- [ ] **Step 2.2.1.2: Commit**

```bash
git add src/core/scene/render/types2d.ts
git commit -m "feat(scene/render): Theme2D + RenderCtx2D + DEFAULT_THEME_2D"
```

---

### Task 2.2.2: Cài render function vào 8 kind 2D

**Mục tiêu:** thay `render: () => null` ở 8 kind thành render thật gọi `board.create(...)`. Đọc `src/stamps/geometry-2d/editor/MiniBoard.tsx` (khoảng dòng 1190–1370 là phần `board.create('axis', ...)` + `board.create('point', ...)`) để rút pattern.

- [ ] **Step 2.2.2.1: Sửa point render**

Mở `src/core/scene/kinds/point.ts`, thay block `render`:

```ts
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const c = obj.attrs.constraint;
    const opts: Record<string, unknown> = {
      name: obj.label,
      withLabel: obj.attrs.showLabel ?? true,
      visible: obj.visible,
      fixed: obj.locked,
      strokeColor: obj.attrs.color ?? '#1e40af',
      fillColor: obj.attrs.color ?? '#1e40af',
      face: obj.attrs.face ?? 'o',
      size: obj.attrs.size ?? 4,
    };
    if (c.kind === 'free') return board.create('point', [c.x, c.y], opts);
    if (c.kind === 'onAxis') {
      const coords: [number, number] = c.axis === 'x' ? [c.t, 0] : [0, c.t];
      return board.create('point', coords, opts);
    }
    if (c.kind === 'onLine') {
      const line = ctx.resolveRef(c.lineId) as any;
      return board.create('glider', [c.t, c.t, line], opts);
    }
    if (c.kind === 'onSegment') {
      const seg = ctx.resolveRef(c.segmentId) as any;
      return board.create('glider', [c.t, c.t, seg], opts);
    }
    if (c.kind === 'onCircle') {
      const circle = ctx.resolveRef(c.circleId) as any;
      return board.create('glider', [Math.cos(c.theta), Math.sin(c.theta), circle], opts);
    }
    if (c.kind === 'onPolygon') {
      const poly = ctx.resolveRef(c.polygonId) as any;
      return board.create('glider', [c.u, c.v, poly], opts);
    }
    return board.create('point', [0, 0], opts);
  },
```

- [ ] **Step 2.2.2.2: Sửa segment, line, ray, vector render**

`segment.ts`:

```ts
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const p1 = ctx.resolveRef(obj.attrs.p1);
    const p2 = ctx.resolveRef(obj.attrs.p2);
    return board.create('segment', [p1, p2], {
      name: obj.label,
      withLabel: obj.attrs.showLabel ?? false,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: obj.attrs.width ?? 2,
      dash: obj.attrs.dash ?? 0,
      visible: obj.visible,
      fixed: obj.locked,
    });
  },
```

`line.ts`:

```ts
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const p1 = ctx.resolveRef(obj.attrs.p1);
    const p2 = ctx.resolveRef(obj.attrs.p2);
    return board.create('line', [p1, p2], {
      name: obj.label,
      withLabel: obj.attrs.showLabel ?? false,
      straightFirst: true,
      straightLast: true,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: obj.attrs.width ?? 2,
      dash: obj.attrs.dash ?? 0,
      visible: obj.visible,
      fixed: obj.locked,
    });
  },
```

`ray.ts`:

```ts
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const o = ctx.resolveRef(obj.attrs.origin);
    const t = ctx.resolveRef(obj.attrs.through);
    return board.create('line', [o, t], {
      name: obj.label,
      straightFirst: false,
      straightLast: true,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: obj.attrs.width ?? 2,
      dash: obj.attrs.dash ?? 0,
      visible: obj.visible,
      fixed: obj.locked,
    });
  },
```

`vector.ts`:

```ts
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const f = ctx.resolveRef(obj.attrs.from);
    const t = ctx.resolveRef(obj.attrs.to);
    return board.create('arrow', [f, t], {
      name: obj.label,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: obj.attrs.width ?? 2,
      visible: obj.visible,
      fixed: obj.locked,
    });
  },
```

- [ ] **Step 2.2.2.3: Sửa circle render**

`circle.ts`:

```ts
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const center = ctx.resolveRef(obj.attrs.center);
    const surface = ctx.resolveRef(obj.attrs.surfacePoint);
    return board.create('circle', [center, surface], {
      name: obj.label,
      withLabel: obj.attrs.showLabel ?? false,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: obj.attrs.width ?? 2,
      dash: obj.attrs.dash ?? 0,
      fillColor: 'none',
      visible: obj.visible,
      fixed: obj.locked,
    });
  },
```

- [ ] **Step 2.2.2.4: Sửa polygon render**

`polygon.ts`:

```ts
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const verts = obj.attrs.vertices.map(id => ctx.resolveRef(id));
    return board.create('polygon', verts, {
      name: obj.label,
      withLabel: obj.attrs.showLabel ?? false,
      borders: {
        strokeColor: obj.attrs.color ?? '#0f172a',
        strokeWidth: obj.attrs.width ?? 2,
      },
      fillColor: obj.attrs.color ?? '#60a5fa',
      fillOpacity: obj.attrs.fillOpacity ?? 0.15,
      visible: obj.visible,
      fixed: obj.locked,
    });
  },
```

- [ ] **Step 2.2.2.5: Sửa intersection render**

`intersection.ts`:

```ts
  render: (obj, ctx) => {
    const board = ctx.jxg as any;
    const a = ctx.resolveRef(obj.attrs.ref1);
    const b = ctx.resolveRef(obj.attrs.ref2);
    const opts: Record<string, unknown> = {
      name: obj.label,
      withLabel: true,
      strokeColor: obj.attrs.color ?? '#dc2626',
      fillColor: obj.attrs.color ?? '#dc2626',
      visible: obj.visible,
      fixed: obj.locked,
    };
    if (obj.attrs.kind === 'lineLine') {
      return board.create('intersection', [a, b, 0], opts);
    }
    // lineCircle hoặc circleCircle: branch 0/1
    const branch = obj.attrs.branch ?? 0;
    return board.create('intersection', [a, b, branch], opts);
  },
```

- [ ] **Step 2.2.2.6: Verify typecheck + test kinds vẫn pass**

Run: `npm run typecheck && npm test -- --testPathPattern 'kinds/__tests__'`
Expected: PASS (render không bị test trực tiếp ở các test kind — chỉ test ở Task 2.2.3).

- [ ] **Step 2.2.2.7: Commit**

```bash
git add src/core/scene/kinds/point.ts \
        src/core/scene/kinds/segment.ts \
        src/core/scene/kinds/line.ts \
        src/core/scene/kinds/ray.ts \
        src/core/scene/kinds/vector.ts \
        src/core/scene/kinds/circle.ts \
        src/core/scene/kinds/polygon.ts \
        src/core/scene/kinds/intersection.ts
git commit -m "feat(scene/kinds): cài render JSXGraph board 2D cho 8 kind"
```

---

### Task 2.2.3: `JxgRenderer` 2D class (TDD với mock JSXGraph)

**Files:**
- Create: `src/core/scene/render/JxgRenderer.ts`
- Test: `src/core/scene/render/__tests__/JxgRenderer.test.ts`

- [ ] **Step 2.2.3.1: Viết mock JSXGraph board + test**

```ts
// src/core/scene/render/__tests__/JxgRenderer.test.ts
import { createStore } from '../../store';
import { createEmptyState } from '../../types';
import { JxgRenderer } from '../JxgRenderer';
import '../../kinds';
import type { SceneObject } from '../../types';

function mockBoard() {
  const created: any[] = [];
  const removed: any[] = [];
  const board = {
    create: jest.fn((type: string, parents: any, attrs: any) => {
      const el = { type, parents, attrs, _id: `${type}_${created.length}` };
      created.push(el);
      return el;
    }),
    removeObject: jest.fn((el: any) => { removed.push(el); }),
  };
  return { board, created, removed };
}

const mkPoint = (id: string, x = 0, y = 0): SceneObject => ({
  id, kind: 'point', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1,
  attrs: { constraint: { kind: 'free', x, y } },
});

const mkSegment = (id: string, p1: string, p2: string): SceneObject => ({
  id, kind: 'segment', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1,
  attrs: { p1, p2 },
});

const mkPolygon = (id: string, vertices: string[]): SceneObject => ({
  id, kind: 'polygon', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1,
  attrs: { vertices },
});

describe('JxgRenderer (2D)', () => {
  test('ADD point → board.create("point", [x, y], ...)', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A', 1, 2) } });
    expect(created).toHaveLength(1);
    expect(created[0].type).toBe('point');
    expect(created[0].parents).toEqual([1, 2]);
  });

  test('ADD segment sau 2 point → parents resolved đúng', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkSegment('s1', 'A', 'B') } });
    expect(created).toHaveLength(3);
    expect(created[2].type).toBe('segment');
    expect(created[2].parents[0]).toBe(created[0]);
    expect(created[2].parents[1]).toBe(created[1]);
  });

  test('ADD polygon sau 3 point → parents là array refs', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('C') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPolygon('poly1', ['A', 'B', 'C']) } });
    expect(created).toHaveLength(4);
    expect(created[3].type).toBe('polygon');
    expect(created[3].parents).toEqual([created[0], created[1], created[2]]);
  });

  test('DELETE point cascade → segment cũng remove', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, removed } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkSegment('s1', 'A', 'B') } });
    store.dispatch({ type: 'DELETE', payload: { id: 'A' } });
    expect(removed.length).toBeGreaterThanOrEqual(2);
  });

  test('UPDATE_ATTRS point → remove + recreate', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created, removed } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A', 0, 0) } });
    store.dispatch({ type: 'UPDATE_ATTRS', payload: { id: 'A', patch: { constraint: { kind: 'free', x: 5, y: 5 } } } });
    expect(removed).toHaveLength(1);
    expect(created).toHaveLength(2);
  });

  test('dispose unsubscribe + remove tất cả', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, removed } = mockBoard();
    const renderer = new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A') } });
    renderer.dispose();
    expect(removed).toHaveLength(1);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B') } });
    expect(removed).toHaveLength(1);
  });

  test('LOAD state từ empty → render toàn bộ theo state.order', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    const loaded = {
      objects: {
        A: mkPoint('A', 1, 1),
        B: mkPoint('B', 2, 2),
        s1: mkSegment('s1', 'A', 'B'),
      },
      order: ['A', 'B', 's1'],
      counter: 3,
      meta: { domain: '2d' as const, version: 1 },
    };
    store.dispatch({ type: 'LOAD', payload: { state: loaded } });
    expect(created).toHaveLength(3);
    expect(created.map(c => c.type)).toEqual(['point', 'point', 'segment']);
  });

  test('UNDO sau ADD → element bị remove', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, removed } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A') } });
    expect(removed).toHaveLength(0);
    store.undo();
    expect(removed).toHaveLength(1);
  });
});
```

- [ ] **Step 2.2.3.2: Chạy fail**

Run: `npm test -- --testPathPattern 'render/__tests__/JxgRenderer\.test'`
Expected: FAIL — "Cannot find module '../JxgRenderer'".

- [ ] **Step 2.2.3.3: Implement `JxgRenderer.ts`**

```ts
// src/core/scene/render/JxgRenderer.ts
import type { Store } from '../store';
import type { State, SceneObject, RenderCtx } from '../types';
import { getKind } from '../registry';
import { DEFAULT_THEME_2D, type Theme2D } from './types2d';

export type JxgRendererOptions = { theme?: Theme2D };

export class JxgRenderer {
  private board: unknown;
  private store: Store;
  private theme: Theme2D;
  private elements = new Map<string, unknown>();
  private unsubscribe: () => void;
  private disposed = false;

  constructor(store: Store, board: unknown, options: JxgRendererOptions = {}) {
    this.store = store;
    this.board = board;
    this.theme = options.theme ?? DEFAULT_THEME_2D;
    this.unsubscribe = store.subscribe((next, prev) => this.applyDiff(prev, next));
    // Render state hiện tại (vd LOAD chạy trước khi subscribe).
    this.applyDiff(undefined, store.getState());
  }

  private ctx(): RenderCtx {
    return {
      jxg: this.board,
      resolveRef: (id: string) => {
        const el = this.elements.get(id);
        if (!el) throw new Error(`[scene/2d] resolveRef: chưa render id="${id}"`);
        return el;
      },
      defaults: { theme: this.theme },
    };
  }

  private create(obj: SceneObject): void {
    try {
      const def = getKind(obj.kind);
      const el = def.render(obj, this.ctx());
      this.elements.set(obj.id, el);
    } catch (err) {
      console.warn(`[scene/render/2d] không render được ${obj.kind} id="${obj.id}":`, err);
    }
  }

  private remove(id: string): void {
    const el = this.elements.get(id);
    if (!el) return;
    try {
      (this.board as { removeObject?: (e: unknown) => void }).removeObject?.(el);
    } catch (err) {
      console.warn(`[scene/render/2d] không remove được id="${id}":`, err);
    }
    this.elements.delete(id);
  }

  private applyDiff(prev: State | undefined, next: State): void {
    if (this.disposed) return;
    const prevObjs = prev?.objects ?? {};
    const nextObjs = next.objects;

    // Xoá ids biến mất.
    for (const id of Object.keys(prevObjs)) {
      if (!(id in nextObjs)) this.remove(id);
    }

    // Thêm/cập nhật theo state.order — đảm bảo refs có trước.
    for (const id of next.order) {
      const cur = nextObjs[id];
      const old = prevObjs[id] as SceneObject | undefined;
      if (!old) {
        this.create(cur);
        continue;
      }
      if (Object.is(old, cur)) continue;
      const def = getKind(cur.kind);
      const existing = this.elements.get(id);
      if (def.update && existing) {
        try { def.update(cur, old, this.ctx(), existing); continue; }
        catch (err) { console.warn(`[scene/render/2d] update fail, recreate:`, err); }
      }
      this.remove(id);
      this.create(cur);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.unsubscribe();
    for (const id of Array.from(this.elements.keys())) this.remove(id);
    this.disposed = true;
  }
}
```

- [ ] **Step 2.2.3.4: Run test pass**

Run: `npm test -- --testPathPattern 'render/__tests__/JxgRenderer\.test'`
Expected: PASS, 8 tests.

- [ ] **Step 2.2.3.5: Commit**

```bash
git add src/core/scene/render/JxgRenderer.ts \
        src/core/scene/render/__tests__/JxgRenderer.test.ts
git commit -m "feat(scene/render): JxgRenderer 2D — subscribe store → diff → JSXGraph board"
```

---

## PR 2.3 — Port MiniBoard + EditorPanel + handlers + serialize (~4 ngày)

**Mục tiêu:** Wire `JxgRenderer` 2D vào EditorPanel 2D, MiniBoard, handlers, hitTest. Xoá `creationLogRef`, `objMapRef`, `redoStackRef`. Update `serialize.ts` xuất shape `{ version: 2, state: State }`.

> **Lưu ý:** PR này là **risk-cao nhất Phase 2** (`MiniBoard.tsx` 1469 dòng). Trước khi bắt đầu, tạo nhánh backup: `git checkout -b backup/pre-pr-2.3 && git checkout main`. Nếu fail giữa chừng có thể rollback. Chia thành 8 sub-PR sequential commit, KHÔNG bundle.

### Sub-PR 2.3.1: `serialize.ts` 2D — version 2 format

**Files:**
- Modify: `src/stamps/geometry-2d/serialize.ts`
- Modify: `src/stamps/geometry-2d/__tests__/serialize.test.ts`

#### Task 2.3.1.1: Viết lại `serialize.ts`

- [ ] **Step 2.3.1.1.1: Đọc file hiện tại**

Run: `wc -l src/stamps/geometry-2d/serialize.ts`
Expected: 127 dòng — đang dùng `SerializedElement[]` creation log.

- [ ] **Step 2.3.1.1.2: Viết lại `serialize.ts`**

```ts
// src/stamps/geometry-2d/serialize.ts
import type { State } from '../../core/scene';
import { createEmptyState, migrateState } from '../../core/scene';

export interface SerializedBoard {
  version: 2;
  bbox: [number, number, number, number];
  state: State;
  showAxis?: boolean;
  showGrid?: boolean;
}

export function serializeBoard(
  bbox: [number, number, number, number],
  state: State,
  options: { showAxis?: boolean; showGrid?: boolean } = {},
): SerializedBoard {
  return {
    version: 2,
    bbox,
    state,
    showAxis: !!options.showAxis,
    showGrid: !!options.showGrid,
  };
}

export function deserializeBoard(raw: unknown): SerializedBoard {
  if (raw && typeof raw === 'object' && (raw as { version?: number }).version === 2) {
    const r = raw as SerializedBoard;
    return {
      version: 2,
      bbox: r.bbox,
      state: migrateState(r.state),
      showAxis: !!r.showAxis,
      showGrid: !!r.showGrid,
    };
  }
  // Format không nhận diện được (vd v1 cũ với SerializedElement[]) → wipe.
  console.warn('[2d/serialize] format không nhận diện hoặc v1 cũ — dùng state rỗng');
  return {
    version: 2,
    bbox: [-5, 5, 5, -5],
    state: createEmptyState('2d'),
    showAxis: false,
    showGrid: false,
  };
}
```

- [ ] **Step 2.3.1.1.3: Viết lại test serialize**

```ts
// src/stamps/geometry-2d/__tests__/serialize.test.ts
import { serializeBoard, deserializeBoard, type SerializedBoard } from '../serialize';
import { createEmptyState } from '../../../core/scene';

describe('2d/serialize', () => {
  test('round-trip empty state', () => {
    const state = createEmptyState('2d');
    const raw: SerializedBoard = serializeBoard([-5, 5, 5, -5], state, { showAxis: true, showGrid: false });
    expect(raw.version).toBe(2);
    expect(raw.showAxis).toBe(true);
    expect(raw.showGrid).toBe(false);
    const back = deserializeBoard(raw);
    expect(back.state).toEqual(state);
    expect(back.bbox).toEqual([-5, 5, 5, -5]);
  });

  test('deserialize format v1 cũ (SerializedElement[]) → empty state', () => {
    const v1 = { bbox: [-5, 5, 5, -5], elements: [{ type: 'point', args: [0, 0], attrs: {}, id: 'j0' }] };
    const back = deserializeBoard(v1);
    expect(back.state.objects).toEqual({});
    expect(back.state.order).toEqual([]);
  });

  test('deserialize null hoặc undefined → empty state', () => {
    expect(deserializeBoard(null).state.objects).toEqual({});
    expect(deserializeBoard(undefined).state.objects).toEqual({});
  });
});
```

- [ ] **Step 2.3.1.1.4: Run test**

Run: `npm test -- --testPathPattern 'geometry-2d/__tests__/serialize'`
Expected: PASS, 3 tests.

- [ ] **Step 2.3.1.1.5: Commit**

```bash
git add src/stamps/geometry-2d/serialize.ts \
        src/stamps/geometry-2d/__tests__/serialize.test.ts
git commit -m "feat(geometry-2d/serialize): version 2 format { version, bbox, state } qua core/scene State"
```

---

### Sub-PR 2.3.2: Handlers + hit-test dispatch action

**Files:**
- Modify: `src/stamps/geometry-2d/editor/handlers.ts`
- Modify: `src/stamps/geometry-2d/editor/hitTest.ts`
- Modify: `src/stamps/geometry-2d/editor/transforms.ts`

#### Task 2.3.2.1: Refactor `hitTest.ts` nhận `State`

- [ ] **Step 2.3.2.1.1: Đọc file hiện tại**

Run: `wc -l src/stamps/geometry-2d/editor/hitTest.ts && head -30 src/stamps/geometry-2d/editor/hitTest.ts`
Expected: 61 dòng — function `findNearestPointInList(list, x, y, tol, exclude)`.

- [ ] **Step 2.3.2.1.2: Sửa signature thành `(state, predicate)`**

Replace toàn bộ `src/stamps/geometry-2d/editor/hitTest.ts`:

```ts
// src/stamps/geometry-2d/editor/hitTest.ts
import type { State, SceneObject } from '../../../core/scene';
import { listObjects } from '../../../core/scene';

/**
 * Tìm point gần (x, y) nhất trong state, trong vòng tol.
 *
 * Sử dụng `pointCoord(id) => [x, y] | null` để hit-test theo toạ độ JSXGraph
 * thực tế (resolve qua JxgRenderer Map). Trả về `null` nếu không có point nào
 * trong vòng tol.
 */
export function findNearestPoint(
  state: State,
  pointCoord: (id: string) => [number, number] | null,
  x: number,
  y: number,
  tolPx: number,
  excludeIds: Set<string> = new Set(),
): SceneObject | null {
  let best: SceneObject | null = null;
  let bestDistSq = tolPx * tolPx;
  for (const obj of listObjects(state)) {
    if (obj.kind !== 'point' && obj.kind !== 'intersection') continue;
    if (excludeIds.has(obj.id)) continue;
    const coord = pointCoord(obj.id);
    if (!coord) continue;
    const dx = coord[0] - x;
    const dy = coord[1] - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      best = obj;
    }
  }
  return best;
}
```

- [ ] **Step 2.3.2.1.3: Xoá test cũ (API cũ không port được)**

```bash
git rm src/stamps/geometry-2d/__tests__/hitTest.test.ts
```

- [ ] **Step 2.3.2.1.4: Verify typecheck**

Run: `npm run typecheck 2>&1 | grep -E "hitTest|handlers\.ts" | head -20`
Expected: có thể còn lỗi ở `handlers.ts` (sẽ fix Task 2.3.2.2 + 2.3.3).

- [ ] **Step 2.3.2.1.5: Commit**

```bash
git add src/stamps/geometry-2d/editor/hitTest.ts
git commit -m "refactor(geometry-2d/hitTest): findNearestPoint nhận State + pointCoord callback thay vì list JxgObj"
```

#### Task 2.3.2.2: Refactor `transforms.ts` nhận `SceneObject`

- [ ] **Step 2.3.2.2.1: Đọc file**

Run: `wc -l src/stamps/geometry-2d/editor/transforms.ts && head -30 src/stamps/geometry-2d/editor/transforms.ts`
Expected: 111 dòng — `getDefiningPoints(obj)` dùng `obj.point1/point2/center` JSXGraph.

- [ ] **Step 2.3.2.2.2: Sửa signature thành `(obj: SceneObject, state)`**

Replace `getDefiningPoints` trong `src/stamps/geometry-2d/editor/transforms.ts`:

```ts
import type { State, SceneObject } from '../../../core/scene';

/**
 * Trả về danh sách id điểm "định nghĩa" object — dùng cho transform tools
 * (translate/rotate/reflect/dilate) cần biết các điểm gốc để clone.
 */
export function getDefiningPoints(obj: SceneObject, state: State): string[] {
  if (obj.kind === 'point' || obj.kind === 'intersection') return [obj.id];
  if (obj.kind === 'segment' || obj.kind === 'line') {
    const a = obj.attrs as { p1: string; p2: string };
    return [a.p1, a.p2];
  }
  if (obj.kind === 'ray') {
    const a = obj.attrs as { origin: string; through: string };
    return [a.origin, a.through];
  }
  if (obj.kind === 'vector') {
    const a = obj.attrs as { from: string; to: string };
    return [a.from, a.to];
  }
  if (obj.kind === 'circle') {
    const a = obj.attrs as { center: string; surfacePoint: string };
    return [a.center, a.surfacePoint];
  }
  if (obj.kind === 'polygon') {
    return [...(obj.attrs as { vertices: string[] }).vertices];
  }
  return [];
}

// buildTransformSpec giữ nguyên — không touch state. Spec object là input
// cho `kind: 'point'` mới với attrs.constraint type free + transform metadata
// (handlers sẽ wrap thành SceneObject).
export { buildTransformSpec } from './transforms-legacy';
```

> Note: nếu `buildTransformSpec` phức tạp, di chuyển nó sang `transforms-legacy.ts` (giữ logic cũ) hoặc inline trong `handlers.ts`. Quyết định khi đọc code thực — pattern recommended: giữ `buildTransformSpec` ở `transforms.ts` nguyên vẹn nếu nó pure (không touch JSXGraph board), chỉ rewrite `getDefiningPoints`.

- [ ] **Step 2.3.2.2.3: Sửa test transforms**

```ts
// src/stamps/geometry-2d/__tests__/transforms.test.ts (overwrite)
import { getDefiningPoints } from '../editor/transforms';
import { createEmptyState } from '../../../core/scene';
import type { SceneObject } from '../../../core/scene';

const state = createEmptyState('2d');
const mk = (kind: string, id: string, attrs: any): SceneObject => ({
  id, kind, label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs,
});

describe('getDefiningPoints', () => {
  it('point trả về chính nó', () => {
    expect(getDefiningPoints(mk('point', 'A', { constraint: { kind: 'free', x: 0, y: 0 } }), state))
      .toEqual(['A']);
  });

  it('segment trả về [p1, p2]', () => {
    expect(getDefiningPoints(mk('segment', 's1', { p1: 'A', p2: 'B' }), state))
      .toEqual(['A', 'B']);
  });

  it('line, ray, vector', () => {
    expect(getDefiningPoints(mk('line', 'l1', { p1: 'A', p2: 'B' }), state)).toEqual(['A', 'B']);
    expect(getDefiningPoints(mk('ray', 'r1', { origin: 'A', through: 'B' }), state)).toEqual(['A', 'B']);
    expect(getDefiningPoints(mk('vector', 'v1', { from: 'A', to: 'B' }), state)).toEqual(['A', 'B']);
  });

  it('circle trả về [center, surfacePoint]', () => {
    expect(getDefiningPoints(mk('circle', 'c1', { center: 'O', surfacePoint: 'A' }), state))
      .toEqual(['O', 'A']);
  });

  it('polygon trả về vertices', () => {
    expect(getDefiningPoints(mk('polygon', 'p1', { vertices: ['A', 'B', 'C', 'D'] }), state))
      .toEqual(['A', 'B', 'C', 'D']);
  });
});
```

- [ ] **Step 2.3.2.2.4: Run test transforms**

Run: `npm test -- --testPathPattern 'geometry-2d/__tests__/transforms'`
Expected: PASS, 5 tests.

- [ ] **Step 2.3.2.2.5: Commit**

```bash
git add src/stamps/geometry-2d/editor/transforms.ts \
        src/stamps/geometry-2d/__tests__/transforms.test.ts
git commit -m "refactor(geometry-2d/transforms): getDefiningPoints nhận SceneObject thay vì JxgObj"
```

#### Task 2.3.2.3: Refactor `handlers.ts` — dispatch action

- [ ] **Step 2.3.2.3.1: Đọc handlers.ts**

Run: `wc -l src/stamps/geometry-2d/editor/handlers.ts`
Expected: 488 dòng. `HandlerCtx` interface có `create()`, `finalize()`, `clearPending()` callbacks. Refactor thành: thay `ctx.create(type, args, attrs)` thành `ctx.dispatch({ type: 'ADD', payload: { obj: ... } })`.

- [ ] **Step 2.3.2.3.2: Sửa `HandlerCtx` interface**

Trong `src/stamps/geometry-2d/editor/handlers.ts`, thay block `HandlerCtx`:

```ts
export interface HandlerCtx {
  // Refs (read .current at call time)
  boardRef: { current: any };
  toolRef: { current: GeomTool };
  pendingRef: { current: any[] };       // pending JXG objects (cho tool cần ≥2 click)
  pendingIdsRef: { current: string[] }; // pending scene ids tương ứng
  previewSegRef: { current: any[] };
  axisObjsRef: { current: { x?: any; y?: any } };
  selectedSetRef: { current: Set<string> }; // selection lưu theo SCENE ID
  marqueeRef: { current: { startSx: number; startSy: number; rect?: any } | null };
  moveDownRef: { current: { sx: number; sy: number } | null };
  lastMoveClickRef: { current: { id: string | null; time: number } };
  pendingTransformRef: { current: any };
  phantomRef: { current: any };
  previewShapeRef: { current: any };
  previewRafRef: { current: number | null };
  jxgRef: { current: any };

  // Store-bound callbacks
  store: import('../../../core/scene').Store;
  jxgIdToSceneId: (jxgObj: any) => string | null;
  jxgFromSceneId: (id: string) => any;

  // Stable callbacks
  screenCoordsOf: (evt: any) => [number, number] | null;
  objectsAt: (evt: any) => any[];
  findNearestPointJxg: (evt: any, tolPx?: number) => any | null;
  toggleSelect: (id: string, additive: boolean) => void;
  clearSelection: () => void;
  nextLabel: (kind: string) => string;
  flashWarn: (msg: string) => void;
  emitSelect: (snap: any | null) => void;
  emitTransform: (info: any | null) => void;
}
```

- [ ] **Step 2.3.2.3.3: Sửa các handler dispatch action**

Trong `handleDown` / `handleUp`, thay mọi chỗ `ctx.create('point', [x, y], attrs)` thành:

```ts
// Pattern: tạo SceneObject + dispatch ADD
const state = ctx.store.getState();
const label = ctx.nextLabel('point');
const id = `p_${state.counter + 1}`;
const obj = {
  id,
  kind: 'point',
  label,
  visible: true,
  locked: false,
  layer: 'default',
  schemaVersion: 1,
  attrs: { constraint: { kind: 'free' as const, x, y } },
};
ctx.store.dispatch({ type: 'ADD', payload: { obj } });
const newJxg = ctx.jxgFromSceneId(id); // renderer đã render xong khi subscribe callback chạy
```

Tương tự cho `segment`/`line`/`ray`/`vector`/`circle`/`polygon`/`intersection` — chỉ đổi `kind` + `attrs`.

Cho `polygon` (finalize khi click lại điểm đầu):

```ts
const vertices = ctx.pendingIdsRef.current.slice();
const id = `poly_${state.counter + 1}`;
ctx.store.dispatch({
  type: 'ADD',
  payload: {
    obj: {
      id,
      kind: 'polygon',
      label: ctx.nextLabel('polygon'),
      visible: true, locked: false, layer: 'default',
      schemaVersion: 1,
      attrs: { vertices },
    },
  },
});
ctx.clearPending();
```

Cho delete tool:

```ts
const sceneId = ctx.jxgIdToSceneId(picks[0]);
if (sceneId) ctx.store.dispatch({ type: 'DELETE', payload: { id: sceneId } });
```

> Note: handlers.ts là file lớn (488 dòng). Sửa từng handler 1 commit nhỏ nếu cần. Khi xong xoá `ctx.create`, `ctx.finalize`, `ctx.finalizeTransformCreate` (chuyển logic vào MiniBoard subscribe / dispatch).

- [ ] **Step 2.3.2.3.4: Verify typecheck (file đơn lẻ)**

Run: `npx tsc --noEmit src/stamps/geometry-2d/editor/handlers.ts 2>&1 | head -30`
Expected: có thể còn lỗi nhỏ (sẽ fix khi MiniBoard cung cấp ctx). Goal: handlers.ts không còn dùng `ctx.create`.

- [ ] **Step 2.3.2.3.5: Commit**

```bash
git add src/stamps/geometry-2d/editor/handlers.ts
git commit -m "refactor(geometry-2d/handlers): dispatch ADD/DELETE/UPDATE_ATTRS action thay vì ctx.create"
```

---

### Sub-PR 2.3.3: Split `MiniBoard.tsx` — extract hooks

**Mục tiêu:** giảm `MiniBoard.tsx` từ 1469 dòng xuống < 500 dòng bằng cách tách `useSceneStore` + `useToolStateMachine` hook.

#### Task 2.3.3.1: Tạo `useSceneStore` hook

- [ ] **Step 2.3.3.1.1: Viết test hook**

```ts
// src/stamps/geometry-2d/editor/__tests__/useSceneStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useSceneStore } from '../useSceneStore';
import { createEmptyState } from '../../../../core/scene';

describe('useSceneStore', () => {
  test('khởi tạo store + state hiện tại', () => {
    const { result } = renderHook(() => useSceneStore(createEmptyState('2d')));
    expect(result.current.state.objects).toEqual({});
    expect(result.current.state.order).toEqual([]);
  });

  test('dispatch ADD point → state cập nhật + re-render', () => {
    const { result } = renderHook(() => useSceneStore(createEmptyState('2d')));
    act(() => {
      result.current.store.dispatch({
        type: 'ADD',
        payload: {
          obj: {
            id: 'p1', kind: 'point', label: 'A', visible: true, locked: false, layer: 'default',
            schemaVersion: 1,
            attrs: { constraint: { kind: 'free', x: 1, y: 2 } },
          },
        },
      });
    });
    expect(result.current.state.objects.p1?.label).toBe('A');
    expect(result.current.canUndo).toBe(true);
  });

  test('undo/redo flip canUndo/canRedo', () => {
    const { result } = renderHook(() => useSceneStore(createEmptyState('2d')));
    act(() => {
      result.current.store.dispatch({
        type: 'ADD',
        payload: {
          obj: {
            id: 'p1', kind: 'point', label: 'A', visible: true, locked: false, layer: 'default',
            schemaVersion: 1,
            attrs: { constraint: { kind: 'free', x: 0, y: 0 } },
          },
        },
      });
    });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    act(() => { result.current.store.undo(); });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });
});
```

- [ ] **Step 2.3.3.1.2: Implement hook**

```tsx
// src/stamps/geometry-2d/editor/useSceneStore.ts
import { useMemo, useSyncExternalStore } from 'react';
import { createStore, type State, type Store } from '../../../core/scene';

export type SceneStoreApi = {
  store: Store;
  state: State;
  canUndo: boolean;
  canRedo: boolean;
};

export function useSceneStore(initialState: State): SceneStoreApi {
  const store = useMemo(() => createStore(initialState), []);
  const state = useSyncExternalStore(
    (cb) => store.subscribe(() => cb()),
    () => store.getState(),
    () => store.getState(),
  );
  const canUndo = store.canUndo();
  const canRedo = store.canRedo();
  return { store, state, canUndo, canRedo };
}
```

- [ ] **Step 2.3.3.1.3: Run test**

Run: `npm test -- --testPathPattern 'useSceneStore'`
Expected: PASS, 3 tests.

- [ ] **Step 2.3.3.1.4: Commit**

```bash
git add src/stamps/geometry-2d/editor/useSceneStore.ts \
        src/stamps/geometry-2d/editor/__tests__/useSceneStore.test.ts
git commit -m "feat(geometry-2d/editor): useSceneStore hook (createStore + useSyncExternalStore)"
```

#### Task 2.3.3.2: Tạo `useToolStateMachine` hook

- [ ] **Step 2.3.3.2.1: Viết test**

```ts
// src/stamps/geometry-2d/editor/__tests__/useToolStateMachine.test.ts
import { renderHook, act } from '@testing-library/react';
import { useToolStateMachine } from '../useToolStateMachine';

describe('useToolStateMachine', () => {
  test('khởi tạo tool = move + pending = []', () => {
    const { result } = renderHook(() => useToolStateMachine('move'));
    expect(result.current.tool).toBe('move');
    expect(result.current.pendingIds).toEqual([]);
  });

  test('setTool clears pending', () => {
    const { result } = renderHook(() => useToolStateMachine('move'));
    act(() => { result.current.pushPending('p1'); });
    expect(result.current.pendingIds).toEqual(['p1']);
    act(() => { result.current.setTool('segment'); });
    expect(result.current.tool).toBe('segment');
    expect(result.current.pendingIds).toEqual([]);
  });

  test('pushPending append + clearPending reset', () => {
    const { result } = renderHook(() => useToolStateMachine('segment'));
    act(() => { result.current.pushPending('p1'); });
    act(() => { result.current.pushPending('p2'); });
    expect(result.current.pendingIds).toEqual(['p1', 'p2']);
    act(() => { result.current.clearPending(); });
    expect(result.current.pendingIds).toEqual([]);
  });
});
```

- [ ] **Step 2.3.3.2.2: Implement hook**

```ts
// src/stamps/geometry-2d/editor/useToolStateMachine.ts
import { useCallback, useRef, useState } from 'react';
import type { GeomTool } from './tools';

export type ToolStateMachine = {
  tool: GeomTool;
  pendingIds: string[];
  toolRef: { readonly current: GeomTool };
  pendingIdsRef: { readonly current: string[] };
  setTool: (t: GeomTool) => void;
  pushPending: (id: string) => void;
  clearPending: () => void;
};

export function useToolStateMachine(initial: GeomTool = 'move'): ToolStateMachine {
  const [tool, setToolState] = useState<GeomTool>(initial);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const toolRef = useRef<GeomTool>(initial);
  const pendingIdsRef = useRef<string[]>([]);

  const setTool = useCallback((t: GeomTool) => {
    toolRef.current = t;
    pendingIdsRef.current = [];
    setToolState(t);
    setPendingIds([]);
  }, []);

  const pushPending = useCallback((id: string) => {
    pendingIdsRef.current = [...pendingIdsRef.current, id];
    setPendingIds(pendingIdsRef.current);
  }, []);

  const clearPending = useCallback(() => {
    pendingIdsRef.current = [];
    setPendingIds([]);
  }, []);

  return { tool, pendingIds, toolRef, pendingIdsRef, setTool, pushPending, clearPending };
}
```

- [ ] **Step 2.3.3.2.3: Run test**

Run: `npm test -- --testPathPattern 'useToolStateMachine'`
Expected: PASS, 3 tests.

- [ ] **Step 2.3.3.2.4: Commit**

```bash
git add src/stamps/geometry-2d/editor/useToolStateMachine.ts \
        src/stamps/geometry-2d/editor/__tests__/useToolStateMachine.test.ts
git commit -m "feat(geometry-2d/editor): useToolStateMachine hook (tool + pendingIds)"
```

#### Task 2.3.3.3: Rewrite `MiniBoard.tsx` dùng hooks + store

- [ ] **Step 2.3.3.3.1: Đọc file trước khi rewrite**

Run: `wc -l src/stamps/geometry-2d/editor/MiniBoard.tsx`
Expected: 1469 dòng.

- [ ] **Step 2.3.3.3.2: Rewrite MiniBoard.tsx core structure**

Goal: `< 500` dòng. Pattern chính:

```tsx
// src/stamps/geometry-2d/editor/MiniBoard.tsx (rewrite — chỉ phần khung chính, mở rộng với event handlers)
'use client';
import React, { useCallback, useEffect, useId, useImperativeHandle, useRef } from 'react';
import { JxgRenderer } from '../../../core/scene/render/JxgRenderer';
import { listObjects, nextLabel, type Store } from '../../../core/scene';
import type { SerializedBoard } from '../serialize';
import { useSceneStore } from './useSceneStore';
import { useToolStateMachine } from './useToolStateMachine';
import { handleDown, handleUp, handleMove, type HandlerCtx } from './handlers';
import { TOOLS, type GeomTool, type ToolDef } from './tools';
import { themeAxis, themeGrid, paletteFor } from './theme';
import { safeJsx } from '../../shared/safeJsx';

export interface MiniBoardHandle {
  getContainer: () => HTMLDivElement | null;
  getBbox: () => [number, number, number, number];
  getState: () => import('../../../core/scene').State;
  getShowAxis: () => boolean;
  getShowGrid: () => boolean;
  setTool: (t: GeomTool) => void;
  getTool: () => GeomTool;
  setShowAxis: (b: boolean) => void;
  setShowGrid: (b: boolean) => void;
  undo: () => void;
  canUndo: () => boolean;
  redo: () => void;
  canRedo: () => boolean;
  subscribe: (cb: () => void) => () => void;
  snapshotObject: (id: string, anchorScreen: { x: number; y: number }) => ObjectSnapshot | null;
  mutateObject: (id: string, patch: { attrs?: Record<string, unknown>; remove?: boolean }) => void;
  getAllPointNames: () => string[];
  onSelect: (cb: (snap: ObjectSnapshot) => void) => () => void;
  onTransformParam: (cb: (info: any) => void) => () => void;
  confirmTransformParam: (value: number) => void;
  cancelTransformParam: () => void;
  getSelectionSize: () => number;
  clearSelection: () => void;
  deleteSelection: () => void;
}

export interface ObjectSnapshot {
  id: string;
  kind: 'point' | 'line' | 'circle';
  name: string;
  color: string;
  width: number;
  dash: number;
  face: 'o' | 'circle' | 'cross' | 'plus';
  showLabel: boolean;
  showValue: boolean;
  screenCoords: { x: number; y: number };
}

interface Props {
  onReady: (handle: MiniBoardHandle) => void;
  initialState: SerializedBoard | null;
  isDark?: boolean;
}

export const JSXGraphMiniBoard: React.FC<Props> = ({ onReady, initialState, isDark }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<any>(null);
  const rendererRef = useRef<JxgRenderer | null>(null);
  const jxgIdToScene = useRef<Map<string, string>>(new Map()); // jxgObj.id → scene id
  const selectedRef = useRef<Set<string>>(new Set());
  const containerId = `jxg_${useId().replace(/[^a-zA-Z0-9]/g, '_')}`;

  const initState = initialState?.state ?? require('../../../core/scene').createEmptyState('2d');
  const { store, state, canUndo, canRedo } = useSceneStore(initState);
  const toolSM = useToolStateMachine('move');

  // Mount JSXGraph board + renderer
  useEffect(() => {
    if (!containerRef.current) return;
    const JXG = (window as any).JXG;
    if (!JXG) {
      // Load JXG dynamically (giống pattern hiện tại của MiniBoard cũ)
      import('jsxgraph').then(mod => { (window as any).JXG = mod.default; });
      return;
    }
    safeJsx('MiniBoard.applyOptions', () => {
      JXG.Options.text.display = 'internal';
    });
    const board = JXG.JSXGraph.initBoard(containerId, {
      boundingbox: initialState?.bbox ?? [-5, 5, 5, -5],
      axis: !!initialState?.showAxis,
      grid: !!initialState?.showGrid,
      showCopyright: false,
      showNavigation: false,
      keepAspectRatio: true,
      pan: { enabled: true, needShift: false },
    });
    boardRef.current = board;
    rendererRef.current = new JxgRenderer(store, board);
    return () => {
      rendererRef.current?.dispose();
      safeJsx('MiniBoard.freeBoard', () => JXG.JSXGraph.freeBoard(board));
    };
  }, [containerId, initialState, store]);

  // Build handler context — store + tool refs + nextLabel + jxg adapter
  const ctxRef = useRef<HandlerCtx | null>(null);
  ctxRef.current = {
    boardRef: { current: boardRef.current },
    toolRef: toolSM.toolRef as any,
    pendingRef: { current: [] }, // legacy — for compatibility
    pendingIdsRef: toolSM.pendingIdsRef as any,
    previewSegRef: { current: [] },
    axisObjsRef: { current: {} },
    selectedSetRef: selectedRef as any,
    marqueeRef: { current: null },
    moveDownRef: { current: null },
    lastMoveClickRef: { current: { id: null, time: 0 } },
    pendingTransformRef: { current: null },
    phantomRef: { current: null },
    previewShapeRef: { current: null },
    previewRafRef: { current: null },
    jxgRef: { current: (window as any).JXG },
    store,
    jxgIdToSceneId: (jxgObj: any) => {
      if (!jxgObj?.id) return null;
      return jxgIdToScene.current.get(jxgObj.id) ?? null;
    },
    jxgFromSceneId: (id: string) => {
      // Renderer giữ Map nội bộ — expose qua wrapper
      return (rendererRef.current as any)?.elements?.get(id) ?? null;
    },
    screenCoordsOf: (evt: any) => {
      const b = boardRef.current;
      if (!b) return null;
      const cPos = b.getCoordsTopLeftCorner ? b.getCoordsTopLeftCorner() : [0, 0];
      return [evt.clientX - cPos[0], evt.clientY - cPos[1]];
    },
    objectsAt: (evt: any) => {
      const b = boardRef.current;
      return b?.objects ? Object.values(b.objects).filter((o: any) => o.hasPoint?.(evt.clientX, evt.clientY)) : [];
    },
    findNearestPointJxg: (evt: any, tolPx = 12) => null, // TODO: hook scene-based hit-test
    toggleSelect: (id: string, additive: boolean) => {
      if (!additive) selectedRef.current.clear();
      if (selectedRef.current.has(id)) selectedRef.current.delete(id);
      else selectedRef.current.add(id);
    },
    clearSelection: () => { selectedRef.current.clear(); },
    nextLabel: (kind: string) => nextLabel(store.getState(), kind),
    flashWarn: (msg: string) => { console.warn('[MiniBoard]', msg); },
    emitSelect: () => {},
    emitTransform: () => {},
  };

  // Wire pointer events
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const down = (e: any) => ctxRef.current && handleDown(ctxRef.current, e);
    const up = (e: any) => ctxRef.current && handleUp(ctxRef.current, e);
    const move = (e: any) => ctxRef.current && handleMove(ctxRef.current, e);
    board.on('down', down);
    board.on('up', up);
    board.on('move', move);
    return () => {
      board.off('down', down);
      board.off('up', up);
      board.off('move', move);
    };
  }, []);

  // Imperative handle for parent (EditorPanel)
  useImperativeHandle(
    onReady as never,
    () => ({
      getContainer: () => containerRef.current,
      getBbox: () => boardRef.current?.getBoundingBox() ?? [-5, 5, 5, -5],
      getState: () => store.getState(),
      getShowAxis: () => !!initialState?.showAxis,
      getShowGrid: () => !!initialState?.showGrid,
      setTool: toolSM.setTool,
      getTool: () => toolSM.toolRef.current,
      setShowAxis: () => {/* TODO */},
      setShowGrid: () => {/* TODO */},
      undo: () => store.undo(),
      canUndo: () => store.canUndo(),
      redo: () => store.redo(),
      canRedo: () => store.canRedo(),
      subscribe: (cb) => store.subscribe(cb),
      snapshotObject: (id) => {
        const obj = store.getState().objects[id];
        if (!obj) return null;
        return {
          id, kind: obj.kind as any, name: obj.label,
          color: (obj.attrs as any).color ?? '#0f172a',
          width: (obj.attrs as any).width ?? 2,
          dash: (obj.attrs as any).dash ?? 0,
          face: (obj.attrs as any).face ?? 'o',
          showLabel: (obj.attrs as any).showLabel ?? true,
          showValue: (obj.attrs as any).showValue ?? false,
          screenCoords: { x: 0, y: 0 },
        };
      },
      mutateObject: (id, patch) => {
        if (patch.remove) {
          store.dispatch({ type: 'DELETE', payload: { id } });
        } else if (patch.attrs) {
          store.dispatch({ type: 'UPDATE_ATTRS', payload: { id, patch: patch.attrs } });
        }
      },
      getAllPointNames: () => listObjects(store.getState()).filter(o => o.kind === 'point').map(o => o.label),
      onSelect: () => () => {},
      onTransformParam: () => () => {},
      confirmTransformParam: () => {},
      cancelTransformParam: () => {},
      getSelectionSize: () => selectedRef.current.size,
      clearSelection: () => { selectedRef.current.clear(); },
      deleteSelection: () => {
        for (const id of selectedRef.current) store.dispatch({ type: 'DELETE', payload: { id } });
        selectedRef.current.clear();
      },
    }),
    [store, toolSM, initialState],
  );

  // Notify parent của handle (gọi onReady với handle thực)
  useEffect(() => {
    const h: any = (onReady as any).current;
    if (h) onReady(h);
  }, [onReady]);

  return <div id={containerId} ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export { TOOLS };
export type { GeomTool, ToolDef };
```

> **Note**: code trên là khung gọn ý — khi execute, đọc kỹ MiniBoard.tsx cũ để port chính xác các phần:
> - Pan / zoom / pointermove preview (giữ trong MiniBoard, không cần move sang store).
> - Theme isDark — wire `paletteFor(isDark)` vào board init.
> - Mobile touch handling — giữ nguyên pattern cũ.
> - Selection style apply (stroke đậm, color highlight) — implement qua `store.dispatch({ type: 'UPDATE_ATTRS' ... })` hoặc giữ ngoài store (selection là UI state, không phải scene state).
>
> Target lines ≤ 500. Phần UI/layout giữ, phần state quản lý chuyển sang store.

- [ ] **Step 2.3.3.3.3: Verify smoke test cũ vẫn pass**

Run: `npm test -- --testPathPattern 'MiniBoard\.smoke'`
Expected: PASS (test cũ chỉ render container — pattern không đổi).

- [ ] **Step 2.3.3.3.4: Verify typecheck**

Run: `npm run typecheck 2>&1 | grep MiniBoard | head -20`
Expected: 0 lỗi cho MiniBoard.tsx (có thể còn lỗi ở EditorPanel/Properties — sẽ fix sub-PR sau).

- [ ] **Step 2.3.3.3.5: Commit**

```bash
git add src/stamps/geometry-2d/editor/MiniBoard.tsx
git commit -m "refactor(geometry-2d/MiniBoard): xoá creationLogRef + objMapRef + redoStackRef, dùng store + JxgRenderer"
```

---

### Sub-PR 2.3.4: `EditorPanel.tsx` wire store + JxgRenderer

**Files:**
- Modify: `src/stamps/geometry-2d/editor/EditorPanel.tsx`
- Modify: `src/stamps/geometry-2d/__tests__/EditorPanel.test.tsx`

#### Task 2.3.4.1: Wire store vào EditorPanel

- [ ] **Step 2.3.4.1.1: Đọc EditorPanel.tsx hiện tại**

Run: `wc -l src/stamps/geometry-2d/editor/EditorPanel.tsx`
Expected: 316 dòng. Hiện đang dùng `handleRef: MiniBoardHandle` để gọi `.getCreationLog()` rồi `serializeBoard(...)`.

- [ ] **Step 2.3.4.1.2: Sửa onInsert lấy state thay vì log**

Thay đoạn `handleInsert` (gần dòng 90-100) trong `EditorPanel.tsx`:

```tsx
const handleInsert = useCallback(async () => {
  if (!handleRef.current) return;
  const h = handleRef.current;
  const state = h.getState();
  const bbox = h.getBbox();
  const showAxis = h.getShowAxis();
  const showGrid = h.getShowGrid();
  const serialized = serializeBoard(bbox, state, { showAxis, showGrid });
  const jsonState = JSON.stringify(serialized);

  // Render SVG offscreen từ jsonState
  const svgString = await renderGeometrySvgFromState(jsonState);
  onInsert?.(jsonState, svgString);
}, [onInsert]);
```

- [ ] **Step 2.3.4.1.3: Update test EditorPanel**

```tsx
// src/stamps/geometry-2d/__tests__/EditorPanel.test.tsx (overwrite test "Insert calls onInsert")
test('Insert calls onInsert với (jsonState, svgString) — jsonState format v2', async () => {
  const onInsert = jest.fn();
  const ref = React.createRef<GeometryEditorPanelHandle>();
  render(
    <GeometryEditorPanel
      ref={ref}
      initialState={null}
      onInsert={onInsert}
      onClose={jest.fn()}
      onStateChange={jest.fn()}
    />,
  );
  // Mock renderGeometrySvgFromState gọi (đã mock qua jest.mock ở head)
  await act(async () => { await ref.current?.insert(); });
  expect(onInsert).toHaveBeenCalledTimes(1);
  const [jsonState, svg] = onInsert.mock.calls[0];
  const parsed = JSON.parse(jsonState);
  expect(parsed.version).toBe(2);
  expect(parsed.state).toBeDefined();
  expect(parsed.state.meta.domain).toBe('2d');
  expect(typeof svg).toBe('string');
});
```

- [ ] **Step 2.3.4.1.4: Run test**

Run: `npm test -- --testPathPattern 'geometry-2d/__tests__/EditorPanel'`
Expected: PASS.

- [ ] **Step 2.3.4.1.5: Commit**

```bash
git add src/stamps/geometry-2d/editor/EditorPanel.tsx \
        src/stamps/geometry-2d/__tests__/EditorPanel.test.tsx
git commit -m "refactor(geometry-2d/EditorPanel): wire serialize qua getState() + format v2"
```

---

### Sub-PR 2.3.5: `LeftPanel.tsx` + `PropertiesPopover.tsx` dispatch UPDATE_ATTRS

**Files:**
- Modify: `src/stamps/geometry-2d/editor/LeftPanel.tsx`
- Modify: `src/stamps/geometry-2d/editor/PropertiesPopover.tsx`
- Modify: `src/stamps/geometry-2d/__tests__/PropertiesPopover.test.tsx`

#### Task 2.3.5.1: LeftPanel — giữ UI thuần (không touch store)

- [ ] **Step 2.3.5.1.1: Verify LeftPanel không touch creationLog/objMap**

Run: `grep -n 'creationLog\|objMap' src/stamps/geometry-2d/editor/LeftPanel.tsx || echo OK`
Expected: OK (LeftPanel chỉ là UI shell, không touch state).

- [ ] **Step 2.3.5.1.2: Verify LeftPanel test vẫn pass**

Run: `npm test -- --testPathPattern 'LeftPanel\.chord'`
Expected: PASS, 5 tests.

- [ ] **Step 2.3.5.1.3: Không commit (no changes)**

#### Task 2.3.5.2: PropertiesPopover — dispatch UPDATE_ATTRS

- [ ] **Step 2.3.5.2.1: Đọc PropertiesPopover hiện tại**

Run: `wc -l src/stamps/geometry-2d/editor/PropertiesPopover.tsx`
Expected: 373 dòng. Hiện gọi `onMutate({ attrs: { strokeColor: 'X' } })`.

- [ ] **Step 2.3.5.2.2: Sửa onMutate thành dispatch**

PropertiesPopover hiện tại đã có prop `onMutate(patch)`. Implementation ở parent (MiniBoard) đã chuyển `mutateObject(id, patch)` thành `store.dispatch({ type: 'UPDATE_ATTRS', payload: { id, patch: patch.attrs } })` (đã làm ở Sub-PR 2.3.3). Không cần sửa PropertiesPopover trừ khi đổi shape `patch`.

Nếu `patch.attrs` đang dùng tên JSXGraph cũ (`strokeColor`, `strokeWidth`, `name`, `dash`), map sang scene attrs:
- `strokeColor` → `color`
- `strokeWidth` → `width`
- `name` → `label` (dùng action UPDATE, không phải UPDATE_ATTRS)
- `dash` → `dash`
- `face` → `face`

Sửa `mutateObject` trong MiniBoard.tsx (Task 2.3.3) để map:

```ts
mutateObject: (id, patch) => {
  if (patch.remove) {
    store.dispatch({ type: 'DELETE', payload: { id } });
    return;
  }
  if (!patch.attrs) return;
  const { name, ...rest } = patch.attrs as { name?: string; [k: string]: unknown };
  if (name !== undefined && typeof name === 'string') {
    store.dispatch({ type: 'UPDATE', payload: { id, patch: { label: name } } });
  }
  if (Object.keys(rest).length > 0) {
    const mapped: Record<string, unknown> = {};
    if ('strokeColor' in rest) mapped.color = rest.strokeColor;
    if ('strokeWidth' in rest) mapped.width = rest.strokeWidth;
    if ('dash' in rest) mapped.dash = rest.dash;
    if ('face' in rest) mapped.face = rest.face;
    if ('size' in rest) mapped.size = rest.size;
    if ('showLabel' in rest) mapped.showLabel = rest.showLabel;
    if ('showValue' in rest) mapped.showValue = rest.showValue;
    if (Object.keys(mapped).length > 0) {
      store.dispatch({ type: 'UPDATE_ATTRS', payload: { id, patch: mapped } });
    }
  }
},
```

- [ ] **Step 2.3.5.2.3: Update test PropertiesPopover (assertions cho onMutate vẫn không đổi — popover blackbox)**

```bash
npm test -- --testPathPattern 'PropertiesPopover'
```

Expected: PASS, 5 tests (test cũ verify `onMutate({attrs: {strokeColor: 'X'}})` được gọi — không đụng store nên không đổi).

- [ ] **Step 2.3.5.2.4: Commit (chỉ MiniBoard nếu mutateObject đổi)**

```bash
git add src/stamps/geometry-2d/editor/MiniBoard.tsx
git commit -m "refactor(geometry-2d/MiniBoard): mutateObject map JSXGraph attrs → scene attrs, dispatch UPDATE/UPDATE_ATTRS"
```

---

### Sub-PR 2.3.6: `host.tsx` — undo/redo qua store

**Files:**
- Modify: `src/stamps/geometry-2d/host.tsx`

#### Task 2.3.6.1: Wire canUndo/canRedo từ store subscribe

- [ ] **Step 2.3.6.1.1: Đọc host.tsx hiện tại**

Run: `wc -l src/stamps/geometry-2d/host.tsx`
Expected: 132 dòng. Hiện `geomState.canUndo` đến từ `onStateChange` của EditorPanel.

- [ ] **Step 2.3.6.1.2: Verify chain còn hoạt động**

`EditorPanel.onStateChange(setGeomState)` đã được gọi mỗi khi state thay đổi. MiniBoard `subscribe(cb)` trigger `notifySubscribers()` → EditorPanel gọi `onStateChange({ ..., canUndo, canRedo })`. Đảm bảo EditorPanel reads `handle.canUndo()` / `handle.canRedo()` thay vì `historyTick`:

Trong `EditorPanel.tsx`, subscriber:

```tsx
const unsub = h.subscribe(() => {
  onStateChange?.({
    tool: h.getTool(),
    showAxis: h.getShowAxis(),
    showGrid: h.getShowGrid(),
    canUndo: h.canUndo(),
    canRedo: h.canRedo(),
  });
});
```

- [ ] **Step 2.3.6.1.3: Verify host.tsx không đổi**

`host.tsx` đã pass `canUndo` xuống LeftPanel + EditorPanel — không cần đụng.

- [ ] **Step 2.3.6.1.4: Run test Host.chord**

Run: `npm test -- --testPathPattern 'Host\.chord'`
Expected: PASS, 5 tests.

- [ ] **Step 2.3.6.1.5: Commit (chỉ EditorPanel nếu subscriber đổi)**

```bash
git add src/stamps/geometry-2d/editor/EditorPanel.tsx
git commit -m "refactor(geometry-2d/EditorPanel): subscriber gọi handle.canUndo()/canRedo() trực tiếp"
```

---

### Sub-PR 2.3.7: `render.ts` + `renderInline.ts` (offscreen render qua store)

**Files:**
- Modify: `src/stamps/geometry-2d/render.ts`
- Modify: `src/stamps/geometry-2d/__tests__/render.test.ts`

#### Task 2.3.7.1: Rewrite `renderGeometrySvgFromState` dùng store + JxgRenderer

- [ ] **Step 2.3.7.1.1: Đọc render.ts**

Run: `wc -l src/stamps/geometry-2d/render.ts`
Expected: 115 dòng. Hiện gọi `deserializeIntoBoard(board, parsed)` để replay log.

- [ ] **Step 2.3.7.1.2: Sửa `renderGeometrySvgFromState`**

Thay đoạn `try { ... deserializeIntoBoard ... }` trong `src/stamps/geometry-2d/render.ts`:

```ts
import { createStore } from '../../core/scene';
import { JxgRenderer } from '../../core/scene/render/JxgRenderer';
import { renderGeometryToSvg } from './renderInline';
import { deserializeBoard } from './serialize';
import { paletteFor } from './editor/theme';
import { safeJsx } from '../shared/safeJsx';

// ... containerDimsForBbox giữ nguyên ...

export async function renderGeometrySvgFromState(jsonState: string): Promise<string> {
  const parsed = deserializeBoard(JSON.parse(jsonState));
  const palette = paletteFor(false);
  const JXG = (await import('jsxgraph')).default;
  safeJsx('render.applyOptions', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts = (JXG as any).Options;
    if (opts) {
      opts.text = opts.text || {};
      opts.text.display = 'internal';
      opts.label = opts.label || {};
      opts.label.display = 'internal';
    }
  });
  const { width, height } = containerDimsForBbox(parsed.bbox);
  const container = document.createElement('div');
  const containerId = 'jxg_offscreen_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  container.id = containerId;
  container.style.cssText = `position:absolute;top:-99999px;left:-99999px;width:${width}px;height:${height}px;visibility:hidden;pointer-events:none;`;
  document.body.appendChild(container);
  let board: unknown = null;
  let renderer: JxgRenderer | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    board = (JXG as any).JSXGraph.initBoard(containerId, {
      boundingbox: parsed.bbox,
      axis: !!parsed.showAxis,
      grid: !!parsed.showGrid,
      showCopyright: false,
      showNavigation: false,
      keepAspectRatio: true,
    });
    const store = createStore(parsed.state);
    renderer = new JxgRenderer(store, board);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (board as any).update();
    return renderGeometryToSvg(container);
  } finally {
    renderer?.dispose();
    safeJsx('render.freeBoard', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (board) (JXG as any).JSXGraph.freeBoard(board);
    });
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}
```

- [ ] **Step 2.3.7.1.3: Verify test render vẫn pass**

Run: `npm test -- --testPathPattern 'geometry-2d/__tests__/render(\.|Inline)'`
Expected: PASS — `containerDimsForBbox` không đổi; `renderGeometryToSvg` không đổi.

- [ ] **Step 2.3.7.1.4: Commit**

```bash
git add src/stamps/geometry-2d/render.ts
git commit -m "refactor(geometry-2d/render): offscreen SVG render qua core/scene store + JxgRenderer"
```

---

### Sub-PR 2.3.8: Verify + xoá legacy code + manual smoke

**Files:**
- Delete: `src/stamps/geometry-2d/__tests__/hitTest.test.ts` (đã xoá ở Sub-PR 2.3.2)

#### Task 2.3.8.1: Tìm còn ai dùng `creationLogRef` / `objMapRef`

- [ ] **Step 2.3.8.1.1: Grep**

Run: `grep -rn 'creationLogRef\|objMapRef\|redoStackRef\|getCreationLog\|deserializeIntoBoard' src/ 2>&1 | grep -v __tests__ || echo OK`
Expected: OK (đã xoá hết). Nếu còn → fix file đó.

- [ ] **Step 2.3.8.1.2: Verify deserializeIntoBoard không còn export**

Run: `grep -n 'export.*deserializeIntoBoard' src/stamps/geometry-2d/serialize.ts || echo OK`
Expected: OK (function này đã bị thay khi rewrite serialize.ts ở Sub-PR 2.3.1).

#### Task 2.3.8.2: Verify typecheck + toàn bộ test pass

- [ ] **Step 2.3.8.2.1: Run typecheck + test**

Run: `npm run typecheck && npm test`
Expected: PASS toàn bộ.

#### Task 2.3.8.3: Playwright smoke 2D

- [ ] **Step 2.3.8.3.1: Run E2E**

Run: `npm run test:e2e -- --grep "2d|geometry"` (nếu có) hoặc `npm run test:e2e`.
Expected: PASS.

- [ ] **Step 2.3.8.3.2: Nếu fail — investigate**

Common issues:
- `JxgRenderer` không subscribe trước khi LOAD → fix: gọi `applyDiff(undefined, store.getState())` trong constructor (đã có).
- Label collision → fix: dùng `nextLabel(state, 'point')` mỗi lần ADD.
- Render thiếu khi LOAD → verify `state.order` khớp `Object.keys(objects)`.

#### Task 2.3.8.4: Manual smoke trong demo app

- [ ] **Step 2.3.8.4.1: Run demo**

Run: `npm run demo` → mở browser → 2D stamp.

Checklist:
1. Vẽ điểm A, B, C → 3 điểm hiện.
2. Vẽ segment AB → đoạn nối A-B.
3. Vẽ circle tâm A qua B → hiện đường tròn.
4. Vẽ polygon ABC → đa giác hiện, fill nhạt.
5. Vẽ intersection của 2 line → điểm I hiện ở giao.
6. Drag A → segment + polygon + circle + intersection cùng update.
7. Undo 7 lần → empty.
8. Redo 7 lần → khôi phục.
9. Click 1 điểm → mở PropertiesPopover → đổi màu → màu update.
10. Click "Xoá" → cascade xoá object phụ thuộc.
11. Insert vào canvas → reload page → double-click image → re-edit → state khớp.
12. Toggle showAxis / showGrid → axes/grid hiện/ẩn.

Expected: tất cả OK.

- [ ] **Step 2.3.8.4.2: Commit fix nếu có**

```bash
git add src/
git commit -m "fix(geometry-2d): [mô tả fix cụ thể từ smoke]"
```

#### Task 2.3.8.5: Commit final marker

- [ ] **Step 2.3.8.5.1: Commit empty marker (nếu không có fix)**

Không bắt buộc — bỏ qua step này nếu đã commit ở 2.3.8.4.2.

---

## PR 2.4 — Release v0.13.0 (~0.5 ngày)

### Task 2.4.1: Bump version + build dist

- [ ] **Step 2.4.1.1: Update CHANGELOG hoặc README nếu có**

(Optional — skip nếu không track changelog.)

- [ ] **Step 2.4.1.2: Run build**

Run: `npm run build`
Expected: PASS, dist/ generated.

- [ ] **Step 2.4.1.3: Verify dist có "use client"**

Run: `grep -l "use client" dist/index.js dist/index.mjs 2>&1 | head`
Expected: cả 2 file có.

- [ ] **Step 2.4.1.4: Commit dist**

```bash
git add -f dist/
git commit -m "build: dist/ cho v0.13.0 (scene 2D + 8 kind 2D + JxgRenderer)"
```

- [ ] **Step 2.4.1.5: Bump version + tag**

```bash
npm version minor          # 0.12.0 → 0.13.0 — tự commit + tag
```

- [ ] **Step 2.4.1.6: Push với tag**

```bash
git push --follow-tags origin main
```

Expected: success — tag `v0.13.0` lên remote.

---

## Key technical decisions (chốt sẵn)

- **Intersection** — kind riêng (`src/core/scene/kinds/intersection.ts`) với discriminator `kind: 'lineLine' | 'lineCircle' | 'circleCircle'` + `branch?: 0 | 1`. KHÔNG dùng constraint-based point cho intersection.
- **8 kind 2D** — point, segment, line, ray, vector, circle, polygon, intersection. Cộng `2d-constraint.ts` cho `Vec2`/`Constraint2D` union.
- **JxgRenderer 2D** — class mới `src/core/scene/render/JxgRenderer.ts` analog `JxgRenderer3D`. Cùng pattern subscribe/dispose/diff.
- **MiniBoard.tsx target < 500 dòng** sau port (hiện 1469). Tách `useSceneStore` + `useToolStateMachine` hook.
- **No backcompat** — format v1 cũ (`SerializedElement[]`) → deserialize trả empty state + warn console (giống Phase 1).
- **Selection là UI state, không scene state** — `selectedRef.current: Set<string>` ngoài store. Lý do: selection không cần undo/redo.
- **Commit straight to main** — không PR, không worktree.
- **No co-author** — không thêm Co-Authored-By line vào commit.
- **State counter** dùng để generate id mới (`p_${state.counter + 1}`). Reducer tăng counter mỗi ADD. Label dùng `nextLabel(state, kind)` scan-fill A-Z (selectors).
- **Drag undo** — dùng `store.transaction(fn)` để gộp nhiều `UPDATE_ATTRS` thành 1 history entry tại pointer-up.
- **Theme isDark** — pass vào JxgRenderer constructor option `theme: customTheme(isDark)`. Render functions trong kind dùng `obj.attrs.color ?? theme.stroke`.

---

## Gotchas đặc thù 2D

1. **Excalidraw crop intercept** — `MiniBoard` cũ có logic intercept double-click image để reopen editor thay vì crop mode. Preserve khi refactor: giữ Excalidraw event listener (capture phase, `stopPropagation`) ở MiniBoard.tsx — không touch store.
2. **`safeJsx` helper** — đang dùng để wrap JSXGraph create calls. Khi port, chỉ giữ ở init/free board logic. Trong kind render functions, error handling đã ở `JxgRenderer.create()` (try/catch console.warn).
3. **`nextLabel` scan-fill A-Z** — đã có ở `selectors.ts` (Phase 1). Verify pattern khớp 2D: label `A`..`Z`, sau đó `A1`..`Z1`, `A2`...
4. **Mobile drawer + header bar** — UI portion không đổi. `host.tsx` đã quản lý `isMobile` + `drawerOpen`. Chỉ wire `canUndo/canRedo` qua store subscribe.
5. **Pan/zoom** — JSXGraph builtin, không touch store. Bbox đọc qua `board.getBoundingBox()` khi serialize.
6. **showAxis/showGrid** — UI state ngoài store, không cần persist trong State. Lưu trong `SerializedBoard.showAxis/showGrid` (top-level meta JSON).

---

## Concerns biết trước

- 2D MiniBoard 1469 dòng = 3-4× phức tạp hơn EditorPanel 3D đã port → buffer 1 ngày extra cho Sub-PR 2.3.3 (Task 2.3.3.3).
- Test cũ của 2D (12 file) — một số chỉ test API cũ (`creationLog`, `findNearestPointInList`). Đã xoá `hitTest.test.ts` ở Sub-PR 2.3.2.1. Test khác (`tools.test.ts`, `transforms.test.ts`, `EditorPanel.test.tsx`, `PropertiesPopover.test.tsx`, `MiniBoard.smoke.test.tsx`, `LeftPanel.chord.test.tsx`, `Host.chord.test.tsx`, `render.test.ts`, `renderInline.test.ts`, `TransformParamPopover.test.tsx`, `serialize.test.ts`) — giữ và update assertions. Chấp nhận **regression risk** trong khoảng 1-2 release nếu integration coverage giảm — viết integration test mới ở Phase 3.
- Renderer 2D không có `update()` cheap-path → mọi UPDATE_ATTRS sẽ remove+recreate. Có thể slow khi drag 60fps. Mitigate: dùng `store.transaction(fn)` để batch drag updates, chỉ commit history khi pointer-up. Đo benchmark sau Phase 2 — nếu chậm, optimize ở Phase 3.

---

## Khi nào KHÔNG nên đi Phase 2

- Phase 1 v0.12.0 chưa được manual smoke test → fix bug Phase 1 trước.
- User đang ship feature mới trên 2D (không phải bug fix) → freeze trước khi start.
- Có bug Phase 1 đang report mà chưa fix.

---

## Phase 3 (sẽ có plan riêng sau Phase 2)

- Object list panel cho 2D + 3D (selector-based) — hoàn thành phần `listObjects` API.
- Action recorder demo (proof-of-concept cho animation timeline + AI agent dispatch).
- Integration test cho EditorPanel 2D + 3D (thay thế test cũ đã xoá).
- Performance optimization — `kind.update()` cheap-path cho drag.

---

## Self-Review

**1. Spec coverage:**
- ✅ Kind registry — thêm 8 kind 2D (point, segment, line, ray, vector, circle, polygon, intersection) → PR 2.1.
- ✅ Per-kind schema versioning — mỗi kind có `schemaVersion: 1` + `migrate: {}` → PR 2.1.
- ✅ `2d-constraint.ts` Vec2 + Constraint2D union → Task 2.1.1.
- ✅ `JxgRenderer` 2D class apply diff → PR 2.2.
- ✅ 2D MiniBoard refactor — xoá `creationLogRef` + `objMapRef`, tách `useSceneStore` + `useToolStateMachine` hook → Sub-PR 2.3.3.
- ✅ Update `serialize.ts` xuất format v2 (`{ version: 2, state: State }`) → Sub-PR 2.3.1.
- ✅ Toàn bộ test cũ refactored hoặc xoá có lý do (hitTest.test.ts xoá vì API cũ không port được) → Sub-PR 2.3.2.
- ✅ Render offscreen (`render.ts`) qua store + JxgRenderer → Sub-PR 2.3.7.
- ✅ Playwright smoke 2D → Task 2.3.8.3.
- ✅ dist/ committed cho v0.13.0 → PR 2.4.
- ⬜ Object list panel + action recorder → **Phase 3** (out of scope plan này).

**2. Placeholder scan:**
- Step 2.3.3.3.2 (Rewrite MiniBoard.tsx) — code block là khung gọn ý kèm note "đọc kỹ MiniBoard.tsx cũ để port chính xác". Đây là chỉ dẫn cụ thể tham khảo file thực, không phải `TBD`/`TODO` placeholder. PASS.
- Step 2.3.2.3.3 (Sửa handler dispatch) — có "Tương tự cho segment/line/ray..." nhưng kèm pattern code đầy đủ + đường dẫn file cụ thể + commit message cụ thể. PASS.
- Không có "fill in details" / "handle edge cases" naked / "similar to Task N" without code. PASS.

**3. Type consistency:**
- `Store`, `State`, `SceneObject`, `KindDef`, `RenderCtx` import từ `'../../../core/scene'` (4 cấp từ `src/stamps/geometry-2d/editor/...`) nhất quán toàn plan.
- `dispatch({ type: 'ADD', payload: { obj } })` shape giống nhau ở mọi nơi handler dispatch.
- `nextLabel(state, kind)` signature khớp với selectors Phase 1.
- `MiniBoardHandle` interface đổi `getCreationLog()` → `getState()` — consistent qua EditorPanel.tsx + host.tsx + render.ts.
- `SerializedBoard` shape v2: `{ version: 2, bbox, state, showAxis?, showGrid? }` — consistent qua serialize.ts + render.ts + EditorPanel.tsx.
- `SceneObject.attrs` cho mỗi kind có `Attrs` type rõ ràng (PointAttrs, SegmentAttrs, …) — PR 2.1 mỗi task định nghĩa.

**Verdict:** PASS toàn bộ self-review checklist.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-20-scene-phase-2-2d.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch fresh subagent per task, review giữa các task. Tốc độ nhanh, isolation tốt — phù hợp pattern dài, nhiều file của Sub-PR 2.3.

**2. Inline Execution** — Execute tasks trong session hiện tại, checkpoint review theo batch (vd: theo Sub-PR).

**Bạn chọn cách nào?**
