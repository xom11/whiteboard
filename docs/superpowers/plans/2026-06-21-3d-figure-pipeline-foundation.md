# 3D Figure Pipeline — Foundation (Phase 0 + Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic Text→3D-figure pipeline (mirror of the 2D engine) that turns Vietnamese spatial-geometry problems into a renderable 3D scene `State`, plus the test/probe harness — covering the *construction core* (solids + named planes + points-on-edges + derived points + giao tuyến).

**Architecture:** `Text → Rules3D → Intent3D[] → intentToScene3d → Scene State → JxgRenderer3D`. No separate DSL/transpile layer: the builder emits the existing 3D scene `State` (`{objects, order, counter, meta:{domain:'3d'}}`) directly via a store, reusing `core/scene/kinds/*` attrs + `Constraint3D`. Gates (coverage, named-entity, numeric verify, acyclic) run over the produced State.

**Tech Stack:** TypeScript (strict), Zod 3, JSXGraph `view3d`, Jest 29 (ts-jest/jsdom), Playwright, `tsx` for scripts.

## Global Constraints

- TypeScript strict; avoid `any` where avoidable (rules may cast `IntentT` via `unknown` like 2D).
- Vietnamese regex: ALWAYS flag `u` + lookaround `(?!\p{L})` instead of `\b` (ASCII `\b` breaks around Vietnamese diacritics).
- ANY `new RegExp(\`...${name}...\`)` MUST wrap `name` in `escapeRe(name)` (OCR names like `(O*` crash the pipeline — recurring bug class).
- Registry-dispatch, no central switch: adding a construct = 1 module + 1 registry line + 1 test.
- Fork (copy+adapt) the 3D NLU/rule layer; do NOT refactor or import-couple the mature 2D `ai/` (protects the 1741-problem 2D probe). Reuse only `core/scene/*` (kinds, store, types, math).
- Commit messages Vietnamese (prefix English: `feat`/`fix`/`test`/`docs`). NO `Co-Authored-By`.
- Run tests from this worktree with `npx jest -c jest.worktree.config.js <path>`.
- 3D probe metric is 3-tier (FULL/PARTIAL/NONE) from the start — never all-or-nothing.

## File Structure

```
src/stamps/geometry-3d/ai/
  intent.ts                       ← Intent3D Zod union + factory helpers
  layout3d.ts                     ← canonical vertex coords per (solid, baseVariant, apexVariant)
  intentToScene3d.ts              ← Intent3D[] → Scene State (store-backed)
  intentTopo3d.ts                 ← stable Kahn order-retry
  verify3d.ts                     ← numeric verify + acyclic validator
  buildFigureIntent3d.ts          ← generateFigureIntent3d (Track A)
  handleGenerateFigure3d.ts       ← façade for editor
  deterministic/
    vocabulary3d.ts               ← GEOMETRY_KEYWORDS_3D + countGeometryKeywords3D
    coverage3d.ts                 ← segmentClauses3D + computeCoverage3D (forked from 2D)
    guards3d.ts                   ← allNamedEntities3DPresent
    runDeterministicIntents3d.ts  ← rules + coverage gate + dedup
    tryDeterministicFigure3d.ts   ← 4-gate Track A → Scene State
  intent-builders/
    _types.ts                     ← BuildState3D + IntentBuilder3D + IntentBuilder3DError
    registry.ts                   ← OP_BUILDERS_3D
    solid.ts · addPoint3d.ts · plane.ts · line.ts · connect.ts
  rules/
    _types.ts · _shared.ts · registry.ts
    solid.ts · planeNamed.ts · pointOnEdge.ts · midpoint3d.ts · centroid3d.ts
    derivedPoint3d.ts · intersectionLine.ts
    __tests__/<rule>.test.ts
scripts/
  diag-all-3d.ts · dbg-bai-3d.ts
tests/e2e/
  geometry-3d-figure.spec.ts
```

---

## Task 1: 3D vocabulary + clause segmentation (NLU foundation)

**Files:**
- Create: `src/stamps/geometry-3d/ai/deterministic/vocabulary3d.ts`
- Create: `src/stamps/geometry-3d/ai/deterministic/coverage3d.ts`
- Test: `src/stamps/geometry-3d/ai/deterministic/__tests__/coverage3d.test.ts`

**Interfaces:**
- Consumes: nothing (leaf).
- Produces:
  - `vocabulary3d.ts`: `export const GEOMETRY_KEYWORDS_3D: string[]`; `export function countGeometryKeywords3D(text: string): number`.
  - `coverage3d.ts`: `export interface Clause3D { id: number; text: string; hasGeometry: boolean }`; `export interface CoverageReport3D { complete: boolean; coveredClauseIds: number[]; uncovered: Clause3D[]; ratio: number }`; `export function segmentClauses3D(problem: string): Clause3D[]`; `export function computeCoverage3D(clauses: readonly Clause3D[], claimedIds: readonly number[]): CoverageReport3D`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/coverage3d.test.ts
import { countGeometryKeywords3D } from '../vocabulary3d';
import { segmentClauses3D, computeCoverage3D } from '../coverage3d';

describe('3D vocabulary', () => {
  it('counts 3D solid + plane keywords', () => {
    expect(countGeometryKeywords3D('Cho hình chóp S.ABCD có đáy là hình vuông')).toBeGreaterThanOrEqual(2);
    expect(countGeometryKeywords3D('tứ diện ABCD')).toBeGreaterThanOrEqual(1);
    expect(countGeometryKeywords3D('giao tuyến của hai mặt phẳng')).toBeGreaterThanOrEqual(2);
    expect(countGeometryKeywords3D('xin chào không liên quan')).toBe(0);
  });
});

describe('segmentClauses3D', () => {
  it('splits on . ; newline and leading verbs, flags geometry clauses', () => {
    const cs = segmentClauses3D('Cho hình chóp S.ABCD. Gọi M là trung điểm của BC. Chứng minh điều gì đó vô nghĩa.');
    expect(cs.length).toBeGreaterThanOrEqual(2);
    expect(cs.find((c) => /hình chóp/.test(c.text))?.hasGeometry).toBe(true);
    expect(cs.find((c) => /trung điểm/.test(c.text))?.hasGeometry).toBe(true);
  });
  it('does not split inside a plane name like (SBC)', () => {
    const cs = segmentClauses3D('Tìm giao tuyến của (S,B,C) và (DMN)');
    expect(cs.length).toBe(1);
  });
});

describe('computeCoverage3D', () => {
  it('complete only when every geometry clause is claimed', () => {
    const cs = segmentClauses3D('Cho hình chóp S.ABCD. Gọi M là trung điểm của BC.');
    const geo = cs.filter((c) => c.hasGeometry);
    expect(computeCoverage3D(cs, geo.map((c) => c.id)).complete).toBe(true);
    expect(computeCoverage3D(cs, [geo[0].id]).complete).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/deterministic/__tests__/coverage3d.test.ts`
Expected: FAIL — `Cannot find module '../vocabulary3d'`.

- [ ] **Step 3: Write minimal implementation**

`vocabulary3d.ts` — flat lowercase keyword list (mirror 2D `vocabulary.ts` shape; pure `indexOf` count):

```ts
export const GEOMETRY_KEYWORDS_3D: string[] = [
  // solids
  'hình chóp', 'tứ diện', 'lăng trụ', 'hình hộp', 'lập phương', 'hình lập phương',
  'chóp', 'hộp chữ nhật', 'chóp đều', 'tứ diện đều',
  // planes / lines / relations
  'mặt phẳng', 'giao tuyến', 'giao điểm', 'thiết diện', 'song song', 'vuông góc',
  'chéo nhau', 'đồng phẳng', 'cắt', 'đi qua', 'chứa',
  // points / derived
  'trung điểm', 'trọng tâm', 'hình chiếu', 'đối xứng', 'chân đường', 'đường cao',
  // metric / solids of revolution (recognized early so clauses aren't dropped; constructs come later phases)
  'khoảng cách', 'góc', 'mặt cầu', 'hình cầu', 'bán kính', 'đường kính',
  'hình trụ', 'hình nón', 'ngoại tiếp', 'nội tiếp',
  // generic geometry nouns
  'cạnh', 'đáy', 'đỉnh', 'điểm', 'đoạn', 'tam giác', 'hình vuông', 'hình chữ nhật',
  'hình bình hành', 'hình thang', 'hình thoi', 'đường thẳng', 'tia',
  // symbols
  '⊥', '∩', '∥', '//', '∈',
];

export function countGeometryKeywords3D(text: string): number {
  const t = text.toLowerCase();
  let n = 0;
  for (const kw of GEOMETRY_KEYWORDS_3D) {
    let from = 0;
    for (;;) {
      const i = t.indexOf(kw, from);
      if (i < 0) break;
      n += 1;
      from = i + kw.length;
    }
  }
  return n;
}
```

`coverage3d.ts` — fork the 2D `segmentClauses` split mechanics (read `src/stamps/geometry-2d/ai/deterministic/coverage.ts` for the paren-masking detail and replicate the punctuation-masking-then-split approach), but use the 3D vocab and a 3D leading-verb set. Minimal version:

```ts
import { countGeometryKeywords3D } from './vocabulary3d';

export interface Clause3D { id: number; text: string; hasGeometry: boolean }
export interface CoverageReport3D {
  complete: boolean; coveredClauseIds: number[]; uncovered: Clause3D[]; ratio: number;
}

const LEADING_VERB =
  '(?:Gọi|Vẽ|Kẻ|Cho|Lấy|Dựng|Xác định|Tìm|Trên|Với|Qua|Từ|Giả sử)';
const PROOF_ONLY = /^(?:Chứng minh|Chứng tỏ|CMR|C\/m|Tính|Suy ra|Hỏi)\b/u;

// Mask `.`/`;`/`,` inside short parens (≤40) so "(S.ABCD)" / "(SBC)" don't split.
function maskParens(s: string): { masked: string; restore: (x: string) => string } {
  const tokens: string[] = [];
  const masked = s.replace(/\([^()]{0,40}\)/gu, (m) => {
    const idx = tokens.push(m) - 1;
    return ` ${idx} `;
  });
  return { masked, restore: (x) => x.replace(/ (\d+) /gu, (_, i) => tokens[Number(i)]) };
}

export function segmentClauses3D(problem: string): Clause3D[] {
  const { masked, restore } = maskParens(problem);
  const splitRe = new RegExp(`[.;\\n]+|,\\s*(?=${LEADING_VERB}(?!\\p{L}))`, 'u');
  const parts = masked.split(splitRe).map((p) => restore(p).trim()).filter(Boolean);
  return parts.map((text, id) => ({
    id,
    text,
    hasGeometry: countGeometryKeywords3D(text) > 0 && !PROOF_ONLY.test(text.trim()),
  }));
}

export function computeCoverage3D(
  clauses: readonly Clause3D[],
  claimedIds: readonly number[],
): CoverageReport3D {
  const claimed = new Set(claimedIds);
  const geo = clauses.filter((c) => c.hasGeometry);
  const uncovered = geo.filter((c) => !claimed.has(c.id));
  return {
    complete: geo.length > 0 && uncovered.length === 0,
    coveredClauseIds: geo.filter((c) => claimed.has(c.id)).map((c) => c.id),
    uncovered,
    ratio: geo.length ? (geo.length - uncovered.length) / geo.length : 0,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/deterministic/__tests__/coverage3d.test.ts`
Expected: PASS (all 5).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/deterministic/vocabulary3d.ts src/stamps/geometry-3d/ai/deterministic/coverage3d.ts src/stamps/geometry-3d/ai/deterministic/__tests__/coverage3d.test.ts
git commit -m "feat(3d-ai): vocab + segmentClauses3D (NLU foundation)"
```

---

## Task 2: Intent3D schema (Zod union + factory helpers)

**Files:**
- Create: `src/stamps/geometry-3d/ai/intent.ts`
- Test: `src/stamps/geometry-3d/ai/__tests__/intent.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Intent3DZ` (Zod `discriminatedUnion('op', …)`), `Intent3DT` type, factory helpers:
  - `solid(spec: { flavor: SolidFlavor; baseLabels: string[]; baseVariant: BaseVariant; apex?: string; apexVariant: ApexVariant }): Intent3DT`
  - `addPoint3d(name: string, constraint: Record<string, unknown>): Intent3DT`
  - `plane3d(name: string, spec: Record<string, unknown>): Intent3DT`
  - `line3dIntent(spec: { name?: string; kind: string } & Record<string, unknown>): Intent3DT`
  - `connect3d(from: string, to: string, style?: string): Intent3DT`
  - Exported literal unions: `SolidFlavor = 'pyramid'|'prism'|'tetrahedron'|'box'`; `BaseVariant = 'square'|'rectangle'|'parallelogram'|'trapezoid'|'rhombus'|'triangle'|'equilateral-triangle'`; `ApexVariant = 'regular'|'over-vertex'|'over-edge-mid'|'free'`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/intent.test.ts
import { Intent3DZ, solid, addPoint3d, plane3d, connect3d } from '../intent';

describe('Intent3D schema', () => {
  it('accepts a pyramid solid intent', () => {
    const i = solid({ flavor: 'pyramid', baseLabels: ['A','B','C','D'], baseVariant: 'square', apex: 'S', apexVariant: 'regular' });
    expect(Intent3DZ.parse(i).op).toBe('solid');
  });
  it('accepts a midpoint add-point-3d', () => {
    const i = addPoint3d('M', { kind: 'midpoint', p1: 'B', p2: 'C' });
    expect(() => Intent3DZ.parse(i)).not.toThrow();
  });
  it('accepts a named plane (three points)', () => {
    expect(() => Intent3DZ.parse(plane3d('mp_SBC', { kind: 'threePoints', p1: 'S', p2: 'B', p3: 'C' }))).not.toThrow();
  });
  it('rejects an unknown op', () => {
    expect(() => Intent3DZ.parse({ op: 'bogus' } as any)).toThrow();
  });
  it('connect3d defaults style=segment', () => {
    expect(connect3d('A','B')).toMatchObject({ op: 'connect', from: 'A', to: 'B', style: 'segment' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intent.test.ts`
Expected: FAIL — `Cannot find module '../intent'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// intent.ts
import { z } from 'zod';

export const Label3DZ = z.string().min(1).max(8).regex(/^[A-Za-z][A-Za-z0-9'_]*$/);

export type SolidFlavor = 'pyramid' | 'prism' | 'tetrahedron' | 'box';
export type BaseVariant =
  | 'square' | 'rectangle' | 'parallelogram' | 'trapezoid' | 'rhombus'
  | 'triangle' | 'equilateral-triangle';
export type ApexVariant = 'regular' | 'over-vertex' | 'over-edge-mid' | 'free';

const SolidIntentZ = z.object({
  op: z.literal('solid'),
  flavor: z.enum(['pyramid', 'prism', 'tetrahedron', 'box']),
  baseLabels: z.array(Label3DZ).min(3),
  baseVariant: z.enum(['square','rectangle','parallelogram','trapezoid','rhombus','triangle','equilateral-triangle']),
  apex: Label3DZ.optional(),               // pyramid/tetrahedron apex; prism: top labels derived
  apexVariant: z.enum(['regular','over-vertex','over-edge-mid','free']),
  apexAnchor: z.string().optional(),        // vertex label (over-vertex) or edge token "AB" (over-edge-mid)
  topLabels: z.array(Label3DZ).optional(),  // prism/box top face
});

// Mirror Constraint3D kinds (core/scene/kinds/3d-constraint.ts) + a few rule-level kinds.
const AddPoint3DIntentZ = z.object({
  op: z.literal('add-point-3d'),
  name: Label3DZ,
  constraint: z.record(z.unknown()),        // validated downstream by builder against Constraint3D
});

const Plane3DIntentZ = z.object({
  op: z.literal('plane'),
  name: Label3DZ,
  spec: z.record(z.unknown()),              // {kind:'threePoints',p1,p2,p3} | parallelThrough | perpToLine
});

const Line3DIntentZ = z.object({
  op: z.literal('line'),
  name: Label3DZ.optional(),
  kind: z.enum(['segment','line','ray','planePlaneIntersection','parallelThrough','perpToPlane']),
  refs: z.record(z.unknown()).optional(),
});

const Connect3DIntentZ = z.object({
  op: z.literal('connect'),
  from: Label3DZ, to: Label3DZ,
  style: z.enum(['segment','line','ray']).default('segment'),
});

export const Intent3DZ = z.discriminatedUnion('op', [
  SolidIntentZ, AddPoint3DIntentZ, Plane3DIntentZ, Line3DIntentZ, Connect3DIntentZ,
]);
export type Intent3DT = z.infer<typeof Intent3DZ>;

export function solid(spec: {
  flavor: SolidFlavor; baseLabels: string[]; baseVariant: BaseVariant;
  apex?: string; apexVariant: ApexVariant; apexAnchor?: string; topLabels?: string[];
}): Intent3DT {
  return { op: 'solid', ...spec } as Intent3DT;
}
export function addPoint3d(name: string, constraint: Record<string, unknown>): Intent3DT {
  return { op: 'add-point-3d', name, constraint } as Intent3DT;
}
export function plane3d(name: string, spec: Record<string, unknown>): Intent3DT {
  return { op: 'plane', name, spec } as Intent3DT;
}
export function line3dIntent(spec: { name?: string; kind: string } & Record<string, unknown>): Intent3DT {
  return { op: 'line', ...spec } as Intent3DT;
}
export function connect3d(from: string, to: string, style = 'segment'): Intent3DT {
  return { op: 'connect', from, to, style } as Intent3DT;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intent.test.ts`
Expected: PASS (5).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/intent.ts src/stamps/geometry-3d/ai/__tests__/intent.test.ts
git commit -m "feat(3d-ai): Intent3D schema (solid/add-point/plane/line/connect)"
```

---

## Task 3: Canonical layout (`layout3d.ts`)

**Files:**
- Create: `src/stamps/geometry-3d/ai/layout3d.ts`
- Test: `src/stamps/geometry-3d/ai/__tests__/layout3d.test.ts`

**Interfaces:**
- Consumes: `SolidFlavor`, `BaseVariant`, `ApexVariant` from `./intent`.
- Produces:
  - `type Vec3 = [number, number, number]`
  - `interface SolidLayout { coords: Record<string, Vec3>; faces: number[][]; vertexOrder: string[] }`
  - `function solidLayout(spec: { flavor: SolidFlavor; baseLabels: string[]; baseVariant: BaseVariant; apex?: string; apexVariant: ApexVariant; apexAnchor?: string; topLabels?: string[] }): SolidLayout`

**Layout rules:** base polygon at `z=0`, centered at origin, characteristic size ~2. Apex height `h=2.4`. `regular`→apex above base centroid; `over-vertex`→apex above `apexAnchor` vertex; `over-edge-mid`→apex above midpoint of `apexAnchor` edge token. `faces`: base ring `[0..n-1]` + each lateral `[i,(i+1)%n, apexIdx]` for pyramid/tetra; prism/box add top ring + side quads.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/layout3d.test.ts
import { solidLayout } from '../layout3d';

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

describe('solidLayout', () => {
  it('square pyramid: 4 coplanar base verts at z=0 + apex above centroid', () => {
    const L = solidLayout({ flavor:'pyramid', baseLabels:['A','B','C','D'], baseVariant:'square', apex:'S', apexVariant:'regular' });
    expect(L.vertexOrder).toEqual(['A','B','C','D','S']);
    for (const v of ['A','B','C','D']) expect(near(L.coords[v][2], 0)).toBe(true);
    expect(L.coords['S'][2]).toBeGreaterThan(0.5);
    // centroid of square base ~ origin → apex x,y ~ 0
    expect(near(L.coords['S'][0], 0)).toBe(true);
    expect(near(L.coords['S'][1], 0)).toBe(true);
    // base ring face present
    expect(L.faces).toContainEqual([0,1,2,3]);
  });
  it('over-vertex apex sits directly above the named vertex', () => {
    const L = solidLayout({ flavor:'pyramid', baseLabels:['A','B','C','D'], baseVariant:'square', apex:'S', apexVariant:'over-vertex', apexAnchor:'A' });
    expect(near(L.coords['S'][0], L.coords['A'][0])).toBe(true);
    expect(near(L.coords['S'][1], L.coords['A'][1])).toBe(true);
    expect(L.coords['S'][2]).toBeGreaterThan(0.5);
  });
  it('tetrahedron: 4 vertices, 4 triangular faces', () => {
    const L = solidLayout({ flavor:'tetrahedron', baseLabels:['A','B','C'], baseVariant:'equilateral-triangle', apex:'D', apexVariant:'regular' });
    expect(L.vertexOrder.length).toBe(4);
    expect(L.faces.length).toBe(4);
    L.faces.forEach((f) => expect(f.length).toBe(3));
  });
  it('triangular prism: 6 vertices, top face translated +z', () => {
    const L = solidLayout({ flavor:'prism', baseLabels:['A','B','C'], baseVariant:'triangle', apexVariant:'free', topLabels:['A1','B1','C1'] });
    expect(L.vertexOrder.length).toBe(6);
    expect(near(L.coords['A'][2], 0)).toBe(true);
    expect(L.coords['A1'][2]).toBeGreaterThan(0.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/layout3d.test.ts`
Expected: FAIL — `Cannot find module '../layout3d'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// layout3d.ts
import type { SolidFlavor, BaseVariant, ApexVariant } from './intent';

export type Vec3 = [number, number, number];
export interface SolidLayout { coords: Record<string, Vec3>; faces: number[][]; vertexOrder: string[] }

const H = 2.4;       // apex / prism height
const R = 1.4;       // base "radius"

// 2D base templates centered at origin → list of [x,y] in CCW order.
function baseTemplate(variant: BaseVariant, n: number): Array<[number, number]> {
  switch (variant) {
    case 'square':
      return [[-1,-1],[1,-1],[1,1],[-1,1]];
    case 'rectangle':
      return [[-1.5,-1],[1.5,-1],[1.5,1],[-1.5,1]];
    case 'parallelogram':
      return [[-1.4,-1],[1.0,-1],[1.4,1],[-1.0,1]];
    case 'rhombus':
      return [[0,-1.3],[1.3,0],[0,1.3],[-1.3,0]];
    case 'trapezoid':
      return [[-1.6,-1],[1.6,-1],[0.8,1],[-0.8,1]];
    case 'equilateral-triangle': {
      const pts: Array<[number, number]> = [];
      for (let i = 0; i < 3; i++) {
        const a = Math.PI / 2 + (i * 2 * Math.PI) / 3;
        pts.push([R * Math.cos(a), R * Math.sin(a)]);
      }
      return pts;
    }
    case 'triangle':
      return [[-1.3,-0.9],[1.4,-0.9],[-0.2,1.2]];
    default: {
      // regular n-gon fallback
      const pts: Array<[number, number]> = [];
      for (let i = 0; i < n; i++) {
        const a = Math.PI / 2 + (i * 2 * Math.PI) / n;
        pts.push([R * Math.cos(a), R * Math.sin(a)]);
      }
      return pts;
    }
  }
}

function centroidXY(pts: Array<[number, number]>): [number, number] {
  const s = pts.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]] as [number, number], [0, 0]);
  return [s[0] / pts.length, s[1] / pts.length];
}

export function solidLayout(spec: {
  flavor: SolidFlavor; baseLabels: string[]; baseVariant: BaseVariant;
  apex?: string; apexVariant: ApexVariant; apexAnchor?: string; topLabels?: string[];
}): SolidLayout {
  const n = spec.baseLabels.length;
  const tpl = baseTemplate(spec.baseVariant, n);
  const coords: Record<string, Vec3> = {};
  const vertexOrder: string[] = [];

  spec.baseLabels.forEach((lab, i) => {
    const [x, y] = tpl[i % tpl.length];
    coords[lab] = [x, y, 0];
    vertexOrder.push(lab);
  });

  const faces: number[][] = [];
  faces.push(spec.baseLabels.map((_, i) => i)); // base ring

  if (spec.flavor === 'pyramid' || spec.flavor === 'tetrahedron') {
    const apex = spec.apex ?? 'S';
    let ax = 0, ay = 0;
    if (spec.apexVariant === 'over-vertex' && spec.apexAnchor && coords[spec.apexAnchor]) {
      [ax, ay] = [coords[spec.apexAnchor][0], coords[spec.apexAnchor][1]];
    } else if (spec.apexVariant === 'over-edge-mid' && spec.apexAnchor) {
      const a = spec.apexAnchor[0], b = spec.apexAnchor[1];
      if (coords[a] && coords[b]) { ax = (coords[a][0] + coords[b][0]) / 2; ay = (coords[a][1] + coords[b][1]) / 2; }
    } else {
      [ax, ay] = centroidXY(tpl.slice(0, n));
    }
    coords[apex] = [ax, ay, H];
    const apexIdx = vertexOrder.push(apex) - 1;
    for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, apexIdx]);
  } else {
    // prism / box: translate base up by H to make the top face
    const top = spec.topLabels ?? spec.baseLabels.map((l) => `${l}1`);
    const base0 = vertexOrder.length;
    top.forEach((lab, i) => {
      const [x, y] = tpl[i % tpl.length];
      coords[lab] = [x, y, H];
      vertexOrder.push(lab);
    });
    faces.push(top.map((_, i) => base0 + i)); // top ring
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      faces.push([i, j, base0 + j, base0 + i]); // side quad
    }
  }
  return { coords, faces, vertexOrder };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/layout3d.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/layout3d.ts src/stamps/geometry-3d/ai/__tests__/layout3d.test.ts
git commit -m "feat(3d-ai): canonical layout3d (base templates + apex variants)"
```

---

## Task 4: BuildState3D + intentToScene3d (solid + connect builders)

**Files:**
- Create: `src/stamps/geometry-3d/ai/intent-builders/_types.ts`
- Create: `src/stamps/geometry-3d/ai/intent-builders/solid.ts`
- Create: `src/stamps/geometry-3d/ai/intent-builders/connect.ts`
- Create: `src/stamps/geometry-3d/ai/intent-builders/registry.ts`
- Create: `src/stamps/geometry-3d/ai/intentToScene3d.ts`
- Test: `src/stamps/geometry-3d/ai/__tests__/intentToScene3d.solid.test.ts`

**Interfaces:**
- Consumes: `Intent3DT` (`./intent`), `solidLayout` (`./layout3d`), `createEmptyState`/`createStore`/types from `core/scene` barrel (`src/core/scene`), `nextLabel`.
- Produces:
  - `_types.ts`: `interface BuildState3D { store: Store; nameToId: Map<string,string> }`; `class IntentBuilder3DError extends Error`; `type IntentBuilder3D = (s: BuildState3D, intent: Intent3DT) => void`; helpers `addPoint3dObj(s, label, constraint): string` and `addShape3dObj(s, kind, prefix, label, attrs): string` (dispatch ADD, register `nameToId`).
  - `registry.ts`: `OP_BUILDERS_3D: Record<Intent3DT['op'], IntentBuilder3D>`.
  - `intentToScene3d.ts`: `function intentToScene3d(intents: readonly Intent3DT[]): State` (throws `IntentBuilder3DError` on unresolved ref).

**Note on view/meta:** Build the State via `createStore(createEmptyState('3d'))`. Before returning, set `meta.view` to match what the editor serializes. VERIFY during impl: read `src/stamps/geometry-3d/render.ts` to confirm how `meta.view.bbox3D` is unpacked into the `view3d` create call, then use the matching `View3D` shape (the `theme.ts DEFAULT_VIEW3D` `[-3,-3,-3,3,3,3]`/0.7/0.4 is what the editor uses — prefer it for re-edit parity, but only after confirming the tuple ordering render.ts expects). If `createEmptyState('3d')` already yields a renderable view, keep it and note the discrepancy in a code comment.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/intentToScene3d.solid.test.ts
import { intentToScene3d } from '../intentToScene3d';
import { solid, connect3d } from '../intent';

describe('intentToScene3d — solid', () => {
  it('square pyramid → 5 point3d + 1 polyhedron3d with 5 faces', () => {
    const state = intentToScene3d([
      solid({ flavor:'pyramid', baseLabels:['A','B','C','D'], baseVariant:'square', apex:'S', apexVariant:'regular' }),
    ]);
    const objs = Object.values(state.objects);
    expect(objs.filter((o) => o.kind === 'point3d').length).toBe(5);
    const poly = objs.find((o) => o.kind === 'polyhedron3d') as any;
    expect(poly).toBeTruthy();
    expect(poly.attrs.flavor).toBe('pyramid');
    expect(poly.attrs.vertices.length).toBe(5);
    expect(poly.attrs.faces.length).toBe(5); // 1 base + 4 lateral
    expect(state.meta.domain).toBe('3d');
  });

  it('connect adds a segment3d between two existing points', () => {
    const state = intentToScene3d([
      solid({ flavor:'tetrahedron', baseLabels:['A','B','C'], baseVariant:'equilateral-triangle', apex:'D', apexVariant:'regular' }),
      connect3d('A','D'),
    ]);
    const seg = Object.values(state.objects).find((o) => o.kind === 'segment3d') as any;
    expect(seg).toBeTruthy();
  });

  it('throws on connect to an unknown point', () => {
    expect(() => intentToScene3d([connect3d('X','Y')])).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentToScene3d.solid.test.ts`
Expected: FAIL — `Cannot find module '../intentToScene3d'`.

- [ ] **Step 3: Write minimal implementation**

First confirm the `core/scene` barrel exports. Read `src/core/scene/index.ts` and the build-handler `construct3d.ts` `addShape` pattern (reference §C). Use `createStore`, `createEmptyState`, `nextLabel`, and the `SceneObject`/`State`/`Store` types.

`_types.ts`:
```ts
import type { Store, SceneObject } from '../../../../core/scene';
import { nextLabel } from '../../../../core/scene';
import type { Intent3DT } from '../intent';

export interface BuildState3D { store: Store; nameToId: Map<string, string>; }
export class IntentBuilder3DError extends Error {
  constructor(message: string, public readonly intent?: Intent3DT) { super(message); }
}
export type IntentBuilder3D = (s: BuildState3D, intent: Intent3DT) => void;

export function resolveId(s: BuildState3D, name: string): string {
  const id = s.nameToId.get(name);
  if (!id) throw new IntentBuilder3DError(`tham chiếu không tồn tại: ${name}`);
  return id;
}

export function addPoint3dObj(s: BuildState3D, label: string, constraint: Record<string, unknown>): string {
  const st = s.store.getState();
  const id = `p${st.counter + 1}`;
  const obj: SceneObject = {
    id, kind: 'point3d', label, visible: true, locked: false,
    layer: 'default', schemaVersion: 1, attrs: { constraint },
  };
  s.store.dispatch({ type: 'ADD', payload: { obj } });
  s.nameToId.set(label, id);
  return id;
}

export function addShape3dObj(
  s: BuildState3D, kind: string, prefix: string, label: string, attrs: Record<string, unknown>,
): string {
  const st = s.store.getState();
  const id = `${prefix}${st.counter + 1}`;
  const obj: SceneObject = {
    id, kind, label, visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs,
  };
  s.store.dispatch({ type: 'ADD', payload: { obj } });
  if (label) s.nameToId.set(label, id);
  return id;
}
```

`solid.ts`:
```ts
import type { IntentBuilder3D } from './_types';
import { addPoint3dObj, addShape3dObj } from './_types';
import { solidLayout } from '../layout3d';
import { nextLabel } from '../../../../core/scene';

export const buildSolid: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'solid') return;
  const L = solidLayout(intent);
  const vertexIds: string[] = [];
  for (const label of L.vertexOrder) {
    const [x, y, z] = L.coords[label];
    vertexIds.push(addPoint3dObj(s, label, { kind: 'free', x, y, z }));
  }
  const polyLabel = nextLabel(s.store.getState(), 'polyhedron3d');
  addShape3dObj(s, 'polyhedron3d', 'ph', polyLabel, {
    flavor: intent.flavor, vertices: vertexIds, faces: L.faces,
  });
};
```

`connect.ts`:
```ts
import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId } from './_types';
import { nextLabel } from '../../../../core/scene';

export const buildConnect: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'connect') return;
  const p1 = resolveId(s, intent.from);
  const p2 = resolveId(s, intent.to);
  const kind = intent.style === 'line' ? 'line3d' : intent.style === 'ray' ? 'ray3d' : 'segment3d';
  const label = nextLabel(s.store.getState(), kind);
  addShape3dObj(s, kind, 'l', label, { p1, p2 });
};
```

`registry.ts`:
```ts
import type { Intent3DT } from '../intent';
import type { IntentBuilder3D } from './_types';
import { buildSolid } from './solid';
import { buildConnect } from './connect';
// add-point/plane/line builders wired in later tasks
import { buildAddPoint3d } from './addPoint3d';
import { buildPlane3d } from './plane';
import { buildLine3d } from './line';

export const OP_BUILDERS_3D: Record<Intent3DT['op'], IntentBuilder3D> = {
  'solid': buildSolid,
  'connect': buildConnect,
  'add-point-3d': buildAddPoint3d,
  'plane': buildPlane3d,
  'line': buildLine3d,
};
```

> NOTE: registry imports `buildAddPoint3d`/`buildPlane3d`/`buildLine3d` which are created in Tasks 5–6. To keep THIS task compiling+green in isolation, temporarily stub those three as no-op `IntentBuilder3D` exports in their files, OR wire only `solid`+`connect` now and add the other three map entries in their tasks. Prefer: create stub files `addPoint3d.ts`/`plane.ts`/`line.ts` each exporting a no-op builder, replaced with real logic in Tasks 5–6.

`intentToScene3d.ts`:
```ts
import { createEmptyState, createStore } from '../../../core/scene';
import type { State } from '../../../core/scene';
import type { Intent3DT } from './intent';
import { OP_BUILDERS_3D } from './intent-builders/registry';
import { IntentBuilder3DError, type BuildState3D } from './intent-builders/_types';

export function intentToScene3d(intents: readonly Intent3DT[]): State {
  const store = createStore(createEmptyState('3d'));
  const s: BuildState3D = { store, nameToId: new Map() };
  for (const intent of intents) {
    const builder = OP_BUILDERS_3D[intent.op];
    if (!builder) throw new IntentBuilder3DError(`không có builder cho op=${intent.op}`, intent);
    builder(s, intent);
  }
  return store.getState();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentToScene3d.solid.test.ts`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/intent-builders src/stamps/geometry-3d/ai/intentToScene3d.ts src/stamps/geometry-3d/ai/__tests__/intentToScene3d.solid.test.ts
git commit -m "feat(3d-ai): BuildState3D + intentToScene3d (solid + connect)"
```

---

## Task 5: add-point-3d builder (derived + on-edge constraints)

**Files:**
- Modify: `src/stamps/geometry-3d/ai/intent-builders/addPoint3d.ts` (replace stub)
- Test: `src/stamps/geometry-3d/ai/__tests__/intentToScene3d.points.test.ts`

**Interfaces:**
- Consumes: `BuildState3D`, `addPoint3dObj`, `resolveId`; `Constraint3D` kinds from `core/scene/kinds/3d-constraint`.
- Produces: `export const buildAddPoint3d: IntentBuilder3D`. Resolves ref-by-name fields (`p1`,`p2`,`a`,`b`,`from`,`plane`,`lineId`,`a1`,`b1`,`a2`,`b2`,`vertices[]`) to ids, leaves numeric/param fields (`x`,`y`,`z`,`t`,`u`,`v`) intact, then emits a `point3d` with that `Constraint3D`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/intentToScene3d.points.test.ts
import { intentToScene3d } from '../intentToScene3d';
import { solid, addPoint3d } from '../intent';

const base = solid({ flavor:'pyramid', baseLabels:['A','B','C','D'], baseVariant:'square', apex:'S', apexVariant:'regular' });

describe('buildAddPoint3d', () => {
  it('midpoint resolves p1/p2 names → ids', () => {
    const st = intentToScene3d([base, addPoint3d('M', { kind:'midpoint', p1:'B', p2:'C' })]);
    const M = Object.values(st.objects).find((o) => o.label === 'M') as any;
    expect(M.kind).toBe('point3d');
    expect(M.attrs.constraint.kind).toBe('midpoint');
    // resolved to actual ids, not the literal names
    expect(M.attrs.constraint.p1).not.toBe('B');
    expect(st.objects[M.attrs.constraint.p1].label).toBe('B');
  });

  it('onLine edge point keeps t, resolves lineId after a connect creates the edge', () => {
    const st = intentToScene3d([base, addPoint3d('N', { kind:'onSegmentEdge', a:'A', b:'B', t:0.5 })]);
    const N = Object.values(st.objects).find((o) => o.label === 'N') as any;
    // onSegmentEdge is sugar → emits onLine over an auto-created edge segment, OR free coord on segment.
    expect(N.kind).toBe('point3d');
  });

  it('centroid resolves vertices[] names', () => {
    const st = intentToScene3d([base, addPoint3d('G', { kind:'centroid', vertices:['S','B','C'] })]);
    const G = Object.values(st.objects).find((o) => o.label === 'G') as any;
    expect(G.attrs.constraint.kind).toBe('centroid');
    expect(G.attrs.constraint.vertices.every((id: string) => st.objects[id])).toBe(true);
  });

  it('throws on midpoint with unknown ref', () => {
    expect(() => intentToScene3d([base, addPoint3d('M', { kind:'midpoint', p1:'Z', p2:'C' })])).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentToScene3d.points.test.ts`
Expected: FAIL (stub builder produces no `M`).

- [ ] **Step 3: Write minimal implementation**

```ts
// addPoint3d.ts
import type { IntentBuilder3D } from './_types';
import { addPoint3dObj, resolveId, addShape3dObj, IntentBuilder3DError } from './_types';
import { nextLabel } from '../../../../core/scene';

// Fields that are point/line/plane NAME references (resolve to ids); everything else is a param.
const REF_FIELDS = new Set(['p1','p2','from','plane','a','b','a1','b1','a2','b2','lineId','planeId','polygonId','sphereId']);

export const buildAddPoint3d: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'add-point-3d') return;
  const raw = intent.constraint as Record<string, unknown>;
  const kind = String(raw.kind);

  // Sugar: onSegmentEdge{a,b,t} → ensure an edge line3d(a,b) then onLine{lineId,t}
  if (kind === 'onSegmentEdge') {
    const aId = resolveId(s, String(raw.a));
    const bId = resolveId(s, String(raw.b));
    const edgeLabel = nextLabel(s.store.getState(), 'segment3d');
    const lineId = addShape3dObj(s, 'segment3d', 'l', edgeLabel, { p1: aId, p2: bId });
    addPoint3dObj(s, intent.name, { kind: 'onLine', lineId, t: typeof raw.t === 'number' ? raw.t : 0.5 });
    return;
  }

  const resolved: Record<string, unknown> = { kind };
  for (const [k, v] of Object.entries(raw)) {
    if (k === 'kind') continue;
    if (k === 'vertices' && Array.isArray(v)) {
      resolved[k] = v.map((name) => resolveId(s, String(name)));
    } else if (REF_FIELDS.has(k) && typeof v === 'string') {
      resolved[k] = resolveId(s, v);
    } else {
      resolved[k] = v;
    }
  }
  addPoint3dObj(s, intent.name, resolved);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentToScene3d.points.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/intent-builders/addPoint3d.ts src/stamps/geometry-3d/ai/__tests__/intentToScene3d.points.test.ts
git commit -m "feat(3d-ai): add-point-3d builder (derived + on-edge constraints)"
```

---

## Task 6: plane + line builders

**Files:**
- Modify: `src/stamps/geometry-3d/ai/intent-builders/plane.ts` (replace stub)
- Modify: `src/stamps/geometry-3d/ai/intent-builders/line.ts` (replace stub)
- Test: `src/stamps/geometry-3d/ai/__tests__/intentToScene3d.planeLine.test.ts`

**Interfaces:**
- Produces: `buildPlane3d` (emits `plane3d` with `{p1,p2,p3}` for `threePoints`, or `{construction:{...}}` for parallel/perp), `buildLine3d` (emits `line3d` with `{p1,p2}` or `{construction:{kind:'planePlaneIntersection',plane1,plane2}}`). All name refs resolved to ids.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/intentToScene3d.planeLine.test.ts
import { intentToScene3d } from '../intentToScene3d';
import { solid, plane3d, line3dIntent } from '../intent';

const base = solid({ flavor:'pyramid', baseLabels:['A','B','C','D'], baseVariant:'square', apex:'S', apexVariant:'regular' });

describe('plane + line builders', () => {
  it('threePoints plane resolves p1/p2/p3 → ids', () => {
    const st = intentToScene3d([base, plane3d('mpSBC', { kind:'threePoints', p1:'S', p2:'B', p3:'C' })]);
    const pl = Object.values(st.objects).find((o) => o.kind === 'plane3d') as any;
    expect(pl).toBeTruthy();
    expect(st.objects[pl.attrs.p1].label).toBe('S');
  });

  it('giao tuyến → line3d with planePlaneIntersection construction', () => {
    const st = intentToScene3d([
      base,
      plane3d('mp1', { kind:'threePoints', p1:'S', p2:'B', p3:'C' }),
      plane3d('mp2', { kind:'threePoints', p1:'S', p2:'A', p3:'D' }),
      line3dIntent({ name:'d', kind:'planePlaneIntersection', plane1:'mp1', plane2:'mp2' }),
    ]);
    const ln = Object.values(st.objects).find((o) => o.kind === 'line3d' && (o.attrs as any).construction) as any;
    expect(ln.attrs.construction.kind).toBe('planePlaneIntersection');
    expect(st.objects[ln.attrs.construction.plane1].label).toBe('mp1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentToScene3d.planeLine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
// plane.ts
import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId } from './_types';

export const buildPlane3d: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'plane') return;
  const spec = intent.spec as Record<string, unknown>;
  const kind = String(spec.kind);
  if (kind === 'threePoints') {
    addShape3dObj(s, 'plane3d', 'mp', intent.name, {
      p1: resolveId(s, String(spec.p1)),
      p2: resolveId(s, String(spec.p2)),
      p3: resolveId(s, String(spec.p3)),
    });
    return;
  }
  if (kind === 'parallelThrough') {
    addShape3dObj(s, 'plane3d', 'mp', intent.name, {
      construction: { kind: 'planeParallelThrough', point: resolveId(s, String(spec.point)), refPlane: resolveId(s, String(spec.refPlane)) },
    });
    return;
  }
  if (kind === 'perpToLine') {
    addShape3dObj(s, 'plane3d', 'mp', intent.name, {
      construction: { kind: 'planePerpToLine', point: resolveId(s, String(spec.point)), lineA: resolveId(s, String(spec.lineA)), lineB: resolveId(s, String(spec.lineB)) },
    });
    return;
  }
};
```

```ts
// line.ts
import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId } from './_types';
import { nextLabel } from '../../../../core/scene';

export const buildLine3d: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'line') return;
  const refs = (intent.refs ?? {}) as Record<string, unknown>;
  const label = intent.name ?? nextLabel(s.store.getState(), 'line3d');
  if (intent.kind === 'planePlaneIntersection') {
    addShape3dObj(s, 'line3d', 'l', label, {
      construction: { kind: 'planePlaneIntersection', plane1: resolveId(s, String((intent as any).plane1 ?? refs.plane1)), plane2: resolveId(s, String((intent as any).plane2 ?? refs.plane2)) },
    });
    return;
  }
  if (intent.kind === 'perpToPlane') {
    addShape3dObj(s, 'line3d', 'l', label, {
      construction: { kind: 'linePerpToPlane', point: resolveId(s, String((intent as any).point ?? refs.point)), plane: resolveId(s, String((intent as any).plane ?? refs.plane)) },
    });
    return;
  }
  // segment/line/ray fall back to two-point
  const p1 = resolveId(s, String((intent as any).p1 ?? refs.p1));
  const p2 = resolveId(s, String((intent as any).p2 ?? refs.p2));
  const kind = intent.kind === 'line' ? 'line3d' : intent.kind === 'ray' ? 'ray3d' : 'segment3d';
  addShape3dObj(s, kind, 'l', label, { p1, p2 });
};
```

> The `line3dIntent({name,kind,plane1,plane2})` factory spreads extra keys onto the intent object; the builder reads them via `(intent as any).plane1`. Confirm the `Line3DIntentZ` schema allows passthrough (it uses explicit fields + optional `refs`; since extra top-level keys are stripped by Zod `.parse`, the builder runs on the PRE-parse intent object inside the pipeline — OR move `plane1`/`plane2`/`point`/`plane`/`p1`/`p2` into the `refs` record in the factory). FIX in factory: have `line3dIntent` put non-(name|kind) keys under `refs`. Update Task 2's `line3dIntent` accordingly and re-run Task 2 test.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentToScene3d.planeLine.test.ts`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/intent-builders/plane.ts src/stamps/geometry-3d/ai/intent-builders/line.ts src/stamps/geometry-3d/ai/intent.ts src/stamps/geometry-3d/ai/__tests__/intentToScene3d.planeLine.test.ts
git commit -m "feat(3d-ai): plane + line builders (threePoints + giao tuyến)"
```

---

## Task 7: intentTopo3d (stable order-retry)

**Files:**
- Create: `src/stamps/geometry-3d/ai/intentTopo3d.ts`
- Test: `src/stamps/geometry-3d/ai/__tests__/intentTopo3d.test.ts`

**Interfaces:**
- Produces: `function orderIntents3dByDependency(intents: readonly Intent3DT[]): Intent3DT[]` (stable Kahn; produces = solid base+apex+top labels / add-point name / plane name / line name; consumes = all string ref fields; cycle leftovers appended in original order).

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/intentTopo3d.test.ts
import { orderIntents3dByDependency } from '../intentTopo3d';
import { solid, addPoint3d } from '../intent';

describe('orderIntents3dByDependency', () => {
  it('moves a midpoint after the solid that defines its refs', () => {
    const mid = addPoint3d('M', { kind:'midpoint', p1:'B', p2:'C' });
    const sol = solid({ flavor:'pyramid', baseLabels:['A','B','C','D'], baseVariant:'square', apex:'S', apexVariant:'regular' });
    const out = orderIntents3dByDependency([mid, sol]);
    expect(out.indexOf(sol)).toBeLessThan(out.indexOf(mid));
  });
  it('keeps already-valid order stable', () => {
    const sol = solid({ flavor:'tetrahedron', baseLabels:['A','B','C'], baseVariant:'triangle', apex:'D', apexVariant:'regular' });
    const mid = addPoint3d('M', { kind:'midpoint', p1:'A', p2:'B' });
    expect(orderIntents3dByDependency([sol, mid])).toEqual([sol, mid]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentTopo3d.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Write minimal implementation**

```ts
// intentTopo3d.ts
import type { Intent3DT } from './intent';

function producesOf(i: Intent3DT): string[] {
  switch (i.op) {
    case 'solid': {
      const out = [...i.baseLabels];
      if (i.apex) out.push(i.apex);
      if (i.topLabels) out.push(...i.topLabels);
      else if (i.flavor === 'prism' || i.flavor === 'box') out.push(...i.baseLabels.map((l) => `${l}1`));
      return out;
    }
    case 'add-point-3d': return [i.name];
    case 'plane': return [i.name];
    case 'line': return i.name ? [i.name] : [];
    case 'connect': return [];
  }
}

const PRODUCE_KEYS = new Set(['op','baseLabels','apex','topLabels','name','flavor','baseVariant','apexVariant','style']);

function consumesOf(i: Intent3DT, produced: Set<string>): string[] {
  const refs: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') { if (produced.has(v)) refs.push(v); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (v && typeof v === 'object') {
      for (const [k, val] of Object.entries(v)) { if (!PRODUCE_KEYS.has(k)) walk(val); }
    }
  };
  // walk everything except this intent's own produced labels
  const own = new Set(producesOf(i));
  for (const [k, val] of Object.entries(i)) {
    if (PRODUCE_KEYS.has(k)) continue;
    walk(val);
  }
  return refs.filter((r) => !own.has(r));
}

export function orderIntents3dByDependency(intents: readonly Intent3DT[]): Intent3DT[] {
  const allProduced = new Set<string>();
  intents.forEach((i) => producesOf(i).forEach((p) => allProduced.add(p)));
  const remaining = [...intents];
  const done = new Set<string>();
  const out: Intent3DT[] = [];
  let progress = true;
  while (remaining.length && progress) {
    progress = false;
    for (let k = 0; k < remaining.length; k++) {
      const i = remaining[k];
      const needs = consumesOf(i, allProduced).filter((r) => !done.has(r));
      if (needs.length === 0) {
        out.push(i);
        producesOf(i).forEach((p) => done.add(p));
        remaining.splice(k, 1);
        k--;
        progress = true;
      }
    }
  }
  return [...out, ...remaining]; // cycle leftovers in original order
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentTopo3d.test.ts`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/intentTopo3d.ts src/stamps/geometry-3d/ai/__tests__/intentTopo3d.test.ts
git commit -m "feat(3d-ai): intentTopo3d stable order-retry"
```

---

## Task 8: rule engine skeleton (_types, _shared, registry, runRules3D)

**Files:**
- Create: `src/stamps/geometry-3d/ai/rules/_types.ts`
- Create: `src/stamps/geometry-3d/ai/rules/_shared.ts`
- Create: `src/stamps/geometry-3d/ai/rules/registry.ts`
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/registry.invariants.test.ts`

**Interfaces:**
- `_types.ts`: `RuleContext3D { problem: string; clauses: readonly Clause3D[] }`; `RuleMatch3D { ruleId: string; clauseIds: number[]; intents: Intent3DT[] }`; `LanguageRule3D { id; priority; languages; patterns: readonly RegExp[]; match(ctx): RuleMatch3D[] }`.
- `_shared.ts`: `escapeRe(s)`, `extractName3D(text): string | undefined` (mirror 2D INTRO_NAME/NAME_LA, allow subscripts/primes), `splitVertexToken(token): string[]` ("ABCD"→['A','B','C','D'], handles primes/subscripts), re-export `solid`/`addPoint3d`/`plane3d`/`line3dIntent`/`connect3d` from `../intent`.
- `registry.ts`: `ALL_RULES_3D: readonly LanguageRule3D[]` (sorted by priority desc, stable), `runRules3D(ctx): RuleMatch3D[]`.

- [ ] **Step 1: Write the failing test**

```ts
// rules/__tests__/registry.invariants.test.ts
import { ALL_RULES_3D, runRules3D } from '../registry';

describe('3D rule registry invariants', () => {
  it('no duplicate rule ids', () => {
    const ids = ALL_RULES_3D.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('sorted by priority descending', () => {
    for (let i = 1; i < ALL_RULES_3D.length; i++) {
      expect(ALL_RULES_3D[i - 1].priority).toBeGreaterThanOrEqual(ALL_RULES_3D[i].priority);
    }
  });
  it('every rule has at least one prefilter pattern', () => {
    ALL_RULES_3D.forEach((r) => expect(r.patterns.length).toBeGreaterThan(0));
  });
  it('runRules3D returns an array on empty problem', () => {
    expect(Array.isArray(runRules3D({ problem: '', clauses: [] }))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/registry.invariants.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Write minimal implementation**

`_types.ts`:
```ts
import type { Intent3DT } from '../intent';
import type { Clause3D } from '../deterministic/coverage3d';

export interface RuleContext3D { problem: string; clauses: readonly Clause3D[]; }
export interface RuleMatch3D { ruleId: string; clauseIds: number[]; intents: Intent3DT[]; }
export interface LanguageRule3D {
  id: string;
  priority: number;
  languages: readonly ('vi' | 'en')[];
  patterns: readonly RegExp[];
  match(ctx: RuleContext3D): RuleMatch3D[];
}
```

`_shared.ts`:
```ts
export { solid, addPoint3d, plane3d, line3dIntent, connect3d } from '../intent';

export function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const INTRO_NAME_3D =
  /(?:Gọi|Lấy|Dựng|Vẽ|Kẻ|Đặt|Xác định)\s+(?:điểm\s+)?([A-Z][₀-₉0-9]?)['′]?(?![\p{L}])/u;
const NAME_LA_3D = /(?<![\p{L}\d])([A-Z][₀-₉0-9]?)['′]?\s+là(?!\p{L})/u;

export function extractName3D(text: string): string | undefined {
  return text.match(INTRO_NAME_3D)?.[1] ?? text.match(NAME_LA_3D)?.[1];
}

// "ABCD" → [A,B,C,D]; "A'B'C'" → [A',B',C']; "A1B1" → [A1,B1]
export function splitVertexToken(token: string): string[] {
  const m = token.match(/[A-Z](?:['′]|[₀-₉0-9])?/gu);
  return m ?? [];
}
```

`registry.ts` (starts empty; rules added in later tasks):
```ts
import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';

const RULES: readonly LanguageRule3D[] = [
  // rules wired in Tasks 9–13
];

export const ALL_RULES_3D: readonly LanguageRule3D[] = [...RULES].sort((a, b) => b.priority - a.priority);

export function runRules3D(ctx: RuleContext3D): RuleMatch3D[] {
  const matches: RuleMatch3D[] = [];
  for (const rule of ALL_RULES_3D) {
    if (!rule.patterns.some((p) => p.test(ctx.problem))) continue;
    matches.push(...rule.match(ctx));
  }
  return matches;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/registry.invariants.test.ts`
Expected: PASS (4) — note "sorted" + "≥1 pattern" hold vacuously on empty array.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/rules/_types.ts src/stamps/geometry-3d/ai/rules/_shared.ts src/stamps/geometry-3d/ai/rules/registry.ts src/stamps/geometry-3d/ai/rules/__tests__/registry.invariants.test.ts
git commit -m "feat(3d-ai): rule engine skeleton (_types/_shared/registry/runRules3D)"
```

---

## Task 9: `solid` rule (chóp / tứ diện / lăng trụ + base & apex variants)

**Files:**
- Create: `src/stamps/geometry-3d/ai/rules/solid.ts`
- Modify: `src/stamps/geometry-3d/ai/rules/registry.ts` (import + add to `RULES`)
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/solid.test.ts`

**Interfaces:**
- Produces: `export const solidRule: LanguageRule3D` (priority 90 — solids define vertices first). Detects:
  - `hình chóp S.ABCD` → flavor pyramid, apex `S`, baseLabels from `ABCD`.
  - `tứ diện ABCD` / `tứ diện đều ABCD` → flavor tetrahedron, base `ABC`, apex `D` (equilateral-triangle if "đều").
  - `(hình )?lăng trụ ABC.A'B'C'` → flavor prism, base `ABC`, topLabels `A'B'C'`.
  - `hình hộp / hình lập phương ABCD.A'B'C'D'` → flavor box.
  - baseVariant from "đáy là hình vuông/chữ nhật/bình hành/thang/thoi" or "tam giác đều"; default square (4 base labels) / triangle (3).
  - apexVariant from "SA vuông góc (với) (mặt phẳng) đáy" → over-vertex anchor `A`; "chóp đều" / "hình chóp tứ giác đều" → regular; "(SAB) vuông góc đáy" + "cân tại S" → over-edge-mid anchor `AB`.

- [ ] **Step 1: Write the failing test**

```ts
// rules/__tests__/solid.test.ts
import { solidRule } from '../solid';
import { segmentClauses3D } from '../../deterministic/coverage3d';

function run(problem: string) {
  const clauses = segmentClauses3D(problem);
  return solidRule.match({ problem, clauses });
}

describe('solidRule', () => {
  it('hình chóp S.ABCD đáy hình vuông → pyramid/square/apex S', () => {
    const ms = run('Cho hình chóp S.ABCD có đáy ABCD là hình vuông.');
    const i = ms[0].intents[0] as any;
    expect(i.op).toBe('solid');
    expect(i.flavor).toBe('pyramid');
    expect(i.apex).toBe('S');
    expect(i.baseLabels).toEqual(['A','B','C','D']);
    expect(i.baseVariant).toBe('square');
  });

  it('SA ⊥ đáy → apexVariant over-vertex A', () => {
    const ms = run('Cho hình chóp S.ABCD có đáy là hình chữ nhật, SA vuông góc với mặt phẳng đáy.');
    const i = ms[0].intents[0] as any;
    expect(i.apexVariant).toBe('over-vertex');
    expect(i.apexAnchor).toBe('A');
    expect(i.baseVariant).toBe('rectangle');
  });

  it('tứ diện đều ABCD → tetrahedron, equilateral-triangle base, apex D', () => {
    const i = run('Cho tứ diện đều ABCD có cạnh bằng a.')[0].intents[0] as any;
    expect(i.flavor).toBe('tetrahedron');
    expect(i.baseLabels).toEqual(['A','B','C']);
    expect(i.apex).toBe('D');
    expect(i.baseVariant).toBe('equilateral-triangle');
  });

  it('lăng trụ ABC.A′B′C′ → prism with top labels', () => {
    const i = run("Cho hình lăng trụ ABC.A'B'C' có đáy ABC là tam giác cân.")[0].intents[0] as any;
    expect(i.flavor).toBe('prism');
    expect(i.baseLabels).toEqual(['A','B','C']);
    expect(i.topLabels).toEqual(["A'","B'","C'"]);
  });

  it('claims the clause for coverage', () => {
    const ms = run('Cho hình chóp S.ABC.');
    expect(ms[0].clauseIds.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/solid.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Write minimal implementation**

```ts
// solid.ts
import type { LanguageRule3D, RuleMatch3D } from './_types';
import { solid, splitVertexToken } from './_shared';
import type { BaseVariant, ApexVariant } from '../intent';

const PYRAMID = /hình\s+chóp\s+([A-Z])\.([A-Z][A-Z'′₀-₉0-9]*)/u;
const TETRA = /tứ\s+diện(?:\s+đều)?\s+([A-Z]{3,4}['′]?)/u;
const PRISM = /(?:hình\s+)?lăng\s+trụ\s+([A-Z]{3,})\.([A-Z'′₀-₉0-9]+)/u;
const BOX = /hình\s+(hộp|lập\s+phương)\s+([A-Z]{4})\.([A-Z'′]+)/u;

function baseVariantFrom(problem: string, n: number): BaseVariant {
  if (/đáy[^.]*?hình\s+vuông/u.test(problem)) return 'square';
  if (/đáy[^.]*?hình\s+chữ\s+nhật/u.test(problem)) return 'rectangle';
  if (/đáy[^.]*?hình\s+bình\s+hành/u.test(problem)) return 'parallelogram';
  if (/đáy[^.]*?hình\s+thang/u.test(problem)) return 'trapezoid';
  if (/đáy[^.]*?hình\s+thoi/u.test(problem)) return 'rhombus';
  if (/(tam\s+giác\s+đều|đáy[^.]*?đều)/u.test(problem)) return 'equilateral-triangle';
  return n === 3 ? 'triangle' : 'square';
}

function apexVariantFrom(problem: string, apex: string): { v: ApexVariant; anchor?: string } {
  // "SA ⊥ đáy"  → over-vertex A
  const over = new RegExp(`${apex}([A-Z])\\s*(?:⊥|vuông\\s+góc)[^.]*?đáy`, 'u').exec(problem);
  if (over) return { v: 'over-vertex', anchor: over[1] };
  // "(SAB) ⊥ đáy" + "cân tại S" → over-edge-mid AB
  const face = new RegExp(`\\(${apex}([A-Z])([A-Z])\\)[^.]*?(?:⊥|vuông\\s+góc)[^.]*?đáy`, 'u').exec(problem);
  if (face && new RegExp(`cân\\s+tại\\s+${apex}`, 'u').test(problem)) {
    return { v: 'over-edge-mid', anchor: `${face[1]}${face[2]}` };
  }
  if (/(chóp\s+(?:tứ\s+giác|tam\s+giác)?\s*đều|hình\s+chóp\s+đều)/u.test(problem)) return { v: 'regular' };
  return { v: 'regular' };
}

export const solidRule: LanguageRule3D = {
  id: 'solid',
  priority: 90,
  languages: ['vi'],
  patterns: [/hình\s+chóp/u, /tứ\s+diện/u, /lăng\s+trụ/u, /hình\s+(hộp|lập\s+phương)/u],
  match(ctx): RuleMatch3D[] {
    for (const c of ctx.clauses) {
      let m: RegExpExecArray | null;
      if ((m = PYRAMID.exec(c.text))) {
        const apex = m[1];
        const baseLabels = splitVertexToken(m[2]);
        const { v, anchor } = apexVariantFrom(ctx.problem, apex);
        return [{ ruleId: this.id, clauseIds: [c.id], intents: [solid({
          flavor: 'pyramid', baseLabels, baseVariant: baseVariantFrom(ctx.problem, baseLabels.length),
          apex, apexVariant: v, apexAnchor: anchor,
        })] }];
      }
      if ((m = TETRA.exec(c.text))) {
        const verts = splitVertexToken(m[1]);
        if (verts.length >= 4) {
          const isReg = /tứ\s+diện\s+đều/u.test(c.text);
          return [{ ruleId: this.id, clauseIds: [c.id], intents: [solid({
            flavor: 'tetrahedron', baseLabels: verts.slice(0, 3),
            baseVariant: isReg ? 'equilateral-triangle' : 'triangle',
            apex: verts[3], apexVariant: 'regular',
          })] }];
        }
      }
      if ((m = PRISM.exec(c.text))) {
        const baseLabels = splitVertexToken(m[1]);
        const topLabels = splitVertexToken(m[2]);
        return [{ ruleId: this.id, clauseIds: [c.id], intents: [solid({
          flavor: 'prism', baseLabels, baseVariant: baseVariantFrom(ctx.problem, baseLabels.length),
          apexVariant: 'free', topLabels,
        })] }];
      }
      if ((m = BOX.exec(c.text))) {
        const baseLabels = splitVertexToken(m[2]);
        const topLabels = splitVertexToken(m[3]);
        return [{ ruleId: this.id, clauseIds: [c.id], intents: [solid({
          flavor: 'box', baseLabels, baseVariant: 'rectangle', apexVariant: 'free', topLabels,
        })] }];
      }
    }
    return [];
  },
};
```

Then in `registry.ts`: `import { solidRule } from './solid';` and add `solidRule` to `RULES`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/solid.test.ts src/stamps/geometry-3d/ai/rules/__tests__/registry.invariants.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/rules/solid.ts src/stamps/geometry-3d/ai/rules/registry.ts src/stamps/geometry-3d/ai/rules/__tests__/solid.test.ts
git commit -m "feat(3d-ai): rule solid (chóp/tứ diện/lăng trụ + base/apex variant)"
```

---

## Task 10: `pointOnEdge` + `planeNamed` rules

**Files:**
- Create: `src/stamps/geometry-3d/ai/rules/pointOnEdge.ts`
- Create: `src/stamps/geometry-3d/ai/rules/planeNamed.ts`
- Modify: `src/stamps/geometry-3d/ai/rules/registry.ts`
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/pointOnEdge.test.ts`
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/planeNamed.test.ts`

**Interfaces:**
- `pointOnEdge.ts`: `export const pointOnEdgeRule: LanguageRule3D` (priority 60). "Lấy điểm M trên AB", "M ∈ AB", "M thuộc cạnh SC" → `addPoint3d(name, {kind:'onSegmentEdge', a, b, t:0.5})`. Distributive "M, N lần lượt thuộc AB, AC" supported.
- `planeNamed.ts`: `export const planeNamedRule: LanguageRule3D` (priority 55). "mặt phẳng (MNP)", "(SBC)" used as a referenced plane → `plane3d('mp_MNP', {kind:'threePoints', p1:M,p2:N,p3:P})` for each *distinct* 3-letter plane token referenced. Claim clause only if a plane token appears.

- [ ] **Step 1: Write the failing test**

```ts
// rules/__tests__/pointOnEdge.test.ts
import { pointOnEdgeRule } from '../pointOnEdge';
import { segmentClauses3D } from '../../deterministic/coverage3d';
const run = (p: string) => pointOnEdgeRule.match({ problem: p, clauses: segmentClauses3D(p) });

describe('pointOnEdgeRule', () => {
  it('Lấy M trên AB → onSegmentEdge a=A b=B', () => {
    const i = run('Lấy điểm M trên AB.')[0].intents[0] as any;
    expect(i.op).toBe('add-point-3d');
    expect(i.name).toBe('M');
    expect(i.constraint).toMatchObject({ kind: 'onSegmentEdge', a: 'A', b: 'B' });
  });
  it('M thuộc cạnh SC', () => {
    const i = run('M thuộc cạnh SC.')[0].intents[0] as any;
    expect(i.constraint).toMatchObject({ a: 'S', b: 'C' });
  });
  it('distributive M, N lần lượt thuộc AB, AC', () => {
    const intents = run('M, N lần lượt thuộc AB, AC.').flatMap((m) => m.intents) as any[];
    expect(intents.map((i) => i.name).sort()).toEqual(['M','N']);
  });
});
```

```ts
// rules/__tests__/planeNamed.test.ts
import { planeNamedRule } from '../planeNamed';
import { segmentClauses3D } from '../../deterministic/coverage3d';
const run = (p: string) => planeNamedRule.match({ problem: p, clauses: segmentClauses3D(p) });

describe('planeNamedRule', () => {
  it('mặt phẳng (MNP) → threePoints plane', () => {
    const i = run('Xét mặt phẳng (MNP).')[0].intents[0] as any;
    expect(i.op).toBe('plane');
    expect(i.spec).toMatchObject({ kind:'threePoints', p1:'M', p2:'N', p3:'P' });
  });
  it('dedups repeated plane tokens', () => {
    const intents = run('Tìm giao tuyến của (SBC) và (SBC).').flatMap((m) => m.intents);
    const names = intents.map((i: any) => i.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/pointOnEdge.test.ts src/stamps/geometry-3d/ai/rules/__tests__/planeNamed.test.ts`
Expected: FAIL — modules missing.

- [ ] **Step 3: Write minimal implementation**

```ts
// pointOnEdge.ts
import type { LanguageRule3D, RuleMatch3D } from './_types';
import { addPoint3d } from './_shared';

const SINGLE = /(?:Lấy\s+(?:điểm\s+)?)?([A-Z])\s*(?:∈|thuộc(?:\s+cạnh)?|(?:nằm\s+)?trên(?:\s+cạnh)?)\s*([A-Z])([A-Z])(?![\p{L}])/u;
const DISTRIB = /([A-Z])\s*,\s*([A-Z])\s+lần\s+lượt\s+(?:∈|thuộc)\s*([A-Z])([A-Z])\s*,\s*([A-Z])([A-Z])/u;

export const pointOnEdgeRule: LanguageRule3D = {
  id: 'pointOnEdge', priority: 60, languages: ['vi'],
  patterns: [/(?:∈|thuộc|trên)\s*[A-Z]{2}/u, /lần\s+lượt\s+(?:∈|thuộc)/u],
  match(ctx): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      const d = DISTRIB.exec(c.text);
      if (d) {
        out.push({ ruleId: this.id, clauseIds: [c.id], intents: [
          addPoint3d(d[1], { kind:'onSegmentEdge', a:d[3], b:d[4], t:0.5 }),
          addPoint3d(d[2], { kind:'onSegmentEdge', a:d[5], b:d[6], t:0.55 }),
        ] });
        continue;
      }
      const m = SINGLE.exec(c.text);
      if (m) out.push({ ruleId: this.id, clauseIds: [c.id], intents: [
        addPoint3d(m[1], { kind:'onSegmentEdge', a:m[2], b:m[3], t:0.5 }),
      ] });
    }
    return out;
  },
};
```

```ts
// planeNamed.ts
import type { LanguageRule3D, RuleMatch3D } from './_types';
import { plane3d } from './_shared';

const PLANE_TOKEN = /\(([A-Z])([A-Z])([A-Z])\)/gu;

export const planeNamedRule: LanguageRule3D = {
  id: 'planeNamed', priority: 55, languages: ['vi'],
  patterns: [/mặt\s+phẳng|giao\s+tuyến|thiết\s+diện|\([A-Z]{3}\)/u],
  match(ctx): RuleMatch3D[] {
    const seen = new Set<string>();
    const intents = [];
    const claimed: number[] = [];
    for (const c of ctx.clauses) {
      let m: RegExpExecArray | null;
      PLANE_TOKEN.lastIndex = 0;
      while ((m = PLANE_TOKEN.exec(c.text))) {
        const key = `${m[1]}${m[2]}${m[3]}`;
        if (seen.has(key)) continue;
        seen.add(key);
        intents.push(plane3d(`mp_${key}`, { kind:'threePoints', p1:m[1], p2:m[2], p3:m[3] }));
        if (!claimed.includes(c.id)) claimed.push(c.id);
      }
    }
    return intents.length ? [{ ruleId: this.id, clauseIds: claimed, intents }] : [];
  },
};
```

Wire both into `registry.ts` `RULES`.

> Constraint validation note: `onSegmentEdge` is sugar handled by the builder (Task 5) → it materializes a `segment3d` edge + an `onLine` point. The plane token `mp_SBC` label uses `_` which `Label3DZ` allows.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/pointOnEdge.test.ts src/stamps/geometry-3d/ai/rules/__tests__/planeNamed.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/rules/pointOnEdge.ts src/stamps/geometry-3d/ai/rules/planeNamed.ts src/stamps/geometry-3d/ai/rules/registry.ts src/stamps/geometry-3d/ai/rules/__tests__/pointOnEdge.test.ts src/stamps/geometry-3d/ai/rules/__tests__/planeNamed.test.ts
git commit -m "feat(3d-ai): rules pointOnEdge + planeNamed"
```

---

## Task 11: derived-point rules (midpoint3d / centroid3d / intersectionLine)

**Files:**
- Create: `src/stamps/geometry-3d/ai/rules/midpoint3d.ts`
- Create: `src/stamps/geometry-3d/ai/rules/centroid3d.ts`
- Create: `src/stamps/geometry-3d/ai/rules/intersectionLine.ts`
- Modify: `src/stamps/geometry-3d/ai/rules/registry.ts`
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/derived3d.test.ts`

**Interfaces:**
- `midpoint3d.ts`: `midpoint3dRule` (priority 62). "Gọi M là trung điểm của BC" / "trung điểm SA" → `addPoint3d(name,{kind:'midpoint',p1,p2})`; distributive "M, N lần lượt là trung điểm AB, CD".
- `centroid3d.ts`: `centroid3dRule` (priority 61). "G là trọng tâm tam giác SBC" → `addPoint3d('G',{kind:'centroid',vertices:[S,B,C]})`.
- `intersectionLine.ts`: `intersectionLineRule` (priority 58). "giao tuyến của (BCD) và (DMN)" → `line3dIntent({name?, kind:'planePlaneIntersection', plane1:'mp_BCD', plane2:'mp_DMN'})` (refs the plane names planeNamedRule will mint). Claims the clause.

- [ ] **Step 1: Write the failing test**

```ts
// rules/__tests__/derived3d.test.ts
import { midpoint3dRule } from '../midpoint3d';
import { centroid3dRule } from '../centroid3d';
import { intersectionLineRule } from '../intersectionLine';
import { segmentClauses3D } from '../../deterministic/coverage3d';
const run = (r: any, p: string) => r.match({ problem: p, clauses: segmentClauses3D(p) });

describe('derived 3D rules', () => {
  it('midpoint: Gọi M là trung điểm của BC', () => {
    const i = run(midpoint3dRule, 'Gọi M là trung điểm của BC.')[0].intents[0] as any;
    expect(i.constraint).toMatchObject({ kind:'midpoint', p1:'B', p2:'C' });
    expect(i.name).toBe('M');
  });
  it('midpoint distributive M, N lần lượt là trung điểm AB, CD', () => {
    const names = run(midpoint3dRule, 'M, N lần lượt là trung điểm AB, CD.').flatMap((m: any)=>m.intents).map((i:any)=>i.name).sort();
    expect(names).toEqual(['M','N']);
  });
  it('centroid: G là trọng tâm tam giác SBC', () => {
    const i = run(centroid3dRule, 'Gọi G là trọng tâm tam giác SBC.')[0].intents[0] as any;
    expect(i.constraint).toMatchObject({ kind:'centroid' });
    expect(i.constraint.vertices).toEqual(['S','B','C']);
  });
  it('giao tuyến của (BCD) và (DMN) → planePlaneIntersection', () => {
    const i = run(intersectionLineRule, 'Tìm giao tuyến của (BCD) và (DMN).')[0].intents[0] as any;
    expect(i.op).toBe('line');
    expect(i.kind).toBe('planePlaneIntersection');
    expect(i.refs).toMatchObject({ plane1:'mp_BCD', plane2:'mp_DMN' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/derived3d.test.ts`
Expected: FAIL — modules missing.

- [ ] **Step 3: Write minimal implementation**

```ts
// midpoint3d.ts
import type { LanguageRule3D, RuleMatch3D } from './_types';
import { addPoint3d } from './_shared';

const SINGLE = /([A-Z])\s+là\s+trung\s+điểm\s+(?:của\s+)?(?:cạnh\s+)?([A-Z])([A-Z])/u;
const DISTRIB = /([A-Z])\s*,\s*([A-Z])\s+lần\s+lượt\s+là\s+trung\s+điểm\s+(?:của\s+)?([A-Z])([A-Z])\s*,\s*([A-Z])([A-Z])/u;

export const midpoint3dRule: LanguageRule3D = {
  id: 'midpoint3d', priority: 62, languages: ['vi'],
  patterns: [/trung\s+điểm/u],
  match(ctx): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      const d = DISTRIB.exec(c.text);
      if (d) { out.push({ ruleId:this.id, clauseIds:[c.id], intents:[
        addPoint3d(d[1], { kind:'midpoint', p1:d[3], p2:d[4] }),
        addPoint3d(d[2], { kind:'midpoint', p1:d[5], p2:d[6] }),
      ]}); continue; }
      const m = SINGLE.exec(c.text);
      if (m) out.push({ ruleId:this.id, clauseIds:[c.id], intents:[
        addPoint3d(m[1], { kind:'midpoint', p1:m[2], p2:m[3] }),
      ]});
    }
    return out;
  },
};
```

```ts
// centroid3d.ts
import type { LanguageRule3D, RuleMatch3D } from './_types';
import { addPoint3d, splitVertexToken } from './_shared';

const RE = /([A-Z])\s+là\s+trọng\s+tâm\s+(?:của\s+)?(?:tam\s+giác\s+)?([A-Z]{3})/u;

export const centroid3dRule: LanguageRule3D = {
  id: 'centroid3d', priority: 61, languages: ['vi'],
  patterns: [/trọng\s+tâm/u],
  match(ctx): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      const m = RE.exec(c.text);
      if (m) out.push({ ruleId:this.id, clauseIds:[c.id], intents:[
        addPoint3d(m[1], { kind:'centroid', vertices: splitVertexToken(m[2]) }),
      ]});
    }
    return out;
  },
};
```

```ts
// intersectionLine.ts
import type { LanguageRule3D, RuleMatch3D } from './_types';
import { line3dIntent } from './_shared';

const RE = /giao\s+tuyến\s+(?:của\s+)?\(([A-Z]{3})\)\s*(?:và|,)\s*\(([A-Z]{3})\)/u;

export const intersectionLineRule: LanguageRule3D = {
  id: 'intersectionLine', priority: 58, languages: ['vi'],
  patterns: [/giao\s+tuyến/u],
  match(ctx): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      const m = RE.exec(c.text);
      if (m) out.push({ ruleId:this.id, clauseIds:[c.id], intents:[
        line3dIntent({ kind:'planePlaneIntersection', refs: { plane1:`mp_${m[1]}`, plane2:`mp_${m[2]}` } }),
      ]});
    }
    return out;
  },
};
```

> The `intersectionLine` rule references plane names `mp_BCD`/`mp_DMN` that `planeNamedRule` mints from the same `(BCD)`/`(DMN)` tokens — so both rules claim overlapping clauses and the planes exist before the line (intentTopo3d reorders if needed). Update Task 2 `line3dIntent` so non-(name|kind) keys go under `refs` (already noted in Task 6); the test asserts `i.refs`.

Wire all three into `registry.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/derived3d.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/rules/midpoint3d.ts src/stamps/geometry-3d/ai/rules/centroid3d.ts src/stamps/geometry-3d/ai/rules/intersectionLine.ts src/stamps/geometry-3d/ai/rules/registry.ts src/stamps/geometry-3d/ai/rules/__tests__/derived3d.test.ts
git commit -m "feat(3d-ai): rules midpoint3d/centroid3d/intersectionLine"
```

---

## Task 12: guards3d + verify3d (named-entity + numeric + acyclic)

**Files:**
- Create: `src/stamps/geometry-3d/ai/deterministic/guards3d.ts`
- Create: `src/stamps/geometry-3d/ai/verify3d.ts`
- Test: `src/stamps/geometry-3d/ai/__tests__/verify3d.test.ts`

**Interfaces:**
- `guards3d.ts`: `function allNamedEntities3DPresent(problem: string, state: State): { ok: boolean; missing: string[] }`. Collects expected names: solid vertices from `S.ABCD`/`tứ diện ABCD`/`lăng trụ ABC.A'B'C'`, plus "Gọi X"/"X là". Each must appear as a `point3d` label in state.
- `verify3d.ts`: `function verifyFigure3d(state: State): { ok: boolean; issues: string[] }`. Checks: (1) no cycles (run `constraintToWorld` on every derived point, catch the depth-guard throw); (2) midpoint coords ≈ avg of refs; (3) every ref id in every object's `dependsOn` exists in state. Uses `constraintToWorld` from `core/scene/kinds/constraint3d-math`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/verify3d.test.ts
import { intentToScene3d } from '../intentToScene3d';
import { solid, addPoint3d } from '../intent';
import { verifyFigure3d } from '../verify3d';
import { allNamedEntities3DPresent } from '../deterministic/guards3d';

const fig = intentToScene3d([
  solid({ flavor:'pyramid', baseLabels:['A','B','C','D'], baseVariant:'square', apex:'S', apexVariant:'regular' }),
  addPoint3d('M', { kind:'midpoint', p1:'B', p2:'C' }),
]);

describe('verifyFigure3d', () => {
  it('passes for a valid pyramid + midpoint', () => {
    expect(verifyFigure3d(fig).ok).toBe(true);
  });
  it('midpoint coords ≈ average of endpoints', () => {
    // pulled via constraint math inside verifyFigure3d; here just assert ok
    expect(verifyFigure3d(fig).issues).toEqual([]);
  });
});

describe('allNamedEntities3DPresent', () => {
  it('all vertices S,A,B,C,D present', () => {
    const r = allNamedEntities3DPresent('Cho hình chóp S.ABCD. Gọi M là trung điểm của BC.', fig);
    expect(r.ok).toBe(true);
  });
  it('flags a missing named point', () => {
    const r = allNamedEntities3DPresent('Cho hình chóp S.ABCD. Gọi K là trung điểm của BC.', fig);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('K');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/verify3d.test.ts`
Expected: FAIL — modules missing.

- [ ] **Step 3: Write minimal implementation**

```ts
// guards3d.ts
import type { State } from '../../../../core/scene';

const SOLID_HEAD = /(?:hình\s+chóp\s+([A-Z])\.([A-Z'′₀-₉0-9]+))|(?:tứ\s+diện(?:\s+đều)?\s+([A-Z'′]{4}))|(?:lăng\s+trụ\s+([A-Z]{3,})\.([A-Z'′]+))/gu;
const GOI = /(?:Gọi|Lấy|Dựng)\s+(?:điểm\s+)?([A-Z])(?![\p{L}])/gu;
const LA = /(?<![\p{L}])([A-Z])\s+là(?!\p{L})/gu;

function splitToken(t: string): string[] { return t.match(/[A-Z](?:['′]|[₀-₉0-9])?/gu) ?? []; }

export function allNamedEntities3DPresent(problem: string, state: State): { ok: boolean; missing: string[] } {
  const expected = new Set<string>();
  let m: RegExpExecArray | null;
  SOLID_HEAD.lastIndex = 0;
  while ((m = SOLID_HEAD.exec(problem))) {
    if (m[1]) { expected.add(m[1]); splitToken(m[2]).forEach((v) => expected.add(v)); }
    else if (m[3]) { splitToken(m[3]).forEach((v) => expected.add(v)); }
    else if (m[4]) { splitToken(m[4]).forEach((v) => expected.add(v)); splitToken(m[5]).forEach((v) => expected.add(v)); }
  }
  for (const re of [GOI, LA]) { re.lastIndex = 0; while ((m = re.exec(problem))) expected.add(m[1]); }

  const labels = new Set(Object.values(state.objects).filter((o) => o.kind === 'point3d').map((o) => o.label));
  const missing = [...expected].filter((n) => !labels.has(n));
  return { ok: missing.length === 0, missing };
}
```

```ts
// verify3d.ts
import type { State } from '../../../core/scene';
import { constraintToWorld } from '../../../core/scene/kinds/constraint3d-math';
import { getKind } from '../../../core/scene'; // for dependsOn — confirm export; else read attrs refs directly

export function verifyFigure3d(state: State): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  for (const obj of Object.values(state.objects)) {
    if (obj.kind === 'point3d') {
      const c = (obj.attrs as any).constraint;
      try {
        const w = constraintToWorld(c, state);
        if (!w.every((n) => Number.isFinite(n))) issues.push(`${obj.label}: toạ độ không hữu hạn`);
        if (c.kind === 'midpoint') {
          const a = constraintToWorld((state.objects[c.p1].attrs as any).constraint, state);
          const b = constraintToWorld((state.objects[c.p2].attrs as any).constraint, state);
          for (let k = 0; k < 3; k++) if (Math.abs(w[k] - (a[k] + b[k]) / 2) > 1e-6) issues.push(`${obj.label}: midpoint sai`);
        }
      } catch (e) {
        issues.push(`${obj.label}: ${(e as Error).message}`); // depth-guard / missing ref
      }
    }
  }
  return { ok: issues.length === 0, issues };
}
```

> Confirm `constraint3d-math` import path (`src/core/scene/kinds/constraint3d-math.ts`) and that `constraintToWorld(c, state)` accepts the scene `State` directly (reference §A confirms signature). Drop the `getKind` import if unused.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/verify3d.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/deterministic/guards3d.ts src/stamps/geometry-3d/ai/verify3d.ts src/stamps/geometry-3d/ai/__tests__/verify3d.test.ts
git commit -m "feat(3d-ai): guards3d (named-entity) + verify3d (numeric + acyclic)"
```

---

## Task 13: runDeterministicIntents3d + tryDeterministicFigure3d (engine entry)

**Files:**
- Create: `src/stamps/geometry-3d/ai/deterministic/runDeterministicIntents3d.ts`
- Create: `src/stamps/geometry-3d/ai/deterministic/tryDeterministicFigure3d.ts`
- Test: `src/stamps/geometry-3d/ai/deterministic/__tests__/tryDeterministicFigure3d.test.ts`

**Interfaces:**
- `runDeterministicIntents3d.ts`: `function runDeterministicIntents3d(problem: string): { ok: true; intents: Intent3DT[]; coverage: CoverageReport3D } | { ok: false; reason: 'no-match'|'incomplete-coverage'; coverage: CoverageReport3D }`; also `function tryPartial3d(problem): { detIntents: Intent3DT[]; uncovered: Clause3D[]; coverage: CoverageReport3D }`.
- `tryDeterministicFigure3d.ts`: `type Reason3D = 'no-match'|'incomplete-coverage'|'build-throw'|'verify-fail'|'named-missing'`; `function tryDeterministicFigure3d(problem: string): { ok: true; state: State; intents: Intent3DT[]; coverage } | { ok: false; reason: Reason3D; detail?: string; coverage?: CoverageReport3D }`.

- [ ] **Step 1: Write the failing test**

```ts
// deterministic/__tests__/tryDeterministicFigure3d.test.ts
import { tryDeterministicFigure3d } from '../tryDeterministicFigure3d';

describe('tryDeterministicFigure3d', () => {
  it('builds a pyramid + midpoint end-to-end', () => {
    const r = tryDeterministicFigure3d('Cho hình chóp S.ABCD có đáy ABCD là hình vuông. Gọi M là trung điểm của BC.');
    expect(r.ok).toBe(true);
    if (r.ok) {
      const labels = Object.values(r.state.objects).map((o) => o.label);
      expect(labels).toEqual(expect.arrayContaining(['A','B','C','D','S','M']));
    }
  });
  it('no-match on a non-geometry sentence', () => {
    const r = tryDeterministicFigure3d('Hôm nay trời đẹp quá.');
    expect(r.ok).toBe(false);
  });
  it('tứ diện end-to-end', () => {
    const r = tryDeterministicFigure3d('Cho tứ diện ABCD. Gọi M là trung điểm của AB.');
    expect(r.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/deterministic/__tests__/tryDeterministicFigure3d.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
// runDeterministicIntents3d.ts
import type { Intent3DT } from '../intent';
import { segmentClauses3D, computeCoverage3D, type CoverageReport3D, type Clause3D } from './coverage3d';
import { runRules3D } from '../rules/registry';

function dedup(intents: Intent3DT[]): Intent3DT[] {
  const seen = new Set<string>();
  return intents.filter((i) => { const k = JSON.stringify(i); if (seen.has(k)) return false; seen.add(k); return true; });
}

export function runDeterministicIntents3d(problem: string) {
  const clauses = segmentClauses3D(problem);
  const geo = clauses.filter((c) => c.hasGeometry);
  const matches = runRules3D({ problem, clauses: geo });
  if (matches.length === 0) return { ok: false as const, reason: 'no-match' as const, coverage: computeCoverage3D(clauses, []) };
  const claimed = matches.flatMap((m) => m.clauseIds);
  const coverage = computeCoverage3D(clauses, claimed);
  if (!coverage.complete) return { ok: false as const, reason: 'incomplete-coverage' as const, coverage };
  return { ok: true as const, intents: dedup(matches.flatMap((m) => m.intents)), coverage };
}

export function tryPartial3d(problem: string): { detIntents: Intent3DT[]; uncovered: Clause3D[]; coverage: CoverageReport3D } {
  const clauses = segmentClauses3D(problem);
  const geo = clauses.filter((c) => c.hasGeometry);
  const matches = runRules3D({ problem, clauses: geo });
  const claimed = matches.flatMap((m) => m.clauseIds);
  const coverage = computeCoverage3D(clauses, claimed);
  return { detIntents: dedup(matches.flatMap((m) => m.intents)), uncovered: coverage.uncovered, coverage };
}
```

```ts
// tryDeterministicFigure3d.ts
import type { State } from '../../../core/scene';
import type { Intent3DT } from '../intent';
import type { CoverageReport3D } from './coverage3d';
import { runDeterministicIntents3d } from './runDeterministicIntents3d';
import { orderIntents3dByDependency } from '../intentTopo3d';
import { intentToScene3d } from '../intentToScene3d';
import { verifyFigure3d } from '../verify3d';
import { allNamedEntities3DPresent } from './guards3d';

export type Reason3D = 'no-match' | 'incomplete-coverage' | 'build-throw' | 'verify-fail' | 'named-missing';
export type TryResult3D =
  | { ok: true; state: State; intents: Intent3DT[]; coverage: CoverageReport3D }
  | { ok: false; reason: Reason3D; detail?: string; coverage?: CoverageReport3D };

export function tryDeterministicFigure3d(problem: string): TryResult3D {
  const det = runDeterministicIntents3d(problem);
  if (!det.ok) return { ok: false, reason: det.reason, coverage: det.coverage };

  let state: State;
  try {
    state = intentToScene3d(det.intents);
  } catch {
    try { state = intentToScene3d(orderIntents3dByDependency(det.intents)); }
    catch (e2) { return { ok: false, reason: 'build-throw', detail: (e2 as Error).message, coverage: det.coverage }; }
  }

  const v = verifyFigure3d(state);
  if (!v.ok) return { ok: false, reason: 'verify-fail', detail: v.issues.join('; '), coverage: det.coverage };

  const named = allNamedEntities3DPresent(problem, state);
  if (!named.ok) return { ok: false, reason: 'named-missing', detail: named.missing.join(','), coverage: det.coverage };

  return { ok: true, state, intents: det.intents, coverage: det.coverage };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/deterministic/__tests__/tryDeterministicFigure3d.test.ts`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/deterministic/runDeterministicIntents3d.ts src/stamps/geometry-3d/ai/deterministic/tryDeterministicFigure3d.ts src/stamps/geometry-3d/ai/deterministic/__tests__/tryDeterministicFigure3d.test.ts
git commit -m "feat(3d-ai): Track-A engine entry (runDeterministicIntents3d + tryDeterministicFigure3d)"
```

---

## Task 14: probe harness — diag-all-3d + dbg-bai-3d + baseline

**Files:**
- Create: `scripts/diag-all-3d.ts`
- Create: `scripts/dbg-bai-3d.ts`
- Modify: `package.json` (add `"diag:3d": "tsx scripts/diag-all-3d.ts"`, `"dbg:3d": "tsx scripts/dbg-bai-3d.ts"`)
- (No unit test — this is a script; verification = it runs and writes the JSON with a 3-tier metric.)

**Interfaces:**
- Consumes: `tryDeterministicFigure3d`, `tryPartial3d`, `segmentClauses3D`.
- Produces: `.work/escalations-3d.json` — rows `{ dataset, id, intro, tier: 'FULL'|'PARTIAL'|'NONE', reason, detail, detIntents: string[], uncovered: string[] }`. Prints per-dataset `FULL/PARTIAL/NONE` counts.

- [ ] **Step 1: Write the script**

```ts
// scripts/diag-all-3d.ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tryDeterministicFigure3d } from '../src/stamps/geometry-3d/ai/deterministic/tryDeterministicFigure3d';
import { tryPartial3d } from '../src/stamps/geometry-3d/ai/deterministic/runDeterministicIntents3d';
import { segmentClauses3D } from '../src/stamps/geometry-3d/ai/deterministic/coverage3d';

interface Bai { id: string; text: string }
// "Câu N:" blocks separated by blank lines
function parseCau(raw: string): Bai[] {
  const out: Bai[] = [];
  let cur: Bai | null = null;
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^Câu\s+(\d+)\s*[:.]/u);
    if (m) { if (cur) out.push(cur); cur = { id: m[1], text: line.replace(/^Câu\s+\d+\s*[:.]/u, '').trim() }; }
    else if (cur) cur.text += ' ' + line.trim();
  }
  if (cur) out.push(cur);
  return out;
}
// intro = construction part, before the sub-questions (a)/(b) or "Chứng minh/Tính/Xác định thiết diện"
function intro3d(text: string): string {
  const cut = text.search(/\b(?:a\)|b\)|Chứng minh|Tính|Xác định thiết diện)/u);
  return (cut > 0 ? text.slice(0, cut) : text).trim();
}

const DATASETS = [
  { name: 'ss-thietdien', file: 'docs/datasets/hinh-khong-gian-11-songsong-thietdien.txt' },
  { name: 'vuonggoc',     file: 'docs/datasets/hinh-khong-gian-11-vuonggoc-khoangcach.txt' },
  { name: 'tron-xoay',    file: 'docs/datasets/hinh-khong-gian-12-khoi-tron-xoay.txt' },
];

interface Row { dataset: string; id: string; intro: string; tier: 'FULL'|'PARTIAL'|'NONE'; reason: string|null; detail: string|null; detIntents: string[]; uncovered: string[]; }
const intentKind = (i: any) => i.op === 'add-point-3d' ? `add-point-3d/${i.constraint?.kind}` : i.op === 'solid' ? `solid/${i.flavor}` : i.op;

const rows: Row[] = [];
for (const ds of DATASETS) {
  let raw = '';
  try { raw = readFileSync(ds.file, 'utf8'); } catch { console.warn('skip', ds.file); continue; }
  for (const b of parseCau(raw)) {
    const intro = intro3d(b.text);
    if (intro.length < 8) continue;
    const r = tryDeterministicFigure3d(intro);
    const part = tryPartial3d(intro);
    const geoCount = segmentClauses3D(intro).filter((c) => c.hasGeometry).length;
    let tier: Row['tier'];
    if (r.ok) tier = 'FULL';
    else if (part.detIntents.length > 0 && part.uncovered.length < geoCount) tier = 'PARTIAL';
    else tier = 'NONE';
    rows.push({
      dataset: ds.name, id: b.id, intro,
      tier, reason: r.ok ? null : r.reason, detail: r.ok ? null : r.detail ?? null,
      detIntents: (r.ok ? r.intents : part.detIntents).map(intentKind),
      uncovered: r.ok ? [] : part.uncovered.map((c) => c.text),
    });
  }
}
mkdirSync('.work', { recursive: true });
writeFileSync('.work/escalations-3d.json', JSON.stringify(rows, null, 2));

for (const ds of DATASETS) {
  const sub = rows.filter((r) => r.dataset === ds.name);
  const f = sub.filter((r) => r.tier === 'FULL').length;
  const p = sub.filter((r) => r.tier === 'PARTIAL').length;
  const n = sub.filter((r) => r.tier === 'NONE').length;
  console.log(`${ds.name}: FULL ${f} / PARTIAL ${p} / NONE ${n}  (total ${sub.length})`);
}
```

```ts
// scripts/dbg-bai-3d.ts
import { readFileSync } from 'node:fs';
import { segmentClauses3D } from '../src/stamps/geometry-3d/ai/deterministic/coverage3d';
import { runRules3D } from '../src/stamps/geometry-3d/ai/rules/registry';
import { tryDeterministicFigure3d } from '../src/stamps/geometry-3d/ai/deterministic/tryDeterministicFigure3d';

const [ds, id] = [process.argv[2], process.argv[3]];
const rows = JSON.parse(readFileSync('.work/escalations-3d.json', 'utf8'));
const row = rows.find((r: any) => r.dataset === ds && String(r.id) === id);
if (!row) { console.log('not found'); process.exit(1); }
const intro = row.intro as string;
console.log('INTRO:', intro, '\n');
const clauses = segmentClauses3D(intro);
const geo = clauses.filter((c) => c.hasGeometry);
const matches = runRules3D({ problem: intro, clauses: geo });
for (const c of clauses) {
  const claimed = matches.filter((m) => m.clauseIds.includes(c.id));
  const tag = !c.hasGeometry ? '[no-geo]' : claimed.length ? '✓' : '✗MISS';
  console.log(tag, c.text);
  claimed.forEach((m) => m.intents.forEach((i) => console.log('    →', JSON.stringify(i))));
}
const r = tryDeterministicFigure3d(intro);
console.log('\nRESULT:', r.ok ? `OK (${Object.values(r.state.objects).map((o:any)=>o.label).join(',')})` : `${r.reason} :: ${r.detail ?? ''}`);
```

- [ ] **Step 2: Run the probe**

Run: `npx tsx scripts/diag-all-3d.ts`
Expected: prints 3 lines `ss-thietdien: FULL x / PARTIAL y / NONE z ...` and writes `.work/escalations-3d.json`. (Baseline — FULL likely small; that's expected.)

- [ ] **Step 3: Spot-check one problem**

Run: `npx tsx scripts/dbg-bai-3d.ts ss-thietdien 1`
Expected: prints clause-by-clause claim trace + RESULT.

- [ ] **Step 4: Record baseline**

Append the printed FULL/PARTIAL/NONE numbers to the commit message.

- [ ] **Step 5: Commit**

```bash
git add scripts/diag-all-3d.ts scripts/dbg-bai-3d.ts package.json
git commit -m "feat(3d-ai): probe harness diag-all-3d + dbg-bai-3d (baseline FULL/PARTIAL/NONE)"
```

---

## Task 15: façade `handleGenerateFigure3d` + buildFigureIntent3d

**Files:**
- Create: `src/stamps/geometry-3d/ai/buildFigureIntent3d.ts`
- Create: `src/stamps/geometry-3d/ai/handleGenerateFigure3d.ts`
- Test: `src/stamps/geometry-3d/ai/__tests__/handleGenerateFigure3d.test.ts`

**Interfaces:**
- `buildFigureIntent3d.ts`: `function generateFigureIntent3d(problem: string): { ok: true; state: State; intents: Intent3DT[] } | { ok: false; reason: string; detail?: string }` (Track A only; LLM fallback deferred to a later phase).
- `handleGenerateFigure3d.ts`: `interface AiFigure3DResult { ok: boolean; state?: State; message?: string }`; `function handleGenerateFigure3d(input: { problem: string }): AiFigure3DResult` — maps reasons to Vietnamese messages.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/handleGenerateFigure3d.test.ts
import { handleGenerateFigure3d } from '../handleGenerateFigure3d';

describe('handleGenerateFigure3d', () => {
  it('returns a renderable 3D state for a pyramid problem', () => {
    const r = handleGenerateFigure3d({ problem: 'Cho hình chóp S.ABCD có đáy là hình vuông. Gọi M là trung điểm của SC.' });
    expect(r.ok).toBe(true);
    expect(r.state?.meta.domain).toBe('3d');
  });
  it('returns ok:false + Vietnamese message on non-geometry input', () => {
    const r = handleGenerateFigure3d({ problem: 'abc xyz' });
    expect(r.ok).toBe(false);
    expect(typeof r.message).toBe('string');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/handleGenerateFigure3d.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
// buildFigureIntent3d.ts
import type { State } from '../../../core/scene';
import type { Intent3DT } from './intent';
import { tryDeterministicFigure3d } from './deterministic/tryDeterministicFigure3d';

export function generateFigureIntent3d(problem: string):
  | { ok: true; state: State; intents: Intent3DT[] }
  | { ok: false; reason: string; detail?: string } {
  const r = tryDeterministicFigure3d(problem);
  if (r.ok) return { ok: true, state: r.state, intents: r.intents };
  return { ok: false, reason: r.reason, detail: r.detail };
}
```

```ts
// handleGenerateFigure3d.ts
import type { State } from '../../../core/scene';
import { generateFigureIntent3d } from './buildFigureIntent3d';

export interface AiFigure3DResult { ok: boolean; state?: State; message?: string }

const MSG: Record<string, string> = {
  'no-match': 'Chưa nhận dạng được hình không gian trong đề.',
  'incomplete-coverage': 'Một số chi tiết trong đề chưa dựng được tự động.',
  'build-throw': 'Không dựng được hình từ các quan hệ trong đề.',
  'verify-fail': 'Hình dựng ra chưa hợp lệ về mặt hình học.',
  'named-missing': 'Thiếu một số điểm được nêu tên trong đề.',
};

export function handleGenerateFigure3d(input: { problem: string }): AiFigure3DResult {
  const r = generateFigureIntent3d(input.problem);
  if (r.ok) return { ok: true, state: r.state };
  return { ok: false, message: MSG[r.reason] ?? 'Không dựng được hình.' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/handleGenerateFigure3d.test.ts`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/buildFigureIntent3d.ts src/stamps/geometry-3d/ai/handleGenerateFigure3d.ts src/stamps/geometry-3d/ai/__tests__/handleGenerateFigure3d.test.ts
git commit -m "feat(3d-ai): façade handleGenerateFigure3d + generateFigureIntent3d"
```

---

## Task 16: editor wiring — "AI dựng hình" entry in the 3D editor

**Files:**
- Modify: `src/stamps/geometry-3d/editor/EditorPanel.tsx` (add an input + button that calls `handleGenerateFigure3d` and `store.dispatch({type:'LOAD', payload:{state}})`)
- Test: `src/stamps/geometry-3d/editor/__tests__/ai-generate-3d.test.tsx`

**Interfaces:**
- Consumes: `handleGenerateFigure3d`, the editor's `store`. On success, replaces the scene via `LOAD`. Add `data-testid="ai-generate-3d-input"` and `data-testid="ai-generate-3d-btn"`.

- [ ] **Step 1: Write the failing test**

```tsx
// editor/__tests__/ai-generate-3d.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { handleGenerateFigure3d } from '../../ai/handleGenerateFigure3d';

describe('3D editor AI generate', () => {
  it('handleGenerateFigure3d produces a state the editor can LOAD', () => {
    const r = handleGenerateFigure3d({ problem: 'Cho tứ diện ABCD. Gọi M là trung điểm của AB.' });
    expect(r.ok).toBe(true);
    expect(r.state).toBeTruthy();
  });
});
```

> NOTE: a full RTL mount of `EditorPanel` requires the existing 3D editor test harness/mocks (MiniBoard3D mocks JSXGraph). If mounting is heavy, keep THIS task's automated test at the `handleGenerateFigure3d`→state level (above) and verify the actual button interaction in the Playwright spec (Task 17). Wire the button regardless.

- [ ] **Step 2: Run test to verify it fails / passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/editor/__tests__/ai-generate-3d.test.tsx`
Expected: PASS at the state level (handleGenerateFigure3d already exists). The DELIVERABLE of this task is the wired button (verified in Task 17), so also:

- [ ] **Step 3: Wire the button in EditorPanel.tsx**

Read `EditorPanel.tsx` to find the store handle + toolbar region. Add (follow existing styling/components):
```tsx
const [aiText, setAiText] = useState('');
// ...
<input data-testid="ai-generate-3d-input" value={aiText} onChange={(e) => setAiText(e.target.value)}
  placeholder="Nhập đề hình không gian…" />
<button data-testid="ai-generate-3d-btn" onClick={() => {
  const r = handleGenerateFigure3d({ problem: aiText });
  if (r.ok && r.state) store.dispatch({ type: 'LOAD', payload: { state: r.state } });
}}>AI dựng hình</button>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/editor/EditorPanel.tsx src/stamps/geometry-3d/editor/__tests__/ai-generate-3d.test.tsx
git commit -m "feat(3d): nút AI dựng hình trong editor 3D (LOAD scene từ đề)"
```

---

## Task 17: Playwright render-verify (the plane3d-class bug catcher)

**Files:**
- Create: `tests/e2e/geometry-3d-figure.spec.ts`
- (Verification = the spec passes against the demo app.)

**Interfaces:**
- Consumes: the demo app (`npm run demo`), the 3D editor (testids from §F: `stamp-toolbar-geometry3d`, `editor-panel-3d`, `mini-board-3d`, plus new `ai-generate-3d-input`/`ai-generate-3d-btn`), `window.JXG`.
- Produces: an e2e test that opens the 3D editor, types a pyramid problem, clicks generate, waits for JSXGraph, asserts ≥ N rendered 3D elements and no console error.

- [ ] **Step 1: Write the spec**

```ts
// tests/e2e/geometry-3d-figure.spec.ts
import { test, expect } from '@playwright/test';

test('AI-generated pyramid renders in the 3D editor', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/');
  await expect(page.locator('.excalidraw').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('.App-toolbar__extra-tools-trigger').first().click();
  await page.locator('[data-testid="stamp-toolbar-geometry3d"]').click();
  await expect(page.locator('[data-testid="editor-panel-3d"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => !!(window as any).JXG, undefined, { timeout: 10_000 });

  await page.locator('[data-testid="ai-generate-3d-input"]').fill(
    'Cho hình chóp S.ABCD có đáy ABCD là hình vuông. Gọi M là trung điểm của SC.',
  );
  await page.locator('[data-testid="ai-generate-3d-btn"]').click();

  // wait for the scene to populate the JSXGraph 3D board
  await page.waitForTimeout(500);
  const count = await page.evaluate(() => {
    const JXG = (window as any).JXG;
    const board = Object.values(JXG.boards)[0] as any;
    return Object.values(board.objects).filter((o: any) => /point3d|line3d|polygon3d/.test(o.elType ?? '')).length;
  });
  expect(count).toBeGreaterThan(5);          // 5 vertices + faces + edges
  expect(errors.join('\n')).not.toMatch(/plane3d|undefined is not|Cannot read/i);
});
```

- [ ] **Step 2: Run the spec from this worktree (own port to avoid stale-server gotcha)**

Run: `npx playwright test tests/e2e/geometry-3d-figure.spec.ts`
Expected: 1 passed. If it reuses a stale vite on :5173 (memory gotcha), start the worktree demo on a fresh port and set `baseURL` for the run, or stop the other vite first.

> Use Playwright MCP during development to interactively confirm the figure looks right (mount the editor, run the generate, screenshot). The plane3d `[point,dir1,dir2]` bug class manifests as a misaligned/absent plane — visible in the screenshot and (for named planes) in the console-error assertion.

- [ ] **Step 3: Adjust testids if the demo differs**

If a selector fails, snapshot the DOM (`page.locator('body').innerHTML()` or Playwright MCP `browser_snapshot`) and fix the selector to match the real demo. Confirm the stamp-open flow matches the existing `geometry-3d-derived.spec.ts` (reference §F).

- [ ] **Step 4: Full suite sanity**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d` then `npx tsc --noEmit`
Expected: all 3D unit tests pass; no type errors.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/geometry-3d-figure.spec.ts
git commit -m "test(3d): Playwright render-verify cho hình 3D sinh từ đề"
```

---

## Follow-on (separate plans, documented in the spec §6)

- **Phase 2 — Thiết diện**: compute plane∩polyhedron polygon → `polygon3d`; intent `cross-section`; rules "thiết diện … cắt bởi (IJK)".
- **Phase 3 — Metric (vuonggoc)**: perp-foot-to-plane distance figures, ⊥ relations, foot-of-altitude. Lower coverage expected (formula-only problems → PARTIAL/NONE).
- **Phase 4 — Mặt cầu (khoi-tron-xoay)**: circumsphere-on-axis.
- **Backlog issue (separate)**: hidden-line removal + orthographic projection mode for legibility at scale.

## Self-Review

- **Spec coverage:** §3 gaps 1–6 all mapped — rule engine (T8–T11), Intent3D (T2), builder (T4–T6), coverage gate (T1, T13), guards/verify (T12), probe+datasets (T14), façade+editor (T15–T16), Playwright (T17), layout3d (T3), topo (T7). Phases 2–4 deferred to follow-on per the chosen scope being delivered incrementally on this foundation.
- **Placeholder scan:** no TBD/TODO; every code step has complete code. Task 16 explicitly down-scopes its automated test to the state level and defers UI interaction to Task 17 (justified, not a placeholder).
- **Type consistency:** `Intent3DT`/`Intent3DZ`, `Clause3D`/`CoverageReport3D`, `BuildState3D`/`addPoint3dObj`/`addShape3dObj`/`resolveId`, `RuleMatch3D`/`LanguageRule3D`/`runRules3D`, `tryDeterministicFigure3d`→`{ok,state,intents,coverage}`, `solidLayout`→`{coords,faces,vertexOrder}` consistent across tasks. `line3dIntent` factory must route extra keys into `refs` (flagged in T6 + asserted in T11) — single source of truth in T2 after the T6 fix.
- **Known verify-at-impl points (not placeholders — real unknowns to confirm against live code):** (1) `core/scene` barrel exports `createStore`/`createEmptyState`/`nextLabel`/types — confirm names in `src/core/scene/index.ts`; (2) `meta.view` tuple ordering consumed by `render.ts` (two `DEFAULT_VIEW_3D` shapes disagree); (3) `constraintToWorld(c, state)` import path + that it accepts a plain `State`; (4) demo testids for the 3D stamp-open flow.
