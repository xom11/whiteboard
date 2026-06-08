# Layout Disjoint Offset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tách các hình RỜI NHAU (không chia điểm/ref) theo trục ngang để không render chồng tại canonical origin (issue #46 nhóm D, D1, Mức 1).

**Architecture:** Module thuần `layoutDisjointComponents(points, shapes)` chèn vào `intentsToDsl` sau `repairCircleIntersections`. Union-find qua `collectRefs` (registry-driven) → component; chỉ dịch `x` của free point (điểm DUY NHẤT có coord) của component thứ ≥1 sang phải; điểm phái sinh tự tính lại sau transpile. ≤1 component → no-op (đề 1-figure byte-identical).

**Tech Stack:** TypeScript strict, Jest 29 (ts-jest + jsdom), tsx (diag script).

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `src/stamps/geometry-2d/ai/layout/disjointOffset.ts` | NEW — pure `layoutDisjointComponents` (union-find + bbox + pack ngang) |
| `src/stamps/geometry-2d/ai/layout/__tests__/disjointOffset.test.ts` | NEW — unit: grouping, offset math, no-op, midpoint-in-comp, circle bbox |
| `src/stamps/geometry-2d/ai/__tests__/layoutOffset-e2e.test.ts` | NEW — e2e qua `intentsToDsl`: bbox disjoint + 1-comp invariant |
| `src/stamps/geometry-2d/ai/intentToDsl.ts` | MODIFY — import + gọi 1 dòng sau repair |
| `scripts/probes-adversarial.txt` | MODIFY — +probe render-disjoint + giữ escalate-safe |
| `src/stamps/geometry-2d/ai/__tests__/__snapshots__/intentToDsl.golden.test.ts.snap` | UPDATE — ~5-7 snapshot multi-figure (review thủ công) |

---

## Task 1: Module `disjointOffset.ts` + unit tests

**Files:**
- Create: `src/stamps/geometry-2d/ai/layout/disjointOffset.ts`
- Test: `src/stamps/geometry-2d/ai/layout/__tests__/disjointOffset.test.ts`

- [ ] **Step 1: Write the failing unit tests**

Create `src/stamps/geometry-2d/ai/layout/__tests__/disjointOffset.test.ts`:

```ts
// disjointOffset.test.ts
import { layoutDisjointComponents } from '../disjointOffset';
import type { DslPointT, DslShapeT } from '../../../dsl/schema';

const byName = (ps: DslPointT[], n: string) =>
  ps.find((p) => p.name === n) as Extract<DslPointT, { kind: 'free' }>;

describe('layoutDisjointComponents', () => {
  test('2 polygon rời → dịch comp thứ 2 sang phải, x-interval rời', () => {
    const points: DslPointT[] = [
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 5, y: 0 },
      { name: 'C', kind: 'free', x: 2, y: 3 },
      { name: 'D', kind: 'free', x: 0, y: 0 },
      { name: 'E', kind: 'free', x: 4, y: 0 },
      { name: 'F', kind: 'free', x: 4, y: 4 },
      { name: 'G', kind: 'free', x: 0, y: 4 },
    ];
    const shapes: DslShapeT[] = [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
      { name: 'DEFG', kind: 'polygon', vertices: ['D', 'E', 'F', 'G'] },
    ];
    layoutDisjointComponents(points, shapes);
    // anchor ABC giữ nguyên
    expect([byName(points, 'A').x, byName(points, 'A').y]).toEqual([0, 0]);
    expect(byName(points, 'B').x).toBe(5);
    // comp2 DEFG: cursorX = maxX(ABC)=5 + GAP 2 = 7; dx = 7 - minX(0) = 7
    expect([byName(points, 'D').x, byName(points, 'D').y]).toEqual([7, 0]);
    expect(byName(points, 'E').x).toBe(11);
    expect(byName(points, 'G').x).toBe(7);
    // x-interval rời: ABC maxX 5 < DEFG minX 7
    expect(5).toBeLessThan(7);
  });

  test('1 polygon → no-op (byte-identical)', () => {
    const points: DslPointT[] = [
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 5, y: 0 },
      { name: 'C', kind: 'free', x: 2, y: 3 },
    ];
    const shapes: DslShapeT[] = [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }];
    const before = JSON.parse(JSON.stringify(points));
    layoutDisjointComponents(points, shapes);
    expect(points).toEqual(before);
  });

  test('midpoint M của BC → cùng component ABC → no-op (chống false-positive)', () => {
    const points: DslPointT[] = [
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 5, y: 0 },
      { name: 'C', kind: 'free', x: 2, y: 3 },
      { name: 'M', kind: 'midpoint', p1: 'B', p2: 'C' },
    ];
    const shapes: DslShapeT[] = [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }];
    const before = JSON.parse(JSON.stringify(points));
    layoutDisjointComponents(points, shapes);
    expect(points).toEqual(before); // 1 component → không dịch
  });

  test('2 đường tròn circleCR (R=2, R=5) tâm free → bbox circle-aware tách đủ', () => {
    const points: DslPointT[] = [
      { name: 'I', kind: 'free', x: 0, y: 0 },
      { name: 'O', kind: 'free', x: 0, y: 0 },
    ];
    const shapes: DslShapeT[] = [
      { name: 'cI', kind: 'circleCR', center: 'I', radius: 2 },
      { name: 'cO', kind: 'circleCR', center: 'O', radius: 5 },
    ];
    layoutDisjointComponents(points, shapes);
    // anchor I: bbox [-2,2], cursorX = 2 + 2 = 4. comp O: bbox [-5,5], dx = 4 - (-5) = 9.
    expect(byName(points, 'I').x).toBe(0);
    expect(byName(points, 'O').x).toBe(9);
    // khoảng cách tâm 9 > R_I + R_O = 7 → 2 đường tròn KHÔNG chồng
    expect(Math.abs(byName(points, 'O').x - byName(points, 'I').x)).toBeGreaterThan(2 + 5);
  });

  test('0 free point → no-op an toàn', () => {
    const points: DslPointT[] = [];
    const shapes: DslShapeT[] = [];
    expect(() => layoutDisjointComponents(points, shapes)).not.toThrow();
    expect(points).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/stamps/geometry-2d/ai/layout/__tests__/disjointOffset.test.ts`
Expected: FAIL — `Cannot find module '../disjointOffset'`.

- [ ] **Step 3: Write the implementation**

Create `src/stamps/geometry-2d/ai/layout/disjointOffset.ts`:

```ts
// src/stamps/geometry-2d/ai/layout/disjointOffset.ts
//
// Layout pass (issue #46 nhóm D, D1, Mức 1): tách các component RỜI NHAU (không
// chia điểm/ref) theo trục ngang để không render chồng tại canonical origin.
//
// Pure, mutate in place (giống repairCircleIntersections). Chỉ dịch free point
// (kind:'free' — điểm DUY NHẤT có x/y); điểm phái sinh KHÔNG có coord → transpile
// tính lại từ ref đã dịch → tự đúng. Bất biến: ≤1 component → no-op (đề 1-figure
// byte-identical).

import type { DslPointT, DslShapeT } from '../../dsl/schema';
import { collectRefs } from '../../dsl/transpile/refs';

const GAP = 2; // board-unit giữa 2 component liền kề

type FreePoint = Extract<DslPointT, { kind: 'free' }>;
interface Bbox { minX: number; maxX: number; minY: number; maxY: number; }

export function layoutDisjointComponents(points: DslPointT[], shapes: DslShapeT[]): void {
  // --- union-find trên mọi entity name (point + shape) ---
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const r = parent.get(x);
    if (r === undefined) { parent.set(x, x); return x; }
    if (r === x) return x;
    const root = find(r);
    parent.set(x, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  const entities: (DslPointT | DslShapeT)[] = [...points, ...shapes];
  for (const e of entities) {
    find(e.name); // đảm bảo node tồn tại
    for (const ref of collectRefs(e)) union(e.name, ref);
  }

  // --- free point + thứ tự xuất hiện trong mảng points ---
  const freeByName = new Map<string, { p: FreePoint; index: number }>();
  points.forEach((p, i) => {
    if (p.kind === 'free') freeByName.set(p.name, { p, index: i });
  });
  if (freeByName.size === 0) return;

  // --- gom free point theo component root + min free-index ---
  const compFree = new Map<string, { p: FreePoint; index: number }[]>();
  const compMinIndex = new Map<string, number>();
  for (const [name, rec] of freeByName) {
    const root = find(name);
    if (!compFree.has(root)) { compFree.set(root, []); compMinIndex.set(root, rec.index); }
    compFree.get(root)!.push(rec);
    compMinIndex.set(root, Math.min(compMinIndex.get(root)!, rec.index));
  }

  // --- bất biến: ≤1 component có free point → no-op ---
  if (compFree.size <= 1) return;

  // --- thứ tự component theo min free-index (= thứ tự đọc đề) ---
  const roots = [...compFree.keys()].sort(
    (a, b) => compMinIndex.get(a)! - compMinIndex.get(b)!,
  );

  // --- bbox per-component: free-point coords + mở rộng bán kính khi tâm là free ---
  const bboxOf = (root: string): Bbox => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const ext = (x: number, y: number) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    };
    for (const { p } of compFree.get(root)!) ext(p.x, p.y);
    for (const s of shapes) {
      if (find(s.name) !== root) continue;
      if (s.kind === 'circleCR') {
        const c = freeByName.get(s.center);
        if (c) { ext(c.p.x - s.radius, c.p.y - s.radius); ext(c.p.x + s.radius, c.p.y + s.radius); }
      } else if (s.kind === 'circleCP') {
        const c = freeByName.get(s.center);
        const sp = freeByName.get(s.surfacePoint);
        if (c && sp) {
          const r = Math.hypot(c.p.x - sp.p.x, c.p.y - sp.p.y);
          ext(c.p.x - r, c.p.y - r); ext(c.p.x + r, c.p.y + r);
        }
      }
    }
    return { minX, maxX, minY, maxY };
  };

  // --- pack ngang trái→phải (anchor giữ gốc, dx=0) ---
  let cursorX = bboxOf(roots[0]).maxX + GAP;
  for (let i = 1; i < roots.length; i++) {
    const root = roots[i];
    const bb = bboxOf(root);
    const dx = cursorX - bb.minX;
    for (const { p } of compFree.get(root)!) p.x += dx;
    cursorX = bb.maxX + dx + GAP;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/stamps/geometry-2d/ai/layout/__tests__/disjointOffset.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: sạch (no errors).

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/ai/layout/
git commit -m "feat(ai): layout disjoint offset — module thuần + unit test (issue #46 D1)"
```

---

## Task 2: Wire vào `intentsToDsl` + e2e test

**Files:**
- Modify: `src/stamps/geometry-2d/ai/intentToDsl.ts`
- Test: `src/stamps/geometry-2d/ai/__tests__/layoutOffset-e2e.test.ts`

- [ ] **Step 1: Write the failing e2e test**

Create `src/stamps/geometry-2d/ai/__tests__/layoutOffset-e2e.test.ts`:

```ts
// layoutOffset-e2e.test.ts
// e2e: offset chạy bên trong intentsToDsl. Đề ≥2 hình rời → bbox disjoint (số học);
// đề 1 component → coords canonical KHÔNG đổi (bất biến).
import { intentsToDsl } from '../intentToDsl';
import type { IntentT } from '../intent';

const coord = (dsl: ReturnType<typeof intentsToDsl>, n: string) => {
  const p = dsl.points.find((pt) => pt.name === n);
  if (!p || p.kind !== 'free') throw new Error('không phải free point: ' + n);
  return { x: p.x, y: p.y };
};
const bbox = (dsl: ReturnType<typeof intentsToDsl>, ns: string[]) => {
  const cs = ns.map((n) => coord(dsl, n));
  return {
    minX: Math.min(...cs.map((c) => c.x)), maxX: Math.max(...cs.map((c) => c.x)),
    minY: Math.min(...cs.map((c) => c.y)), maxY: Math.max(...cs.map((c) => c.y)),
  };
};

describe('layout disjoint offset — e2e qua intentsToDsl', () => {
  test('tam giác ABC + hình vuông DEFG → bbox x-interval rời', () => {
    const intents = [
      { op: 'draw-shape', shape: 'triangle', variant: 'any', labels: ['A', 'B', 'C'] },
      { op: 'draw-shape', shape: 'square', variant: 'standard', labels: ['D', 'E', 'F', 'G'] },
    ] as unknown as IntentT[];
    const dsl = intentsToDsl(intents);
    const t = bbox(dsl, ['A', 'B', 'C']);
    const s = bbox(dsl, ['D', 'E', 'F', 'G']);
    const xDisjoint = t.maxX < s.minX || s.maxX < t.minX;
    expect(xDisjoint).toBe(true);
  });

  test('1 component (tam giác) → coords canonical KHÔNG đổi', () => {
    const intents = [
      { op: 'draw-shape', shape: 'triangle', variant: 'any', labels: ['A', 'B', 'C'] },
    ] as unknown as IntentT[];
    const dsl = intentsToDsl(intents);
    expect(coord(dsl, 'A')).toEqual({ x: 0, y: 0 });
    expect(coord(dsl, 'B')).toEqual({ x: 5, y: 0 });
    expect(coord(dsl, 'C')).toEqual({ x: 2, y: 3 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/layoutOffset-e2e.test.ts`
Expected: FAIL — test "bbox x-interval rời" fails (`xDisjoint` là `false`: cả 2 hình còn chồng tại origin). Test "1 component" PASS (offset chưa wire, coords vẫn canonical).

- [ ] **Step 3: Wire offset vào intentsToDsl**

Modify `src/stamps/geometry-2d/ai/intentToDsl.ts`:

Thêm import (cạnh các import hiện có):

```ts
import { layoutDisjointComponents } from './layout/disjointOffset';
```

Sửa thân hàm — thêm 1 dòng sau `repairCircleIntersections`, trước `return`:

```ts
  // Geometric repair: đảm bảo circle dùng cho circleIntersection thực sự cắt
  // nhau 2 điểm (dời center auto-inject nếu tiếp xúc/rời nhau).
  repairCircleIntersections(s.points, s.shapes);
  // Layout: tách các component RỜI NHAU theo trục ngang (không chồng origin).
  layoutDisjointComponents(s.points, s.shapes);
  return { version: 1, points: s.points, shapes: s.shapes };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/layoutOffset-e2e.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: sạch.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/ai/intentToDsl.ts src/stamps/geometry-2d/ai/__tests__/layoutOffset-e2e.test.ts
git commit -m "feat(ai): wire layoutDisjointComponents vào intentsToDsl + e2e bbox-disjoint (issue #46 D1)"
```

---

## Task 3: Golden snapshot churn — review + update có kiểm soát

**Files:**
- Update: `src/stamps/geometry-2d/ai/__tests__/__snapshots__/intentToDsl.golden.test.ts.snap`

Sau Task 2, golden test sẽ fail trên các case **multi-component rời**. Đây là churn CHỦ ĐÍCH.

- [ ] **Step 1: Chạy golden test, ghi nhận case nào fail**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/intentToDsl.golden.test.ts`
Expected: FAIL trên ~5-7 case. Đối chiếu danh sách kỳ vọng (multi-component rời ở generated corpus):
- `generated[15]`: "Cho tam giác đều DEF nội tiếp tam giác ABC" (nested — Mức 1 tách rời, chấp nhận)
- `generated[16]`: "Cho tam giác ABC nội tiếp tam giác đều MNP" (nested — chấp nhận)
- `generated[17]`: "Cho hình bình hành ABCD và hình chữ nhật EFGH"
- `generated[18]`: "Cho hình thoi ABCD và hình vuông EFGH"
- `generated[19]`: "Cho tam giác ABC và tam giác DEF. Gọi G là trọng tâm tam giác DEF"
- `generated[21]`: "Cho tam giác ABC. Dựng tam giác DEF. Gọi I là tâm đường tròn nội tiếp…"
- `generated[26]`: "Cho đường tròn tâm I bán kính 2 và đường tròn tâm O bán kính 5"

**GATE:** Nếu fail BẤT KỲ case `curated:*` hoặc case 1-component (midpoint/single-shape) → **DỪNG**, có bug (offset chạm component không nên chạm). Điều tra trước khi update.

- [ ] **Step 2: Review thủ công nội dung từng snapshot đổi**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/intentToDsl.golden.test.ts 2>&1 | head -200`
Với mỗi case fail, đọc diff: xác nhận free point của component thứ 2 đã dịch sang phải (x tăng), component đầu giữ nguyên, derived point KHÔNG có coord (không đổi). Coord mới phải hợp lý (không NaN, không âm-vô-lý).

- [ ] **Step 3: Update snapshot (KHÔNG -u mù — chỉ sau khi review)**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/intentToDsl.golden.test.ts -u`
Expected: PASS, ~5-7 snapshot updated.

- [ ] **Step 4: Xác nhận diff .snap CHỈ chạm multi-figure**

Run:
```bash
git diff --stat src/stamps/geometry-2d/ai/__tests__/__snapshots__/intentToDsl.golden.test.ts.snap
git diff src/stamps/geometry-2d/ai/__tests__/__snapshots__/intentToDsl.golden.test.ts.snap | grep -E '^[+-].*exports\[' 
```
Expected: chỉ các block `generated[15/16/17/18/19/21/26]` đổi (hoặc tập con). KHÔNG có block `curated:*` hay 1-component nào đổi. Nếu có → DỪNG, điều tra.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/__tests__/__snapshots__/intentToDsl.golden.test.ts.snap
git commit -m "test(ai): cập nhật golden multi-figure sau layout offset — 1-figure byte-identical (issue #46 D1)"
```

---

## Task 4: Probes adversarial + diag classification verify

**Files:**
- Modify: `scripts/probes-adversarial.txt`

- [ ] **Step 1: Snapshot diag classification TRƯỚC khi thêm probe**

Run: `npx tsx scripts/diag-deterministic.ts > /tmp/diag-before.txt 2>&1; tail -5 /tmp/diag-before.txt`
Ghi nhận render/escalate count baseline (vd `109/35`).

- [ ] **Step 2: Thêm probe render-disjoint + escalate-safe**

Append vào cuối `scripts/probes-adversarial.txt` (giữ format hiện có — mỗi dòng 1 đề):

```
Cho tam giác ABC. Vẽ hình vuông DEFG.
Cho tam giác ABC và đường tròn tâm O bán kính 3.
```

(Probe 1 = 2 hình rời nhãn khác → render không chồng. Probe 2 = tam giác + đường tròn rời.)

- [ ] **Step 3: Chạy diag SAU, so sánh**

Run: `npx tsx scripts/diag-deterministic.ts > /tmp/diag-after.txt 2>&1; diff /tmp/diag-before.txt /tmp/diag-after.txt`
Expected: 2 probe mới xuất hiện dạng **DET (render)** với OPS `draw-shape/...` ×2 (2 hình). Đề nhập nhằng có sẵn (nếu có) PHẢI giữ ESCALATE — KHÔNG flip vì offset (offset chạy SAU gate, không đụng coverage). Đọc CẢ dòng OPS (không chỉ count).

- [ ] **Step 4: Commit**

```bash
git add scripts/probes-adversarial.txt
git commit -m "test(ai): +probe render-disjoint cho layout offset (issue #46 D1)"
```

---

## Task 5: Full verify + visual + push + đóng mục D1

- [ ] **Step 1: Full test suite**

Run: `npx jest 2>&1 | tail -30`
Expected: tất cả xanh (1 flaky `Whiteboard.unmount` không liên quan — nếu fail, verify isolated: `npx jest Whiteboard`). Tổng test tăng (+7 unit/e2e mới).

- [ ] **Step 2: Typecheck + capability matrix**

Run: `npm run typecheck && npm run check:matrix`
Expected: typecheck sạch; matrix giữ **36** (không thêm kind).

- [ ] **Step 3: Render VISUAL thật (eyeball không chồng)**

Thử 1 trong 2 (xác nhận harness chạy offline):
- Playground (`project_playground_deploy`): `npm start` → :3030, nhập "Cho tam giác ABC. Vẽ hình vuông DEFG." → AI generate → 2 hình rời nhau.
- Hoặc `eval-pdf-visual` harness (`project_ai_pdf_eval_session`) render PNG.

Nếu cả 2 không chạy offline → numerical bbox-disjoint (Task 2 e2e) là guarantee chính; note trong comment.

- [ ] **Step 4: Push**

```bash
git push
git log --oneline -6
```

- [ ] **Step 5: Comment + tick mục D1 trong #46 (bảng tác động trung thực)**

```bash
gh issue comment 46 --body "$(cat <<'EOF'
## ✅ D1 — layout disjoint offset (Mức 1) — `<COMMIT>`

Tách hình RỜI NHAU theo trục ngang (gap=2). Module thuần `ai/layout/disjointOffset.ts` gọi trong `intentsToDsl` sau `repairCircleIntersections`. Union-find qua `collectRefs` (registry-driven); chỉ dịch `x` free point comp ≥1; derived point tự đúng sau transpile.

**Bất biến giữ:** ≤1 component → no-op → đề 1-figure **byte-identical** (verify: golden 1-component + curated KHÔNG đổi).

**Golden churn (chủ đích):** N snapshot multi-figure đổi (gen 15/16/17/18/19/21/26 — review thủ công, coord hợp lý + bbox rời). ~89 snapshot 1-component byte-identical.

**Verify:** typecheck + jest full xanh + check:matrix 36 + e2e assert bbox x-interval disjoint (số học) + diag 2 probe mới render-disjoint, đề nhập nhằng giữ escalate + render visual eyeball không chồng.

**Giới hạn (Mức 1):** hình "nội tiếp" cũng bị tách rời (Mức 2 = metadata mới giữ nested, defer); circle3/đường tròn tâm-phái-sinh overhang nhẹ vào gap.
EOF
)"
```

Tick checkbox "Layout disjoint" trong body #46 (edit body, đổi `- [ ]` → `- [x]` mục đó).

- [ ] **Step 6: Đánh giá D2 dragSync + cân nhắc đóng #46**

D2 dragSync metadata: đọc lại scoping → nhiều khả năng **DEFER tiếp** (chỉ đáng khi thêm glider/drag-sync constraint MỚI; standalone vô giá trị). Note lý do trong comment. Nếu nhóm D = D1 done + D2 defer-có-lý, và A/B/C đã cạn → **cân nhắc đóng #46** (hỏi/standing-auth).

- [ ] **Step 7: Cập nhật memory**

Sửa `project_ai_issue46_symbolic_radius.md` (§nhóm D: D1 done, D2 defer). Nếu D1 đáng tách → tạo `project_ai_layout_offset.md` + hook `MEMORY.md`.

---

## Self-Review

**Spec coverage:**
- Union-find qua collectRefs → Task 1 impl. ✓
- Chỉ dịch free point, derived tự đúng → Task 1 impl + Task 2 e2e invariant. ✓
- ≤1 component no-op (byte-identical) → Task 1 test "1 polygon"/"midpoint", Task 2 "1 component", Task 3 GATE. ✓
- Bbox circle-radius-aware → Task 1 test "2 đường tròn". ✓
- Pack ngang trái→phải gap=2 → Task 1 impl + test "2 polygon". ✓
- Insertion point sau repair → Task 2 Step 3. ✓
- Numerical bbox-disjoint verify → Task 2 e2e. ✓
- Golden churn review thủ công → Task 3. ✓
- diag escalate-safe → Task 4. ✓
- Visual verify → Task 5 Step 3. ✓
- explicitCoords (free point) dịch theo → covered tự động (chỉ free có coord); không cần task riêng. ✓

**Placeholder scan:** `<COMMIT>` trong Task 5 Step 5 là placeholder cố ý (điền commit hash thật lúc chạy). Không placeholder logic nào khác.

**Type consistency:** `layoutDisjointComponents(points: DslPointT[], shapes: DslShapeT[]): void` nhất quán Task 1 (định nghĩa) + Task 2 (call site, mutate in place giống `repairCircleIntersections`). `FreePoint = Extract<DslPointT,{kind:'free'}>` dùng nhất quán. `collectRefs` import từ `../../dsl/transpile/refs` (Task 1). ✓
