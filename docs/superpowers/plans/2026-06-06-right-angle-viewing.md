# Pattern "góc vuông nhìn đoạn" (∠AMB=90°) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép pipeline AI dựng điểm M trên một đường thẳng sao cho ∠AMB = 90°, bằng cách tự sinh đường tròn đường kính AB (ẩn) + giao line∩circle.

**Architecture:** Thêm 1 add-point constraint `rightAngleViewing` ở tầng intent; handler trong `intentToDsl` expand thành 3 DSL object (midpoint ẩn + circleCP ẩn + intersection lineCircle hiện). Một stage deterministic `completeRightAngle` (1.5c) inject constraint từ regex tiếng Việt khi LLM miss. DSL bổ sung field optional `visible` cho midpoint + circleCP để ẩn vật dựng phụ.

**Tech Stack:** TypeScript strict, Zod 3, Jest 29 + ts-jest. Hình học qua JSXGraph (đã có kind `intersection` lineCircle + branch, `circleCP`).

Spec: `docs/superpowers/specs/2026-06-06-right-angle-viewing-design.md`

---

## File Structure

| File | Trách nhiệm | Loại |
|---|---|---|
| `src/stamps/geometry-2d/dsl/schema.ts` | + `visible?: boolean` vào static type midpoint + circleCP | Modify |
| `src/stamps/geometry-2d/dsl/kinds/_shared.ts` | `emitPointObject` nhận param `visible` | Modify |
| `src/stamps/geometry-2d/dsl/kinds/points/midpoint.ts` | schema + emit honor `visible` | Modify |
| `src/stamps/geometry-2d/dsl/kinds/circles/circleCP.ts` | schema + emit honor `visible` | Modify |
| `src/stamps/geometry-2d/dsl/kinds/__tests__/visible-aux.test.ts` | test ẩn vật dựng | Create |
| `src/stamps/geometry-2d/ai/intent.ts` | + constraint `rightAngleViewing` | Modify |
| `src/stamps/geometry-2d/ai/intentToDsl.ts` | + case handler (3 object) | Modify |
| `src/stamps/geometry-2d/ai/completeRightAngle.ts` | Stage 1.5c deterministic inject | Create |
| `src/stamps/geometry-2d/ai/buildFigureIntent.ts` | wire stage 1.5c | Modify |
| `src/stamps/geometry-2d/ai/intentPrompt.ts` | keyword + constraint list + few-shot | Modify |
| `src/stamps/geometry-2d/ai/__tests__/intent.test.ts` | parse rightAngleViewing | Modify |
| `src/stamps/geometry-2d/ai/__tests__/intentToDsl.test.ts` | handler → 3 object | Modify |
| `src/stamps/geometry-2d/ai/__tests__/completeRightAngle.test.ts` | inject/replace/keep | Create |
| `src/stamps/geometry-2d/ai/__tests__/intentPrompt.test.ts` | prompt chứa keyword | Modify |
| `src/stamps/geometry-2d/ai/__tests__/rightAngle-e2e.test.ts` | intent → DSL → transpile | Create |
| `scripts/eval-intent.ts` | + 2 fixture Tier 4 | Modify |

**Thứ tự task:** DSL visible (Task 1) → intent schema (Task 2) → handler (Task 3) → completeRightAngle (Task 4) → wire (Task 5) → prompt (Task 6) → eval fixtures (Task 7) → e2e integration (Task 8).

---

## Task 1: DSL — field `visible` cho vật dựng phụ (midpoint + circleCP)

**Files:**
- Modify: `src/stamps/geometry-2d/dsl/kinds/_shared.ts`
- Modify: `src/stamps/geometry-2d/dsl/kinds/points/midpoint.ts`
- Modify: `src/stamps/geometry-2d/dsl/kinds/circles/circleCP.ts`
- Modify: `src/stamps/geometry-2d/dsl/schema.ts:53` và `:84`
- Test: `src/stamps/geometry-2d/dsl/kinds/__tests__/visible-aux.test.ts`

- [ ] **Step 1: Viết test thất bại**

Tạo `src/stamps/geometry-2d/dsl/kinds/__tests__/visible-aux.test.ts`:

```ts
import { transpile } from '../../transpile';

describe('visible flag cho vật dựng phụ', () => {
  it('midpoint visible:false → SceneObject.visible false', () => {
    const r = transpile({
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: -3, y: 0 },
        { name: 'B', kind: 'free', x: 3, y: 0 },
        { name: 'O', kind: 'midpoint', p1: 'A', p2: 'B', visible: false },
      ],
      shapes: [],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const o = Object.values(r.state.objects).find((x) => x.label === 'O')!;
    expect(o.visible).toBe(false);
  });

  it('midpoint không truyền visible → mặc định true', () => {
    const r = transpile({
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: -3, y: 0 },
        { name: 'B', kind: 'free', x: 3, y: 0 },
        { name: 'O', kind: 'midpoint', p1: 'A', p2: 'B' },
      ],
      shapes: [],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const o = Object.values(r.state.objects).find((x) => x.label === 'O')!;
    expect(o.visible).toBe(true);
  });

  it('circleCP visible:false → SceneObject.visible false', () => {
    const r = transpile({
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: -3, y: 0 },
        { name: 'B', kind: 'free', x: 3, y: 0 },
        { name: 'O', kind: 'midpoint', p1: 'A', p2: 'B', visible: false },
      ],
      shapes: [
        { name: 'w', kind: 'circleCP', center: 'O', surfacePoint: 'A', visible: false },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = Object.values(r.state.objects).find((x) => x.label === 'w')!;
    expect(c.visible).toBe(false);
  });
});
```

> Lưu ý: kiểm tra shape `TranspileResult` ok — field scene. Nếu API là `r.state.objects` khác (vd `r.state.objects`), đọc `transpile.ts` `TranspileResult` type và chỉnh accessor cho khớp trước khi chạy.

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npx jest src/stamps/geometry-2d/dsl/kinds/__tests__/visible-aux.test.ts`
Expected: FAIL — schema SCHEMA error "Unrecognized key visible" hoặc visible vẫn `true` (zod strip key).

- [ ] **Step 3: Thêm param `visible` vào `emitPointObject` (`_shared.ts`)**

Sửa hàm `emitPointObject` trong `src/stamps/geometry-2d/dsl/kinds/_shared.ts`:

```ts
/** Wrap a Constraint2D-style attrs into a primary 'point' SceneObject. */
export function emitPointObject(
  id: string,
  name: string,
  constraint: Record<string, unknown>,
  visible = true,
): SceneObject {
  return {
    id,
    kind: 'point',
    label: name,
    ...POINT_BASE_FIELDS,
    visible,
    attrs: { constraint },
  };
}
```

(Spread `POINT_BASE_FIELDS` đặt `visible: true`, dòng `visible,` sau đó override.)

- [ ] **Step 4: midpoint schema + emit honor `visible`**

Sửa `src/stamps/geometry-2d/dsl/kinds/points/midpoint.ts`:

```ts
  schema: z.object({
    name: NameZ,
    kind: z.literal('midpoint'),
    p1: NameZ,
    p2: NameZ,
    visible: z.boolean().optional(),
  }),
  collectRefs: (e) => [e.p1, e.p2],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(
      ctx.resolveId(e.name),
      e.name,
      { kind: 'midpoint', p1: ctx.resolveId(e.p1), p2: ctx.resolveId(e.p2) },
      e.visible ?? true,
    ),
  }],
```

- [ ] **Step 5: circleCP schema + emit honor `visible`**

Sửa `src/stamps/geometry-2d/dsl/kinds/circles/circleCP.ts`:

```ts
  schema: z.object({
    name: NameZ,
    kind: z.literal('circleCP'),
    center: NameZ,
    surfacePoint: NameZ,
    visible: z.boolean().optional(),
  }),
  collectRefs: (e) => [e.center, e.surfacePoint],
  emit: (e, ctx) => [{
    role: 'primary',
    object: {
      id: ctx.resolveId(e.name),
      kind: 'circle',
      label: e.name,
      ...SHAPE_BASE_FIELDS,
      visible: e.visible ?? true,
      attrs: { center: ctx.resolveId(e.center), surfacePoint: ctx.resolveId(e.surfacePoint) },
    },
  }],
```

- [ ] **Step 6: Cập nhật static type (`schema.ts`)**

Sửa 2 dòng trong `src/stamps/geometry-2d/dsl/schema.ts`:

Dòng 53 (midpoint variant):
```ts
  | { name: Name; kind: 'midpoint'; p1: Name; p2: Name; visible?: boolean }
```

Dòng 84 (circleCP variant):
```ts
  | { name: Name; kind: 'circleCP'; center: Name; surfacePoint: Name; visible?: boolean }
```

- [ ] **Step 7: Chạy test để xác nhận PASS + typecheck**

Run: `npx jest src/stamps/geometry-2d/dsl/kinds/__tests__/visible-aux.test.ts && npm run typecheck`
Expected: 3 test PASS, typecheck clean.

- [ ] **Step 8: Commit**

```bash
git add src/stamps/geometry-2d/dsl/kinds/_shared.ts src/stamps/geometry-2d/dsl/kinds/points/midpoint.ts src/stamps/geometry-2d/dsl/kinds/circles/circleCP.ts src/stamps/geometry-2d/dsl/schema.ts src/stamps/geometry-2d/dsl/kinds/__tests__/visible-aux.test.ts
git commit -m "feat(dsl): field visible optional cho midpoint + circleCP (vật dựng phụ ẩn)"
```

---

## Task 2: Intent schema — constraint `rightAngleViewing`

**Files:**
- Modify: `src/stamps/geometry-2d/ai/intent.ts:130` (cuối discriminatedUnion add-point)
- Test: `src/stamps/geometry-2d/ai/__tests__/intent.test.ts`

- [ ] **Step 1: Viết test thất bại**

Thêm vào `src/stamps/geometry-2d/ai/__tests__/intent.test.ts` (cuối file, trong describe phù hợp hoặc describe mới):

```ts
import { AddPointIntentZ } from '../intent';

describe('rightAngleViewing constraint', () => {
  it('parse intent hợp lệ', () => {
    const r = AddPointIntentZ.safeParse({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'CK', which: 0 },
    });
    expect(r.success).toBe(true);
  });

  it('which optional', () => {
    const r = AddPointIntentZ.safeParse({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'CK' },
    });
    expect(r.success).toBe(true);
  });

  it('reject thiếu onLine', () => {
    const r = AddPointIntentZ.safeParse({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'rightAngleViewing', a: 'A', b: 'B' },
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/intent.test.ts -t rightAngleViewing`
Expected: FAIL — `rightAngleViewing` chưa nằm trong discriminated union.

- [ ] **Step 3: Thêm variant vào schema**

Trong `src/stamps/geometry-2d/ai/intent.ts`, thêm dòng sau variant `excenter` (cuối union `constraint`), trước `]),`:

```ts
    // Góc vuông nhìn đoạn: M trên onLine sao cho ∠ a-name-b = 90°
    z.object({ kind: z.literal('rightAngleViewing'), a: LabelZ, b: LabelZ, onLine: z.string(), which: z.union([z.literal(0), z.literal(1)]).optional() }),
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/intent.test.ts -t rightAngleViewing && npm run typecheck`
Expected: 3 test PASS, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/intent.ts src/stamps/geometry-2d/ai/__tests__/intent.test.ts
git commit -m "feat(intent): add-point constraint rightAngleViewing"
```

---

## Task 3: intentToDsl handler — expand thành 3 object

**Files:**
- Modify: `src/stamps/geometry-2d/ai/intentToDsl.ts` (trong `handleAddPoint` switch, sau case `excenter`)
- Test: `src/stamps/geometry-2d/ai/__tests__/intentToDsl.test.ts`

- [ ] **Step 1: Viết test thất bại**

Thêm vào `src/stamps/geometry-2d/ai/__tests__/intentToDsl.test.ts`:

```ts
describe('rightAngleViewing → DSL', () => {
  it('sinh midpoint ẩn + circleCP ẩn + intersection lineCircle hiện', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'K', constraint: { kind: 'perpFoot', from: 'C', onLine: 'AB' } },
      { op: 'add-point', name: 'M', constraint: { kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'CK' } },
    ]);

    // midpoint ẩn của AB
    const mid = dsl.points.find((p) => p.kind === 'midpoint' && p.visible === false);
    expect(mid).toBeDefined();
    expect((mid as any).p1).toBe('A');
    expect((mid as any).p2).toBe('B');

    // circleCP ẩn, center = midpoint, surfacePoint = A
    const circ = dsl.shapes.find((s) => s.kind === 'circleCP' && s.visible === false);
    expect(circ).toBeDefined();
    expect((circ as any).center).toBe(mid!.name);
    expect((circ as any).surfacePoint).toBe('A');

    // M = intersection ref tới line CK và circle, branch 0
    const m = dsl.points.find((p) => p.name === 'M');
    expect(m).toBeDefined();
    expect(m!.kind).toBe('intersection');
    expect((m as any).ref2).toBe(circ!.name);
    expect((m as any).branch).toBe(0);
  });

  it('which:1 → branch 1', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'K', constraint: { kind: 'perpFoot', from: 'C', onLine: 'AB' } },
      { op: 'add-point', name: 'M', constraint: { kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'CK', which: 1 } },
    ]);
    const m = dsl.points.find((p) => p.name === 'M');
    expect((m as any).branch).toBe(1);
  });
});
```

> Nếu file chưa import `intentsToDsl`, thêm `import { intentsToDsl } from '../intentToDsl';` ở đầu (kiểm tra import hiện có trước).

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/intentToDsl.test.ts -t rightAngleViewing`
Expected: FAIL — case chưa xử lý, `m.kind` không phải intersection (hoặc M không tồn tại).

- [ ] **Step 3: Thêm case handler**

Trong `src/stamps/geometry-2d/ai/intentToDsl.ts`, trong `handleAddPoint` switch, thêm sau case `excenter` (trước `}` đóng switch):

```ts
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
```

- [ ] **Step 4: Thêm helper `uniquePointName` (nếu chưa có)**

`uniqueShapeName` đã có (dùng `s.shapeNames`). Điểm dùng `s.pointNames`. Kiểm tra: `rg -n "function uniquePointName" src/stamps/geometry-2d/ai/intentToDsl.ts`. Nếu CHƯA có, thêm cạnh `uniqueShapeName` (sau dòng định nghĩa nó, ~line 178):

```ts
function uniquePointName(s: BuildState, base: string): string {
  if (!s.pointNames.has(base)) return base;
  let i = 2;
  while (s.pointNames.has(`${base}${i}`)) i++;
  return `${base}${i}`;
}
```

- [ ] **Step 5: Chạy test để xác nhận PASS**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/intentToDsl.test.ts -t rightAngleViewing && npm run typecheck`
Expected: 2 test PASS, typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/ai/intentToDsl.ts src/stamps/geometry-2d/ai/__tests__/intentToDsl.test.ts
git commit -m "feat(intentToDsl): handler rightAngleViewing → Thales circle ẩn + giao line∩circle"
```

---

## Task 4: Deterministic completion `completeRightAngle` (Stage 1.5c)

**Files:**
- Create: `src/stamps/geometry-2d/ai/completeRightAngle.ts`
- Test: `src/stamps/geometry-2d/ai/__tests__/completeRightAngle.test.ts`

Phạm vi phrasing hỗ trợ v1 (finite, có test cho mỗi cái):
1. `góc AMB = 90°` / `góc AMB = 90 độ` / `∠AMB = 90°` — vertex = chữ giữa.
2. `góc AMB vuông`.
3. `MA ⊥ MB` / `MA vuông góc MB` / `MA vuông góc với MB` — chữ chung = vertex.
Kèm mệnh đề đường: `M (là (một) điểm) trên|thuộc|nằm trên (đường thẳng|đường cao|đường|cạnh|tia)? <LINE>` với `<LINE>` = 2 chữ hoa hoặc 1 chữ hoa. Không tìm thấy mệnh đề đường → bỏ qua (không complete).

- [ ] **Step 1: Viết test thất bại**

Tạo `src/stamps/geometry-2d/ai/__tests__/completeRightAngle.test.ts`:

```ts
import { completeRightAngle } from '../completeRightAngle';
import type { IntentT } from '../intent';

const base: IntentT[] = [
  { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
  { op: 'add-point', name: 'K', constraint: { kind: 'perpFoot', from: 'C', onLine: 'AB' } },
];

describe('completeRightAngle', () => {
  it('inject khi LLM thiếu M (đề gốc)', () => {
    const problem = 'Cho tam giác nhọn ABC, đường cao CK. Gọi M là một điểm trên CK sao cho góc AMB = 90 độ.';
    const out = completeRightAngle(base, problem);
    const m = out.find((i) => i.op === 'add-point' && i.name === 'M');
    expect(m).toBeDefined();
    expect((m as any).constraint).toEqual({ kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'CK' });
  });

  it('replace khi LLM emit M với constraint sai', () => {
    const problem = 'M trên CK sao cho góc AMB = 90°.';
    const wrong: IntentT[] = [
      ...base,
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'CK' } },
    ];
    const out = completeRightAngle(wrong, problem);
    const ms = out.filter((i) => i.op === 'add-point' && i.name === 'M');
    expect(ms).toHaveLength(1);
    expect((ms[0] as any).constraint.kind).toBe('rightAngleViewing');
  });

  it('keep khi LLM đã đúng rightAngleViewing', () => {
    const problem = 'M trên CK sao cho góc AMB = 90°.';
    const ok: IntentT[] = [
      ...base,
      { op: 'add-point', name: 'M', constraint: { kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'CK' } },
    ];
    const out = completeRightAngle(ok, problem);
    const ms = out.filter((i) => i.op === 'add-point' && i.name === 'M');
    expect(ms).toHaveLength(1);
    expect((ms[0] as any).constraint).toEqual({ kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'CK' });
  });

  it('phrasing "góc AMB vuông"', () => {
    const out = completeRightAngle(base, 'M thuộc đường thẳng CK sao cho góc AMB vuông.');
    const m = out.find((i) => i.op === 'add-point' && i.name === 'M');
    expect((m as any)?.constraint?.kind).toBe('rightAngleViewing');
  });

  it('phrasing "MA ⊥ MB"', () => {
    const out = completeRightAngle(base, 'M nằm trên CK sao cho MA ⊥ MB.');
    const m = out.find((i) => i.op === 'add-point' && i.name === 'M');
    expect((m as any)?.constraint).toMatchObject({ kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'CK' });
  });

  it('phrasing "MA vuông góc với MB"', () => {
    const out = completeRightAngle(base, 'Điểm M trên đường thẳng d sao cho MA vuông góc với MB.');
    const m = out.find((i) => i.op === 'add-point' && i.name === 'M');
    expect((m as any)?.constraint).toMatchObject({ kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'd' });
  });

  it('no-op khi không có mệnh đề đường', () => {
    const out = completeRightAngle(base, 'Tính góc AMB = 90 độ.');
    expect(out.find((i) => i.op === 'add-point' && i.name === 'M')).toBeUndefined();
  });

  it('no-op khi đề không nhắc góc vuông', () => {
    const out = completeRightAngle(base, 'Cho tam giác ABC, M là trung điểm BC.');
    expect(out).toEqual(base);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/completeRightAngle.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Viết module**

Tạo `src/stamps/geometry-2d/ai/completeRightAngle.ts`:

```ts
// src/stamps/geometry-2d/ai/completeRightAngle.ts
//
// Stage 1.5c (deterministic): bắt cấu hình "góc vuông nhìn đoạn" trong đề
// tiếng Việt → đảm bảo có add-point intent với constraint rightAngleViewing.
// LLM thường không nhận ra cần dựng đường tròn đường kính (Thales) để đặt M,
// nên ta inject deterministic. Pure function, idempotent.
//
//   ∠ a-M-b = 90°  (hoặc Ma ⊥ Mb)  +  "M trên <LINE>"
//   → add-point M { kind: 'rightAngleViewing', a, b, onLine: LINE }

import type { IntentT } from './intent';

interface RightAngleSpec {
  vertex: string;
  a: string;
  b: string;
  onLine: string;
}

// ∠AMB = 90° / góc AMB = 90 độ / góc AMB vuông
const ANGLE_EQ_RE = /(?:góc|∠)\s*([A-Z])\s*([A-Z])\s*([A-Z])\s*(?:=|bằng|là)?\s*90\s*(?:°|độ|o\b)/i;
const ANGLE_VUONG_RE = /(?:góc|∠)\s*([A-Z])\s*([A-Z])\s*([A-Z])\s*vuông/i;
// MA ⊥ MB / MA vuông góc (với) MB
const PERP_RE = /([A-Z])([A-Z])\s*(?:⊥|vuông\s*góc(?:\s*với)?)\s*([A-Z])([A-Z])/i;

/** Tìm đường mà điểm `vertex` nằm trên: "M (là (một) điểm) trên|thuộc|nằm trên (đường…)? <LINE>". */
function findOnLine(problem: string, vertex: string): string | null {
  const re = new RegExp(
    `${vertex}\\s*(?:là\\s+(?:một\\s+)?điểm\\s+)?(?:trên|thuộc|nằm\\s+trên)\\s*` +
      `(?:đường\\s*thẳng|đường\\s*cao|đường|cạnh|tia)?\\s*([A-Za-z]{1,2})`,
    'i',
  );
  const m = problem.match(re);
  if (!m) return null;
  return m[1];
}

function detectSpec(problem: string): RightAngleSpec | null {
  // 1. Angle = 90 / vuông: vertex là chữ GIỮA.
  for (const re of [ANGLE_EQ_RE, ANGLE_VUONG_RE]) {
    const m = problem.match(re);
    if (m) {
      const [, a, vertex, b] = m;
      const onLine = findOnLine(problem, vertex);
      if (onLine) return { vertex, a, b, onLine };
    }
  }
  // 2. Perp: chữ chung của 2 cặp là vertex.
  const p = problem.match(PERP_RE);
  if (p) {
    const [, x1, x2, y1, y2] = p;
    // Cặp (x1 x2) và (y1 y2); chữ chung = vertex, 2 chữ còn lại = a,b.
    let vertex: string | null = null;
    let a: string | null = null;
    let b: string | null = null;
    if (x1 === y1) { vertex = x1; a = x2; b = y2; }
    else if (x1 === y2) { vertex = x1; a = x2; b = y1; }
    else if (x2 === y1) { vertex = x2; a = x1; b = y2; }
    else if (x2 === y2) { vertex = x2; a = x1; b = y1; }
    if (vertex && a && b) {
      const onLine = findOnLine(problem, vertex);
      if (onLine) return { vertex, a, b, onLine };
    }
  }
  return null;
}

export function completeRightAngle(
  intents: readonly IntentT[],
  problem: string,
): IntentT[] {
  const spec = detectSpec(problem);
  if (!spec) return [...intents];

  const injected: IntentT = {
    op: 'add-point',
    name: spec.vertex,
    constraint: { kind: 'rightAngleViewing', a: spec.a, b: spec.b, onLine: spec.onLine },
  };

  const idx = intents.findIndex((i) => i.op === 'add-point' && i.name === spec.vertex);
  if (idx === -1) {
    // inject ở cuối (sau khi các điểm phụ thuộc onLine đã được định nghĩa)
    return [...intents, injected];
  }

  const existing = intents[idx];
  if (existing.op === 'add-point' && existing.constraint.kind === 'rightAngleViewing') {
    return [...intents]; // keep
  }
  // replace in place
  const out = [...intents];
  out[idx] = injected;
  return out;
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/completeRightAngle.test.ts && npm run typecheck`
Expected: 8 test PASS, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/completeRightAngle.ts src/stamps/geometry-2d/ai/__tests__/completeRightAngle.test.ts
git commit -m "feat(ai): completeRightAngle — deterministic inject rightAngleViewing (Stage 1.5c)"
```

---

## Task 5: Wire Stage 1.5c vào pipeline

**Files:**
- Modify: `src/stamps/geometry-2d/ai/buildFigureIntent.ts`
- Test: `src/stamps/geometry-2d/ai/__tests__/buildFigureIntent.normalize.test.ts` (append) — kiểm tra wiring qua mock provider nếu có; nếu test này phụ thuộc provider thật thì bỏ qua, dựa e2e Task 8.

- [ ] **Step 1: Wire vào orchestrator**

Trong `src/stamps/geometry-2d/ai/buildFigureIntent.ts`:

Thêm import (cạnh `import { resolveCircleNameCollisions } from './resolveCircleNames';`):

```ts
import { completeRightAngle } from './completeRightAngle';
```

Sửa Stage 1.5b để chèn 1.5c ngay sau (tìm dòng `const processedIntents = resolveCircleNameCollisions(intents);`):

```ts
  // Stage 1.5b: preprocess naming collisions (circle name dùng làm point ref).
  const collisionFixed = resolveCircleNameCollisions(intents);

  // Stage 1.5c: deterministic inject "góc vuông nhìn đoạn" (∠a-M-b = 90°).
  // LLM hay miss insight dựng đường tròn đường kính — inject từ regex đề.
  const processedIntents = completeRightAngle(collisionFixed, problem);
```

- [ ] **Step 2: Typecheck + chạy lại toàn bộ test ai/**

Run: `npm run typecheck && npx jest src/stamps/geometry-2d/ai/`
Expected: typecheck clean; test cũ vẫn xanh (completeRightAngle no-op cho đề không có góc vuông → không đổi hành vi).

- [ ] **Step 3: Commit**

```bash
git add src/stamps/geometry-2d/ai/buildFigureIntent.ts
git commit -m "feat(ai): wire completeRightAngle vào pipeline intent (Stage 1.5c)"
```

---

## Task 6: Prompt — keyword + constraint list + few-shot

**Files:**
- Modify: `src/stamps/geometry-2d/ai/intentPrompt.ts`
- Test: `src/stamps/geometry-2d/ai/__tests__/intentPrompt.test.ts`

- [ ] **Step 1: Viết test thất bại**

Thêm vào `src/stamps/geometry-2d/ai/__tests__/intentPrompt.test.ts`:

```ts
import { buildIntentSystemPrompt } from '../intentPrompt';

describe('prompt — rightAngleViewing', () => {
  const p = buildIntentSystemPrompt();
  it('liệt kê constraint rightAngleViewing', () => {
    expect(p).toContain('rightAngleViewing');
  });
  it('có keyword góc vuông', () => {
    expect(p).toMatch(/90°|90 độ|góc vuông/);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/intentPrompt.test.ts -t rightAngleViewing`
Expected: FAIL — prompt chưa nhắc rightAngleViewing.

- [ ] **Step 3: Cập nhật prompt**

Trong `src/stamps/geometry-2d/ai/intentPrompt.ts`:

(a) Thêm `rightAngleViewing` vào danh sách constraint kinds liệt kê cho add-point (tìm chuỗi chứa `angleBisectorFoot` hoặc `excenter` trong phần liệt kê, thêm `rightAngleViewing`).

(b) Thêm 1 dòng bảng từ khoá (gần các quy tắc Cụm A / constraint nâng cao):

```
- "M trên <đường> sao cho góc AMB = 90°" / "∠AMB = 90°" / "MA ⊥ MB" / "M nhìn AB dưới góc vuông"
  → add-point M { kind: "rightAngleViewing", a: "A", b: "B", onLine: "<đường>" }
  (chữ GIỮA của góc = tên điểm; 2 chữ ngoài = a, b)
```

(c) Thêm few-shot vào `FIXTURES` (theo shape của fixture hiện có — `{ problem, intents }`):

```ts
{
  problem: 'Cho tam giác nhọn ABC, đường cao CK, H là trực tâm. Gọi M là một điểm trên CK sao cho góc AMB = 90°.',
  intents: [
    { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
    { op: 'add-point', name: 'K', constraint: { kind: 'perpFoot', from: 'C', onLine: 'AB' } },
    { op: 'add-point', name: 'H', constraint: { kind: 'orthocenter', of: ['A', 'B', 'C'] } },
    { op: 'connect', from: 'C', to: 'K', style: 'segment' },
    { op: 'add-point', name: 'M', constraint: { kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'CK' } },
  ],
},
{
  problem: 'Cho đoạn AB và đường thẳng d. Điểm M trên d sao cho góc AMB = 90°.',
  intents: [
    { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'D'], variant: 'any' },
    { op: 'add-point', name: 'M', constraint: { kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'd' } },
  ],
},
```

> Kiểm tra shape chính xác của phần tử `FIXTURES` trong file (key `problem`/`intents` hay tên khác) trước khi thêm — match đúng cấu trúc hiện có. Nếu fixture thứ 2 cần `d` là đường có thật, giữ đơn giản: chỉ cần intents minh hoạ constraint; nếu transpile fixture trong test prompt thì đảm bảo d định nghĩa được (có thể đổi sang "đường thẳng AB" cho an toàn — nhưng giữ minh hoạ onLine khác cạnh tam giác là chủ đích).

- [ ] **Step 4: Chạy test để xác nhận PASS + toàn bộ prompt test**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/intentPrompt.test.ts && npm run typecheck`
Expected: PASS. Nếu có snapshot prompt → cập nhật snapshot: `npx jest src/stamps/geometry-2d/ai/__tests__/intentPrompt.test.ts -u`.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/intentPrompt.ts src/stamps/geometry-2d/ai/__tests__/
git commit -m "feat(prompt): keyword + few-shot rightAngleViewing (góc vuông nhìn đoạn)"
```

---

## Task 7: Eval fixtures Tier 4

**Files:**
- Modify: `scripts/eval-intent.ts` (mảng `PROBLEMS`)

- [ ] **Step 1: Thêm 2 fixture**

Trong `scripts/eval-intent.ts`, thêm vào mảng `PROBLEMS`:

```ts
{
  id: 't4-right-angle-altitude',
  tier: 4,
  text: 'Cho tam giác nhọn ABC, đường cao CK, H là trực tâm. Gọi M là một điểm trên CK sao cho góc AMB = 90°.',
  expectedIntents: [
    { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
    { op: 'add-point', name: 'K', constraint: { kind: 'perpFoot', from: 'C', onLine: 'AB' } },
    { op: 'add-point', name: 'H', constraint: { kind: 'orthocenter', of: ['A', 'B', 'C'] } },
    { op: 'connect', from: 'C', to: 'K', style: 'segment' },
    { op: 'add-point', name: 'M', constraint: { kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'CK' } },
  ],
},
{
  id: 't4-right-angle-line',
  tier: 4,
  text: 'Cho đoạn AB và đường thẳng d. Điểm M trên d sao cho góc AMB = 90°.',
  expectedIntents: [
    { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'D'], variant: 'any' },
    { op: 'add-point', name: 'M', constraint: { kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'd' } },
  ],
},
```

> Khớp đúng `interface Problem` (field `tier` kiểu literal — `4` hợp lệ). Nếu `expectedIntents` cần kiểu chính xác, dùng `as const` hoặc cast theo các fixture lân cận.

- [ ] **Step 2: Typecheck script**

Run: `npx tsc --noEmit scripts/eval-intent.ts 2>&1 | head` hoặc `npm run typecheck`
Expected: không lỗi type ở fixture mới.

> Không chạy eval LLM thật ở đây (cần Ollama/Claude). Eval thực hiện thủ công sau: `npx tsx scripts/eval-intent.ts <model>`.

- [ ] **Step 3: Commit**

```bash
git add scripts/eval-intent.ts
git commit -m "test(eval): +2 fixture Tier 4 rightAngleViewing"
```

---

## Task 8: Integration e2e — intent → DSL → transpile bài gốc

**Files:**
- Create: `src/stamps/geometry-2d/ai/__tests__/rightAngle-e2e.test.ts`

- [ ] **Step 1: Viết test**

Tạo `src/stamps/geometry-2d/ai/__tests__/rightAngle-e2e.test.ts`:

```ts
import { intentsToDsl } from '../intentToDsl';
import { completeRightAngle } from '../completeRightAngle';
import { transpile } from '../../dsl';
import type { IntentT } from '../intent';

describe('e2e: góc vuông nhìn đoạn (đề gốc ABC/CK/M)', () => {
  const problem =
    'Cho tam giác nhọn ABC, đường cao CK, H là trực tâm. ' +
    'Gọi M là một điểm trên CK sao cho góc AMB = 90 độ.';

  // Giả lập LLM emit thiếu M → completeRightAngle phải inject
  const llmIntents: IntentT[] = [
    { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
    { op: 'add-point', name: 'K', constraint: { kind: 'perpFoot', from: 'C', onLine: 'AB' } },
    { op: 'add-point', name: 'H', constraint: { kind: 'orthocenter', of: ['A', 'B', 'C'] } },
    { op: 'connect', from: 'C', to: 'K', style: 'segment' },
  ];

  it('inject M + transpile ok, circle ẩn, M là intersection', () => {
    const intents = completeRightAngle(llmIntents, problem);
    const dsl = intentsToDsl(intents);
    const r = transpile(dsl);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const objs = Object.values(r.state.objects);
    // M tồn tại + hiện
    const m = objs.find((o) => o.label === 'M')!;
    expect(m).toBeDefined();
    expect(m.visible).toBe(true);
    expect(m.kind).toBe('point');
    // circle phụ ẩn
    const hiddenCircle = objs.find((o) => o.kind === 'circle' && o.visible === false);
    expect(hiddenCircle).toBeDefined();
  });
});
```

> Chỉnh accessor `r.state.objects` cho khớp `TranspileResult` (giống Task 1 Step 1). `m.kind` ở tầng SceneObject là `'point'` (DSL intersection emit point object).

- [ ] **Step 2: Chạy test**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/rightAngle-e2e.test.ts`
Expected: PASS.

- [ ] **Step 3: Toàn bộ test suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: toàn bộ xanh (suite cũ không regress).

- [ ] **Step 4: Commit**

```bash
git add src/stamps/geometry-2d/ai/__tests__/rightAngle-e2e.test.ts
git commit -m "test(e2e): góc vuông nhìn đoạn đề gốc → DSL → transpile ok"
```

---

## Final review

- [ ] **Deep review cross-file** (per memory `feedback_deep_review_finds_bugs`: plan TDD ≥5 task bắt buộc review layer cuối):
  - `branch` chọn phía: default 0 đúng phía C cho đề gốc? Nếu sai phía, M nằm dưới AB — verify bằng cách đọc toạ độ M sau transpile (acute triangle canonical), điều chỉnh default hoặc note flip `which:1`.
  - `findOnLine` không bắt nhầm chữ trong "ABC" (vd vertex C → "trên CK" vs trùng "C" trong "ABC"): regex anchor vào keyword trên|thuộc nên an toàn; thêm test nếu nghi ngờ.
  - `_mid_`/`_thales_` prefix có lọt vào validator regex của path khác không (chữ hoa liền nhau)? Tên có dấu `_` + chữ thường nên không match `[A-Z]{2,3}` pattern.
- [ ] Cập nhật memory `project_ai_cluster_a_vocab` (hoặc tạo mới) ghi pattern rightAngleViewing đã ship.
- [ ] Eval thủ công (nếu có model): `npx tsx scripts/eval-intent.ts claude-sonnet` / `gemma3:12b` — xác nhận 2 fixture Tier 4 pass.
