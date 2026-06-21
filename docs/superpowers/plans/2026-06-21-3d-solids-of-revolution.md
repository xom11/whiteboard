# Phase 4 — Mặt cầu ngoại tiếp + Khối nón/trụ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pipeline dựng hình 3D vẽ được mặt cầu ngoại tiếp khối đa diện + khối nón/trụ standalone từ đề tiếng Việt (deterministic, no-LLM).

**Architecture:** Text → rules3d → Intent3DT[] → intentToScene3d → Scene State → JxgRenderer3D. Cycle A (mặt cầu): constraint core mới `circumsphereCenter` + op `sphere`. Cycle B (nón/trụ): op `cone`/`cylinder` (1:1 scene kind đã render). KHÔNG tầng DSL.

**Tech Stack:** TypeScript strict, zod (Intent3DZ discriminatedUnion), Jest 29 + ts-jest, Playwright (render-verify), JSXGraph 3D.

## Global Constraints

- **Regex Việt**: cờ `u` + lookaround `(?![\p{L}])` thay `\b`. Cue/prefilter `/iu` (HOA đầu câu); regex CAPTURE `[A-Z]` GIỮ `/u` strict (blanket `/i` → `[A-Z]` khớp thường = nhãn sai).
- **escapeRe** mọi `new RegExp(\`…${name}…\`)` — crash-class "Unterminated group".
- **Nhãn điểm synth HIỂN THỊ**: single-letter non-digit non-`_` (O/I/J/K/S/T) — `_`/digit → JSXGraph `text.display='internal'` render `<sub>` literal trong SVG.
- **Registry-dispatch**: op mới → entry `OP_BUILDERS_3D` (compile-forced) + case `producesOf` (exhaustive-forced).
- **0-regression (HARD GATE)**: FULL KHÔNG giảm, NONE KHÔNG tăng trên mọi dataset (`npx tsx scripts/diag-all-3d.ts`). Baseline @971ce8d: ss-thietdien 30/176/35, vuonggoc 122/189/57, **tron-xoay 16/30/43**, TOTAL 168/395/135.
- **Fail-soft**: helper/rule return/skip thay vì throw; builder throw chỉ khi ref không resolve; verify wrap try/catch.
- **RULE CO-FIRING**: `runRules3D` chạy MỌI rule khớp + nối intents (KHÔNG first-match-wins), dedup JSON.stringify. Rule mới phải guard clause sibling sở hữu; test co-fire ở `runRules3D` level (count `.toBe(N)`).
- **Worktree jest**: `npx jest -c jest.worktree.config.js <path>` (base config ignore `/.claude/worktrees/`). Playwright: vite từ worktree cổng riêng.
- Commit message tiếng Việt, prefix tiếng Anh (feat/fix/test/docs), **KHÔNG** Co-Authored-By.

## Verified substrate facts (do not re-derive)

- `Intent3DZ = z.discriminatedUnion('op',[Solid,AddPoint3D,Plane3D,Line3D,Connect3D,CrossSection])` — `intent.ts:57`. `Label3DZ = /^[A-Za-z][A-Za-z0-9'′’´_]*$/` `:5`.
- `OP_BUILDERS_3D: Record<Intent3DT['op'],IntentBuilder3D>` — `intent-builders/registry.ts:10`. `producesOf` exhaustive switch — `intentTopo3d.ts:4`. `PRODUCE_KEYS` `:25` KHÔNG chứa center/surfacePoint/baseCenter/apex/topCenter/radius.
- `buildAddPoint3d` REF_FIELDS có `vertices` array resolve element-wise → `circumsphereCenter{vertices}` resolve label→id miễn phí.
- `Constraint3D` union + `constraintRefs` never-guard — `3d-constraint.ts:4,28` (`centroid` `:35` mirror). `constraintToWorld` switch `constraint3d-math.ts:218`; `worldToConstraint` switch + never-guard `:313`; helper `dot/sub/add/norm` `:19-26`; `centroid` math `:269`.
- `addShape3dObj(s,kind,prefix,label,attrs,visible=true,registerInNameMap=true)` `_types.ts:46`; `addPoint3dObj(s,label,constraint)` `:24`; `resolveId(s,name)` `:18`. buildSolid emit `registerInNameMap=false` `solid.ts:21`.
- `sphere3d{center,surfacePoint,color?}` `kinds/sphere3d.ts:6`; `cone3d{baseCenter,apex,radius,color?}` `:5`; `cylinder3d{baseCenter,topCenter,radius,color?}` `:5` — render đã có, registered qua `kinds/index.ts`.
- `verifyFigure3d` lặp `point3d` `:24` + loop `polygon3d` `:133`; `ptWorld(state,id)` `:5`. Kind sphere3d/cone3d/cylinder3d CHƯA verify.
- `parseSolidHead3D(problem)` `_shared.ts:30`; `splitVertexToken` `:19`; `escapeRe` `:3`; `baseFaceOf` `:40`. `solidRule` claims geoIds[0] `solid.ts:51`; `baseVariantFrom` `:14`.
- `runDeterministicIntents3d` coverage all-or-nothing; `tryPartial3d` (diag PARTIAL). `tryDeterministicFigure3d` gate: no-match/incomplete-coverage → build-throw → verify-fail → named-missing.

## File Structure

```
src/core/scene/kinds/
  3d-constraint.ts            MODIFY  + circumsphereCenter (union + constraintRefs)
  constraint3d-math.ts        MODIFY  + constraintToWorld case + worldToConstraint case + solve3 helper
src/stamps/geometry-3d/ai/
  intent.ts                   MODIFY  + Sphere/Cone/Cylinder Zod variant + union + 3 factory
  rules/_shared.ts            MODIFY  + re-export sphereIntent/coneIntent/cylinderIntent
  intentTopo3d.ts             MODIFY  + 3 producesOf case
  intent-builders/
    sphere.ts                 CREATE  buildSphere
    cone.ts                   CREATE  buildCone
    cylinder.ts               CREATE  buildCylinder
    registry.ts               MODIFY  + 3 entry
  rules/
    circumsphere.ts           CREATE  circumsphere rule (priority 50)
    cone.ts                   CREATE  cone rule (priority 49)
    cylinder.ts               CREATE  cylinder rule (priority 48)
    registry.ts               MODIFY  + 3 import + 3 RULES entry
  deterministic/vocabulary3d.ts  MODIFY  + 5 keyword
  verify3d.ts                 MODIFY  + circumsphereCenter check + 3 shape loop
  __tests__/
    intentToScene3d.solids.test.ts   CREATE
    verify3d.solids.test.ts          CREATE
  rules/__tests__/
    circumsphere.test.ts             CREATE
    cone.test.ts                     CREATE
    cylinder.test.ts                 CREATE
    solidsCofire.test.ts             CREATE
src/core/scene/kinds/__tests__/
  constraint3d-math.circumsphere.test.ts  CREATE
tests/e2e/geometry-3d-figure.spec.ts       MODIFY  + sphere/cone/cylinder render-verify
```

---

## Task 1: Constraint `circumsphereCenter` (core kind + math)

**Files:**
- Modify: `src/core/scene/kinds/3d-constraint.ts`
- Modify: `src/core/scene/kinds/constraint3d-math.ts`
- Test: `src/core/scene/kinds/__tests__/constraint3d-math.circumsphere.test.ts`

**Interfaces:**
- Produces: `Constraint3D` variant `{ kind: 'circumsphereCenter'; vertices: string[] }`; `constraintToWorld` returns center cách đều mọi vertex.

- [ ] **Step 1: Write the failing test**

```ts
// src/core/scene/kinds/__tests__/constraint3d-math.circumsphere.test.ts
import type { State, SceneObject } from '../../types';
import { constraintToWorld } from '../constraint3d-math';

function freePt(id: string, x: number, y: number, z: number): SceneObject {
  return { id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { constraint: { kind: 'free', x, y, z } } } as SceneObject;
}
function stateOf(pts: SceneObject[]): State {
  const objects: Record<string, SceneObject> = {};
  for (const p of pts) objects[p.id] = p;
  return { objects, order: pts.map((p) => p.id), counter: pts.length, meta: { domain: '3d' } } as unknown as State;
}

describe('circumsphereCenter', () => {
  it('tâm cách đều 4 đỉnh không đồng phẳng', () => {
    // (0,0,0),(2,0,0),(0,2,0),(0,0,2) → tâm (1,1,1), R=√3
    const st = stateOf([freePt('a', 0, 0, 0), freePt('b', 2, 0, 0), freePt('c', 0, 2, 0), freePt('d', 0, 0, 2)]);
    const w = constraintToWorld({ kind: 'circumsphereCenter', vertices: ['a', 'b', 'c', 'd'] } as any, st);
    expect(w[0]).toBeCloseTo(1, 9);
    expect(w[1]).toBeCloseTo(1, 9);
    expect(w[2]).toBeCloseTo(1, 9);
    const r = (p: number[]) => Math.hypot(w[0] - p[0], w[1] - p[1], w[2] - p[2]);
    for (const p of [[0, 0, 0], [2, 0, 0], [0, 2, 0], [0, 0, 2]]) expect(r(p)).toBeCloseTo(Math.sqrt(3), 9);
  });

  it('det suy biến (4 điểm đồng phẳng) → fail-soft hữu hạn', () => {
    const st = stateOf([freePt('a', 0, 0, 0), freePt('b', 2, 0, 0), freePt('c', 0, 2, 0), freePt('d', 2, 2, 0)]);
    const w = constraintToWorld({ kind: 'circumsphereCenter', vertices: ['a', 'b', 'c', 'd'] } as any, st);
    expect(w.every((n) => Number.isFinite(n))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/core/scene/kinds/__tests__/constraint3d-math.circumsphere.test.ts`
Expected: FAIL — `constraintToWorld` không có case `circumsphereCenter` (TS narrow `never`, hoặc trả undefined → runtime error).

- [ ] **Step 3a: Add union + constraintRefs case** in `src/core/scene/kinds/3d-constraint.ts`

Thêm vào `Constraint3D` union (sau dòng `perpFootPlane`, đổi `;` cuối dòng cũ thành `|`):

```ts
  // Tâm mặt cầu ngoại tiếp N đỉnh (cách đều mọi đỉnh — least-squares).
  | { kind: 'circumsphereCenter'; vertices: string[] };
```

Thêm vào `constraintRefs` switch (cạnh case `centroid`):

```ts
    case 'circumsphereCenter': return [...c.vertices];
```

- [ ] **Step 3b: Add math** in `src/core/scene/kinds/constraint3d-math.ts`

Thêm helper THUẦN (sau `lineLineClosestMidpoint`, trước `constraintToWorld`):

```ts
// Giải hệ 3×3 M·x = b bằng Cramer. |det|<1e-9 → null (suy biến).
function solve3(M: number[][], b: Vec3): Vec3 | null {
  const det =
    M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
    M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
    M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
  if (Math.abs(det) < 1e-9) return null;
  const col = (j: number): Vec3 => {
    const A = M.map((r) => r.slice());
    for (let i = 0; i < 3; i++) A[i][j] = b[i];
    return [
      A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
        A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
        A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]),
      0, 0,
    ];
  };
  return [col(0)[0] / det, col(1)[0] / det, col(2)[0] / det];
}
```

Thêm case vào `constraintToWorldInner` switch (sau case `centroid`):

```ts
    case 'circumsphereCenter': {
      const P = c.vertices.map((id) => getPointWorld(id, state));
      if (P.length < 4) return P.length ? P[0] : [0, 0, 0];
      const p0 = P[0];
      const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      const rhs: Vec3 = [0, 0, 0];
      for (let i = 1; i < P.length; i++) {
        const r: Vec3 = [2 * (P[i][0] - p0[0]), 2 * (P[i][1] - p0[1]), 2 * (P[i][2] - p0[2])];
        const bi = dot(P[i], P[i]) - dot(p0, p0);
        for (let a = 0; a < 3; a++) {
          for (let bcol = 0; bcol < 3; bcol++) M[a][bcol] += r[a] * r[bcol];
          rhs[a] += r[a] * bi;
        }
      }
      const sol = solve3(M, rhs);
      if (sol) return sol;
      // Suy biến → trung bình đỉnh (hữu hạn).
      let acc: Vec3 = [0, 0, 0];
      for (const p of P) acc = add(acc, p);
      return scale(acc, 1 / P.length);
    }
```

Thêm case vào `worldToConstraint` switch (cạnh các case derived `midpoint`/`centroid`/…):

```ts
    case 'circumsphereCenter':
```
(thêm dòng này vào nhóm fall-through trả `return current;` cùng midpoint/centroid — điểm phái sinh, không kéo.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/core/scene/kinds/__tests__/constraint3d-math.circumsphere.test.ts`
Expected: PASS (2)

- [ ] **Step 5: Run constraint regression**

Run: `npx jest -c jest.worktree.config.js src/core/scene/kinds/__tests__/`
Expected: PASS (all — đặc biệt constraint3d-math.test.ts, constraint3d-math không regress; tsc never-guard ok).

- [ ] **Step 6: Commit**

```bash
git add src/core/scene/kinds/3d-constraint.ts src/core/scene/kinds/constraint3d-math.ts src/core/scene/kinds/__tests__/constraint3d-math.circumsphere.test.ts
git commit -m "feat(3d): constraint circumsphereCenter (tâm cách đều N đỉnh, least-squares)"
```

---

## Task 2: Op `sphere` (Zod + builder + registry + topo)

**Files:**
- Modify: `src/stamps/geometry-3d/ai/intent.ts`
- Modify: `src/stamps/geometry-3d/ai/rules/_shared.ts`
- Create: `src/stamps/geometry-3d/ai/intent-builders/sphere.ts`
- Modify: `src/stamps/geometry-3d/ai/intent-builders/registry.ts`
- Modify: `src/stamps/geometry-3d/ai/intentTopo3d.ts`
- Test: `src/stamps/geometry-3d/ai/__tests__/intentToScene3d.solids.test.ts`

**Interfaces:**
- Consumes: `circumsphereCenter` constraint (Task 1); `addPoint3d` factory.
- Produces: `sphereIntent({ name?, center, surfacePoint })`; scene `sphere3d{center,surfacePoint}` object.

- [ ] **Step 1: Write the failing test**

```ts
// src/stamps/geometry-3d/ai/__tests__/intentToScene3d.solids.test.ts
import { intentToScene3d } from '../intentToScene3d';
import { solid, addPoint3d, sphereIntent } from '../intent';

describe('intentToScene3d — sphere', () => {
  it('mặt cầu ngoại tiếp tứ diện: sphere3d + tâm cách đều', () => {
    const st = intentToScene3d([
      solid({ flavor: 'tetrahedron', baseLabels: ['A', 'B', 'C'], baseVariant: 'equilateral-triangle', apex: 'D', apexVariant: 'regular' }),
      addPoint3d('O', { kind: 'circumsphereCenter', vertices: ['A', 'B', 'C', 'D'] }),
      sphereIntent({ center: 'O', surfacePoint: 'A' }),
    ]);
    const objs = Object.values(st.objects);
    const sph = objs.find((o) => o.kind === 'sphere3d');
    expect(sph).toBeDefined();
    const center = objs.find((o) => o.label === 'O');
    expect(center).toBeDefined();
    // sphere3d refs trỏ id điểm hợp lệ (không phải nhãn thô)
    const a = (sph!.attrs as any);
    expect(st.objects[a.center]).toBeDefined();
    expect(st.objects[a.surfacePoint]).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentToScene3d.solids.test.ts`
Expected: FAIL — `sphereIntent` không export / `Intent3DZ.parse` ném op 'sphere' không hợp lệ.

- [ ] **Step 3a: Add Zod variant + factory** in `intent.ts`

Sau `CrossSectionIntentZ` (dòng `:55`), thêm:

```ts
const SphereIntentZ = z.object({
  op: z.literal('sphere'),
  name: Label3DZ.optional(),
  center: Label3DZ,
  surfacePoint: Label3DZ,
});
```

Thêm `SphereIntentZ` vào array `z.discriminatedUnion('op', [ … , SphereIntentZ ])`.

Thêm factory (cuối file):

```ts
export function sphereIntent(spec: { name?: string; center: string; surfacePoint: string }): Intent3DT {
  return { op: 'sphere', ...spec } as Intent3DT;
}
```

- [ ] **Step 3b: Re-export** in `rules/_shared.ts` dòng 1 — thêm `sphereIntent`:

```ts
export { solid, addPoint3d, plane3d, line3dIntent, connect3d, crossSection3d, sphereIntent } from '../intent';
```

- [ ] **Step 3c: Builder** `intent-builders/sphere.ts` (CREATE):

```ts
import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId } from './_types';

export const buildSphere: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'sphere') return;
  addShape3dObj(s, 'sphere3d', 'sp', intent.name ?? '', {
    center: resolveId(s, intent.center),
    surfacePoint: resolveId(s, intent.surfacePoint),
  }, true, false);
};
```

- [ ] **Step 3d: Register** `intent-builders/registry.ts` — import + entry:

```ts
import { buildSphere } from './sphere';
// trong OP_BUILDERS_3D:
  sphere: buildSphere,
```

- [ ] **Step 3e: topo** `intentTopo3d.ts` `producesOf` switch — thêm case:

```ts
    case 'sphere': return i.name ? [i.name] : [];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentToScene3d.solids.test.ts`
Expected: PASS (1)

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/intent.ts src/stamps/geometry-3d/ai/rules/_shared.ts src/stamps/geometry-3d/ai/intent-builders/sphere.ts src/stamps/geometry-3d/ai/intent-builders/registry.ts src/stamps/geometry-3d/ai/intentTopo3d.ts src/stamps/geometry-3d/ai/__tests__/intentToScene3d.solids.test.ts
git commit -m "feat(3d-ai): op sphere (sphere3d từ tâm circumsphereCenter + 1 đỉnh)"
```

---

## Task 3: Rule `circumsphere` + vocabulary

**Files:**
- Create: `src/stamps/geometry-3d/ai/rules/circumsphere.ts`
- Modify: `src/stamps/geometry-3d/ai/rules/registry.ts`
- Modify: `src/stamps/geometry-3d/ai/deterministic/vocabulary3d.ts`
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/circumsphere.test.ts`

**Interfaces:**
- Consumes: `sphereIntent`, `addPoint3d`, `parseSolidHead3D`, `splitVertexToken` (Task 2 + _shared).
- Produces: `circumsphereRule: LanguageRule3D` (id `'circumsphere'`, priority 50).

- [ ] **Step 1: Write the failing test**

```ts
// src/stamps/geometry-3d/ai/rules/__tests__/circumsphere.test.ts
import { circumsphereRule } from '../circumsphere';
import { runDeterministicIntents3d } from '../../deterministic/runDeterministicIntents3d';

function clause(text: string, id = 0) { return { id, text, hasGeometry: true }; }

describe('circumsphere rule', () => {
  it('tứ diện ABCD: circumsphereCenter[A,B,C,D] + sphere', () => {
    const ctx = { problem: 'Cho tứ diện ABCD. Mặt cầu ngoại tiếp tứ diện ABCD.', clauses: [clause('Cho tứ diện ABCD', 0), clause('Mặt cầu ngoại tiếp tứ diện ABCD', 1)] };
    const m = circumsphereRule.match(ctx as any);
    expect(m.length).toBe(1);
    const kinds = m[0].intents.map((i: any) => i.op + (i.constraint ? '/' + i.constraint.kind : ''));
    expect(kinds).toContain('add-point-3d/circumsphereCenter');
    expect(kinds).toContain('sphere');
    const cs = m[0].intents.find((i: any) => i.constraint?.kind === 'circumsphereCenter') as any;
    expect(cs.constraint.vertices).toEqual(['A', 'B', 'C', 'D']);
  });

  it('hình chóp S.ABC: vertices [S,A,B,C]', () => {
    const ctx = { problem: 'Mặt cầu ngoại tiếp hình chóp S.ABC.', clauses: [clause('Mặt cầu ngoại tiếp hình chóp S.ABC', 0)] };
    const cs = circumsphereRule.match(ctx as any)[0].intents.find((i: any) => i.constraint?.kind === 'circumsphereCenter') as any;
    expect(cs.constraint.vertices).toEqual(['S', 'A', 'B', 'C']);
  });

  it('bare token SCDE: vertices [S,C,D,E]', () => {
    const ctx = { problem: 'mặt cầu ngoại tiếp SCDE', clauses: [clause('mặt cầu ngoại tiếp SCDE', 0)] };
    const cs = circumsphereRule.match(ctx as any)[0].intents.find((i: any) => i.constraint?.kind === 'circumsphereCenter') as any;
    expect(cs.constraint.vertices).toEqual(['S', 'C', 'D', 'E']);
  });

  it('"ngoại tiếp tam giác" (3 điểm) → bỏ', () => {
    const ctx = { problem: 'mặt cầu ngoại tiếp tam giác ABC', clauses: [clause('mặt cầu ngoại tiếp tam giác ABC', 0)] };
    expect(circumsphereRule.match(ctx as any).length).toBe(0);
  });

  it('e2e tứ diện: coverage FULL', () => {
    const r = runDeterministicIntents3d('Cho tứ diện đều ABCD. Mặt cầu ngoại tiếp tứ diện ABCD.');
    expect(r.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/circumsphere.test.ts`
Expected: FAIL — `circumsphereRule` không tồn tại.

- [ ] **Step 3a: Implement rule** `rules/circumsphere.ts` (CREATE):

```ts
import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { sphereIntent, addPoint3d } from './_shared';
import { parseSolidHead3D, splitVertexToken } from './_shared';

const CUE = /ngoại\s*tiếp/iu;
const SPHERE_CUE = /(?:mặt|khối|hình)\s*cầu/iu;

// Token NGAY SAU "ngoại tiếp": "hình chóp S.ABC" | "tứ diện ABCD" | "lăng trụ ABC.A′B′C′"
// | bare "SCDE"/"SABCD". Strict [A-Z] capture (/u).
const TARGET = new RegExp(
  'ngoại\\s*tiếp\\s+' +
  '(?:(?:hình\\s+)?chóp\\s+([A-Z])\\.([A-Z]+)' +          // 1=apex 2=base  (chóp dotted)
  '|tứ\\s+diện(?:\\s+đều)?\\s+([A-Z]{3,})' +               // 3 (tetra)
  '|(?:hình\\s+)?lăng\\s+trụ\\s+([A-Z]{3,})\\.([A-Z\'′]+)' + // 4=base 5=top (lăng trụ)
  '|([A-Z][A-Z\'′]{2,}))',                                  // 6 bare token (≥3 chữ)
  'u',
);
// Base quad non-cyclic trong canonical layout → cầu vô nghiệm → skip.
const NON_CYCLIC = /đáy[^.]*?hình\s+(?:bình\s+hành|thang)/iu;

function pickCenter(vertices: string[]): string {
  for (const c of ['O', 'I', 'J', 'K', 'T']) if (!vertices.includes(c)) return c;
  return 'O';
}

function verticesFromMatch(m: RegExpExecArray, problem: string): string[] | null {
  if (m[1] && m[2]) return [m[1], ...splitVertexToken(m[2])];          // chóp S.ABC
  if (m[3]) return splitVertexToken(m[3]);                              // tứ diện ABCD
  if (m[4] && m[5]) return [...splitVertexToken(m[4]), ...splitVertexToken(m[5])]; // lăng trụ
  if (m[6]) return splitVertexToken(m[6]);                             // bare SCDE
  return null;
}

export const circumsphereRule: LanguageRule3D = {
  id: 'circumsphere',
  priority: 50,
  languages: ['vi'],
  patterns: [/ngoại\s*tiếp/iu, /(?:mặt|khối|hình)\s*cầu/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    if (NON_CYCLIC.test(ctx.problem)) return [];
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      if (!CUE.test(c.text) || !SPHERE_CUE.test(c.text)) continue;
      const m = TARGET.exec(c.text);
      let vertices: string[] | null = m ? verticesFromMatch(m, ctx.problem) : null;
      // Generic "ngoại tiếp hình chóp/tứ diện/lăng trụ" (không token) → solid head.
      if (!vertices && /ngoại\s*tiếp\s+(?:hình\s+)?(?:chóp|lăng\s+trụ)|ngoại\s*tiếp\s+tứ\s+diện/iu.test(c.text)) {
        const head = parseSolidHead3D(ctx.problem);
        if (head) vertices = [...(head.apex ? [head.apex] : []), ...head.baseLabels];
      }
      if (!vertices || vertices.length < 4) continue;
      const center = pickCenter(vertices);
      const intents: Intent3DT[] = [
        addPoint3d(center, { kind: 'circumsphereCenter', vertices }),
        sphereIntent({ center, surfacePoint: vertices[0] }),
      ];
      out.push({ ruleId: this.id, clauseIds: [c.id], intents });
    }
    return out;
  },
};
```

- [ ] **Step 3b: Register rule** `rules/registry.ts` — import + RULES entry:

```ts
import { circumsphereRule } from './circumsphere';
// trong RULES[]:
  circumsphereRule,          // priority 50
```

- [ ] **Step 3c: Vocabulary** `deterministic/vocabulary3d.ts` — thêm vào GEOMETRY_KEYWORDS_3D (dòng metric/revolution):

```ts
  'khối cầu', 'khối nón', 'khối trụ', 'đường sinh', 'trục',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/circumsphere.test.ts`
Expected: PASS (5)

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/rules/circumsphere.ts src/stamps/geometry-3d/ai/rules/registry.ts src/stamps/geometry-3d/ai/deterministic/vocabulary3d.ts src/stamps/geometry-3d/ai/rules/__tests__/circumsphere.test.ts
git commit -m "feat(3d-ai): rule circumsphere (mặt cầu ngoại tiếp chóp/tứ diện/lăng trụ)"
```

---

## Task 4: verify3d — circumsphereCenter + sphere3d

**Files:**
- Modify: `src/stamps/geometry-3d/ai/verify3d.ts`
- Test: `src/stamps/geometry-3d/ai/__tests__/verify3d.solids.test.ts`

**Interfaces:**
- Consumes: `verifyFigure3d` (existing); op sphere + circumsphereCenter (Tasks 1-3).
- Produces: verify issues `'tâm mặt cầu không cách đều đỉnh'`, `'mặt cầu bán kính ≤ 0'`.

- [ ] **Step 1: Write the failing test**

```ts
// src/stamps/geometry-3d/ai/__tests__/verify3d.solids.test.ts
import { verifyFigure3d } from '../verify3d';
import { intentToScene3d } from '../intentToScene3d';
import { solid, addPoint3d, sphereIntent } from '../intent';
import type { State, SceneObject } from '../../../../core/scene';

describe('verify3d — sphere', () => {
  it('mặt cầu ngoại tiếp tứ diện đều hợp lệ → ok', () => {
    const st = intentToScene3d([
      solid({ flavor: 'tetrahedron', baseLabels: ['A', 'B', 'C'], baseVariant: 'equilateral-triangle', apex: 'D', apexVariant: 'regular' }),
      addPoint3d('O', { kind: 'circumsphereCenter', vertices: ['A', 'B', 'C', 'D'] }),
      sphereIntent({ center: 'O', surfacePoint: 'A' }),
    ]);
    expect(verifyFigure3d(st).ok).toBe(true);
  });

  it('tâm bịa lệch → tâm không cách đều', () => {
    // tâm = free sai vị trí + sphere ref nó
    const objects: Record<string, SceneObject> = {};
    const add = (id: string, c: any, kind = 'point3d') => { objects[id] = { id, kind, label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: kind === 'point3d' ? { constraint: c } : c } as SceneObject; };
    add('a', { kind: 'free', x: 0, y: 0, z: 0 });
    add('b', { kind: 'free', x: 2, y: 0, z: 0 });
    add('c', { kind: 'free', x: 0, y: 2, z: 0 });
    add('d', { kind: 'free', x: 0, y: 0, z: 2 });
    add('o', { kind: 'free', x: 0, y: 0, z: 0 }); // sai: phải (1,1,1)
    objects['s1'] = { id: 's1', kind: 'sphere3d', label: '', visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { center: 'o', surfacePoint: 'a' } } as SceneObject;
    // điểm tâm với constraint circumsphereCenter sai-vị-trí KHÔNG thể (math tính đúng);
    // thay vào: dựng circumsphereCenter đúng rồi sphere; negative test là radius 0.
    const st = { objects, order: Object.keys(objects), counter: 6, meta: { domain: '3d' } } as unknown as State;
    // sphere o≡a → radius 0
    objects['s1'] = { ...objects['s1'], attrs: { center: 'a', surfacePoint: 'a' } } as SceneObject;
    expect(verifyFigure3d(st).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/verify3d.solids.test.ts`
Expected: FAIL — verify chưa kiểm sphere3d (radius-0 vacuous-pass → ok=true, test thứ 2 fail).

- [ ] **Step 3: Implement verify branches** in `verify3d.ts`

Trong point-loop, sau block `perpFootLine`, thêm:

```ts
    // circumsphereCenter: tâm cách đều mọi đỉnh
    if (c.kind === 'circumsphereCenter') {
      try {
        const P = (c.vertices as string[]).map((id) => ptWorld(state, id));
        if (P.length >= 2) {
          const r0 = Math.hypot(w[0] - P[0][0], w[1] - P[0][1], w[2] - P[0][2]);
          const tol = 1e-6 * Math.max(1, r0);
          for (const p of P) {
            const ri = Math.hypot(w[0] - p[0], w[1] - p[1], w[2] - p[2]);
            if (Math.abs(ri - r0) > tol) { issues.push(`${obj.label || obj.id}: tâm mặt cầu không cách đều đỉnh`); break; }
          }
        }
      } catch (e) {
        issues.push(`${obj.label || obj.id}: circumsphereCenter check lỗi — ${(e as Error).message}`);
      }
    }
```

Sau point-loop (trước/cạnh polygon3d-loop), thêm loop sphere3d:

```ts
  for (const obj of Object.values(state.objects)) {
    if (obj.kind !== 'sphere3d') continue;
    try {
      const a = obj.attrs as any;
      const center = ptWorld(state, a.center);
      const surface = ptWorld(state, a.surfacePoint);
      const R = Math.hypot(surface[0] - center[0], surface[1] - center[1], surface[2] - center[2]);
      if (!Number.isFinite(R) || R <= 1e-9) issues.push(`${obj.label || obj.id}: mặt cầu bán kính ≤ 0`);
    } catch (e) {
      issues.push(`${obj.label || obj.id}: sphere3d check lỗi — ${(e as Error).message}`);
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/verify3d.solids.test.ts`
Expected: PASS (2)

- [ ] **Step 5: Run cycle A regression**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/`
Expected: PASS (all — verify3d/intent/rules 3D không regress).

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-3d/ai/verify3d.ts src/stamps/geometry-3d/ai/__tests__/verify3d.solids.test.ts
git commit -m "feat(3d-ai): verify3d circumsphereCenter equidistant + sphere3d sanity"
```

---

## Task 5: Op `cone` + `cylinder`

**Files:**
- Modify: `src/stamps/geometry-3d/ai/intent.ts`
- Modify: `src/stamps/geometry-3d/ai/rules/_shared.ts`
- Create: `src/stamps/geometry-3d/ai/intent-builders/cone.ts`, `…/cylinder.ts`
- Modify: `src/stamps/geometry-3d/ai/intent-builders/registry.ts`
- Modify: `src/stamps/geometry-3d/ai/intentTopo3d.ts`
- Test: `src/stamps/geometry-3d/ai/__tests__/intentToScene3d.solids.test.ts` (append)

**Interfaces:**
- Produces: `coneIntent({ name?, baseCenter, apex, radius })`, `cylinderIntent({ name?, baseCenter, topCenter, radius })`; scene cone3d/cylinder3d.

- [ ] **Step 1: Append failing tests** to `intentToScene3d.solids.test.ts`

```ts
import { coneIntent, cylinderIntent, addPoint3d as addPt } from '../intent';

describe('intentToScene3d — cone/cylinder', () => {
  it('cone3d từ 2 điểm free + radius', () => {
    const st = intentToScene3d([
      addPt('O', { kind: 'free', x: 0, y: 0, z: -1.2 }),
      addPt('S', { kind: 'free', x: 0, y: 0, z: 1.2 }),
      coneIntent({ baseCenter: 'O', apex: 'S', radius: 1.4 }),
    ]);
    const co = Object.values(st.objects).find((o) => o.kind === 'cone3d') as any;
    expect(co).toBeDefined();
    expect(co.attrs.radius).toBe(1.4);
    expect(st.objects[co.attrs.baseCenter]).toBeDefined();
    expect(st.objects[co.attrs.apex]).toBeDefined();
  });

  it('cylinder3d từ 2 điểm free + radius', () => {
    const st = intentToScene3d([
      addPt('O', { kind: 'free', x: 0, y: 0, z: -1.2 }),
      addPt('I', { kind: 'free', x: 0, y: 0, z: 1.2 }),
      cylinderIntent({ baseCenter: 'O', topCenter: 'I', radius: 1.4 }),
    ]);
    const cy = Object.values(st.objects).find((o) => o.kind === 'cylinder3d') as any;
    expect(cy).toBeDefined();
    expect(cy.attrs.radius).toBe(1.4);
    expect(st.objects[cy.attrs.topCenter]).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentToScene3d.solids.test.ts`
Expected: FAIL — `coneIntent`/`cylinderIntent` không export.

- [ ] **Step 3a: Zod + factory** in `intent.ts`

```ts
const ConeIntentZ = z.object({
  op: z.literal('cone'),
  name: Label3DZ.optional(),
  baseCenter: Label3DZ, apex: Label3DZ, radius: z.number(),
});
const CylinderIntentZ = z.object({
  op: z.literal('cylinder'),
  name: Label3DZ.optional(),
  baseCenter: Label3DZ, topCenter: Label3DZ, radius: z.number(),
});
```

Thêm cả hai vào `z.discriminatedUnion('op', [ … ])`. Factory:

```ts
export function coneIntent(spec: { name?: string; baseCenter: string; apex: string; radius: number }): Intent3DT {
  return { op: 'cone', ...spec } as Intent3DT;
}
export function cylinderIntent(spec: { name?: string; baseCenter: string; topCenter: string; radius: number }): Intent3DT {
  return { op: 'cylinder', ...spec } as Intent3DT;
}
```

- [ ] **Step 3b: Re-export** `rules/_shared.ts` dòng 1 — thêm `coneIntent, cylinderIntent`.

- [ ] **Step 3c: Builders** `intent-builders/cone.ts` + `cylinder.ts` (CREATE):

```ts
// cone.ts
import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId } from './_types';
export const buildCone: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'cone') return;
  addShape3dObj(s, 'cone3d', 'co', intent.name ?? '', {
    baseCenter: resolveId(s, intent.baseCenter),
    apex: resolveId(s, intent.apex),
    radius: intent.radius,
  }, true, false);
};
```
```ts
// cylinder.ts
import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId } from './_types';
export const buildCylinder: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'cylinder') return;
  addShape3dObj(s, 'cylinder3d', 'cy', intent.name ?? '', {
    baseCenter: resolveId(s, intent.baseCenter),
    topCenter: resolveId(s, intent.topCenter),
    radius: intent.radius,
  }, true, false);
};
```

- [ ] **Step 3d: Register** `intent-builders/registry.ts` — import buildCone/buildCylinder + entries `cone: buildCone, cylinder: buildCylinder`.

- [ ] **Step 3e: topo** `intentTopo3d.ts` `producesOf` — thêm:

```ts
    case 'cone': return i.name ? [i.name] : [];
    case 'cylinder': return i.name ? [i.name] : [];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentToScene3d.solids.test.ts`
Expected: PASS (3)

- [ ] **Step 5: Commit**

```bash
git add -A src/stamps/geometry-3d/ai/intent.ts src/stamps/geometry-3d/ai/rules/_shared.ts src/stamps/geometry-3d/ai/intent-builders/ src/stamps/geometry-3d/ai/intentTopo3d.ts src/stamps/geometry-3d/ai/__tests__/intentToScene3d.solids.test.ts
git commit -m "feat(3d-ai): op cone + cylinder (cone3d/cylinder3d từ 2 điểm trục + radius)"
```

---

## Task 6: Rule `cone` + `cylinder` (standalone)

**Files:**
- Create: `src/stamps/geometry-3d/ai/rules/cone.ts`, `…/cylinder.ts`
- Modify: `src/stamps/geometry-3d/ai/rules/registry.ts`
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/cone.test.ts`, `…/cylinder.test.ts`

**Interfaces:**
- Consumes: `coneIntent`/`cylinderIntent`/`addPoint3d` (Task 5); `parseSolidHead3D`.
- Produces: `coneRule` (id `'cone'`, priority 49), `cylinderRule` (id `'cylinder'`, priority 48).

- [ ] **Step 1: Write the failing tests**

```ts
// src/stamps/geometry-3d/ai/rules/__tests__/cone.test.ts
import { coneRule } from '../cone';
function clause(text: string, id = 0) { return { id, text, hasGeometry: true }; }

describe('cone rule', () => {
  it('hình nón đỉnh S → cone + 2 điểm free', () => {
    const ctx = { problem: 'Cho hình nón đỉnh S có chiều cao h.', clauses: [clause('Cho hình nón đỉnh S có chiều cao h', 0)] };
    const m = coneRule.match(ctx as any);
    expect(m.length).toBe(1);
    const ops = m[0].intents.map((i: any) => i.op);
    expect(ops.filter((o: string) => o === 'add-point-3d').length).toBe(2);
    expect(ops).toContain('cone');
    const apex = m[0].intents.find((i: any) => i.op === 'cone') as any;
    expect(apex.apex).toBe('S');
  });

  it('hình nón trần → synth apex/base', () => {
    const ctx = { problem: 'Cho hình nón có chiều cao bằng 2.', clauses: [clause('Cho hình nón có chiều cao bằng 2', 0)] };
    expect(coneRule.match(ctx as any).length).toBe(1);
  });

  it('skip khi có solid head (compound nội tiếp)', () => {
    const ctx = { problem: 'Cho hình chóp S.ABCD. Khối nón đỉnh S đáy nội tiếp ABCD.', clauses: [clause('Khối nón đỉnh S', 0)] };
    expect(coneRule.match(ctx as any).length).toBe(0);
  });

  it('skip khi nội/ngoại tiếp', () => {
    const ctx = { problem: 'Hình nón nội tiếp hình cầu bán kính 9.', clauses: [clause('Hình nón nội tiếp hình cầu', 0)] };
    expect(coneRule.match(ctx as any).length).toBe(0);
  });
});
```

```ts
// src/stamps/geometry-3d/ai/rules/__tests__/cylinder.test.ts
import { cylinderRule } from '../cylinder';
function clause(text: string, id = 0) { return { id, text, hasGeometry: true }; }

describe('cylinder rule', () => {
  it('hình trụ standalone → cylinder + 2 điểm', () => {
    const ctx = { problem: 'Cho hình trụ có thiết diện qua trục là hình vuông.', clauses: [clause('Cho hình trụ có thiết diện qua trục là hình vuông', 0)] };
    const m = cylinderRule.match(ctx as any);
    expect(m.length).toBe(1);
    expect(m[0].intents.map((i: any) => i.op)).toContain('cylinder');
  });

  it('skip khi có lăng trụ dotted (compound)', () => {
    const ctx = { problem: 'Cho hình lăng trụ ABC.A′B′C′. Hình trụ nội tiếp lăng trụ.', clauses: [clause('Hình trụ nội tiếp lăng trụ', 0)] };
    expect(cylinderRule.match(ctx as any).length).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/cone.test.ts src/stamps/geometry-3d/ai/rules/__tests__/cylinder.test.ts`
Expected: FAIL — `coneRule`/`cylinderRule` không tồn tại.

- [ ] **Step 3a: Implement `rules/cone.ts`** (CREATE):

```ts
import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { coneIntent, addPoint3d } from './_shared';
import { parseSolidHead3D } from './_shared';

const CUE = /(?:hình|khối)\s*nón/iu;
const INSCRIBED = /(?:nội|ngoại)\s*tiếp/iu;
// "đỉnh S" hoặc "đường cao SO" (đỉnh = chữ đầu). Strict /u.
const APEX = /(?:đỉnh\s+([A-Z])|đường\s+cao\s+([A-Z])([A-Z]))/u;

export const coneRule: LanguageRule3D = {
  id: 'cone',
  priority: 49,
  languages: ['vi'],
  patterns: [/(?:hình|khối)\s*nón/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    // Standalone only: skip compound (solid head / nội-ngoại tiếp).
    if (parseSolidHead3D(ctx.problem) || INSCRIBED.test(ctx.problem)) return [];
    const c = ctx.clauses.find((cl) => CUE.test(cl.text));
    if (!c) return [];
    const am = APEX.exec(ctx.problem);
    const apex = am ? (am[1] ?? am[2]) : 'S';
    const base = am && am[3] ? am[3] : 'O';
    const apexName = apex;
    const baseName = base === apexName ? 'O' : base;
    const intents: Intent3DT[] = [
      addPoint3d(baseName, { kind: 'free', x: 0, y: 0, z: -1.2 }),
      addPoint3d(apexName, { kind: 'free', x: 0, y: 0, z: 1.2 }),
      coneIntent({ baseCenter: baseName, apex: apexName, radius: 1.4 }),
    ];
    return [{ ruleId: this.id, clauseIds: [c.id], intents }];
  },
};
```

- [ ] **Step 3b: Implement `rules/cylinder.ts`** (CREATE):

```ts
import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { cylinderIntent, addPoint3d } from './_shared';
import { parseSolidHead3D } from './_shared';

const CUE = /(?:hình|khối)\s*trụ/iu;
const INSCRIBED = /(?:nội|ngoại)\s*tiếp/iu;

export const cylinderRule: LanguageRule3D = {
  id: 'cylinder',
  priority: 48,
  languages: ['vi'],
  patterns: [/(?:hình|khối)\s*trụ/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    if (parseSolidHead3D(ctx.problem) || INSCRIBED.test(ctx.problem)) return [];
    const c = ctx.clauses.find((cl) => CUE.test(cl.text));
    if (!c) return [];
    const intents: Intent3DT[] = [
      addPoint3d('O', { kind: 'free', x: 0, y: 0, z: -1.2 }),
      addPoint3d('I', { kind: 'free', x: 0, y: 0, z: 1.2 }),
      cylinderIntent({ baseCenter: 'O', topCenter: 'I', radius: 1.4 }),
    ];
    return [{ ruleId: this.id, clauseIds: [c.id], intents }];
  },
};
```

- [ ] **Step 3c: Register** `rules/registry.ts` — import coneRule/cylinderRule + RULES entries `coneRule, // priority 49` `cylinderRule, // priority 48`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/cone.test.ts src/stamps/geometry-3d/ai/rules/__tests__/cylinder.test.ts`
Expected: PASS (cone 4, cylinder 2)

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/rules/cone.ts src/stamps/geometry-3d/ai/rules/cylinder.ts src/stamps/geometry-3d/ai/rules/registry.ts src/stamps/geometry-3d/ai/rules/__tests__/cone.test.ts src/stamps/geometry-3d/ai/rules/__tests__/cylinder.test.ts
git commit -m "feat(3d-ai): rule cone + cylinder standalone (guard solid-head/nội-ngoại-tiếp)"
```

---

## Task 7: verify3d — cone3d + cylinder3d sanity

**Files:**
- Modify: `src/stamps/geometry-3d/ai/verify3d.ts`
- Test: `src/stamps/geometry-3d/ai/__tests__/verify3d.solids.test.ts` (append)

**Interfaces:**
- Produces: verify issues `'khối nón suy biến'`, `'khối trụ suy biến'`.

- [ ] **Step 1: Append failing tests**

```ts
import { coneIntent as cone2, cylinderIntent as cyl2, addPoint3d as ap2 } from '../intent';

describe('verify3d — cone/cylinder', () => {
  it('cone hợp lệ → ok', () => {
    const st = intentToScene3d([
      ap2('O', { kind: 'free', x: 0, y: 0, z: -1.2 }),
      ap2('S', { kind: 'free', x: 0, y: 0, z: 1.2 }),
      cone2({ baseCenter: 'O', apex: 'S', radius: 1.4 }),
    ]);
    expect(verifyFigure3d(st).ok).toBe(true);
  });

  it('cylinder trục suy biến (2 tâm trùng) → fail', () => {
    const st = intentToScene3d([
      ap2('O', { kind: 'free', x: 0, y: 0, z: 0 }),
      ap2('I', { kind: 'free', x: 0, y: 0, z: 0 }),
      cyl2({ baseCenter: 'O', topCenter: 'I', radius: 1.4 }),
    ]);
    expect(verifyFigure3d(st).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/verify3d.solids.test.ts`
Expected: FAIL — cylinder trục suy biến vacuous-pass (test 2 fail).

- [ ] **Step 3: Implement verify loops** in `verify3d.ts` (cạnh sphere3d loop):

```ts
  for (const obj of Object.values(state.objects)) {
    if (obj.kind !== 'cone3d') continue;
    try {
      const a = obj.attrs as any;
      const bc = ptWorld(state, a.baseCenter);
      const ap = ptWorld(state, a.apex);
      const h = Math.hypot(ap[0] - bc[0], ap[1] - bc[1], ap[2] - bc[2]);
      if (!(a.radius > 0) || !Number.isFinite(h) || h <= 1e-9) issues.push(`${obj.label || obj.id}: khối nón suy biến`);
    } catch (e) { issues.push(`${obj.label || obj.id}: cone3d check lỗi — ${(e as Error).message}`); }
  }
  for (const obj of Object.values(state.objects)) {
    if (obj.kind !== 'cylinder3d') continue;
    try {
      const a = obj.attrs as any;
      const bc = ptWorld(state, a.baseCenter);
      const tc = ptWorld(state, a.topCenter);
      const h = Math.hypot(tc[0] - bc[0], tc[1] - bc[1], tc[2] - bc[2]);
      if (!(a.radius > 0) || !Number.isFinite(h) || h <= 1e-9) issues.push(`${obj.label || obj.id}: khối trụ suy biến`);
    } catch (e) { issues.push(`${obj.label || obj.id}: cylinder3d check lỗi — ${(e as Error).message}`); }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/verify3d.solids.test.ts`
Expected: PASS (4)

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/verify3d.ts src/stamps/geometry-3d/ai/__tests__/verify3d.solids.test.ts
git commit -m "feat(3d-ai): verify3d cone3d/cylinder3d sanity (R>0, trục≠0)"
```

---

## Task 8: Phase gate — co-firing + e2e + Playwright + diag + regression

**Files:**
- Create: `src/stamps/geometry-3d/ai/rules/__tests__/solidsCofire.test.ts`
- Modify: `tests/e2e/geometry-3d-figure.spec.ts`

**Interfaces:** none new — gate task.

- [ ] **Step 1: Co-firing test (runRules3D level)**

```ts
// src/stamps/geometry-3d/ai/rules/__tests__/solidsCofire.test.ts
import { runRules3D } from '../registry';
import { segmentClauses3D } from '../../deterministic/coverage3d';

function ctxOf(problem: string) {
  const clauses = segmentClauses3D(problem).filter((c) => c.hasGeometry);
  return { problem, clauses };
}
const count = (problem: string, op: string) =>
  runRules3D(ctxOf(problem)).flatMap((m) => m.intents).filter((i: any) => i.op === op).length;

describe('solids co-firing', () => {
  it('mặt cầu ngoại tiếp tứ diện: đúng 1 sphere, không cone/cylinder', () => {
    const p = 'Cho tứ diện ABCD. Mặt cầu ngoại tiếp tứ diện ABCD.';
    expect(count(p, 'sphere')).toBe(1);
    expect(count(p, 'cone')).toBe(0);
    expect(count(p, 'cylinder')).toBe(0);
  });
  it('hình nón standalone: 1 cone, 0 sphere/cylinder', () => {
    const p = 'Cho hình nón đỉnh S có chiều cao h.';
    expect(count(p, 'cone')).toBe(1);
    expect(count(p, 'sphere')).toBe(0);
  });
  it('chóp + nón nội tiếp: solid fires, cone KHÔNG (compound deferred)', () => {
    const p = 'Cho hình chóp tứ giác đều S.ABCD. Khối nón đỉnh S đáy nội tiếp ABCD.';
    expect(count(p, 'cone')).toBe(0);
    expect(count(p, 'solid')).toBe(1);
  });
});
```

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/solidsCofire.test.ts`
Expected: PASS (3)

- [ ] **Step 2: Playwright render-verify** — append cases to `tests/e2e/geometry-3d-figure.spec.ts` (mirror existing pattern: nhập đề vào `ai-generate-3d-input`, click `ai-generate-3d-btn`, assert JXG objects + no console error).

Append 3 test cases: mặt cầu ("Cho tứ diện đều ABCD. Mặt cầu ngoại tiếp tứ diện ABCD."), nón ("Cho hình nón đỉnh S có chiều cao bằng 2."), trụ ("Cho hình trụ có thiết diện qua trục là hình vuông."). Mỗi case: assert `page.evaluate` đếm JXG board có object elType chứa sphere3d/cone3d/cylinder3d (hoặc point3d faceted children > 0); assert KHÔNG console error `/sphere3d|cone3d|cylinder3d|Cannot read/`.

Run vite từ worktree cổng riêng (vd 5199) + `npx playwright test tests/e2e/geometry-3d-figure.spec.ts`.
Expected: PASS (existing + 3 mới).

- [ ] **Step 3: Live visual MCP spot-check** (Playwright MCP) — mount mini-board-3d thật, dựng từng đề mặt cầu/nón/trụ, **NHÌN hình**: mặt cầu trong suốt bao khối + tâm O đánh dấu; nón đáy tròn + đỉnh; trụ 2 đáy tròn. Xác nhận KHÔNG nhãn `<sub>` literal, KHÔNG plane3d error. (Bài học Phase 2/3a: headless + per-task review BỎ SÓT bug nhãn render.)

- [ ] **Step 4: diag-all-3d before/after**

Run: `npx tsx scripts/diag-all-3d.ts`
Expected (gate): tron-xoay FULL ≥16, NONE ≤43 (kỳ vọng NONE giảm nhờ cone/cylinder standalone → PARTIAL; có thể vài PARTIAL→FULL). ss-thietdien 30/?/≤35, vuonggoc 122/?/≤57 — **FULL không giảm, NONE không tăng** trên cả 3. Ghi số mới vào memory.

- [ ] **Step 5: dbg-bai spot-check** trên ≥4 bài thật:

Run: `npx tsx scripts/dbg-bai-3d.ts tron-xoay 26` (tứ diện đều ngoại tiếp), `… 13` (chóp S.ABC), `… 67` (nón), `… 71` (trụ).
Expected: detIntents chứa sphere/cone/cylinder tương ứng; KHÔNG transpile/verify-fail không mong muốn.

- [ ] **Step 6: Full regression**

Run: `npx jest -c jest.worktree.config.js`
Expected: PASS (toàn bộ ~3424+ test, 0 fail). `npx tsc --noEmit` PASS.

- [ ] **Step 7: Commit + merge + memory**

```bash
git add src/stamps/geometry-3d/ai/rules/__tests__/solidsCofire.test.ts tests/e2e/geometry-3d-figure.spec.ts
git commit -m "test(3d): co-firing + Playwright render-verify mặt cầu/nón/trụ (Phase 4 gate)"
git checkout main && git merge --ff-only feat/3d-foundation && git push
```
Cập nhật memory `project_ai_3d_v2_pipeline` (Phase 4 DONE + số diag mới + gotcha phát sinh).

---

## Self-Review

**Spec coverage:**
- §3 circumsphereCenter → Task 1 ✓
- §4 ops sphere/cone/cylinder → Task 2 (sphere) + Task 5 (cone/cylinder) ✓
- §5.1 circumsphere rule + §5.4 vocab → Task 3 ✓; §5.2 cone + §5.3 cylinder → Task 6 ✓
- §6 verify (circumsphereCenter+sphere3d) → Task 4 ✓; (cone3d/cylinder3d) → Task 7 ✓
- §8 testing (co-fire/e2e/Playwright/diag/full jest) → Task 8 ✓
- §9 gotcha (synth-name non-digit, escapeRe, co-firing guard, regex /iu vs /u) → bám trong code các task ✓
- §10 metric framing + §2 0-regression → Task 8 gate ✓

**Placeholder scan:** Mọi step có literal code/command + Expected. Playwright Step 2 mô tả append (pattern theo file hiện có — executor đọc cấu trúc spec hiện hành trước khi append; không phải placeholder vì lệnh + assert rõ).

**Type consistency:**
- `circumsphereCenter{vertices:string[]}` nhất quán Task 1/3/4.
- `sphereIntent({center,surfacePoint})` / `coneIntent({baseCenter,apex,radius})` / `cylinderIntent({baseCenter,topCenter,radius})` khớp scene attrs (`Sphere3DAttrs`/`Cone3DAttrs`/`Cylinder3DAttrs`) Task 2/5/6.
- Builder `addShape3dObj(s,kind,prefix,label,attrs,true,false)` đồng bộ chữ ký `_types.ts:46`.
- producesOf cases `'sphere'|'cone'|'cylinder'` khớp op literal Zod.
- prefix id: sphere 'sp', cone 'co', cylinder 'cy' (khớp editor handler).

## Notes for the executor

- Chạy test TỪ WORKTREE: `npx jest -c jest.worktree.config.js <path>` (plain `npx jest` → "No tests found").
- Task render-vs-harden: render đã có (sphere3d/cone3d/cylinder3d) — KHÔNG sửa `core/scene/kinds/*`; chỉ thêm tầng AI + verify.
- **Honest-metric**: FULL có thể KHÔNG nhảy mạnh (đa số tron-xoay là MC giá trị → PARTIAL đúng). Win = construct VẼ ĐƯỢC + verify số học + Playwright/MCP. Gate cứng = 0-regression (FULL không giảm/NONE không tăng) + full jest.
- Ưu tiên SIẾT guard (skip) hơn nới rule sibling. Nếu thêm rule làm 1 bài currently-FULL flip → điều tra ngay (verify-fail từ circumsphere đáy non-cyclic là nghi can số 1 → mở rộng NON_CYCLIC guard).
- Cycle A (Task 1-4) độc lập Cycle B (Task 5-7); có thể làm tuần tự. Task 8 sau cả hai.
- Synth name điểm HIỂN THỊ: chỉ O/I/J/K/S/T (non-digit, non-`_`) — gotcha subscript-literal.
