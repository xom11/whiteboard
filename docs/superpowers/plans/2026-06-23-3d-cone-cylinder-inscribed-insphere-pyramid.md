# Phase 5b — Nón/trụ nội-ngoại tiếp mặt + Mặt cầu nội tiếp chóp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vẽ được nón/trụ nội/ngoại tiếp mặt đa diện (bán kính phái sinh inradius/circumradius) + mặt cầu nội tiếp chóp, deterministic, 0-regression.

**Architecture:** 2 constraint mới (`pyramidInsphereCenter`, `faceCircumcenter`) wire theo template `circumsphereCenter`; cơ chế radius phái sinh "C-refined" (cone/cylinder builder tính literal từ `radiusTo` resolve build-time, scene kind KHÔNG đổi); 2 rule mới (`insphereOfPyramid`, `inscribedRoundSolid`) coexist solidRule. Incircle dùng `centroid` (mặt đều), circumcircle dùng `faceCircumcenter`.

**Tech Stack:** TypeScript strict, Jest 29 (ts-jest, jsdom), JSXGraph view3d, Playwright e2e. Spec: `docs/superpowers/specs/2026-06-23-3d-cone-cylinder-inscribed-insphere-pyramid-design.md`.

## Global Constraints

- **Test từ worktree:** `npx jest -c jest.worktree.config.js <path>` (plain jest = "No tests found").
- **Typecheck:** `npm run typecheck` (tsc --noEmit). Phải xanh sau mỗi task đụng type.
- **Constraint mới = 3 site TS-forced** (đều compile-error tới khi xong): `3d-constraint.ts` constraintRefs never-default (:51); `constraint3d-math.ts` constraintToWorldInner non-exhaustive (switch 234-349); `constraint3d-math.ts` worldToConstraint never-default (:440). **+verify3d branch (KHÔNG TS-forced — thêm tay, else vacuous).**
- **Thêm 1 op/constraint mỗi commit** — KHÔNG nhét nhiều kind vào union cùng commit.
- **Nhãn điểm synth hiển thị:** single-letter non-digit non-`_` (O/I/J/K/T/A–H) — `_`/digit → JSXGraph internal SVG render `<sub>` literal.
- **Regex Việt:** cue/prefilter `/iu`; capture `[A-Z]` strict `/u` (blanket /i = nhãn sai); `(?![\p{L}])` thay `\b`; `escapeRe` MỌI `new RegExp(`…${name}…`)`.
- **GATE 0-REGRESSION (cứng) vs baseline `npx tsx scripts/diag-all-3d.ts`:** ss-thietdien 30/176/35, vuonggoc 122/189/57, tron-xoay 34/25/30, TOTAL 186/390/122. FULL KHÔNG giảm + NONE KHÔNG tăng trên CẢ 3 dataset.
- **MCP visual bắt buộc mỗi construct** (bài học Phase 5: verify R>0 vacuous). `npm run demo` (:5173) + Playwright MCP nhìn hình thật.
- **Honest-metric:** tron-xoay MC-heavy → win = construct VẼ ĐƯỢC + verify số học, KHÔNG phải FULL nhảy mạnh.

## File Structure

| File | Trách nhiệm | Cycle |
|---|---|---|
| `src/core/scene/kinds/3d-constraint.ts` | +2 union arm + 2 constraintRefs case | B1,B2 |
| `src/core/scene/kinds/constraint3d-math.ts` | +2 constraintToWorldInner case + 2 worldToConstraint arm | B1,B2 |
| `src/core/scene/kinds/point3d.ts` | +2 describe case | B1,B2 |
| `src/stamps/geometry-3d/ai/verify3d.ts` | +2 verify branch | B1,B2 |
| `src/stamps/geometry-3d/ai/intent-builders/addPoint3d.ts` | REF_FIELDS +`apex` | B1 |
| `src/stamps/geometry-3d/ai/intent.ts` | cone/cylinder +`radiusTo`, radius optional + factory | B3 |
| `src/stamps/geometry-3d/ai/intent-builders/_types.ts` | helper `resolveWorld3d`, `projectedRadius3d` | B3 |
| `src/stamps/geometry-3d/ai/intent-builders/{cone,cylinder}.ts` | build-time radius từ radiusTo | B3 |
| `src/stamps/geometry-3d/ai/rules/_shared.ts` | helper `parsePyramidTolerant` | B1 |
| `src/stamps/geometry-3d/ai/rules/insphereOfPyramid.ts` (MỚI) | rule mặt cầu nội tiếp chóp | B1 |
| `src/stamps/geometry-3d/ai/rules/inscribedRoundSolid.ts` (MỚI) | rule nón/trụ nội-ngoại tiếp mặt | B4 |
| `src/stamps/geometry-3d/ai/rules/registry.ts` | +2 rule entry | B1,B4 |

---

# CYCLE B1 — Mặt cầu nội tiếp chóp (`pyramidInsphereCenter`)

### Task B1.1: Constraint `pyramidInsphereCenter` (math + wiring 3 site TS-forced + describe)

**Files:**
- Modify: `src/core/scene/kinds/3d-constraint.ts` (union :28, constraintRefs :42)
- Modify: `src/core/scene/kinds/constraint3d-math.ts` (constraintToWorldInner switch, worldToConstraint :437)
- Modify: `src/core/scene/kinds/point3d.ts` (describe :55)
- Test: `src/core/scene/kinds/__tests__/constraint3d-math.pyramidInsphere.test.ts`

**Interfaces:**
- Produces: `Constraint3D` arm `{ kind: 'pyramidInsphereCenter'; apex: string; vertices: string[] }`. `constraintToWorld` trả Vec3 = tâm cầu nội tiếp (trên trục chóp đều, cách đều đáy + mọi mặt bên).

- [ ] **Step 1: Write the failing test**

```ts
// constraint3d-math.pyramidInsphere.test.ts
import type { State, SceneObject } from '../../types';
import { constraintToWorld } from '../constraint3d-math';

function freePt(id: string, x: number, y: number, z: number): SceneObject {
  return { id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1,
    attrs: { constraint: { kind: 'free', x, y, z } } } as SceneObject;
}
function stateOf(pts: SceneObject[]): State {
  const objects: Record<string, SceneObject> = {};
  for (const p of pts) objects[p.id] = p;
  return { objects, order: pts.map((p) => p.id), counter: pts.length, meta: { domain: '3d' } } as unknown as State;
}
function planeDist(P: number[], a: number[], b: number[], cc: number[]): number {
  const e1 = [b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2 = [cc[0]-a[0],cc[1]-a[1],cc[2]-a[2]];
  const n = [e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
  const nn = Math.hypot(n[0],n[1],n[2]) || 1;
  return Math.abs(((P[0]-a[0])*n[0]+(P[1]-a[1])*n[1]+(P[2]-a[2])*n[2]) / nn);
}

describe('pyramidInsphereCenter', () => {
  it('chóp vuông đều: tâm trên trục, cách đều đáy + 4 mặt bên', () => {
    // base square side 2 at z=0, apex (0,0,2). Insphere center (0,0,(√5−1)/2≈0.618).
    const A=[1,1,0], B=[-1,1,0], C=[-1,-1,0], D=[1,-1,0], S=[0,0,2];
    const st = stateOf([
      freePt('A',...A as [number,number,number]), freePt('B',...B as [number,number,number]),
      freePt('C',...C as [number,number,number]), freePt('D',...D as [number,number,number]),
      freePt('S',...S as [number,number,number]),
    ]);
    const w = constraintToWorld({ kind: 'pyramidInsphereCenter', apex: 'S', vertices: ['A','B','C','D'] } as any, st);
    expect(w[0]).toBeCloseTo(0, 6);
    expect(w[1]).toBeCloseTo(0, 6);
    expect(w[2]).toBeCloseTo((Math.sqrt(5)-1)/2, 4); // ≈0.618
    const rBase = w[2]; // dist tâm→đáy (z) = bán kính
    for (const [p,q] of [[A,B],[B,C],[C,D],[D,A]]) {
      expect(planeDist([w[0],w[1],w[2]], S, p, q)).toBeCloseTo(rBase, 4);
    }
  });

  it('đỉnh không trên trục → vẫn hữu hạn (fallback nếu suy biến)', () => {
    const st = stateOf([freePt('A',0,0,0),freePt('B',2,0,0),freePt('C',1,2,0),freePt('S',5,5,3)]);
    const w = constraintToWorld({ kind: 'pyramidInsphereCenter', apex: 'S', vertices: ['A','B','C'] } as any, st);
    expect(w.every((n) => Number.isFinite(n))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/core/scene/kinds/__tests__/constraint3d-math.pyramidInsphere.test.ts`
Expected: FAIL — TS compile error (non-exhaustive switch) / "pyramidInsphereCenter" not in union.

- [ ] **Step 3: Wire union arm + constraintRefs**

`3d-constraint.ts` — đổi cuối union (`:28`), thêm arm TRƯỚC dấu `;`:
```ts
  | { kind: 'circumsphereCenter'; vertices: string[] }
  // Tâm mặt cầu nội tiếp chóp (cách đều đáy + mọi mặt bên — trên trục chóp đều).
  | { kind: 'pyramidInsphereCenter'; apex: string; vertices: string[] };
```
`constraintRefs` switch — thêm case cạnh `circumsphereCenter` (`:42`):
```ts
    case 'circumsphereCenter': return [...c.vertices];
    case 'pyramidInsphereCenter': return [c.apex, ...c.vertices];
```

- [ ] **Step 4: Add constraintToWorldInner case**

`constraint3d-math.ts` — thêm case trong switch (`234-349`), sau case `circumsphereCenter` (`:314`):
```ts
    case 'pyramidInsphereCenter': {
      const S = getPointWorld(c.apex, state);
      const base = c.vertices.map((id) => getPointWorld(id, state));
      const n = base.length;
      if (n < 3) return S;
      let G: Vec3 = [0, 0, 0];
      for (const p of base) G = add(G, p);
      G = scale(G, 1 / n);
      // pháp tuyến đáy hướng về apex
      let nb = normalize(cross(sub(base[1], base[0]), sub(base[2], base[0])));
      if (dot(nb, sub(S, G)) < 0) nb = scale(nb, -1);
      // mặt bên đầu (apex + cạnh base[0],base[1]); pháp tuyến hướng vào trong (về G)
      let m = normalize(cross(sub(base[0], S), sub(base[1], S)));
      if (dot(m, sub(G, base[0])) < 0) m = scale(m, -1);
      const denom = 1 - dot(m, nb);
      const s = Math.abs(denom) < 1e-9 ? NaN : dot(m, sub(G, base[0])) / denom;
      if (!Number.isFinite(s) || s <= 0) {
        // fallback hữu hạn: centroid (apex + base)
        return scale(add(S, scale(G, n)), 1 / (n + 1));
      }
      return add(G, scale(nb, s));
    }
```

- [ ] **Step 5: Add worldToConstraint never-arm + describe**

`constraint3d-math.ts` worldToConstraint (`:431-438`) — thêm vào nhóm non-draggable:
```ts
    case 'circumsphereCenter':
    case 'pyramidInsphereCenter':
      return current;
```
`point3d.ts` describe (`:55`, trước `return obj.label;`):
```ts
    if (c.kind === 'pyramidInsphereCenter') return `${obj.label} = tâm cầu nội tiếp chóp ${c.apex}.${c.vertices.join('')}`;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/core/scene/kinds/__tests__/constraint3d-math.pyramidInsphere.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Typecheck + commit**

Run: `npm run typecheck` → PASS.
```bash
git add src/core/scene/kinds/3d-constraint.ts src/core/scene/kinds/constraint3d-math.ts src/core/scene/kinds/point3d.ts src/core/scene/kinds/__tests__/constraint3d-math.pyramidInsphere.test.ts
git commit -m "feat(3d): constraint pyramidInsphereCenter (tâm cầu nội tiếp chóp đều, closed-form trên trục)"
```

---

### Task B1.2: verify3d branch cho `pyramidInsphereCenter`

**Files:**
- Modify: `src/stamps/geometry-3d/ai/verify3d.ts` (trong vòng lặp point3d, sau block `circumsphereCenter` :151)
- Test: `src/stamps/geometry-3d/ai/__tests__/verify3d.pyramidInsphere.test.ts`

**Interfaces:**
- Consumes: constraint `pyramidInsphereCenter` (Task B1.1).
- Produces: `verifyFigure3d` báo issue nếu tâm KHÔNG trên trục chóp HOẶC không cách đều đáy/mặt bên.

- [ ] **Step 1: Write the failing test**

```ts
// verify3d.pyramidInsphere.test.ts
import type { State, SceneObject } from '../../../../core/scene/types';
import { verifyFigure3d } from '../verify3d';

function pt(id: string, c: any): SceneObject {
  return { id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { constraint: c } } as SceneObject;
}
function stateOf(pts: SceneObject[]): State {
  const objects: Record<string, SceneObject> = {};
  for (const p of pts) objects[p.id] = p;
  return { objects, order: pts.map((p) => p.id), counter: pts.length, meta: { domain: '3d' } } as unknown as State;
}

describe('verify3d pyramidInsphereCenter', () => {
  it('chóp vuông đều: tâm hợp lệ → ok', () => {
    const st = stateOf([
      pt('A',{kind:'free',x:1,y:1,z:0}), pt('B',{kind:'free',x:-1,y:1,z:0}),
      pt('C',{kind:'free',x:-1,y:-1,z:0}), pt('D',{kind:'free',x:1,y:-1,z:0}),
      pt('S',{kind:'free',x:0,y:0,z:2}),
      pt('O',{kind:'pyramidInsphereCenter',apex:'S',vertices:['A','B','C','D']}),
    ]);
    const r = verifyFigure3d(st);
    expect(r.ok).toBe(true);
  });

  it('tâm SAI (free đặt lệch) → báo không tiếp xúc đều', () => {
    const st = stateOf([
      pt('A',{kind:'free',x:1,y:1,z:0}), pt('B',{kind:'free',x:-1,y:1,z:0}),
      pt('C',{kind:'free',x:-1,y:-1,z:0}), pt('D',{kind:'free',x:1,y:-1,z:0}),
      pt('S',{kind:'free',x:0,y:0,z:2}),
      // tâm đặt sai vị trí (vẫn trên trục nhưng z quá cao → không cách đều)
      pt('O',{kind:'free',x:0,y:0,z:1.5}),
    ]);
    // free 'O' không kích branch pyramidInsphereCenter (chỉ kiểm khi kind đó). Test
    // qua constraint thật nhưng đỉnh lệch trục để phá đẳng-cự:
    const st2 = stateOf([
      pt('A',{kind:'free',x:1,y:1,z:0}), pt('B',{kind:'free',x:-1,y:1,z:0}),
      pt('C',{kind:'free',x:-1,y:-1,z:0}), pt('D',{kind:'free',x:1,y:-1,z:0}),
      pt('S',{kind:'free',x:1.5,y:0,z:2}), // apex lệch → insphere không tiếp xúc đều 4 mặt
      pt('O',{kind:'pyramidInsphereCenter',apex:'S',vertices:['A','B','C','D']}),
    ]);
    const r = verifyFigure3d(st2);
    expect(r.ok).toBe(false);
    expect(r.issues.join('\n')).toMatch(/không tiếp xúc đều|không trên trục/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/verify3d.pyramidInsphere.test.ts`
Expected: FAIL — test 2 sai (chưa có branch → ok=true).

- [ ] **Step 3: Add verify branch**

`verify3d.ts` — sau block `if (c.kind === 'circumsphereCenter') {...}` (`:151`), thêm:
```ts
    // Kiểm pyramidInsphereCenter: tâm trên trục chóp (collinear apex-G-tâm) + cách đều đáy/mặt bên
    if (c.kind === 'pyramidInsphereCenter') {
      try {
        const S = ptWorld(state, c.apex);
        const base = (c.vertices as string[]).map((id) => ptWorld(state, id));
        if (base.length >= 3) {
          const G: Vec3 = [0, 0, 0];
          for (const p of base) { G[0]+=p[0]; G[1]+=p[1]; G[2]+=p[2]; }
          G[0]/=base.length; G[1]/=base.length; G[2]/=base.length;
          const pg: Vec3 = [w[0]-G[0], w[1]-G[1], w[2]-G[2]];
          const sg: Vec3 = [S[0]-G[0], S[1]-G[1], S[2]-G[2]];
          const cr: Vec3 = [pg[1]*sg[2]-pg[2]*sg[1], pg[2]*sg[0]-pg[0]*sg[2], pg[0]*sg[1]-pg[1]*sg[0]];
          if (Math.hypot(cr[0],cr[1],cr[2]) > 1e-6) issues.push(`${obj.label||obj.id}: tâm cầu nội tiếp không trên trục chóp`);
          const fb = planeFrame(base[0], base[1], base[2]);
          const dBase = Math.abs(signedDistance(w, fb));
          for (let i = 0; i < base.length; i++) {
            const lf = planeFrame(S, base[i], base[(i+1)%base.length]);
            if (Math.abs(Math.abs(signedDistance(w, lf)) - dBase) > 1e-6 * Math.max(1, dBase)) {
              issues.push(`${obj.label||obj.id}: mặt cầu nội tiếp chóp không tiếp xúc đều đáy/mặt bên`); break;
            }
          }
        }
      } catch (e) { issues.push(`${obj.label||obj.id}: pyramidInsphereCenter check lỗi — ${(e as Error).message}`); }
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/verify3d.pyramidInsphere.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/verify3d.ts src/stamps/geometry-3d/ai/__tests__/verify3d.pyramidInsphere.test.ts
git commit -m "feat(3d): verify3d pyramidInsphereCenter (on-axis + tiếp xúc đều đáy/mặt bên — không vacuous)"
```

---

### Task B1.3: Rule `insphereOfPyramid` + helper `parsePyramidTolerant` + REF_FIELDS

**Files:**
- Modify: `src/stamps/geometry-3d/ai/rules/_shared.ts` (helper `parsePyramidTolerant`)
- Modify: `src/stamps/geometry-3d/ai/intent-builders/addPoint3d.ts` (REF_FIELDS +`apex`)
- Create: `src/stamps/geometry-3d/ai/rules/insphereOfPyramid.ts`
- Modify: `src/stamps/geometry-3d/ai/rules/registry.ts`
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/insphereOfPyramid.test.ts`

**Interfaces:**
- Consumes: constraint `pyramidInsphereCenter` (B1.1), `centroid`, `sphereIntent`.
- Produces: `parsePyramidTolerant(problem): { apex: string; base: string[]; solidRuleDraws: boolean } | null` (re-used bởi B4). Rule `insphereOfPyramidRule` emit solid pyramid (khi solidRule không vẽ) + pyramidInsphereCenter + centroid + sphere.

- [ ] **Step 1: Write the failing test**

```ts
// insphereOfPyramid.test.ts
import { insphereOfPyramidRule } from '../insphereOfPyramid';
import { runRules3D } from '../registry';
import { segmentClauses3D } from '../../deterministic/coverage3d';

function clause(text: string, id = 0) { return { id, text, hasGeometry: true }; }
function ctxOf(problem: string) { return { problem, clauses: segmentClauses3D(problem).filter((c) => c.hasGeometry) }; }

describe('insphereOfPyramid rule', () => {
  it('chóp tứ giác đều (solidRule miss) → tự emit solid + insphere center + sphere', () => {
    const p = 'Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng a. Bán kính mặt cầu nội tiếp hình chóp S.ABCD.';
    const ctx = ctxOf(p);
    const m = insphereOfPyramidRule.match(ctx as any);
    expect(m.length).toBe(1);
    const ops = m[0].intents.map((i: any) => i.op + (i.constraint ? '/' + i.constraint.kind : ''));
    expect(ops).toContain('solid');                          // tự vẽ chóp (solidRule miss qualifier)
    expect(ops).toContain('add-point-3d/pyramidInsphereCenter');
    expect(ops).toContain('add-point-3d/centroid');          // surfacePoint = tâm đáy
    expect(ops).toContain('sphere');
    const cs = m[0].intents.find((i: any) => i.constraint?.kind === 'pyramidInsphereCenter') as any;
    expect(cs.constraint.apex).toBe('S');
    expect(cs.constraint.vertices).toEqual(['A','B','C','D']);
  });

  it('chóp bare có nhãn (solidRule vẽ) → KHÔNG emit solid (tránh dup)', () => {
    const p = 'Cho hình chóp S.ABCD. Mặt cầu nội tiếp hình chóp S.ABCD.';
    const m = insphereOfPyramidRule.match(ctxOf(p) as any);
    expect(m.length).toBe(1);
    expect(m[0].intents.map((i: any) => i.op)).not.toContain('solid');
  });

  it('lập phương → KHÔNG fire (insphereCube lo)', () => {
    const p = 'Mặt cầu nội tiếp hình lập phương cạnh a.';
    expect(insphereOfPyramidRule.match(ctxOf(p) as any).length).toBe(0);
  });

  it('co-fire: chóp tứ giác đều → đúng 1 chóp (solid), 0 circumsphere', () => {
    const p = 'Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng 1, chiều cao h. Tính bán kính mặt cầu nội tiếp hình chóp S.ABCD.';
    const all = runRules3D(ctxOf(p));
    const ops = all.flatMap((mm) => mm.intents).map((i: any) => i.op);
    expect(ops.filter((o: string) => o === 'solid').length).toBe(1);
    expect(ops.filter((o: string) => o === 'sphere').length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/insphereOfPyramid.test.ts`
Expected: FAIL — `insphereOfPyramidRule` không tồn tại.

- [ ] **Step 3: Add helper `parsePyramidTolerant` to `_shared.ts`**

Thêm cuối `_shared.ts`:
```ts
// Pyramid head tolerant of "(tứ|tam) giác (đều)?" qualifier giữa "chóp" và nhãn.
// solidRule.PYRAMID = /hình\s+chóp\s+([A-Z])\./ FAIL khi có qualifier → solidRule KHÔNG vẽ.
const PYRAMID_TOLERANT = /(?:hình\s*)?chóp\s+(?:(?:tứ|tam)\s*giác\s*)?(?:đều\s+)?([A-Z])\.([A-Z]+)/u;
const SOLID_RULE_PYRAMID = /hình\s+chóp\s+[A-Z]\./u; // mirror solidRule.PYRAMID firing prefix
export function parsePyramidTolerant(problem: string): { apex: string; base: string[]; solidRuleDraws: boolean } | null {
  const m = PYRAMID_TOLERANT.exec(problem);
  if (!m) return null;
  return { apex: m[1], base: splitVertexToken(m[2]), solidRuleDraws: SOLID_RULE_PYRAMID.test(problem) };
}
```
Thêm `solid` vào re-export dòng đầu `_shared.ts` (đã có `solid` trong barrel? — kiểm: dòng 1 export từ '../intent' đã có `solid`. Nếu chưa, thêm). *(Hiện dòng 1 KHÔNG có `solid` — thêm `solid` vào danh sách re-export.)*

- [ ] **Step 4: Add REF_FIELDS `apex`**

`addPoint3d.ts` REF_FIELDS (`:7-10`) — thêm `'apex'`:
```ts
const REF_FIELDS = new Set([
  'p1', 'p2', 'from', 'plane', 'a', 'b', 'a1', 'b1', 'a2', 'b2',
  'lineId', 'planeId', 'polygonId', 'sphereId', 'apex',
]);
```

- [ ] **Step 5: Create `insphereOfPyramid.ts`**

```ts
import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { solid, addPoint3d, sphereIntent, pickCenter, parsePyramidTolerant } from './_shared';

const SPHERE_CUE = /(?:mặt|khối|hình)\s*cầu/iu;
const INSCRIBED = /nội\s*tiếp/iu;
const CUBE = /lập\s*phương/iu;

// Mặt cầu nội tiếp chóp: tâm = pyramidInsphereCenter (cách đều đáy + mọi mặt bên),
// surfacePoint = centroid đáy (cầu chạm đáy tại tâm-đáy) → R = inradius. Reuse sphere.
export const insphereOfPyramidRule: LanguageRule3D = {
  id: 'insphereOfPyramid',
  priority: 50,
  languages: ['vi'],
  patterns: [/(?:mặt|khối|hình)\s*cầu/iu, /nội\s*tiếp/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    if (!INSCRIBED.test(ctx.problem) || CUBE.test(ctx.problem)) return []; // cube → insphereCube
    const head = parsePyramidTolerant(ctx.problem);
    if (!head) return [];
    const c = ctx.clauses.find((cl) => SPHERE_CUE.test(cl.text) && INSCRIBED.test(cl.text));
    if (!c) return [];
    const { apex, base, solidRuleDraws } = head;
    const verts = base;
    const center = pickCenter([apex, ...verts]);          // tâm cầu (synth)
    const surf = pickCenter([apex, ...verts, center]);    // tâm đáy = điểm mặt
    const intents: Intent3DT[] = [];
    if (!solidRuleDraws) {
      intents.push(solid({
        flavor: 'pyramid', baseLabels: verts,
        baseVariant: verts.length === 4 ? 'square' : 'equilateral-triangle',
        apex, apexVariant: 'regular',
      }));
    }
    intents.push(
      addPoint3d(center, { kind: 'pyramidInsphereCenter', apex, vertices: verts }),
      addPoint3d(surf, { kind: 'centroid', vertices: verts }),
      sphereIntent({ center, surfacePoint: surf }),
    );
    return [{ ruleId: this.id, clauseIds: [c.id], intents }];
  },
};
```

- [ ] **Step 6: Register rule**

`registry.ts` — import + chèn vào `RULES` (cạnh circumsphere):
```ts
import { insphereOfPyramidRule } from './insphereOfPyramid';
// ...
  circumsphereRule,           // priority 50
  insphereOfPyramidRule,      // priority 50
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/insphereOfPyramid.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 8: Typecheck + commit**

Run: `npm run typecheck` → PASS.
```bash
git add src/stamps/geometry-3d/ai/rules/_shared.ts src/stamps/geometry-3d/ai/intent-builders/addPoint3d.ts src/stamps/geometry-3d/ai/rules/insphereOfPyramid.ts src/stamps/geometry-3d/ai/rules/registry.ts src/stamps/geometry-3d/ai/rules/__tests__/insphereOfPyramid.test.ts
git commit -m "feat(3d): rule insphereOfPyramid (mặt cầu nội tiếp chóp) + parsePyramidTolerant (chóp tứ giác đều solidRule miss)"
```

---

### Task B1.4: B1 integration — e2e Playwright + diag gate + MCP visual

**Files:**
- Modify: `tests/e2e/geometry-3d-figure.spec.ts` (+1 test insphere chóp)
- Verify: `npx tsx scripts/diag-all-3d.ts` (0-regression)

- [ ] **Step 1: Add e2e test**

Cuối `geometry-3d-figure.spec.ts`, thêm:
```ts
// ───── Phase 5b ─────

// Render-verify mặt cầu nội tiếp chóp tứ giác đều: pyramid (5 polygon3d) + inscribed sphere3d.
test('renders an inscribed sphere for a mặt cầu nội tiếp chóp problem', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await expect(page.locator('[data-testid="dropdown-menu-button"]').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('[data-testid="dropdown-menu-button"]').first().click();
  await page.locator('[data-testid="stamp-toolbar-geometry3d"]').click();
  await expect(page.locator('[data-testid="mini-board-3d"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => !!(window as any).JXG, undefined, { timeout: 10_000 });
  await page.locator('[data-testid="ai-generate-3d-input"]').fill(
    'Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng a. Tính bán kính mặt cầu nội tiếp hình chóp S.ABCD.',
  );
  await page.locator('[data-testid="ai-generate-3d-btn"]').click();
  await page.waitForFunction(() => {
    const JXG = (window as any).JXG;
    if (!JXG?.boards) return false;
    for (const b of Object.values(JXG.boards) as any[]) {
      const spheres = Object.values(b.objects).filter((o: any) => o.elType === 'sphere3d');
      const polys = Object.values(b.objects).filter((o: any) => o.elType === 'polygon3d');
      if (spheres.length >= 1 && polys.length >= 5) return true; // chóp 5 mặt + cầu
    }
    return false;
  }, undefined, { timeout: 8_000 });
  expect(errors.join('\n')).not.toMatch(/sphere3d|polygon3d|Cannot read|undefined is not/i);
});
```

- [ ] **Step 2: Run e2e**

Run: `npx playwright test tests/e2e/geometry-3d-figure.spec.ts -g "mặt cầu nội tiếp chóp"`
Expected: PASS (1 test).

- [ ] **Step 3: MCP visual verify (BẮT BUỘC)**

`npm run demo` → Playwright MCP: mở :5173, mở editor 3D, nhập đề chóp tứ giác đều + insphere, generate. **Nhìn hình thật:** mặt cầu trong suốt NẰM TRONG chóp, tiếp xúc đáy + 4 mặt bên (KHÔNG thò qua mặt). Trích toạ độ JXG đo: tâm trên trục, R ≈ dist tâm→đáy. Nếu thấy cầu thò/lệch → STOP, debug (bài học Phase 5: verify R>0 không đủ).

- [ ] **Step 4: diag 0-regression gate**

Run: `npx tsx scripts/diag-all-3d.ts`
Expected: ss-thietdien 30/176/35 (flat), vuonggoc 122/189/57 (flat), tron-xoay FULL ≥34 + NONE ≤30 (21/35/53 NONE→PARTIAL/FULL kỳ vọng). Nếu ss-thietdien/vuonggoc đổi HOẶC tron-xoay FULL<34 / NONE>30 → STOP, điều tra.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/geometry-3d-figure.spec.ts
git commit -m "test(3d): e2e + MCP render-verify mặt cầu nội tiếp chóp (Phase 5b B1 gate)"
```

---

# CYCLE B2 — `faceCircumcenter` (tâm ngoại tiếp tam giác 3D)

### Task B2.1: Constraint `faceCircumcenter` (math + wiring + describe)

**Files:**
- Modify: `src/core/scene/kinds/3d-constraint.ts`, `constraint3d-math.ts`, `point3d.ts`
- Test: `src/core/scene/kinds/__tests__/constraint3d-math.faceCircumcenter.test.ts`

**Interfaces:**
- Produces: `Constraint3D` arm `{ kind: 'faceCircumcenter'; vertices: string[] }`. `constraintToWorld` trả tâm ngoại tiếp tam giác (3 đỉnh đầu): trong mặt + cách đều 3 đỉnh.

- [ ] **Step 1: Write the failing test**

```ts
// constraint3d-math.faceCircumcenter.test.ts
import type { State, SceneObject } from '../../types';
import { constraintToWorld } from '../constraint3d-math';
function freePt(id: string, x: number, y: number, z: number): SceneObject {
  return { id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1,
    attrs: { constraint: { kind: 'free', x, y, z } } } as SceneObject;
}
function stateOf(pts: SceneObject[]): State {
  const objects: Record<string, SceneObject> = {};
  for (const p of pts) objects[p.id] = p;
  return { objects, order: pts.map((p) => p.id), counter: pts.length, meta: { domain: '3d' } } as unknown as State;
}
describe('faceCircumcenter', () => {
  it('tam giác phẳng z=0 → tâm (1,1,0), R=√2', () => {
    const st = stateOf([freePt('a',0,0,0), freePt('b',2,0,0), freePt('c',0,2,0)]);
    const w = constraintToWorld({ kind: 'faceCircumcenter', vertices: ['a','b','c'] } as any, st);
    expect(w[0]).toBeCloseTo(1, 9); expect(w[1]).toBeCloseTo(1, 9); expect(w[2]).toBeCloseTo(0, 9);
    const r = (p: number[]) => Math.hypot(w[0]-p[0], w[1]-p[1], w[2]-p[2]);
    for (const p of [[0,0,0],[2,0,0],[0,2,0]]) expect(r(p)).toBeCloseTo(Math.sqrt(2), 9);
  });
  it('tam giác nghiêng (mặt y=0) → tâm (1,0,1)', () => {
    const st = stateOf([freePt('a',0,0,0), freePt('b',2,0,0), freePt('c',0,0,2)]);
    const w = constraintToWorld({ kind: 'faceCircumcenter', vertices: ['a','b','c'] } as any, st);
    expect(w[0]).toBeCloseTo(1, 9); expect(w[1]).toBeCloseTo(0, 9); expect(w[2]).toBeCloseTo(1, 9);
  });
  it('collinear → fallback centroid hữu hạn', () => {
    const st = stateOf([freePt('a',0,0,0), freePt('b',1,0,0), freePt('c',2,0,0)]);
    const w = constraintToWorld({ kind: 'faceCircumcenter', vertices: ['a','b','c'] } as any, st);
    expect(w.every((n) => Number.isFinite(n))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/core/scene/kinds/__tests__/constraint3d-math.faceCircumcenter.test.ts`
Expected: FAIL — non-exhaustive switch / kind unknown.

- [ ] **Step 3: Wire union + constraintRefs**

`3d-constraint.ts` union — thêm arm sau `pyramidInsphereCenter`:
```ts
  | { kind: 'pyramidInsphereCenter'; apex: string; vertices: string[] }
  // Tâm đường tròn ngoại tiếp mặt (tam giác 3 đỉnh đầu): trong mặt + cách đều đỉnh.
  | { kind: 'faceCircumcenter'; vertices: string[] };
```
constraintRefs:
```ts
    case 'pyramidInsphereCenter': return [c.apex, ...c.vertices];
    case 'faceCircumcenter': return [...c.vertices];
```

- [ ] **Step 4: Add constraintToWorldInner case**

`constraint3d-math.ts` — sau case `pyramidInsphereCenter`:
```ts
    case 'faceCircumcenter': {
      const P = c.vertices.map((id) => getPointWorld(id, state));
      if (P.length < 3) return P.length ? P[0] : [0, 0, 0];
      const [p0, p1, p2] = P;
      const e1 = sub(p1, p0), e2 = sub(p2, p0);
      const nrm = cross(e1, e2);
      const M = [
        [2 * e1[0], 2 * e1[1], 2 * e1[2]],
        [2 * e2[0], 2 * e2[1], 2 * e2[2]],
        [nrm[0], nrm[1], nrm[2]],
      ];
      const rhs: Vec3 = [dot(p1, p1) - dot(p0, p0), dot(p2, p2) - dot(p0, p0), dot(nrm, p0)];
      const sol = solve3(M, rhs);
      if (sol) return sol;
      return scale(add(add(p0, p1), p2), 1 / 3); // suy biến (collinear) → centroid
    }
```

- [ ] **Step 5: worldToConstraint arm + describe**

`constraint3d-math.ts` worldToConstraint:
```ts
    case 'pyramidInsphereCenter':
    case 'faceCircumcenter':
      return current;
```
`point3d.ts` describe:
```ts
    if (c.kind === 'faceCircumcenter') return `${obj.label} = tâm ngoại tiếp ${c.vertices.join('')}`;
```

- [ ] **Step 6: Run test + typecheck + commit**

Run: `npx jest -c jest.worktree.config.js src/core/scene/kinds/__tests__/constraint3d-math.faceCircumcenter.test.ts` → PASS (3 tests).
Run: `npm run typecheck` → PASS.
```bash
git add src/core/scene/kinds/3d-constraint.ts src/core/scene/kinds/constraint3d-math.ts src/core/scene/kinds/point3d.ts src/core/scene/kinds/__tests__/constraint3d-math.faceCircumcenter.test.ts
git commit -m "feat(3d): constraint faceCircumcenter (tâm ngoại tiếp tam giác 3D — solve3 + plane normal)"
```

---

### Task B2.2: verify3d branch cho `faceCircumcenter`

**Files:**
- Modify: `src/stamps/geometry-3d/ai/verify3d.ts`
- Test: `src/stamps/geometry-3d/ai/__tests__/verify3d.faceCircumcenter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// verify3d.faceCircumcenter.test.ts
import type { State, SceneObject } from '../../../../core/scene/types';
import { verifyFigure3d } from '../verify3d';
function pt(id: string, c: any): SceneObject {
  return { id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { constraint: c } } as SceneObject;
}
function stateOf(pts: SceneObject[]): State {
  const objects: Record<string, SceneObject> = {};
  for (const p of pts) objects[p.id] = p;
  return { objects, order: pts.map((p) => p.id), counter: pts.length, meta: { domain: '3d' } } as unknown as State;
}
describe('verify3d faceCircumcenter', () => {
  it('tâm ngoại tiếp hợp lệ → ok', () => {
    const st = stateOf([
      pt('A',{kind:'free',x:0,y:0,z:0}), pt('B',{kind:'free',x:2,y:0,z:0}), pt('C',{kind:'free',x:0,y:2,z:0}),
      pt('O',{kind:'faceCircumcenter',vertices:['A','B','C']}),
    ]);
    expect(verifyFigure3d(st).ok).toBe(true);
  });
  it('điểm "tâm" đặt lệch (free ngoài mặt) KHÔNG bị kiểm; constraint thật ngoài-mặt → bắt', () => {
    // 3 điểm collinear → fallback centroid (trên đường, "in-plane" suy biến): chấp nhận hữu hạn.
    const st = stateOf([
      pt('A',{kind:'free',x:0,y:0,z:0}), pt('B',{kind:'free',x:1,y:0,z:0}), pt('C',{kind:'free',x:2,y:0,z:0}),
      pt('O',{kind:'faceCircumcenter',vertices:['A','B','C']}),
    ]);
    // fallback centroid (1,0,0) cách đều? |O-A|=1,|O-B|=0,|O-C|=1 → KHÔNG đều → báo issue.
    const r = verifyFigure3d(st);
    expect(r.ok).toBe(false);
    expect(r.issues.join('\n')).toMatch(/không cách đều/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/verify3d.faceCircumcenter.test.ts`
Expected: FAIL — test 2 ok=true (chưa có branch).

- [ ] **Step 3: Add verify branch**

`verify3d.ts` — sau block `pyramidInsphereCenter`:
```ts
    // Kiểm faceCircumcenter: trong mặt + cách đều 3 đỉnh
    if (c.kind === 'faceCircumcenter') {
      try {
        const P = (c.vertices as string[]).map((id) => ptWorld(state, id));
        if (P.length >= 3) {
          const f = planeFrame(P[0], P[1], P[2]);
          if (Math.abs(signedDistance(w, f)) > 1e-6) issues.push(`${obj.label||obj.id}: tâm ngoại tiếp không nằm trên mặt`);
          const r0 = Math.hypot(w[0]-P[0][0], w[1]-P[0][1], w[2]-P[0][2]);
          const tol = 1e-6 * Math.max(1, r0);
          for (const p of P) {
            if (Math.abs(Math.hypot(w[0]-p[0], w[1]-p[1], w[2]-p[2]) - r0) > tol) {
              issues.push(`${obj.label||obj.id}: tâm ngoại tiếp không cách đều đỉnh`); break;
            }
          }
        }
      } catch (e) { issues.push(`${obj.label||obj.id}: faceCircumcenter check lỗi — ${(e as Error).message}`); }
    }
```

- [ ] **Step 4: Run test + commit**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/verify3d.faceCircumcenter.test.ts` → PASS (2 tests).
```bash
git add src/stamps/geometry-3d/ai/verify3d.ts src/stamps/geometry-3d/ai/__tests__/verify3d.faceCircumcenter.test.ts
git commit -m "feat(3d): verify3d faceCircumcenter (in-plane + cách đều đỉnh)"
```

---

# CYCLE B3 — Cơ chế radius phái sinh (`radiusTo`)

### Task B3.1: Intent cone/cylinder `radiusTo` + radius optional + factory

**Files:**
- Modify: `src/stamps/geometry-3d/ai/intent.ts` (ConeIntentZ :65, CylinderIntentZ :71, factory :125,:129)
- Test: `src/stamps/geometry-3d/ai/__tests__/intent.test.ts` (thêm cases — KIỂM file có rồi, append describe)

**Interfaces:**
- Produces: `coneIntent({baseCenter, apex, radius?, radiusTo?})`, `cylinderIntent({baseCenter, topCenter, radius?, radiusTo?})`. Zod nhận `radiusTo: Label` optional, `radius` optional.

- [ ] **Step 1: Write the failing test** (append vào `intent.test.ts`)

```ts
import { Intent3DZ, coneIntent, cylinderIntent } from '../intent';
describe('cone/cylinder radiusTo (Phase 5b)', () => {
  it('coneIntent radiusTo parse OK, radius optional', () => {
    const i = coneIntent({ baseCenter: 'O', apex: 'S', radiusTo: 'M' });
    const parsed = Intent3DZ.parse(i);
    expect((parsed as any).radiusTo).toBe('M');
    expect((parsed as any).radius).toBeUndefined();
  });
  it('coneIntent radius literal vẫn OK (Phase 4 standalone)', () => {
    const parsed = Intent3DZ.parse(coneIntent({ baseCenter: 'O', apex: 'S', radius: 1.4 }));
    expect((parsed as any).radius).toBe(1.4);
  });
  it('cylinderIntent radiusTo parse OK', () => {
    const parsed = Intent3DZ.parse(cylinderIntent({ baseCenter: 'O', topCenter: 'I', radiusTo: 'M' }));
    expect((parsed as any).radiusTo).toBe('M');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intent.test.ts -t "radiusTo"`
Expected: FAIL — `radiusTo` bị strip (zod chưa khai) → undefined.

- [ ] **Step 3: Update intent.ts**

```ts
const ConeIntentZ = z.object({
  op: z.literal('cone'),
  name: Label3DZ.optional(),
  baseCenter: Label3DZ, apex: Label3DZ,
  radius: z.number().optional(),
  radiusTo: Label3DZ.optional(),
});

const CylinderIntentZ = z.object({
  op: z.literal('cylinder'),
  name: Label3DZ.optional(),
  baseCenter: Label3DZ, topCenter: Label3DZ,
  radius: z.number().optional(),
  radiusTo: Label3DZ.optional(),
});
```
Factory:
```ts
export function coneIntent(spec: { name?: string; baseCenter: string; apex: string; radius?: number; radiusTo?: string }): Intent3DT {
  return { op: 'cone', ...spec } as Intent3DT;
}
export function cylinderIntent(spec: { name?: string; baseCenter: string; topCenter: string; radius?: number; radiusTo?: string }): Intent3DT {
  return { op: 'cylinder', ...spec } as Intent3DT;
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intent.test.ts` → PASS (incl. existing).
Run: `npm run typecheck` → PASS (cone.ts/cylinder.ts builders dùng `intent.radius` — giờ `number|undefined`; Task B3.2 sửa builder, nhưng typecheck CÓ THỂ lỗi ở builder dùng `radius` number. Nếu lỗi → làm B3.2 cùng commit). **GỘP B3.1+B3.2 nếu typecheck đỏ.**

- [ ] **Step 5: Commit** (nếu typecheck xanh độc lập; else gộp B3.2)

```bash
git add src/stamps/geometry-3d/ai/intent.ts src/stamps/geometry-3d/ai/__tests__/intent.test.ts
git commit -m "feat(3d): cone/cylinder intent +radiusTo (radius optional) cho bán kính phái sinh"
```

---

### Task B3.2: Builder build-time radius từ `radiusTo`

**Files:**
- Modify: `src/stamps/geometry-3d/ai/intent-builders/_types.ts` (helper `resolveWorld3d`, `projectedRadius3d`)
- Modify: `src/stamps/geometry-3d/ai/intent-builders/cone.ts`, `cylinder.ts`
- Test: `src/stamps/geometry-3d/ai/__tests__/intentToScene3d.radiusTo.test.ts`

**Interfaces:**
- Consumes: `coneIntent`/`cylinderIntent` với `radiusTo` (B3.1).
- Produces: cone3d/cylinder3d kind với `radius` literal = khoảng cách (chiếu ⊥ trục) từ baseCenter tới radiusTo. Đường `radius` literal (standalone) KHÔNG đổi.

- [ ] **Step 1: Write the failing test**

```ts
// intentToScene3d.radiusTo.test.ts
import { intentToScene3d } from '../intentToScene3d';
import { addPoint3d, coneIntent, cylinderIntent } from '../intent';

function radiusOf(state: any, kind: string): number {
  const obj = Object.values(state.objects).find((o: any) => o.kind === kind) as any;
  return obj.attrs.radius;
}

describe('build-time radius từ radiusTo', () => {
  it('cone radiusTo: radius = khoảng cách ⊥ trục baseCenter→radiusTo', () => {
    // base O(0,0,0), apex S(0,0,2) (trục z), radiusTo M(1.5,0,0) → radius = 1.5
    const intents = [
      addPoint3d('O', { kind: 'free', x: 0, y: 0, z: 0 }),
      addPoint3d('S', { kind: 'free', x: 0, y: 0, z: 2 }),
      addPoint3d('M', { kind: 'free', x: 1.5, y: 0, z: 0 }),
      coneIntent({ baseCenter: 'O', apex: 'S', radiusTo: 'M' }),
    ];
    const state = intentToScene3d(intents);
    expect(radiusOf(state, 'cone3d')).toBeCloseTo(1.5, 6);
  });
  it('cone radius literal (standalone) KHÔNG đổi', () => {
    const intents = [
      addPoint3d('O', { kind: 'free', x: 0, y: 0, z: -1.2 }),
      addPoint3d('S', { kind: 'free', x: 0, y: 0, z: 1.2 }),
      coneIntent({ baseCenter: 'O', apex: 'S', radius: 1.4 }),
    ];
    expect(radiusOf(intentToScene3d(intents), 'cone3d')).toBeCloseTo(1.4, 6);
  });
  it('cylinder radiusTo: chiếu ⊥ trục', () => {
    // base O(0,0,0), top I(0,0,3), radiusTo M(2,0,0) → radius 2
    const intents = [
      addPoint3d('O', { kind: 'free', x: 0, y: 0, z: 0 }),
      addPoint3d('I', { kind: 'free', x: 0, y: 0, z: 3 }),
      addPoint3d('M', { kind: 'free', x: 2, y: 0, z: 0 }),
      cylinderIntent({ baseCenter: 'O', topCenter: 'I', radiusTo: 'M' }),
    ];
    expect(radiusOf(intentToScene3d(intents), 'cylinder3d')).toBeCloseTo(2, 6);
  });
});
```
*(Note: kiểm signature `intentToScene3d` — nếu nhận `(intents)` trả `state`. Xem `intentToScene3d.points.test.ts` để khớp cách gọi; điều chỉnh import/gọi nếu khác.)*

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentToScene3d.radiusTo.test.ts`
Expected: FAIL — builder chưa xử lý radiusTo (radius = undefined → cone3d.validate throw, hoặc NaN).

- [ ] **Step 3: Add helpers to `_types.ts`**

```ts
import { constraintToWorld } from '../../../../core/scene/kinds/constraint3d-math';

export function resolveWorld3d(s: BuildState3D, id: string): [number, number, number] {
  const st = s.store.getState();
  const obj = st.objects[id];
  if (!obj) throw new IntentBuilder3DError(`điểm không tồn tại: ${id}`);
  return constraintToWorld((obj.attrs as any).constraint, st) as [number, number, number];
}

// Bán kính = khoảng cách từ baseCenter tới radiusTo, chiếu ⊥ trục (baseCenter→axisEnd).
export function projectedRadius3d(s: BuildState3D, baseId: string, axisEndId: string, radiusToId: string): number {
  const C = resolveWorld3d(s, baseId), E = resolveWorld3d(s, axisEndId), R = resolveWorld3d(s, radiusToId);
  const ax: [number, number, number] = [E[0] - C[0], E[1] - C[1], E[2] - C[2]];
  const an = Math.hypot(ax[0], ax[1], ax[2]) || 1;
  const u: [number, number, number] = [ax[0] / an, ax[1] / an, ax[2] / an];
  const v: [number, number, number] = [R[0] - C[0], R[1] - C[1], R[2] - C[2]];
  const proj = v[0] * u[0] + v[1] * u[1] + v[2] * u[2];
  return Math.hypot(v[0] - proj * u[0], v[1] - proj * u[1], v[2] - proj * u[2]);
}
```

- [ ] **Step 4: Update cone.ts + cylinder.ts builders**

`cone.ts`:
```ts
import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId, projectedRadius3d } from './_types';

export const buildCone: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'cone') return;
  const baseId = resolveId(s, intent.baseCenter);
  const apexId = resolveId(s, intent.apex);
  const radius = intent.radiusTo != null
    ? projectedRadius3d(s, baseId, apexId, resolveId(s, intent.radiusTo))
    : (intent.radius ?? 0);
  addShape3dObj(s, 'cone3d', 'co', intent.name ?? '', { baseCenter: baseId, apex: apexId, radius }, true, false);
};
```
`cylinder.ts`:
```ts
import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId, projectedRadius3d } from './_types';

export const buildCylinder: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'cylinder') return;
  const baseId = resolveId(s, intent.baseCenter);
  const topId = resolveId(s, intent.topCenter);
  const radius = intent.radiusTo != null
    ? projectedRadius3d(s, baseId, topId, resolveId(s, intent.radiusTo))
    : (intent.radius ?? 0);
  addShape3dObj(s, 'cylinder3d', 'cy', intent.name ?? '', { baseCenter: baseId, topCenter: topId, radius }, true, false);
};
```

- [ ] **Step 5: Run test + full builder/cone/cylinder suites + typecheck**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentToScene3d.radiusTo.test.ts` → PASS (3).
Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/cone.test.ts src/stamps/geometry-3d/ai/rules/__tests__/cylinder.test.ts src/stamps/geometry-3d/ai/rules/__tests__/coneSection.test.ts src/stamps/geometry-3d/ai/rules/__tests__/cylinderSection.test.ts` → PASS (Phase 4/5 standalone unchanged).
Run: `npm run typecheck` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-3d/ai/intent-builders/_types.ts src/stamps/geometry-3d/ai/intent-builders/cone.ts src/stamps/geometry-3d/ai/intent-builders/cylinder.ts src/stamps/geometry-3d/ai/__tests__/intentToScene3d.radiusTo.test.ts
git commit -m "feat(3d): cone/cylinder builder tính radius phái sinh từ radiusTo (resolve build-time, chiếu ⊥ trục; kind không đổi)"
```

---

# CYCLE B4 — Rule `inscribedRoundSolid` (nón/trụ nội-ngoại tiếp mặt)

### Task B4.1: Rule nón nội/ngoại tiếp mặt (Câu 70 chóp, 88c tứ diện)

**Files:**
- Create: `src/stamps/geometry-3d/ai/rules/inscribedRoundSolid.ts`
- Modify: `src/stamps/geometry-3d/ai/rules/registry.ts`
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/inscribedRoundSolid.cone.test.ts`

**Interfaces:**
- Consumes: `coneIntent` radiusTo (B3), `faceCircumcenter`/`centroid`, `midpoint`, `parsePyramidTolerant`, `solid`.
- Produces: `inscribedRoundSolidRule`. Nón: chóp host → centroid/faceCircumcenter baseCenter, apex từ "đỉnh X", radiusTo = midpoint cạnh (incircle) / đỉnh (circum).

- [ ] **Step 1: Write the failing test**

```ts
// inscribedRoundSolid.cone.test.ts
import { inscribedRoundSolidRule } from '../inscribedRoundSolid';
import { segmentClauses3D } from '../../deterministic/coverage3d';
function ctxOf(problem: string) { return { problem, clauses: segmentClauses3D(problem).filter((c) => c.hasGeometry) }; }
const find = (ms: any[], pred: (i: any) => boolean) => ms.flatMap((m) => m.intents).find(pred);

describe('inscribedRoundSolid — nón', () => {
  it('Câu 70: nón đỉnh S đáy nội tiếp tứ giác ABCD (chóp tứ giác đều) → cone radiusTo midpoint + centroid baseCenter + solid', () => {
    const p = 'Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng a. Thể tích khối nón có đỉnh S và đường tròn đáy nội tiếp tứ giác ABCD.';
    const ms = inscribedRoundSolidRule.match(ctxOf(p) as any);
    expect(ms.length).toBe(1);
    const ops = ms[0].intents.map((i: any) => i.op + (i.constraint ? '/' + i.constraint.kind : ''));
    expect(ops).toContain('solid');                       // chóp tứ giác đều → solidRule miss → tự vẽ
    expect(ops).toContain('cone');
    expect(ops).toContain('add-point-3d/centroid');       // tâm incircle = centroid (vuông)
    expect(ops).toContain('add-point-3d/midpoint');       // radiusTo = trung điểm cạnh
    const cone = find([ms[0]], (i) => i.op === 'cone');
    expect(cone.apex).toBe('S');
    expect(cone.radiusTo).toBeDefined();
  });

  it('Câu 88c: nón đỉnh O đáy ngoại tiếp tam giác ABC (tứ diện OABC) → faceCircumcenter + radiusTo=đỉnh, KHÔNG solid (solidRule vẽ tứ diện)', () => {
    const p = 'Cho tứ diện OABC có OA, OB, OC đôi một vuông góc. Diện tích xung quanh hình nón đỉnh O và đáy là đường tròn ngoại tiếp tam giác ABC.';
    const ms = inscribedRoundSolidRule.match(ctxOf(p) as any);
    expect(ms.length).toBe(1);
    const ops = ms[0].intents.map((i: any) => i.op + (i.constraint ? '/' + i.constraint.kind : ''));
    expect(ops).toContain('cone');
    expect(ops).toContain('add-point-3d/faceCircumcenter'); // ngoại tiếp → circumcenter
    expect(ops).not.toContain('solid');                     // tứ diện OABC → solidRule vẽ
    const cone = find([ms[0]], (i) => i.op === 'cone');
    expect(cone.apex).toBe('O');
    expect(cone.radiusTo).toBe('A');                        // circum: radiusTo = đỉnh mặt
  });

  it('incircle host KHÔNG đều → escalate (return [])', () => {
    const p = 'Cho hình chóp S.ABCD có đáy là hình bình hành. Khối nón đỉnh S đáy nội tiếp tứ giác ABCD.';
    expect(inscribedRoundSolidRule.match(ctxOf(p) as any).length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/inscribedRoundSolid.cone.test.ts`
Expected: FAIL — `inscribedRoundSolidRule` không tồn tại.

- [ ] **Step 3: Create `inscribedRoundSolid.ts` (cone branch first)**

```ts
import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import {
  coneIntent, cylinderIntent, addPoint3d, solid,
  splitVertexToken, pickCenter, parsePyramidTolerant, sectionNames,
} from './_shared';

const ROUND = /(?:hình|khối)\s*(nón|trụ)/iu;
const CONE_T = /(?:hình|khối)\s*nón/iu;
const INSCRIBED = /(?:nội|ngoại)\s*tiếp/iu;
const NGOAI = /ngoại\s*tiếp/iu;
const FACE = /(?:tam\s*giác|tứ\s*giác)\s+([A-Z]{3,4})(?![\p{L}])/u; // mặt định nghĩa đường tròn
const APEX = /đỉnh\s+([A-Z])(?![\p{L}])/u;
const CUBE = /lập\s*phương/iu;
const REGULAR = /(?:đều|hình\s*vuông|tứ\s*giác\s*đều|tam\s*giác\s*đều)/iu; // incircle=centroid hợp lệ
const TETRA = /tứ\s*diện(?:\s*đều)?\s+([A-Z]{4})(?![\p{L}])/u;

// Tâm đường tròn đáy: nội tiếp(mặt đều)→centroid, ngoại tiếp→faceCircumcenter.
// radiusTo: nội→midpoint(cạnh[0],cạnh[1]) (cần emit), ngoại→đỉnh[0] (trần).
function buildCircleBase(
  faceVerts: string[], circum: boolean, taken: string[],
): { centerName: string; radiusTo: string; intents: Intent3DT[] } {
  const centerName = pickCenter([...faceVerts, ...taken]);
  const intents: Intent3DT[] = [];
  if (circum) {
    intents.push(addPoint3d(centerName, { kind: 'faceCircumcenter', vertices: faceVerts }));
    return { centerName, radiusTo: faceVerts[0], intents };
  }
  intents.push(addPoint3d(centerName, { kind: 'centroid', vertices: faceVerts }));
  const [midName] = sectionNames(1, [...faceVerts, ...taken, centerName]);
  intents.push(addPoint3d(midName, { kind: 'midpoint', p1: faceVerts[0], p2: faceVerts[1] }));
  return { centerName, radiusTo: midName, intents };
}

export const inscribedRoundSolidRule: LanguageRule3D = {
  id: 'inscribedRoundSolid',
  priority: 46,
  languages: ['vi'],
  patterns: [/(?:hình|khối)\s*(?:nón|trụ)/iu, /(?:nội|ngoại)\s*tiếp/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    if (CUBE.test(ctx.problem)) return [];
    const c = ctx.clauses.find((cl) => ROUND.test(cl.text) && INSCRIBED.test(cl.text)
      && (/đường\s*tròn/iu.test(cl.text) || /đáy/iu.test(cl.text)));
    if (!c) return [];
    const faceM = FACE.exec(c.text);
    if (!faceM) return [];
    const faceVerts = splitVertexToken(faceM[1]);
    if (faceVerts.length < 3) return [];
    const circum = NGOAI.test(c.text);
    if (!circum && !REGULAR.test(ctx.problem)) return []; // incircle non-đều → defer faceIncenter
    const isCone = CONE_T.test(c.text);

    if (isCone) {
      const apexM = APEX.exec(c.text);
      if (!apexM) return [];
      const apex = apexM[1];
      const intents: Intent3DT[] = [];
      // Đảm bảo host vẽ: chóp tứ giác đều (solidRule miss) → tự emit; tứ diện → solidRule lo.
      const py = parsePyramidTolerant(ctx.problem);
      if (py && !py.solidRuleDraws) {
        intents.push(solid({
          flavor: 'pyramid', baseLabels: py.base,
          baseVariant: py.base.length === 4 ? 'square' : 'equilateral-triangle',
          apex: py.apex, apexVariant: 'regular',
        }));
      }
      const base = buildCircleBase(faceVerts, circum, [apex]);
      intents.push(...base.intents, coneIntent({ baseCenter: base.centerName, apex, radiusTo: base.radiusTo }));
      return [{ ruleId: this.id, clauseIds: [c.id], intents }];
    }

    return []; // trụ → Task B4.2
  },
};
```

- [ ] **Step 4: Register rule**

`registry.ts` — import + chèn cuối RULES:
```ts
import { inscribedRoundSolidRule } from './inscribedRoundSolid';
// ...
  insphereCubeRule,           // priority 47
  inscribedRoundSolidRule,    // priority 46
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/inscribedRoundSolid.cone.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Typecheck + commit**

Run: `npm run typecheck` → PASS.
```bash
git add src/stamps/geometry-3d/ai/rules/inscribedRoundSolid.ts src/stamps/geometry-3d/ai/rules/registry.ts src/stamps/geometry-3d/ai/rules/__tests__/inscribedRoundSolid.cone.test.ts
git commit -m "feat(3d): rule inscribedRoundSolid — nón nội/ngoại tiếp mặt (Câu 70 chóp incircle, 88c tứ diện circumcircle)"
```

---

### Task B4.2: Mở rộng rule — trụ nội/ngoại tiếp mặt (Câu 73/85 tứ diện, 75 lăng trụ)

**Files:**
- Modify: `src/stamps/geometry-3d/ai/rules/inscribedRoundSolid.ts` (nhánh trụ)
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/inscribedRoundSolid.cylinder.test.ts`

**Interfaces:**
- Produces: trụ — tứ diện host: baseCenter=center(face), topCenter=đỉnh đối diện. lăng trụ host: baseCenter=centroid(base), topCenter=centroid(top).

- [ ] **Step 1: Write the failing test**

```ts
// inscribedRoundSolid.cylinder.test.ts
import { inscribedRoundSolidRule } from '../inscribedRoundSolid';
import { segmentClauses3D } from '../../deterministic/coverage3d';
function ctxOf(problem: string) { return { problem, clauses: segmentClauses3D(problem).filter((c) => c.hasGeometry) }; }
const find = (ms: any[], pred: (i: any) => boolean) => ms.flatMap((m) => m.intents).find(pred);

describe('inscribedRoundSolid — trụ', () => {
  it('Câu 73: trụ đáy nội tiếp tam giác BCD (tứ diện đều ABCD) → topCenter = đỉnh đối diện A', () => {
    const p = 'Cho tứ diện đều ABCD có cạnh bằng 4. Diện tích xung quanh hình trụ có một đường tròn đáy là đường tròn nội tiếp tam giác BCD và chiều cao bằng chiều cao của tứ diện.';
    const ms = inscribedRoundSolidRule.match(ctxOf(p) as any);
    expect(ms.length).toBe(1);
    const cyl = find([ms[0]], (i) => i.op === 'cylinder');
    expect(cyl).toBeDefined();
    expect(cyl.topCenter).toBe('A');                       // đỉnh đối diện mặt BCD
    const ops = ms[0].intents.map((i: any) => i.constraint?.kind).filter(Boolean);
    expect(ops).toContain('centroid');                     // incircle equilateral = centroid
    expect(ops).toContain('midpoint');                     // radiusTo
  });

  it('Câu 85: trụ đáy ngoại tiếp tam giác BCD → faceCircumcenter + radiusTo đỉnh', () => {
    const p = 'Cho tứ diện đều ABCD có cạnh bằng a. Diện tích xung quanh hình trụ có đáy là đường tròn ngoại tiếp tam giác BCD và có chiều cao bằng chiều cao của tứ diện.';
    const ms = inscribedRoundSolidRule.match(ctxOf(p) as any);
    const cyl = find([ms[0]], (i) => i.op === 'cylinder');
    expect(cyl.topCenter).toBe('A');
    expect(cyl.radiusTo).toBe('B');                        // circum: đỉnh đầu mặt BCD
    expect(ms[0].intents.map((i: any) => i.constraint?.kind)).toContain('faceCircumcenter');
  });

  it('Câu 75: trụ hai đáy nội tiếp lăng trụ đều ABC.A′B′C′ → 2 centroid (base+top)', () => {
    const p = 'Cho hình lăng trụ đều ABC.A′B′C′ có cạnh đáy bằng a. Thể tích hình trụ có hai đáy nội tiếp tam giác ABC và tam giác A′B′C′.';
    const ms = inscribedRoundSolidRule.match(ctxOf(p) as any);
    const cyl = find([ms[0]], (i) => i.op === 'cylinder');
    expect(cyl).toBeDefined();
    const centroids = ms[0].intents.filter((i: any) => i.constraint?.kind === 'centroid');
    expect(centroids.length).toBe(2);                      // tâm 2 đáy
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/inscribedRoundSolid.cylinder.test.ts`
Expected: FAIL — nhánh trụ `return []`.

- [ ] **Step 3: Implement cylinder branch**

Thay `return []; // trụ → Task B4.2` bằng:
```ts
    // ── Trụ ──
    const PRISM = /lăng\s*trụ(?:\s*đều)?\s+([A-Z]{3,4})\.((?:[A-Z]['′])+)/u;
    const prismM = PRISM.exec(ctx.problem);
    if (prismM) {
      // Lăng trụ: 2 đáy = base (prismM[1]) + top (prismM[2]). baseCenter/topCenter = centroid/faceCircumcenter mỗi đáy.
      const baseVerts = splitVertexToken(prismM[1]);
      const topVerts = splitVertexToken(prismM[2]);
      const bc = buildCircleBase(baseVerts, circum, []);
      const tcName = pickCenter([...baseVerts, ...topVerts, bc.centerName, bc.radiusTo]);
      const intents: Intent3DT[] = [...bc.intents];
      intents.push(circum
        ? addPoint3d(tcName, { kind: 'faceCircumcenter', vertices: topVerts })
        : addPoint3d(tcName, { kind: 'centroid', vertices: topVerts }));
      intents.push(cylinderIntent({ baseCenter: bc.centerName, topCenter: tcName, radiusTo: bc.radiusTo }));
      return [{ ruleId: this.id, clauseIds: [c.id], intents }];
    }
    const tetraM = TETRA.exec(ctx.problem);
    if (tetraM) {
      // Tứ diện đều: trụ đáy = đường tròn trên mặt face; topCenter = đỉnh đối diện (chiếu xuống tâm mặt).
      const baseV = splitVertexToken(tetraM[1]);
      const opp = baseV.find((v) => !faceVerts.includes(v));
      if (!opp) return [];
      const bc = buildCircleBase(faceVerts, circum, [opp]);
      return [{ ruleId: this.id, clauseIds: [c.id], intents: [
        ...bc.intents, cylinderIntent({ baseCenter: bc.centerName, topCenter: opp, radiusTo: bc.radiusTo }),
      ] }];
    }
    return [];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/inscribedRoundSolid.cylinder.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck` → PASS.
```bash
git add src/stamps/geometry-3d/ai/rules/inscribedRoundSolid.ts src/stamps/geometry-3d/ai/rules/__tests__/inscribedRoundSolid.cylinder.test.ts
git commit -m "feat(3d): inscribedRoundSolid nhánh trụ — tứ diện (đỉnh đối) + lăng trụ (2 centroid đáy)"
```

---

### Task B4.3: Co-firing guards + update Phase 4 test

**Files:**
- Modify: `src/stamps/geometry-3d/ai/rules/__tests__/solidsCofire.test.ts` (:32-36 — Phase 4 "cone=0 deferred" giờ flip)
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/roundSolidCofire.test.ts` (MỚI)

**Interfaces:**
- Consumes: tất cả rule (runRules3D).
- Produces: đảm bảo đúng 1 nón/trụ + 1 host + 0 cầu sai cho mỗi đề target; standalone Phase 4/5 không regress.

- [ ] **Step 1: Update Phase 4 solidsCofire test (cone now fires)**

`solidsCofire.test.ts` — đổi test cuối (`:32-36`):
```ts
  it('chóp + nón nội tiếp (Phase 5b): solid fires + cone nội tiếp fires (inscribedRoundSolid)', () => {
    const p = 'Cho hình chóp S.ABCD. Khối nón có đỉnh S và đường tròn đáy nội tiếp hình vuông ABCD.';
    expect(count(p, 'cone')).toBe(1);  // inscribedRoundSolid (cone cũ vẫn bail INSCRIBED)
    expect(count(p, 'solid')).toBe(1); // solidRule vẽ chóp (bare named)
  });
```

- [ ] **Step 2: Write the failing co-fire test**

```ts
// roundSolidCofire.test.ts
import { runRules3D } from '../registry';
import { segmentClauses3D } from '../../deterministic/coverage3d';
function ctxOf(problem: string) { return { problem, clauses: segmentClauses3D(problem).filter((c) => c.hasGeometry) }; }
const count = (p: string, op: string) =>
  runRules3D(ctxOf(p)).flatMap((m) => m.intents).filter((i: any) => i.op === op).length;

describe('inscribedRoundSolid co-firing', () => {
  it('Câu 73 trụ nội tiếp tứ diện: 1 cylinder + 1 solid(tetra) + 0 sphere/cone', () => {
    const p = 'Cho tứ diện đều ABCD. Hình trụ có một đường tròn đáy là đường tròn nội tiếp tam giác BCD và chiều cao bằng chiều cao của tứ diện.';
    expect(count(p, 'cylinder')).toBe(1);
    expect(count(p, 'solid')).toBe(1);
    expect(count(p, 'sphere')).toBe(0);
    expect(count(p, 'cone')).toBe(0);
  });

  it('Câu 70 nón nội tiếp chóp tứ giác đều: 1 cone + 1 solid (tự vẽ) + 0 sphere', () => {
    const p = 'Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng a. Khối nón có đỉnh S và đường tròn đáy nội tiếp tứ giác ABCD.';
    expect(count(p, 'cone')).toBe(1);
    expect(count(p, 'solid')).toBe(1);
    expect(count(p, 'sphere')).toBe(0);
  });

  it('mặt cầu nội tiếp chóp KHÔNG kích inscribedRoundSolid (chủ-ngữ cầu, không nón/trụ)', () => {
    const p = 'Cho hình chóp tứ giác đều S.ABCD. Mặt cầu nội tiếp hình chóp S.ABCD.';
    expect(count(p, 'cone')).toBe(0);
    expect(count(p, 'cylinder')).toBe(0);
    expect(count(p, 'sphere')).toBe(1); // insphereOfPyramid
  });

  it('standalone Phase 4 nón/trụ KHÔNG kích inscribedRoundSolid', () => {
    expect(count('Cho hình nón đỉnh S có chiều cao h.', 'cone')).toBe(1);   // coneRule, không inscribed
    expect(count('Cho hình trụ có thiết diện qua trục là hình vuông.', 'cylinder')).toBe(1);
  });

  it('lập phương + mặt cầu nội tiếp KHÔNG kích inscribedRoundSolid (insphereCube lo)', () => {
    const p = 'Mặt cầu nội tiếp hình lập phương cạnh a.';
    expect(count(p, 'cone')).toBe(0);
    expect(count(p, 'cylinder')).toBe(0);
  });
});
```

- [ ] **Step 3: Run tests to verify**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/roundSolidCofire.test.ts src/stamps/geometry-3d/ai/rules/__tests__/solidsCofire.test.ts`
Expected: PASS. Nếu FAIL (vd cone/cylinder cũ co-fire, hoặc circumsphere fire trên đề trụ-ngoại-tiếp) → siết guard trong `inscribedRoundSolid.ts` / xác nhận cone/cylinder cũ vẫn bail (`|| INSCRIBED.test`). circumsphere chỉ fire khi "ngoại tiếp"+"cầu" cùng clause → đề "trụ ngoại tiếp tam giác" không "cầu" → an toàn.

- [ ] **Step 4: Commit**

```bash
git add src/stamps/geometry-3d/ai/rules/__tests__/solidsCofire.test.ts src/stamps/geometry-3d/ai/rules/__tests__/roundSolidCofire.test.ts
git commit -m "test(3d): co-fire inscribedRoundSolid (1 nón/trụ + 1 host + 0 cầu sai) + update Phase 4 deferred test"
```

---

### Task B4.4: B4 integration — e2e + diag gate + MCP visual

**Files:**
- Modify: `tests/e2e/geometry-3d-figure.spec.ts` (+nón-incircle, +trụ-incircle, +trụ-circumcircle)

- [ ] **Step 1: Add e2e tests**

Cuối `geometry-3d-figure.spec.ts` (sau test B1 insphere chóp):
```ts
// Nón nội tiếp chóp (Câu 70): chóp 5 mặt + nón faceted (≥8 polygon3d) → ≥13 polygon3d.
test('renders an inscribed cone for a nón đáy nội tiếp problem', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await expect(page.locator('[data-testid="dropdown-menu-button"]').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('[data-testid="dropdown-menu-button"]').first().click();
  await page.locator('[data-testid="stamp-toolbar-geometry3d"]').click();
  await expect(page.locator('[data-testid="mini-board-3d"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => !!(window as any).JXG, undefined, { timeout: 10_000 });
  await page.locator('[data-testid="ai-generate-3d-input"]').fill(
    'Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng a. Thể tích khối nón có đỉnh S và đường tròn đáy nội tiếp tứ giác ABCD.',
  );
  await page.locator('[data-testid="ai-generate-3d-btn"]').click();
  await page.waitForFunction(() => {
    const JXG = (window as any).JXG;
    if (!JXG?.boards) return false;
    for (const b of Object.values(JXG.boards) as any[]) {
      const polys = Object.values(b.objects).filter((o: any) => o.elType === 'polygon3d');
      if (polys.length >= 13) return true; // chóp 5 + nón faceted ≥8
    }
    return false;
  }, undefined, { timeout: 8_000 });
  expect(errors.join('\n')).not.toMatch(/cone3d|polygon3d|Cannot read|undefined is not/i);
});

// Trụ nội tiếp tứ diện (Câu 73): tetra 4 mặt + trụ faceted (≥8) → ≥12 polygon3d.
test('renders an inscribed cylinder for a trụ đáy nội tiếp tam giác problem', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await expect(page.locator('[data-testid="dropdown-menu-button"]').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('[data-testid="dropdown-menu-button"]').first().click();
  await page.locator('[data-testid="stamp-toolbar-geometry3d"]').click();
  await expect(page.locator('[data-testid="mini-board-3d"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => !!(window as any).JXG, undefined, { timeout: 10_000 });
  await page.locator('[data-testid="ai-generate-3d-input"]').fill(
    'Cho tứ diện đều ABCD có cạnh bằng 4. Hình trụ có một đường tròn đáy là đường tròn nội tiếp tam giác BCD và chiều cao bằng chiều cao của tứ diện.',
  );
  await page.locator('[data-testid="ai-generate-3d-btn"]').click();
  await page.waitForFunction(() => {
    const JXG = (window as any).JXG;
    if (!JXG?.boards) return false;
    for (const b of Object.values(JXG.boards) as any[]) {
      const cyls = Object.values(b.objects).filter((o: any) => o.elType === 'cylinder3d');
      const polys = Object.values(b.objects).filter((o: any) => o.elType === 'polygon3d');
      if (polys.length >= 12 || cyls.length >= 1) return true;
    }
    return false;
  }, undefined, { timeout: 8_000 });
  expect(errors.join('\n')).not.toMatch(/cylinder3d|polygon3d|Cannot read|undefined is not/i);
});
```

- [ ] **Step 2: Run e2e**

Run: `npx playwright test tests/e2e/geometry-3d-figure.spec.ts -g "inscribed cone|inscribed cylinder"`
Expected: PASS (2 tests).

- [ ] **Step 3: MCP visual verify (BẮT BUỘC — 3 construct)**

`npm run demo` → Playwright MCP, lần lượt:
1. Câu 70 nón nội tiếp chóp: nón cam NẰM TRONG chóp, vành đáy nón **nội tiếp** (tiếp xúc trong) hình vuông đáy, đỉnh nón ≡ đỉnh chóp S.
2. Câu 73 trụ nội tiếp tứ diện: trụ đứng trên mặt BCD, vành đáy **nội tiếp** tam giác BCD, đỉnh trên ≡ đỉnh A.
3. Câu 85 trụ ngoại tiếp: vành đáy **đi qua 3 đỉnh** tam giác BCD (ngoại tiếp).
Trích toạ độ JXG đo radius ≈ inradius/circumradius mặt. Cầu/nón thò/lệch → STOP debug.

- [ ] **Step 4: diag 0-regression gate**

Run: `npx tsx scripts/diag-all-3d.ts`
Expected: ss-thietdien 30/176/35 + vuonggoc 122/189/57 **flat**; tron-xoay FULL ≥34, NONE ≤30 (70/75 NONE→PARTIAL/FULL). Verify 73/85 vẫn FULL (clause câu hỏi bị drop → rule không fire trong diag → 0-regression). Bất kỳ dataset nào FULL giảm / NONE tăng → STOP.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/geometry-3d-figure.spec.ts
git commit -m "test(3d): e2e + MCP render-verify nón/trụ nội-ngoại tiếp mặt (Phase 5b B4 gate)"
```

---

# GATE CUỐI

### Task FINAL: Full suite + tsc + diag + adversarial review + memory + merge

- [ ] **Step 1: Full jest 3D + toàn dự án**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d src/core/scene/kinds/__tests__`
Expected: TẤT CẢ xanh (incl. Phase 1-5 không regress).
Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 2: diag baseline diff**

Run: `npx tsx scripts/diag-all-3d.ts`
Ghi lại số. ss-thietdien + vuonggoc **flat** vs 30/176/35 + 122/189/57. tron-xoay FULL ≥34, NONE ≤30.
Spot-check: `npx tsx scripts/dbg-bai-3d.ts tron-xoay 70`, `... 75`, `... 21` — xác nhận construct emit đúng (cone/cylinder/sphere + center kind).

- [ ] **Step 3: Adversarial review (subagent)**

Dispatch subagent (Agent tool, general-purpose) review diff `git diff main...HEAD`: tìm (a) co-fire leak (rule mới fire nhầm dataset khác / circumsphere-insphereCube collision), (b) regex `[A-Z]` blanket /i, (c) `new RegExp` chưa escapeRe, (d) verify vacuous, (e) nhãn synth có `_`/digit, (f) topo ordering (apex PRODUCE_KEY skip), (g) math edge case (denom≈0, collinear). Vá NIT/BUG → diag lại identical.

- [ ] **Step 4: Playwright full 3D e2e**

Run: `npx playwright test tests/e2e/geometry-3d-figure.spec.ts`
Expected: TẤT CẢ xanh (9 cũ + 3 mới = 12).

- [ ] **Step 5: Update memory**

Cập nhật `project_ai_3d_v2_pipeline.md` (block "PHASE 5b HOÀN TẤT" — kiến trúc C-refined radius, 2 constraint mới, gotcha solidRule-pyramid-qualifier-miss + parsePyramidTolerant + consumesOf-apex-skip, kết quả diag, honest-metric) + `MEMORY.md` 1 dòng pointer (nếu cần). Cập nhật `CLAUDE.md` gotchas nếu có bug-class mới.

- [ ] **Step 6: Merge main + push (standing authorization) HOẶC giữ nhánh nếu user yêu cầu review**

```bash
git checkout main && git merge --ff-only feat/3d-foundation && git push origin main
```
(Nếu user yêu cầu review trước → giữ nhánh, báo cáo gate xanh.)

---

## Self-Review (đã chạy)

- **Spec coverage:** B1↔§3, B2↔§4, B3↔§5, B4↔§6, verify↔§8, gate↔§10. ✓ Cycle B (74 inverse) + faceIncenter + 88c-truncate đều DEFER §11 (ngoài Mức 2). ✓
- **Type consistency:** constraint kinds (`pyramidInsphereCenter{apex,vertices}`, `faceCircumcenter{vertices}`) khớp giữa union/refs/math/verify/rule. `coneIntent`/`cylinderIntent` signature thống nhất (radius?, radiusTo?). `parsePyramidTolerant` return shape khớp B1.3↔B4.1. `buildCircleBase` return {centerName, radiusTo, intents} dùng nhất quán cone+cylinder. ✓
- **Placeholder scan:** Không TBD. Mọi step có code/command thật. 2 chỗ "kiểm/điều chỉnh nếu khác" (intentToScene3d signature B3.2-step1; `solid` re-export B1.3-step3) là verify-at-exec hợp lệ (đọc file mẫu cạnh đó), không phải placeholder logic.
- **Gotcha đã ghi:** solidRule-pyramid-qualifier-miss (B1.3/B4.1), consumesOf-apex-PRODUCE_KEY-skip (Global/spec §5.2), verify-không-vacuous (B1.2/B2.2), MCP-bắt-buộc (B1.4/B4.4).
