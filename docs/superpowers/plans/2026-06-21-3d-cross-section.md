# 3D Cross-Section (Thiết diện) — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw the cross-section (thiết diện) polygon of a cutting plane through a solid, by computing plane∩polyhedron at build time and emitting derived points + a `polygon3d`, wired as a new `cross-section` intent op (rule → intent → builder → verify → e2e).

**Architecture:** Option B (derived per-vertex). A new `cross-section` op resolves a `plane3d` + a `polyhedron3d`, walks the solid's edges, collects section vertices (solid vertices ON the plane → reuse id; edges with a strict sign-change → a derived `intersectionLinePlane` point — **reusing the existing constraint kind, no new core kind**), orders them around the plane via an angular sort on the plane basis, and emits a `polygon3d`. Because `polygon3d` renders resolved point objects (not baked coords) and derived points use function-coords, the section coordinates live-update for free; topology is fixed at build. No new core scene kind, no new render capability.

**Tech Stack:** TypeScript (strict), Zod 3, JSXGraph `view3d`, Jest 29 (ts-jest/jsdom), Playwright, `tsx` for scripts.

## Global Constraints

- TypeScript strict; avoid `any` where avoidable (builders may cast via `unknown` like the foundation).
- Vietnamese regex: ALWAYS flag `u` + lookaround `(?!\p{L})` instead of `\b` (ASCII `\b` breaks around Vietnamese diacritics).
- ANY `new RegExp(\`...${name}...\`)` MUST wrap `name` in `escapeRe(name)` (from `rules/_shared.ts`).
- Registry-dispatch, no central switch: adding a construct = 1 module + 1 registry line + 1 test.
- Fork (copy+adapt) the 3D layer; do NOT import-couple the mature 2D `geometry-2d/ai/`. Reuse only `core/scene/*`.
- Commit messages Vietnamese (prefix English: `feat`/`fix`/`test`/`docs`). **NO `Co-Authored-By`.**
- Run tests from this worktree with `npx jest -c jest.worktree.config.js <path>`.
- 3D probe metric is 3-tier (FULL/PARTIAL/NONE). **Hard rule: 0-regression — FULL must not drop and NONE must not rise** on any dataset (`npx tsx scripts/diag-all-3d.ts`). Baseline (HEAD `117558f`): ss-thietdien 30/176/35 · vuonggoc 104/205/59 · tron-xoay 15/30/44 · TOTAL 149/411/138.
- **Builder fail-soft:** if a section cannot form (<3 vertices / degenerate), the builder emits nothing for the section and returns (does NOT throw) — the rest of the figure must still build. Throw ONLY on genuinely unresolvable refs (via `resolveId`).

## Verified substrate facts (do not re-derive)

- `intersectionLinePlane` constraint = `{ kind:'intersectionLinePlane'; a:string; b:string; plane:string }` (`core/scene/kinds/3d-constraint.ts:22`). Reuse — **no new constraint kind**.
- `polyhedron3d` attrs = `{ flavor; vertices: string[]; faces: number[][]; color? }`; `faces` index into `vertices`, each face is a ring.
- `polygon3d` attrs = `{ vertices: string[]; color? }`; `validate` only requires `vertices.length >= 3`; renders resolved point objects (live).
- `plane3d` attrs = `{ p1?; p2?; p3?; construction? }`; construction kinds `planeParallelThrough{point,refPlane}` / `planePerpToLine{point,lineA,lineB}`. Builder `intent-builders/plane.ts` already supports specs `threePoints` / `parallelThrough` / `perpToLine`.
- Exported math (from `core/scene/kinds/constraint3d-math`): `constraintToWorld(c, state): Vec3` and `planeConstructionWorld(c, state): {p1,p2,p3: Vec3}`. (`getPlaneBasis`/`planeOriginNormal` are NOT exported — compute the plane frame from 3 world points.)
- `addShape3dObj(s, kind, prefix, label, attrs, visible=true, registerInNameMap=true): string` — pass `registerInNameMap=false` for unnamed objects (avoids clobbering vertex labels in `nameToId`).
- `addPoint3dObj(s, label, constraint)` ALWAYS registers `nameToId` — so for UNNAMED derived points, use `addShape3dObj(s,'point3d','p','',{constraint},true,false)` instead.
- `resolveId(s, name)` throws `IntentBuilder3DError` if missing.
- Rule shape: `LanguageRule3D = { id; priority; languages; patterns: RegExp[]; match(ctx:{problem,clauses}): RuleMatch3D[] }`; `RuleMatch3D = { ruleId; clauseIds:number[]; intents: Intent3DT[] }`. `runRules3D` pattern-filters rules against the FULL problem text before calling `match()`.
- `runDeterministicIntents3d` `dedup` keys on `JSON.stringify(intent)` → identical intents collapse.
- `planeNamed` patterns include `/\([A-Z]{3}\)/u` and `/thiết\s+diện/u`; it emits `mp_XYZ` `threePoints` planes from `(XYZ)` tokens. So emit section planes with the SAME `mp_XYZ` naming so dedup collapses.
- `intentToScene3d` build loop: `for (const intent of orderIntents3dByDependency(intents)) { OP_BUILDERS_3D[intent.op](s, intent) }`; `meta.view` set after to `{bbox3D:[-3,-3,-3,3,3,3], azimuth:1.0, elevation:0.6}`.
- `producesOf` (in `intentTopo3d.ts`) is a `switch(i.op)` with NO default → adding a union member forces a new case (compile-enforced). `consumesOf` is generic (walks non-PRODUCE_KEYS string fields) → `plane`/`solid` auto-detected as consumes; no change needed there.

## File Structure

```
src/stamps/geometry-3d/ai/
  crossSectionGeometry.ts          ← NEW: pure math (edges, plane frame, crossing, ordering)
  intent.ts                        ← MODIFY: + CrossSectionIntentZ + crossSection3d helper
  intentTopo3d.ts                  ← MODIFY: + producesOf case 'cross-section'
  intentToScene3d.ts               ← MODIFY (Task 7): Intent3DZ.parse hygiene gate
  verify3d.ts                      ← MODIFY (Task 6): section coplanar + on-edge checks
  rules/
    _shared.ts                     ← MODIFY: re-export crossSection3d
    crossSection.ts                ← NEW: "thiết diện (MCD)" / "cắt bởi (IJK)"
    crossSectionParallel.ts        ← NEW: "thiết diện ... qua M song song (SBC)"
    linePlanePoint.ts              ← NEW: "giao điểm MN với (BCD)"
    registry.ts                    ← MODIFY: register 3 rules
  intent-builders/
    crossSection.ts                ← NEW: buildCrossSection
    registry.ts                    ← MODIFY: OP_BUILDERS_3D['cross-section']
  __tests__/ , rules/__tests__/    ← NEW tests alongside
tests/e2e/geometry-3d-figure.spec.ts  ← MODIFY (Task 8): section case
```

---

## Task 1: Pure cross-section geometry (`crossSectionGeometry.ts`)

**Files:**
- Create: `src/stamps/geometry-3d/ai/crossSectionGeometry.ts`
- Test: `src/stamps/geometry-3d/ai/__tests__/crossSectionGeometry.test.ts`

**Interfaces:**
- Consumes: nothing (pure, leaf — operates on `Vec3` arrays only).
- Produces:
  - `type Vec3 = [number, number, number]`
  - `interface PlaneFrame { origin: Vec3; normal: Vec3; u: Vec3; v: Vec3 }`
  - `function planeFrame(p1: Vec3, p2: Vec3, p3: Vec3): PlaneFrame`
  - `function signedDistance(p: Vec3, f: PlaneFrame): number`
  - `function edgePlaneCrossing(a: Vec3, b: Vec3, f: PlaneFrame, eps?: number): number | null`
  - `function extractEdges(faces: number[][]): Array<[number, number]>`
  - `function orderAroundPerimeter(points: Vec3[], f: PlaneFrame): number[]`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/crossSectionGeometry.test.ts
import {
  planeFrame, signedDistance, edgePlaneCrossing, extractEdges, orderAroundPerimeter,
  type Vec3,
} from '../crossSectionGeometry';

const near = (a: number, b: number, t = 1e-9) => Math.abs(a - b) < t;

describe('extractEdges', () => {
  it('square-pyramid faces → 8 unique edges', () => {
    const faces = [[0,1,2,3],[0,1,4],[1,2,4],[2,3,4],[3,0,4]];
    expect(extractEdges(faces).length).toBe(8);
  });
  it('dedups shared edges regardless of direction', () => {
    expect(extractEdges([[0,1,2],[2,1,3]]).length).toBe(5); // 01,12,20,13,23 (12==21 deduped)
  });
});

describe('planeFrame + signedDistance', () => {
  it('z=0 plane: normal ∥ z, base points have distance 0, apex positive', () => {
    const f = planeFrame([0,0,0], [1,0,0], [0,1,0]);
    expect(near(Math.abs(f.normal[2]), 1)).toBe(true);
    expect(near(signedDistance([5,5,0], f), 0)).toBe(true);
    expect(signedDistance([0,0,2], f)).not.toBe(0);
  });
});

describe('edgePlaneCrossing', () => {
  const f = planeFrame([0,0,0], [1,0,0], [0,1,0]); // z=0
  it('edge crossing z=0 returns t in (0,1)', () => {
    expect(near(edgePlaneCrossing([0,0,-1], [0,0,1], f)!, 0.5)).toBe(true);
  });
  it('same-side edge returns null', () => {
    expect(edgePlaneCrossing([0,0,1], [0,0,2], f)).toBeNull();
  });
  it('endpoint on plane returns null (handled as a vertex, not a crossing)', () => {
    expect(edgePlaneCrossing([0,0,0], [0,0,2], f)).toBeNull();
  });
});

describe('orderAroundPerimeter', () => {
  it('returns a cyclic permutation of a square given in scrambled order', () => {
    const f = planeFrame([0,0,0], [1,0,0], [0,1,0]);
    const pts: Vec3[] = [[1,1,0],[-1,-1,0],[1,-1,0],[-1,1,0]];
    const order = orderAroundPerimeter(pts, f);
    expect(order.length).toBe(4);
    expect(new Set(order).size).toBe(4); // permutation
    // consecutive points in order share an edge of the square (differ in exactly one axis sign)
    const seq = order.map((i) => pts[i]);
    for (let i = 0; i < 4; i++) {
      const a = seq[i], b = seq[(i+1)%4];
      const diff = (a[0] !== b[0] ? 1 : 0) + (a[1] !== b[1] ? 1 : 0);
      expect(diff).toBe(1);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/crossSectionGeometry.test.ts`
Expected: FAIL — `Cannot find module '../crossSectionGeometry'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// crossSectionGeometry.ts — pure vector math for cross-section computation.
export type Vec3 = [number, number, number];

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1]*b[2] - a[2]*b[1],
  a[2]*b[0] - a[0]*b[2],
  a[0]*b[1] - a[1]*b[0],
];
const normalize = (a: Vec3): Vec3 => {
  const n = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0]/n, a[1]/n, a[2]/n];
};

export interface PlaneFrame { origin: Vec3; normal: Vec3; u: Vec3; v: Vec3 }

export function planeFrame(p1: Vec3, p2: Vec3, p3: Vec3): PlaneFrame {
  const normal = normalize(cross(sub(p2, p1), sub(p3, p1)));
  const u = normalize(sub(p2, p1));
  const v = normalize(cross(normal, u));
  return { origin: p1, normal, u, v };
}

export function signedDistance(p: Vec3, f: PlaneFrame): number {
  return dot(sub(p, f.origin), f.normal);
}

/** Strict crossing param in (0,1); null if same side or an endpoint lies on the plane. */
export function edgePlaneCrossing(a: Vec3, b: Vec3, f: PlaneFrame, eps = 1e-9): number | null {
  const dA = signedDistance(a, f);
  const dB = signedDistance(b, f);
  if (Math.abs(dA) < eps || Math.abs(dB) < eps) return null;
  if (dA * dB > 0) return null;
  return dA / (dA - dB);
}

/** Unordered, deduped edge index pairs from face rings. */
export function extractEdges(faces: number[][]): Array<[number, number]> {
  const seen = new Set<string>();
  const out: Array<[number, number]> = [];
  for (const face of faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push([a, b]);
    }
  }
  return out;
}

/** Permutation ordering points around their centroid in the plane (u,v) basis. */
export function orderAroundPerimeter(points: Vec3[], f: PlaneFrame): number[] {
  const proj = points.map((p) => {
    const d = sub(p, f.origin);
    return [dot(d, f.u), dot(d, f.v)] as [number, number];
  });
  const cx = proj.reduce((s, p) => s + p[0], 0) / proj.length;
  const cy = proj.reduce((s, p) => s + p[1], 0) / proj.length;
  return points
    .map((_, i) => i)
    .sort(
      (i, j) =>
        Math.atan2(proj[i][1] - cy, proj[i][0] - cx) -
        Math.atan2(proj[j][1] - cy, proj[j][0] - cx),
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/crossSectionGeometry.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/crossSectionGeometry.ts src/stamps/geometry-3d/ai/__tests__/crossSectionGeometry.test.ts
git commit -m "feat(3d-ai): pure cross-section geometry (edges, plane frame, crossing, ordering)"
```

---

## Task 2: `cross-section` intent op + builder

**Files:**
- Modify: `src/stamps/geometry-3d/ai/intent.ts`
- Modify: `src/stamps/geometry-3d/ai/intentTopo3d.ts`
- Modify: `src/stamps/geometry-3d/ai/rules/_shared.ts`
- Create: `src/stamps/geometry-3d/ai/intent-builders/crossSection.ts`
- Modify: `src/stamps/geometry-3d/ai/intent-builders/registry.ts`
- Test: `src/stamps/geometry-3d/ai/__tests__/intentToScene3d.crossSection.test.ts`

**Interfaces:**
- Consumes: `crossSectionGeometry` (Task 1); `addShape3dObj`/`resolveId`/`IntentBuilder3DError` (`intent-builders/_types`); `constraintToWorld`/`planeConstructionWorld` (`core/scene/kinds/constraint3d-math`); `State` (`core/scene`).
- Produces:
  - `intent.ts`: `crossSection3d(spec: { name?: string; plane: string; solid?: string }): Intent3DT`; `CrossSectionIntentZ` added as 6th member of `Intent3DZ`.
  - `intent-builders/crossSection.ts`: `export const buildCrossSection: IntentBuilder3D`.
  - `OP_BUILDERS_3D['cross-section'] = buildCrossSection`.

> **Why these land in ONE task:** adding `CrossSectionIntentZ` to the discriminated union immediately breaks compilation in two compile-enforced spots (`producesOf` switch + `OP_BUILDERS_3D` Record). All coupled edits must commit together to keep the build green.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/intentToScene3d.crossSection.test.ts
import { intentToScene3d } from '../intentToScene3d';
import { solid, addPoint3d, plane3d, crossSection3d } from '../intent';
import { constraintToWorld } from '../../../../core/scene/kinds/constraint3d-math';
import { planeFrame, signedDistance, type Vec3 } from '../crossSectionGeometry';

const pyramid = solid({ flavor:'pyramid', baseLabels:['A','B','C','D'], baseVariant:'square', apex:'S', apexVariant:'regular' });
const tetra   = solid({ flavor:'tetrahedron', baseLabels:['A','B','C'], baseVariant:'equilateral-triangle', apex:'D', apexVariant:'regular' });

function polys(state: any) {
  return Object.values(state.objects).filter((o: any) => o.kind === 'polygon3d') as any[];
}
function world(state: any, id: string): Vec3 {
  return constraintToWorld(state.objects[id].attrs.constraint, state) as Vec3;
}

describe('buildCrossSection', () => {
  it('plane (ABC) coincident with square base → section is the 4 base vertices (reused ids)', () => {
    const st = intentToScene3d([
      pyramid,
      plane3d('mp_ABC', { kind:'threePoints', p1:'A', p2:'B', p3:'C' }),
      crossSection3d({ plane:'mp_ABC' }),
    ]);
    const sec = polys(st);
    expect(sec.length).toBe(1);
    expect(sec[0].attrs.vertices.length).toBe(4);
    // every section vertex is an existing solid vertex (A,B,C,D) — no new point3d for these
    const labels = sec[0].attrs.vertices.map((id: string) => st.objects[id].label).sort();
    expect(labels).toEqual(['A','B','C','D']);
  });

  it('tetra cut by plane through 3 edge-midpoints → triangle of derived intersection points, all coplanar', () => {
    const st = intentToScene3d([
      tetra,
      addPoint3d('P', { kind:'midpoint', p1:'A', p2:'B' }),
      addPoint3d('Q', { kind:'midpoint', p1:'A', p2:'C' }),
      addPoint3d('R', { kind:'midpoint', p1:'A', p2:'D' }),
      plane3d('mp_PQR', { kind:'threePoints', p1:'P', p2:'Q', p3:'R' }),
      crossSection3d({ plane:'mp_PQR' }),
    ]);
    const sec = polys(st);
    expect(sec.length).toBe(1);
    expect(sec[0].attrs.vertices.length).toBe(3);
    // section vertices are derived intersectionLinePlane points (not the named midpoints)
    for (const id of sec[0].attrs.vertices) {
      expect(st.objects[id].attrs.constraint.kind).toBe('intersectionLinePlane');
    }
    // all coplanar with plane PQR
    const f = planeFrame(world(st,'P'), world(st,'Q'), world(st,'R'));
    for (const id of sec[0].attrs.vertices) {
      expect(Math.abs(signedDistance(world(st, id), f))).toBeLessThan(1e-6);
    }
  });

  it('fail-soft: plane that misses the solid → no polygon, no throw, figure still builds', () => {
    const st = intentToScene3d([
      pyramid,
      addPoint3d('U', { kind:'free', x:0,  y:0, z:10 }),
      addPoint3d('V', { kind:'free', x:1,  y:0, z:10 }),
      addPoint3d('W', { kind:'free', x:0,  y:1, z:10 }),
      plane3d('mp_far', { kind:'threePoints', p1:'U', p2:'V', p3:'W' }),
      crossSection3d({ plane:'mp_far' }),
    ]);
    expect(polys(st).length).toBe(0);
    expect(Object.values(st.objects).some((o:any)=>o.kind==='polyhedron3d')).toBe(true);
  });

  it('throws on unknown plane ref', () => {
    expect(() => intentToScene3d([pyramid, crossSection3d({ plane:'nope' })])).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentToScene3d.crossSection.test.ts`
Expected: FAIL — `crossSection3d` not exported / no builder.

- [ ] **Step 3: Write minimal implementation**

In `intent.ts`, add the schema member (place after `Connect3DIntentZ`):

```ts
const CrossSectionIntentZ = z.object({
  op: z.literal('cross-section'),
  name: Label3DZ.optional(),
  plane: Label3DZ,
  solid: Label3DZ.optional(),
});
```

Add it to the union (6th member):

```ts
export const Intent3DZ = z.discriminatedUnion('op', [
  SolidIntentZ, AddPoint3DIntentZ, Plane3DIntentZ, Line3DIntentZ, Connect3DIntentZ, CrossSectionIntentZ,
]);
```

Add the factory helper (next to the others):

```ts
export function crossSection3d(spec: { name?: string; plane: string; solid?: string }): Intent3DT {
  return { op: 'cross-section', ...spec } as Intent3DT;
}
```

In `intentTopo3d.ts`, add the `producesOf` case (inside the existing `switch (i.op)`):

```ts
    case 'cross-section': return i.name ? [i.name] : [];
```

In `rules/_shared.ts`, extend the re-export line:

```ts
export { solid, addPoint3d, plane3d, line3dIntent, connect3d, crossSection3d } from '../intent';
```

Create `intent-builders/crossSection.ts`:

```ts
import type { IntentBuilder3D } from './_types';
import { addShape3dObj, resolveId, IntentBuilder3DError } from './_types';
import type { State } from '../../../../core/scene';
import { constraintToWorld, planeConstructionWorld } from '../../../../core/scene/kinds/constraint3d-math';
import {
  planeFrame, signedDistance, edgePlaneCrossing, extractEdges, orderAroundPerimeter,
  type Vec3,
} from '../crossSectionGeometry';

const ON_PLANE_EPS = 1e-6;

function pointWorld(state: State, id: string): Vec3 {
  return constraintToWorld((state.objects[id].attrs as { constraint: unknown }).constraint as never, state) as Vec3;
}

function planeWorldPoints(state: State, planeId: string): [Vec3, Vec3, Vec3] {
  const pl = state.objects[planeId];
  if (!pl || pl.kind !== 'plane3d') throw new IntentBuilder3DError(`không phải mặt phẳng: ${planeId}`);
  const a = pl.attrs as { p1?: string; p2?: string; p3?: string; construction?: unknown };
  if (a.construction) {
    const w = planeConstructionWorld(a.construction as never, state);
    return [w.p1, w.p2, w.p3];
  }
  return [pointWorld(state, a.p1 as string), pointWorld(state, a.p2 as string), pointWorld(state, a.p3 as string)];
}

function uniqueSolidId(state: State): string {
  const solids = Object.values(state.objects).filter((o) => o.kind === 'polyhedron3d');
  if (solids.length !== 1) throw new IntentBuilder3DError(`cross-section cần đúng 1 khối, có ${solids.length}`);
  return solids[0].id;
}

export const buildCrossSection: IntentBuilder3D = (s, intent) => {
  if (intent.op !== 'cross-section') return;
  const state = s.store.getState();
  const planeId = resolveId(s, intent.plane);
  const solidId = intent.solid ? resolveId(s, intent.solid) : uniqueSolidId(state);

  const [pp1, pp2, pp3] = planeWorldPoints(state, planeId);
  const frame = planeFrame(pp1, pp2, pp3);

  const solid = state.objects[solidId];
  const verts = (solid.attrs as { vertices: string[] }).vertices;
  const faces = (solid.attrs as { faces: number[][] }).faces;

  const sv: Array<{ id: string; world: Vec3 }> = [];
  const seenId = new Set<string>();

  // 1) solid vertices ON the plane → reuse existing id.
  const onPlane = new Set<number>();
  verts.forEach((vid, idx) => {
    const w = pointWorld(state, vid);
    if (Math.abs(signedDistance(w, frame)) < ON_PLANE_EPS) {
      onPlane.add(idx);
      if (!seenId.has(vid)) { seenId.add(vid); sv.push({ id: vid, world: w }); }
    }
  });

  // 2) edges with a strict crossing → a derived intersectionLinePlane point.
  for (const [i, j] of extractEdges(faces)) {
    if (onPlane.has(i) || onPlane.has(j)) continue;
    const aw = pointWorld(state, verts[i]);
    const bw = pointWorld(state, verts[j]);
    const t = edgePlaneCrossing(aw, bw, frame);
    if (t == null) continue;
    const world: Vec3 = [
      aw[0] + t * (bw[0] - aw[0]),
      aw[1] + t * (bw[1] - aw[1]),
      aw[2] + t * (bw[2] - aw[2]),
    ];
    const id = addShape3dObj(
      s, 'point3d', 'p', '',
      { constraint: { kind: 'intersectionLinePlane', a: verts[i], b: verts[j], plane: planeId } },
      true, false,
    );
    sv.push({ id, world });
  }

  // 3) fail-soft: need ≥3 vertices to form a polygon.
  if (sv.length < 3) return;

  // 4) order around perimeter, 5) emit polygon3d.
  const order = orderAroundPerimeter(sv.map((p) => p.world), frame);
  const orderedIds = order.map((idx) => sv[idx].id);
  const label = intent.name ?? '';
  addShape3dObj(s, 'polygon3d', 'poly', label, { vertices: orderedIds, color: '#34d399' }, true, !!intent.name);
};
```

In `intent-builders/registry.ts`, import and register:

```ts
import { buildCrossSection } from './crossSection';
// ... in OP_BUILDERS_3D:
  'cross-section': buildCrossSection,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentToScene3d.crossSection.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Run the existing intent/topo/scene suites to confirm no regression**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/ src/stamps/geometry-3d/ai/rules/__tests__/`
Expected: PASS (all existing 3D tests still green).

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-3d/ai/intent.ts src/stamps/geometry-3d/ai/intentTopo3d.ts src/stamps/geometry-3d/ai/rules/_shared.ts src/stamps/geometry-3d/ai/intent-builders/crossSection.ts src/stamps/geometry-3d/ai/intent-builders/registry.ts src/stamps/geometry-3d/ai/__tests__/intentToScene3d.crossSection.test.ts
git commit -m "feat(3d-ai): cross-section op + buildCrossSection (Option B derived per-vertex)"
```

---

## Task 3: `crossSection` rule — three-point plane + "cắt bởi"

**Files:**
- Create: `src/stamps/geometry-3d/ai/rules/crossSection.ts`
- Modify: `src/stamps/geometry-3d/ai/rules/registry.ts`
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/crossSection.test.ts`

**Interfaces:**
- Consumes: `plane3d`, `crossSection3d` (`./_shared`); `segmentClauses3D` (`../deterministic/coverage3d`) in the test.
- Produces: `export const crossSectionRule: LanguageRule3D` (priority 57); registered in `ALL_RULES_3D`.

- [ ] **Step 1: Write the failing test**

```ts
// rules/__tests__/crossSection.test.ts
import { crossSectionRule } from '../crossSection';
import { segmentClauses3D } from '../../deterministic/coverage3d';

const run = (p: string) => crossSectionRule.match({ problem: p, clauses: segmentClauses3D(p) });

describe('crossSectionRule', () => {
  it('"thiết diện ... (MCD)" → threePoints plane + cross-section', () => {
    const intents = run('Xác định thiết diện của hình chóp S.ABCD cắt bởi mặt phẳng (MCD).').flatMap((m) => m.intents) as any[];
    const plane = intents.find((i) => i.op === 'plane');
    const sec = intents.find((i) => i.op === 'cross-section');
    expect(plane).toMatchObject({ name: 'mp_MCD', spec: { kind: 'threePoints', p1: 'M', p2: 'C', p3: 'D' } });
    expect(sec).toMatchObject({ op: 'cross-section', plane: 'mp_MCD' });
  });

  it('"cắt bởi (IJK)" without the word thiết diện still matches', () => {
    const intents = run('Hình chóp được cắt bởi mặt phẳng (IJK).').flatMap((m) => m.intents) as any[];
    expect(intents.find((i) => i.op === 'cross-section')).toMatchObject({ plane: 'mp_IJK' });
  });

  it('claims the clause it matched', () => {
    const matches = run('Cho hình chóp S.ABCD. Xác định thiết diện cắt bởi (MCD).');
    expect(matches.length).toBe(1);
    expect(matches[0].clauseIds.length).toBe(1);
  });

  it('does not match a clause with no 3-letter plane token', () => {
    expect(run('Tính diện tích thiết diện đó.')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/crossSection.test.ts`
Expected: FAIL — `Cannot find module '../crossSection'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// rules/crossSection.ts
import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { plane3d, crossSection3d } from './_shared';
import type { Intent3DT } from '../intent';

const CUE = /thiết\s+diện|cắt\s+bởi/u;
const TOKEN = /\(([A-Z])([A-Z])([A-Z])\)/u; // first 3-letter plane token in the clause

export const crossSectionRule: LanguageRule3D = {
  id: 'crossSection',
  priority: 57,
  languages: ['vi'],
  patterns: [/thiết\s+diện/u, /cắt\s+bởi/u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      if (!CUE.test(c.text)) continue;
      const m = TOKEN.exec(c.text);
      if (!m) continue;
      const [, a, b, d] = m;
      const planeName = `mp_${a}${b}${d}`;
      const intents: Intent3DT[] = [
        plane3d(planeName, { kind: 'threePoints', p1: a, p2: b, p3: d }),
        crossSection3d({ plane: planeName }),
      ];
      out.push({ ruleId: this.id, clauseIds: [c.id], intents });
    }
    return out;
  },
};
```

In `rules/registry.ts`, import and insert into `RULES` (priority order, after `intersectionLineRule` 58):

```ts
import { crossSectionRule } from './crossSection';
// ... in RULES array:
  crossSectionRule,     // priority 57
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/crossSection.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Run the rules registry-invariants test (rule registered, priorities sane)**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/registry.invariants.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-3d/ai/rules/crossSection.ts src/stamps/geometry-3d/ai/rules/registry.ts src/stamps/geometry-3d/ai/rules/__tests__/crossSection.test.ts
git commit -m "feat(3d-ai): crossSection rule (thiết diện/cắt bởi 3-điểm)"
```

---

## Task 4: `linePlanePoint` rule — "giao điểm MN với (BCD)" (cluster ⑥)

**Files:**
- Create: `src/stamps/geometry-3d/ai/rules/linePlanePoint.ts`
- Modify: `src/stamps/geometry-3d/ai/rules/registry.ts`
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/linePlanePoint.test.ts`

**Interfaces:**
- Consumes: `plane3d`, `addPoint3d` (`./_shared`).
- Produces: `export const linePlanePointRule: LanguageRule3D` (priority 56). Emits a `threePoints` plane + an `add-point-3d` with `intersectionLinePlane`. Point name = captured leading name letter if present, else synth `gp_<A><B>`.

- [ ] **Step 1: Write the failing test**

```ts
// rules/__tests__/linePlanePoint.test.ts
import { linePlanePointRule } from '../linePlanePoint';
import { segmentClauses3D } from '../../deterministic/coverage3d';

const run = (p: string) => linePlanePointRule.match({ problem: p, clauses: segmentClauses3D(p) });

describe('linePlanePointRule', () => {
  it('"giao điểm I của MN với (BCD)" → named intersectionLinePlane point + plane', () => {
    const intents = run('Tìm giao điểm I của MN với (BCD).').flatMap((m) => m.intents) as any[];
    const pt = intents.find((i) => i.op === 'add-point-3d');
    expect(pt).toMatchObject({ name: 'I', constraint: { kind: 'intersectionLinePlane', a: 'M', b: 'N', plane: 'mp_BCD' } });
    expect(intents.find((i) => i.op === 'plane')).toMatchObject({ name: 'mp_BCD', spec: { kind: 'threePoints', p1: 'B', p2: 'C', p3: 'D' } });
  });

  it('unnamed "giao điểm của MN với (BCD)" → synth name gp_MN', () => {
    const pt = run('giao điểm của MN với (BCD)').flatMap((m) => m.intents).find((i: any) => i.op === 'add-point-3d') as any;
    expect(pt.name).toBe('gp_MN');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/linePlanePoint.test.ts`
Expected: FAIL — `Cannot find module '../linePlanePoint'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// rules/linePlanePoint.ts
import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { plane3d, addPoint3d } from './_shared';
import type { Intent3DT } from '../intent';

// "giao điểm [I] [của] MN với|và (BCD)"
const RE = /giao\s+điểm\s+(?:([A-Z])\s+)?(?:của\s+)?([A-Z])([A-Z])\s*(?:với|và)\s*\(([A-Z])([A-Z])([A-Z])\)/u;

export const linePlanePointRule: LanguageRule3D = {
  id: 'linePlanePoint',
  priority: 56,
  languages: ['vi'],
  patterns: [/giao\s+điểm/u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      const m = RE.exec(c.text);
      if (!m) continue;
      const [, named, a, b, x, y, z] = m;
      const planeName = `mp_${x}${y}${z}`;
      const name = named ?? `gp_${a}${b}`;
      const intents: Intent3DT[] = [
        plane3d(planeName, { kind: 'threePoints', p1: x, p2: y, p3: z }),
        addPoint3d(name, { kind: 'intersectionLinePlane', a, b, plane: planeName }),
      ];
      out.push({ ruleId: this.id, clauseIds: [c.id], intents });
    }
    return out;
  },
};
```

In `rules/registry.ts`, import and insert into `RULES` (after `crossSectionRule`):

```ts
import { linePlanePointRule } from './linePlanePoint';
// ... in RULES array:
  linePlanePointRule,   // priority 56
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/linePlanePoint.test.ts`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-3d/ai/rules/linePlanePoint.ts src/stamps/geometry-3d/ai/rules/registry.ts src/stamps/geometry-3d/ai/rules/__tests__/linePlanePoint.test.ts
git commit -m "feat(3d-ai): linePlanePoint rule (giao điểm đường∩mặt)"
```

---

## Task 5: `crossSectionParallel` rule — "thiết diện ... qua M song song (SBC)" (cluster ③)

**Files:**
- Create: `src/stamps/geometry-3d/ai/rules/crossSectionParallel.ts`
- Modify: `src/stamps/geometry-3d/ai/rules/registry.ts`
- Test: `src/stamps/geometry-3d/ai/rules/__tests__/crossSectionParallel.test.ts`

**Interfaces:**
- Consumes: `plane3d`, `crossSection3d` (`./_shared`).
- Produces: `export const crossSectionParallelRule: LanguageRule3D` (priority 58). Scoped to SINGLE-clause phrasing that contains BOTH a section cue and "qua <P> song song (<XYZ>)". Emits: ref plane (`threePoints`), parallel plane (`parallelThrough`), `cross-section`.

> **Scope note:** handles "qua <point> song song với (<plane>)" only. The line-parallel-line variant ("chứa MN song song CD") and cross-clause named planes ("(α) qua M song song (SBC). … thiết diện cắt bởi (α)") are DEFERRED (spec §6/§11). The synthesized parallel-plane name is ASCII (`mp_par_<P>`) because `Label3DZ` forbids Greek letters like α.

- [ ] **Step 1: Write the failing test**

```ts
// rules/__tests__/crossSectionParallel.test.ts
import { crossSectionParallelRule } from '../crossSectionParallel';
import { segmentClauses3D } from '../../deterministic/coverage3d';

const run = (p: string) => crossSectionParallelRule.match({ problem: p, clauses: segmentClauses3D(p) });

describe('crossSectionParallelRule', () => {
  it('"thiết diện ... qua M song song (SBC)" → ref plane + parallel plane + cross-section', () => {
    const intents = run('Xác định thiết diện của hình chóp với mặt phẳng qua M song song với (SBC).').flatMap((m) => m.intents) as any[];
    const ref = intents.find((i) => i.op === 'plane' && i.spec.kind === 'threePoints');
    const par = intents.find((i) => i.op === 'plane' && i.spec.kind === 'parallelThrough');
    const sec = intents.find((i) => i.op === 'cross-section');
    expect(ref).toMatchObject({ name: 'mp_SBC', spec: { kind: 'threePoints', p1: 'S', p2: 'B', p3: 'C' } });
    expect(par).toMatchObject({ name: 'mp_par_M', spec: { kind: 'parallelThrough', point: 'M', refPlane: 'mp_SBC' } });
    expect(sec).toMatchObject({ op: 'cross-section', plane: 'mp_par_M' });
  });

  it('does not fire without a section cue', () => {
    expect(run('Đường thẳng qua M song song với (SBC).')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/crossSectionParallel.test.ts`
Expected: FAIL — `Cannot find module '../crossSectionParallel'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// rules/crossSectionParallel.ts
import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { plane3d, crossSection3d } from './_shared';
import type { Intent3DT } from '../intent';

const CUE = /thiết\s+diện|cắt\s+bởi/u;
// "qua M [và] song song [với] (SBC)"
const RE = /qua\s+([A-Z])\s*(?:và\s+)?song\s+song\s+(?:với\s+)?\(([A-Z])([A-Z])([A-Z])\)/u;

export const crossSectionParallelRule: LanguageRule3D = {
  id: 'crossSectionParallel',
  priority: 58,
  languages: ['vi'],
  patterns: [/song\s+song/u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      if (!CUE.test(c.text)) continue;
      const m = RE.exec(c.text);
      if (!m) continue;
      const [, p, x, y, z] = m;
      const refName = `mp_${x}${y}${z}`;
      const parName = `mp_par_${p}`;
      const intents: Intent3DT[] = [
        plane3d(refName, { kind: 'threePoints', p1: x, p2: y, p3: z }),
        plane3d(parName, { kind: 'parallelThrough', point: p, refPlane: refName }),
        crossSection3d({ plane: parName }),
      ];
      out.push({ ruleId: this.id, clauseIds: [c.id], intents });
    }
    return out;
  },
};
```

In `rules/registry.ts`, import and insert into `RULES` (priority 58, next to `intersectionLineRule`):

```ts
import { crossSectionParallelRule } from './crossSectionParallel';
// ... in RULES array:
  crossSectionParallelRule, // priority 58
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/crossSectionParallel.test.ts`
Expected: PASS (2).

- [ ] **Step 5: End-to-end numeric check (rule → scene) — add to the same test file**

```ts
// append to crossSectionParallel.test.ts
import { intentToScene3d } from '../../intentToScene3d';
import { solid, addPoint3d } from '../../intent';

it('parallel-plane section builds a polygon coplanar with the parallel plane', () => {
  const base = solid({ flavor:'pyramid', baseLabels:['A','B','C','D'], baseVariant:'square', apex:'S', apexVariant:'regular' });
  const M = addPoint3d('M', { kind:'midpoint', p1:'S', p2:'A' });
  const ruleIntents = run('Thiết diện qua M song song với (SBC).').flatMap((m) => m.intents);
  const st = intentToScene3d([base, M, ...ruleIntents]);
  const poly = Object.values(st.objects).find((o: any) => o.kind === 'polygon3d') as any;
  expect(poly).toBeTruthy();
  expect(poly.attrs.vertices.length).toBeGreaterThanOrEqual(3);
});
```

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/rules/__tests__/crossSectionParallel.test.ts`
Expected: PASS (3).

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-3d/ai/rules/crossSectionParallel.ts src/stamps/geometry-3d/ai/rules/registry.ts src/stamps/geometry-3d/ai/rules/__tests__/crossSectionParallel.test.ts
git commit -m "feat(3d-ai): crossSectionParallel rule (thiết diện qua điểm song song mặt)"
```

---

## Task 6: `verify3d` cross-section checks

**Files:**
- Modify: `src/stamps/geometry-3d/ai/verify3d.ts`
- Test: `src/stamps/geometry-3d/ai/__tests__/verify3d.crossSection.test.ts`

**Interfaces:**
- Consumes: `crossSectionGeometry` (`./crossSectionGeometry`), `constraintToWorld`/`planeConstructionWorld` (`../../../core/scene/kinds/constraint3d-math`).
- Produces: extends `verifyFigure3d` — (a) every `intersectionLinePlane` point lies on its plane and has param `t∈[0,1]`; (b) every `polygon3d` has ≥3 vertices and is planar.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/verify3d.crossSection.test.ts
import { verifyFigure3d } from '../verify3d';
import { intentToScene3d } from '../intentToScene3d';
import { solid, addPoint3d, plane3d, crossSection3d } from '../intent';

it('a valid tetra section passes verify', () => {
  const st = intentToScene3d([
    solid({ flavor:'tetrahedron', baseLabels:['A','B','C'], baseVariant:'equilateral-triangle', apex:'D', apexVariant:'regular' }),
    addPoint3d('P', { kind:'midpoint', p1:'A', p2:'B' }),
    addPoint3d('Q', { kind:'midpoint', p1:'A', p2:'C' }),
    addPoint3d('R', { kind:'midpoint', p1:'A', p2:'D' }),
    plane3d('mp_PQR', { kind:'threePoints', p1:'P', p2:'Q', p3:'R' }),
    crossSection3d({ plane:'mp_PQR' }),
  ]);
  expect(verifyFigure3d(st).ok).toBe(true);
});

it('flags an intersectionLinePlane point fabricated off its plane', () => {
  // hand-build a bad state: an intersectionLinePlane point whose edge does not cross the plane.
  const st = intentToScene3d([
    solid({ flavor:'tetrahedron', baseLabels:['A','B','C'], baseVariant:'equilateral-triangle', apex:'D', apexVariant:'regular' }),
    plane3d('mp_ABC', { kind:'threePoints', p1:'A', p2:'B', p3:'C' }),
    // edge A-B lies IN plane ABC → t degenerate; use D-A which crosses, this should be fine,
    // so instead force an off-edge by referencing a non-crossing same-side pair handled below.
    addPoint3d('Z', { kind:'intersectionLinePlane', a:'A', b:'B', plane:'mp_ABC' }),
  ]);
  // A,B are both ON plane ABC → t = 0/0 → non-finite OR off-plane; verify must flag it.
  expect(verifyFigure3d(st).ok).toBe(false);
});
```

> Implementer note: the second test relies on the new check catching a degenerate/off-plane `intersectionLinePlane`. If `constraintToWorld` returns a finite on-plane point for the A,B∈plane case (it may return `A`), the on-edge/t check still flags it because `t = dA/(dA−dB)` with `dA≈dB≈0` is non-finite → push an issue when `t` is not finite or out of `[0,1]`. Ensure the implementation treats non-finite `t` as a failure.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/verify3d.crossSection.test.ts`
Expected: FAIL — the second assertion (`ok` is currently `true` because base `verifyFigure3d` doesn't check intersectionLinePlane).

- [ ] **Step 3: Write minimal implementation**

Add imports at the top of `verify3d.ts`:

```ts
import { planeFrame, signedDistance, type Vec3 } from './crossSectionGeometry';
import { planeConstructionWorld } from '../../../core/scene/kinds/constraint3d-math';
```

Add two helpers near the top of the file (after imports):

```ts
function ptWorld(state: State, id: string): Vec3 {
  return constraintToWorld((state.objects[id].attrs as any).constraint, state) as Vec3;
}
function planeWorld3(state: State, planeId: string): [Vec3, Vec3, Vec3] {
  const a = (state.objects[planeId].attrs as any);
  if (a.construction) { const w = planeConstructionWorld(a.construction, state); return [w.p1, w.p2, w.p3]; }
  return [ptWorld(state, a.p1), ptWorld(state, a.p2), ptWorld(state, a.p3)];
}
```

Inside the `point3d` loop, AFTER the existing midpoint block, add:

```ts
    if (c.kind === 'intersectionLinePlane') {
      try {
        const [q1, q2, q3] = planeWorld3(state, c.plane);
        const f = planeFrame(q1, q2, q3);
        if (Math.abs(signedDistance(w, f)) > 1e-6) {
          issues.push(`${obj.label || obj.id}: giao điểm không nằm trên mặt`);
        }
        const dA = signedDistance(ptWorld(state, c.a), f);
        const dB = signedDistance(ptWorld(state, c.b), f);
        const t = dA / (dA - dB);
        if (!Number.isFinite(t) || t < -1e-6 || t > 1 + 1e-6) {
          issues.push(`${obj.label || obj.id}: giao điểm ngoài cạnh (t=${t})`);
        }
      } catch (e) {
        issues.push(`${obj.label || obj.id}: intersectionLinePlane check lỗi — ${(e as Error).message}`);
      }
    }
```

After the `for (const obj of Object.values(state.objects))` point loop closes (before `return`), add a polygon planarity loop:

```ts
  for (const obj of Object.values(state.objects)) {
    if (obj.kind !== 'polygon3d') continue;
    const vids = (obj.attrs as any).vertices as string[];
    if (!vids || vids.length < 3) { issues.push(`${obj.label || obj.id}: đa giác < 3 đỉnh`); continue; }
    try {
      const ws = vids.map((id) => ptWorld(state, id));
      const f = planeFrame(ws[0], ws[1], ws[2]);
      for (const wv of ws) {
        if (Math.abs(signedDistance(wv, f)) > 1e-5) { issues.push(`${obj.label || obj.id}: đa giác không phẳng`); break; }
      }
    } catch (e) {
      issues.push(`${obj.label || obj.id}: polygon check lỗi — ${(e as Error).message}`);
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/verify3d.crossSection.test.ts`
Expected: PASS (2).

- [ ] **Step 5: Run the existing verify + scene tests for 0-regression**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/`
Expected: PASS (all).

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-3d/ai/verify3d.ts src/stamps/geometry-3d/ai/__tests__/verify3d.crossSection.test.ts
git commit -m "feat(3d-ai): verify3d cross-section checks (on-plane, on-edge, planar polygon)"
```

---

## Task 7: `Intent3DZ.parse` hygiene gate

**Files:**
- Modify: `src/stamps/geometry-3d/ai/intentToScene3d.ts`
- Test: `src/stamps/geometry-3d/ai/__tests__/intentToScene3d.parse.test.ts`

**Interfaces:**
- Consumes: `Intent3DZ` (`./intent`).
- Produces: `intentToScene3d` validates each intent via `Intent3DZ.parse` before ordering/building. Behavior for valid (rule-emitted) intents is unchanged.

> **Risk + gate:** Zod `.parse` strips unknown keys and rejects malformed intents. All current builders read only schema-declared fields (verified: solid/add-point/plane/line/connect/cross-section). This task is LAST and MUST be followed by a full `diag-all-3d` + full jest run. **If `diag-all-3d` shows ANY regression (FULL drops / NONE rises), revert this commit** — it is optional hygiene, not a Phase-2 deliverable.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/intentToScene3d.parse.test.ts
import { intentToScene3d } from '../intentToScene3d';
import { solid } from '../intent';

it('rejects a structurally invalid intent', () => {
  // missing required field for the op → Intent3DZ.parse must throw
  expect(() => intentToScene3d([{ op: 'cross-section' } as any])).toThrow();
});

it('still builds a valid figure unchanged', () => {
  const st = intentToScene3d([
    solid({ flavor:'pyramid', baseLabels:['A','B','C','D'], baseVariant:'square', apex:'S', apexVariant:'regular' }),
  ]);
  expect(Object.values(st.objects).filter((o:any)=>o.kind==='point3d').length).toBe(5);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentToScene3d.parse.test.ts`
Expected: FAIL — the first assertion (no parse yet → `cross-section` with missing `plane` reaches the builder and throws a DIFFERENT/no error path; confirm it currently does NOT throw a Zod error). If it already throws for another reason, make the test assert the Zod path by also passing `{op:'plane'}` (missing name+spec) which the builder would read as undefined.

- [ ] **Step 3: Write minimal implementation**

In `intentToScene3d.ts`, import `Intent3DZ` and parse before ordering:

```ts
import { Intent3DZ } from './intent';
// ...
export function intentToScene3d(intents: readonly Intent3DT[]): State {
  const store = createStore(createEmptyState('3d'));
  const s: BuildState3D = { store, nameToId: new Map() };
  const parsed = intents.map((i) => Intent3DZ.parse(i));
  for (const intent of orderIntents3dByDependency(parsed)) {
    const builder = OP_BUILDERS_3D[intent.op];
    if (!builder) throw new IntentBuilder3DError(`không có builder cho op=${intent.op}`, intent);
    builder(s, intent);
  }
  // ... existing meta.view return unchanged
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c jest.worktree.config.js src/stamps/geometry-3d/ai/__tests__/intentToScene3d.parse.test.ts`
Expected: PASS (2).

- [ ] **Step 5: Full 3D suite + diag-all-3d regression gate**

```bash
npx jest -c jest.worktree.config.js src/stamps/geometry-3d/
npx tsx scripts/diag-all-3d.ts
```
Expected: all jest PASS; `diag-all-3d` TOTAL FULL ≥ 149 and NONE ≤ 138 (0-regression). If regression → `git revert` this task's commit and note the offending schema gap.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-3d/ai/intentToScene3d.ts src/stamps/geometry-3d/ai/__tests__/intentToScene3d.parse.test.ts
git commit -m "feat(3d-ai): Intent3DZ.parse hygiene gate ở biên intentToScene3d"
```

---

## Task 8: Playwright render-verify + phase verification (diag-all-3d before/after)

**Files:**
- Modify: `tests/e2e/geometry-3d-figure.spec.ts`
- (No source change — verification + metric capture.)

**Interfaces:**
- Consumes: the full pipeline via the editor's `ai-generate-3d-input` / `ai-generate-3d-btn` controls (existing test ids).
- Produces: an e2e test that a thiết-diện problem renders a section `polygon3d` with no `plane3d` render error; a recorded before/after FULL/PARTIAL/NONE.

- [ ] **Step 1: Add the failing e2e test**

Append a new `test(...)` to `tests/e2e/geometry-3d-figure.spec.ts`, mirroring the existing mount/generate/assert structure:

```ts
test('renders a cross-section polygon for a thiết diện problem', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/');
  await page.getByTestId('stamp-toolbar-geometry3d').click();
  await page.getByTestId('mini-board-3d').waitFor({ state: 'visible' });
  await page.waitForFunction(() => !!(window as any).JXG?.boards);

  await page.getByTestId('ai-generate-3d-input').fill(
    'Cho hình chóp S.ABCD có đáy là hình vuông. Gọi M là trung điểm của SA. ' +
    'Xác định thiết diện của hình chóp cắt bởi mặt phẳng (MBD).',
  );
  await page.getByTestId('ai-generate-3d-btn').click();

  // pyramid = 5 face polygons; the section adds ≥1 → expect ≥6 polygon3d.
  await page.waitForFunction(() => {
    const JXG = (window as any).JXG;
    if (!JXG?.boards) return false;
    for (const b of Object.values(JXG.boards) as any[]) {
      const polys = Object.values(b.objects).filter((o: any) => o.elType === 'polygon3d');
      if (polys.length >= 6) return true;
    }
    return false;
  }, undefined, { timeout: 8_000 });

  expect(errors.join('\n')).not.toMatch(/plane3d|Cannot read|undefined is not/i);
});
```

- [ ] **Step 2: Run the e2e to verify it passes**

Run: `npx playwright test tests/e2e/geometry-3d-figure.spec.ts -g "cross-section"`
Expected: PASS. (If the dev server is stale, start vite from THIS worktree on a private port — see memory `feedback_verify_worktree_stale_server`.)

- [ ] **Step 3: Capture the diag-all-3d before/after**

```bash
npx tsx scripts/diag-all-3d.ts
```
Record the printed `ss-thietdien` / TOTAL FULL/PARTIAL/NONE. Compare to baseline (ss-thietdien 30/176/35; TOTAL 149/411/138). **Gate: 0-regression** — FULL must not drop, NONE must not rise on any dataset. FULL gains are bonus; the primary deliverable is that sections actually render (proven by Tasks 2/6 numeric tests + this e2e).

- [ ] **Step 4: Spot-check real dataset problems**

```bash
npx tsx scripts/dbg-bai-3d.ts ss-thietdien <id>   # pick 2–3 ids that contain "thiết diện ... (XYZ)"
```
Confirm the produced state contains a `polygon3d` (the section). Note any clusters still escalating for a follow-up.

- [ ] **Step 5: Full project regression run**

Run: `npx jest -c jest.worktree.config.js`
Expected: full suite green (≈3359+ tests), 0 regression.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/geometry-3d-figure.spec.ts
git commit -m "test(3d): e2e render-verify thiết diện + phase-2 verification gate"
```

---

## Self-Review

**1. Spec coverage** (spec `2026-06-21-3d-cross-section-design.md`):
- §3 algorithm → Task 1 (pure math) + Task 2 (builder). ✓
- §4 intent op → Task 2. ✓
- §5 builder → Task 2. ✓
- §6 rules: cluster ①④ → Task 3; ⑥ → Task 4; ③ → Task 5; ⑦ explicitly DEFERRED (Task 5 scope note). ✓
- §7 verify + Playwright → Task 6 (numeric) + Task 8 (e2e). ✓
- §8 Intent3DZ.parse → Task 7. ✓
- §9 insertion points (7 sites) → Tasks 2/3/4/5/6/7 cover all. ✓
- §11 fail-soft / convex-only / line-∥-line defer → Task 2 (fail-soft) + Task 5 (defer). ✓

**2. Placeholder scan:** no TBD/TODO; every code step has full code; commands have expected output. The Task 6 Step-1 second test and Task 7 Step-2 carry implementer notes (not placeholders) clarifying the assertion's mechanism. ✓

**3. Type consistency:** `crossSection3d({plane, solid?, name?})` used identically in Tasks 2/3/5. `planeFrame/signedDistance/edgePlaneCrossing/extractEdges/orderAroundPerimeter` signatures match between Task 1 (definition) and Tasks 2/6 (use). `addShape3dObj(...,visible,registerInNameMap)` arg order matches the verified signature. Plane naming `mp_XYZ` consistent across rules + dedup. `intersectionLinePlane{a,b,plane}` field names consistent in builder (Task 2), rule (Task 4), and verify (Task 6). ✓

## Notes for the executor

- Run each task's tests from THIS worktree: `npx jest -c jest.worktree.config.js <path>`.
- After Tasks 2–6, the section should already render in the editor; Task 7 is optional hygiene (revert on any regression); Task 8 is the phase gate.
- Honest metric framing: because `planeNamed` already claims `(XYZ)`/`thiết diện` clauses and draws the cutting plane, many section problems are already counted FULL without a drawn section. Phase 2's real win is the section **being drawn correctly** (numeric + e2e verified) with strict 0-regression — not a headline FULL jump.
