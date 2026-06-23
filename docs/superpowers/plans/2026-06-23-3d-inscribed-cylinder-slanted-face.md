# Phase 6 — Trụ nội/ngoại tiếp mặt nghiêng tứ diện (Câu 73/85) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng khối trụ có một đáy = đường tròn nội/ngoại tiếp MỘT MẶT của tứ diện, trục ⊥ mặt (Câu 73/85).

**Architecture:** Constraint mới `pointAboveFace{base, apex, vertices}` = tâm mặt offset dọc pháp tuyến mặt một đoạn = chiều cao ⊥ đỉnh-đối→mặt ⟹ topCenter của trụ luôn trên trục ⊥ mặt (dù layout tứ diện không-đều). Rule `inscribedRoundSolid` thêm nhánh tetra-face (thay `return []` DEFER). Radius giữ cơ chế `radiusTo` build-time literal (`projectedRadius3d`).

**Tech Stack:** TypeScript strict, Jest 29 (ts-jest), Playwright (e2e), JSXGraph 3D, Zustand scene store.

## Global Constraints

- **0-regression (HARD):** FULL KHÔNG giảm và NONE KHÔNG tăng trên BẤT KỲ dataset nào (`ss-thietdien`, `vuonggoc`, `tron-xoay`). Verify: `npx tsx scripts/diag-all-3d.ts`. Baseline tron-xoay: **35 FULL / 26 PARTIAL / 28 NONE**.
- **MCP visual BẮT BUỘC** (bài học Phase 5b: verify R>0 + e2e-count VACUOUS). `npm run demo` (:5173) + Playwright MCP nhìn hình thật mỗi construct.
- TypeScript strict, không `any` nếu tránh được (verify3d đã dùng `any` cho constraint cast — theo pattern sẵn).
- Constraint mới: 5 site TS-forced (union/refs/math-switch/worldToConstraint-never/+describe string-if) + **verify3d branch THẬT** (string-if, KHÔNG TS-forced → dễ quên → vacuous; PHẢI thêm tay).
- Constraint zod = `z.record(z.unknown())` passthrough (`intent.ts:28`) → KHÔNG sửa zod.
- `intentTopo3d.consumesOf` walk generic constraint object → KHÔNG cần sửa topo.
- Tên synth qua `pickCenter` (O/I/J/K/T ∉ vertices) + `sectionNames` (A/B/…/M/N/P/Q ∉ taken).

---

## File Structure

| File | Trách nhiệm | Thay đổi |
|---|---|---|
| `src/core/scene/kinds/3d-constraint.ts` | Union `Constraint3D` + `constraintRefs` | +arm `pointAboveFace`, +refs case |
| `src/core/scene/kinds/constraint3d-math.ts` | `constraintToWorldInner` + `worldToConstraint` | +math case, +never-arm |
| `src/core/scene/kinds/point3d.ts` | `describe` | +describe string-if |
| `src/stamps/geometry-3d/ai/verify3d.ts` | `verifyFigure3d` | +verify branch THẬT |
| `src/stamps/geometry-3d/ai/intent-builders/addPoint3d.ts` | `REF_FIELDS` | +`'base'` |
| `src/stamps/geometry-3d/ai/rules/inscribedRoundSolid.ts` | rule | thay `return []` (dòng 120-123) bằng nhánh tetra-face |
| `src/core/scene/kinds/__tests__/constraint3d-math.pointAboveFace.test.ts` | unit math | TẠO |
| `src/stamps/geometry-3d/ai/__tests__/verify3d.pointAboveFace.test.ts` | unit verify | TẠO |
| `src/stamps/geometry-3d/ai/rules/__tests__/inscribedRoundSolid.slantedFace.test.ts` | unit rule | TẠO |
| `tests/e2e/geometry-3d-figure.spec.ts` | e2e | +2 test (73/85) |

---

## Task 1: Constraint `pointAboveFace` — math + wiring 5 site

**Files:**
- Modify: `src/core/scene/kinds/3d-constraint.ts:32` (union), `:48` (refs)
- Modify: `src/core/scene/kinds/constraint3d-math.ts:353` (math case, sau faceCircumcenter), `:478` (never-arm)
- Modify: `src/core/scene/kinds/point3d.ts:57` (describe)
- Test: `src/core/scene/kinds/__tests__/constraint3d-math.pointAboveFace.test.ts`

**Interfaces:**
- Produces: `Constraint3D` arm `{ kind: 'pointAboveFace'; base: string; apex: string; vertices: string[] }`. `constraintToWorld(c, state): Vec3` trả `base + h·n` với `n`=pháp tuyến mặt (3 đỉnh đầu `vertices`) hướng về `apex`, `h`=dist(apex, mặt-phẳng).

- [ ] **Step 1: Write the failing test**

Create `src/core/scene/kinds/__tests__/constraint3d-math.pointAboveFace.test.ts`:

```typescript
import type { State, SceneObject } from '../../types';
import { constraintToWorld } from '../constraint3d-math';

function freePt(id: string, x: number, y: number, z: number): SceneObject {
  return {
    id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1,
    attrs: { constraint: { kind: 'free', x, y, z } },
  } as SceneObject;
}
function derivedPt(id: string, constraint: unknown): SceneObject {
  return {
    id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1,
    attrs: { constraint },
  } as SceneObject;
}
function stateOf(pts: SceneObject[]): State {
  const objects: Record<string, SceneObject> = {};
  for (const p of pts) objects[p.id] = p;
  return { objects, order: pts.map((p) => p.id), counter: pts.length, meta: { domain: '3d' } } as unknown as State;
}

describe('pointAboveFace', () => {
  // Mặt BCD nằm trên z=0; đỉnh A ở (1,1,5). base = centroid(BCD) = (1, ~0.33, 0).
  it('topCenter trên trục ⊥ mặt, đúng chiều cao = dist(apex, mặt)', () => {
    const st = stateOf([
      freePt('A', 1, 1, 5),
      freePt('B', 0, 0, 0), freePt('C', 2, 0, 0), freePt('D', 1, 2, 0),
      derivedPt('O', { kind: 'centroid', vertices: ['B', 'C', 'D'] }),
    ]);
    const G = constraintToWorld({ kind: 'centroid', vertices: ['B', 'C', 'D'] } as any, st);
    const w = constraintToWorld({ kind: 'pointAboveFace', base: 'O', apex: 'A', vertices: ['B', 'C', 'D'] } as any, st);
    // Mặt z=0 ⟹ pháp tuyến (0,0,±1); apex z=5 ⟹ h=5. topCenter = (Gx, Gy, 5).
    expect(w[0]).toBeCloseTo(G[0], 9);
    expect(w[1]).toBeCloseTo(G[1], 9);
    expect(w[2]).toBeCloseTo(5, 9);
  });

  it('mặt nghiêng (y=0): apex (1,4,1), base trên mặt → topCenter offset dọc +y một đoạn 4', () => {
    const st = stateOf([
      freePt('A', 1, 4, 1),
      freePt('B', 0, 0, 0), freePt('C', 2, 0, 0), freePt('D', 0, 0, 2),
      derivedPt('O', { kind: 'centroid', vertices: ['B', 'C', 'D'] }),
    ]);
    const G = constraintToWorld({ kind: 'centroid', vertices: ['B', 'C', 'D'] } as any, st);
    const w = constraintToWorld({ kind: 'pointAboveFace', base: 'O', apex: 'A', vertices: ['B', 'C', 'D'] } as any, st);
    // Mặt y=0 ⟹ pháp tuyến (0,±1,0); h = |apex.y| = 4. topCenter = (Gx, 4, Gz).
    expect(w[0]).toBeCloseTo(G[0], 9);
    expect(w[1]).toBeCloseTo(4, 9);
    expect(w[2]).toBeCloseTo(G[2], 9);
  });

  it('suy biến (apex trên mặt, h≈0) → trùng base (hữu hạn)', () => {
    const st = stateOf([
      freePt('A', 5, 0, 0),
      freePt('B', 0, 0, 0), freePt('C', 2, 0, 0), freePt('D', 0, 0, 2),
      derivedPt('O', { kind: 'centroid', vertices: ['B', 'C', 'D'] }),
    ]);
    const G = constraintToWorld({ kind: 'centroid', vertices: ['B', 'C', 'D'] } as any, st);
    const w = constraintToWorld({ kind: 'pointAboveFace', base: 'O', apex: 'A', vertices: ['B', 'C', 'D'] } as any, st);
    expect(w.every((n) => Number.isFinite(n))).toBe(true);
    expect(w[0]).toBeCloseTo(G[0], 9); expect(w[1]).toBeCloseTo(G[1], 9); expect(w[2]).toBeCloseTo(G[2], 9);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --config jest.worktree.config.js src/core/scene/kinds/__tests__/constraint3d-math.pointAboveFace.test.ts`
Expected: FAIL (constraint kind `pointAboveFace` không xử lý → switch rơi default hoặc TS lỗi). Nếu chưa có `jest.worktree.config.js`, dùng `npx jest <path>`.

- [ ] **Step 3a: Thêm union arm + refs** (`src/core/scene/kinds/3d-constraint.ts`)

Đổi dòng 32 (`faceCircumcenter` kết thúc `;`) thành 2 dòng (arm mới nối tiếp):

```typescript
  // Tâm đường tròn ngoại tiếp mặt (tam giác — 3 đỉnh đầu): trong mặt + cách đều đỉnh.
  | { kind: 'faceCircumcenter'; vertices: string[] }
  // Tâm đáy-TRÊN của trụ đứng ⊥ MẶT (tứ diện): tâm mặt `base` offset dọc pháp tuyến mặt
  // (3 đỉnh đầu `vertices`) một đoạn = chiều cao ⊥ từ `apex` (đỉnh đối) tới mặt-phẳng.
  | { kind: 'pointAboveFace'; base: string; apex: string; vertices: string[] };
```

Trong `constraintRefs`, sau dòng 48 (`case 'faceCircumcenter': return [...c.vertices];`):

```typescript
    case 'faceCircumcenter': return [...c.vertices];
    case 'pointAboveFace': return [c.base, c.apex, ...c.vertices];
```

- [ ] **Step 3b: Thêm math case** (`src/core/scene/kinds/constraint3d-math.ts`)

Sau case `faceCircumcenter` (kết thúc dòng 353, trước `case 'intersectionLines'` dòng 354):

```typescript
    case 'pointAboveFace': {
      // Tâm đáy-TRÊN của trụ đứng ⊥ MẶT (tứ diện): tâm mặt + (chiều cao ⊥ đỉnh-đối→mặt)·pháp
      // tuyến ⟹ trục topCenter−base ⊥ mặt dù layout tứ diện không-đều (trục đúng, vành nằm trên mặt).
      const G = getPointWorld(c.base, state);
      const P = c.vertices.map((id) => getPointWorld(id, state));
      if (P.length < 3) return G;
      let n = normalize(cross(sub(P[1], P[0]), sub(P[2], P[0])));
      const S = getPointWorld(c.apex, state);
      if (dot(n, sub(S, P[0])) < 0) n = scale(n, -1); // hướng về đỉnh đối
      const h = dot(sub(S, P[0]), n);                 // chiều cao ⊥ đỉnh→mặt-phẳng
      if (!Number.isFinite(h) || h <= 1e-9) return G; // suy biến → trùng base (hữu hạn)
      return add(G, scale(n, h));
    }
```

Trong `worldToConstraint`, thêm vào nhóm never-arm (sau dòng 478 `case 'faceCircumcenter':`):

```typescript
    case 'faceCircumcenter':
    case 'pointAboveFace':
      return current;
```

- [ ] **Step 3c: Thêm describe** (`src/core/scene/kinds/point3d.ts`)

Sau dòng 57 (`if (c.kind === 'faceCircumcenter') ...`):

```typescript
    if (c.kind === 'faceCircumcenter') return `${obj.label} = tâm ngoại tiếp ${c.vertices.join('')}`;
    if (c.kind === 'pointAboveFace') return `${obj.label} = đỉnh trục trụ ⊥ mặt ${c.vertices.join('')}`;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --config jest.worktree.config.js src/core/scene/kinds/__tests__/constraint3d-math.pointAboveFace.test.ts`
Expected: PASS (3 test).
Run typecheck: `npm run typecheck` → 0 lỗi (5 site exhaustive đủ).

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/kinds/3d-constraint.ts src/core/scene/kinds/constraint3d-math.ts src/core/scene/kinds/point3d.ts src/core/scene/kinds/__tests__/constraint3d-math.pointAboveFace.test.ts
git commit -m "feat(3d): constraint pointAboveFace — tâm đáy-trên trụ ⊥ mặt (offset pháp tuyến = chiều cao đỉnh-đối)"
```

---

## Task 2: verify3d branch THẬT cho `pointAboveFace`

**Files:**
- Modify: `src/stamps/geometry-3d/ai/verify3d.ts:198` (sau block faceCircumcenter)
- Test: `src/stamps/geometry-3d/ai/__tests__/verify3d.pointAboveFace.test.ts`

**Interfaces:**
- Consumes: `verifyFigure3d(state): { ok, issues }` (Task: thêm branch). `planeFrame`, `signedDistance`, `ptWorld` đã có trong file.
- Produces: issue khi (a) `w−base` KHÔNG ∥ pháp tuyến mặt, hoặc (b) `|w−base|` ≠ dist(apex, mặt-phẳng).

- [ ] **Step 1: Write the failing test**

Create `src/stamps/geometry-3d/ai/__tests__/verify3d.pointAboveFace.test.ts`:

```typescript
import type { State, SceneObject } from '../../../../core/scene/types';
import { verifyFigure3d } from '../verify3d';

function freePt(id: string, x: number, y: number, z: number): SceneObject {
  return {
    id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1,
    attrs: { constraint: { kind: 'free', x, y, z } },
  } as SceneObject;
}
function derivedPt(id: string, constraint: unknown): SceneObject {
  return {
    id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1,
    attrs: { constraint },
  } as SceneObject;
}
function stateOf(pts: SceneObject[]): State {
  const objects: Record<string, SceneObject> = {};
  for (const p of pts) objects[p.id] = p;
  return { objects, order: pts.map((p) => p.id), counter: pts.length, meta: { domain: '3d' } } as unknown as State;
}

describe('verify3d pointAboveFace', () => {
  it('pointAboveFace hợp lệ → KHÔNG issue', () => {
    const st = stateOf([
      freePt('A', 1, 1, 5),
      freePt('B', 0, 0, 0), freePt('C', 2, 0, 0), freePt('D', 1, 2, 0),
      derivedPt('O', { kind: 'centroid', vertices: ['B', 'C', 'D'] }),
      derivedPt('T', { kind: 'pointAboveFace', base: 'O', apex: 'A', vertices: ['B', 'C', 'D'] }),
    ]);
    const { issues } = verifyFigure3d(st);
    expect(issues.filter((i) => i.includes('pointAboveFace'))).toEqual([]);
  });

  it('điểm SAI (lệch trục) → báo issue', () => {
    const st = stateOf([
      freePt('A', 1, 1, 5),
      freePt('B', 0, 0, 0), freePt('C', 2, 0, 0), freePt('D', 1, 2, 0),
      derivedPt('O', { kind: 'centroid', vertices: ['B', 'C', 'D'] }),
      // Điểm bịa SAI: free lệch khỏi trục ⊥ mặt — verify branch CHỈ chạy cho kind pointAboveFace,
      // nên dựng 1 point pointAboveFace nhưng so với base SAI (apex nằm trên mặt → h≈0 nhưng đặt free cao).
      // Thay vào: kiểm rằng khi mọi thứ đúng, không issue; lệch trục dùng free khác.
    ]);
    // Sanity: state đúng (chỉ O, không T) → 0 pointAboveFace issue.
    const { issues } = verifyFigure3d(st);
    expect(issues.filter((i) => i.includes('pointAboveFace'))).toEqual([]);
  });
});
```

> Lưu ý: branch verify chỉ chạy cho point kind `pointAboveFace` (toạ độ tính từ constraint, luôn đúng theo math). Test "sai" thật phải tiêm constraint hỏng — không khả thi qua constraintToWorld (nó tự tính đúng). Test xác nhận **branch chạy, không vacuous-pass false-positive** + đúng-không-báo. (MCP visual ở Task 4 là cổng thật cho hình lệch.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --config jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/verify3d.pointAboveFace.test.ts`
Expected: PASS thực ra (branch chưa có ⟹ 0 issue ⟹ test pass giả). **Để test có ý nghĩa**, trước tiên xác nhận branch tồn tại bằng cách thêm assertion gọi internal — bỏ qua: chuyển trọng tâm sang Step 3 thêm branch, rồi Step 4 chạy lại đảm bảo vẫn 0 issue (không regress) + branch reachable (thêm 1 test tiêm constraint lệch).

- [ ] **Step 3: Thêm verify branch** (`src/stamps/geometry-3d/ai/verify3d.ts`, sau block `faceCircumcenter` kết thúc dòng 198)

```typescript
    // Kiểm pointAboveFace: w−base ∥ pháp tuyến mặt (trên trục ⊥ mặt) + |w−base| = dist(apex, mặt-phẳng)
    if (c.kind === 'pointAboveFace') {
      try {
        const G = ptWorld(state, c.base);
        const P = (c.vertices as string[]).map((id) => ptWorld(state, id));
        const S = ptWorld(state, c.apex);
        if (P.length >= 3) {
          const f = planeFrame(P[0], P[1], P[2]);
          const d: Vec3 = [w[0] - G[0], w[1] - G[1], w[2] - G[2]];
          const cx: Vec3 = [
            d[1] * f.normal[2] - d[2] * f.normal[1],
            d[2] * f.normal[0] - d[0] * f.normal[2],
            d[0] * f.normal[1] - d[1] * f.normal[0],
          ];
          const dlen = Math.hypot(d[0], d[1], d[2]);
          if (Math.hypot(cx[0], cx[1], cx[2]) > 1e-6 * Math.max(1, dlen)) {
            issues.push(`${obj.label || obj.id}: pointAboveFace không trên trục ⊥ mặt`);
          }
          const hExp = Math.abs(signedDistance(S, f));
          if (Math.abs(dlen - hExp) > 1e-6 * Math.max(1, hExp)) {
            issues.push(`${obj.label || obj.id}: pointAboveFace sai chiều cao`);
          }
        }
      } catch (e) {
        issues.push(`${obj.label || obj.id}: pointAboveFace check lỗi — ${(e as Error).message}`);
      }
    }
```

- [ ] **Step 3b: Thêm test tiêm-lệch để chứng minh branch reachable**

Thay test thứ 2 trong file Task 2 bằng (tiêm 1 point free đóng vai "pointAboveFace" qua cast, nhưng vì constraintToWorld tự tính đúng nên thay bằng kiểm reachable qua check chiều-cao với apex degenerate). Đơn giản hơn — kiểm rằng đề apex trùng mặt (h=0, fallback base) vẫn KHÔNG báo "sai chiều cao" (vì w=base ⟹ dlen=0=hExp):

```typescript
  it('apex trên mặt (h≈0) → w=base, KHÔNG báo sai chiều cao', () => {
    const st = stateOf([
      freePt('A', 5, 0, 0),
      freePt('B', 0, 0, 0), freePt('C', 2, 0, 0), freePt('D', 0, 0, 2),
      derivedPt('O', { kind: 'centroid', vertices: ['B', 'C', 'D'] }),
      derivedPt('T', { kind: 'pointAboveFace', base: 'O', apex: 'A', vertices: ['B', 'C', 'D'] }),
    ]);
    const { issues } = verifyFigure3d(st);
    expect(issues.filter((i) => i.includes('pointAboveFace'))).toEqual([]);
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --config jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/verify3d.pointAboveFace.test.ts`
Expected: PASS.
Run: `npm run typecheck` → 0 lỗi.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/verify3d.ts src/stamps/geometry-3d/ai/__tests__/verify3d.pointAboveFace.test.ts
git commit -m "test(3d): verify3d branch THẬT cho pointAboveFace (trên trục ⊥ mặt + đúng chiều cao)"
```

---

## Task 3: Rule `inscribedRoundSolid` nhánh tetra-face + REF_FIELDS

**Files:**
- Modify: `src/stamps/geometry-3d/ai/intent-builders/addPoint3d.ts:7-10` (REF_FIELDS +`'base'`)
- Modify: `src/stamps/geometry-3d/ai/rules/inscribedRoundSolid.ts` (thêm `TETRA` const + thay `return []` dòng 120-123)
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/inscribedRoundSolid.slantedFace.test.ts`

**Interfaces:**
- Consumes: `buildCircleBase(faceVerts, circum, taken): { centerName, radiusTo, intents }` (đã có trong file, dòng 20-33). `cylinderIntent`, `addPoint3d`, `splitVertexToken`, `pickCenter` (từ `_shared`).
- Produces: với đề trụ nội/ngoại tiếp mặt tứ diện → intents `[centroid|faceCircumcenter, (midpoint nếu incircle), pointAboveFace(topCenter), cylinder{baseCenter, topCenter, radiusTo}]`, KHÔNG emit solid (solidRule vẽ tứ diện).

- [ ] **Step 1: Write the failing test**

Create `src/stamps/geometry-3d/ai/rules/__tests__/inscribedRoundSolid.slantedFace.test.ts`:

```typescript
import { inscribedRoundSolidRule } from '../inscribedRoundSolid';
import { runRules3D } from '../../deterministic/runDeterministicIntents3d';
import type { RuleContext3D } from '../_types';

// Helper dựng ctx từ đề (mirror cách test khác trong thư mục dùng — segment theo câu).
function ctxOf(problem: string): RuleContext3D {
  const clauses = problem
    .split(/(?<=[.])\s+/u)
    .map((text, i) => ({ id: i, text }))
    .filter((c) => c.text.trim().length > 0);
  return { problem, clauses } as RuleContext3D;
}

describe('inscribedRoundSolid — trụ trên mặt nghiêng tứ diện', () => {
  it('Câu 73: trụ đáy NỘI TIẾP tam giác BCD (tứ diện đều) → centroid + midpoint + pointAboveFace + cylinder', () => {
    const ctx = ctxOf(
      'Cho tứ diện đều ABCD có cạnh bằng 4. Diện tích xung quanh của hình trụ có một đường tròn đáy là đường tròn nội tiếp tam giác BCD và chiều cao bằng chiều cao của tứ diện ABCD.',
    );
    const matches = inscribedRoundSolidRule.match(ctx);
    expect(matches.length).toBe(1);
    const ops = matches[0].intents.map((i: any) => i.op);
    expect(ops).toContain('cylinder');
    const kinds = matches[0].intents.filter((i: any) => i.op === 'add-point-3d').map((i: any) => i.constraint.kind);
    expect(kinds).toContain('centroid');         // tâm incircle mặt đều ≡ centroid
    expect(kinds).toContain('midpoint');          // radiusTo = trung điểm cạnh
    expect(kinds).toContain('pointAboveFace');    // topCenter ⊥ mặt
    // KHÔNG emit solid (solidRule vẽ tứ diện)
    expect(matches[0].intents.some((i: any) => i.op === 'solid')).toBe(false);
    const cyl = matches[0].intents.find((i: any) => i.op === 'cylinder');
    expect(cyl.radiusTo).toBeTruthy();
  });

  it('Câu 85: trụ đáy NGOẠI TIẾP tam giác BCD → faceCircumcenter + pointAboveFace + cylinder', () => {
    const ctx = ctxOf(
      'Cho tứ diện đều ABCD có cạnh bằng a. Diện tích xung quanh của hình trụ có đáy là đường tròn ngoại tiếp tam giác BCD và có chiều cao bằng chiều cao của tứ diện.',
    );
    const matches = inscribedRoundSolidRule.match(ctx);
    expect(matches.length).toBe(1);
    const kinds = matches[0].intents.filter((i: any) => i.op === 'add-point-3d').map((i: any) => i.constraint.kind);
    expect(kinds).toContain('faceCircumcenter');
    expect(kinds).toContain('pointAboveFace');
    const cyl = matches[0].intents.find((i: any) => i.op === 'cylinder');
    expect(cyl.radiusTo).toBeTruthy();
  });

  it('co-fire: đúng 1 tứ diện vẽ (solidRule + rule KHÔNG dup solid)', () => {
    const problem = 'Cho tứ diện đều ABCD có cạnh bằng 4. Diện tích xung quanh của hình trụ có một đường tròn đáy là đường tròn nội tiếp tam giác BCD và chiều cao bằng chiều cao của tứ diện ABCD.';
    const intents = runRules3D(problem);
    const solids = intents.filter((i: any) => i.op === 'solid');
    expect(solids.length).toBe(1);
  });
});
```

> **Lưu ý:** kiểm chữ ký `runRules3D(problem)` — nếu API là `runRules3D(ctx)` hoặc trả `{intents}`, chỉnh test cho khớp (đọc `runDeterministicIntents3d.ts` export). Mục tiêu: đúng 1 solid sau khi nối mọi rule match.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --config jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/inscribedRoundSolid.slantedFace.test.ts`
Expected: FAIL — `matches.length` = 0 (nhánh tetra-face hiện `return []`).

- [ ] **Step 3a: REF_FIELDS +`'base'`** (`src/stamps/geometry-3d/ai/intent-builders/addPoint3d.ts:7-10`)

```typescript
const REF_FIELDS = new Set([
  'p1', 'p2', 'from', 'plane', 'a', 'b', 'a1', 'b1', 'a2', 'b2',
  'lineId', 'planeId', 'polygonId', 'sphereId', 'apex', 'base',
]);
```

- [ ] **Step 3b: Thêm `TETRA` const + nhánh tetra-face** (`src/stamps/geometry-3d/ai/rules/inscribedRoundSolid.ts`)

Thêm const cạnh các regex đầu file (sau dòng 16 `HEAD`):

```typescript
const TETRA = /tứ\s+diện(?:\s+đều)?\s+([A-Z]{4})/u; // tứ diện ABCD → 4 đỉnh (mirror solid.ts)
```

Thay block DEFER (dòng 120-123, từ comment `// DEFER trụ trên mặt NGHIÊNG…` tới `return [];`) bằng:

```typescript
    // ── Trụ trên MẶT NGHIÊNG tứ diện (Câu 73/85): trục ⊥ mặt qua pointAboveFace (offset tâm mặt
    // dọc pháp tuyến = chiều cao ⊥ đỉnh-đối→mặt). KHÔNG đổi layout → trục ĐÚNG dù tứ diện không-đều.
    const tetraM = TETRA.exec(ctx.problem);
    if (tetraM) {
      const tetra = splitVertexToken(tetraM[1]); // 4 đỉnh tứ diện
      if (tetra.length < 4) return [];
      const faceM = FACE.exec(c.text);
      if (!faceM) return [];
      const faceVerts = splitVertexToken(faceM[1]);
      if (faceVerts.length < 3) return [];
      if (!circum && !REGULAR.test(ctx.problem)) return []; // incircle mặt không-đều → defer faceIncenter
      const apex = tetra.find((v) => !faceVerts.includes(v)); // đỉnh ĐỐI diện mặt
      if (!apex) return [];
      // solidRule (TETRA) vẽ tứ diện → chỉ reference đỉnh (không emit solid → tránh dup).
      const base = buildCircleBase(faceVerts, circum, [apex]);
      const topName = pickCenter([...faceVerts, apex, base.centerName, base.radiusTo]);
      const intents: Intent3DT[] = [
        ...base.intents,
        addPoint3d(topName, { kind: 'pointAboveFace', base: base.centerName, apex, vertices: faceVerts }),
        cylinderIntent({ baseCenter: base.centerName, topCenter: topName, radiusTo: base.radiusTo }),
      ];
      return [{ ruleId: this.id, clauseIds: [c.id], intents }];
    }
    return [];
```

> Cập nhật comment header rule (dòng 56-57) bỏ "Defer trụ trên mặt NGHIÊNG" → "Hỗ trợ trụ trên mặt nghiêng tứ diện qua pointAboveFace (Câu 73/85). Defer nón XIÊN 88c."

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --config jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/inscribedRoundSolid.slantedFace.test.ts`
Expected: PASS (3 test).
Run cả 2 test cũ của rule (regression): `npx jest --config jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/inscribedRoundSolid` → PASS.
Run: `npm run typecheck` → 0 lỗi.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/intent-builders/addPoint3d.ts src/stamps/geometry-3d/ai/rules/inscribedRoundSolid.ts src/stamps/geometry-3d/ai/rules/__tests__/inscribedRoundSolid.slantedFace.test.ts
git commit -m "feat(3d): rule inscribedRoundSolid nhánh tetra-face — trụ nội/ngoại tiếp mặt nghiêng tứ diện (73/85)"
```

---

## Task 4: e2e Playwright (73/85) + diag 0-regression + MCP visual GATE

**Files:**
- Modify: `tests/e2e/geometry-3d-figure.spec.ts` (thêm 2 test sau test Câu 75, ~dòng 425)

**Interfaces:**
- Consumes: pattern e2e sẵn (`ai-generate-3d-input` fill → `ai-generate-3d-btn` click → `waitForFunction` đếm `polygon3d`/`cylinder3d`). Trụ faceted ≥8 polygon3d + tứ diện 4 polygon3d → ≥12.

- [ ] **Step 1: Toàn bộ jest 3D xanh + diag baseline**

Run: `npx jest --config jest.worktree.config.js src/stamps/geometry-3d src/core/scene/kinds` → PASS.
Run: `npx tsx scripts/diag-all-3d.ts` → ghi lại FULL/PARTIAL/NONE 3 dataset.
Expected: `ss-thietdien` + `vuonggoc` KHÔNG đổi (FULL ≥ baseline, NONE ≤ baseline). `tron-xoay`: FULL ≥ 35, NONE ≤ 28 (73/85 cải thiện hoặc giữ).

- [ ] **Step 2: Thêm 2 e2e test** (`tests/e2e/geometry-3d-figure.spec.ts`, sau test Câu 75)

```typescript
// Trụ nội tiếp mặt nghiêng tứ diện (Câu 73, trục ⊥ MẶT): tứ diện 4 mặt + trụ faceted ≥8 → ≥12 polygon3d.
test('renders an inscribed cylinder on a slanted tetra face (nội tiếp BCD)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await expect(page.locator('[data-testid="dropdown-menu-button"]').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('[data-testid="dropdown-menu-button"]').first().click();
  await page.locator('[data-testid="stamp-toolbar-geometry3d"]').click();
  await expect(page.locator('[data-testid="mini-board-3d"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => !!(window as any).JXG, undefined, { timeout: 10_000 });
  await page.locator('[data-testid="ai-generate-3d-input"]').fill(
    'Cho tứ diện đều ABCD có cạnh bằng 4. Diện tích xung quanh của hình trụ có một đường tròn đáy là đường tròn nội tiếp tam giác BCD và chiều cao bằng chiều cao của tứ diện ABCD.',
  );
  await page.locator('[data-testid="ai-generate-3d-btn"]').click();
  await page.waitForFunction(() => {
    const JXG = (window as any).JXG;
    if (!JXG?.boards) return false;
    for (const b of Object.values(JXG.boards) as any[]) {
      const polys = Object.values(b.objects).filter((o: any) => o.elType === 'polygon3d');
      if (polys.length >= 12) return true; // tứ diện 4 + trụ faceted ≥8
    }
    return false;
  }, undefined, { timeout: 8_000 });
  expect(errors.join('\n')).not.toMatch(/cylinder3d|polygon3d|Cannot read|undefined is not/i);
});

// Trụ ngoại tiếp mặt nghiêng tứ diện (Câu 85): tứ diện 4 mặt + trụ faceted ≥8 → ≥12 polygon3d.
test('renders an inscribed cylinder on a slanted tetra face (ngoại tiếp BCD)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await expect(page.locator('[data-testid="dropdown-menu-button"]').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('[data-testid="dropdown-menu-button"]').first().click();
  await page.locator('[data-testid="stamp-toolbar-geometry3d"]').click();
  await expect(page.locator('[data-testid="mini-board-3d"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => !!(window as any).JXG, undefined, { timeout: 10_000 });
  await page.locator('[data-testid="ai-generate-3d-input"]').fill(
    'Cho tứ diện đều ABCD có cạnh bằng a. Diện tích xung quanh của hình trụ có đáy là đường tròn ngoại tiếp tam giác BCD và có chiều cao bằng chiều cao của tứ diện.',
  );
  await page.locator('[data-testid="ai-generate-3d-btn"]').click();
  await page.waitForFunction(() => {
    const JXG = (window as any).JXG;
    if (!JXG?.boards) return false;
    for (const b of Object.values(JXG.boards) as any[]) {
      const polys = Object.values(b.objects).filter((o: any) => o.elType === 'polygon3d');
      if (polys.length >= 12) return true;
    }
    return false;
  }, undefined, { timeout: 8_000 });
  expect(errors.join('\n')).not.toMatch(/cylinder3d|polygon3d|Cannot read|undefined is not/i);
});
```

- [ ] **Step 3: Run e2e**

Run: `npx playwright test geometry-3d-figure --grep "slanted tetra face"`
Expected: 2 PASS. (Nếu vite cũ chiếm cổng → kill + chạy từ worktree, xem memory `feedback_verify_worktree_stale_server`.)

- [ ] **Step 4: MCP visual GATE (BẮT BUỘC — verify số học VACUOUS)**

Run `npm run demo` (background, :5173). Dùng Playwright MCP:
1. `browser_navigate` → `http://localhost:5173`
2. Mở editor 3D (dropdown → geometry3d stamp).
3. Nhập đề Câu 73 → generate. **Screenshot.** NHÌN HÌNH THẬT: trụ đứng ⊥ mặt BCD, vành đáy NẰM TRÊN mặt BCD, KHÔNG nghiêng lệch, KHÔNG thò ngang khỏi tứ diện.
4. Lặp đề Câu 85 (ngoại tiếp). Screenshot + nhìn.
5. Trích toạ độ JXG (`browser_evaluate`): tính `(topCenter − baseCenter) · (C−B)` và `· (D−B)` ≈ 0 (trục ⊥ 2 vector cạnh mặt). Nếu lệch → **STOP, debug** (KHÔNG commit).

- [ ] **Step 5: Commit (chỉ khi MCP visual PASS)**

```bash
git add tests/e2e/geometry-3d-figure.spec.ts
git commit -m "test(3d): e2e + MCP render-verify trụ nội/ngoại tiếp mặt nghiêng tứ diện (73/85, trục ⊥ mặt)"
```

---

## Task 5: Full suite + docs/memory update

**Files:**
- Modify: `docs/superpowers/plans/2026-06-23-3d-inscribed-cylinder-slanted-face.md` (tick checkbox)
- Modify: memory `project_ai_3d_v2_pipeline.md` + `MEMORY.md` pointer
- Modify: `CLAUDE.md` gotchas (nếu bug-class mới)

- [ ] **Step 1: Full jest + typecheck**

Run: `npm run typecheck` → 0 lỗi.
Run: `npx jest --config jest.worktree.config.js` (toàn bộ) → 0 regression (≥ 3499 test baseline Phase 5b + test mới).

- [ ] **Step 2: diag-all-3d cuối + ghi số thật**

Run: `npx tsx scripts/diag-all-3d.ts`
Ghi FULL/PARTIAL/NONE 3 dataset vào memory. Xác nhận hard-rule 0-regression. **Honest metric:** 73/85 là MC tính-giá-trị → có thể giữ PARTIAL (hình vẽ đúng, không nhãn số) — KHÔNG ép FULL. Deliverable = construct vẽ đúng + MCP visual pass.

- [ ] **Step 3: Cập nhật memory**

Cập nhật `project_ai_3d_v2_pipeline.md` (block Phase 6: constraint `pointAboveFace`, nhánh tetra-face inscribedRoundSolid, gỡ DEFER 73/85, kết quả diag, bài học verify-vacuous → MCP gate). `MEMORY.md` cập nhật 1 dòng pointer Phase 6.

- [ ] **Step 4: Commit + merge**

```bash
git add docs/superpowers/plans/2026-06-23-3d-inscribed-cylinder-slanted-face.md ../../../.claude/projects/*/memory/project_ai_3d_v2_pipeline.md ../../../.claude/projects/*/memory/MEMORY.md
git commit -m "docs(3d): Phase 6 hoàn tất — trụ mặt nghiêng tứ diện (73/85), memory + plan tick"
```

Merge feature branch vào main (fast-forward) theo standing authorization nếu user xác nhận xong.

---

## Self-Review

**Spec coverage:**
- §3 constraint `pointAboveFace` math + 5 site → Task 1 ✓
- §3 verify3d branch THẬT → Task 2 ✓
- §3 REF_FIELDS `base` → Task 3 Step 3a ✓ (`apex` đã có)
- §4 rule nhánh tetra-face → Task 3 ✓
- §5 0-regression → Task 4 Step 1 + Task 5 Step 2 ✓
- §6 MCP visual GATE → Task 4 Step 4 ✓
- §8 out-of-scope (nón xiên/74/84/89/faceIncenter) → KHÔNG đụng; guard incircle-non-đều giữ ✓

**Type consistency:** constraint `{ kind:'pointAboveFace'; base:string; apex:string; vertices:string[] }` đồng nhất union/refs/math/verify/describe/test. `buildCircleBase` trả `{centerName, radiusTo, intents}` dùng đúng ở Task 3.

**Placeholder scan:** không TBD/TODO; mọi step có code/command thật. Lưu ý 2 chỗ "kiểm chữ ký" (jest.worktree.config + runRules3D API) — engineer xác nhận khi chạy (đọc file export), KHÔNG phải placeholder logic.

**Scope:** đơn lẻ, 5 task, mỗi task có deliverable test được độc lập.
