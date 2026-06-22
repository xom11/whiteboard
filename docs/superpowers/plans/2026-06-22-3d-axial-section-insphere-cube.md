# Phase 5 — Thiết diện qua trục + Mặt cầu nội tiếp lập phương Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pipeline dựng hình 3D vẽ được thiết diện qua trục của nón/trụ standalone + mặt cầu nội tiếp lập phương, từ đề tiếng Việt (deterministic, no-LLM).

**Architecture:** Text → rules3d → Intent3DT[] → intentToScene3d → Scene State → JxgRenderer3D. Cycle A (thiết diện): op `polygon` mới (nhãn→polygon3d) + mở rộng rule cone/cylinder emit điểm mặt cắt canonical + polygon. Cycle C (insphere cube): rule `insphereCube` reuse `centroid`+`sphere` (0 op/constraint mới). KHÔNG tầng DSL.

**Tech Stack:** TypeScript strict, zod (Intent3DZ discriminatedUnion), Jest 29 + ts-jest, Playwright (render-verify), JSXGraph 3D.

## Global Constraints

- **Regex Việt**: cờ `u` + lookaround `(?![\p{L}])` thay `\b`. Cue/prefilter `/iu` (HOA đầu câu); CAPTURE `[A-Z]` GIỮ `/u` strict (blanket `/i` → `[A-Z]` khớp thường = nhãn sai).
- **escapeRe** mọi `new RegExp(\`…${name}…\`)`.
- **Nhãn điểm synth HIỂN THỊ**: single-letter non-digit non-`_` (A–H/O/I/T) — `_`/digit → JSXGraph `text.display='internal'` render `<sub>` literal trong SVG.
- **Registry-dispatch**: op mới → entry `OP_BUILDERS_3D` (compile-forced) + case `producesOf` (exhaustive-forced). Thêm 1 op/commit (vỡ build giữa commit nếu chưa wire đủ).
- **0-regression (HARD GATE)**: FULL KHÔNG giảm, NONE KHÔNG tăng trên mọi dataset (`npx tsx scripts/diag-all-3d.ts`). Baseline @3d23bb7: ss-thietdien 30/176/35, vuonggoc 122/189/57, **tron-xoay 30/25/34**, TOTAL 182/390/126.
- **Fail-soft**: rule return `[]` thay vì throw; builder throw chỉ khi ref không resolve.
- **RULE CO-FIRING**: `runRules3D` chạy MỌI rule prefilter-khớp + nối intents (KHÔNG first-match-wins). Rule mới phải guard clause sibling; test co-fire ở `runRules3D` level (count `.toBe(N)`).
- **Worktree jest**: `npx jest -c jest.worktree.config.js <path>` (base config ignore `/.claude/worktrees/`). Playwright: vite từ worktree cổng riêng.
- Commit tiếng Việt, prefix tiếng Anh (feat/fix/test/docs), **KHÔNG** Co-Authored-By.

## Verified substrate facts (do not re-derive)

- `Intent3DZ = z.discriminatedUnion('op',[Solid,AddPoint3D,Plane3D,Line3D,Connect3D,CrossSection,Sphere,Cone,Cylinder])` `intent.ts:77`. `Label3DZ=/^[A-Za-z][A-Za-z0-9'′’´_]*$/`. Factory sau `cylinderIntent` `:124`.
- `OP_BUILDERS_3D: Record<Intent3DT['op'],IntentBuilder3D>` `intent-builders/registry.ts:13` (9 entry). `producesOf` exhaustive switch `intentTopo3d.ts:4` (9 case, no default). `PRODUCE_KEYS` `:28` KHÔNG chứa `vertices`/`center`/`surfacePoint` ⟹ chúng là ref ⟹ topo xếp op SAU điểm.
- `addShape3dObj(s,kind,prefix,label,attrs,visible=true,registerInNameMap=true)` `_types.ts:46`; `resolveId(s,name)` `:18`. crossSection builder: `addShape3dObj(s,'polygon3d','poly',label,{vertices:ids,color},true,!!name)` `crossSection.ts:86`. polygon3d attrs = `{vertices:string[], color?}`.
- `buildAddPoint3d` REF_FIELDS có `vertices` array resolve element-wise → `centroid{vertices}` resolve label→id miễn phí.
- `verifyFigure3d` polygon3d loop `verify3d.ts:196` (≥3 đỉnh + đồng phẳng; free coplanar → frame 3-đỉnh-đầu). sphere3d loop `:163` (R=|surf−center|>0). **Reuse cả hai — 0 verify mới.**
- `cone.ts`/`cylinder.ts`: canonical z=±1.2, R=1.4; guard `if (parseSolidHead3D(problem)||/(?:nội|ngoại)\s*tiếp/iu.test(problem)) return []`. cone APEX scope clause nón.
- `solidRule` BOX `solid.ts:129`: `solid({flavor:'box',baseLabels:[4],baseVariant:'rectangle',apexVariant:'free',topLabels:[4]})`. Vô nhãn → `return []`. `producesOf(solid box)` = baseLabels+topLabels (8 nhãn) `intentTopo3d.ts:6-14`.
- `circumsphere.ts:22` local `pickCenter(vertices)` → MOVE sang `_shared`. `centroid` constraint `{kind:'centroid',vertices}` (math trung bình, derived). `solid`/`splitVertexToken`/`parseSolidHead3D` re-export ở `_shared.ts:1`.
- `GEOMETRY_KEYWORDS_3D` ĐÃ có 'lập phương'/'hình lập phương'/'thiết diện'/'trục'/'mặt cầu'/'nội tiếp' `vocabulary3d.ts:3,7,11` ⟹ **KHÔNG sửa vocabulary**.
- `crossSectionRule` cần token `\(([A-Z])([A-Z])([A-Z])\)` paren → "thiết diện qua trục" no-op.

## File Structure

```
src/stamps/geometry-3d/ai/
  intent.ts                   MODIFY  + PolygonIntentZ + union + polygonIntent factory
  rules/_shared.ts            MODIFY  + re-export polygonIntent + sectionNames + pickCenter (moved)
  intentTopo3d.ts             MODIFY  + producesOf case 'polygon'
  intent-builders/
    polygon.ts                CREATE  buildPolygon
    registry.ts               MODIFY  + entry polygon
  rules/
    cone.ts                   MODIFY  + AXIAL section (tam giác qua trục)
    cylinder.ts               MODIFY  + AXIAL section (hcn qua trục)
    circumsphere.ts           MODIFY  import pickCenter từ _shared (bỏ local)
    insphereCube.ts           CREATE  rule insphereCube (priority 47)
    registry.ts               MODIFY  + import + RULES entry insphereCubeRule
  __tests__/
    intentToScene3d.polygon.test.ts   CREATE
  rules/__tests__/
    coneSection.test.ts               CREATE
    cylinderSection.test.ts           CREATE
    insphereCube.test.ts              CREATE
tests/e2e/geometry-3d-figure.spec.ts  MODIFY  + 3 render-verify (nón/trụ thiết diện + insphere cube)
```

---

## Task 1: Op `polygon` (Zod + builder + registry + topo)

**Files:**
- Modify: `src/stamps/geometry-3d/ai/intent.ts`
- Modify: `src/stamps/geometry-3d/ai/rules/_shared.ts`
- Create: `src/stamps/geometry-3d/ai/intent-builders/polygon.ts`
- Modify: `src/stamps/geometry-3d/ai/intent-builders/registry.ts`
- Modify: `src/stamps/geometry-3d/ai/intentTopo3d.ts`
- Test: `src/stamps/geometry-3d/ai/__tests__/intentToScene3d.polygon.test.ts`

**Interfaces:**
- Produces: `polygonIntent({ name?, vertices: string[] })` → scene `polygon3d{vertices:string[],color?}`.

- [ ] **Step 1: Write the failing test**

```ts
// src/stamps/geometry-3d/ai/__tests__/intentToScene3d.polygon.test.ts
import { intentToScene3d } from '../intentToScene3d';
import { addPoint3d, polygonIntent } from '../intent';

describe('intentToScene3d — polygon', () => {
  it('polygon3d từ 3 nhãn điểm free', () => {
    const st = intentToScene3d([
      addPoint3d('A', { kind: 'free', x: -1.4, y: 0, z: -1.2 }),
      addPoint3d('S', { kind: 'free', x: 0, y: 0, z: 1.2 }),
      addPoint3d('B', { kind: 'free', x: 1.4, y: 0, z: -1.2 }),
      polygonIntent({ vertices: ['A', 'S', 'B'] }),
    ]);
    const poly = Object.values(st.objects).find((o) => o.kind === 'polygon3d') as any;
    expect(poly).toBeDefined();
    // vertices = id điểm hợp lệ (không phải nhãn thô)
    expect(poly.attrs.vertices).toHaveLength(3);
    for (const id of poly.attrs.vertices) expect(st.objects[id]).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentToScene3d.polygon.test.ts`
Expected: FAIL — `polygonIntent` không export / `Intent3DZ.parse` ném op 'polygon'.

- [ ] **Step 3a: Zod variant + factory** in `intent.ts`

Sau `CylinderIntentZ` (dòng `:75`), thêm:

```ts
const PolygonIntentZ = z.object({
  op: z.literal('polygon'),
  name: Label3DZ.optional(),
  vertices: z.array(Label3DZ).min(3),
});
```

Thêm `PolygonIntentZ` vào array union (`:77-80`):

```ts
export const Intent3DZ = z.discriminatedUnion('op', [
  SolidIntentZ, AddPoint3DIntentZ, Plane3DIntentZ, Line3DIntentZ, Connect3DIntentZ, CrossSectionIntentZ,
  SphereIntentZ, ConeIntentZ, CylinderIntentZ, PolygonIntentZ,
]);
```

Factory sau `cylinderIntent` (`:124`):

```ts
export function polygonIntent(spec: { name?: string; vertices: string[] }): Intent3DT {
  return { op: 'polygon', ...spec } as Intent3DT;
}
```

- [ ] **Step 3b: Re-export** in `rules/_shared.ts` dòng 1 — thêm `polygonIntent`:

```ts
export { solid, addPoint3d, plane3d, line3dIntent, connect3d, crossSection3d, sphereIntent, coneIntent, cylinderIntent, polygonIntent } from '../intent';
```

- [ ] **Step 3c: Builder** `intent-builders/polygon.ts` (CREATE):

```ts
import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId } from './_types';

// Đa giác từ nhãn điểm tường minh (mặt cắt qua trục). registerInNameMap=false: không được ref.
export const buildPolygon: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'polygon') return;
  addShape3dObj(s, 'polygon3d', 'sec', intent.name ?? '', {
    vertices: intent.vertices.map((v) => resolveId(s, v)),
    color: '#60a5fa',
  }, true, false);
};
```

- [ ] **Step 3d: Register** `intent-builders/registry.ts` — import + entry:

```ts
import { buildPolygon } from './polygon';
// trong OP_BUILDERS_3D, sau cylinder:
  polygon: buildPolygon,
```

- [ ] **Step 3e: topo** `intentTopo3d.ts` `producesOf` switch — sau case 'cylinder':

```ts
    case 'polygon': return i.name ? [i.name] : [];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentToScene3d.polygon.test.ts`
Expected: PASS (1)

- [ ] **Step 5: tsc + commit**

Run: `npx tsc --noEmit` → PASS (op wired đủ, không TS-error).

```bash
git add src/stamps/geometry-3d/ai/intent.ts src/stamps/geometry-3d/ai/rules/_shared.ts src/stamps/geometry-3d/ai/intent-builders/polygon.ts src/stamps/geometry-3d/ai/intent-builders/registry.ts src/stamps/geometry-3d/ai/intentTopo3d.ts src/stamps/geometry-3d/ai/__tests__/intentToScene3d.polygon.test.ts
git commit -m "feat(3d-ai): op polygon (polygon3d từ nhãn điểm tường minh)"
```

---

## Task 2: Mở rộng rule `cone` — thiết diện qua trục (tam giác)

**Files:**
- Modify: `src/stamps/geometry-3d/ai/rules/_shared.ts` (+ `sectionNames` helper)
- Modify: `src/stamps/geometry-3d/ai/rules/cone.ts`
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/coneSection.test.ts`

**Interfaces:**
- Consumes: `polygonIntent` (Task 1), `addPoint3d`, `coneIntent`.
- Produces: `sectionNames(n: number, taken: string[]): string[]`; cone rule emit thêm 2 điểm đáy + `polygon` khi AXIAL.

- [ ] **Step 1: Write the failing test**

```ts
// src/stamps/geometry-3d/ai/rules/__tests__/coneSection.test.ts
import { coneRule } from '../cone';
import { runRules3D } from '../registry';
import { segmentClauses3D } from '../../deterministic/coverage3d';

function clause(text: string, id = 0) { return { id, text, hasGeometry: true }; }
function ctxOf(problem: string) {
  return { problem, clauses: segmentClauses3D(problem).filter((c) => c.hasGeometry) };
}

describe('cone rule — thiết diện qua trục', () => {
  it('nón đỉnh S + thiết diện qua trục → cone + 2 điểm đáy + polygon', () => {
    const ctx = { problem: 'Cho hình nón đỉnh S. Thiết diện qua trục là tam giác đều.', clauses: [clause('Cho hình nón đỉnh S', 0), clause('Thiết diện qua trục là tam giác đều', 1)] };
    const m = coneRule.match(ctx as any);
    expect(m.length).toBe(1);
    const ops = m[0].intents.map((i: any) => i.op);
    expect(ops).toContain('cone');
    expect(ops).toContain('polygon');
    expect(ops.filter((o: string) => o === 'add-point-3d').length).toBe(4); // base+apex + 2 điểm mặt cắt
    const poly = m[0].intents.find((i: any) => i.op === 'polygon') as any;
    expect(poly.vertices).toHaveLength(3);
    expect(poly.vertices[1]).toBe('S'); // đỉnh ở giữa tam giác qua trục
    // claim cả clause thiết diện (PARTIAL→FULL)
    expect(m[0].clauseIds).toEqual(expect.arrayContaining([0, 1]));
  });

  it('"mặt phẳng đi qua đỉnh" cũng kích hoạt mặt cắt (Câu 69)', () => {
    const ctx = { problem: 'Cho hình nón. Một mặt phẳng đi qua đỉnh hình nón cắt theo thiết diện tam giác đều.', clauses: [clause('Cho hình nón', 0), clause('Một mặt phẳng đi qua đỉnh hình nón cắt theo thiết diện tam giác đều', 1)] };
    const m = coneRule.match(ctx as any);
    expect(m[0].intents.map((i: any) => i.op)).toContain('polygon');
  });

  it('nón standalone KHÔNG thiết diện → Phase 4 behavior (no polygon)', () => {
    const ctx = { problem: 'Cho hình nón có chiều cao bằng 2.', clauses: [clause('Cho hình nón có chiều cao bằng 2', 0)] };
    const m = coneRule.match(ctx as any);
    expect(m[0].intents.map((i: any) => i.op)).not.toContain('polygon');
    expect(m[0].intents.filter((i: any) => i.op === 'add-point-3d').length).toBe(2);
  });

  it('co-firing: thiết diện qua trục KHÔNG kích hoạt crossSection (no paren token)', () => {
    const p = 'Cho hình nón đỉnh S. Thiết diện qua trục là tam giác vuông cân.';
    const all = runRules3D(ctxOf(p));
    const ops = all.flatMap((mm) => mm.intents).map((i: any) => i.op);
    expect(ops.filter((o: string) => o === 'cross-section').length).toBe(0);
    expect(ops.filter((o: string) => o === 'cone').length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/coneSection.test.ts`
Expected: FAIL — cone rule chưa emit polygon / `sectionNames` không tồn tại.

- [ ] **Step 3a: Helper `sectionNames`** in `rules/_shared.ts` (cuối file):

```ts
/** N tên điểm mặt cắt: chữ cái đơn (non-digit, non-`_`) đầu tiên KHÔNG ∈ taken (né nhãn đỉnh/tâm). */
export function sectionNames(n: number, taken: string[]): string[] {
  const pool = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'M', 'N', 'P', 'Q'];
  const used = new Set(taken);
  const out: string[] = [];
  for (const x of pool) {
    if (out.length === n) break;
    if (!used.has(x)) out.push(x);
  }
  return out;
}
```

- [ ] **Step 3b: Modify `rules/cone.ts`** — import + AXIAL + section emit. Thay nội dung file:

```ts
import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { coneIntent, addPoint3d, parseSolidHead3D, polygonIntent, sectionNames } from './_shared';

const CUE = /(?:hình|khối)\s*nón/iu;
const INSCRIBED = /(?:nội|ngoại)\s*tiếp/iu;
// "đỉnh S" hoặc "đường cao SO" (đỉnh = chữ đầu). Strict /u.
const APEX = /(?:đỉnh\s+([A-Z])|đường\s+cao\s+([A-Z])([A-Z]))/u;
// Thiết diện qua trục / mặt phẳng qua trục|đỉnh → vẽ tam giác qua trục.
const AXIAL = /(?:thiết\s*diện\s*qua\s*trục|(?:mặt\s*phẳng|thiết\s*diện)[^.]*qua\s*(?:trục|đỉnh))/iu;

export const coneRule: LanguageRule3D = {
  id: 'cone',
  priority: 49,
  languages: ['vi'],
  patterns: [/(?:hình|khối)\s*nón/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    // Standalone only: skip compound (solid head / nội-ngoại tiếp đa diện-mặt cầu).
    if (parseSolidHead3D(ctx.problem) || INSCRIBED.test(ctx.problem)) return [];
    const c = ctx.clauses.find((cl) => CUE.test(cl.text));
    if (!c) return [];
    // Scope tới CHÍNH clause nón (tránh nhặt "đỉnh/đường cao" từ tam giác khác trong đề).
    const am = APEX.exec(c.text);
    const apexName = am ? (am[1] ?? am[2]!) : 'S';
    const baseRaw = am && am[3] ? am[3] : 'O';
    const baseName = baseRaw === apexName ? 'O' : baseRaw;
    const intents: Intent3DT[] = [
      addPoint3d(baseName, { kind: 'free', x: 0, y: 0, z: -1.2 }),
      addPoint3d(apexName, { kind: 'free', x: 0, y: 0, z: 1.2 }),
      coneIntent({ baseCenter: baseName, apex: apexName, radius: 1.4 }),
    ];
    const clauseIds = [c.id];
    if (AXIAL.test(ctx.problem)) {
      // 2 đầu mút đường kính đáy (trên vành R=1.4) + tam giác qua trục [A, đỉnh, B].
      const [pA, pB] = sectionNames(2, [apexName, baseName]);
      intents.push(
        addPoint3d(pA, { kind: 'free', x: -1.4, y: 0, z: -1.2 }),
        addPoint3d(pB, { kind: 'free', x: 1.4, y: 0, z: -1.2 }),
        polygonIntent({ vertices: [pA, apexName, pB] }),
      );
      const sc = ctx.clauses.find((cl) => AXIAL.test(cl.text));
      if (sc && sc.id !== c.id) clauseIds.push(sc.id);
    }
    return [{ ruleId: this.id, clauseIds, intents }];
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/coneSection.test.ts`
Expected: PASS (4)

- [ ] **Step 5: Phase-4 cone regression**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/cone.test.ts`
Expected: PASS (Phase 4 cone tests vẫn xanh — standalone không section).

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-3d/ai/rules/_shared.ts src/stamps/geometry-3d/ai/rules/cone.ts src/stamps/geometry-3d/ai/rules/__tests__/coneSection.test.ts
git commit -m "feat(3d-ai): cone thiết diện qua trục (tam giác qua đỉnh + 2 đầu đường kính đáy)"
```

---

## Task 3: Mở rộng rule `cylinder` — thiết diện qua trục (hình chữ nhật)

**Files:**
- Modify: `src/stamps/geometry-3d/ai/rules/cylinder.ts`
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/cylinderSection.test.ts`

**Interfaces:**
- Consumes: `polygonIntent`, `sectionNames` (Task 1-2), `cylinderIntent`, `addPoint3d`.

- [ ] **Step 1: Write the failing test**

```ts
// src/stamps/geometry-3d/ai/rules/__tests__/cylinderSection.test.ts
import { cylinderRule } from '../cylinder';
import { runRules3D } from '../registry';
import { segmentClauses3D } from '../../deterministic/coverage3d';

function clause(text: string, id = 0) { return { id, text, hasGeometry: true }; }
function ctxOf(problem: string) {
  return { problem, clauses: segmentClauses3D(problem).filter((c) => c.hasGeometry) };
}

describe('cylinder rule — thiết diện qua trục', () => {
  it('trụ + thiết diện qua trục hình vuông → cylinder + 4 điểm + polygon(4 đỉnh)', () => {
    const ctx = { problem: 'Cho hình trụ có thiết diện qua trục là một hình vuông.', clauses: [clause('Cho hình trụ có thiết diện qua trục là một hình vuông', 0)] };
    const m = cylinderRule.match(ctx as any);
    expect(m.length).toBe(1);
    const ops = m[0].intents.map((i: any) => i.op);
    expect(ops).toContain('cylinder');
    expect(ops).toContain('polygon');
    expect(ops.filter((o: string) => o === 'add-point-3d').length).toBe(6); // 2 tâm + 4 đầu mút
    const poly = m[0].intents.find((i: any) => i.op === 'polygon') as any;
    expect(poly.vertices).toHaveLength(4);
  });

  it('trụ standalone KHÔNG thiết diện → Phase 4 behavior', () => {
    const ctx = { problem: 'Cho hình trụ có chiều cao h.', clauses: [clause('Cho hình trụ có chiều cao h', 0)] };
    expect(cylinderRule.match(ctx as any)[0].intents.map((i: any) => i.op)).not.toContain('polygon');
  });

  it('co-firing: 1 cylinder, 0 cross-section', () => {
    const p = 'Cho hình trụ có thiết diện qua trục là hình vuông cạnh 2.';
    const ops = runRules3D(ctxOf(p)).flatMap((mm) => mm.intents).map((i: any) => i.op);
    expect(ops.filter((o: string) => o === 'cylinder').length).toBe(1);
    expect(ops.filter((o: string) => o === 'cross-section').length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/cylinderSection.test.ts`
Expected: FAIL — cylinder rule chưa emit polygon.

- [ ] **Step 3: Modify `rules/cylinder.ts`** — thay nội dung file:

```ts
import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { cylinderIntent, addPoint3d, parseSolidHead3D, polygonIntent, sectionNames } from './_shared';

const CUE = /(?:hình|khối)\s*trụ/iu;
const INSCRIBED = /(?:nội|ngoại)\s*tiếp/iu;
const AXIAL = /(?:thiết\s*diện\s*qua\s*trục|(?:mặt\s*phẳng|thiết\s*diện)[^.]*qua\s*(?:trục|đỉnh))/iu;

export const cylinderRule: LanguageRule3D = {
  id: 'cylinder',
  priority: 48,
  languages: ['vi'],
  patterns: [/(?:hình|khối)\s*trụ/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    // Standalone only: skip compound (lăng trụ dotted / nội-ngoại tiếp).
    if (parseSolidHead3D(ctx.problem) || INSCRIBED.test(ctx.problem)) return [];
    const c = ctx.clauses.find((cl) => CUE.test(cl.text));
    if (!c) return [];
    const intents: Intent3DT[] = [
      addPoint3d('O', { kind: 'free', x: 0, y: 0, z: -1.2 }),
      addPoint3d('I', { kind: 'free', x: 0, y: 0, z: 1.2 }),
      cylinderIntent({ baseCenter: 'O', topCenter: 'I', radius: 1.4 }),
    ];
    const clauseIds = [c.id];
    if (AXIAL.test(ctx.problem)) {
      // 4 đầu mút 2 đường kính 2 đáy → hcn qua trục [A(đáy-),B(đáy+),C(đỉnh+),D(đỉnh-)].
      const [a, b, cc, d] = sectionNames(4, ['O', 'I']);
      intents.push(
        addPoint3d(a, { kind: 'free', x: -1.4, y: 0, z: -1.2 }),
        addPoint3d(b, { kind: 'free', x: 1.4, y: 0, z: -1.2 }),
        addPoint3d(cc, { kind: 'free', x: 1.4, y: 0, z: 1.2 }),
        addPoint3d(d, { kind: 'free', x: -1.4, y: 0, z: 1.2 }),
        polygonIntent({ vertices: [a, b, cc, d] }),
      );
      const sc = ctx.clauses.find((cl) => AXIAL.test(cl.text));
      if (sc && sc.id !== c.id) clauseIds.push(sc.id);
    }
    return [{ ruleId: this.id, clauseIds, intents }];
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/cylinderSection.test.ts`
Expected: PASS (3)

- [ ] **Step 5: Phase-4 cylinder regression + e2e numeric**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/cylinder.test.ts src/stamps/geometry-3d/ai/__tests__/intentToScene3d.polygon.test.ts`
Expected: PASS.

Run e2e numeric (verify polygon phẳng qua intentToScene3d + verifyFigure3d):
```bash
npx tsx -e "
const { runDeterministicIntents3d } = require('./src/stamps/geometry-3d/ai/deterministic/runDeterministicIntents3d');
const r = runDeterministicIntents3d('Cho hình trụ có thiết diện qua trục là hình vuông.');
console.log('ok=', r.ok, 'issues=', JSON.stringify(r.issues ?? r.verifyIssues ?? []));
"
```
Expected: ok=true (polygon hcn phẳng, không verify-fail). *Nếu API field khác — đọc `runDeterministicIntents3d` return shape; điều chỉnh log. Mục tiêu: không verify-fail.*

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-3d/ai/rules/cylinder.ts src/stamps/geometry-3d/ai/rules/__tests__/cylinderSection.test.ts
git commit -m "feat(3d-ai): cylinder thiết diện qua trục (hcn qua 4 đầu 2 đường kính 2 đáy)"
```

---

## Task 4: Rule `insphereCube` (mặt cầu nội tiếp lập phương)

**Files:**
- Modify: `src/stamps/geometry-3d/ai/rules/circumsphere.ts` (import pickCenter từ _shared)
- Modify: `src/stamps/geometry-3d/ai/rules/_shared.ts` (+ pickCenter export)
- Create: `src/stamps/geometry-3d/ai/rules/insphereCube.ts`
- Modify: `src/stamps/geometry-3d/ai/rules/registry.ts`
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/insphereCube.test.ts`

**Interfaces:**
- Consumes: `sphereIntent`, `addPoint3d`, `solid`, `splitVertexToken`, `pickCenter` (moved to _shared).
- Produces: `insphereCubeRule: LanguageRule3D` (id `'insphereCube'`, priority 47).

- [ ] **Step 1: Write the failing test**

```ts
// src/stamps/geometry-3d/ai/rules/__tests__/insphereCube.test.ts
import { insphereCubeRule } from '../insphereCube';
import { runRules3D } from '../registry';
import { segmentClauses3D } from '../../deterministic/coverage3d';
import { intentToScene3d } from '../../intentToScene3d';
import { verifyFigure3d } from '../../verify3d';

function clause(text: string, id = 0) { return { id, text, hasGeometry: true }; }
function ctxOf(problem: string) {
  return { problem, clauses: segmentClauses3D(problem).filter((c) => c.hasGeometry) };
}

describe('insphereCube rule', () => {
  it('lập phương vô nhãn → box + 2 centroid + sphere', () => {
    const ctx = { problem: 'Mặt cầu nội tiếp hình lập phương cạnh a.', clauses: [clause('Mặt cầu nội tiếp hình lập phương cạnh a', 0)] };
    const m = insphereCubeRule.match(ctx as any);
    expect(m.length).toBe(1);
    const ops = m[0].intents.map((i: any) => i.op);
    expect(ops).toContain('solid');           // box tự dựng (vô nhãn)
    expect(ops).toContain('sphere');
    expect(ops.filter((o: string) => o === 'add-point-3d').length).toBe(2); // tâm + tâm-mặt
    const sol = m[0].intents.find((i: any) => i.op === 'solid') as any;
    expect(sol.flavor).toBe('box');
    const cen = m[0].intents.find((i: any) => i.constraint?.kind === 'centroid' && i.constraint.vertices.length === 8) as any;
    expect(cen).toBeDefined();
  });

  it('lập phương CÓ nhãn → reference 8 đỉnh, KHÔNG emit box (solidRule lo)', () => {
    const ctx = { problem: 'Cho hình lập phương ABCD.A′B′C′D′. Mặt cầu nội tiếp hình lập phương đó.', clauses: [clause('Mặt cầu nội tiếp hình lập phương', 0)] };
    const m = insphereCubeRule.match(ctx as any);
    expect(m[0].intents.map((i: any) => i.op)).not.toContain('solid');
    const cen = m[0].intents.find((i: any) => i.constraint?.kind === 'centroid' && i.constraint.vertices.length === 8) as any;
    expect(cen.constraint.vertices).toEqual(['A', 'B', 'C', 'D', "A′", "B′", "C′", "D′"]);
  });

  it('co-firing: lập phương vô nhãn → 1 box (insphere), 0 từ solidRule; cone/cylinder skip', () => {
    const p = 'Mặt cầu nội tiếp hình lập phương cạnh a.';
    const ops = runRules3D(ctxOf(p)).flatMap((mm) => mm.intents).map((i: any) => i.op);
    expect(ops.filter((o: string) => o === 'solid').length).toBe(1); // chỉ insphere
    expect(ops.filter((o: string) => o === 'sphere').length).toBe(1);
  });

  it('co-firing: lập phương CÓ nhãn → đúng 1 box (solidRule, KHÔNG dup từ insphere)', () => {
    const p = 'Cho hình lập phương ABCD.A′B′C′D′. Mặt cầu nội tiếp hình lập phương.';
    const ops = runRules3D(ctxOf(p)).flatMap((mm) => mm.intents).map((i: any) => i.op);
    expect(ops.filter((o: string) => o === 'solid').length).toBe(1);
  });

  it('e2e numeric: tâm cách đều 6 mặt (sphere R>0, verify ok)', () => {
    const m = insphereCubeRule.match({ problem: 'Mặt cầu nội tiếp hình lập phương cạnh a.', clauses: [clause('Mặt cầu nội tiếp hình lập phương cạnh a', 0)] } as any);
    const st = intentToScene3d(m[0].intents);
    expect(Object.values(st.objects).some((o) => o.kind === 'sphere3d')).toBe(true);
    expect(verifyFigure3d(st).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/insphereCube.test.ts`
Expected: FAIL — `insphereCubeRule` không tồn tại.

- [ ] **Step 3a: Move `pickCenter` to `_shared.ts`** (cuối file):

```ts
/** Tên tâm synth: phần tử đầu trong O/I/J/K/T KHÔNG ∈ vertices (non-digit, non-`_`). */
export function pickCenter(vertices: string[]): string {
  for (const c of ['O', 'I', 'J', 'K', 'T']) if (!vertices.includes(c)) return c;
  return 'O';
}
```

- [ ] **Step 3b: `circumsphere.ts`** — bỏ local `pickCenter`, import từ _shared. Sửa dòng `:3` + xoá hàm `:22-25`:

```ts
import { sphereIntent, addPoint3d, parseSolidHead3D, splitVertexToken, pickCenter } from './_shared';
```
(Xoá khối `function pickCenter(...) { ... }` dòng 22-25.)

- [ ] **Step 3c: Implement `rules/insphereCube.ts`** (CREATE):

```ts
import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { sphereIntent, addPoint3d, solid, splitVertexToken, pickCenter } from './_shared';

const SPHERE_CUE = /(?:mặt|khối|hình)\s*cầu/iu;
const INSCRIBED = /nội\s*tiếp/iu;
const CUBE = /(?:hình\s*)?(?:lập\s*phương|hộp)/iu;
// Cube CÓ nhãn: "lập phương ABCD.A′B′C′D′" → 4 đáy + 4 trên. Strict [A-Z] /u.
const BOX_LABELLED = /(?:lập\s*phương|hộp)\s+([A-Z]{4})\.((?:[A-Z]['′])+)/u;

export const insphereCubeRule: LanguageRule3D = {
  id: 'insphereCube',
  priority: 47,
  languages: ['vi'],
  patterns: [/(?:mặt|khối|hình)\s*cầu/iu, /nội\s*tiếp/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    if (!INSCRIBED.test(ctx.problem) || !CUBE.test(ctx.problem)) return [];
    const c = ctx.clauses.find(
      (cl) => SPHERE_CUE.test(cl.text) && INSCRIBED.test(cl.text) && CUBE.test(cl.text),
    );
    if (!c) return [];

    const labelled = BOX_LABELLED.exec(ctx.problem);
    let base: string[];
    let top: string[];
    let emitBox: boolean;
    if (labelled) {
      base = splitVertexToken(labelled[1]);   // ABCD
      top = splitVertexToken(labelled[2]);     // A′B′C′D′
      emitBox = false;                         // solidRule tự dựng box (tránh dup)
    } else {
      base = ['A', 'B', 'C', 'D'];
      top = ['E', 'F', 'G', 'H'];
      emitBox = true;                          // cube vô nhãn → tự dựng box
    }
    const verts = [...base, ...top];
    if (verts.length !== 8) return [];

    const center = pickCenter(verts);
    const surf = pickCenter([...verts, center]);
    const intents: Intent3DT[] = [];
    if (emitBox) {
      intents.push(
        solid({ flavor: 'box', baseLabels: base, baseVariant: 'rectangle', apexVariant: 'free', topLabels: top }),
      );
    }
    intents.push(
      addPoint3d(center, { kind: 'centroid', vertices: verts }),   // tâm khối = tâm cầu
      addPoint3d(surf, { kind: 'centroid', vertices: base }),       // tâm-mặt-đáy = điểm mặt (R = nửa cạnh)
      sphereIntent({ center, surfacePoint: surf }),
    );
    return [{ ruleId: this.id, clauseIds: [c.id], intents }];
  },
};
```

- [ ] **Step 3d: Register** `rules/registry.ts` — import + RULES entry (sau cylinderRule):

```ts
import { insphereCubeRule } from './insphereCube';
// trong RULES[]:
  insphereCubeRule,           // priority 47
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/insphereCube.test.ts`
Expected: PASS (5). *Nếu "e2e numeric" fail vì box builder KHÔNG sinh 8 đỉnh nhãn A–H → đọc layout3d box; nếu box layout không-cube xấu, fallback: thay `solid(box)` bằng 8 free point cube ±1 trong rule (note §5 spec). Quyết định sau MCP visual Task 5.*

- [ ] **Step 5: circumsphere regression**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/circumsphere.test.ts`
Expected: PASS (pickCenter moved, behavior identical).

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-3d/ai/rules/_shared.ts src/stamps/geometry-3d/ai/rules/circumsphere.ts src/stamps/geometry-3d/ai/rules/insphereCube.ts src/stamps/geometry-3d/ai/rules/registry.ts src/stamps/geometry-3d/ai/rules/__tests__/insphereCube.test.ts
git commit -m "feat(3d-ai): rule insphereCube (mặt cầu nội tiếp lập phương — reuse centroid+sphere)"
```

---

## Task 5: Phase gate — Playwright + MCP visual + diag + regression + memory

**Files:**
- Modify: `tests/e2e/geometry-3d-figure.spec.ts`

**Interfaces:** none new — gate task.

- [ ] **Step 1: Playwright render-verify** — append 3 case vào `tests/e2e/geometry-3d-figure.spec.ts` (mirror pattern hiện có: nhập đề `ai-generate-3d-input`, click `ai-generate-3d-btn`, assert JXG object + no console error). 3 đề:
  - Nón thiết diện: `'Cho hình nón đỉnh S. Thiết diện qua trục là tam giác đều.'` → assert có `cone3d` + `polygon3d`.
  - Trụ thiết diện: `'Cho hình trụ có thiết diện qua trục là hình vuông.'` → assert `cylinder3d` + `polygon3d`.
  - Insphere cube: `'Mặt cầu nội tiếp hình lập phương cạnh a.'` → assert `sphere3d` + `polyhedron3d`.
  - Mỗi case: assert KHÔNG console error `/polygon3d|sphere3d|cone3d|cylinder3d|Cannot read/`.

Run vite từ worktree cổng riêng (vd 5199) + `npx playwright test tests/e2e/geometry-3d-figure.spec.ts`.
Expected: PASS (existing + 3 mới).

- [ ] **Step 2: Live visual MCP spot-check** (Playwright MCP) — mount mini-board-3d thật (`npm run demo` :5173), dựng từng đề, **NHÌN hình**:
  - Nón: nón cam + tam giác xanh qua trục (đỉnh S + 2 đáy).
  - Trụ: trụ + hcn xanh dọc trục (4 đầu mút).
  - Insphere cube: **hộp + mặt cầu trong suốt tiếp xúc 6 mặt** — XÁC NHẬN box vuông-cạnh-đều (cube), sphere không thò ra/không hở. Nếu box KHÔNG-cube (rectangular) → quay lại Task 4 fallback (8 free point cube ±1).
  - Xác nhận KHÔNG nhãn `<sub>` literal, KHÔNG plane3d error. (Bài học Phase 2/3a: headless BỎ SÓT bug nhãn render.)

- [ ] **Step 3: diag-all-3d before/after**

Run: `npx tsx scripts/diag-all-3d.ts`
Expected (gate): **FULL không giảm + NONE không tăng** trên CẢ 3 dataset. Baseline tron-xoay 30/25/34 → kỳ vọng NONE giảm (6/10/33 insphere; cluster thiết diện giàu hơn), có thể vài PARTIAL→FULL. ss-thietdien 30/?/≤35, vuonggoc 122/?/≤57. Ghi số mới vào memory.

- [ ] **Step 4: dbg-bai spot-check** ≥4 bài thật:

Run: `npx tsx scripts/dbg-bai-3d.ts tron-xoay 68` (nón thiết diện), `… 71` (trụ thiết diện), `… 6` (insphere cube), `… 10` (insphere cube MC).
Expected: detIntents chứa polygon/sphere tương ứng; KHÔNG verify-fail không mong muốn. *67 vẫn NONE (PROOF_ONLY "Tính…" — honest, KHÔNG cố cứu.)*

- [ ] **Step 5: Full regression**

Run: `npx jest -c jest.worktree.config.js`
Expected: PASS (toàn bộ ~3451+ test, 0 fail). `npx tsc --noEmit` PASS.

- [ ] **Step 6: Adversarial review + commit + memory**

Dispatch 1 subagent review đối kháng (đọc diff Cycle A+C): tìm co-firing bỏ sót / nhãn synth subscript / guard quá rộng / verify vacuous-pass. Vá NIT/BUG nếu có (re-run diag identical).

```bash
git add tests/e2e/geometry-3d-figure.spec.ts
git commit -m "test(3d): Playwright render-verify thiết diện + insphere cube + Phase 5 gate"
```
Cập nhật memory `project_ai_3d_v2_pipeline` (Phase 5 DONE + số diag mới + gotcha phát sinh). **GIỮ nhánh feat/3d-foundation, KHÔNG merge main tới khi user yêu cầu.**

---

## Self-Review

**Spec coverage:**
- §3 op `polygon` → Task 1 ✓
- §4 cone/cylinder axial section + `sectionNames` → Task 2 (cone) + Task 3 (cylinder) ✓
- §5 rule `insphereCube` (named/unnamed box, centroid×2, sphere) → Task 4 ✓
- §6 vocabulary → ĐÃ đủ, không sửa (ghi rõ) ✓
- §7 verify (reuse polygon3d + sphere3d loop) → Task 1/4 e2e + verifyFigure3d, 0 verify mới ✓
- §9 co-firing (crossSection no-op, insphere dup-box guard) → Task 2/3/4 co-fire tests ✓
- §10 metric + 0-regression → Task 5 gate ✓

**Placeholder scan:** Mọi step có code/command literal + Expected. Task 5 Step 1/2 mô tả append/MCP (pattern theo file e2e hiện hành + visual — executor đọc cấu trúc spec hiện có; lệnh + assert rõ, không phải placeholder).

**Type consistency:**
- `polygonIntent({vertices:string[]})` → `polygon3d{vertices,color}` Task 1/2/3 ✓
- `sectionNames(n:number, taken:string[]):string[]` Task 2 (def) = Task 3 (dùng) ✓
- `pickCenter(vertices:string[]):string` move _shared, Task 4 dùng = circumsphere reuse ✓
- `insphereCubeRule` id 'insphereCube' priority 47 Task 4 ↔ registry ✓
- producesOf case 'polygon' Task 1 khớp op literal Zod ✓
- prefix id: polygon 'sec' (Task 1 builder) ✓

## Notes for the executor

- Chạy test TỪ WORKTREE: `npx jest -c jest.worktree.config.js <path>` (plain jest → "No tests found").
- Render đã có (polygon3d/sphere3d/cone3d/cylinder3d) — KHÔNG sửa `core/scene/kinds/*`; chỉ thêm tầng AI.
- **Honest-metric**: FULL có thể KHÔNG nhảy mạnh (tron-xoay MC). Win = construct VẼ ĐƯỢC + verify số học + Playwright/MCP. Gate cứng = 0-regression + full jest.
- Ưu tiên SIẾT guard hơn nới rule. Nếu thêm rule làm 1 bài currently-FULL flip → điều tra ngay.
- Cycle A (Task 1-3) độc lập Cycle C (Task 4). Task 5 sau cả hai.
- Synth name HIỂN THỊ: A–H/O/I/T (non-digit, non-`_`) — gotcha subscript-literal.
- Box insphere có thể non-cube → MCP visual quyết định fallback (8 free point cube ±1).
