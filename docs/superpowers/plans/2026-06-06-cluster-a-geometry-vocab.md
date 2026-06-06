# Cụm A — Vocab hình học (arcMidpoint, reflect, excenter) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép pipeline AI vẽ được 3 construct mới — trung điểm cung (`arcMidpoint`), đối xứng qua điểm/đường (`reflectPoint`/`reflectLine`), tâm bàng tiếp (`excenter`) — từ đề bài tiếng Việt, đi trọn path intent → DSL → render + eval.

**Architecture:** Mỗi construct là 1 point-constraint mới. Toán dựng hình tách thành module thuần (`pointConstructions.ts`) để unit-test không cần JSXGraph; renderer gọi qua function-coordinate points (reactive). `reflect` tái dùng transform engine `transformed` đã có (không sửa renderer). Đi qua 8 layer: `2d-constraint.ts` → `point.ts` (render) → `dsl/schema.ts` + kind modules + `registry.ts` → `intent.ts` → `intentToDsl.ts` → `validator.ts` (extraction + deterministic completion) → `intentPrompt.ts` → fixtures + eval.

**Tech Stack:** TypeScript strict, Zod (schema), JSXGraph (render), Jest + jsdom (test). Provider mặc định Claude Agent SDK (Sonnet 4.6).

**Spec:** `docs/superpowers/specs/2026-06-06-cluster-a-geometry-vocab-design.md`

**Out of scope (plan riêng):** Editor tool dựng tay (tools.tsx/icons.tsx/handlers) — tách plan follow-up. Cụm B (radical/Miquel), Cụm C (Euler/Simson/Mixtilinear). rotate/translate/dilate. tangentLineAt (đã có sẵn).

**Quy ước:** Commit message tiếng Việt, KHÔNG `Co-Authored-By`. Mỗi task chạy `npm test -- <path>` cho test liên quan + commit cuối task.

---

## Task 1: Module toán dựng hình thuần (arcMidpoint + excenter)

**Files:**
- Create: `src/core/scene/kinds/pointConstructions.ts`
- Test: `src/core/scene/kinds/__tests__/pointConstructions.test.ts`

- [ ] **Step 1: Viết test thất bại**

```ts
// src/core/scene/kinds/__tests__/pointConstructions.test.ts
import { arcMidpoint, excenter } from '../pointConstructions';

describe('arcMidpoint', () => {
  // Đường tròn đơn vị tâm (0,0) R=1. A=(1,0), B=(0,1).
  // Cung AB không chứa C=(-1,0)/√2... lấy C = điểm góc 135° = (-0.707,0.707).
  // Trung điểm cung AB nhỏ (không chứa C) ở góc 45° = (0.707, 0.707).
  it('chọn cung KHÔNG chứa notContaining (cung nhỏ)', () => {
    const p = arcMidpoint([0, 0], 1, [1, 0], [0, 1], [-Math.SQRT1_2, Math.SQRT1_2]);
    expect(p[0]).toBeCloseTo(Math.SQRT1_2, 6);
    expect(p[1]).toBeCloseTo(Math.SQRT1_2, 6);
  });

  it('đảo phía notContaining → đảo cung (cung lớn)', () => {
    // notContaining giờ ở (0.707,0.707) (cùng cung 45°) → chọn cung đối diện (225°).
    const p = arcMidpoint([0, 0], 1, [1, 0], [0, 1], [Math.SQRT1_2, Math.SQRT1_2]);
    expect(p[0]).toBeCloseTo(-Math.SQRT1_2, 6);
    expect(p[1]).toBeCloseTo(-Math.SQRT1_2, 6);
  });

  it('AB là đường kính (chord midpoint = tâm): vẫn chọn theo phía', () => {
    // A=(1,0), B=(-1,0), đường kính nằm ngang. notContaining ở trên (y>0)
    // → trung điểm cung dưới (0,-1).
    const p = arcMidpoint([0, 0], 1, [1, 0], [-1, 0], [0, 1]);
    expect(p[0]).toBeCloseTo(0, 6);
    expect(p[1]).toBeCloseTo(-1, 6);
  });
});

describe('excenter', () => {
  // Tam giác vuông A=(0,0), B=(4,0), C=(0,3). a=|BC|=5, b=|CA|=3, c=|AB|=4.
  // Tâm bàng tiếp đối diện A: I_A = (-5A + 3B + 4C)/(-5+3+4)
  //   = ((-0 + 12 + 0)/2, (0 + 0 + 12)/2) = (6, 6).
  it('tâm bàng tiếp đối diện A của tam giác 3-4-5', () => {
    const p = excenter([[0, 0], [4, 0], [0, 3]], 0);
    expect(p[0]).toBeCloseTo(6, 6);
    expect(p[1]).toBeCloseTo(6, 6);
  });

  it('tâm bàng tiếp đối diện B', () => {
    // I_B = (5A - 3B + 4C)/(5-3+4) = ((0-12+0)/6,(0-0+12)/6) = (-2, 2).
    const p = excenter([[0, 0], [4, 0], [0, 3]], 1);
    expect(p[0]).toBeCloseTo(-2, 6);
    expect(p[1]).toBeCloseTo(2, 6);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npm test -- pointConstructions`
Expected: FAIL — "Cannot find module '../pointConstructions'".

- [ ] **Step 3: Viết implementation tối thiểu**

```ts
// src/core/scene/kinds/pointConstructions.ts
//
// Toán dựng hình thuần (không phụ thuộc JSXGraph) cho các point-constraint mới.
// Renderer point.ts gọi qua function-coordinate points để reactive khi user kéo.

export type XY = readonly [number, number];

function dist(p: XY, q: XY): number {
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}

/** Dấu của (B-A) × (P-A): >0 trái, <0 phải, 0 thẳng hàng với AB. */
function sideOf(a: XY, b: XY, p: XY): number {
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
}

/**
 * Trung điểm cung AB của đường tròn (center, radius), nằm ở cung KHÔNG chứa
 * `notContaining`. Trả về toạ độ [x, y].
 *
 * Hai ứng viên = giao của đường thẳng (center → trung điểm dây AB) với đường
 * tròn. Cung không chứa notContaining nằm KHÁC PHÍA dây AB so với notContaining,
 * nên chọn ứng viên có dấu side khác dấu side của notContaining.
 */
export function arcMidpoint(
  center: XY, radius: number, a: XY, b: XY, notContaining: XY,
): XY {
  const mcx = (a[0] + b[0]) / 2;
  const mcy = (a[1] + b[1]) / 2;
  let ux = mcx - center[0];
  let uy = mcy - center[1];
  let len = Math.hypot(ux, uy);
  if (len < 1e-9) {
    // AB là đường kính → hướng từ tâm tới dây suy biến. Dùng pháp tuyến của AB.
    ux = -(b[1] - a[1]);
    uy = b[0] - a[0];
    len = Math.hypot(ux, uy) || 1;
  }
  ux /= len; uy /= len;
  const cand1: XY = [center[0] + radius * ux, center[1] + radius * uy];
  const cand2: XY = [center[0] - radius * ux, center[1] - radius * uy];

  const sN = sideOf(a, b, notContaining);
  if (Math.abs(sN) < 1e-9) {
    // notContaining nằm trên đường AB → side-test suy biến: chọn ứng viên XA notContaining hơn.
    return dist(cand1, notContaining) >= dist(cand2, notContaining) ? cand1 : cand2;
  }
  const s1 = sideOf(a, b, cand1);
  // Khác phía ⇔ tích dấu < 0.
  return s1 * sN < 0 ? cand1 : cand2;
}

/**
 * Tâm bàng tiếp tam giác `vertices` đối diện đỉnh index `oppositeIndex` (0|1|2).
 * Công thức trọng tâm có dấu: trọng số = độ dài cạnh đối mỗi đỉnh, lật dấu ở
 * đỉnh đối diện. I = Σ wᵢ·Vᵢ / Σ wᵢ.
 */
export function excenter(
  vertices: readonly [XY, XY, XY], oppositeIndex: 0 | 1 | 2,
): XY {
  const [A, B, C] = vertices;
  const a = dist(B, C); // cạnh đối A
  const b = dist(C, A); // cạnh đối B
  const c = dist(A, B); // cạnh đối C
  const w: [number, number, number] = [a, b, c];
  w[oppositeIndex] = -w[oppositeIndex];
  const sum = w[0] + w[1] + w[2];
  if (Math.abs(sum) < 1e-9) return A; // tam giác suy biến — fallback
  return [
    (w[0] * A[0] + w[1] * B[0] + w[2] * C[0]) / sum,
    (w[0] * A[1] + w[1] * B[1] + w[2] * C[1]) / sum,
  ];
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npm test -- pointConstructions`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/kinds/pointConstructions.ts src/core/scene/kinds/__tests__/pointConstructions.test.ts
git commit -m "feat(scene): toán dựng hình thuần arcMidpoint + excenter"
```

---

## Task 2: Constraint2D union + constraintRefs2D

**Files:**
- Modify: `src/core/scene/kinds/2d-constraint.ts`
- Test: `src/core/scene/kinds/__tests__/2d-constraint.test.ts` (tạo nếu chưa có)

- [ ] **Step 1: Viết test thất bại**

```ts
// src/core/scene/kinds/__tests__/2d-constraint.test.ts
import { constraintRefs2D, type Constraint2D } from '../2d-constraint';

describe('constraintRefs2D — kind mới', () => {
  it('arcMidpoint trả về circle + a + b + notContaining', () => {
    const c: Constraint2D = {
      kind: 'arcMidpoint', circle: 'kO', a: 'pA', b: 'pB', notContaining: 'pC',
    };
    expect(constraintRefs2D(c)).toEqual(['kO', 'pA', 'pB', 'pC']);
  });

  it('excenter trả về 3 vertices (opposite ⊂ vertices, không thêm)', () => {
    const c: Constraint2D = {
      kind: 'excenter', vertices: ['pA', 'pB', 'pC'], opposite: 'pA',
    };
    expect(constraintRefs2D(c)).toEqual(['pA', 'pB', 'pC']);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npm test -- 2d-constraint`
Expected: FAIL — TypeScript error "kind 'arcMidpoint' không tồn tại trên Constraint2D".

- [ ] **Step 3: Sửa `2d-constraint.ts`**

Thêm 2 variant vào union `Constraint2D` (sau dòng `tangencyPoint`, trước dấu `;` kết thúc union ở dòng 60):

```ts
  // Trung điểm cung AB của đường tròn `circle`, ở cung KHÔNG chứa `notContaining`.
  | { kind: 'arcMidpoint'; circle: string; a: string; b: string; notContaining: string }
  // Tâm bàng tiếp tam giác `vertices` đối diện đỉnh `opposite`.
  | { kind: 'excenter'; vertices: [string, string, string]; opposite: string };
```

(Đổi `;` cuối variant `tangencyPoint` thành không-kết-thúc; variant `excenter` mang dấu `;` đóng union.)

Thêm 2 case vào `constraintRefs2D` (trước `default:`):

```ts
    case 'arcMidpoint': return [c.circle, c.a, c.b, c.notContaining];
    case 'excenter': return [c.vertices[0], c.vertices[1], c.vertices[2]];
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npm test -- 2d-constraint`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/kinds/2d-constraint.ts src/core/scene/kinds/__tests__/2d-constraint.test.ts
git commit -m "feat(scene): Constraint2D thêm arcMidpoint + excenter"
```

---

## Task 3: Renderer point.ts — arcMidpoint (validate / describe / render)

**Files:**
- Modify: `src/core/scene/kinds/point.ts`
- Test: `src/core/scene/kinds/__tests__/point.test.ts` (thêm vào file có sẵn; nếu chưa có, tạo mới với import dưới)

- [ ] **Step 1: Viết test thất bại**

Test phần thuần (`validate`, `describe`) — không cần JSXGraph. Lấy `def` qua registry hoặc export. `point.ts` gọi `registerKind(def)` và không export `def`. Test qua `getKind('point')` từ registry.

```ts
// src/core/scene/kinds/__tests__/point.test.ts (thêm describe mới)
import '../point';
import { getKind } from '../../registry';
import type { SceneObject } from '../../types';

const pointDef = getKind('point')!;
const mkObj = (constraint: unknown): SceneObject =>
  ({ id: 'p1', kind: 'point', label: 'M', visible: true, locked: false,
     layer: 'default', schemaVersion: 1, attrs: { constraint } } as SceneObject);

describe('point arcMidpoint', () => {
  it('validate chấp nhận arcMidpoint đủ field', () => {
    expect(() => pointDef.validate!(mkObj({
      kind: 'arcMidpoint', circle: 'k', a: 'B', b: 'C', notContaining: 'A',
    }).attrs)).not.toThrow();
  });
  it('validate ném khi thiếu field', () => {
    expect(() => pointDef.validate!(mkObj({
      kind: 'arcMidpoint', circle: 'k', a: 'B',
    }).attrs)).toThrow();
  });
  it('describe ra mô tả tiếng Việt', () => {
    const s = { objects: { B: { label: 'B' }, C: { label: 'C' }, A: { label: 'A' } } } as never;
    expect(pointDef.describe!(mkObj({
      kind: 'arcMidpoint', circle: 'k', a: 'B', b: 'C', notContaining: 'A',
    }), s)).toBe('M = trung điểm cung BC (không chứa A)');
  });
});
```

> Kiểm tra trước: `getKind` có export từ `src/core/scene/registry.ts` không. Nếu tên khác (vd `kindRegistry.get`), điều chỉnh import cho khớp — chạy `grep -n "export" src/core/scene/registry.ts`.

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npm test -- core/scene/kinds/__tests__/point`
Expected: FAIL — describe trả về "Điểm M" (chưa có nhánh arcMidpoint).

- [ ] **Step 3: Sửa `point.ts`**

(a) Thêm import đầu file (sau dòng import `2d-constraint`):

```ts
import { arcMidpoint, excenter } from './pointConstructions';
```

(b) Trong `validate`, thêm (sau block `orthocenter`):

```ts
    if (c.kind === 'arcMidpoint') {
      if (!c.circle || !c.a || !c.b || !c.notContaining) {
        throw new Error('point.arcMidpoint: circle, a, b, notContaining bắt buộc');
      }
    }
```

(c) Trong `describe`, thêm (trước `return \`Điểm ${obj.label}\`;` cuối):

```ts
    if (c.kind === 'arcMidpoint') {
      const al = state?.objects[c.a]?.label ?? c.a;
      const bl = state?.objects[c.b]?.label ?? c.b;
      const nl = state?.objects[c.notContaining]?.label ?? c.notContaining;
      return `${obj.label} = trung điểm cung ${al}${bl} (không chứa ${nl})`;
    }
```

(d) Trong `render`, thêm (trước `return board.create('point', [0, 0], opts);` cuối):

```ts
    if (c.kind === 'arcMidpoint') {
      const circle = ctx.resolveRef(c.circle) as any;
      const A = ctx.resolveRef(c.a) as any;
      const B = ctx.resolveRef(c.b) as any;
      const N = ctx.resolveRef(c.notContaining) as any;
      const O = circle.center ?? circle.midpoint ?? circle;
      const am = () => arcMidpoint(
        [O.X(), O.Y()], circle.Radius(),
        [A.X(), A.Y()], [B.X(), B.Y()], [N.X(), N.Y()],
      );
      return board.create('point', [() => am()[0], () => am()[1]], opts);
    }
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npm test -- core/scene/kinds/__tests__/point`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/kinds/point.ts src/core/scene/kinds/__tests__/point.test.ts
git commit -m "feat(scene): render arcMidpoint qua function-coords + side-test"
```

---

## Task 4: Renderer point.ts — excenter

**Files:**
- Modify: `src/core/scene/kinds/point.ts`
- Test: `src/core/scene/kinds/__tests__/point.test.ts`

- [ ] **Step 1: Viết test thất bại**

```ts
// thêm describe mới vào point.test.ts (dùng pointDef/mkObj đã khai báo Task 3)
describe('point excenter', () => {
  it('validate chấp nhận excenter đủ field', () => {
    expect(() => pointDef.validate!(mkObj({
      kind: 'excenter', vertices: ['A', 'B', 'C'], opposite: 'A',
    }).attrs)).not.toThrow();
  });
  it('validate ném khi vertices không phải tuple 3', () => {
    expect(() => pointDef.validate!(mkObj({
      kind: 'excenter', vertices: ['A', 'B'], opposite: 'A',
    }).attrs)).toThrow();
  });
  it('describe ra mô tả tiếng Việt', () => {
    const s = { objects: { A: { label: 'A' }, B: { label: 'B' }, C: { label: 'C' } } } as never;
    expect(pointDef.describe!(mkObj({
      kind: 'excenter', vertices: ['A', 'B', 'C'], opposite: 'A',
    }), s)).toBe('M = tâm bàng tiếp ΔABC đối diện A');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npm test -- core/scene/kinds/__tests__/point`
Expected: FAIL — describe chưa có nhánh excenter.

- [ ] **Step 3: Sửa `point.ts`**

(a) `validate`, thêm:

```ts
    if (c.kind === 'excenter') {
      if (!Array.isArray(c.vertices) || c.vertices.length !== 3) {
        throw new Error('point.excenter: vertices phải là tuple 3 id');
      }
      if (!c.opposite) throw new Error('point.excenter: opposite bắt buộc');
    }
```

(b) `describe`, thêm:

```ts
    if (c.kind === 'excenter') {
      const labels = c.vertices.map((id) => state?.objects[id]?.label ?? id).join('');
      const opp = state?.objects[c.opposite]?.label ?? c.opposite;
      return `${obj.label} = tâm bàng tiếp Δ${labels} đối diện ${opp}`;
    }
```

(c) `render`, thêm (trước fallback cuối):

```ts
    if (c.kind === 'excenter') {
      const a: any = ctx.resolveRef(c.vertices[0]);
      const b: any = ctx.resolveRef(c.vertices[1]);
      const c3: any = ctx.resolveRef(c.vertices[2]);
      const oppIdx = c.vertices.indexOf(c.opposite) as 0 | 1 | 2;
      const idx = (oppIdx < 0 ? 0 : oppIdx) as 0 | 1 | 2;
      const ex = () => excenter(
        [[a.X(), a.Y()], [b.X(), b.Y()], [c3.X(), c3.Y()]], idx,
      );
      return board.create('point', [() => ex()[0], () => ex()[1]], opts);
    }
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npm test -- core/scene/kinds/__tests__/point`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/kinds/point.ts src/core/scene/kinds/__tests__/point.test.ts
git commit -m "feat(scene): render excenter qua function-coords"
```

---

## Task 5: DSL schema — DslPointT 4 variant mới

**Files:**
- Modify: `src/stamps/geometry-2d/dsl/schema.ts:51-67`

- [ ] **Step 1: Sửa `schema.ts`**

Thêm vào union `DslPointT` (sau dòng `tangentPointExt`, dòng 67 — giữ `;` ở variant cuối cùng):

```ts
  // Cụm A
  | { name: Name; kind: 'arcMidpoint'; circle: Name; a: Name; b: Name; notContaining: Name }
  | { name: Name; kind: 'excenter'; vertices: [Name, Name, Name]; opposite: Name }
  | { name: Name; kind: 'reflectPoint'; of: Name; through: Name }
  | { name: Name; kind: 'reflectLine'; of: Name; through: Name };
```

(Đổi `;` cuối variant `tangentPointExt` cho đúng — variant `reflectLine` mang dấu `;` đóng union.)

- [ ] **Step 2: Typecheck (chưa có module nên schema runtime chưa đổi — chỉ type)**

Run: `npm run typecheck`
Expected: PASS (chỉ thêm type, chưa ai dùng — không lỗi).

- [ ] **Step 3: Commit**

```bash
git add src/stamps/geometry-2d/dsl/schema.ts
git commit -m "feat(dsl): DslPointT thêm arcMidpoint/excenter/reflectPoint/reflectLine"
```

---

## Task 6: DSL kind module — arcMidpoint + đăng ký registry

**Files:**
- Create: `src/stamps/geometry-2d/dsl/kinds/points/arcMidpoint.ts`
- Modify: `src/stamps/geometry-2d/dsl/registry.ts`
- Test: `src/stamps/geometry-2d/dsl/kinds/__tests__/arcMidpoint.test.ts`

- [ ] **Step 1: Viết test thất bại**

```ts
// src/stamps/geometry-2d/dsl/kinds/__tests__/arcMidpoint.test.ts
import { arcMidpointModule } from '../points/arcMidpoint';
import type { EmitContext } from '../_types';

const ctx: EmitContext = { resolveId: (n) => `id_${n}`, hintOf: () => 'point', mintAuxId: () => 'aux' };

describe('arcMidpoint kind', () => {
  it('parse valid', () => {
    expect(arcMidpointModule.schema.safeParse({
      name: 'M', kind: 'arcMidpoint', circle: 'O', a: 'B', b: 'C', notContaining: 'A',
    }).success).toBe(true);
  });
  it('collectRefs', () => {
    expect(arcMidpointModule.collectRefs({
      name: 'M', kind: 'arcMidpoint', circle: 'O', a: 'B', b: 'C', notContaining: 'A',
    } as never)).toEqual(['O', 'B', 'C', 'A']);
  });
  it('emit primary point', () => {
    const out = arcMidpointModule.emit({
      name: 'M', kind: 'arcMidpoint', circle: 'O', a: 'B', b: 'C', notContaining: 'A',
    } as never, ctx);
    expect(out[0].object.attrs).toMatchObject({
      constraint: { kind: 'arcMidpoint', circle: 'id_O', a: 'id_B', b: 'id_C', notContaining: 'id_A' },
    });
  });
});
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `npm test -- kinds/__tests__/arcMidpoint`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Tạo module + đăng ký**

```ts
// src/stamps/geometry-2d/dsl/kinds/points/arcMidpoint.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'arcMidpoint' }>;

export const arcMidpointModule = defineModule<'arcMidpoint', Input>({
  kind: 'arcMidpoint',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('arcMidpoint'),
    circle: NameZ,
    a: NameZ,
    b: NameZ,
    notContaining: NameZ,
  }),
  collectRefs: (e) => [e.circle, e.a, e.b, e.notContaining],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(ctx.resolveId(e.name), e.name, {
      kind: 'arcMidpoint',
      circle: ctx.resolveId(e.circle),
      a: ctx.resolveId(e.a),
      b: ctx.resolveId(e.b),
      notContaining: ctx.resolveId(e.notContaining),
    }),
  }],
});
```

Trong `registry.ts`: thêm import (cạnh các import points khác) và entry vào `ALL_MODULES`:

```ts
import { arcMidpointModule } from './kinds/points/arcMidpoint';
```

```ts
  // Cụm A points
  arcMidpointModule,
```

- [ ] **Step 4: Chạy test → PASS**

Run: `npm test -- kinds/__tests__/arcMidpoint`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/kinds/points/arcMidpoint.ts src/stamps/geometry-2d/dsl/registry.ts src/stamps/geometry-2d/dsl/kinds/__tests__/arcMidpoint.test.ts
git commit -m "feat(dsl): kind arcMidpoint + đăng ký registry"
```

---

## Task 7: DSL kind module — excenter + đăng ký

**Files:**
- Create: `src/stamps/geometry-2d/dsl/kinds/points/excenter.ts`
- Modify: `src/stamps/geometry-2d/dsl/registry.ts`
- Test: `src/stamps/geometry-2d/dsl/kinds/__tests__/excenter.test.ts`

- [ ] **Step 1: Viết test thất bại**

```ts
// src/stamps/geometry-2d/dsl/kinds/__tests__/excenter.test.ts
import { excenterModule } from '../points/excenter';
import type { EmitContext } from '../_types';

const ctx: EmitContext = { resolveId: (n) => `id_${n}`, hintOf: () => 'point', mintAuxId: () => 'aux' };

describe('excenter kind', () => {
  it('parse valid', () => {
    expect(excenterModule.schema.safeParse({
      name: 'J', kind: 'excenter', vertices: ['A', 'B', 'C'], opposite: 'A',
    }).success).toBe(true);
  });
  it('rejects vertices length != 3', () => {
    expect(excenterModule.schema.safeParse({
      name: 'J', kind: 'excenter', vertices: ['A', 'B'], opposite: 'A',
    }).success).toBe(false);
  });
  it('collectRefs = vertices', () => {
    expect(excenterModule.collectRefs({
      name: 'J', kind: 'excenter', vertices: ['A', 'B', 'C'], opposite: 'A',
    } as never)).toEqual(['A', 'B', 'C']);
  });
  it('emit primary point', () => {
    const out = excenterModule.emit({
      name: 'J', kind: 'excenter', vertices: ['A', 'B', 'C'], opposite: 'A',
    } as never, ctx);
    expect(out[0].object.attrs).toMatchObject({
      constraint: { kind: 'excenter', vertices: ['id_A', 'id_B', 'id_C'], opposite: 'id_A' },
    });
  });
});
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `npm test -- kinds/__tests__/excenter`
Expected: FAIL.

- [ ] **Step 3: Tạo module + đăng ký**

```ts
// src/stamps/geometry-2d/dsl/kinds/points/excenter.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject, resolveTriangleVertices } from '../_shared';

type Input = Extract<DslPointT, { kind: 'excenter' }>;

export const excenterModule = defineModule<'excenter', Input>({
  kind: 'excenter',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('excenter'),
    vertices: z.tuple([NameZ, NameZ, NameZ]),
    opposite: NameZ,
  }),
  collectRefs: (e) => [...e.vertices],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(ctx.resolveId(e.name), e.name, {
      kind: 'excenter',
      vertices: resolveTriangleVertices(ctx, e.vertices),
      opposite: ctx.resolveId(e.opposite),
    }),
  }],
});
```

`registry.ts`: import + entry:

```ts
import { excenterModule } from './kinds/points/excenter';
```

```ts
  excenterModule,
```

- [ ] **Step 4: Chạy test → PASS**

Run: `npm test -- kinds/__tests__/excenter`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/kinds/points/excenter.ts src/stamps/geometry-2d/dsl/registry.ts src/stamps/geometry-2d/dsl/kinds/__tests__/excenter.test.ts
git commit -m "feat(dsl): kind excenter + đăng ký registry"
```

---

## Task 8: DSL kind modules — reflectPoint + reflectLine (emit `transformed`)

**Files:**
- Create: `src/stamps/geometry-2d/dsl/kinds/points/reflectPoint.ts`
- Create: `src/stamps/geometry-2d/dsl/kinds/points/reflectLine.ts`
- Modify: `src/stamps/geometry-2d/dsl/registry.ts`
- Test: `src/stamps/geometry-2d/dsl/kinds/__tests__/reflect.test.ts`

- [ ] **Step 1: Viết test thất bại**

```ts
// src/stamps/geometry-2d/dsl/kinds/__tests__/reflect.test.ts
import { reflectPointModule } from '../points/reflectPoint';
import { reflectLineModule } from '../points/reflectLine';
import type { EmitContext } from '../_types';

const ctx: EmitContext = { resolveId: (n) => `id_${n}`, hintOf: () => 'point', mintAuxId: () => 'aux' };

describe('reflectPoint kind', () => {
  it('parse + collectRefs', () => {
    expect(reflectPointModule.schema.safeParse({ name: 'Q', kind: 'reflectPoint', of: 'P', through: 'M' }).success).toBe(true);
    expect(reflectPointModule.collectRefs({ name: 'Q', kind: 'reflectPoint', of: 'P', through: 'M' } as never)).toEqual(['P', 'M']);
  });
  it('emit transformed/reflectPoint', () => {
    const out = reflectPointModule.emit({ name: 'Q', kind: 'reflectPoint', of: 'P', through: 'M' } as never, ctx);
    expect(out[0].object.attrs).toMatchObject({
      constraint: { kind: 'transformed', source: 'id_P', transform: { kind: 'reflectPoint', center: 'id_M' } },
    });
  });
});

describe('reflectLine kind', () => {
  it('emit transformed/reflectLine', () => {
    const out = reflectLineModule.emit({ name: 'D', kind: 'reflectLine', of: 'H', through: 'BC' } as never, ctx);
    expect(out[0].object.attrs).toMatchObject({
      constraint: { kind: 'transformed', source: 'id_H', transform: { kind: 'reflectLine', line: 'id_BC' } },
    });
  });
});
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `npm test -- kinds/__tests__/reflect`
Expected: FAIL.

- [ ] **Step 3: Tạo 2 module + đăng ký**

```ts
// src/stamps/geometry-2d/dsl/kinds/points/reflectPoint.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'reflectPoint' }>;

export const reflectPointModule = defineModule<'reflectPoint', Input>({
  kind: 'reflectPoint',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({ name: NameZ, kind: z.literal('reflectPoint'), of: NameZ, through: NameZ }),
  collectRefs: (e) => [e.of, e.through],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(ctx.resolveId(e.name), e.name, {
      kind: 'transformed',
      source: ctx.resolveId(e.of),
      transform: { kind: 'reflectPoint', center: ctx.resolveId(e.through) },
    }),
  }],
});
```

```ts
// src/stamps/geometry-2d/dsl/kinds/points/reflectLine.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'reflectLine' }>;

export const reflectLineModule = defineModule<'reflectLine', Input>({
  kind: 'reflectLine',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({ name: NameZ, kind: z.literal('reflectLine'), of: NameZ, through: NameZ }),
  collectRefs: (e) => [e.of, e.through],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(ctx.resolveId(e.name), e.name, {
      kind: 'transformed',
      source: ctx.resolveId(e.of),
      transform: { kind: 'reflectLine', line: ctx.resolveId(e.through) },
    }),
  }],
});
```

`registry.ts`: import + entries:

```ts
import { reflectPointModule } from './kinds/points/reflectPoint';
import { reflectLineModule } from './kinds/points/reflectLine';
```

```ts
  reflectPointModule, reflectLineModule,
```

- [ ] **Step 4: Chạy test → PASS**

Run: `npm test -- kinds/__tests__/reflect`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/kinds/points/reflectPoint.ts src/stamps/geometry-2d/dsl/kinds/points/reflectLine.ts src/stamps/geometry-2d/dsl/registry.ts src/stamps/geometry-2d/dsl/kinds/__tests__/reflect.test.ts
git commit -m "feat(dsl): kind reflectPoint + reflectLine (emit transformed)"
```

---

## Task 9: Intent schema — 4 constraint mới cho add-point

**Files:**
- Modify: `src/stamps/geometry-2d/ai/intent.ts:110-126`
- Test: `src/stamps/geometry-2d/ai/__tests__/intent.test.ts` (thêm vào / tạo)

- [ ] **Step 1: Viết test thất bại**

```ts
// src/stamps/geometry-2d/ai/__tests__/intent.test.ts (thêm describe)
import { AddPointIntentZ } from '../intent';

describe('add-point constraint Cụm A', () => {
  it('arcMidpoint', () => {
    expect(AddPointIntentZ.safeParse({
      op: 'add-point', name: 'M',
      constraint: { kind: 'arcMidpoint', circle: 'O', a: 'B', b: 'C', notContaining: 'A' },
    }).success).toBe(true);
  });
  it('reflectPoint', () => {
    expect(AddPointIntentZ.safeParse({
      op: 'add-point', name: 'Q', constraint: { kind: 'reflectPoint', of: 'P', through: 'M' },
    }).success).toBe(true);
  });
  it('reflectLine (through cho phép tên line nhiều ký tự)', () => {
    expect(AddPointIntentZ.safeParse({
      op: 'add-point', name: 'D', constraint: { kind: 'reflectLine', of: 'H', through: 'BC' },
    }).success).toBe(true);
  });
  it('excenter', () => {
    expect(AddPointIntentZ.safeParse({
      op: 'add-point', name: 'J', constraint: { kind: 'excenter', of: ['A', 'B', 'C'], opposite: 'A' },
    }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `npm test -- ai/__tests__/intent`
Expected: FAIL — discriminator 'arcMidpoint' không có trong union.

- [ ] **Step 3: Sửa `intent.ts`**

Thêm 4 dòng vào `constraint: z.discriminatedUnion('kind', [...])` (sau dòng `angleBisectorFoot`, dòng 125):

```ts
    // Cụm A
    z.object({ kind: z.literal('arcMidpoint'), circle: LabelZ, a: LabelZ, b: LabelZ, notContaining: LabelZ }),
    z.object({ kind: z.literal('reflectPoint'), of: LabelZ, through: LabelZ }),
    z.object({ kind: z.literal('reflectLine'), of: LabelZ, through: z.string() }),
    z.object({ kind: z.literal('excenter'), of: z.tuple([LabelZ, LabelZ, LabelZ]), opposite: LabelZ }),
```

- [ ] **Step 4: Chạy test → PASS**

Run: `npm test -- ai/__tests__/intent`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/intent.ts src/stamps/geometry-2d/ai/__tests__/intent.test.ts
git commit -m "feat(intent): add-point thêm arcMidpoint/reflect/excenter"
```

---

## Task 10: intentToDsl — map 4 constraint → DSL

**Files:**
- Modify: `src/stamps/geometry-2d/ai/intentToDsl.ts:297-376` (trong `handleAddPoint` switch)
- Test: `src/stamps/geometry-2d/ai/__tests__/intentToDsl.test.ts` (thêm / tạo)

- [ ] **Step 1: Viết test thất bại**

```ts
// src/stamps/geometry-2d/ai/__tests__/intentToDsl.test.ts (thêm describe)
import { intentsToDsl } from '../intentToDsl';
import type { IntentT } from '../intent';

describe('intentsToDsl Cụm A', () => {
  it('arcMidpoint giữ nguyên field', () => {
    const dsl = intentsToDsl([
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'B', 'C'] },
      { op: 'add-point', name: 'M', constraint: { kind: 'arcMidpoint', circle: 'O', a: 'B', b: 'C', notContaining: 'A' } },
    ] as IntentT[]);
    expect(dsl.points.find((p) => p.name === 'M')).toMatchObject({
      kind: 'arcMidpoint', circle: 'O', a: 'B', b: 'C', notContaining: 'A',
    });
  });

  it('reflectLine resolve through thành segment ref', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'H', constraint: { kind: 'orthocenter', of: ['A', 'B', 'C'] } },
      { op: 'add-point', name: 'D', constraint: { kind: 'reflectLine', of: 'H', through: 'BC' } },
    ] as IntentT[]);
    const d = dsl.points.find((p) => p.name === 'D')!;
    expect(d).toMatchObject({ kind: 'reflectLine', of: 'H' });
    // through đã resolve sang tên segment (ensureSegment tạo 'BC')
    expect((d as { through: string }).through).toBe('BC');
    expect(dsl.shapes.some((s) => s.kind === 'segment' && s.name === 'BC')).toBe(true);
  });

  it('excenter giữ vertices + opposite', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'J', constraint: { kind: 'excenter', of: ['A', 'B', 'C'], opposite: 'A' } },
    ] as IntentT[]);
    expect(dsl.points.find((p) => p.name === 'J')).toMatchObject({
      kind: 'excenter', vertices: ['A', 'B', 'C'], opposite: 'A',
    });
  });
});
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `npm test -- ai/__tests__/intentToDsl`
Expected: FAIL — switch chưa xử lý kind mới (point M/D/J không xuất hiện).

- [ ] **Step 3: Sửa `handleAddPoint` trong `intentToDsl.ts`**

Thêm 4 case vào switch (sau case `angleBisectorFoot`, trước `}` đóng switch dòng 376):

```ts
    case 'arcMidpoint':
      addPoint(s, {
        name, kind: 'arcMidpoint',
        circle: c.circle, a: c.a, b: c.b, notContaining: c.notContaining,
      });
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
```

- [ ] **Step 4: Chạy test → PASS**

Run: `npm test -- ai/__tests__/intentToDsl`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/intentToDsl.ts src/stamps/geometry-2d/ai/__tests__/intentToDsl.test.ts
git commit -m "feat(intent): intentToDsl map arcMidpoint/reflect/excenter"
```

---

## Task 11: Validator — extractRequirements + KEYWORD_RULES cho 3 capability

**Files:**
- Modify: `src/stamps/geometry-2d/ai/validator.ts`
- Test: `src/stamps/geometry-2d/ai/__tests__/validator.test.ts` (thêm / tạo)

- [ ] **Step 1: Viết test thất bại**

```ts
// src/stamps/geometry-2d/ai/__tests__/validator.test.ts (thêm describe)
import { extractRequirements } from '../validator';

describe('extractRequirements Cụm A', () => {
  it('trung điểm cung BC không chứa A → arcMidpoint + circumcircle omega', () => {
    const r = extractRequirements('Cho tam giác ABC. M là trung điểm cung BC không chứa A.');
    const m = r.points.find((p) => p.name === 'M');
    expect(m).toMatchObject({
      kind: 'arcMidpoint',
      fields: { circle: 'omega', a: 'B', b: 'C', notContaining: 'A' },
    });
    expect(r.shapes.some((s) => s.name === 'omega' && s.kind === 'circle3')).toBe(true);
  });

  it('tâm bàng tiếp góc A → excenter', () => {
    const r = extractRequirements('Cho tam giác ABC, J là tâm bàng tiếp góc A.');
    expect(r.points.find((p) => p.name === 'J')).toMatchObject({
      kind: 'excenter', fields: { vertices: ['A', 'B', 'C'], opposite: 'A' },
    });
  });

  it('D đối xứng H qua BC → reflectLine + segment BC', () => {
    const r = extractRequirements('Cho tam giác ABC trực tâm H. D đối xứng với H qua BC.');
    expect(r.points.find((p) => p.name === 'D')).toMatchObject({
      kind: 'reflectLine', fields: { of: 'H', through: 'BC' },
    });
    expect(r.shapes.some((s) => s.name === 'BC' && s.kind === 'segment')).toBe(true);
  });

  it('Q đối xứng P qua điểm M → reflectPoint', () => {
    const r = extractRequirements('Q là điểm đối xứng của P qua M.');
    expect(r.points.find((p) => p.name === 'Q')).toMatchObject({
      kind: 'reflectPoint', fields: { of: 'P', through: 'M' },
    });
  });
});
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `npm test -- ai/__tests__/validator`
Expected: FAIL — chưa extract được.

- [ ] **Step 3: Sửa `validator.ts`**

(a) Thêm 2 rule vào `KEYWORD_RULES` (cuối mảng, trước `];` dòng 138). KHÔNG thêm rule cho reflect (ambiguous reflectPoint/reflectLine; dựa deterministic completion thay vì coverage-retry):

```ts
  {
    id: 'arc-midpoint',
    patterns: [/(?:trung\s*điểm|chính\s+giữa)\s+(?:của\s+)?cung/i],
    expectedKind: 'arcMidpoint',
    hint: 'Đề có "trung điểm cung XY (không chứa Z)" → kind:"arcMidpoint" với circle, a, b, notContaining.',
  },
  {
    id: 'excenter',
    patterns: [/(?:tâm\s+)?bàng\s*tiếp/i],
    expectedKind: 'excenter',
    hint: 'Đề có "tâm bàng tiếp góc X" → kind:"excenter" với of:[A,B,C], opposite:X.',
  },
```

(b) Trong `extractRequirements`, thêm block sau khối projection (trước `return { points, shapes, scope };` dòng 647). Dùng `triVertices` đã tính ở đầu hàm:

```ts
  // ----- Cụm A: trung điểm cung -----
  // "M là trung điểm cung BC không chứa A" / "M là điểm chính giữa cung BC không chứa A"
  {
    const m = userPrompt.match(
      /([A-Z])\s+(?:là\s+)?(?:điểm\s+)?(?:trung\s*điểm|chính\s+giữa)\s+(?:của\s+)?cung\s+([A-Z])([A-Z])[^.]*?không\s+chứa\s+([A-Z])/i,
    );
    if (m) {
      const circleName = 'omega';
      if (triVertices && !shapes.some((s) => s.name === circleName)) {
        shapes.push({
          name: circleName, kind: 'circle3',
          fields: { p1: triVertices[0], p2: triVertices[1], p3: triVertices[2] },
        });
      }
      points.push({
        name: up(m[1]), kind: 'arcMidpoint',
        fields: { circle: circleName, a: up(m[2]), b: up(m[3]), notContaining: up(m[4]) },
      });
    }
  }

  // ----- Cụm A: tâm bàng tiếp -----
  // "J là tâm bàng tiếp góc A" / "... ứng với đỉnh A" / "... đối diện A"
  if (triVertices) {
    const m = userPrompt.match(
      /([A-Z])\s+(?:là\s+)?tâm\s+bàng\s*tiếp\s+(?:góc\s+|ứng\s+với\s+(?:đỉnh\s+)?|đối\s+diện\s+(?:đỉnh\s+)?)?([A-Z])/i,
    );
    if (m && triVertices.includes(up(m[2]))) {
      points.push({
        name: up(m[1]), kind: 'excenter',
        fields: { vertices: triVertices, opposite: up(m[2]) },
      });
    }
  }

  // ----- Cụm A: đối xứng qua ĐƯỜNG (2 chữ) -----
  // "D đối xứng (với) H qua BC" / "D là điểm đối xứng của H qua đường thẳng BC"
  {
    const m = userPrompt.match(
      /([A-Z])\s+(?:là\s+)?(?:điểm\s+)?đối\s*xứng\s+(?:của\s+|với\s+)?([A-Z])\s+qua\s+(?:đường\s*thẳng\s+|cạnh\s+|trục\s+)?([A-Z])([A-Z])(?![A-Z])/i,
    );
    if (m) {
      const seg = up(m[3]) + up(m[4]);
      if (!shapes.some((s) => s.name === seg)) {
        shapes.push({ name: seg, kind: 'segment', fields: { p1: up(m[3]), p2: up(m[4]) } });
      }
      points.push({
        name: up(m[1]), kind: 'reflectLine',
        fields: { of: up(m[2]), through: seg },
      });
    }
  }

  // ----- Cụm A: đối xứng qua ĐIỂM (1 chữ) -----
  // "Q đối xứng (của) P qua (điểm) M" — chỉ match khi mục tiêu là 1 chữ (POINT).
  {
    const m = userPrompt.match(
      /([A-Z])\s+(?:là\s+)?(?:điểm\s+)?đối\s*xứng\s+(?:của\s+|với\s+)?([A-Z])\s+qua\s+(?:điểm\s+|trung\s*điểm\s+)?([A-Z])(?![A-Za-z])/i,
    );
    if (m && !points.some((p) => p.name === up(m[1]))) {
      points.push({
        name: up(m[1]), kind: 'reflectPoint',
        fields: { of: up(m[2]), through: up(m[3]) },
      });
    }
  }
```

> Thứ tự quan trọng: block reflect-qua-đường (2 chữ) đặt TRƯỚC reflect-qua-điểm (1 chữ) để "qua BC" không bị match nhầm thành điểm "B". Block 1-chữ có guard `!points.some(... name ...)` để không ghi đè khi 2-chữ đã match.

- [ ] **Step 4: Chạy test → PASS**

Run: `npm test -- ai/__tests__/validator`
Expected: PASS (4 tests). `applyDeterministicCompletion` đã generic — tự inject stub mới (không cần sửa).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/validator.ts src/stamps/geometry-2d/ai/__tests__/validator.test.ts
git commit -m "feat(validator): extract arcMidpoint/excenter/reflect + KEYWORD_RULES"
```

---

## Task 12: intentPrompt — constraint kinds list + doc section + ví dụ

**Files:**
- Modify: `src/stamps/geometry-2d/ai/intentPrompt.ts`
- Test: `src/stamps/geometry-2d/ai/__tests__/intentPrompt.test.ts` (thêm / tạo)

- [ ] **Step 1: Viết test thất bại**

```ts
// src/stamps/geometry-2d/ai/__tests__/intentPrompt.test.ts (thêm describe)
import { buildIntentSystemPrompt } from '../intentPrompt';

describe('intentPrompt Cụm A', () => {
  const p = buildIntentSystemPrompt();
  it('liệt kê constraint kinds mới', () => {
    expect(p).toContain('arcMidpoint');
    expect(p).toContain('reflectPoint');
    expect(p).toContain('reflectLine');
    expect(p).toContain('excenter');
  });
  it('có hướng dẫn cung không chứa + bàng tiếp', () => {
    expect(p).toMatch(/trung điểm cung/i);
    expect(p).toMatch(/bàng tiếp/i);
  });
});
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `npm test -- ai/__tests__/intentPrompt`
Expected: FAIL — prompt chưa chứa các từ này.

- [ ] **Step 3: Sửa `intentPrompt.ts`**

(a) Dòng 261 (`## Constraint kinds (cho add-point)`) — append 4 kind:

```ts
midpoint, perpFoot, centroid, circumcenter, incenter, orthocenter, intersection, onSegment, free, secondIntersection, circleIntersection, tangencyPoint, tangentPoint, angleBisectorFoot, arcMidpoint, reflectPoint, reflectLine, excenter
```

(b) Thêm section mới ngay trước dòng `## Quy ước LINE name` (dòng 290):

```ts
## Cụm A — constraint hình học nâng cao (đặt ĐÚNG field)

- **arcMidpoint** — trung điểm CUNG. Fields: \`circle\` (tên đường tròn), \`a\`, \`b\` (2 đầu cung), \`notContaining\` (đỉnh KHÔNG nằm trên cung đó).
  - Ví dụ: "M là trung điểm cung BC không chứa A của (O)" → \`{kind:"arcMidpoint", circle:"O", a:"B", b:"C", notContaining:"A"}\`.
  - LƯU Ý: phải có draw-circle tạo \`circle\` trước (vd đường tròn ngoại tiếp → spec:"through3", points:[A,B,C]).

- **reflectPoint** — đối xứng qua một ĐIỂM. Fields: \`of\` (điểm gốc), \`through\` (tâm đối xứng, 1 chữ = POINT).
  - Ví dụ: "Q đối xứng P qua trung điểm M" → \`{kind:"reflectPoint", of:"P", through:"M"}\`.

- **reflectLine** — đối xứng qua một ĐƯỜNG. Fields: \`of\` (điểm gốc), \`through\` (đường, 2 chữ = LINE vd "BC").
  - Ví dụ: "D đối xứng H qua BC" → \`{kind:"reflectLine", of:"H", through:"BC"}\`.

- **excenter** — tâm BÀNG tiếp tam giác. Fields: \`of\` ([A,B,C]), \`opposite\` (đỉnh đối diện).
  - Ví dụ: "J là tâm bàng tiếp góc A của tam giác ABC" → \`{kind:"excenter", of:["A","B","C"], opposite:"A"}\`.
  - KHÁC incenter (tâm NỘI tiếp): bàng tiếp nằm NGOÀI tam giác.
```

(c) Thêm 3 ví dụ vào mảng `FIXTURES` (cuối mảng, trước `];` dòng kết FIXTURES ~ dòng cuối mảng, đặt sau các build examples):

```ts
  {
    problem: 'Tam giác ABC nội tiếp (O). M là trung điểm cung BC không chứa A.',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'B', 'C'] },
      { op: 'add-point', name: 'M', constraint: { kind: 'arcMidpoint', circle: 'O', a: 'B', b: 'C', notContaining: 'A' } },
    ],
  },
  {
    problem: 'Tam giác ABC trực tâm H. D là điểm đối xứng của H qua BC.',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'H', constraint: { kind: 'orthocenter', of: ['A', 'B', 'C'] } },
      { op: 'add-point', name: 'D', constraint: { kind: 'reflectLine', of: 'H', through: 'BC' } },
    ],
  },
  {
    problem: 'Tam giác ABC, J là tâm bàng tiếp góc A.',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'J', constraint: { kind: 'excenter', of: ['A', 'B', 'C'], opposite: 'A' } },
    ],
  },
```

- [ ] **Step 4: Chạy test → PASS**

Run: `npm test -- ai/__tests__/intentPrompt`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/intentPrompt.ts src/stamps/geometry-2d/ai/__tests__/intentPrompt.test.ts
git commit -m "feat(prompt): intentPrompt doc + ví dụ Cụm A"
```

---

## Task 13: Fixtures DSL + end-to-end smoke (extraction → intent → DSL → transpile)

**Files:**
- Create: `src/stamps/geometry-2d/dsl/fixtures/arc-midpoint-bc.ts`
- Create: `src/stamps/geometry-2d/dsl/fixtures/reflect-over-bc.ts`
- Create: `src/stamps/geometry-2d/dsl/fixtures/excenter-opposite-a.ts`
- Test: `src/stamps/geometry-2d/ai/__tests__/clusterA-e2e.test.ts`

- [ ] **Step 1: Viết test thất bại (e2e: prompt → DSL → transpile ra SceneObject hợp lệ)**

```ts
// src/stamps/geometry-2d/ai/__tests__/clusterA-e2e.test.ts
import { applyDeterministicCompletion } from '../validator';
import { transpile } from '../../dsl/transpile';
import type { DslInputT } from '../../dsl/schema';
import { DslInput } from '../../dsl/schema';

// Helper: chạy deterministic completion trên DSL rỗng (mô phỏng LLM bỏ sót),
// rồi parse + transpile. Khẳng định kind mới xuất hiện và transpile không throw.
function run(prompt: string, base: DslInputT) {
  const { dsl } = applyDeterministicCompletion(prompt, base);
  const parsed = DslInput.parse(dsl); // schema runtime phải chấp nhận kind mới
  const scene = transpile(parsed);
  return { dsl, scene };
}

const empty: DslInputT = { version: 1, points: [], shapes: [] };

describe('Cụm A end-to-end (completion → schema → transpile)', () => {
  it('arcMidpoint: prompt → DSL có arcMidpoint + circle3, transpile OK', () => {
    const triBase: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 3 },
        { name: 'B', kind: 'free', x: -2, y: 0 },
        { name: 'C', kind: 'free', x: 3, y: 0 },
      ],
      shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
    };
    const { dsl } = run('Cho tam giác ABC. M là trung điểm cung BC không chứa A.', triBase);
    expect(dsl.points.some((p) => p.kind === 'arcMidpoint' && p.name === 'M')).toBe(true);
    expect(dsl.shapes.some((s) => s.kind === 'circle3')).toBe(true);
  });

  it('excenter: prompt → DSL có excenter, transpile OK', () => {
    const triBase: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 4, y: 0 },
        { name: 'C', kind: 'free', x: 0, y: 3 },
      ],
      shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
    };
    const { dsl } = run('Cho tam giác ABC, J là tâm bàng tiếp góc A.', triBase);
    expect(dsl.points.some((p) => p.kind === 'excenter' && p.name === 'J')).toBe(true);
  });

  it('reflectLine: prompt → DSL có reflectLine + segment, transpile OK', () => {
    const base: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 3 },
        { name: 'B', kind: 'free', x: -2, y: 0 },
        { name: 'C', kind: 'free', x: 3, y: 0 },
        { name: 'H', kind: 'orthocenter', vertices: ['A', 'B', 'C'] },
      ],
      shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
    };
    const { dsl } = run('Cho tam giác ABC trực tâm H. D đối xứng với H qua BC.', base);
    expect(dsl.points.some((p) => p.kind === 'reflectLine' && p.name === 'D')).toBe(true);
  });
});
```

> Kiểm tra trước import: `transpile` export từ `src/stamps/geometry-2d/dsl/transpile.ts`? Chạy `grep -n "export" src/stamps/geometry-2d/dsl/transpile.ts src/stamps/geometry-2d/dsl/index.ts`. Nếu entry tên khác (vd `transpileDsl` / qua `index.ts`), sửa import. Nếu `transpile` cần arg khác (vd state seed), dùng chữ ký thực tế.

- [ ] **Step 2: Chạy test → FAIL**

Run: `npm test -- clusterA-e2e`
Expected: FAIL — ban đầu có thể do import sai (sửa theo grep) hoặc transpile chưa nhận kind (đã xong Task 6-8 nên nên PASS phần kind; nếu vẫn fail thì do entrypoint/transpile signature → sửa).

- [ ] **Step 3: Tạo 3 fixture (dùng cho prompt.ts legacy + tư liệu, theo format `{ problem, dsl }`)**

```ts
// src/stamps/geometry-2d/dsl/fixtures/arc-midpoint-bc.ts
import type { DslInputT } from '../schema';
export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Tam giác ABC nội tiếp (O). M là trung điểm cung BC không chứa A.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
      { name: 'M', kind: 'arcMidpoint', circle: 'O', a: 'B', b: 'C', notContaining: 'A' },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
      { name: 'O', kind: 'circle3', p1: 'A', p2: 'B', p3: 'C' },
    ],
  },
};
```

```ts
// src/stamps/geometry-2d/dsl/fixtures/reflect-over-bc.ts
import type { DslInputT } from '../schema';
export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Tam giác ABC trực tâm H. D là điểm đối xứng của H qua BC.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
      { name: 'H', kind: 'orthocenter', vertices: ['A', 'B', 'C'] },
      { name: 'D', kind: 'reflectLine', of: 'H', through: 'BC' },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
      { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
    ],
  },
};
```

```ts
// src/stamps/geometry-2d/dsl/fixtures/excenter-opposite-a.ts
import type { DslInputT } from '../schema';
export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Tam giác ABC, J là tâm bàng tiếp góc A.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 4, y: 0 },
      { name: 'C', kind: 'free', x: 0, y: 3 },
      { name: 'J', kind: 'excenter', vertices: ['A', 'B', 'C'], opposite: 'A' },
    ],
    shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
  },
};
```

- [ ] **Step 4: Chạy test → PASS**

Run: `npm test -- clusterA-e2e`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/fixtures/arc-midpoint-bc.ts src/stamps/geometry-2d/dsl/fixtures/reflect-over-bc.ts src/stamps/geometry-2d/dsl/fixtures/excenter-opposite-a.ts src/stamps/geometry-2d/ai/__tests__/clusterA-e2e.test.ts
git commit -m "feat(fixtures): Cụm A fixtures + e2e smoke completion→transpile"
```

---

## Task 14: Verify toàn bộ — typecheck, full test, eval thủ công, deep review

**Files:** (không tạo mới — verification + review)

- [ ] **Step 1: Typecheck toàn repo**

Run: `npm run typecheck`
Expected: PASS, 0 error. Nếu lỗi `DslPointT`/discriminated-union — kiểm tra schema variant khớp module schema (field names + types).

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: tất cả xanh (bao gồm 1500+ test cũ + test mới Cụm A). Không regression.

- [ ] **Step 3: Eval thủ công với LLM (provider default)**

Chạy intent gen trên 3 đề mẫu dataset (không chặn merge — ghi nhận kind-accuracy):

Run:
```bash
npx tsx scripts/eval-intent.ts gemma3:12b 2>&1 | tail -30
```
Expected: in ra metric; ghi lại kind-accuracy của arcMidpoint/excenter/reflect vào `docs/superpowers/results/2026-06-06-cluster-a-eval.txt`. Nếu LLM map sai → deterministic completion vẫn cứu (đã test ở Task 13). Mục tiêu ≥0.9 (Sonnet 4.6); 12b để tham khảo.

> Nếu Ollama không sẵn, bỏ qua step này và ghi chú "eval LLM defer — pipeline + completion đã pass 100% ở clusterA-e2e".

- [ ] **Step 4: Deep cross-file review (bắt buộc cho plan ≥5 task)**

Dùng skill `superpowers:requesting-code-review` trên toàn diff Cụm A. Tập trung:
- `arcMidpoint` side-test: nhánh suy biến (notContaining trên AB) + AB đường kính có đúng không.
- `reflectLine.through` resolve: ref tới line/segment có tồn tại khi render (resolveRef không null).
- excenter `oppositeIndex` = -1 fallback (opposite không nằm trong vertices) — có warn/handle.
- Type consistency: field names DSL ↔ intent ↔ constraint (vd intent `of` → DSL `vertices` ở excenter).

- [ ] **Step 5: Commit kết quả review (nếu có fix) + ghi memory**

```bash
git add -A
git commit -m "chore(cluster-a): fix sau deep review + ghi eval result"
```

Cập nhật memory `project_ai_variant_normalizer` hoặc tạo memory mới `project_ai_cluster_a_vocab` ghi: 3 kind mới ship, eval kết quả, editor tool còn defer.

---

## Self-Review (đã chạy khi viết plan)

- **Spec coverage:** arcMidpoint (T1,2,3,6,9,10,11,12,13) ✓ · reflect (T5,8,9,10,11,12,13) ✓ · excenter (T1,2,4,7,9,10,11,12,13) ✓ · 3-lớp anti-bias (T11 extraction+rules, T12 prompt, completion generic) ✓ · fixtures+eval (T13,T14) ✓ · TDD+commit mỗi task ✓. **Gap có chủ đích:** editor tool (§7 spec) → plan follow-up riêng; circle3 tiền đề cho arcMidpoint xử lý ở extraction (T11) thay vì intentToDsl.
- **Type consistency:** intent `of`→DSL `vertices` (excenter, T9/T10 nhất quán); `reflectLine.through` intent=`z.string()`, DSL=`Name`, resolve qua `resolveSegmentRef` (T10); constraint `arcMidpoint`/`excenter` field khớp giữa 2d-constraint (T2), schema (T5), module emit (T6/T7), render (T3/T4).
- **Placeholder scan:** không có TBD; mọi step có code/command thực + expected output. 2 chỗ "kiểm tra trước import" (getKind, transpile entry) là verify-rồi-điều-chỉnh, không phải placeholder logic.
