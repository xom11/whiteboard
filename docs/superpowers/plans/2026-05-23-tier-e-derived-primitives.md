# Tier E — Derived Geometric Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mở rộng `Constraint2D` discriminated union thêm 5 derived point kinds (`perpFoot`, `circumcenter`, `incenter`, `centroid`, `orthocenter`) — foundation cho AI figure generation feature phase 2.

**Architecture:** Bổ sung variant vào `Constraint2D` union; render qua JSXGraph native primitives (`perpendicularpoint`, `circumcenter`, `incenter`) hoặc compose (centroid qua function-based point, orthocenter qua 2 altitude + intersection). Helper objects được lưu vào `el._helpers` để JxgRenderer dọn dẹp khi xoá — pattern đã có precedent trong `line.ts.perpBisector`.

**Tech Stack:** TypeScript strict, JSXGraph 1.12.2, Jest 29 + jsdom, ts-jest.

**Spec:** [`docs/superpowers/specs/2026-05-23-tier-e-derived-primitives-design.md`](../specs/2026-05-23-tier-e-derived-primitives-design.md)

---

## File Structure

**Modified files:**
- `src/core/scene/kinds/2d-constraint.ts` — thêm 5 variant vào `Constraint2D` + `constraintRefs2D` cases
- `src/core/scene/kinds/point.ts` — thêm `validate` checks + `describe` cases + `render` cases cho 5 kind mới

**Modified test files:**
- `src/core/scene/kinds/__tests__/point.test.ts` — unit tests (validate/dependsOn/describe) cho 5 kind
- `src/core/scene/render/__tests__/JxgRenderer.test.ts` — integration tests verify mockBoard.create called với element type đúng

**No new files created.** Migration không cần (additive discriminated union).

**Commits:** 2 commits trên `main` (PR 1: perpFoot, PR 2: 4 centers).

---

## Task 1: perpFoot — types + dependency graph

**Files:**
- Modify: `src/core/scene/kinds/2d-constraint.ts`
- Test: `src/core/scene/kinds/__tests__/point.test.ts`

- [ ] **Step 1: Write failing test for `dependsOn` + `describe` perpFoot**

Append to `src/core/scene/kinds/__tests__/point.test.ts` (trước dòng cuối `});` của outer `describe`):

```ts
describe('constraint perpFoot', () => {
  const def = getKind('point');

  test('dependsOn perpFoot → [from, onLine]', () => {
    expect(def.dependsOn({
      constraint: { kind: 'perpFoot', from: 'A', onLine: 'l1' },
    } as never)).toEqual(['A', 'l1']);
  });

  test('describe perpFoot ghi đúng từ/đến', () => {
    const obj = mkObj('point', 'H', {
      constraint: { kind: 'perpFoot', from: 'A', onLine: 'l1' },
    });
    expect(def.describe(obj)).toMatch(/chân ⟂ từ A xuống l1/);
  });

  test('validate perpFoot throw khi thiếu from', () => {
    expect(() => def.validate?.({
      constraint: { kind: 'perpFoot', onLine: 'l1' },
    } as never)).toThrow(/perpFoot/);
  });

  test('validate perpFoot throw khi thiếu onLine', () => {
    expect(() => def.validate?.({
      constraint: { kind: 'perpFoot', from: 'A' },
    } as never)).toThrow(/perpFoot/);
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
npm test -- src/core/scene/kinds/__tests__/point.test.ts
```

Expected: FAIL — `perpFoot` chưa được xử lý trong `constraintRefs2D` / `describe` / `validate`.

- [ ] **Step 3: Add `perpFoot` variant to `Constraint2D`**

Edit `src/core/scene/kinds/2d-constraint.ts`, mở rộng `Constraint2D` union (sau case `transformed`):

```ts
export type Constraint2D =
  | { kind: 'free'; x: number; y: number }
  | { kind: 'onAxis'; axis: 'x' | 'y'; t: number }
  | { kind: 'onLine'; lineId: string; t: number }
  | { kind: 'onSegment'; segmentId: string; t: number }
  | { kind: 'onCircle'; circleId: string; theta: number }
  | { kind: 'onPolygon'; polygonId: string; u: number; v: number }
  | { kind: 'midpoint'; p1: string; p2: string }
  | { kind: 'transformed'; source: string; transform: TransformDef }
  | { kind: 'perpFoot'; from: string; onLine: string };
```

Và thêm case vào `constraintRefs2D`:

```ts
export function constraintRefs2D(c: Constraint2D): string[] {
  switch (c.kind) {
    case 'onLine': return [c.lineId];
    case 'onSegment': return [c.segmentId];
    case 'onCircle': return [c.circleId];
    case 'onPolygon': return [c.polygonId];
    case 'midpoint': return [c.p1, c.p2];
    case 'transformed': return [c.source, ...transformRefs(c.transform)];
    case 'perpFoot': return [c.from, c.onLine];
    default: return [];
  }
}
```

- [ ] **Step 4: Add `validate` check in `point.ts`**

Edit `src/core/scene/kinds/point.ts`, mở rộng `validate`:

```ts
validate: (a) => {
  if (!a || !a.constraint || !a.constraint.kind) {
    throw new Error('point: constraint required');
  }
  const c = a.constraint;
  if (c.kind === 'perpFoot') {
    if (!c.from || !c.onLine) {
      throw new Error('point.perpFoot: from và onLine bắt buộc');
    }
  }
},
```

- [ ] **Step 5: Add `describe` case in `point.ts`**

Edit `src/core/scene/kinds/point.ts`, thêm vào `describe` (sau case `transformed`, trước `return 'Điểm ' + obj.label`):

```ts
if (c.kind === 'perpFoot') {
  const fromLabel = state?.objects[c.from]?.label ?? c.from;
  const lineLabel = state?.objects[c.onLine]?.label ?? c.onLine;
  return `${obj.label} = chân ⟂ từ ${fromLabel} xuống ${lineLabel}`;
}
```

- [ ] **Step 6: Run test, verify pass**

```bash
npm test -- src/core/scene/kinds/__tests__/point.test.ts
```

Expected: PASS (4 new tests in `constraint perpFoot` describe block).

---

## Task 2: perpFoot — render path

**Files:**
- Modify: `src/core/scene/kinds/point.ts`
- Test: `src/core/scene/render/__tests__/JxgRenderer.test.ts`

- [ ] **Step 1: Write failing render test**

Append to `src/core/scene/render/__tests__/JxgRenderer.test.ts`, **trong** `describe('JxgRenderer (2D)', ...)` block, sau test cuối:

```ts
test('ADD point perpFoot → board.create("perpendicularpoint", [line, from])', () => {
  const store = createStore(createEmptyState('2d'));
  const { board, created } = mockBoard();
  new JxgRenderer(store, board as never);
  store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A', 1, 2) } });
  store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B', 4, 0) } });
  store.dispatch({ type: 'ADD', payload: { obj: mkPoint('C', 4, 5) } });
  // Một line qua B, C để làm onLine target.
  store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id: 'l1', kind: 'line', label: 'l1', visible: true, locked: false,
        layer: 'default', schemaVersion: 1, attrs: { p1: 'B', p2: 'C' },
      } as SceneObject,
    },
  });
  // perpFoot từ A xuống l1.
  store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id: 'H', kind: 'point', label: 'H', visible: true, locked: false,
        layer: 'default', schemaVersion: 1,
        attrs: { constraint: { kind: 'perpFoot', from: 'A', onLine: 'l1' } },
      } as SceneObject,
    },
  });
  // Element cuối là H.
  const hElement = created[created.length - 1];
  expect(hElement.type).toBe('perpendicularpoint');
  // JSXGraph perpendicularpoint API: parents = [line, point]
  expect(hElement.parents[0]).toBe(created[3]); // line l1
  expect(hElement.parents[1]).toBe(created[0]); // point A
});
```

- [ ] **Step 2: Run failing test**

```bash
npm test -- src/core/scene/render/__tests__/JxgRenderer.test.ts
```

Expected: FAIL — render case `perpFoot` chưa có trong `point.ts`, fall through default `board.create('point', [0, 0], opts)`.

- [ ] **Step 3: Add render case in `point.ts`**

Edit `src/core/scene/kinds/point.ts`, trong `render` function, thêm sau case `transformed` (trước `return board.create('point', [0, 0], opts)`):

```ts
if (c.kind === 'perpFoot') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from: any = ctx.resolveRef(c.from);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onLine: any = ctx.resolveRef(c.onLine);
  // JSXGraph 'perpendicularpoint': create('perpendicularpoint', [line, point])
  //   → trả về chân vuông góc của point xuống line.
  return board.create('perpendicularpoint', [onLine, from], opts);
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
npm test -- src/core/scene/render/__tests__/JxgRenderer.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run full test suite + typecheck**

```bash
npm test && npm run typecheck
```

Expected: tất cả test pass, không có TypeScript error.

- [ ] **Step 6: Commit PR 1**

```bash
git add src/core/scene/kinds/2d-constraint.ts \
        src/core/scene/kinds/point.ts \
        src/core/scene/kinds/__tests__/point.test.ts \
        src/core/scene/render/__tests__/JxgRenderer.test.ts

git commit -m "feat(scene): perpFoot constraint cho point — Tier E PR 1

Thêm 'perpFoot' variant vào Constraint2D cho chân đường vuông góc từ
1 điểm xuống 1 line/segment. Render qua JSXGraph 'perpendicularpoint'
nên derived point tự cập nhật khi user kéo điểm gốc."
```

---

## Task 3: circumcenter — types + tests + render

**Files:**
- Modify: `src/core/scene/kinds/2d-constraint.ts`
- Modify: `src/core/scene/kinds/point.ts`
- Test: `src/core/scene/kinds/__tests__/point.test.ts`
- Test: `src/core/scene/render/__tests__/JxgRenderer.test.ts`

- [ ] **Step 1: Write failing tests cho circumcenter**

Append to `src/core/scene/kinds/__tests__/point.test.ts` (sau block `constraint perpFoot`):

```ts
describe('constraint circumcenter', () => {
  const def = getKind('point');

  test('dependsOn → 3 vertices', () => {
    expect(def.dependsOn({
      constraint: { kind: 'circumcenter', vertices: ['A', 'B', 'C'] },
    } as never)).toEqual(['A', 'B', 'C']);
  });

  test('describe ghi rõ tâm ngoại tiếp', () => {
    const obj = mkObj('point', 'O', {
      constraint: { kind: 'circumcenter', vertices: ['A', 'B', 'C'] },
    });
    expect(def.describe(obj)).toMatch(/tâm ngoại tiếp.*ABC/);
  });

  test('validate throw khi vertices không phải tuple 3', () => {
    expect(() => def.validate?.({
      constraint: { kind: 'circumcenter', vertices: ['A', 'B'] },
    } as never)).toThrow(/circumcenter/);
  });

  test('validate throw khi vertex id rỗng', () => {
    expect(() => def.validate?.({
      constraint: { kind: 'circumcenter', vertices: ['A', '', 'C'] },
    } as never)).toThrow(/circumcenter/);
  });
});
```

Append to `src/core/scene/render/__tests__/JxgRenderer.test.ts` (trong `describe('JxgRenderer (2D)', ...)`):

```ts
test('ADD point circumcenter → board.create("circumcenter", [A, B, C])', () => {
  const store = createStore(createEmptyState('2d'));
  const { board, created } = mockBoard();
  new JxgRenderer(store, board as never);
  store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A', 0, 0) } });
  store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B', 4, 0) } });
  store.dispatch({ type: 'ADD', payload: { obj: mkPoint('C', 2, 3) } });
  store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id: 'O', kind: 'point', label: 'O', visible: true, locked: false,
        layer: 'default', schemaVersion: 1,
        attrs: { constraint: { kind: 'circumcenter', vertices: ['A', 'B', 'C'] } },
      } as SceneObject,
    },
  });
  const oElement = created[created.length - 1];
  expect(oElement.type).toBe('circumcenter');
  expect(oElement.parents).toEqual([created[0], created[1], created[2]]);
});
```

- [ ] **Step 2: Run failing tests**

```bash
npm test -- src/core/scene/kinds/__tests__/point.test.ts src/core/scene/render/__tests__/JxgRenderer.test.ts
```

Expected: FAIL — `circumcenter` chưa được xử lý.

- [ ] **Step 3: Add `circumcenter` variant + constraintRefs2D case**

Edit `src/core/scene/kinds/2d-constraint.ts`. Thêm variant vào union (sau `perpFoot`):

```ts
  | { kind: 'perpFoot'; from: string; onLine: string }
  | { kind: 'circumcenter'; vertices: [string, string, string] };
```

Và case trong `constraintRefs2D` (sau case `perpFoot`):

```ts
    case 'perpFoot': return [c.from, c.onLine];
    case 'circumcenter': return [c.vertices[0], c.vertices[1], c.vertices[2]];
    default: return [];
```

- [ ] **Step 4: Add validate + describe + render cases trong `point.ts`**

Edit `src/core/scene/kinds/point.ts`.

Trong `validate`, sau block `perpFoot`:

```ts
  if (c.kind === 'circumcenter') {
    if (!Array.isArray(c.vertices) || c.vertices.length !== 3) {
      throw new Error('point.circumcenter: vertices phải là tuple 3 id');
    }
    if (!c.vertices[0] || !c.vertices[1] || !c.vertices[2]) {
      throw new Error('point.circumcenter: 3 vertex id phải non-empty');
    }
  }
```

Trong `describe`, sau case `perpFoot`:

```ts
if (c.kind === 'circumcenter') {
  const labels = c.vertices.map((id) => state?.objects[id]?.label ?? id).join('');
  return `${obj.label} = tâm ngoại tiếp Δ${labels}`;
}
```

Trong `render`, sau case `perpFoot`:

```ts
if (c.kind === 'circumcenter') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a: any = ctx.resolveRef(c.vertices[0]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = ctx.resolveRef(c.vertices[1]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c3: any = ctx.resolveRef(c.vertices[2]);
  // JSXGraph 'circumcenter': create('circumcenter', [A, B, C])
  return board.create('circumcenter', [a, b, c3], opts);
}
```

- [ ] **Step 5: Run tests, verify pass**

```bash
npm test -- src/core/scene/kinds/__tests__/point.test.ts src/core/scene/render/__tests__/JxgRenderer.test.ts
```

Expected: PASS.

---

## Task 4: incenter — types + tests + render

**Files:**
- Modify: `src/core/scene/kinds/2d-constraint.ts`
- Modify: `src/core/scene/kinds/point.ts`
- Test: `src/core/scene/kinds/__tests__/point.test.ts`
- Test: `src/core/scene/render/__tests__/JxgRenderer.test.ts`

- [ ] **Step 1: Write failing tests cho incenter**

Append to `src/core/scene/kinds/__tests__/point.test.ts`:

```ts
describe('constraint incenter', () => {
  const def = getKind('point');

  test('dependsOn → 3 vertices', () => {
    expect(def.dependsOn({
      constraint: { kind: 'incenter', vertices: ['A', 'B', 'C'] },
    } as never)).toEqual(['A', 'B', 'C']);
  });

  test('describe ghi rõ tâm nội tiếp', () => {
    const obj = mkObj('point', 'I', {
      constraint: { kind: 'incenter', vertices: ['A', 'B', 'C'] },
    });
    expect(def.describe(obj)).toMatch(/tâm nội tiếp.*ABC/);
  });

  test('validate throw khi vertices không phải tuple 3', () => {
    expect(() => def.validate?.({
      constraint: { kind: 'incenter', vertices: ['A'] },
    } as never)).toThrow(/incenter/);
  });
});
```

Append to `src/core/scene/render/__tests__/JxgRenderer.test.ts`:

```ts
test('ADD point incenter → board.create("incenter", [A, B, C])', () => {
  const store = createStore(createEmptyState('2d'));
  const { board, created } = mockBoard();
  new JxgRenderer(store, board as never);
  store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A', 0, 0) } });
  store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B', 4, 0) } });
  store.dispatch({ type: 'ADD', payload: { obj: mkPoint('C', 2, 3) } });
  store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id: 'I', kind: 'point', label: 'I', visible: true, locked: false,
        layer: 'default', schemaVersion: 1,
        attrs: { constraint: { kind: 'incenter', vertices: ['A', 'B', 'C'] } },
      } as SceneObject,
    },
  });
  const iElement = created[created.length - 1];
  expect(iElement.type).toBe('incenter');
  expect(iElement.parents).toEqual([created[0], created[1], created[2]]);
});
```

- [ ] **Step 2: Run failing tests**

```bash
npm test -- src/core/scene/kinds/__tests__/point.test.ts src/core/scene/render/__tests__/JxgRenderer.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Add `incenter` variant**

Edit `src/core/scene/kinds/2d-constraint.ts`. Thêm vào union:

```ts
  | { kind: 'incenter'; vertices: [string, string, string] };
```

Và case trong `constraintRefs2D`:

```ts
    case 'incenter': return [c.vertices[0], c.vertices[1], c.vertices[2]];
```

- [ ] **Step 4: Add validate + describe + render cases**

Edit `src/core/scene/kinds/point.ts`.

Validate (sau circumcenter):

```ts
  if (c.kind === 'incenter') {
    if (!Array.isArray(c.vertices) || c.vertices.length !== 3) {
      throw new Error('point.incenter: vertices phải là tuple 3 id');
    }
    if (!c.vertices[0] || !c.vertices[1] || !c.vertices[2]) {
      throw new Error('point.incenter: 3 vertex id phải non-empty');
    }
  }
```

Describe:

```ts
if (c.kind === 'incenter') {
  const labels = c.vertices.map((id) => state?.objects[id]?.label ?? id).join('');
  return `${obj.label} = tâm nội tiếp Δ${labels}`;
}
```

Render:

```ts
if (c.kind === 'incenter') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a: any = ctx.resolveRef(c.vertices[0]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = ctx.resolveRef(c.vertices[1]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c3: any = ctx.resolveRef(c.vertices[2]);
  return board.create('incenter', [a, b, c3], opts);
}
```

- [ ] **Step 5: Run tests, verify pass**

```bash
npm test -- src/core/scene/kinds/__tests__/point.test.ts src/core/scene/render/__tests__/JxgRenderer.test.ts
```

Expected: PASS.

---

## Task 5: centroid — types + tests + render

**Files:**
- Modify: `src/core/scene/kinds/2d-constraint.ts`
- Modify: `src/core/scene/kinds/point.ts`
- Test: `src/core/scene/kinds/__tests__/point.test.ts`
- Test: `src/core/scene/render/__tests__/JxgRenderer.test.ts`

- [ ] **Step 1: Write failing tests cho centroid**

Append to `src/core/scene/kinds/__tests__/point.test.ts`:

```ts
describe('constraint centroid', () => {
  const def = getKind('point');

  test('dependsOn → 3 vertices', () => {
    expect(def.dependsOn({
      constraint: { kind: 'centroid', vertices: ['A', 'B', 'C'] },
    } as never)).toEqual(['A', 'B', 'C']);
  });

  test('describe ghi rõ trọng tâm', () => {
    const obj = mkObj('point', 'G', {
      constraint: { kind: 'centroid', vertices: ['A', 'B', 'C'] },
    });
    expect(def.describe(obj)).toMatch(/trọng tâm.*ABC/);
  });

  test('validate throw khi vertices không phải tuple 3', () => {
    expect(() => def.validate?.({
      constraint: { kind: 'centroid', vertices: ['A', 'B'] },
    } as never)).toThrow(/centroid/);
  });
});
```

Append to `src/core/scene/render/__tests__/JxgRenderer.test.ts`:

```ts
test('ADD point centroid → board.create("point", [fnX, fnY]) function-based', () => {
  const store = createStore(createEmptyState('2d'));
  const { board, created } = mockBoard();
  new JxgRenderer(store, board as never);
  store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A', 0, 0) } });
  store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B', 6, 0) } });
  store.dispatch({ type: 'ADD', payload: { obj: mkPoint('C', 3, 9) } });
  // Mock points cần có .X() và .Y() để centroid functions chạy được khi gọi.
  created[0].X = () => 0; created[0].Y = () => 0;
  created[1].X = () => 6; created[1].Y = () => 0;
  created[2].X = () => 3; created[2].Y = () => 9;
  store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id: 'G', kind: 'point', label: 'G', visible: true, locked: false,
        layer: 'default', schemaVersion: 1,
        attrs: { constraint: { kind: 'centroid', vertices: ['A', 'B', 'C'] } },
      } as SceneObject,
    },
  });
  const gElement = created[created.length - 1];
  expect(gElement.type).toBe('point');
  // Parents là 2 functions; gọi để xác minh trả về centroid (3, 3).
  expect(typeof gElement.parents[0]).toBe('function');
  expect(typeof gElement.parents[1]).toBe('function');
  expect(gElement.parents[0]()).toBeCloseTo(3);
  expect(gElement.parents[1]()).toBeCloseTo(3);
});
```

- [ ] **Step 2: Run failing tests**

```bash
npm test -- src/core/scene/kinds/__tests__/point.test.ts src/core/scene/render/__tests__/JxgRenderer.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Add `centroid` variant**

Edit `src/core/scene/kinds/2d-constraint.ts`. Union:

```ts
  | { kind: 'centroid'; vertices: [string, string, string] };
```

Case trong `constraintRefs2D`:

```ts
    case 'centroid': return [c.vertices[0], c.vertices[1], c.vertices[2]];
```

- [ ] **Step 4: Add validate + describe + render cases**

Edit `src/core/scene/kinds/point.ts`.

Validate:

```ts
  if (c.kind === 'centroid') {
    if (!Array.isArray(c.vertices) || c.vertices.length !== 3) {
      throw new Error('point.centroid: vertices phải là tuple 3 id');
    }
    if (!c.vertices[0] || !c.vertices[1] || !c.vertices[2]) {
      throw new Error('point.centroid: 3 vertex id phải non-empty');
    }
  }
```

Describe:

```ts
if (c.kind === 'centroid') {
  const labels = c.vertices.map((id) => state?.objects[id]?.label ?? id).join('');
  return `${obj.label} = trọng tâm Δ${labels}`;
}
```

Render (function-based point — không có JSXGraph element tên 'centroid'):

```ts
if (c.kind === 'centroid') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a: any = ctx.resolveRef(c.vertices[0]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = ctx.resolveRef(c.vertices[1]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c3: any = ctx.resolveRef(c.vertices[2]);
  // JSXGraph function-based point: parents = [() => x, () => y]
  // Function được gọi lại mỗi frame → live update khi user kéo vertex.
  return board.create('point', [
    () => (a.X() + b.X() + c3.X()) / 3,
    () => (a.Y() + b.Y() + c3.Y()) / 3,
  ], opts);
}
```

- [ ] **Step 5: Run tests, verify pass**

```bash
npm test -- src/core/scene/kinds/__tests__/point.test.ts src/core/scene/render/__tests__/JxgRenderer.test.ts
```

Expected: PASS.

---

## Task 6: orthocenter — types + tests + render (composition pattern)

**Files:**
- Modify: `src/core/scene/kinds/2d-constraint.ts`
- Modify: `src/core/scene/kinds/point.ts`
- Test: `src/core/scene/kinds/__tests__/point.test.ts`
- Test: `src/core/scene/render/__tests__/JxgRenderer.test.ts`

- [ ] **Step 1: Write failing tests cho orthocenter**

Append to `src/core/scene/kinds/__tests__/point.test.ts`:

```ts
describe('constraint orthocenter', () => {
  const def = getKind('point');

  test('dependsOn → 3 vertices', () => {
    expect(def.dependsOn({
      constraint: { kind: 'orthocenter', vertices: ['A', 'B', 'C'] },
    } as never)).toEqual(['A', 'B', 'C']);
  });

  test('describe ghi rõ trực tâm', () => {
    const obj = mkObj('point', 'H', {
      constraint: { kind: 'orthocenter', vertices: ['A', 'B', 'C'] },
    });
    expect(def.describe(obj)).toMatch(/trực tâm.*ABC/);
  });

  test('validate throw khi vertices không phải tuple 3', () => {
    expect(() => def.validate?.({
      constraint: { kind: 'orthocenter', vertices: ['A', 'B', 'C', 'D'] },
    } as never)).toThrow(/orthocenter/);
  });
});
```

Append to `src/core/scene/render/__tests__/JxgRenderer.test.ts`:

```ts
test('ADD point orthocenter → intersection có _helpers cho cleanup', () => {
  const store = createStore(createEmptyState('2d'));
  const { board, created } = mockBoard();
  new JxgRenderer(store, board as never);
  store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A', 0, 0) } });
  store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B', 6, 0) } });
  store.dispatch({ type: 'ADD', payload: { obj: mkPoint('C', 2, 5) } });
  store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id: 'H', kind: 'point', label: 'H', visible: true, locked: false,
        layer: 'default', schemaVersion: 1,
        attrs: { constraint: { kind: 'orthocenter', vertices: ['A', 'B', 'C'] } },
      } as SceneObject,
    },
  });
  // Phải tạo: lineBC, altA (perpendicular), lineAC, altB (perpendicular), intersection
  // = 5 element thêm sau 3 point gốc.
  expect(created).toHaveLength(8);
  const hElement = created[7];
  expect(hElement.type).toBe('intersection');
  expect(hElement._helpers).toHaveLength(4);
  // Helpers: 2 line + 2 perpendicular.
  expect(hElement._helpers.map((h: any) => h.type)).toEqual(
    ['line', 'perpendicular', 'line', 'perpendicular'],
  );
});
```

- [ ] **Step 2: Run failing tests**

```bash
npm test -- src/core/scene/kinds/__tests__/point.test.ts src/core/scene/render/__tests__/JxgRenderer.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Add `orthocenter` variant**

Edit `src/core/scene/kinds/2d-constraint.ts`. Union:

```ts
  | { kind: 'orthocenter'; vertices: [string, string, string] };
```

Case trong `constraintRefs2D`:

```ts
    case 'orthocenter': return [c.vertices[0], c.vertices[1], c.vertices[2]];
```

- [ ] **Step 4: Add validate + describe + render cases**

Edit `src/core/scene/kinds/point.ts`.

Validate:

```ts
  if (c.kind === 'orthocenter') {
    if (!Array.isArray(c.vertices) || c.vertices.length !== 3) {
      throw new Error('point.orthocenter: vertices phải là tuple 3 id');
    }
    if (!c.vertices[0] || !c.vertices[1] || !c.vertices[2]) {
      throw new Error('point.orthocenter: 3 vertex id phải non-empty');
    }
  }
```

Describe:

```ts
if (c.kind === 'orthocenter') {
  const labels = c.vertices.map((id) => state?.objects[id]?.label ?? id).join('');
  return `${obj.label} = trực tâm Δ${labels}`;
}
```

Render (compose 2 altitudes + intersection; JSXGraph 1.12 không có element `orthocenter`):

```ts
if (c.kind === 'orthocenter') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a: any = ctx.resolveRef(c.vertices[0]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = ctx.resolveRef(c.vertices[1]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c3: any = ctx.resolveRef(c.vertices[2]);
  const hide = { visible: false, withLabel: false, fixed: true, name: '' };
  // Altitude A→BC: line BC + perpendicular từ A xuống BC.
  const lineBC = board.create('line', [b, c3], hide);
  const altA = board.create('perpendicular', [lineBC, a], hide);
  // Altitude B→AC: line AC + perpendicular từ B xuống AC.
  const lineAC = board.create('line', [a, c3], hide);
  const altB = board.create('perpendicular', [lineAC, b], hide);
  // Trực tâm = giao 2 altitude (branch 0 — chỉ có 1 giao điểm).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ortho: any = board.create('intersection', [altA, altB, 0], opts);
  ortho._helpers = [lineBC, altA, lineAC, altB];
  return ortho;
}
```

- [ ] **Step 5: Run tests, verify pass**

```bash
npm test -- src/core/scene/kinds/__tests__/point.test.ts src/core/scene/render/__tests__/JxgRenderer.test.ts
```

Expected: PASS.

---

## Task 7: Final integration check + commit PR 2

**Files:** None modified — verification only.

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: tất cả test pass (bao gồm pre-existing tests + 4 new constraint test suites + 4 new render integration tests).

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no TypeScript error.

- [ ] **Step 3: Verify exhaustive switch không silently miss new kinds**

Run grep để confirm không có switch nào trên `c.kind` thiếu xử lý 5 kind mới (ngoài `2d-constraint.ts` và `point.ts` đã update):

```bash
grep -rn "constraint.kind\|c\.kind ===" src --include="*.ts" --include="*.tsx" \
  | grep -v __tests__ \
  | grep -v "point.ts\|point3d.ts\|2d-constraint.ts"
```

Expected: output rỗng (hoặc chỉ liên quan Constraint3D / graph-2d unrelated).

Nếu có match khác, **đọc file đó và xác định** có cần update không. Đa số sẽ không vì:
- 3D dùng `Constraint3D` riêng
- graph-2d không expose Constraint2D kinds này tới user

- [ ] **Step 4: Commit PR 2**

```bash
git add src/core/scene/kinds/2d-constraint.ts \
        src/core/scene/kinds/point.ts \
        src/core/scene/kinds/__tests__/point.test.ts \
        src/core/scene/render/__tests__/JxgRenderer.test.ts

git commit -m "feat(scene): 4 triangle centers cho point constraint — Tier E PR 2

Thêm circumcenter / incenter / centroid / orthocenter vào Constraint2D.
Render: circumcenter + incenter qua JSXGraph native primitive; centroid
qua function-based point (avg 3 vertices, live update); orthocenter
compose 2 altitude (line + perpendicular) + intersection với _helpers
cho cleanup. Hoàn thành Tier E foundation cho AI feature phase 2."
```

---

## Verification checklist

Sau khi xong cả 2 PR, verify thủ công trong dev server:

- [ ] `npm run dev` (whiteboard package watch build) — không error
- [ ] Trong consumer app, mở geometry-2d editor
- [ ] Inject test stamp với state JSON chứa `perpFoot` → render đúng vị trí
- [ ] Kéo điểm gốc → perpFoot di chuyển theo (live update verify)
- [ ] Tương tự cho 4 triangle centers
- [ ] Test serialize: stamp với 5 kind mới → close editor → reopen → deserialize OK

**Manual verification không phải task tự động — chỉ là note để smoke test trước khi tag v0.21.0.**

---

## Self-Review Notes

**Spec coverage:**
- ✅ Constraint2D extension (5 variants): Task 1 + 3 + 4 + 5 + 6
- ✅ constraintRefs2D updates: Task 1 step 3, Task 3 step 3, Task 4 step 3, Task 5 step 3, Task 6 step 3
- ✅ validate per kind: từng task step 4
- ✅ describe per kind: từng task step 4 (PR 1 step 5)
- ✅ render per kind: từng task có render step
- ✅ JSXGraph mapping: perpendicularpoint, circumcenter, incenter, function-based (centroid), composition (orthocenter)
- ✅ Helper cleanup pattern (orthocenter): Task 6 step 4 render
- ✅ Test coverage: unit (point.test.ts) + integration (JxgRenderer.test.ts)
- ✅ No migration needed (additive union)
- ✅ Exhaustiveness audit: Task 7 step 3
- ✅ PR sequencing 2 commits: Task 2 step 6 (PR 1), Task 7 step 4 (PR 2)

**Out of scope (per spec):**
- Editor toolbar buttons cho 5 kinds — phase 2
- Decorations (right-angle mark, length label, angle marker) — phase 2
- AI feature — phase 2

**Placeholder scan:** Tất cả code blocks là complete. Không có TBD/TODO.

**Type consistency:** Tên field nhất quán cross-task:
- `perpFoot.from` + `perpFoot.onLine` (asymmetric semantic)
- 4 centers dùng `vertices: [string, string, string]` (tuple 3)
- Helper pattern dùng `_helpers` array trên element (precedent: line.ts)
