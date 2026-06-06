# `pointAtDistance` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm primitive hình học `pointAtDistance` — dựng điểm C trên tia `from→through` kéo dài qua `through`, cách `through` một khoảng `d` (lấy từ bán kính đường tròn / độ dài đoạn 2 điểm / số literal) — để vẽ được "kéo dài AB về phía B, lấy C sao cho BC = R".

**Architecture:** 1 DSL point kind duy nhất, độ phức tạp dồn vào `DistanceSpec` (discriminated union 3 nhánh). Wire full path 7 tầng: pure-math → Constraint2D → render (point.ts) → DSL schema → DSL kind module + registry → serialize round-trip → intent vocab + intentToDsl → prompt/validator → fixture/integration. Functional-coordinate point (giống `arcMidpoint`) để reactive khi kéo điểm.

**Tech Stack:** TypeScript strict, Zod (discriminated union), JSXGraph (functional points), Jest + jsdom + ts-jest.

---

## File Structure

| File | Trách nhiệm | Create/Modify |
|---|---|---|
| `src/core/scene/kinds/pointConstructions.ts` | Hàm toán thuần `pointAtDistanceCoord` | Modify |
| `src/core/scene/kinds/2d-constraint.ts` | `Constraint2D` + `ConstraintDistanceSpec` + refs | Modify |
| `src/core/scene/kinds/point.ts` | Render functional point + `makeDistanceFn` + describe | Modify |
| `src/stamps/geometry-2d/dsl/schema.ts` | DSL union member + `DslDistanceSpec` | Modify |
| `src/stamps/geometry-2d/dsl/kinds/points/pointAtDistance.ts` | DSL kind module | Create |
| `src/stamps/geometry-2d/dsl/registry.ts` | Đăng ký module | Modify |
| `src/stamps/geometry-2d/dsl/serialize.ts` | Constraint → DSL (round-trip) | Modify |
| `src/stamps/geometry-2d/ai/intent.ts` | Intent vocab `add-point` | Modify |
| `src/stamps/geometry-2d/ai/intentToDsl.ts` | Intent → DSL mapping | Modify |
| `src/stamps/geometry-2d/ai/intentPrompt.ts` | Mô tả kind + danh sách | Modify |
| `src/stamps/geometry-2d/ai/validator.ts` | Keyword hint table | Modify |
| `src/stamps/geometry-2d/dsl/fixtures/extend-chord-bc-radius.ts` | Fixture bài động lực | Create |
| Test files cạnh mỗi nguồn | Unit/render/round-trip/fixture tests | Create/Modify |

**Lưu ý chung:** Chạy lệnh từ thư mục gốc worktree. Test runner: `npx jest <path> -t '<name>'`.

---

## Task 1: Hàm toán thuần `pointAtDistanceCoord`

**Files:**
- Modify: `src/core/scene/kinds/pointConstructions.ts`
- Test: `src/core/scene/kinds/__tests__/pointConstructions.test.ts`

- [ ] **Step 1: Viết test đỏ**

Thêm vào cuối `src/core/scene/kinds/__tests__/pointConstructions.test.ts`:

```ts
import { pointAtDistanceCoord } from '../pointConstructions';

describe('pointAtDistanceCoord', () => {
  it('C trên tia A→B kéo dài qua B, cách B khoảng d', () => {
    // A=(0,0), B=(3,0), d=2 → C=(5,0)
    const c = pointAtDistanceCoord([0, 0], [3, 0], 2);
    expect(c[0]).toBeCloseTo(5, 6);
    expect(c[1]).toBeCloseTo(0, 6);
  });

  it('đổi thứ tự from/through → kéo dài về phía kia', () => {
    // from=B=(3,0), through=A=(0,0), d=2 → C=(-2,0)
    const c = pointAtDistanceCoord([3, 0], [0, 0], 2);
    expect(c[0]).toBeCloseTo(-2, 6);
    expect(c[1]).toBeCloseTo(0, 6);
  });

  it('hướng chéo: A=(3,0) B=(0,3) d=3 → C = B + 3·unit(B-A)', () => {
    const c = pointAtDistanceCoord([3, 0], [0, 3], 3);
    expect(c[0]).toBeCloseTo(-3 / Math.SQRT2, 6);
    expect(c[1]).toBeCloseTo(3 + 3 / Math.SQRT2, 6);
  });

  it('from ≡ through (suy biến) → trả về điểm hữu hạn, không NaN', () => {
    const c = pointAtDistanceCoord([1, 1], [1, 1], 5);
    expect(Number.isFinite(c[0])).toBe(true);
    expect(Number.isFinite(c[1])).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test xác nhận đỏ**

Run: `npx jest src/core/scene/kinds/__tests__/pointConstructions.test.ts -t pointAtDistanceCoord`
Expected: FAIL — `pointAtDistanceCoord is not a function` / không export.

- [ ] **Step 3: Implement**

Thêm vào cuối `src/core/scene/kinds/pointConstructions.ts`:

```ts
/**
 * Điểm trên tia `from → through` kéo dài QUA `through`, cách `through` khoảng `d`.
 * C = through + d · (through − from)/|through − from|.
 * `from ≡ through` (hướng suy biến) → trả về chính `through` (d bị nuốt vì len=1 guard).
 */
export function pointAtDistanceCoord(from: XY, through: XY, d: number): XY {
  const dx = through[0] - from[0];
  const dy = through[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  return [through[0] + (d * dx) / len, through[1] + (d * dy) / len];
}
```

- [ ] **Step 4: Chạy test xác nhận xanh**

Run: `npx jest src/core/scene/kinds/__tests__/pointConstructions.test.ts -t pointAtDistanceCoord`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/kinds/pointConstructions.ts src/core/scene/kinds/__tests__/pointConstructions.test.ts
git commit -m "feat(scene): pointAtDistanceCoord — toán dựng điểm trên tia cách mốc khoảng d"
```

---

## Task 2: `Constraint2D` kind + `constraintRefs2D`

**Files:**
- Modify: `src/core/scene/kinds/2d-constraint.ts`
- Test: `src/core/scene/kinds/__tests__/point.constraint.special.test.ts`

- [ ] **Step 1: Viết test đỏ**

Thêm vào trong `describe('Constraint2D — special shape constraints', ...)` của `point.constraint.special.test.ts`:

```ts
  it('pointAtDistance circleRadius → from + through + circle', () => {
    expect(
      constraintRefs2D({
        kind: 'pointAtDistance', from: 'A', through: 'B',
        distance: { kind: 'circleRadius', circle: 'k' },
      }),
    ).toEqual(['A', 'B', 'k']);
  });

  it('pointAtDistance segmentLength → from + through + p1 + p2', () => {
    expect(
      constraintRefs2D({
        kind: 'pointAtDistance', from: 'A', through: 'B',
        distance: { kind: 'segmentLength', p1: 'O', p2: 'A' },
      }),
    ).toEqual(['A', 'B', 'O', 'A']);
  });

  it('pointAtDistance literal → chỉ from + through', () => {
    expect(
      constraintRefs2D({
        kind: 'pointAtDistance', from: 'A', through: 'B',
        distance: { kind: 'literal', value: 2 },
      }),
    ).toEqual(['A', 'B']);
  });
```

- [ ] **Step 2: Chạy test xác nhận đỏ**

Run: `npx jest src/core/scene/kinds/__tests__/point.constraint.special.test.ts -t pointAtDistance`
Expected: FAIL — TypeScript: `'pointAtDistance'` không thuộc `Constraint2D` (ts-jest báo lỗi compile).

- [ ] **Step 3: Implement**

Trong `src/core/scene/kinds/2d-constraint.ts`, thêm type `ConstraintDistanceSpec` ngay trước `export type Constraint2D =` (sau block `TransformDef`):

```ts
/** Nguồn khoảng cách cho pointAtDistance. ids là scene-object id (string). */
export type ConstraintDistanceSpec =
  | { kind: 'circleRadius'; circle: string }
  | { kind: 'segmentLength'; p1: string; p2: string }
  | { kind: 'literal'; value: number };
```

Thêm member vào union `Constraint2D` (ngay trước `| { kind: 'excenter'; ... }`):

```ts
  // Điểm trên tia from→through kéo dài qua through, cách through khoảng `distance`.
  | { kind: 'pointAtDistance'; from: string; through: string; distance: ConstraintDistanceSpec }
```

Thêm case vào `constraintRefs2D` (trước `default:`):

```ts
    case 'pointAtDistance': {
      const d = c.distance;
      const extra = d.kind === 'circleRadius' ? [d.circle]
        : d.kind === 'segmentLength' ? [d.p1, d.p2] : [];
      return [c.from, c.through, ...extra];
    }
```

- [ ] **Step 4: Chạy test xác nhận xanh**

Run: `npx jest src/core/scene/kinds/__tests__/point.constraint.special.test.ts -t pointAtDistance`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/kinds/2d-constraint.ts src/core/scene/kinds/__tests__/point.constraint.special.test.ts
git commit -m "feat(scene): Constraint2D kind pointAtDistance + ConstraintDistanceSpec + refs"
```

---

## Task 3: Render trong `point.ts` (functional point — chống fallback (0,0))

**Files:**
- Modify: `src/core/scene/kinds/point.ts`
- Test: `src/core/scene/kinds/__tests__/point.pointAtDistance.test.ts` (Create)

- [ ] **Step 1: Viết test đỏ**

Tạo `src/core/scene/kinds/__tests__/point.pointAtDistance.test.ts`:

```ts
// Render-dispatch test cho pointAtDistance. Mock board cấp X()/Y()/Radius()
// để evaluate functional coords → verify KHÔNG rơi vào fallback [0,0].
import { JxgRenderer } from '../../render/JxgRenderer';
import { createStore } from '../../store';
import { createEmptyState } from '../../types';
import '../../kinds';
import type { SceneObject } from '../../types';

function mockBoard() {
  const created: any[] = [];
  const board = {
    create: jest.fn((type: string, parents: any, attrs: any) => {
      const el: any = { type, parents, attrs, _id: `${type}_${created.length}` };
      if (type === 'point') {
        // parents có thể là [num,num] (free) hoặc [fn,fn] (functional).
        el.X = () => (typeof parents[0] === 'function' ? parents[0]() : parents[0]);
        el.Y = () => (typeof parents[1] === 'function' ? parents[1]() : parents[1]);
      }
      if (type === 'circle' && Array.isArray(parents)) {
        el.center = parents[0];
        el.Radius = () => (typeof parents[1] === 'function' ? parents[1]() : parents[1]);
      }
      created.push(el);
      return el;
    }),
    removeObject: jest.fn(),
  };
  return { board, created };
}

const mkFree = (id: string, x: number, y: number): SceneObject => ({
  id, kind: 'point', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { constraint: { kind: 'free', x, y } },
});
const mkCircleCR = (id: string, center: string, radius: number): SceneObject => ({
  id, kind: 'circle', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { center, radius },
});
const mkPointC = (id: string, label: string, constraint: unknown): SceneObject => ({
  id, kind: 'point', label, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { constraint: constraint as never },
});

function renderScene(objects: SceneObject[]) {
  const store = createStore(createEmptyState());
  for (const o of objects) store.add(o);
  const { board, created } = mockBoard();
  const r = new JxgRenderer(board as never);
  r.sync(store.getState());
  return created;
}
function findC(created: any[]) {
  return created.find((e) => e.type === 'point' && e.attrs?.name === 'C');
}

describe('render pointAtDistance', () => {
  it('circleRadius: C = B + R·unit(B-A), KHÔNG (0,0)', () => {
    // A=(3,0), B=(0,3), R=3 → C=(-3/√2, 3+3/√2)
    const created = renderScene([
      mkFree('p1', 3, 0), mkFree('p2', 0, 3),
      mkCircleCR('c1', 'p1', 3),
      mkPointC('p3', 'C', { kind: 'pointAtDistance', from: 'p1', through: 'p2', distance: { kind: 'circleRadius', circle: 'c1' } }),
    ]);
    const c = findC(created);
    expect(c).toBeDefined();
    expect(c.X()).toBeCloseTo(-3 / Math.SQRT2, 5);
    expect(c.Y()).toBeCloseTo(3 + 3 / Math.SQRT2, 5);
    expect(c.X() === 0 && c.Y() === 0).toBe(false);
  });

  it('literal: A=(0,0) B=(3,0) d=2 → C=(5,0)', () => {
    const created = renderScene([
      mkFree('p1', 0, 0), mkFree('p2', 3, 0),
      mkPointC('p3', 'C', { kind: 'pointAtDistance', from: 'p1', through: 'p2', distance: { kind: 'literal', value: 2 } }),
    ]);
    const c = findC(created);
    expect(c.X()).toBeCloseTo(5, 5);
    expect(c.Y()).toBeCloseTo(0, 5);
  });

  it('segmentLength: d = |p1 p2| (=3), A=(0,0) B=(0,4) → C=(0,7)', () => {
    const created = renderScene([
      mkFree('p1', 0, 0), mkFree('p2', 0, 4), mkFree('p4', 0, 0), mkFree('p5', 3, 0),
      mkPointC('p3', 'C', { kind: 'pointAtDistance', from: 'p1', through: 'p2', distance: { kind: 'segmentLength', p1: 'p4', p2: 'p5' } }),
    ]);
    const c = findC(created);
    expect(c.X()).toBeCloseTo(0, 5);
    expect(c.Y()).toBeCloseTo(7, 5);
  });
});
```

- [ ] **Step 2: Chạy test xác nhận đỏ**

Run: `npx jest src/core/scene/kinds/__tests__/point.pointAtDistance.test.ts`
Expected: FAIL — C render qua fallback `[0,0]` → `c.X()` = 0.

- [ ] **Step 3: Implement**

Trong `src/core/scene/kinds/point.ts`:

(a) Sửa import dòng `import { arcMidpoint, excenter } from './pointConstructions';`:

```ts
import { arcMidpoint, excenter, pointAtDistanceCoord } from './pointConstructions';
```

(b) Sửa import 2d-constraint để thêm `ConstraintDistanceSpec`:

```ts
import { type Constraint2D, type ConstraintDistanceSpec, type TransformDef, constraintRefs2D } from './2d-constraint';
```

(c) Thêm helper trước `registerKind(...)` (cùng cấp với `buildJxgTransforms`):

```ts
/** Trả hàm tính khoảng cách `d` reactive cho pointAtDistance. */
function makeDistanceFn(ctx: RenderCtx, d: ConstraintDistanceSpec): () => number {
  if (d.kind === 'literal') return () => d.value;
  if (d.kind === 'segmentLength') {
    const p = ctx.resolveRef(d.p1) as any;
    const q = ctx.resolveRef(d.p2) as any;
    return () => Math.hypot(p.X() - q.X(), p.Y() - q.Y());
  }
  const circle = ctx.resolveRef(d.circle) as any;
  return () => circle.Radius();
}
```

(d) Thêm nhánh render NGAY TRƯỚC `return board.create('point', [0, 0], opts);` (dòng ~445):

```ts
    if (c.kind === 'pointAtDistance') {
      const A: any = ctx.resolveRef(c.from);
      const B: any = ctx.resolveRef(c.through);
      const dFn = makeDistanceFn(ctx, c.distance);
      const pc = () => pointAtDistanceCoord([A.X(), A.Y()], [B.X(), B.Y()], dFn());
      return board.create('point', [() => pc()[0], () => pc()[1]], opts);
    }
```

(e) Thêm nhánh `describe` (trong hàm describe, trước `return \`Điểm ${obj.label}\`;`):

```ts
    if (c.kind === 'pointAtDistance') {
      const fromL = state?.objects[c.from]?.label ?? c.from;
      const thrL = state?.objects[c.through]?.label ?? c.through;
      const d = c.distance;
      const dLabel = d.kind === 'literal' ? `${d.value}`
        : d.kind === 'segmentLength'
          ? `${state?.objects[d.p1]?.label ?? d.p1}${state?.objects[d.p2]?.label ?? d.p2}`
          : `bán kính (${state?.objects[d.circle]?.label ?? d.circle})`;
      return `${obj.label} = trên tia ${fromL}${thrL} kéo dài, cách ${thrL} khoảng ${dLabel}`;
    }
```

- [ ] **Step 4: Chạy test xác nhận xanh**

Run: `npx jest src/core/scene/kinds/__tests__/point.pointAtDistance.test.ts`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/kinds/point.ts src/core/scene/kinds/__tests__/point.pointAtDistance.test.ts
git commit -m "feat(scene): render pointAtDistance functional point + describe (chống fallback 0,0)"
```

---

## Task 4: DSL schema + `DslDistanceSpec`

**Files:**
- Modify: `src/stamps/geometry-2d/dsl/schema.ts`

- [ ] **Step 1: Viết test đỏ** (test gộp vào Task 5 module test; ở đây chỉ thêm type — verify bằng typecheck)

Không có test riêng cho type alias. Verify ở Step 4 bằng `npm run typecheck`.

- [ ] **Step 2: (bỏ qua — type-only)**

- [ ] **Step 3: Implement**

Trong `src/stamps/geometry-2d/dsl/schema.ts`, thêm type `DslDistanceSpec` ngay trước union `DslPoint` (sau dòng comment block ~36-51, trước `export type DslPoint = ...` hoặc tương đương):

```ts
export type DslDistanceSpec =
  | { kind: 'circleRadius'; circle: Name }
  | { kind: 'segmentLength'; p1: Name; p2: Name }
  | { kind: 'literal'; value: number };
```

Thêm union member vào `DslPoint` (sau `reflectLine`, dòng ~72):

```ts
  | { name: Name; kind: 'pointAtDistance'; from: Name; through: Name; distance: DslDistanceSpec }
```

> Nếu `schema.ts` dùng tên type khác (`DslPointT` vs `DslPoint`) cho union, sửa đúng tên union đang khai báo các member point. `Name` là alias đã có trong file.

- [ ] **Step 4: Verify typecheck (chưa cần xanh toàn bộ — module chưa có)**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Có thể còn lỗi "no registry entry"/exhaustive ở `registry`/`serialize` (sẽ fix ở task sau). Quan trọng: KHÔNG lỗi cú pháp trong `schema.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/schema.ts
git commit -m "feat(dsl): schema pointAtDistance + DslDistanceSpec union"
```

---

## Task 5: DSL kind module + registry

**Files:**
- Create: `src/stamps/geometry-2d/dsl/kinds/points/pointAtDistance.ts`
- Modify: `src/stamps/geometry-2d/dsl/registry.ts`
- Test: `src/stamps/geometry-2d/dsl/kinds/__tests__/pointAtDistance.test.ts` (Create)

- [ ] **Step 1: Viết test đỏ**

Tạo `src/stamps/geometry-2d/dsl/kinds/__tests__/pointAtDistance.test.ts`:

```ts
import { pointAtDistanceModule } from '../points/pointAtDistance';
import type { EmitContext } from '../_types';

const ctx: EmitContext = { resolveId: (n) => `id_${n}`, hintOf: () => 'point', mintAuxId: () => 'aux' };
const base = { name: 'C', kind: 'pointAtDistance', from: 'A', through: 'B' } as const;

describe('pointAtDistance kind', () => {
  it('parse circleRadius', () => {
    expect(pointAtDistanceModule.schema.safeParse({ ...base, distance: { kind: 'circleRadius', circle: 'k' } }).success).toBe(true);
  });
  it('parse segmentLength', () => {
    expect(pointAtDistanceModule.schema.safeParse({ ...base, distance: { kind: 'segmentLength', p1: 'O', p2: 'A' } }).success).toBe(true);
  });
  it('parse literal', () => {
    expect(pointAtDistanceModule.schema.safeParse({ ...base, distance: { kind: 'literal', value: 2 } }).success).toBe(true);
  });
  it('reject literal âm', () => {
    expect(pointAtDistanceModule.schema.safeParse({ ...base, distance: { kind: 'literal', value: -1 } }).success).toBe(false);
  });
  it('collectRefs circleRadius = [from, through, circle]', () => {
    expect(pointAtDistanceModule.collectRefs({ ...base, distance: { kind: 'circleRadius', circle: 'k' } } as never)).toEqual(['A', 'B', 'k']);
  });
  it('collectRefs segmentLength = [from, through, p1, p2]', () => {
    expect(pointAtDistanceModule.collectRefs({ ...base, distance: { kind: 'segmentLength', p1: 'O', p2: 'A' } } as never)).toEqual(['A', 'B', 'O', 'A']);
  });
  it('collectRefs literal = [from, through]', () => {
    expect(pointAtDistanceModule.collectRefs({ ...base, distance: { kind: 'literal', value: 2 } } as never)).toEqual(['A', 'B']);
  });
  it('emit resolves ids trong distance', () => {
    const out = pointAtDistanceModule.emit({ ...base, distance: { kind: 'segmentLength', p1: 'O', p2: 'A' } } as never, ctx);
    expect(out[0].object.attrs).toMatchObject({
      constraint: { kind: 'pointAtDistance', from: 'id_A', through: 'id_B', distance: { kind: 'segmentLength', p1: 'id_O', p2: 'id_A' } },
    });
  });
});
```

- [ ] **Step 2: Chạy test xác nhận đỏ**

Run: `npx jest src/stamps/geometry-2d/dsl/kinds/__tests__/pointAtDistance.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Implement**

Tạo `src/stamps/geometry-2d/dsl/kinds/points/pointAtDistance.ts`:

```ts
// src/stamps/geometry-2d/dsl/kinds/points/pointAtDistance.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'pointAtDistance' }>;

const DistanceZ = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('circleRadius'), circle: NameZ }),
  z.object({ kind: z.literal('segmentLength'), p1: NameZ, p2: NameZ }),
  z.object({ kind: z.literal('literal'), value: z.number().positive() }),
]);

export const pointAtDistanceModule = defineModule<'pointAtDistance', Input>({
  kind: 'pointAtDistance',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('pointAtDistance'),
    from: NameZ,
    through: NameZ,
    distance: DistanceZ,
  }),
  collectRefs: (e) => {
    const d = e.distance;
    const extra = d.kind === 'circleRadius' ? [d.circle]
      : d.kind === 'segmentLength' ? [d.p1, d.p2] : [];
    return [e.from, e.through, ...extra];
  },
  emit: (e, ctx) => {
    const d = e.distance;
    const distance = d.kind === 'circleRadius'
      ? { kind: 'circleRadius', circle: ctx.resolveId(d.circle) }
      : d.kind === 'segmentLength'
        ? { kind: 'segmentLength', p1: ctx.resolveId(d.p1), p2: ctx.resolveId(d.p2) }
        : { kind: 'literal', value: d.value };
    return [{
      role: 'primary',
      object: emitPointObject(ctx.resolveId(e.name), e.name, {
        kind: 'pointAtDistance',
        from: ctx.resolveId(e.from),
        through: ctx.resolveId(e.through),
        distance,
      }),
    }];
  },
});
```

Trong `src/stamps/geometry-2d/dsl/registry.ts`:
- Thêm import (cạnh các import Cụm A, sau `reflectLineModule`):
```ts
import { pointAtDistanceModule } from './kinds/points/pointAtDistance';
```
- Thêm vào mảng `ALL_MODULES` (sau `reflectLineModule`, nhóm "Cụm B points"):
```ts
  // Cụm B points
  pointAtDistanceModule,
```

- [ ] **Step 4: Chạy test xác nhận xanh**

Run: `npx jest src/stamps/geometry-2d/dsl/kinds/__tests__/pointAtDistance.test.ts`
Expected: PASS (8 test).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/kinds/points/pointAtDistance.ts src/stamps/geometry-2d/dsl/registry.ts src/stamps/geometry-2d/dsl/kinds/__tests__/pointAtDistance.test.ts
git commit -m "feat(dsl): pointAtDistance kind module + đăng ký registry"
```

---

## Task 6: Serialize round-trip (Constraint → DSL)

**Files:**
- Modify: `src/stamps/geometry-2d/dsl/serialize.ts`
- Test: `src/stamps/geometry-2d/dsl/__tests__/serialize.test.ts`

- [ ] **Step 1: Viết test đỏ**

Thêm vào `src/stamps/geometry-2d/dsl/__tests__/serialize.test.ts` (theo style các test serialize điểm có sẵn trong file — dùng `transpile` rồi `serialize` round-trip). Thêm block:

```ts
import { transpile } from '../transpile';
import { serialize } from '../serialize';

describe('serialize pointAtDistance round-trip', () => {
  const dsl = {
    version: 1 as const,
    points: [
      { name: 'O', kind: 'free' as const, x: 0, y: 0 },
      { name: 'A', kind: 'free' as const, x: 3, y: 0 },
      { name: 'B', kind: 'free' as const, x: 0, y: 3 },
      { name: 'C', kind: 'pointAtDistance' as const, from: 'A', through: 'B', distance: { kind: 'circleRadius' as const, circle: 'k' } },
    ],
    shapes: [{ name: 'k', kind: 'circleCR' as const, center: 'O', radius: 3 }],
  };

  it('transpile → serialize giữ nguyên kind + refs (labels)', () => {
    const t = transpile(dsl);
    if (!t.ok) throw new Error('transpile failed: ' + JSON.stringify(t.errors));
    const out = serialize(t.state);
    const c = out.points.find((p: any) => p.name === 'C');
    expect(c).toMatchObject({
      kind: 'pointAtDistance', from: 'A', through: 'B',
      distance: { kind: 'circleRadius', circle: 'k' },
    });
  });
});
```

> Kiểm tra tên hàm export trong `serialize.ts` (vd `serialize`/`serializeState`/`toDsl`). Dùng đúng tên + chữ ký (có thể trả `{ points, shapes }` hoặc `DslInputT`). Điều chỉnh `out.points` cho khớp shape thực tế.

- [ ] **Step 2: Chạy test xác nhận đỏ**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/serialize.test.ts -t 'pointAtDistance round-trip'`
Expected: FAIL — serialize bỏ qua `pointAtDistance` (không có case) → `c` undefined hoặc thiếu field.

- [ ] **Step 3: Implement**

Trong `src/stamps/geometry-2d/dsl/serialize.ts`, thêm case ngay trước `case 'excenter':` (mẫu `arcMidpoint` dòng ~174). Dùng đúng helper `resolveRefs(ids, state)` + `fail(...)` có sẵn trong file:

```ts
    case 'pointAtDistance': {
      const base = resolveRefs([c.from, c.through], state);
      if (!base) return fail('unresolved-ref', `${c.from},${c.through}`);
      const d = c.distance;
      let distance;
      if (d.kind === 'circleRadius') {
        const r = resolveRefs([d.circle], state);
        if (!r) return fail('unresolved-ref', d.circle);
        distance = { kind: 'circleRadius' as const, circle: r[0] };
      } else if (d.kind === 'segmentLength') {
        const r = resolveRefs([d.p1, d.p2], state);
        if (!r) return fail('unresolved-ref', `${d.p1},${d.p2}`);
        distance = { kind: 'segmentLength' as const, p1: r[0], p2: r[1] };
      } else {
        distance = { kind: 'literal' as const, value: d.value };
      }
      return {
        ok: true,
        entity: {
          name: obj.label,
          kind: 'pointAtDistance',
          from: base[0],
          through: base[1],
          distance,
        },
      };
    }
```

> Nếu `serialize.ts` liệt kê `pointAtDistance` trong nhóm `// Out of DSL v1:` (case rỗng cùng `onAxis`…), XOÁ nó khỏi nhóm đó để dùng case mới.

- [ ] **Step 4: Chạy test xác nhận xanh**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/serialize.test.ts -t 'pointAtDistance round-trip'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/serialize.ts src/stamps/geometry-2d/dsl/__tests__/serialize.test.ts
git commit -m "feat(dsl): serialize pointAtDistance (round-trip re-edit)"
```

---

## Task 7: Intent vocab + intent→DSL

**Files:**
- Modify: `src/stamps/geometry-2d/ai/intent.ts`
- Modify: `src/stamps/geometry-2d/ai/intentToDsl.ts`
- Test: `src/stamps/geometry-2d/ai/__tests__/intentToDsl.test.ts` (Create nếu chưa có; nếu có thì thêm block)

- [ ] **Step 1: Viết test đỏ**

Tạo/append `src/stamps/geometry-2d/ai/__tests__/intentToDsl.pointAtDistance.test.ts`:

```ts
import { intentToDsl } from '../intentToDsl';
import type { IntentEnvelopeT } from '../intent';

describe('intentToDsl pointAtDistance', () => {
  it('đề (O;R) dây AB, kéo dài AB lấy C với BC=R', () => {
    const env: IntentEnvelopeT = {
      decision: 'build',
      intents: [
        { op: 'draw-circle', name: 'k', spec: { kind: 'centerRadius', center: 'O', radius: 3 } } as any,
        { op: 'add-point', name: 'A', constraint: { kind: 'onCircle', circle: 'k', theta: 0 } } as any,
        { op: 'add-point', name: 'B', constraint: { kind: 'onCircle', circle: 'k', theta: 1.2 } } as any,
        { op: 'add-point', name: 'C', constraint: { kind: 'pointAtDistance', from: 'A', through: 'B', distance: { kind: 'circleRadius', circle: 'k' } } },
      ],
    } as any;
    const dsl = intentToDsl(env);
    const c = dsl.points.find((p: any) => p.name === 'C');
    expect(c).toMatchObject({
      kind: 'pointAtDistance', from: 'A', through: 'B',
      distance: { kind: 'circleRadius', circle: 'k' },
    });
  });
});
```

> Điều chỉnh chữ ký `intentToDsl` (tên hàm export thực tế trong `intentToDsl.ts`) và shape `IntentEnvelopeT` cho khớp. Các intent `draw-circle`/`onCircle` chỉ là scaffolding để C có `from/through` resolve được — nếu `onCircle` không phải constraint hợp lệ trong intent vocab, thay bằng 2 `free` point A, B.

- [ ] **Step 2: Chạy test xác nhận đỏ**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/intentToDsl.pointAtDistance.test.ts`
Expected: FAIL — Zod reject constraint `pointAtDistance` (chưa có trong vocab) hoặc switch không có case.

- [ ] **Step 3: Implement**

(a) `src/stamps/geometry-2d/ai/intent.ts` — thêm nhánh vào `discriminatedUnion('kind', [...])` của `constraint` trong `add-point` (sau nhánh `excenter`, ~dòng 130):

```ts
    z.object({
      kind: z.literal('pointAtDistance'),
      from: LabelZ,
      through: LabelZ,
      distance: z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('circleRadius'), circle: LabelZ }),
        z.object({ kind: z.literal('segmentLength'), p1: LabelZ, p2: LabelZ }),
        z.object({ kind: z.literal('literal'), value: z.number().positive() }),
      ]),
    }),
```

(b) `src/stamps/geometry-2d/ai/intentToDsl.ts` — thêm case vào switch `handleAddPoint` (sau `case 'excenter':`):

```ts
    case 'pointAtDistance':
      ensureSegment(s, c.from, c.through);
      addPoint(s, { name, kind: 'pointAtDistance', from: c.from, through: c.through, distance: c.distance });
      break;
```

- [ ] **Step 4: Chạy test xác nhận xanh**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/intentToDsl.pointAtDistance.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/intent.ts src/stamps/geometry-2d/ai/intentToDsl.ts src/stamps/geometry-2d/ai/__tests__/intentToDsl.pointAtDistance.test.ts
git commit -m "feat(ai): intent vocab + intentToDsl cho pointAtDistance"
```

---

## Task 8: Prompt vocab + validator keyword hint

**Files:**
- Modify: `src/stamps/geometry-2d/ai/intentPrompt.ts`
- Modify: `src/stamps/geometry-2d/ai/validator.ts`
- Test: `src/stamps/geometry-2d/ai/__tests__/validator.test.ts` (thêm block) hoặc `intentPrompt.test.ts`

- [ ] **Step 1: Viết test đỏ**

Thêm vào file test validator (tìm file test có sẵn cho `extractRequirements`; nếu không có, tạo `src/stamps/geometry-2d/ai/__tests__/validator.pointAtDistance.test.ts`):

```ts
import { intentPromptKinds } from '../intentPrompt'; // nếu không export, đổi sang đọc chuỗi prompt

// Test tối thiểu: prompt list chứa 'pointAtDistance'.
describe('intentPrompt vocab', () => {
  it('liệt kê pointAtDistance trong danh sách constraint', () => {
    // Nếu intentPrompt build prompt string qua hàm, gọi nó:
    const txt = String(require('../intentPrompt').buildIntentPrompt?.('x') ?? require('../intentPrompt').INTENT_SYSTEM_PROMPT ?? '');
    expect(txt).toContain('pointAtDistance');
  });
});
```

> Đây là smoke test cho prompt — điều chỉnh theo export thực tế của `intentPrompt.ts` (hàm build hay hằng string). Mục tiêu chỉ là chặn việc quên thêm vocab.

- [ ] **Step 2: Chạy test xác nhận đỏ**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/validator.pointAtDistance.test.ts`
Expected: FAIL — prompt chưa nhắc `pointAtDistance`.

- [ ] **Step 3: Implement**

(a) `src/stamps/geometry-2d/ai/intentPrompt.ts`:
- Dòng liệt kê kinds (dòng ~284): thêm `, pointAtDistance` vào cuối danh sách.
- Thêm mô tả (sau block `reflectLine` ~dòng 323):
```ts
// (trong cùng template string mô tả các kind)
`- **pointAtDistance** — điểm trên TIA kéo dài, cách mốc một khoảng. Fields: \`from\`, \`through\` (tia from→through, điểm mới nằm BÊN NGOÀI through), \`distance\` = một trong: \`{kind:"circleRadius", circle:"k"}\` (= R), \`{kind:"segmentLength", p1:"O", p2:"A"}\` (= độ dài đoạn OA), \`{kind:"literal", value:2}\` (= số).
  - Ví dụ: "Kéo dài AB về phía B, lấy C sao cho BC = R của (O)" → \`{op:"add-point", name:"C", constraint:{kind:"pointAtDistance", from:"A", through:"B", distance:{kind:"circleRadius", circle:"O"}}}\`.
  - Ví dụ: "Trên tia đối của tia BA lấy D sao cho BD = AB" → from=B? KHÔNG: "tia đối tia BA" = hướng từ B ra xa A → from="A", through="B"; distance segmentLength p1=A p2=B.`
```

(b) `src/stamps/geometry-2d/ai/validator.ts` — thêm entry vào bảng keyword→hint (mảng các object có `hint`, ~dòng 32-148). Thêm:
```ts
  {
    re: /kéo dài|tia đối|trên tia .* lấy/i,
    hint: 'Đề có "kéo dài XY ... lấy Z sao cho YZ = R/đoạn/số" hoặc "trên tia đối" → kind:"pointAtDistance" với from, through (điểm mới ngoài through), distance:{circleRadius|segmentLength|literal}. KHÔNG dùng reflectPoint (cho 2·through−from) hay onSegment t>1.',
  },
```

> Khớp shape phần tử bảng thực tế (tên field `re`/`pattern`/`keyword`). Nếu bảng dùng `pattern:` thì đổi `re:` → `pattern:`.

- [ ] **Step 4: Chạy test xác nhận xanh**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/validator.pointAtDistance.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/intentPrompt.ts src/stamps/geometry-2d/ai/validator.ts src/stamps/geometry-2d/ai/__tests__/validator.pointAtDistance.test.ts
git commit -m "feat(ai): prompt vocab + validator hint cho pointAtDistance (kéo dài / tia đối)"
```

---

## Task 9: Fixture bài động lực + integration transpile

**Files:**
- Create: `src/stamps/geometry-2d/dsl/fixtures/extend-chord-bc-radius.ts`
- Modify: `src/stamps/geometry-2d/dsl/__tests__/transpile.fixtures.test.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo fixture `src/stamps/geometry-2d/dsl/fixtures/extend-chord-bc-radius.ts`:

```ts
// src/stamps/geometry-2d/dsl/fixtures/extend-chord-bc-radius.ts
//
// Cho (O; R=3) và dây AB. Kéo dài AB về phía B, lấy C sao cho BC = R.
// Anchor cho pointAtDistance (distance = circleRadius).
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Cho đường tròn (O; R) và dây AB. Kéo dài AB về phía B, lấy điểm C sao cho BC = R.',
  dsl: {
    version: 1,
    points: [
      { name: 'O', kind: 'free', x: 0, y: 0 },
      { name: 'A', kind: 'free', x: 3, y: 0 },
      { name: 'B', kind: 'free', x: 0, y: 3 },
      { name: 'C', kind: 'pointAtDistance', from: 'A', through: 'B', distance: { kind: 'circleRadius', circle: 'k' } },
    ],
    shapes: [
      { name: 'k', kind: 'circleCR', center: 'O', radius: 3 },
      { name: 'AB', kind: 'segment', p1: 'A', p2: 'B' },
    ],
  },
};
```

Trong `src/stamps/geometry-2d/dsl/__tests__/transpile.fixtures.test.ts`:
- Thêm import:
```ts
import { fixture as extendChordBcRadius } from '../fixtures/extend-chord-bc-radius';
```
- Thêm dòng vào mảng `ALL` (object count = 6: O,A,B,C,k,AB):
```ts
  ['extend-chord-bc-radius', extendChordBcRadius, 6],
```

- [ ] **Step 2: Chạy test xác nhận đỏ → xanh**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/transpile.fixtures.test.ts -t extend-chord-bc-radius`
Expected: PASS ngay (module + schema đã xong từ task trước). Nếu FAIL "no registry entry" → kiểm tra Task 5 registry đã add module. Mục tiêu: transpile OK, 6 objects, ids hợp lệ.

- [ ] **Step 3: Thêm assertion ngữ nghĩa (test đỏ riêng)**

Thêm test block vào cùng file (ngoài it.each):

```ts
describe('extend-chord-bc-radius semantics', () => {
  it('C có constraint pointAtDistance với refs đã resolve sang id', () => {
    const r = transpile(extendChordBcRadius.dsl);
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const cObj = Object.values(r.state.objects).find((o: any) => o.label === 'C') as any;
    expect(cObj.attrs.constraint.kind).toBe('pointAtDistance');
    expect(cObj.attrs.constraint.distance.kind).toBe('circleRadius');
    // refs là id (prefix-counter), không phải label
    expect(cObj.attrs.constraint.from).toMatch(/^p\d+$/);
    expect(cObj.attrs.constraint.distance.circle).toMatch(/^c\d+$/);
  });
});
```

- [ ] **Step 4: Chạy test xác nhận xanh**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/transpile.fixtures.test.ts`
Expected: PASS toàn file.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/fixtures/extend-chord-bc-radius.ts src/stamps/geometry-2d/dsl/__tests__/transpile.fixtures.test.ts
git commit -m "test(dsl): fixture + integration extend-chord-bc-radius (bài động lực)"
```

---

## Task 10: Verification toàn cục

**Files:** (none — chỉ chạy gate)

- [ ] **Step 1: Typecheck sạch**

Run: `npm run typecheck`
Expected: 0 lỗi. Đặc biệt: switch `serialize.ts`/`point.ts`/`constraintRefs2D` exhaustive với `pointAtDistance`; không còn member thiếu handler.

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: PASS toàn bộ (số test ≥ baseline + các test mới, 0 fail).

- [ ] **Step 3: Lint (nếu có script)**

Run: `npm run lint 2>/dev/null || echo "no lint script"`
Expected: PASS hoặc không có script.

- [ ] **Step 4: Cập nhật CLAUDE.md + memory (tài liệu)**

Thêm 1 dòng vào mục Gotchas/Cụm trong `CLAUDE.md` ghi nhận kind metric đầu tiên `pointAtDistance` (3 nguồn distance) + defer (tool editor, cm-mapping). KHÔNG cần test.

- [ ] **Step 5: Commit cuối**

```bash
git add CLAUDE.md
git commit -m "docs: ghi nhận primitive pointAtDistance (kind metric đầu tiên) + defer"
```

---

## Defer (KHÔNG làm trong plan này — ghi rõ)

- Tool vẽ tay trong editor cho `pointAtDistance` (theo quyết định defer tool editor của Cụm A).
- Map đơn vị cm cho nhánh `literal` (hiện là board units thuần).
- Nguồn distance khác: bội số k·AB, đường kính 2R, tổng/hiệu 2 đoạn (DistanceSpec là discriminated union → mở thêm nhánh sau dễ).

## Self-Review Notes

- **Spec coverage:** 7 tầng spec ↔ Task 1-9; defer ↔ mục Defer. ✓
- **Type consistency:** `DslDistanceSpec` (Name) ↔ `ConstraintDistanceSpec` (string) ↔ Zod `DistanceZ`; 3 nhánh `circleRadius`/`segmentLength`/`literal` đồng nhất mọi tầng; hàm `pointAtDistanceCoord`/`makeDistanceFn` ký hiệu khớp giữa Task 1↔3. ✓
- **Adaptation flags:** Tên export thực tế ở `serialize.ts`/`intentToDsl.ts`/`intentPrompt.ts`/`validator.ts` cần verify khi thực thi (đã chú thích `>` tại mỗi chỗ). Đây là điểm rủi ro chính — executor phải grep xác nhận trước khi sửa.
