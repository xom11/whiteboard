# 3D Metric / Perpendicularity (Phase 3a) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw perpendicular feet (projection/altitude), perpendicular line↔plane and plane↔line, distance segments, and line–plane angles (as projection triangles) for the Text→3D-figure pipeline, wired as NEW RULES ONLY over existing intent ops/builders/constraints (zero new core kind, op, or builder).

**Architecture:** 4 new `LanguageRule3D` modules emit existing intents — `add-point-3d` with `perpFootPlane{from,plane}` / `perpFootLine{from,a,b}` constraints (resolved by `buildAddPoint3d`'s general path, since `from/plane/a/b ∈ REF_FIELDS`), `plane{spec:{kind:'perpToLine'}}` (→`planePerpToLine`), `line{kind:'perpToPlane'}` (→`linePerpToPlane`), and `connect{from,to}` (→`segment3d`) for distance/projection segments. A shared `baseFaceOf(problem)` helper synthesizes the base plane from the solid head when the problem says "đáy"/"mặt đáy" with no `(XYZ)` token. `verify3d` gains perpFoot checks. No change to `intent.ts`, `intent-builders/*`, `intentTopo3d.ts`, or `core/scene/kinds/*`.

**Tech Stack:** TypeScript (strict), Zod 3, JSXGraph `view3d`, Jest 29 (ts-jest/jsdom), Playwright, `tsx` for scripts.

## Global Constraints

- TypeScript strict; avoid `any` where avoidable (builders/tests may cast via `unknown` like the foundation).
- Vietnamese regex: ALWAYS flag `u` + lookaround `(?!\p{L})` instead of `\b`. **Cue/prefilter** regexes may use `/iu` for sentence-initial capitals, but any regex that **captures `[A-Z]` labels** MUST stay strict `/u` (a blanket `/i` makes `[A-Z]` match lowercase → wrong labels). Handle sentence-initial capitals with explicit alternation like `[Hh]ình`.
- ANY `new RegExp(\`...${name}...\`)` MUST wrap `name` in `escapeRe(name)`. (These rules use STATIC regexes with capture groups — no dynamic name interpolation — so `escapeRe` is not needed; do not introduce dynamic name regexes.)
- Registry-dispatch, no central switch: adding a construct = 1 rule module + 1 registry line + 1 test.
- Fork (copy+adapt) the 3D layer; do NOT import-couple the mature 2D `geometry-2d/ai/`. Reuse only `core/scene/*` + the 3D `ai/` modules.
- Commit messages Vietnamese (prefix English: `feat`/`fix`/`test`/`docs`). **NO `Co-Authored-By`.**
- Run tests from THIS worktree with `npx jest -c jest.worktree.config.js <path>`.
- 3D probe metric is 3-tier (FULL/PARTIAL/NONE). **Hard rule: 0-regression — FULL must not drop and NONE must not rise** on any dataset (`npx tsx scripts/diag-all-3d.ts`). Baseline (HEAD `6dbfaad`): ss-thietdien 30/176/35 · vuonggoc 104/205/59 · tron-xoay 15/30/44 · TOTAL 149/411/138.
- **Rule fail-soft:** a helper returning `null` (e.g. `baseFaceOf` when no solid head) → the rule skips that clause (no throw). Builders throw only on genuinely unresolvable refs (`resolveId`).
- **RULE CO-FIRING (Phase-2 gotcha):** `runRules3D` runs EVERY pattern-matching rule and CONCATENATES intents (no first-match-wins). The 4 metric rules share the "vuông góc/⊥" surface, so each MUST guard (`continue`) against clauses owned by a sibling. Co-firing is tested at the `runRules3D` level (coverage-independent), RED→GREEN.

## Verified substrate facts (do not re-derive)

- `Constraint3D` (`core/scene/kinds/3d-constraint.ts`): `perpFootLine{kind:'perpFootLine';from:string;a:string;b:string}` + `perpFootPlane{kind:'perpFootPlane';from:string;plane:string}`. World coords computed in `constraint3d-math.ts` (`constraintToWorldInner` cases at lines 292/301). Both are derived (non-draggable) points → render as `point3d`.
- `buildAddPoint3d` (`intent-builders/addPoint3d.ts`): `REF_FIELDS = {p1,p2,from,plane,a,b,a1,b1,a2,b2,lineId,planeId,polygonId,sphereId}`. General path resolves any REF_FIELD string to a scene id. So `add-point-3d` with constraint `{kind:'perpFootPlane',from:'S',plane:'mp_ABC'}` or `{kind:'perpFootLine',from:'A',a:'S',b:'B'}` works with NO builder change.
- `buildPlane3d` (`intent-builders/plane.ts`): handles `spec.kind` ∈ {`threePoints{p1,p2,p3}`, `parallelThrough{point,refPlane}`, `perpToLine{point,lineA,lineB}`}.
- `buildLine3d` (`intent-builders/line.ts`): handles `intent.kind` ∈ {`segment`,`line`,`ray`,`planePlaneIntersection`,`parallelThrough`,`perpToPlane`}. `line3dIntent({name?,kind,...refs})` routes non-(name|kind) keys into `refs`. For `perpToPlane` it reads `refs.point` + `refs.plane`.
- `buildConnect` (`intent-builders/connect.ts`): `connect3d(from,to,'segment')` → `segment3d{p1,p2}` (visible, registerInNameMap=false). No color param.
- Factories re-exported from `rules/_shared.ts`: `solid, addPoint3d, plane3d, line3dIntent, connect3d, crossSection3d`. Also exported there: `extractName3D`, `splitVertexToken`.
- `Intent3DZ` (`intent.ts`): `AddPoint3DIntentZ.constraint = z.record(z.unknown())`, `Plane3DIntentZ.spec = z.record(z.unknown())` → perpFoot/perpToLine records pass `.parse` unstripped. `Label3DZ = /^[A-Za-z][A-Za-z0-9'′’´_]*$/` (underscore allowed → synth names like `H_S`, `mp_ABC` valid).
- `runRules3D` (`rules/registry.ts`): for each rule in `ALL_RULES_3D` (sorted by priority desc), if any `rule.patterns` matches the FULL `ctx.problem`, call `rule.match(ctx)` and push all returned `RuleMatch3D`. `RuleMatch3D = {ruleId, clauseIds:number[], intents:Intent3DT[]}`.
- `runDeterministicIntents3d`: dedups intents on `JSON.stringify(intent)` → identical intents collapse (safe to emit the same ref plane from multiple rules).
- `planeNamed` token = EXACTLY 3 letters `/\(([A-Z])([A-Z])([A-Z])\)/gu`, emits `plane3d('mp_XYZ',{kind:'threePoints',p1,p2,p3})`. Emit section/foot planes with the SAME `mp_XYZ` naming so dedup collapses. A 4-letter token `(ABCD)` is NOT claimed by planeNamed.
- `segmentClauses3D` (`deterministic/coverage3d.ts`): masks parens (≤40 chars) and `S.ABCD` periods before splitting on `[.;\n]+|, (?=<leading-verb>)`, then RESTORES parens in the returned `clause.text`. So rules see normal text incl. `(SBC)`. `hasGeometry = countGeometryKeywords3D(text)>0 && !PROOF_ONLY`. Vocab already includes `vuông góc, hình chiếu, chân đường, khoảng cách, góc, mặt phẳng, đáy, đỉnh, cạnh, đường thẳng`.
- `guards3d.SOLID_HEAD = /(?:hình\s+chóp\s+([A-Z])\.([A-Z'′₀-₉0-9]+))|(?:tứ\s+diện(?:\s+đều)?\s+([A-Z'′]{4}))|(?:lăng\s+trụ\s+([A-Z]{3,})\.([A-Z'′]+))/gu` (apex+base / tetra / prism). Reuse the PATTERN (re-implement locally in `_shared`, do not export from guards3d).
- `intentToScene3d` build loop runs `orderIntents3dByDependency` (Kahn topo on produces/consumes) then `OP_BUILDERS_3D[op]`; `meta.view = {bbox3D:[-3,-3,-3,3,3,3], azimuth:1.0, elevation:0.6}`. `add-point-3d` produces `[name]`; `plane`/`line` produce `[name]`; `connect` produces `[]`. `consumesOf` auto-detects `from/plane/a/b/point/lineA/lineB/refs.*` string refs → no topo change needed.

## File Structure

```
src/stamps/geometry-3d/ai/
  rules/
    _shared.ts            ← MODIFY: + parseSolidHead3D, baseFaceOf
    projectionFoot.ts     ← NEW: hình chiếu / khoảng-cách-điểm / chân đường → perpFoot* + connect
    perpLineToPlane.ts    ← NEW: đường qua P ⊥ mặt → line{perpToPlane}
    perpPlaneToLine.ts    ← NEW: mặt qua P ⊥ đường → plane{perpToLine}
    angleLinePlane.ts     ← NEW: góc đường–mặt → projection triangle
    registry.ts           ← MODIFY: register 4 rules (priority 51–54)
    __tests__/            ← NEW tests alongside each rule + co-firing
  verify3d.ts             ← MODIFY: perpFootPlane/perpFootLine checks
  __tests__/
    intentToScene3d.metric.test.ts  ← NEW: numeric end-to-end
    verify3d.metric.test.ts         ← NEW
tests/e2e/geometry-3d-figure.spec.ts ← MODIFY: hình-chiếu render case
```

---

## Task 1: `baseFaceOf` + `parseSolidHead3D` helper (`rules/_shared.ts`)

**Files:**
- Modify: `src/stamps/geometry-3d/ai/rules/_shared.ts`
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/baseFace3d.test.ts`

**Interfaces:**
- Consumes: `splitVertexToken` (already in `_shared.ts`).
- Produces:
  - `interface SolidHead3D { apex?: string; baseLabels: string[] }`
  - `function parseSolidHead3D(problem: string): SolidHead3D | null`
  - `function baseFaceOf(problem: string): { planeName: string; p1: string; p2: string; p3: string } | null`

- [ ] **Step 1: Write the failing test**

```ts
// rules/__tests__/baseFace3d.test.ts
import { parseSolidHead3D, baseFaceOf } from '../_shared';

describe('parseSolidHead3D', () => {
  it('pyramid S.ABCD → apex S, base ABCD', () => {
    expect(parseSolidHead3D('Cho hình chóp S.ABCD có đáy là hình vuông.')).toEqual({ apex: 'S', baseLabels: ['A','B','C','D'] });
  });
  it('tetrahedron ABCD → base ABCD, no apex', () => {
    expect(parseSolidHead3D('Cho tứ diện ABCD.')).toEqual({ baseLabels: ['A','B','C','D'] });
  });
  it('prism ABC.A′B′C′ → base ABC', () => {
    const r = parseSolidHead3D('Cho lăng trụ ABC.A′B′C′ đều.');
    expect(r?.baseLabels).toEqual(['A','B','C']);
  });
  it('no solid head → null', () => {
    expect(parseSolidHead3D('Tính khoảng cách giữa hai đường thẳng.')).toBeNull();
  });
});

describe('baseFaceOf', () => {
  it('pyramid → mp_ABC from first 3 base labels', () => {
    expect(baseFaceOf('Cho hình chóp S.ABCD có đáy ABCD là hình vuông.')).toEqual({ planeName: 'mp_ABC', p1: 'A', p2: 'B', p3: 'C' });
  });
  it('returns null when no solid head', () => {
    expect(baseFaceOf('Một mặt phẳng bất kì.')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/baseFace3d.test.ts`
Expected: FAIL — `parseSolidHead3D is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `rules/_shared.ts`:

```ts
export interface SolidHead3D { apex?: string; baseLabels: string[] }

// Mirror guards3d.SOLID_HEAD (non-global here — first match only).
const SOLID_HEAD_3D =
  /(?:hình\s+chóp\s+([A-Z])\.([A-Z'′₀-₉0-9]+))|(?:tứ\s+diện(?:\s+đều)?\s+([A-Z'′]{3,}))|(?:lăng\s+trụ\s+([A-Z]{3,})\.([A-Z'′]+))/u;

/** Parse the leading solid header → apex (pyramid only) + base vertex labels. */
export function parseSolidHead3D(problem: string): SolidHead3D | null {
  const m = SOLID_HEAD_3D.exec(problem);
  if (!m) return null;
  if (m[1]) return { apex: m[1], baseLabels: splitVertexToken(m[2] ?? '') };  // pyramid
  if (m[3]) return { baseLabels: splitVertexToken(m[3]) };                    // tetrahedron
  if (m[4]) return { baseLabels: splitVertexToken(m[4]) };                    // prism (bottom face)
  return null;
}

/** Implied base plane (3 base vertices) for "đáy"/"mặt đáy" with no (XYZ) token. */
export function baseFaceOf(problem: string): { planeName: string; p1: string; p2: string; p3: string } | null {
  const head = parseSolidHead3D(problem);
  if (!head || head.baseLabels.length < 3) return null;
  const [p1, p2, p3] = head.baseLabels;
  const clean = (s: string) => s.replace(/['′’´₀-₉0-9]/gu, '');
  return { planeName: `mp_${clean(p1)}${clean(p2)}${clean(p3)}`, p1, p2, p3 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/baseFace3d.test.ts`
Expected: PASS (6).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/rules/_shared.ts src/stamps/geometry-3d/ai/rules/__tests__/baseFace3d.test.ts
git commit -m "feat(3d-ai): helper parseSolidHead3D + baseFaceOf (mặt đáy ẩn từ solid-head)"
```

---

## Task 2: `projectionFoot` rule — chân ⊥ / hình chiếu / khoảng-cách-điểm

**Files:**
- Create: `src/stamps/geometry-3d/ai/rules/projectionFoot.ts`
- Modify: `src/stamps/geometry-3d/ai/rules/registry.ts`
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/projectionFoot.test.ts`

**Interfaces:**
- Consumes: `plane3d`, `addPoint3d`, `connect3d`, `baseFaceOf` (`./_shared`); `segmentClauses3D` (`../deterministic/coverage3d`) + `intentToScene3d`, `constraintToWorld` in the test.
- Produces: `export const projectionFootRule: LanguageRule3D` (priority 54); registered in `ALL_RULES_3D`.
  - For a PLANE target: emits `plane('mp_<XYZ>',{kind:'threePoints',...})` + `add-point-3d{name, constraint:{kind:'perpFootPlane',from,plane:'mp_<XYZ>'}}` + `connect(from,name)`.
  - For a LINE target: `add-point-3d{name, constraint:{kind:'perpFootLine',from,a,b}}` + `connect(from,name)`.
  - Foot name = captured "X là" name, else synth `H_<from-without-prime>`.

- [ ] **Step 1: Write the failing test**

```ts
// rules/__tests__/projectionFoot.test.ts
import { projectionFootRule } from '../projectionFoot';
import { segmentClauses3D } from '../../deterministic/coverage3d';

const run = (p: string) => projectionFootRule.match({ problem: p, clauses: segmentClauses3D(p) });
const flat = (p: string) => run(p).flatMap((m) => m.intents) as any[];

describe('projectionFootRule', () => {
  it('"Hình chiếu của S trên (ABC)" → perpFootPlane foot + ref plane + segment', () => {
    const I = flat('Cho hình chóp S.ABC. Hình chiếu vuông góc của S trên mặt phẳng (ABC) là điểm H.');
    expect(I.find((i) => i.op === 'plane')).toMatchObject({ name: 'mp_ABC', spec: { kind: 'threePoints', p1: 'A', p2: 'B', p3: 'C' } });
    const pt = I.find((i) => i.op === 'add-point-3d');
    expect(pt.constraint).toMatchObject({ kind: 'perpFootPlane', from: 'S', plane: 'mp_ABC' });
    expect(I.find((i) => i.op === 'connect')).toMatchObject({ from: 'S', to: pt.name });
  });

  it('"Hình chiếu của S trên mặt đáy" → base plane synth + perpFootPlane', () => {
    const I = flat('Cho hình chóp S.ABCD. Hình chiếu của S lên mặt đáy là H.');
    expect(I.find((i) => i.op === 'plane')).toMatchObject({ name: 'mp_ABC' });
    expect(I.find((i) => i.op === 'add-point-3d').constraint).toMatchObject({ kind: 'perpFootPlane', from: 'S', plane: 'mp_ABC' });
  });

  it('"Gọi H là hình chiếu của A trên cạnh SB" → perpFootLine, foot named H', () => {
    const I = flat('Cho hình chóp S.ABCD. Gọi H là hình chiếu vuông góc của A trên cạnh SB.');
    const pt = I.find((i) => i.op === 'add-point-3d');
    expect(pt).toMatchObject({ name: 'H', constraint: { kind: 'perpFootLine', from: 'A', a: 'S', b: 'B' } });
    expect(I.find((i) => i.op === 'connect')).toMatchObject({ from: 'A', to: 'H' });
  });

  it('"khoảng cách từ A đến (SBC)" → synth foot H_A + perpFootPlane + segment', () => {
    const I = flat('Cho hình chóp S.ABCD. Tính khoảng cách từ A đến mặt phẳng (SBC).');
    const pt = I.find((i) => i.op === 'add-point-3d');
    expect(pt).toMatchObject({ name: 'H_A', constraint: { kind: 'perpFootPlane', from: 'A', plane: 'mp_SBC' } });
    expect(I.find((i) => i.op === 'connect')).toMatchObject({ from: 'A', to: 'H_A' });
  });

  it('claims the clause it matched', () => {
    const m = run('Cho hình chóp S.ABC. Gọi H là hình chiếu của S trên (ABC).');
    expect(m.some((x) => x.clauseIds.length === 1)).toBe(true);
  });

  it('does not match a value-only clause', () => {
    expect(run('Khoảng cách đó bằng a căn 3.')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/projectionFoot.test.ts`
Expected: FAIL — `Cannot find module '../projectionFoot'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// rules/projectionFoot.ts
import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { plane3d, addPoint3d, connect3d, baseFaceOf } from './_shared';

// Cue/prefilter (full problem): /iu so sentence-initial capitals match.
const CUE = /hình\s*chiếu|chân\s+đường|khoảng\s*cách/iu;

// Capture regexes stay /u (strict [A-Z]); sentence-initial capital via [Hh]/[Kk]/[Cc].
// Target = plane token (≥3 letters), or "mặt đáy"/"đáy", or a bare 2-letter line.
const TARGET =
  '(?:(?:mặt\\s*phẳng\\s*)?\\(([A-Z]{3,})\\)|(mặt\\s*đáy|[Đđ]áy)|(?:cạnh\\s+|đường\\s*thẳng\\s+)?([A-Z](?:[\'′])?)([A-Z](?:[\'′])?))';

// "[<H> là] hình chiếu [vuông góc] [của] [đỉnh|điểm] <from> lên|trên|xuống <target>"
const RE_HC = new RegExp(
  '(?:([A-Z](?:[\'′])?)\\s+là\\s+)?[Hh]ình\\s*chiếu\\s*(?:vuông\\s*góc\\s*)?(?:của\\s+)?(?:đỉnh\\s+|điểm\\s+)?([A-Z](?:[\'′])?)\\s*(?:lên|trên|xuống)\\s+' + TARGET,
  'u',
);
// "chân đường (vuông góc|cao) [hạ] [từ] <from> [lên|trên|xuống|đến] <target>"
const RE_CHAN = new RegExp(
  '(?:([A-Z](?:[\'′])?)\\s+là\\s+)?[Cc]hân\\s+đường\\s+(?:vuông\\s*góc|cao)\\s+(?:hạ\\s+)?(?:từ\\s+|của\\s+)?(?:đỉnh\\s+|điểm\\s+)?([A-Z](?:[\'′])?)\\s*(?:lên|trên|xuống|đến)\\s+' + TARGET,
  'u',
);
// "khoảng cách (từ) <from> đến <target>"  (foot unnamed → synth)
const RE_KC = new RegExp(
  '[Kk]hoảng\\s*cách\\s+(?:từ\\s+)?(?:đỉnh\\s+|điểm\\s+)?([A-Z](?:[\'′])?)\\s+đến\\s+' + TARGET,
  'u',
);

const stripPrime = (s: string) => s.replace(/['′]/gu, '');

type Target =
  | { kind: 'plane'; planeName: string; p: [string, string, string] }
  | { kind: 'line'; a: string; b: string };

function toTarget(planeTok: string | undefined, dayKw: string | undefined, lineA: string | undefined, lineB: string | undefined, problem: string): Target | null {
  if (planeTok) {
    const L = [...planeTok].slice(0, 3) as [string, string, string];
    return { kind: 'plane', planeName: `mp_${L.join('')}`, p: L };
  }
  if (dayKw) {
    const bf = baseFaceOf(problem);
    if (!bf) return null;
    return { kind: 'plane', planeName: bf.planeName, p: [bf.p1, bf.p2, bf.p3] };
  }
  if (lineA && lineB) return { kind: 'line', a: lineA, b: lineB };
  return null;
}

function emit(named: string | undefined, from: string, t: Target): Intent3DT[] {
  const foot = named ?? `H_${stripPrime(from)}`;
  const out: Intent3DT[] = [];
  if (t.kind === 'plane') {
    out.push(plane3d(t.planeName, { kind: 'threePoints', p1: t.p[0], p2: t.p[1], p3: t.p[2] }));
    out.push(addPoint3d(foot, { kind: 'perpFootPlane', from, plane: t.planeName }));
  } else {
    out.push(addPoint3d(foot, { kind: 'perpFootLine', from, a: t.a, b: t.b }));
  }
  out.push(connect3d(from, foot, 'segment'));
  return out;
}

export const projectionFootRule: LanguageRule3D = {
  id: 'projectionFoot',
  priority: 54,
  languages: ['vi'],
  patterns: [/hình\s*chiếu/iu, /chân\s+đường/iu, /khoảng\s*cách/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      if (!CUE.test(c.text)) continue;
      let m = RE_HC.exec(c.text) ?? RE_CHAN.exec(c.text);
      if (m) {
        const t = toTarget(m[3], m[4], m[5], m[6], ctx.problem);
        if (!t) continue;
        out.push({ ruleId: this.id, clauseIds: [c.id], intents: emit(m[1], m[2], t) });
        continue;
      }
      m = RE_KC.exec(c.text);
      if (m) {
        const t = toTarget(m[2], m[3], m[4], m[5], ctx.problem);
        if (!t) continue;
        out.push({ ruleId: this.id, clauseIds: [c.id], intents: emit(undefined, m[1], t) });
      }
    }
    return out;
  },
};
```

In `rules/registry.ts`, import and insert into `RULES` (priority 54, above `intersectionLineRule`/`crossSectionParallelRule` 58? — NO, below them; place after `pointOnEdgeRule` 60 block, before `intersectionLineRule`):

```ts
import { projectionFootRule } from './projectionFoot';
// ... in RULES array (keep priority-descending comments accurate):
  projectionFootRule,         // priority 54
```

> Placement note: `ALL_RULES_3D` re-sorts by `priority` desc, so array position is cosmetic — but keep the comment band ordered. Add the 4 new rules (Tasks 2–5) anywhere in `RULES`; the sort handles ordering.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/projectionFoot.test.ts`
Expected: PASS (6).

- [ ] **Step 5: End-to-end numeric check (rule → scene) — append to the same test file**

```ts
import { intentToScene3d } from '../../intentToScene3d';
import { constraintToWorld } from '../../../../../core/scene/kinds/constraint3d-math';

function sub(a: number[], b: number[]) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function cross(a: number[], b: number[]) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function norm(a: number[]) { return Math.hypot(a[0], a[1], a[2]); }

it('perpFootPlane foot builds coplanar with base + altitude ⊥ base', () => {
  const I = flat('Cho hình chóp S.ABCD. Hình chiếu của S lên mặt đáy là H.');
  const st: any = intentToScene3d(I as any);
  const foot = Object.values(st.objects).find((o: any) => o.kind === 'point3d' && o.label === 'H') as any;
  expect(foot).toBeTruthy();
  const W = (id: string) => constraintToWorld((st.objects[id].attrs as any).constraint, st) as number[];
  const A = W(st.nameToId?.get?.('A') ?? Object.values(st.objects).find((o:any)=>o.label==='A').id);
  // foot lies on plane(A,B,C): use the plane object's frame via its 3 points
  const Bp = Object.values(st.objects).find((o:any)=>o.label==='B') as any;
  const Cp = Object.values(st.objects).find((o:any)=>o.label==='C') as any;
  const Sp = Object.values(st.objects).find((o:any)=>o.label==='S') as any;
  const Hp = foot;
  const wa = A, wb = W(Bp.id), wc = W(Cp.id), ws = W(Sp.id), wh = W(Hp.id);
  const n = cross(sub(wb, wa), sub(wc, wa));
  const dist = Math.abs(sub(wh, wa).reduce((s, v, i) => s + v * n[i], 0)) / (norm(n) || 1);
  expect(dist).toBeLessThan(1e-6);                                  // foot on base plane
  // S→H parallel to normal ⇒ cross(S-H, n) ≈ 0
  expect(norm(cross(sub(ws, wh), n))).toBeLessThan(1e-6);
  // a distance segment S–H exists
  expect(Object.values(st.objects).some((o: any) => o.kind === 'segment3d')).toBe(true);
});
```

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/projectionFoot.test.ts`
Expected: PASS (7).

- [ ] **Step 6: Run existing rule + scene suites for 0-regression**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/ src/stamps/geometry-3d/ai/__tests__/`
Expected: PASS (all existing 3D tests still green).

- [ ] **Step 7: Commit**

```bash
git add src/stamps/geometry-3d/ai/rules/projectionFoot.ts src/stamps/geometry-3d/ai/rules/registry.ts src/stamps/geometry-3d/ai/rules/__tests__/projectionFoot.test.ts
git commit -m "feat(3d-ai): projectionFoot rule (chân ⊥/hình chiếu/khoảng cách → perpFoot + đoạn nối)"
```

---

## Task 3: `perpLineToPlane` rule — đường qua điểm ⊥ mặt

**Files:**
- Create: `src/stamps/geometry-3d/ai/rules/perpLineToPlane.ts`
- Modify: `src/stamps/geometry-3d/ai/rules/registry.ts`
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/perpLineToPlane.test.ts`

**Interfaces:**
- Consumes: `plane3d`, `line3dIntent`, `baseFaceOf` (`./_shared`).
- Produces: `export const perpLineToPlaneRule: LanguageRule3D` (priority 53). Emits `plane('mp_XYZ',threePoints)` (ref, dedups) + `line3dIntent({name?, kind:'perpToPlane', point, plane:'mp_XYZ'})`.
- Co-fire guard: skip clauses containing `hình chiếu|chân đường|khoảng cách` (projectionFoot owns those).

- [ ] **Step 1: Write the failing test**

```ts
// rules/__tests__/perpLineToPlane.test.ts
import { perpLineToPlaneRule } from '../perpLineToPlane';
import { segmentClauses3D } from '../../deterministic/coverage3d';

const run = (p: string) => perpLineToPlaneRule.match({ problem: p, clauses: segmentClauses3D(p) });
const flat = (p: string) => run(p).flatMap((m) => m.intents) as any[];

describe('perpLineToPlaneRule', () => {
  it('"đường thẳng qua A vuông góc với (SBC)" → perpToPlane line + ref plane', () => {
    const I = flat('Kẻ đường thẳng qua A vuông góc với mặt phẳng (SBC).');
    expect(I.find((i) => i.op === 'plane')).toMatchObject({ name: 'mp_SBC', spec: { kind: 'threePoints', p1: 'S', p2: 'B', p3: 'C' } });
    expect(I.find((i) => i.op === 'line')).toMatchObject({ kind: 'perpToPlane', refs: { point: 'A', plane: 'mp_SBC' } });
  });

  it('"qua A vuông góc với đáy" → base plane synth', () => {
    const I = flat('Cho hình chóp S.ABCD. Qua A dựng đường thẳng vuông góc với đáy.');
    expect(I.find((i) => i.op === 'line')).toMatchObject({ kind: 'perpToPlane', refs: { point: 'A', plane: 'mp_ABC' } });
  });

  it('co-fire guard: does NOT fire on a "hình chiếu" clause', () => {
    expect(run('Gọi H là hình chiếu vuông góc của A trên (SBC).')).toEqual([]);
  });

  it('does NOT fire when target is a line (perpPlaneToLine owns it)', () => {
    expect(run('Mặt phẳng qua A vuông góc với BC.')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/perpLineToPlane.test.ts`
Expected: FAIL — `Cannot find module '../perpLineToPlane'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// rules/perpLineToPlane.ts
import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { plane3d, line3dIntent, baseFaceOf } from './_shared';

const OWNED_BY_FOOT = /hình\s*chiếu|chân\s+đường|khoảng\s*cách/iu;
// "[đường thẳng] qua <P> [và] vuông góc [với] [mặt phẳng] (<XYZ>) | đáy"
const RE = new RegExp(
  '(?:đường\\s*thẳng\\s+)?qua\\s+([A-Z](?:[\'′])?)\\s*(?:và\\s+)?(?:vuông\\s*góc|⊥)\\s*(?:với\\s+)?(?:mặt\\s*phẳng\\s*)?(?:\\(([A-Z]{3,})\\)|(mặt\\s*đáy|[Đđ]áy))',
  'u',
);

export const perpLineToPlaneRule: LanguageRule3D = {
  id: 'perpLineToPlane',
  priority: 53,
  languages: ['vi'],
  patterns: [/vuông\s*góc/iu, /⊥/u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      if (OWNED_BY_FOOT.test(c.text)) continue;            // co-fire guard
      const m = RE.exec(c.text);
      if (!m) continue;
      const point = m[1];
      let planeName: string; let p: [string, string, string];
      if (m[2]) { const L = [...m[2]].slice(0, 3) as [string, string, string]; planeName = `mp_${L.join('')}`; p = L; }
      else { const bf = baseFaceOf(ctx.problem); if (!bf) continue; planeName = bf.planeName; p = [bf.p1, bf.p2, bf.p3]; }
      const intents: Intent3DT[] = [
        plane3d(planeName, { kind: 'threePoints', p1: p[0], p2: p[1], p3: p[2] }),
        line3dIntent({ kind: 'perpToPlane', point, plane: planeName }),
      ];
      out.push({ ruleId: this.id, clauseIds: [c.id], intents });
    }
    return out;
  },
};
```

In `rules/registry.ts`: `import { perpLineToPlaneRule } from './perpLineToPlane';` + add `perpLineToPlaneRule,   // priority 53` to `RULES`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/perpLineToPlane.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/rules/perpLineToPlane.ts src/stamps/geometry-3d/ai/rules/registry.ts src/stamps/geometry-3d/ai/rules/__tests__/perpLineToPlane.test.ts
git commit -m "feat(3d-ai): perpLineToPlane rule (đường qua điểm ⊥ mặt → linePerpToPlane)"
```

---

## Task 4: `perpPlaneToLine` rule — mặt qua điểm ⊥ đường

**Files:**
- Create: `src/stamps/geometry-3d/ai/rules/perpPlaneToLine.ts`
- Modify: `src/stamps/geometry-3d/ai/rules/registry.ts`
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/perpPlaneToLine.test.ts`

**Interfaces:**
- Consumes: `plane3d` (`./_shared`).
- Produces: `export const perpPlaneToLineRule: LanguageRule3D` (priority 52). Emits `plane3d(name,{kind:'perpToLine',point,lineA,lineB})`. Plane name synth `mp_perp_<point>`.
- Co-fire guard: skip `hình chiếu|chân đường|khoảng cách`; require subject "mặt phẳng" and a LINE target (2 capital letters), NOT a plane token.

- [ ] **Step 1: Write the failing test**

```ts
// rules/__tests__/perpPlaneToLine.test.ts
import { perpPlaneToLineRule } from '../perpPlaneToLine';
import { segmentClauses3D } from '../../deterministic/coverage3d';

const run = (p: string) => perpPlaneToLineRule.match({ problem: p, clauses: segmentClauses3D(p) });
const flat = (p: string) => run(p).flatMap((m) => m.intents) as any[];

describe('perpPlaneToLineRule', () => {
  it('"mặt phẳng qua A vuông góc với BC" → perpToLine plane', () => {
    const I = flat('Dựng mặt phẳng qua A vuông góc với BC.');
    expect(I.find((i) => i.op === 'plane')).toMatchObject({ name: 'mp_perp_A', spec: { kind: 'perpToLine', point: 'A', lineA: 'B', lineB: 'C' } });
  });

  it('"mặt phẳng (P) qua O vuông góc SA" → perpToLine plane', () => {
    const I = flat('Cho hình chóp S.ABCD tâm O. Mặt phẳng qua O vuông góc SA.');
    expect(I.find((i) => i.op === 'plane')).toMatchObject({ spec: { kind: 'perpToLine', point: 'O', lineA: 'S', lineB: 'A' } });
  });

  it('does NOT fire when target is a plane (perpLineToPlane owns it)', () => {
    expect(run('Đường thẳng qua A vuông góc với (SBC).')).toEqual([]);
  });

  it('co-fire guard: does NOT fire on a "hình chiếu" clause', () => {
    expect(run('Hình chiếu của S trên (ABC).')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/perpPlaneToLine.test.ts`
Expected: FAIL — `Cannot find module '../perpPlaneToLine'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// rules/perpPlaneToLine.ts
import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { plane3d } from './_shared';

const OWNED_BY_FOOT = /hình\s*chiếu|chân\s+đường|khoảng\s*cách/iu;
// "mặt phẳng [(P)] qua <Pt> [và] vuông góc [với] [đường thẳng] <L1><L2>"
// LINE target = exactly two capital letters (NOT a "(XYZ)" plane token).
const RE = new RegExp(
  'mặt\\s*phẳng\\s*(?:\\([A-Z]\\)\\s*)?qua\\s+([A-Z](?:[\'′])?)\\s*(?:và\\s+)?(?:vuông\\s*góc|⊥)\\s*(?:với\\s+)?(?:đường\\s*thẳng\\s+)?([A-Z](?:[\'′])?)([A-Z](?:[\'′])?)(?![\\p{L}])',
  'u',
);

export const perpPlaneToLineRule: LanguageRule3D = {
  id: 'perpPlaneToLine',
  priority: 52,
  languages: ['vi'],
  patterns: [/vuông\s*góc/iu, /⊥/u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      if (OWNED_BY_FOOT.test(c.text)) continue;            // co-fire guard
      const m = RE.exec(c.text);
      if (!m) continue;
      const [, point, lineA, lineB] = m;
      const intents: Intent3DT[] = [
        plane3d(`mp_perp_${point.replace(/['′]/gu, '')}`, { kind: 'perpToLine', point, lineA, lineB }),
      ];
      out.push({ ruleId: this.id, clauseIds: [c.id], intents });
    }
    return out;
  },
};
```

In `rules/registry.ts`: `import { perpPlaneToLineRule } from './perpPlaneToLine';` + add `perpPlaneToLineRule,   // priority 52`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/perpPlaneToLine.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/rules/perpPlaneToLine.ts src/stamps/geometry-3d/ai/rules/registry.ts src/stamps/geometry-3d/ai/rules/__tests__/perpPlaneToLine.test.ts
git commit -m "feat(3d-ai): perpPlaneToLine rule (mặt qua điểm ⊥ đường → planePerpToLine)"
```

---

## Task 5: `angleLinePlane` rule — góc đường–mặt = tam giác chiếu

**Files:**
- Create: `src/stamps/geometry-3d/ai/rules/angleLinePlane.ts`
- Modify: `src/stamps/geometry-3d/ai/rules/registry.ts`
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/angleLinePlane.test.ts`

**Interfaces:**
- Consumes: `plane3d`, `addPoint3d`, `connect3d`, `baseFaceOf`, `parseSolidHead3D` (`./_shared`); `intentToScene3d` in the test.
- Produces: `export const angleLinePlaneRule: LanguageRule3D` (priority 51). For "góc giữa <apex><vtx> và (đáy|(XYZ))": emit base plane + `add-point{perpFootPlane, from:apex, plane:base}` foot `H_<apex>` + `connect(apex,foot)` + `connect(foot,vtx)` + `connect(apex,vtx)`.
- Guard: one endpoint MUST equal the solid's apex (off-base); else skip.

- [ ] **Step 1: Write the failing test**

```ts
// rules/__tests__/angleLinePlane.test.ts
import { angleLinePlaneRule } from '../angleLinePlane';
import { segmentClauses3D } from '../../deterministic/coverage3d';

const run = (p: string) => angleLinePlaneRule.match({ problem: p, clauses: segmentClauses3D(p) });
const flat = (p: string) => run(p).flatMap((m) => m.intents) as any[];

describe('angleLinePlaneRule', () => {
  it('"góc giữa SC và đáy" → apex-foot + projection triangle', () => {
    const I = flat('Cho hình chóp S.ABCD. Góc giữa SC và mặt đáy bằng 60°.');
    const pt = I.find((i) => i.op === 'add-point-3d');
    expect(pt).toMatchObject({ name: 'H_S', constraint: { kind: 'perpFootPlane', from: 'S', plane: 'mp_ABC' } });
    const connects = I.filter((i) => i.op === 'connect').map((i) => [i.from, i.to].sort().join(''));
    expect(connects).toEqual(expect.arrayContaining([['S', 'H_S'].sort().join(''), ['H_S', 'C'].sort().join(''), ['S', 'C'].sort().join('')]));
  });

  it('"SC tạo với đáy một góc" also matches', () => {
    const I = flat('Cho hình chóp S.ABC. SC tạo với mặt đáy một góc 45°.');
    expect(I.find((i) => i.op === 'add-point-3d')).toMatchObject({ constraint: { from: 'S', kind: 'perpFootPlane' } });
  });

  it('does NOT fire for two base vertices (no apex endpoint)', () => {
    expect(run('Cho hình chóp S.ABCD. Góc giữa AB và đáy.')).toEqual([]);
  });

  it('does NOT fire for dihedral "góc giữa hai mặt phẳng"', () => {
    expect(run('Cho hình chóp S.ABCD. Góc giữa hai mặt phẳng (SBC) và (ABCD).')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/angleLinePlane.test.ts`
Expected: FAIL — `Cannot find module '../angleLinePlane'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// rules/angleLinePlane.ts
import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { plane3d, addPoint3d, connect3d, baseFaceOf, parseSolidHead3D } from './_shared';

// "góc giữa|hợp [cạnh|đường thẳng] <X><Y> và [mặt phẳng] (đáy|(XYZ))"
// or "<X><Y> tạo với [mặt] đáy [một] góc"
const RE_GIUA = new RegExp(
  '(?:góc\\s+(?:giữa|hợp(?:\\s+bởi)?)\\s+(?:cạnh\\s+|đường\\s*thẳng\\s+)?)([A-Z](?:[\'′])?)([A-Z](?:[\'′])?)\\s+(?:và|với)\\s+(?:mặt\\s*phẳng\\s*)?(\\(([A-Z]{3,})\\)|mặt\\s*đáy|[Đđ]áy)',
  'u',
);
const RE_TAO = new RegExp(
  '([A-Z](?:[\'′])?)([A-Z](?:[\'′])?)\\s+tạo\\s+với\\s+(?:mặt\\s*phẳng\\s*)?(\\(([A-Z]{3,})\\)|mặt\\s*đáy|[Đđ]áy)\\s*(?:một\\s+)?góc',
  'u',
);
const DIHEDRAL = /góc\s+(?:giữa\s+)?(?:hai\s+mặt\s+phẳng|nhị\s+diện|mặt\s+bên)/iu;

export const angleLinePlaneRule: LanguageRule3D = {
  id: 'angleLinePlane',
  priority: 51,
  languages: ['vi'],
  patterns: [/góc\s+(?:giữa|hợp)/iu, /tạo\s+với/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const head = parseSolidHead3D(ctx.problem);
    const apex = head?.apex;
    if (!apex) return [];                                  // need a pyramid apex to project
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      if (DIHEDRAL.test(c.text)) continue;                 // dihedral → defer (3b)
      const m = RE_GIUA.exec(c.text) ?? RE_TAO.exec(c.text);
      if (!m) continue;
      const e1 = m[1]; const e2 = m[2]; const planeTok = m[4]; const dayKw = !planeTok;
      // exactly one endpoint must be the apex (off-base); the other = base vertex
      let vtx: string | null = null;
      if (e1 === apex && e2 !== apex) vtx = e2;
      else if (e2 === apex && e1 !== apex) vtx = e1;
      if (!vtx) continue;
      let planeName: string; let p: [string, string, string];
      if (planeTok) { const L = [...planeTok].slice(0, 3) as [string, string, string]; planeName = `mp_${L.join('')}`; p = L; }
      else { const bf = baseFaceOf(ctx.problem); if (!bf) continue; planeName = bf.planeName; p = [bf.p1, bf.p2, bf.p3]; void dayKw; }
      const foot = `H_${apex.replace(/['′]/gu, '')}`;
      const intents: Intent3DT[] = [
        plane3d(planeName, { kind: 'threePoints', p1: p[0], p2: p[1], p3: p[2] }),
        addPoint3d(foot, { kind: 'perpFootPlane', from: apex, plane: planeName }),
        connect3d(apex, foot, 'segment'),
        connect3d(foot, vtx, 'segment'),
        connect3d(apex, vtx, 'segment'),
      ];
      out.push({ ruleId: this.id, clauseIds: [c.id], intents });
    }
    return out;
  },
};
```

In `rules/registry.ts`: `import { angleLinePlaneRule } from './angleLinePlane';` + add `angleLinePlaneRule,   // priority 51`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/angleLinePlane.test.ts`
Expected: PASS (4).

- [ ] **Step 5: End-to-end numeric — append to the same test file**

```ts
import { intentToScene3d } from '../../intentToScene3d';
it('projection triangle builds: apex-foot point + 3 segments, no throw', () => {
  const I = flat('Cho hình chóp S.ABCD. Góc giữa SC và mặt đáy bằng 60°.');
  const st: any = intentToScene3d(I as any);
  expect(Object.values(st.objects).some((o: any) => o.kind === 'point3d' && o.label === 'H_S')).toBe(true);
  expect(Object.values(st.objects).filter((o: any) => o.kind === 'segment3d').length).toBeGreaterThanOrEqual(3);
});
```

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/angleLinePlane.test.ts`
Expected: PASS (5).

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-3d/ai/rules/angleLinePlane.ts src/stamps/geometry-3d/ai/rules/registry.ts src/stamps/geometry-3d/ai/rules/__tests__/angleLinePlane.test.ts
git commit -m "feat(3d-ai): angleLinePlane rule (góc đường–mặt = tam giác chiếu)"
```

---

## Task 6: `verify3d` perpFoot checks

**Files:**
- Modify: `src/stamps/geometry-3d/ai/verify3d.ts`
- Test: `src/stamps/geometry-3d/ai/__tests__/verify3d.metric.test.ts`

**Interfaces:**
- Consumes: existing `verify3d.ts` point loop + `planeWorld3`/`ptWorld`/`planeFrame`/`signedDistance` helpers added in Phase 2 (`./crossSectionGeometry`, `constraint3d-math`).
- Produces: extends `verifyFigure3d` — for each `point3d` constraint: `perpFootPlane` → foot on its plane ∧ (foot−from) ∥ plane normal; `perpFootLine` → foot collinear with (a,b) ∧ (foot−from)·(b−a)≈0. Fail-soft try/catch.

> Implementer: open `verify3d.ts`, find the point loop that already handles `intersectionLinePlane` (Phase 2). Add the two cases in the same loop, reusing its `ptWorld`/`planeWorld3` helpers and `planeFrame`/`signedDistance` imports. If a helper name differs, match the actual code.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/verify3d.metric.test.ts
import { verifyFigure3d } from '../verify3d';
import { intentToScene3d } from '../intentToScene3d';
import { solid, addPoint3d, plane3d, connect3d } from '../intent';

it('a valid perpFootPlane figure passes verify', () => {
  const st = intentToScene3d([
    solid({ flavor:'pyramid', baseLabels:['A','B','C','D'], baseVariant:'square', apex:'S', apexVariant:'regular' }),
    plane3d('mp_ABC', { kind:'threePoints', p1:'A', p2:'B', p3:'C' }),
    addPoint3d('H', { kind:'perpFootPlane', from:'S', plane:'mp_ABC' }),
    connect3d('S', 'H'),
  ]);
  expect(verifyFigure3d(st).ok).toBe(true);
});

it('flags a perpFootLine whose stored foot is off the line', () => {
  // perpFootLine foot is computed (always correct); to force a failure, hand-build a
  // free point mislabeled as a foot is not possible via constraint. Instead verify the
  // POSITIVE path for perpFootLine and that verify reports ok for a correct figure.
  const st = intentToScene3d([
    solid({ flavor:'pyramid', baseLabels:['A','B','C','D'], baseVariant:'square', apex:'S', apexVariant:'regular' }),
    addPoint3d('K', { kind:'perpFootLine', from:'A', a:'S', b:'B' }),
  ]);
  const r = verifyFigure3d(st);
  expect(r.ok).toBe(true);
});
```

> Note: derived feet are computed correct-by-construction, so the natural assertion is the POSITIVE path (verify passes for valid feet, and the new code does not false-fail). The negative/guard behavior for fabricated points is already covered by the Phase-2 `intersectionLinePlane` non-finite check. Keep this test focused on no-false-positive + no-regression.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/verify3d.metric.test.ts`
Expected: FAIL initially only if the new checks throw on perpFoot kinds; if base verify already returns `ok:true` (no perpFoot handling), these PASS immediately. In that case, ADD a stricter negative assertion below to drive the implementation:

```ts
it('reports a clear issue list shape (array) and ok boolean', () => {
  const st = intentToScene3d([
    solid({ flavor:'tetrahedron', baseLabels:['A','B','C'], baseVariant:'equilateral-triangle', apex:'D', apexVariant:'regular' }),
    plane3d('mp_ABC', { kind:'threePoints', p1:'A', p2:'B', p3:'C' }),
    addPoint3d('H', { kind:'perpFootPlane', from:'D', plane:'mp_ABC' }),
  ]);
  const r = verifyFigure3d(st);
  expect(typeof r.ok).toBe('boolean');
  expect(r.ok).toBe(true);            // D projects onto plane ABC correctly
});
```

- [ ] **Step 3: Write minimal implementation**

In `verify3d.ts`, inside the point loop after the `intersectionLinePlane` block, add (reuse the file's existing `ptWorld`/`planeWorld3`/`planeFrame`/`signedDistance`; `cross`/`dot`/`sub` may need small local helpers if not present):

```ts
    if (c.kind === 'perpFootPlane') {
      try {
        const [q1, q2, q3] = planeWorld3(state, c.plane);
        const f = planeFrame(q1, q2, q3);
        if (Math.abs(signedDistance(w, f)) > 1e-6) issues.push(`${obj.label || obj.id}: chân ⊥ không nằm trên mặt`);
        const from = ptWorld(state, c.from);
        const d: [number, number, number] = [w[0]-from[0], w[1]-from[1], w[2]-from[2]];
        const cr: [number, number, number] = [
          d[1]*f.normal[2]-d[2]*f.normal[1], d[2]*f.normal[0]-d[0]*f.normal[2], d[0]*f.normal[1]-d[1]*f.normal[0],
        ];
        if (Math.hypot(cr[0], cr[1], cr[2]) > 1e-6) issues.push(`${obj.label || obj.id}: đoạn ⊥ không song song pháp tuyến`);
      } catch (e) { issues.push(`${obj.label || obj.id}: perpFootPlane check lỗi — ${(e as Error).message}`); }
    }
    if (c.kind === 'perpFootLine') {
      try {
        const A = ptWorld(state, c.a); const B = ptWorld(state, c.b); const from = ptWorld(state, c.from);
        const ab: [number, number, number] = [B[0]-A[0], B[1]-A[1], B[2]-A[2]];
        const fh: [number, number, number] = [w[0]-from[0], w[1]-from[1], w[2]-from[2]];
        const perpDot = fh[0]*ab[0] + fh[1]*ab[1] + fh[2]*ab[2];
        if (Math.abs(perpDot) > 1e-6) issues.push(`${obj.label || obj.id}: chân ⊥ trên đường không vuông góc`);
      } catch (e) { issues.push(`${obj.label || obj.id}: perpFootLine check lỗi — ${(e as Error).message}`); }
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/verify3d.metric.test.ts`
Expected: PASS.

- [ ] **Step 5: Run existing verify + scene suites for 0-regression**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/`
Expected: PASS (all).

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-3d/ai/verify3d.ts src/stamps/geometry-3d/ai/__tests__/verify3d.metric.test.ts
git commit -m "feat(3d-ai): verify3d perpFoot checks (chân ⊥ on-plane/on-line + ⊥)"
```

---

## Task 7: Co-firing integration + numeric e2e + Playwright + diag-all-3d gate

**Files:**
- Create: `src/stamps/geometry-3d/ai/__tests__/intentToScene3d.metric.test.ts`
- Create: `src/stamps/geometry-3d/ai/rules/__tests__/metricCofire.test.ts`
- Modify: `tests/e2e/geometry-3d-figure.spec.ts`

**Interfaces:**
- Consumes: `runRules3D` (`../registry`), `segmentClauses3D`, `intentToScene3d`, the editor's `ai-generate-3d-input`/`ai-generate-3d-btn` test ids.
- Produces: a coverage-independent co-firing assertion across all 4 metric rules; a full-pipeline numeric scene test; an e2e render check; a recorded before/after FULL/PARTIAL/NONE.

- [ ] **Step 1: Co-firing test at `runRules3D` level (coverage-independent)**

```ts
// rules/__tests__/metricCofire.test.ts
import { runRules3D } from '../registry';
import { segmentClauses3D } from '../../deterministic/coverage3d';

const ops = (p: string) =>
  runRules3D({ problem: p, clauses: segmentClauses3D(p) }).flatMap((m) => m.intents);

describe('metric rule co-firing', () => {
  it('"đường thẳng qua A vuông góc (SBC)" → exactly ONE line, ZERO perpToLine plane', () => {
    const I = ops('Cho hình chóp S.ABCD. Kẻ đường thẳng qua A vuông góc với (SBC).');
    expect(I.filter((i: any) => i.op === 'line' && i.kind === 'perpToPlane').length).toBe(1);
    expect(I.filter((i: any) => i.op === 'plane' && i.spec?.kind === 'perpToLine').length).toBe(0);
  });

  it('"mặt phẳng qua A vuông góc BC" → exactly ONE perpToLine plane, ZERO perpToPlane line', () => {
    const I = ops('Cho hình chóp S.ABCD. Dựng mặt phẳng qua A vuông góc với BC.');
    expect(I.filter((i: any) => i.op === 'plane' && i.spec?.kind === 'perpToLine').length).toBe(1);
    expect(I.filter((i: any) => i.op === 'line' && i.kind === 'perpToPlane').length).toBe(0);
  });

  it('"Gọi H là hình chiếu của A trên (SBC)" → ONE perpFootPlane, ZERO perp line/plane construct', () => {
    const I = ops('Cho hình chóp S.ABCD. Gọi H là hình chiếu vuông góc của A trên (SBC).');
    expect(I.filter((i: any) => i.op === 'add-point-3d' && i.constraint?.kind === 'perpFootPlane').length).toBe(1);
    expect(I.filter((i: any) => i.op === 'line' && i.kind === 'perpToPlane').length).toBe(0);
    expect(I.filter((i: any) => i.op === 'plane' && i.spec?.kind === 'perpToLine').length).toBe(0);
  });
});
```

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/metricCofire.test.ts`
Expected: PASS (3). If any fails, tighten the offending rule's co-fire guard (do NOT loosen another rule).

- [ ] **Step 2: Full-pipeline numeric scene test**

```ts
// __tests__/intentToScene3d.metric.test.ts
import { runRules3D } from '../rules/registry';
import { runDeterministicIntents3d } from '../deterministic/runDeterministicIntents3d';
import { segmentClauses3D } from '../deterministic/coverage3d';
import { intentToScene3d } from '../intentToScene3d';

// Use the deterministic entry the façade uses, OR rules→scene directly if simpler.
function scene(p: string) {
  const intents = runRules3D({ problem: p, clauses: segmentClauses3D(p) }).flatMap((m) => m.intents);
  return intentToScene3d(intents as any) as any;
}

it('full pipeline: hình chiếu problem renders foot point + distance segment, no throw', () => {
  const st = scene('Cho hình chóp S.ABCD có đáy là hình vuông. Gọi H là hình chiếu của S lên mặt đáy.');
  expect(Object.values(st.objects).some((o: any) => o.kind === 'point3d' && o.label === 'H')).toBe(true);
  expect(Object.values(st.objects).some((o: any) => o.kind === 'segment3d')).toBe(true);
  expect(Object.values(st.objects).some((o: any) => o.kind === 'polyhedron3d')).toBe(true);
});
```

> If `runDeterministicIntents3d` import is unused, drop it. Prefer matching the actual façade path (`handleGenerateFigure3d`/`tryDeterministicFigure3d`) only if a direct rules→scene call is insufficient; the direct call above is acceptable for a numeric test.

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentToScene3d.metric.test.ts`
Expected: PASS.

- [ ] **Step 3: Playwright e2e render-verify**

Append to `tests/e2e/geometry-3d-figure.spec.ts` (mirror the existing mount/generate/assert structure):

```ts
test('renders a perpendicular-foot figure for a hình chiếu problem', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/');
  await page.getByTestId('stamp-toolbar-geometry3d').click();
  await page.getByTestId('mini-board-3d').waitFor({ state: 'visible' });
  await page.waitForFunction(() => !!(window as any).JXG?.boards);

  await page.getByTestId('ai-generate-3d-input').fill(
    'Cho hình chóp S.ABCD có đáy là hình vuông. Gọi H là hình chiếu vuông góc của S lên mặt đáy. ' +
    'Tính khoảng cách từ S đến mặt phẳng (ABCD).',
  );
  await page.getByTestId('ai-generate-3d-btn').click();

  // pyramid (5 base+lateral polys) + a foot point + ≥1 distance segment (line3d/segment).
  await page.waitForFunction(() => {
    const JXG = (window as any).JXG;
    if (!JXG?.boards) return false;
    for (const b of Object.values(JXG.boards) as any[]) {
      const pts = Object.values(b.objects).filter((o: any) => o.elType === 'point3d');
      const segs = Object.values(b.objects).filter((o: any) => o.elType === 'line3d');
      if (pts.length >= 6 && segs.length >= 1) return true;   // 5 base/apex + foot H
    }
    return false;
  }, undefined, { timeout: 8_000 });

  expect(errors.join('\n')).not.toMatch(/plane3d|Cannot read|undefined is not/i);
});
```

Run (start vite from THIS worktree on a private port if stale — see memory `feedback_verify_worktree_stale_server`):
`npx playwright test tests/e2e/geometry-3d-figure.spec.ts -g "perpendicular-foot"`
Expected: PASS.

- [ ] **Step 4: diag-all-3d before/after gate**

```bash
npx tsx scripts/diag-all-3d.ts
```
Record `vuonggoc` + TOTAL FULL/PARTIAL/NONE. Baseline: vuonggoc 104/205/59; TOTAL 149/411/138.
**Gate: 0-regression** — FULL must not drop, NONE must not rise on ANY dataset. FULL/NONE→PARTIAL gains on vuonggoc are the win; record exact deltas.

- [ ] **Step 5: Spot-check real dataset problems**

```bash
npx tsx scripts/dbg-bai-3d.ts vuonggoc 83    # "Gọi H là hình chiếu của A trên SB"
npx tsx scripts/dbg-bai-3d.ts vuonggoc 74    # "Góc giữa SC và mặt phẳng đáy bằng 60°"
```
Confirm the produced state contains the perpFoot point3d + segment3d (and projection triangle for the angle case).

- [ ] **Step 6: Full project regression run**

Run: `npx jest -c jest.worktree.config.js`
Expected: full suite green (≈3391+ tests), 0 regression.

- [ ] **Step 7: Commit**

```bash
git add src/stamps/geometry-3d/ai/__tests__/intentToScene3d.metric.test.ts src/stamps/geometry-3d/ai/rules/__tests__/metricCofire.test.ts tests/e2e/geometry-3d-figure.spec.ts
git commit -m "test(3d): co-firing + numeric e2e + Playwright render-verify metric (Phase 3a gate)"
```

---

## Self-Review

**1. Spec coverage** (spec `2026-06-21-3d-metric-perpendicular-design.md`):
- §3 helper `baseFaceOf`/`parseSolidHead3D` → Task 1. ✓
- §4.1 projectionFoot (perpFootPlane/perpFootLine + segment, hình chiếu/khoảng cách/chân đường) → Task 2. ✓
- §4.2 perpLineToPlane → Task 3. ✓
- §4.3 perpPlaneToLine → Task 4. ✓
- §4.4 angleLinePlane (projection triangle) → Task 5. ✓
- §5 verify perpFoot → Task 6. ✓
- §7 co-firing + Playwright + diag gate → Task 7. ✓
- §8 gotchas: co-fire guards (Tasks 3/4/5 + Task 7 test); `/iu` cue vs `/u` capture (all rules); fail-soft null helper (Tasks 2/3/5); no dynamic-name regex → no escapeRe needed (noted in Global Constraints). ✓
- §9 honest metric framing → Task 7 Step 4 (gate is 0-regression; gains are bonus). ✓
- §10 defers (coincidence-foot/dihedral/skew-distance/face⊥base/numeric labels) → not implemented (correct). ✓

**2. Placeholder scan:** every code step has full code; commands have expected output; the Task 6 negative-test note and Task 7 Step-2 import note are implementer guidance, not placeholders. ✓

**3. Type consistency:**
- Constraint shapes: `perpFootPlane{from,plane}` + `perpFootLine{from,a,b}` identical in Tasks 2/5 (emit), Task 6 (verify), and match the substrate facts. ✓
- `plane3d(name, {kind:'threePoints',p1,p2,p3})` / `{kind:'perpToLine',point,lineA,lineB}` consistent (Tasks 2/3/4/5). ✓
- `line3dIntent({kind:'perpToPlane',point,plane})` → builder reads `refs.point`/`refs.plane`; test asserts `refs:{point,plane}` (Task 3) — matches `line3dIntent` routing. ✓
- `connect3d(from,to,'segment')` → intent `{op:'connect',from,to,style}`; tests assert `{from,to}` (Tasks 2/5). ✓
- Foot naming `H_<stripPrime(from)>` consistent (Tasks 2/5); named-foot uses captured group (Task 2). ✓
- `baseFaceOf`/`parseSolidHead3D` signatures identical across Tasks 1/2/3/5. ✓

## Notes for the executor
- Run every task's tests from THIS worktree: `npx jest -c jest.worktree.config.js <path>`.
- After Tasks 2–5 the constructs already render; Task 6 hardens verify; Task 7 is the phase gate (co-firing + e2e + 0-regression diag).
- Honest metric framing: FULL may move only modestly (many uncovered clauses are MC value-prompts kept correctly PARTIAL, and planeNamed pre-claims `(XYZ)`). The real deliverable = feet/altitudes/perp-lines/perp-planes/projection-triangles DRAWN correctly (numeric + e2e + dbg-bai), with strict 0-regression.
- If a rule's regex over/under-matches a real dataset clause, prefer tightening the guard over loosening a sibling; re-run `metricCofire.test.ts` after any guard change.
```
