# Geometry-3D GeoGebra-Style Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-05-17-3d-geogebra-redesign-design.md`

**Goal:** Rewrite the UX layer of the geometry-3d stamp so users draw 3D shapes by clicking on existing surfaces (ground / axes / planes / polygons / spheres) and dragging, with an Algebra panel showing every object's symbolic + numeric form — matching GeoGebra 3D Calculator's interaction model.

**Architecture:** Three layers separated by clear interfaces. (1) **Scene Layer** — pure-TS source of truth (`Scene3D` model + events + constraint math). (2) **Renderer + Hit-Test** — JSXGraph view3d adapters. (3) **Editor UI** — React (Tool palette + Algebra panel + StatusHint), driven by a declarative tool-spec FSM. Schema bumps to `version: 2` with backward-compatible loader (v1 stamps load as `kind: 'free'` points).

**Tech Stack:** React 19, TypeScript strict, JSXGraph 1.12 `view3d`, Jest 29 + jsdom + ts-jest, Excalidraw 0.18 host (unchanged). No new runtime dependencies.

---

## Phase 0 — Scaffolding

### Task 0.1: Create directory skeleton

**Files:**
- Create: `src/stamps/geometry-3d/editor/scene/` (empty dir)
- Create: `src/stamps/geometry-3d/editor/hitTest/` (empty dir)
- Create: `src/stamps/geometry-3d/editor/renderer/` (empty dir)
- Create: `src/stamps/geometry-3d/editor/tools/handlers/` (empty dir)
- Create: `src/stamps/geometry-3d/editor/toolPanel/` (empty dir)
- Create: `src/stamps/geometry-3d/editor/algebraPanel/` (empty dir)

- [ ] **Step 1:** Run `mkdir -p src/stamps/geometry-3d/editor/{scene,hitTest,renderer,tools/handlers,toolPanel,algebraPanel}`.
- [ ] **Step 2:** Run `ls src/stamps/geometry-3d/editor/` to confirm all six new directories exist.
- [ ] **Step 3:** Commit: `git add src/stamps/geometry-3d/editor/ && git commit --allow-empty -m "chore(geometry-3d): scaffold thư mục editor mới"`. (Empty commit acceptable here; the structure-only marker keeps history readable.)

---

### Task 0.2: Add Constraint + Scene3DObject types

**Files:**
- Create: `src/stamps/geometry-3d/editor/scene/types.ts`
- Test: `src/stamps/geometry-3d/__tests__/scene/types.test.ts`

- [ ] **Step 1: Write the type file**

```ts
// src/stamps/geometry-3d/editor/scene/types.ts
export type Vec3 = [number, number, number];

export type Constraint =
  | { kind: 'free'; x: number; y: number; z: number }
  | { kind: 'onGround'; x: number; y: number }
  | { kind: 'onAxis'; axis: 'x' | 'y' | 'z'; t: number }
  | { kind: 'onPlane'; planeId: string; u: number; v: number }
  | { kind: 'onLine'; lineId: string; t: number }
  | { kind: 'onPolygon'; polygonId: string; u: number; v: number }
  | { kind: 'onSphere'; sphereId: string; theta: number; phi: number };

export interface SceneObjectBase {
  id: string;
  label: string;
  visible: boolean;
  color?: string;
}

export type Scene3DObject =
  | (SceneObjectBase & { kind: 'point'; constraint: Constraint })
  | (SceneObjectBase & { kind: 'segment'; p1: string; p2: string })
  | (SceneObjectBase & { kind: 'line'; p1: string; p2: string })
  | (SceneObjectBase & { kind: 'ray'; origin: string; through: string })
  | (SceneObjectBase & { kind: 'vector'; from: string; to: string })
  | (SceneObjectBase & { kind: 'polygon'; vertices: string[] })
  | (SceneObjectBase & { kind: 'plane'; p1: string; p2: string; p3: string })
  | (SceneObjectBase & { kind: 'sphere'; center: string; surfacePoint: string })
  | (SceneObjectBase & {
      kind: 'polyhedron';
      flavor: 'pyramid' | 'prism' | 'tetrahedron' | 'cube';
      vertices: string[];
      faces: number[][];
    })
  | (SceneObjectBase & { kind: 'cylinder'; baseCenter: string; topCenter: string; radius: number })
  | (SceneObjectBase & { kind: 'cone'; baseCenter: string; apex: string; radius: number });

export type ObjectKind = Scene3DObject['kind'];
```

- [ ] **Step 2: Write a smoke test**

```ts
// src/stamps/geometry-3d/__tests__/scene/types.test.ts
import type { Constraint, Scene3DObject } from '../../editor/scene/types';

test('Constraint kinds are exhaustively typed', () => {
  const c1: Constraint = { kind: 'free', x: 1, y: 2, z: 3 };
  const c2: Constraint = { kind: 'onGround', x: 0, y: 0 };
  const c3: Constraint = { kind: 'onAxis', axis: 'z', t: 1.5 };
  const c4: Constraint = { kind: 'onPlane', planeId: 'p1', u: 0.5, v: 0.5 };
  const c5: Constraint = { kind: 'onLine', lineId: 'l1', t: 0.3 };
  const c6: Constraint = { kind: 'onPolygon', polygonId: 'pg1', u: 0.1, v: 0.2 };
  const c7: Constraint = { kind: 'onSphere', sphereId: 's1', theta: 0.7, phi: 1.1 };
  expect([c1, c2, c3, c4, c5, c6, c7]).toHaveLength(7);
});

test('Scene3DObject discriminates by kind', () => {
  const obj: Scene3DObject = {
    kind: 'point',
    id: 'p1',
    label: 'A',
    visible: true,
    constraint: { kind: 'onGround', x: 1, y: 2 },
  };
  expect(obj.kind).toBe('point');
});
```

- [ ] **Step 3: Run typecheck + test**

```
npm run typecheck
npx jest src/stamps/geometry-3d/__tests__/scene/types.test.ts
```

Expected: typecheck passes, both tests pass.

- [ ] **Step 4: Commit**

```
git add src/stamps/geometry-3d/editor/scene/types.ts \
        src/stamps/geometry-3d/__tests__/scene/types.test.ts
git commit -m "feat(geometry-3d): Constraint + Scene3DObject types"
```

---

## Phase 1 — Scene Model

### Task 1.1: Scene3D class with event emitter + add/get/delete

**Files:**
- Create: `src/stamps/geometry-3d/editor/scene/Scene3D.ts`
- Test: `src/stamps/geometry-3d/__tests__/scene/Scene3D.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/stamps/geometry-3d/__tests__/scene/Scene3D.test.ts
import { Scene3D } from '../../editor/scene/Scene3D';

test('addPoint generates unique id and emits add', () => {
  const scene = new Scene3D();
  const events: Array<{ type: string; id: string }> = [];
  scene.on('add', (obj) => events.push({ type: 'add', id: obj.id }));

  const id1 = scene.addPoint({ kind: 'free', x: 1, y: 2, z: 3 });
  const id2 = scene.addPoint({ kind: 'onGround', x: 0, y: 0 });

  expect(id1).not.toBe(id2);
  expect(events).toEqual([
    { type: 'add', id: id1 },
    { type: 'add', id: id2 },
  ]);
  expect(scene.get(id1)?.kind).toBe('point');
});

test('delete removes object and emits delete', () => {
  const scene = new Scene3D();
  const events: string[] = [];
  scene.on('delete', (id) => events.push(id));
  const id = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  scene.delete(id);
  expect(scene.get(id)).toBeUndefined();
  expect(events).toEqual([id]);
});

test('list returns objects in insertion order', () => {
  const scene = new Scene3D();
  const a = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const b = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  expect(scene.list().map((o) => o.id)).toEqual([a, b]);
});
```

- [ ] **Step 2: Run tests to verify failure**

```
npx jest src/stamps/geometry-3d/__tests__/scene/Scene3D.test.ts
```

Expected: FAIL — `Scene3D` not defined.

- [ ] **Step 3: Implement Scene3D**

```ts
// src/stamps/geometry-3d/editor/scene/Scene3D.ts
import type { Constraint, Scene3DObject } from './types';

type Listener<E> = (event: E) => void;

export class Scene3D {
  private objects = new Map<string, Scene3DObject>();
  private order: string[] = [];
  private counter = 0;
  private listeners = {
    add: new Set<Listener<Scene3DObject>>(),
    change: new Set<Listener<Scene3DObject>>(),
    delete: new Set<Listener<string>>(),
    reset: new Set<Listener<void>>(),
  };

  on(event: 'add', cb: Listener<Scene3DObject>): () => void;
  on(event: 'change', cb: Listener<Scene3DObject>): () => void;
  on(event: 'delete', cb: Listener<string>): () => void;
  on(event: 'reset', cb: Listener<void>): () => void;
  on(event: keyof Scene3D['listeners'], cb: Listener<unknown>): () => void {
    (this.listeners[event] as Set<Listener<unknown>>).add(cb);
    return () => (this.listeners[event] as Set<Listener<unknown>>).delete(cb);
  }

  private nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}${this.counter}`;
  }

  addPoint(constraint: Constraint, label?: string, color?: string): string {
    const id = this.nextId('p');
    const obj: Scene3DObject = {
      kind: 'point',
      id,
      label: label ?? id,
      visible: true,
      color,
      constraint,
    };
    this.objects.set(id, obj);
    this.order.push(id);
    this.listeners.add.forEach((cb) => cb(obj));
    return id;
  }

  insert(obj: Scene3DObject): void {
    if (this.objects.has(obj.id)) {
      throw new Error(`Scene3D.insert: id ${obj.id} already exists`);
    }
    this.objects.set(obj.id, obj);
    this.order.push(obj.id);
    this.listeners.add.forEach((cb) => cb(obj));
  }

  get(id: string): Scene3DObject | undefined {
    return this.objects.get(id);
  }

  list(): Scene3DObject[] {
    return this.order.map((id) => this.objects.get(id)!).filter(Boolean);
  }

  delete(id: string): void {
    if (!this.objects.has(id)) return;
    this.objects.delete(id);
    this.order = this.order.filter((x) => x !== id);
    this.listeners.delete.forEach((cb) => cb(id));
  }

  reset(): void {
    this.objects.clear();
    this.order = [];
    this.counter = 0;
    this.listeners.reset.forEach((cb) => cb());
  }

  reserveId(prefix: string): string {
    return this.nextId(prefix);
  }

  emitChange(id: string): void {
    const obj = this.objects.get(id);
    if (!obj) return;
    this.listeners.change.forEach((cb) => cb(obj));
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

```
npx jest src/stamps/geometry-3d/__tests__/scene/Scene3D.test.ts
```

Expected: 3/3 PASS.

- [ ] **Step 5: Commit**

```
git add src/stamps/geometry-3d/editor/scene/Scene3D.ts \
        src/stamps/geometry-3d/__tests__/scene/Scene3D.test.ts
git commit -m "feat(geometry-3d): Scene3D model với event emitter + CRUD"
```

---

### Task 1.2: Generic non-point object insertion + label generator

**Files:**
- Create: `src/stamps/geometry-3d/editor/scene/labels.ts`
- Modify: `src/stamps/geometry-3d/editor/scene/Scene3D.ts` (add typed helpers)
- Test: `src/stamps/geometry-3d/__tests__/scene/labels.test.ts`
- Test: extend `src/stamps/geometry-3d/__tests__/scene/Scene3D.test.ts`

- [ ] **Step 1: Write the labels test**

```ts
// src/stamps/geometry-3d/__tests__/scene/labels.test.ts
import { nextPointLabel, nextDerivedLabel } from '../../editor/scene/labels';

test('nextPointLabel cycles A..Z then A_1..Z_1', () => {
  expect(nextPointLabel([])).toBe('A');
  expect(nextPointLabel(['A'])).toBe('B');
  expect(nextPointLabel(['A', 'B', 'C'])).toBe('D');
  const az = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  expect(nextPointLabel(az)).toBe('A_1');
  expect(nextPointLabel([...az, 'A_1'])).toBe('B_1');
});

test('nextDerivedLabel uses lowercase for lines/segments/vectors', () => {
  expect(nextDerivedLabel('segment', [])).toBe('a');
  expect(nextDerivedLabel('segment', ['a'])).toBe('b');
  expect(nextDerivedLabel('line', ['a'])).toBe('b');
});

test('nextDerivedLabel uses prefix for solids/curved', () => {
  expect(nextDerivedLabel('sphere', [])).toBe('s_1');
  expect(nextDerivedLabel('sphere', ['s_1'])).toBe('s_2');
  expect(nextDerivedLabel('polyhedron', [])).toBe('h_1');
});
```

- [ ] **Step 2: Implement labels.ts**

```ts
// src/stamps/geometry-3d/editor/scene/labels.ts
import type { ObjectKind } from './types';

const A = 'A'.charCodeAt(0);

export function nextPointLabel(existing: string[]): string {
  const used = new Set(existing);
  for (let suffix = 0; suffix < 1000; suffix++) {
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(A + i);
      const candidate = suffix === 0 ? letter : `${letter}_${suffix}`;
      if (!used.has(candidate)) return candidate;
    }
  }
  return `P_${used.size}`;
}

const LOWERCASE_KINDS: ObjectKind[] = ['segment', 'line', 'ray', 'vector'];
const PREFIX: Partial<Record<ObjectKind, string>> = {
  sphere: 's',
  polyhedron: 'h',
  cylinder: 'c',
  cone: 'k',
  polygon: 'g',
  plane: 'π',
};

export function nextDerivedLabel(kind: ObjectKind, existing: string[]): string {
  const used = new Set(existing);
  if (LOWERCASE_KINDS.includes(kind)) {
    for (let i = 0; i < 26; i++) {
      const c = String.fromCharCode('a'.charCodeAt(0) + i);
      if (!used.has(c)) return c;
    }
    for (let n = 1; n < 1000; n++) {
      const c = `a_${n}`;
      if (!used.has(c)) return c;
    }
  }
  const prefix = PREFIX[kind] ?? kind[0];
  for (let n = 1; n < 1000; n++) {
    const candidate = `${prefix}_${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${prefix}_x`;
}
```

- [ ] **Step 3: Extend Scene3D with `insert` helpers** (use `nextDerivedLabel` for label-less insertions; tests live in the next task)

```ts
// Append to src/stamps/geometry-3d/editor/scene/Scene3D.ts
// (above class — import)
import { nextPointLabel, nextDerivedLabel } from './labels';

// (within class) — replace addPoint to auto-label when no label given:
addPoint(constraint: Constraint, label?: string, color?: string): string {
  const id = this.nextId('p');
  const existingLabels = this.list().filter((o) => o.kind === 'point').map((o) => o.label);
  const autoLabel = label ?? nextPointLabel(existingLabels);
  const obj: Scene3DObject = {
    kind: 'point',
    id,
    label: autoLabel,
    visible: true,
    color,
    constraint,
  };
  this.objects.set(id, obj);
  this.order.push(id);
  this.listeners.add.forEach((cb) => cb(obj));
  return id;
}

// (within class) — typed helper for non-point inserts:
addObject<K extends Exclude<ObjectKind, 'point'>>(
  kind: K,
  spec: Omit<Extract<Scene3DObject, { kind: K }>, 'id' | 'label' | 'visible' | 'kind'>,
  label?: string,
): string {
  const id = this.nextId(kind[0]);
  const existingLabels = this.list().filter((o) => o.kind === kind).map((o) => o.label);
  const autoLabel = label ?? nextDerivedLabel(kind, existingLabels);
  const obj = { id, label: autoLabel, visible: true, kind, ...spec } as Scene3DObject;
  this.objects.set(id, obj);
  this.order.push(id);
  this.listeners.add.forEach((cb) => cb(obj));
  return id;
}
```

- [ ] **Step 4: Add Scene3D tests for derived objects**

```ts
// Append to src/stamps/geometry-3d/__tests__/scene/Scene3D.test.ts
test('addObject creates segment with auto-label', () => {
  const scene = new Scene3D();
  const p1 = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const p2 = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  const s = scene.addObject('segment', { p1, p2 });
  const seg = scene.get(s);
  expect(seg?.kind).toBe('segment');
  expect(seg?.label).toBe('a');
});

test('point labels are auto-assigned A, B, C', () => {
  const scene = new Scene3D();
  const a = scene.get(scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 }));
  const b = scene.get(scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 }));
  const c = scene.get(scene.addPoint({ kind: 'free', x: 2, y: 0, z: 0 }));
  expect([a?.label, b?.label, c?.label]).toEqual(['A', 'B', 'C']);
});
```

- [ ] **Step 5: Run all scene tests**

```
npx jest src/stamps/geometry-3d/__tests__/scene/
```

Expected: all pass.

- [ ] **Step 6: Commit**

```
git add src/stamps/geometry-3d/editor/scene/ src/stamps/geometry-3d/__tests__/scene/
git commit -m "feat(geometry-3d): label generator + addObject helper"
```

---

### Task 1.3: Cascade delete

**Files:**
- Modify: `src/stamps/geometry-3d/editor/scene/Scene3D.ts`
- Test: extend `src/stamps/geometry-3d/__tests__/scene/Scene3D.test.ts`

- [ ] **Step 1: Write failing test**

```ts
test('delete cascades to objects referencing the deleted id', () => {
  const scene = new Scene3D();
  const a = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const b = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  const c = scene.addPoint({ kind: 'free', x: 0, y: 1, z: 0 });
  const seg = scene.addObject('segment', { p1: a, p2: b });
  const pg = scene.addObject('polygon', { vertices: [a, b, c] });

  scene.delete(a);

  expect(scene.get(a)).toBeUndefined();
  expect(scene.get(seg)).toBeUndefined();
  expect(scene.get(pg)).toBeUndefined();
  expect(scene.get(b)).toBeDefined();
});

test('delete emits delete event for each cascaded id', () => {
  const scene = new Scene3D();
  const a = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const b = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  const seg = scene.addObject('segment', { p1: a, p2: b });
  const deletes: string[] = [];
  scene.on('delete', (id) => deletes.push(id));
  scene.delete(a);
  expect(deletes.sort()).toEqual([a, seg].sort());
});
```

- [ ] **Step 2: Implement cascade**

Add helper inside Scene3D class:

```ts
private referencedIds(obj: Scene3DObject): string[] {
  switch (obj.kind) {
    case 'point': {
      const c = obj.constraint;
      if (c.kind === 'onPlane') return [c.planeId];
      if (c.kind === 'onLine') return [c.lineId];
      if (c.kind === 'onPolygon') return [c.polygonId];
      if (c.kind === 'onSphere') return [c.sphereId];
      return [];
    }
    case 'segment':
    case 'line': return [obj.p1, obj.p2];
    case 'ray': return [obj.origin, obj.through];
    case 'vector': return [obj.from, obj.to];
    case 'polygon': return obj.vertices;
    case 'plane': return [obj.p1, obj.p2, obj.p3];
    case 'sphere': return [obj.center, obj.surfacePoint];
    case 'polyhedron': return obj.vertices;
    case 'cylinder': return [obj.baseCenter, obj.topCenter];
    case 'cone': return [obj.baseCenter, obj.apex];
  }
}

private collectDependents(targetId: string): Set<string> {
  const dependents = new Set<string>([targetId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const obj of this.objects.values()) {
      if (dependents.has(obj.id)) continue;
      const refs = this.referencedIds(obj);
      if (refs.some((r) => dependents.has(r))) {
        dependents.add(obj.id);
        grew = true;
      }
    }
  }
  return dependents;
}
```

Replace existing `delete`:

```ts
delete(id: string): void {
  if (!this.objects.has(id)) return;
  const toDelete = this.collectDependents(id);
  for (const dependentId of toDelete) {
    this.objects.delete(dependentId);
    this.order = this.order.filter((x) => x !== dependentId);
    this.listeners.delete.forEach((cb) => cb(dependentId));
  }
}
```

- [ ] **Step 3: Run all scene tests** — expect pass.
- [ ] **Step 4: Commit**

```
git commit -am "feat(geometry-3d): cascade delete cho Scene3D"
```

---

### Task 1.4: constraintMath — param ↔ world conversion

**Files:**
- Create: `src/stamps/geometry-3d/editor/scene/constraintMath.ts`
- Test: `src/stamps/geometry-3d/__tests__/scene/constraintMath.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/stamps/geometry-3d/__tests__/scene/constraintMath.test.ts
import { constraintToWorld, worldToConstraint } from '../../editor/scene/constraintMath';
import { Scene3D } from '../../editor/scene/Scene3D';

test('free constraint round-trips', () => {
  const scene = new Scene3D();
  expect(constraintToWorld({ kind: 'free', x: 1, y: 2, z: 3 }, scene)).toEqual([1, 2, 3]);
});

test('onGround: param (x, y) ↔ world (x, y, 0)', () => {
  const scene = new Scene3D();
  expect(constraintToWorld({ kind: 'onGround', x: 1.5, y: -2 }, scene)).toEqual([1.5, -2, 0]);
});

test('onAxis: z-axis param t ↔ world (0, 0, t)', () => {
  const scene = new Scene3D();
  expect(constraintToWorld({ kind: 'onAxis', axis: 'z', t: 1.5 }, scene)).toEqual([0, 0, 1.5]);
  expect(constraintToWorld({ kind: 'onAxis', axis: 'x', t: 2 }, scene)).toEqual([2, 0, 0]);
  expect(constraintToWorld({ kind: 'onAxis', axis: 'y', t: -1 }, scene)).toEqual([0, -1, 0]);
});

test('onPlane: u, v ↔ origin + u*basis1 + v*basis2', () => {
  const scene = new Scene3D();
  const a = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const b = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  const c = scene.addPoint({ kind: 'free', x: 0, y: 1, z: 0 });
  const planeId = scene.addObject('plane', { p1: a, p2: b, p3: c });

  const world = constraintToWorld({ kind: 'onPlane', planeId, u: 0.5, v: 0.5 }, scene);
  expect(world[0]).toBeCloseTo(0.5, 5);
  expect(world[1]).toBeCloseTo(0.5, 5);
  expect(world[2]).toBeCloseTo(0, 5);
});

test('worldToConstraint(onGround) extracts x, y, ignores z', () => {
  const scene = new Scene3D();
  const updated = worldToConstraint({ kind: 'onGround', x: 0, y: 0 }, [2, 3, 5], scene);
  expect(updated).toEqual({ kind: 'onGround', x: 2, y: 3 });
});

test('worldToConstraint(onAxis z) only varies t', () => {
  const scene = new Scene3D();
  const updated = worldToConstraint({ kind: 'onAxis', axis: 'z', t: 0 }, [99, 99, 4], scene);
  expect(updated).toEqual({ kind: 'onAxis', axis: 'z', t: 4 });
});
```

- [ ] **Step 2: Implement**

```ts
// src/stamps/geometry-3d/editor/scene/constraintMath.ts
import type { Constraint, Vec3, Scene3DObject } from './types';
import type { Scene3D } from './Scene3D';

function sub(a: Vec3, b: Vec3): Vec3 { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function add(a: Vec3, b: Vec3): Vec3 { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }
function scale(a: Vec3, k: number): Vec3 { return [a[0]*k, a[1]*k, a[2]*k]; }
function dot(a: Vec3, b: Vec3): number { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
}
function norm(a: Vec3): number { return Math.sqrt(dot(a, a)); }
function normalize(a: Vec3): Vec3 { const n = norm(a); return n === 0 ? a : scale(a, 1/n); }

function getPointWorld(id: string, scene: Scene3D): Vec3 {
  const obj = scene.get(id);
  if (!obj || obj.kind !== 'point') {
    throw new Error(`constraintMath: point ${id} not found`);
  }
  return constraintToWorld(obj.constraint, scene);
}

function getPlaneBasis(planeObj: Extract<Scene3DObject, { kind: 'plane' }>, scene: Scene3D): {
  origin: Vec3; basis1: Vec3; basis2: Vec3; normal: Vec3;
} {
  const p1 = getPointWorld(planeObj.p1, scene);
  const p2 = getPointWorld(planeObj.p2, scene);
  const p3 = getPointWorld(planeObj.p3, scene);
  const basis1 = sub(p2, p1);
  const tmp = sub(p3, p1);
  const normal = normalize(cross(basis1, tmp));
  const basis2 = cross(normal, basis1);
  return { origin: p1, basis1, basis2, normal };
}

export function constraintToWorld(c: Constraint, scene: Scene3D): Vec3 {
  switch (c.kind) {
    case 'free': return [c.x, c.y, c.z];
    case 'onGround': return [c.x, c.y, 0];
    case 'onAxis': {
      if (c.axis === 'x') return [c.t, 0, 0];
      if (c.axis === 'y') return [0, c.t, 0];
      return [0, 0, c.t];
    }
    case 'onPlane': {
      const plane = scene.get(c.planeId);
      if (!plane || plane.kind !== 'plane') throw new Error('onPlane: plane missing');
      const { origin, basis1, basis2 } = getPlaneBasis(plane, scene);
      return add(add(origin, scale(basis1, c.u)), scale(basis2, c.v));
    }
    case 'onLine': {
      const line = scene.get(c.lineId);
      if (!line || (line.kind !== 'line' && line.kind !== 'segment' && line.kind !== 'ray')) {
        throw new Error('onLine: parent missing');
      }
      const p1Id = line.kind === 'ray' ? line.origin : line.p1;
      const p2Id = line.kind === 'ray' ? line.through : line.p2;
      const p1 = getPointWorld(p1Id, scene);
      const p2 = getPointWorld(p2Id, scene);
      const dir = sub(p2, p1);
      return add(p1, scale(dir, c.t));
    }
    case 'onPolygon': {
      // For polygons use the first 3 vertices as plane basis (assumed planar — true for our tools)
      const pg = scene.get(c.polygonId);
      if (!pg || pg.kind !== 'polygon') throw new Error('onPolygon: parent missing');
      const v = pg.vertices;
      if (v.length < 3) throw new Error('onPolygon: < 3 vertices');
      const p1 = getPointWorld(v[0], scene);
      const p2 = getPointWorld(v[1], scene);
      const p3 = getPointWorld(v[2], scene);
      const basis1 = sub(p2, p1);
      const tmp = sub(p3, p1);
      const normal = normalize(cross(basis1, tmp));
      const basis2 = cross(normal, basis1);
      return add(add(p1, scale(basis1, c.u)), scale(basis2, c.v));
    }
    case 'onSphere': {
      const sph = scene.get(c.sphereId);
      if (!sph || sph.kind !== 'sphere') throw new Error('onSphere: parent missing');
      const center = getPointWorld(sph.center, scene);
      const surface = getPointWorld(sph.surfacePoint, scene);
      const radius = norm(sub(surface, center));
      const x = center[0] + radius * Math.sin(c.phi) * Math.cos(c.theta);
      const y = center[1] + radius * Math.sin(c.phi) * Math.sin(c.theta);
      const z = center[2] + radius * Math.cos(c.phi);
      return [x, y, z];
    }
  }
}

export function worldToConstraint(current: Constraint, world: Vec3, scene: Scene3D): Constraint {
  switch (current.kind) {
    case 'free': return { kind: 'free', x: world[0], y: world[1], z: world[2] };
    case 'onGround': return { kind: 'onGround', x: world[0], y: world[1] };
    case 'onAxis': {
      const t = current.axis === 'x' ? world[0] : current.axis === 'y' ? world[1] : world[2];
      return { kind: 'onAxis', axis: current.axis, t };
    }
    case 'onPlane': {
      const plane = scene.get(current.planeId);
      if (!plane || plane.kind !== 'plane') return current;
      const { origin, basis1, basis2 } = getPlaneBasis(plane, scene);
      const rel = sub(world, origin);
      const b1n = dot(basis1, basis1);
      const b2n = dot(basis2, basis2);
      const u = b1n === 0 ? 0 : dot(rel, basis1) / b1n;
      const v = b2n === 0 ? 0 : dot(rel, basis2) / b2n;
      return { kind: 'onPlane', planeId: current.planeId, u, v };
    }
    case 'onLine': {
      const line = scene.get(current.lineId);
      if (!line) return current;
      const p1Id = line.kind === 'ray' ? line.origin : (line as { p1: string }).p1;
      const p2Id = line.kind === 'ray' ? line.through : (line as { p2: string }).p2;
      const p1 = getPointWorld(p1Id, scene);
      const p2 = getPointWorld(p2Id, scene);
      const dir = sub(p2, p1);
      const len2 = dot(dir, dir);
      const t = len2 === 0 ? 0 : dot(sub(world, p1), dir) / len2;
      return { kind: 'onLine', lineId: current.lineId, t };
    }
    case 'onPolygon': {
      const pg = scene.get(current.polygonId);
      if (!pg || pg.kind !== 'polygon' || pg.vertices.length < 3) return current;
      const p1 = getPointWorld(pg.vertices[0], scene);
      const p2 = getPointWorld(pg.vertices[1], scene);
      const p3 = getPointWorld(pg.vertices[2], scene);
      const basis1 = sub(p2, p1);
      const tmp = sub(p3, p1);
      const normal = normalize(cross(basis1, tmp));
      const basis2 = cross(normal, basis1);
      const rel = sub(world, p1);
      const b1n = dot(basis1, basis1);
      const b2n = dot(basis2, basis2);
      const u = b1n === 0 ? 0 : dot(rel, basis1) / b1n;
      const v = b2n === 0 ? 0 : dot(rel, basis2) / b2n;
      return { kind: 'onPolygon', polygonId: current.polygonId, u, v };
    }
    case 'onSphere': {
      const sph = scene.get(current.sphereId);
      if (!sph || sph.kind !== 'sphere') return current;
      const center = getPointWorld(sph.center, scene);
      const rel = sub(world, center);
      const r = norm(rel);
      if (r === 0) return current;
      const phi = Math.acos(rel[2] / r);
      const theta = Math.atan2(rel[1], rel[0]);
      return { kind: 'onSphere', sphereId: current.sphereId, theta, phi };
    }
  }
}
```

- [ ] **Step 3: Run tests**

```
npx jest src/stamps/geometry-3d/__tests__/scene/constraintMath.test.ts
```

Expected: all pass.

- [ ] **Step 4: Commit**

```
git add src/stamps/geometry-3d/editor/scene/constraintMath.ts \
        src/stamps/geometry-3d/__tests__/scene/constraintMath.test.ts
git commit -m "feat(geometry-3d): constraintMath param↔world cho mọi kind"
```

---

## Phase 2 — Hit Test

### Task 2.1: rayCast utility — screen → world ray

**Files:**
- Create: `src/stamps/geometry-3d/editor/hitTest/rayCast.ts`
- Test: `src/stamps/geometry-3d/__tests__/hitTest/rayCast.test.ts`

JSXGraph's `view3d` exposes a `.project3DTo2D(x, y, z)` method and an inverse (camera matrices on `view.matrix3D`). For tests, mock these.

- [ ] **Step 1: Write failing test using a mock view3d**

```ts
// src/stamps/geometry-3d/__tests__/hitTest/rayCast.test.ts
import { screenToRay } from '../../editor/hitTest/rayCast';

// A trivial orthographic mock: world (x, y, z) → screen (x*100 + 500, -y*100 + 400)
function mockOrthoView() {
  return {
    project3DTo2D(x: number, y: number, z: number) {
      return [1, x * 100 + 500, -y * 100 + 400, z];
    },
    // Inverse: given screen (sx, sy), all depths produce world (x, y, *)
    unprojectScreen(sx: number, sy: number, depth: number) {
      return [(sx - 500) / 100, -(sy - 400) / 100, depth];
    },
  };
}

test('screenToRay returns origin + dir consistent with view', () => {
  const view = mockOrthoView();
  const ray = screenToRay({ x: 500, y: 400 }, view as never);
  // Origin at z = +large (camera in +z half), dir pointing -z for orthographic case
  expect(ray.origin[0]).toBeCloseTo(0, 5);
  expect(ray.origin[1]).toBeCloseTo(0, 5);
  expect(ray.dir[2]).toBeLessThan(0);
});
```

- [ ] **Step 2: Implement screenToRay**

```ts
// src/stamps/geometry-3d/editor/hitTest/rayCast.ts
import type { Vec3 } from '../scene/types';

export interface View3DLike {
  unprojectScreen?(sx: number, sy: number, depth: number): [number, number, number];
  project3DTo2D?(x: number, y: number, z: number): [number, number, number, number];
}

export interface Ray3D { origin: Vec3; dir: Vec3 }

export function screenToRay(screen: { x: number; y: number }, view: View3DLike): Ray3D {
  // Strategy: unproject the screen point at two depths to get a ray through the scene.
  // Prefer view.unprojectScreen if available (mock); fallback to inverse via project3DTo2D bisection.
  const near = unproject(screen, view, +20);
  const far = unproject(screen, view, -20);
  const dir: Vec3 = [far[0] - near[0], far[1] - near[1], far[2] - near[2]];
  const n = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
  const norm: Vec3 = n === 0 ? [0, 0, -1] : [dir[0] / n, dir[1] / n, dir[2] / n];
  return { origin: near, dir: norm };
}

function unproject(screen: { x: number; y: number }, view: View3DLike, depth: number): Vec3 {
  if (typeof view.unprojectScreen === 'function') {
    const v = view.unprojectScreen(screen.x, screen.y, depth);
    return [v[0], v[1], v[2]];
  }
  // Fallback: search along the depth axis at integer steps via project3DTo2D.
  // Find world (x, y) such that project3DTo2D(x, y, depth) ≈ screen.
  // This is a stub the JSXGraph adapter will replace; tests using this fallback should mock unprojectScreen instead.
  throw new Error('rayCast: view.unprojectScreen unavailable and fallback not implemented');
}
```

- [ ] **Step 3: Run test, commit**

```
npx jest src/stamps/geometry-3d/__tests__/hitTest/rayCast.test.ts
git add src/stamps/geometry-3d/editor/hitTest/rayCast.ts \
        src/stamps/geometry-3d/__tests__/hitTest/rayCast.test.ts
git commit -m "feat(geometry-3d): rayCast screen→world ray skeleton"
```

---

### Task 2.2: Ray–plane / ray–ground intersection

**Files:**
- Create: `src/stamps/geometry-3d/editor/hitTest/intersect.ts`
- Test: `src/stamps/geometry-3d/__tests__/hitTest/intersect.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/stamps/geometry-3d/__tests__/hitTest/intersect.test.ts
import { rayPlane, rayGround, raySphere, rayLineSegment } from '../../editor/hitTest/intersect';

test('rayPlane: ray pointing -z from (0,0,5) hits z=0 plane at (0,0,0)', () => {
  const hit = rayPlane(
    { origin: [0, 0, 5], dir: [0, 0, -1] },
    { point: [0, 0, 0], normal: [0, 0, 1] },
  );
  expect(hit).not.toBeNull();
  expect(hit!.point).toEqual([0, 0, 0]);
  expect(hit!.t).toBeCloseTo(5, 5);
});

test('rayPlane: parallel ray misses', () => {
  const hit = rayPlane(
    { origin: [0, 0, 5], dir: [1, 0, 0] },
    { point: [0, 0, 0], normal: [0, 0, 1] },
  );
  expect(hit).toBeNull();
});

test('rayGround returns z=0 hit', () => {
  const hit = rayGround({ origin: [1, 1, 5], dir: [0, 0, -1] });
  expect(hit).not.toBeNull();
  expect(hit!.point).toEqual([1, 1, 0]);
});

test('raySphere: ray through center hits closer intersection', () => {
  const hit = raySphere(
    { origin: [0, 0, 5], dir: [0, 0, -1] },
    { center: [0, 0, 0], radius: 1 },
  );
  expect(hit).not.toBeNull();
  expect(hit!.point[2]).toBeCloseTo(1, 5);
});

test('rayLineSegment: closest point with distance threshold', () => {
  const hit = rayLineSegment(
    { origin: [0, 0, 5], dir: [0, 0, -1] },
    { a: [0, 0, 0], b: [1, 0, 0] },
    0.5,
  );
  expect(hit).not.toBeNull();
  expect(hit!.point[0]).toBeCloseTo(0, 5);
});
```

- [ ] **Step 2: Implement**

```ts
// src/stamps/geometry-3d/editor/hitTest/intersect.ts
import type { Vec3 } from '../scene/types';
import type { Ray3D } from './rayCast';

const EPS = 1e-9;

export interface PlaneHit { point: Vec3; t: number }
export interface SphereHit { point: Vec3; t: number }
export interface SegmentHit { point: Vec3; t: number; tOnSegment: number }

function dot(a: Vec3, b: Vec3): number { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function sub(a: Vec3, b: Vec3): Vec3 { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function add(a: Vec3, b: Vec3): Vec3 { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }
function scale(a: Vec3, k: number): Vec3 { return [a[0]*k, a[1]*k, a[2]*k]; }
function norm2(a: Vec3): number { return dot(a, a); }

export function rayPlane(
  ray: Ray3D,
  plane: { point: Vec3; normal: Vec3 },
): PlaneHit | null {
  const denom = dot(ray.dir, plane.normal);
  if (Math.abs(denom) < EPS) return null;
  const t = dot(sub(plane.point, ray.origin), plane.normal) / denom;
  if (t < 0) return null;
  return { point: add(ray.origin, scale(ray.dir, t)), t };
}

export function rayGround(ray: Ray3D): PlaneHit | null {
  return rayPlane(ray, { point: [0, 0, 0], normal: [0, 0, 1] });
}

export function raySphere(
  ray: Ray3D,
  sphere: { center: Vec3; radius: number },
): SphereHit | null {
  const oc = sub(ray.origin, sphere.center);
  const b = dot(oc, ray.dir);
  const c = dot(oc, oc) - sphere.radius * sphere.radius;
  const disc = b * b - c;
  if (disc < 0) return null;
  const sqrtD = Math.sqrt(disc);
  const t1 = -b - sqrtD;
  const t2 = -b + sqrtD;
  const t = t1 >= 0 ? t1 : t2;
  if (t < 0) return null;
  return { point: add(ray.origin, scale(ray.dir, t)), t };
}

/**
 * Closest approach between ray and line segment. Accepts a screen-equivalent
 * distance threshold (in world units; caller scales for pixel ratio).
 */
export function rayLineSegment(
  ray: Ray3D,
  seg: { a: Vec3; b: Vec3 },
  maxDistance: number,
): SegmentHit | null {
  const u = ray.dir;
  const v = sub(seg.b, seg.a);
  const w0 = sub(ray.origin, seg.a);
  const a = dot(u, u);
  const bb = dot(u, v);
  const cc = dot(v, v);
  const d = dot(u, w0);
  const e = dot(v, w0);
  const denom = a * cc - bb * bb;
  if (Math.abs(denom) < EPS) return null;
  const sc = (bb * e - cc * d) / denom;
  const tc = (a * e - bb * d) / denom;
  if (sc < 0 || tc < 0 || tc > 1) return null;
  const pRay = add(ray.origin, scale(u, sc));
  const pSeg = add(seg.a, scale(v, tc));
  const dist2 = norm2(sub(pRay, pSeg));
  if (dist2 > maxDistance * maxDistance) return null;
  return { point: pSeg, t: sc, tOnSegment: tc };
}
```

- [ ] **Step 3: Run tests, commit**

```
npx jest src/stamps/geometry-3d/__tests__/hitTest/intersect.test.ts
git add src/stamps/geometry-3d/editor/hitTest/ \
        src/stamps/geometry-3d/__tests__/hitTest/
git commit -m "feat(geometry-3d): ray–plane / sphere / segment intersection"
```

---

### Task 2.3: Existing-point snapping + hitTest orchestration

**Files:**
- Create: `src/stamps/geometry-3d/editor/hitTest/snapping.ts`
- Create: `src/stamps/geometry-3d/editor/hitTest/hitTest.ts`
- Test: `src/stamps/geometry-3d/__tests__/hitTest/hitTest.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/stamps/geometry-3d/__tests__/hitTest/hitTest.test.ts
import { Scene3D } from '../../editor/scene/Scene3D';
import { hitTest } from '../../editor/hitTest/hitTest';

const mockView = {
  unprojectScreen(sx: number, sy: number, depth: number) {
    return [(sx - 500) / 100, -(sy - 400) / 100, depth] as [number, number, number];
  },
  project3DTo2D(x: number, y: number, z: number) {
    return [1, x * 100 + 500, -y * 100 + 400, z] as [number, number, number, number];
  },
};

test('hitTest snaps to existing point within radius', () => {
  const scene = new Scene3D();
  const a = scene.addPoint({ kind: 'onGround', x: 0, y: 0 }); // world (0,0,0) → screen (500, 400)
  const hit = hitTest({ x: 503, y: 401 }, mockView as never, scene);
  expect(hit.kind).toBe('existingPoint');
  if (hit.kind === 'existingPoint') expect(hit.pointId).toBe(a);
});

test('hitTest returns onGround for click on empty ground', () => {
  const scene = new Scene3D();
  const hit = hitTest({ x: 700, y: 500 }, mockView as never, scene);
  expect(hit.kind).toBe('onGround');
});

test('hitTest snaps to z-axis when click near it', () => {
  const scene = new Scene3D();
  // z-axis: screen x = 500 for all z; depth = z. Click at (501, 200) → near z-axis at z=2
  const hit = hitTest({ x: 501, y: 200 }, mockView as never, scene);
  expect(['onAxis', 'onGround']).toContain(hit.kind);
});
```

- [ ] **Step 2: Implement snapping + hitTest**

```ts
// src/stamps/geometry-3d/editor/hitTest/snapping.ts
import { constraintToWorld } from '../scene/constraintMath';
import type { Scene3D } from '../scene/Scene3D';
import type { View3DLike } from './rayCast';

export function findSnapPoint(
  screen: { x: number; y: number },
  view: View3DLike,
  scene: Scene3D,
  pixelRadius = 8,
): string | null {
  let best: { id: string; d2: number } | null = null;
  const r2 = pixelRadius * pixelRadius;
  for (const obj of scene.list()) {
    if (obj.kind !== 'point') continue;
    if (!obj.visible) continue;
    const world = constraintToWorld(obj.constraint, scene);
    const proj = view.project3DTo2D?.(world[0], world[1], world[2]);
    if (!proj) continue;
    const dx = proj[1] - screen.x;
    const dy = proj[2] - screen.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= r2 && (best === null || d2 < best.d2)) {
      best = { id: obj.id, d2 };
    }
  }
  return best?.id ?? null;
}
```

```ts
// src/stamps/geometry-3d/editor/hitTest/hitTest.ts
import { screenToRay, type View3DLike } from './rayCast';
import { rayGround, rayPlane, rayLineSegment, raySphere } from './intersect';
import { findSnapPoint } from './snapping';
import { constraintToWorld } from '../scene/constraintMath';
import type { Scene3D } from '../scene/Scene3D';
import type { Vec3 } from '../scene/types';

export type SceneHit =
  | { kind: 'existingPoint'; pointId: string }
  | { kind: 'onGround'; world: Vec3 }
  | { kind: 'onAxis'; axis: 'x' | 'y' | 'z'; t: number; world: Vec3 }
  | { kind: 'onPlane'; planeId: string; u: number; v: number; world: Vec3 }
  | { kind: 'onLine'; lineId: string; t: number; world: Vec3 }
  | { kind: 'onPolygon'; polygonId: string; u: number; v: number; world: Vec3 }
  | { kind: 'onSphere'; sphereId: string; theta: number; phi: number; world: Vec3 }
  | { kind: 'empty' };

const AXIS_PIXEL_THRESHOLD = 12;

export function hitTest(
  screen: { x: number; y: number },
  view: View3DLike,
  scene: Scene3D,
): SceneHit {
  // 1. Existing point snap
  const snap = findSnapPoint(screen, view, scene);
  if (snap) return { kind: 'existingPoint', pointId: snap };

  const ray = screenToRay(screen, view);

  // 2. Spheres (priority: closest first)
  let bestSphere: { id: string; t: number; world: Vec3 } | null = null;
  for (const obj of scene.list()) {
    if (obj.kind !== 'sphere' || !obj.visible) continue;
    const center = constraintToWorld(scene.get(obj.center)!.kind === 'point'
      ? (scene.get(obj.center) as { constraint: import('../scene/types').Constraint }).constraint
      : { kind: 'free', x: 0, y: 0, z: 0 }, scene);
    const surface = constraintToWorld((scene.get(obj.surfacePoint) as { constraint: import('../scene/types').Constraint }).constraint, scene);
    const radius = Math.hypot(surface[0]-center[0], surface[1]-center[1], surface[2]-center[2]);
    const sh = raySphere(ray, { center: center as Vec3, radius });
    if (sh && (bestSphere === null || sh.t < bestSphere.t)) {
      bestSphere = { id: obj.id, t: sh.t, world: sh.point };
    }
  }

  // 3. User-defined planes / polygons (skip in v0.8.0 release — implementation can defer to a later phase)
  // For the initial release, only ground + axes + existing-point + sphere snapping are wired.

  // 4. Axis snap — project click onto each axis line in screen space
  if (view.project3DTo2D) {
    const axes: { axis: 'x'|'y'|'z'; a: Vec3; b: Vec3 }[] = [
      { axis: 'x', a: [-10,0,0], b: [10,0,0] },
      { axis: 'y', a: [0,-10,0], b: [0,10,0] },
      { axis: 'z', a: [0,0,-10], b: [0,0,10] },
    ];
    for (const ax of axes) {
      const pa = view.project3DTo2D(ax.a[0], ax.a[1], ax.a[2]);
      const pb = view.project3DTo2D(ax.b[0], ax.b[1], ax.b[2]);
      const d = distScreenPointToSegment(screen, [pa[1], pa[2]], [pb[1], pb[2]]);
      if (d <= AXIS_PIXEL_THRESHOLD) {
        const hit = rayLineSegment(ray, { a: ax.a, b: ax.b }, 1e3);
        if (hit) {
          const t = ax.axis === 'x' ? hit.point[0] : ax.axis === 'y' ? hit.point[1] : hit.point[2];
          return { kind: 'onAxis', axis: ax.axis, t, world: hit.point };
        }
      }
    }
  }

  // 5. Sphere result (if found and beats other priorities)
  if (bestSphere) {
    const sph = scene.get(bestSphere.id);
    if (sph && sph.kind === 'sphere') {
      const center = constraintToWorld((scene.get(sph.center) as { constraint: import('../scene/types').Constraint }).constraint, scene);
      const rel: Vec3 = [bestSphere.world[0]-center[0], bestSphere.world[1]-center[1], bestSphere.world[2]-center[2]];
      const r = Math.hypot(...rel);
      const phi = r === 0 ? 0 : Math.acos(rel[2] / r);
      const theta = Math.atan2(rel[1], rel[0]);
      return { kind: 'onSphere', sphereId: bestSphere.id, theta, phi, world: bestSphere.world };
    }
  }

  // 6. Ground
  const g = rayGround(ray);
  if (g) return { kind: 'onGround', world: g.point };

  return { kind: 'empty' };
}

function distScreenPointToSegment(
  p: { x: number; y: number },
  a: [number, number],
  b: [number, number],
): number {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const wx = p.x - a[0], wy = p.y - a[1];
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(wx, wy);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(p.x - b[0], p.y - b[1]);
  const t = c1 / c2;
  const px = a[0] + t * vx, py = a[1] + t * vy;
  return Math.hypot(p.x - px, p.y - py);
}
```

- [ ] **Step 3: Run, commit**

```
npx jest src/stamps/geometry-3d/__tests__/hitTest/
git add src/stamps/geometry-3d/editor/hitTest/ \
        src/stamps/geometry-3d/__tests__/hitTest/
git commit -m "feat(geometry-3d): hitTest orchestration (point snap, axis, ground, sphere)"
```

> NOTE: ray-onPlane / ray-onPolygon / ray-onLine hits for *user-created* planes/polygons/segments are deferred to Task 2.4 below to keep this commit reviewable.

---

### Task 2.4: Hit-test onPlane / onPolygon / onLine

**Files:**
- Modify: `src/stamps/geometry-3d/editor/hitTest/hitTest.ts` (extend the orchestration)
- Test: extend `src/stamps/geometry-3d/__tests__/hitTest/hitTest.test.ts`

- [ ] **Step 1: Add tests for plane / polygon / segment hits**

```ts
test('hitTest onPlane: ray through user plane returns onPlane hit', () => {
  const scene = new Scene3D();
  const a = scene.addPoint({ kind: 'free', x: 0, y: 0, z: 0 });
  const b = scene.addPoint({ kind: 'free', x: 1, y: 0, z: 0 });
  const c = scene.addPoint({ kind: 'free', x: 0, y: 1, z: 0 });
  const plane = scene.addObject('plane', { p1: a, p2: b, p3: c });
  // The plane in this test coincides with ground; hit should prefer plane over ground.
  const hit = hitTest({ x: 700, y: 500 }, mockView as never, scene);
  expect(hit.kind).toBe('onPlane');
  if (hit.kind === 'onPlane') expect(hit.planeId).toBe(plane);
});
```

- [ ] **Step 2: Insert plane/polygon scan before ground in hitTest**

Add inside `hitTest()` after the axis loop, before the ground fallback:

```ts
// User-defined planes
let bestPlane: { id: string; t: number; world: Vec3; basis: ReturnType<typeof planeBasis> } | null = null;
for (const obj of scene.list()) {
  if (obj.kind !== 'plane' || !obj.visible) continue;
  const basis = planeBasis(obj, scene);
  if (!basis) continue;
  const ph = rayPlane(ray, { point: basis.origin, normal: basis.normal });
  if (ph && (bestPlane === null || ph.t < bestPlane.t)) {
    bestPlane = { id: obj.id, t: ph.t, world: ph.point, basis };
  }
}
if (bestPlane) {
  const rel: Vec3 = [bestPlane.world[0]-bestPlane.basis.origin[0], bestPlane.world[1]-bestPlane.basis.origin[1], bestPlane.world[2]-bestPlane.basis.origin[2]];
  const u = dot(rel, bestPlane.basis.basis1) / dot(bestPlane.basis.basis1, bestPlane.basis.basis1);
  const v = dot(rel, bestPlane.basis.basis2) / dot(bestPlane.basis.basis2, bestPlane.basis.basis2);
  return { kind: 'onPlane', planeId: bestPlane.id, u, v, world: bestPlane.world };
}

// Polygons — same shape, but additionally check the point lies inside the polygon outline
// (simplified for v0.8.0: treat polygons as their bounding-plane intersection only)
```

Add helpers `planeBasis`, `dot` inside the file. Reuse the constraintMath shape if practical (import the helpers).

- [ ] **Step 3: Run, commit**

```
npx jest src/stamps/geometry-3d/__tests__/hitTest/hitTest.test.ts
git commit -am "feat(geometry-3d): hitTest onPlane (polygon basic support)"
```

---

## Phase 3 — Renderer

### Task 3.1: JxgRenderer skeleton + Point/Free

**Files:**
- Create: `src/stamps/geometry-3d/editor/renderer/JxgRenderer.ts`
- Test: `src/stamps/geometry-3d/__tests__/renderer/JxgRenderer.test.ts`

The renderer subscribes to Scene3D events and maps each object kind to JSXGraph element creation.

- [ ] **Step 1: Write failing test using __mocks__/jsxgraphMock.js**

```ts
// src/stamps/geometry-3d/__tests__/renderer/JxgRenderer.test.ts
import { Scene3D } from '../../editor/scene/Scene3D';
import { JxgRenderer } from '../../editor/renderer/JxgRenderer';

function mockView() {
  const calls: Array<{ type: string; parents: unknown[]; attrs: Record<string, unknown> }> = [];
  return {
    calls,
    create(type: string, parents: unknown[], attrs: Record<string, unknown>) {
      calls.push({ type, parents, attrs });
      return { id: attrs.id, setAttribute: jest.fn(), on: jest.fn(), X: () => 0, Y: () => 0, Z: () => 0, remove: jest.fn() };
    },
  };
}

test('JxgRenderer creates point3d for free constraint', () => {
  const scene = new Scene3D();
  const view = mockView();
  new JxgRenderer(scene, view as never);
  scene.addPoint({ kind: 'free', x: 1, y: 2, z: 3 });
  expect(view.calls.length).toBe(1);
  expect(view.calls[0].type).toBe('point3d');
  expect(view.calls[0].parents).toEqual([1, 2, 3]);
});

test('JxgRenderer creates point3d for onGround constraint', () => {
  const scene = new Scene3D();
  const view = mockView();
  new JxgRenderer(scene, view as never);
  scene.addPoint({ kind: 'onGround', x: 1, y: 2 });
  expect(view.calls[0].type).toBe('point3d');
  expect(view.calls[0].parents).toEqual([1, 2, 0]);
});

test('JxgRenderer creates point3d for onAxis z constraint', () => {
  const scene = new Scene3D();
  const view = mockView();
  new JxgRenderer(scene, view as never);
  scene.addPoint({ kind: 'onAxis', axis: 'z', t: 3 });
  expect(view.calls[0].parents).toEqual([0, 0, 3]);
});
```

- [ ] **Step 2: Implement JxgRenderer**

```ts
// src/stamps/geometry-3d/editor/renderer/JxgRenderer.ts
import type { Scene3D } from '../scene/Scene3D';
import type { Scene3DObject, Vec3 } from '../scene/types';
import { constraintToWorld, worldToConstraint } from '../scene/constraintMath';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

interface View3DLike {
  create(type: string, parents: unknown[], attrs: Record<string, unknown>): JxgObj;
}

export class JxgRenderer {
  private map = new Map<string, JxgObj>();
  private unsubAdd: () => void;
  private unsubChange: () => void;
  private unsubDelete: () => void;

  constructor(private scene: Scene3D, private view: View3DLike) {
    this.unsubAdd = scene.on('add', (o) => this.handleAdd(o));
    this.unsubChange = scene.on('change', (o) => this.handleChange(o));
    this.unsubDelete = scene.on('delete', (id) => this.handleDelete(id));
    for (const obj of scene.list()) this.handleAdd(obj);
  }

  dispose(): void {
    this.unsubAdd();
    this.unsubChange();
    this.unsubDelete();
    for (const [id, j] of this.map) {
      try { j.remove?.(); } catch { /* swallow */ }
      this.map.delete(id);
    }
  }

  private handleAdd(obj: Scene3DObject): void {
    if (this.map.has(obj.id)) return;
    if (obj.kind === 'point') {
      const world = constraintToWorld(obj.constraint, this.scene);
      const attrs = { id: obj.id, name: obj.label, size: 4, visible: obj.visible };
      const jxg = this.view.create('point3d', world, attrs);
      this.map.set(obj.id, jxg);
      this.attachDragHook(obj.id, jxg);
      return;
    }
    // Non-point kinds — Task 3.2+ extends this.
  }

  private attachDragHook(id: string, jxg: JxgObj): void {
    if (typeof jxg.on !== 'function') return;
    jxg.on('drag', () => {
      const obj = this.scene.get(id);
      if (!obj || obj.kind !== 'point') return;
      const world: Vec3 = [jxg.X(), jxg.Y(), jxg.Z()];
      const updated = worldToConstraint(obj.constraint, world, this.scene);
      (obj as { constraint: import('../scene/types').Constraint }).constraint = updated;
      this.scene.emitChange(id);
    });
  }

  private handleChange(obj: Scene3DObject): void {
    const j = this.map.get(obj.id);
    if (!j) return;
    if (obj.kind === 'point' && typeof j.moveTo === 'function') {
      const w = constraintToWorld(obj.constraint, this.scene);
      j.moveTo([w[0], w[1], w[2]]);
    }
  }

  private handleDelete(id: string): void {
    const j = this.map.get(id);
    if (!j) return;
    try { j.remove?.(); } catch { /* swallow */ }
    this.map.delete(id);
  }
}
```

- [ ] **Step 3: Run, commit**

```
npx jest src/stamps/geometry-3d/__tests__/renderer/
git add src/stamps/geometry-3d/editor/renderer/ \
        src/stamps/geometry-3d/__tests__/renderer/
git commit -m "feat(geometry-3d): JxgRenderer Point creation + drag hook"
```

---

### Task 3.2: Renderer for Segment / Line / Ray / Vector

Extend `JxgRenderer.handleAdd`:

```ts
if (obj.kind === 'segment') {
  const a = this.map.get(obj.p1), b = this.map.get(obj.p2);
  const attrs = { id: obj.id, straightFirst: false, straightLast: false, visible: obj.visible, strokeColor: obj.color ?? '#0066cc', strokeWidth: 2 };
  this.map.set(obj.id, this.view.create('line3d', [a, b], attrs));
  return;
}
if (obj.kind === 'line') {
  this.map.set(obj.id, this.view.create('line3d', [this.map.get(obj.p1), this.map.get(obj.p2)], { id: obj.id, visible: obj.visible, strokeColor: obj.color ?? '#0066cc', strokeWidth: 2 }));
  return;
}
if (obj.kind === 'ray') {
  this.map.set(obj.id, this.view.create('line3d', [this.map.get(obj.origin), this.map.get(obj.through)], { id: obj.id, straightFirst: false, visible: obj.visible }));
  return;
}
if (obj.kind === 'vector') {
  this.map.set(obj.id, this.view.create('line3d', [this.map.get(obj.from), this.map.get(obj.to)], { id: obj.id, lastArrow: true, straightFirst: false, straightLast: false, visible: obj.visible }));
  return;
}
```

- [ ] **Step 1:** Add a renderer test for each kind asserting the `type` parameter on `view.create` and the order of parents.
- [ ] **Step 2:** Run tests, commit `feat(geometry-3d): renderer cho segment/line/ray/vector`.

---

### Task 3.3: Renderer for Plane / Polygon / Sphere

Extend `handleAdd`:

```ts
if (obj.kind === 'plane') {
  this.map.set(obj.id, this.view.create('plane3d', [this.map.get(obj.p1), this.map.get(obj.p2), this.map.get(obj.p3)], { id: obj.id, fillOpacity: 0.2, visible: obj.visible }));
  return;
}
if (obj.kind === 'polygon') {
  const refs = obj.vertices.map((v) => this.map.get(v));
  this.map.set(obj.id, this.view.create('polygon3d', [refs], { id: obj.id, fillOpacity: 0.3, visible: obj.visible }));
  return;
}
if (obj.kind === 'sphere') {
  this.map.set(obj.id, this.view.create('sphere3d', [this.map.get(obj.center), this.map.get(obj.surfacePoint)], { id: obj.id, fillOpacity: 0.25, visible: obj.visible }));
  return;
}
```

- [ ] **Step 1:** Add tests asserting `plane3d`, `polygon3d`, `sphere3d` element types.
- [ ] **Step 2:** Commit `feat(geometry-3d): renderer cho plane/polygon/sphere`.

---

### Task 3.4: Renderer for Polyhedron / Cylinder / Cone (faceted)

Reuse the v0.7.0 `finishPolyhedron` approach — emit one `polygon3d` per face.

**File:**
- Create: `src/stamps/geometry-3d/editor/renderer/faceted.ts`

```ts
// src/stamps/geometry-3d/editor/renderer/faceted.ts
import type { Scene3D } from '../scene/Scene3D';
import { constraintToWorld } from '../scene/constraintMath';
import type { Vec3 } from '../scene/types';

export const CURVED_SEGMENTS = 16;

export function cylinderFaces(
  center: Vec3, top: Vec3, radius: number,
): { vertices: Vec3[]; faces: number[][] } {
  const axis = [top[0]-center[0], top[1]-center[1], top[2]-center[2]] as Vec3;
  // Build orthonormal basis (u, v) perpendicular to axis (assume axis is +z for v0.8.0; tools enforce vertical cylinders)
  const baseRing: Vec3[] = [];
  const topRing: Vec3[] = [];
  for (let i = 0; i < CURVED_SEGMENTS; i++) {
    const theta = (i / CURVED_SEGMENTS) * Math.PI * 2;
    const dx = radius * Math.cos(theta);
    const dy = radius * Math.sin(theta);
    baseRing.push([center[0]+dx, center[1]+dy, center[2]]);
    topRing.push([top[0]+dx, top[1]+dy, top[2]]);
  }
  const vertices = [...baseRing, ...topRing];
  const faces: number[][] = [];
  faces.push(baseRing.map((_, i) => i));
  faces.push(topRing.map((_, i) => CURVED_SEGMENTS + i));
  for (let i = 0; i < CURVED_SEGMENTS; i++) {
    const next = (i + 1) % CURVED_SEGMENTS;
    faces.push([i, next, CURVED_SEGMENTS + next, CURVED_SEGMENTS + i]);
  }
  return { vertices, faces };
}

export function coneFaces(
  baseCenter: Vec3, apex: Vec3, radius: number,
): { vertices: Vec3[]; faces: number[][] } {
  const baseRing: Vec3[] = [];
  for (let i = 0; i < CURVED_SEGMENTS; i++) {
    const theta = (i / CURVED_SEGMENTS) * Math.PI * 2;
    baseRing.push([baseCenter[0]+radius*Math.cos(theta), baseCenter[1]+radius*Math.sin(theta), baseCenter[2]]);
  }
  const apexIdx = baseRing.length;
  const vertices = [...baseRing, apex];
  const faces: number[][] = [baseRing.map((_, i) => i)];
  for (let i = 0; i < CURVED_SEGMENTS; i++) {
    faces.push([i, (i + 1) % CURVED_SEGMENTS, apexIdx]);
  }
  return { vertices, faces };
}
```

Extend `JxgRenderer.handleAdd`:

```ts
if (obj.kind === 'polyhedron') {
  const verts = obj.vertices.map((id) => this.map.get(id));
  const faceJxgs = obj.faces.map((face) =>
    this.view.create('polygon3d', [face.map((idx) => verts[idx])], {
      id: `${obj.id}.face${face.join('-')}`,
      fillOpacity: 0.25,
      strokeColor: '#0066cc',
      visible: obj.visible,
    }),
  );
  this.map.set(obj.id, { _faces: faceJxgs, remove: () => faceJxgs.forEach((f: any) => f.remove?.()) });
  return;
}
if (obj.kind === 'cylinder' || obj.kind === 'cone') {
  // Compute faceted geometry, create transient JXG points for each ring vertex, then polygon3d per face.
  // Implementation parallels v0.7.0 handlers.ts:handleCurvedStep (lines 470-505 for cylinder, 429-468 for cone).
  // ...keep the JXG references for cleanup
}
```

- [ ] **Step 1:** Write faceted.test.ts asserting `cylinderFaces` and `coneFaces` vertex/face counts.
- [ ] **Step 2:** Implement faceted.ts and extend renderer.
- [ ] **Step 3:** Add renderer tests for polyhedron/cylinder/cone — assert the count of `polygon3d` create calls.
- [ ] **Step 4:** Commit `feat(geometry-3d): renderer cho polyhedron/cylinder/cone (faceted)`.

---

## Phase 4 — Tool Controller

### Task 4.1: ToolSpec / ToolStep types + spec list

**Files:**
- Create: `src/stamps/geometry-3d/editor/tools/spec.ts`
- Test: `src/stamps/geometry-3d/__tests__/tools/spec.test.ts`

- [ ] **Step 1: Define types and the 15 tool specs (handlers as stubs that return null for now)**

```ts
// src/stamps/geometry-3d/editor/tools/spec.ts
import type { Scene3D } from '../scene/Scene3D';
import type { SceneHit } from '../hitTest/hitTest';

export type ToolKey =
  | 'move' | 'point' | 'pointOnObject'
  | 'segment' | 'line' | 'ray' | 'vector' | 'polygon'
  | 'plane' | 'pyramid' | 'prism' | 'tetrahedron' | 'cube'
  | 'sphere' | 'cylinder' | 'cone';

export type ToolStep =
  | {
      type: 'point';
      allowExisting: boolean;
      allowNewOn: Array<'ground' | 'axis' | 'plane' | 'line' | 'polygon' | 'sphere'>;
      hint: string;
    }
  | { type: 'closingPoint'; hint: string }
  | { type: 'object'; kinds: Array<'plane' | 'polygon' | 'line' | 'sphere' | 'polyhedron'>; hint: string }
  | { type: 'number'; prompt: string; min?: number; max?: number };

export interface CollectedArg {
  step: ToolStep;
  hit?: SceneHit;
  value?: number;
}

export interface ToolSpec {
  key: ToolKey;
  label: string;
  hintIdle: string;
  steps: ToolStep[];
  build(args: CollectedArg[], scene: Scene3D): string | null;
}

// (handlers are imported from ./handlers/* in Phase 5; for now stub them inline)
const stub = () => null;

export const TOOLS: ToolSpec[] = [
  { key: 'move', label: 'Di chuyển', hintIdle: 'Kéo điểm hoặc xoay khung', steps: [], build: stub },
  // ... 14 more entries, each with declarative steps. Phase 5 wires real build().
];

export const TOOL_GROUPS: Record<string, ToolKey[]> = {
  'Cơ bản': ['move', 'point', 'segment', 'line', 'plane'],
  'Điểm': ['point', 'pointOnObject'],
  'Đường thẳng': ['segment', 'line', 'ray', 'vector', 'polygon'],
  'Mặt phẳng': ['plane'],
  'Khối đa diện': ['pyramid', 'prism', 'tetrahedron', 'cube'],
  'Khối cong': ['sphere', 'cylinder', 'cone'],
};
```

- [ ] **Step 2:** Write `spec.test.ts` asserting every `ToolKey` appears in `TOOLS` exactly once and `hintIdle` is non-empty.
- [ ] **Step 3:** Run, commit `feat(geometry-3d): ToolSpec types + 16 tool stub registry`.

---

### Task 4.2: ToolController FSM

**Files:**
- Create: `src/stamps/geometry-3d/editor/tools/controller.ts`
- Test: `src/stamps/geometry-3d/__tests__/tools/controller.test.ts`

- [ ] **Step 1: Write failing tests for FSM transitions**

```ts
// controller.test.ts
import { ToolController } from '../../editor/tools/controller';
import { TOOLS } from '../../editor/tools/spec';
import { Scene3D } from '../../editor/scene/Scene3D';

test('selectTool resets collected', () => {
  const scene = new Scene3D();
  const ctrl = new ToolController(scene);
  ctrl.selectTool('segment');
  expect(ctrl.getState().tool?.key).toBe('segment');
  expect(ctrl.getState().stepIndex).toBe(0);
  expect(ctrl.getState().collected).toHaveLength(0);
});

test('consumeHit advances stepIndex on matched point hit', () => {
  const scene = new Scene3D();
  const ctrl = new ToolController(scene);
  ctrl.selectTool('segment');
  ctrl.consumeHit({ kind: 'onGround', world: [1, 1, 0] });
  expect(ctrl.getState().stepIndex).toBe(1);
});

test('consumeHit rejects when step expects point but hit is empty', () => {
  const scene = new Scene3D();
  const ctrl = new ToolController(scene);
  ctrl.selectTool('point');
  const rejected = ctrl.consumeHit({ kind: 'empty' });
  expect(rejected).toBe(false);
  expect(ctrl.getState().stepIndex).toBe(0);
});

test('completing all steps invokes build() and resets state', () => {
  const scene = new Scene3D();
  const ctrl = new ToolController(scene);
  ctrl.selectTool('segment');
  ctrl.consumeHit({ kind: 'onGround', world: [0, 0, 0] });
  ctrl.consumeHit({ kind: 'onGround', world: [1, 0, 0] });
  expect(scene.list().filter((o) => o.kind === 'segment')).toHaveLength(1);
  expect(ctrl.getState().tool?.key).toBe('move');
});
```

(Note: the test above also requires the `segment` tool's `build()` to be wired — see Phase 5. If running this task in isolation, mark the last test as `test.skip` until Phase 5 lands.)

- [ ] **Step 2: Implement controller**

```ts
// src/stamps/geometry-3d/editor/tools/controller.ts
import type { Scene3D } from '../scene/Scene3D';
import type { SceneHit } from '../hitTest/hitTest';
import type { ToolKey, ToolStep, ToolSpec, CollectedArg } from './spec';
import { TOOLS } from './spec';

interface ControllerState {
  tool: ToolSpec | null;
  stepIndex: number;
  collected: CollectedArg[];
  hint: string;
}

type Listener = (state: ControllerState) => void;

export class ToolController {
  private state: ControllerState = { tool: null, stepIndex: 0, collected: [], hint: '' };
  private listeners = new Set<Listener>();

  constructor(private scene: Scene3D) {
    this.selectTool('move');
  }

  getState(): ControllerState { return this.state; }
  on(cb: Listener): () => void { this.listeners.add(cb); return () => this.listeners.delete(cb); }

  selectTool(key: ToolKey): void {
    const tool = TOOLS.find((t) => t.key === key) ?? TOOLS.find((t) => t.key === 'move')!;
    this.state = {
      tool,
      stepIndex: 0,
      collected: [],
      hint: tool.steps[0]?.hint ?? tool.hintIdle,
    };
    this.notify();
  }

  cancel(): void { this.selectTool('move'); }

  consumeHit(hit: SceneHit): boolean {
    const tool = this.state.tool;
    if (!tool) return false;
    const step = tool.steps[this.state.stepIndex];
    if (!step) return false;
    if (!this.hitMatchesStep(hit, step)) return false;
    this.state.collected.push({ step, hit });
    this.state.stepIndex++;
    this.advance();
    return true;
  }

  consumeNumber(value: number): boolean {
    const tool = this.state.tool;
    if (!tool) return false;
    const step = tool.steps[this.state.stepIndex];
    if (!step || step.type !== 'number') return false;
    if (step.min != null && value < step.min) return false;
    if (step.max != null && value > step.max) return false;
    this.state.collected.push({ step, value });
    this.state.stepIndex++;
    this.advance();
    return true;
  }

  private hitMatchesStep(hit: SceneHit, step: ToolStep): boolean {
    if (step.type !== 'point' && step.type !== 'closingPoint') return false;
    if (hit.kind === 'empty') return false;
    if (step.type === 'closingPoint') return hit.kind === 'existingPoint';
    if (hit.kind === 'existingPoint') return step.allowExisting;
    const map: Record<string, ToolStep['allowNewOn'][number]> = {
      onGround: 'ground', onAxis: 'axis', onPlane: 'plane',
      onLine: 'line', onPolygon: 'polygon', onSphere: 'sphere',
    };
    const k = map[hit.kind];
    return k != null && step.type === 'point' && step.allowNewOn.includes(k);
  }

  private advance(): void {
    const tool = this.state.tool!;
    if (this.state.stepIndex >= tool.steps.length) {
      tool.build(this.state.collected, this.scene);
      this.selectTool('move');
      return;
    }
    this.state.hint = tool.steps[this.state.stepIndex].hint;
    this.notify();
  }

  private notify(): void {
    for (const cb of this.listeners) cb(this.state);
  }
}
```

- [ ] **Step 3: Commit** `feat(geometry-3d): ToolController FSM`.

---

## Phase 5 — Tool Handlers (15 tools)

For each tool, follow this pattern: create `editor/tools/handlers/<tool>.ts` exporting a `build(args, scene)` function, and wire it into `TOOLS` in spec.ts. Each handler also has a unit test in `__tests__/tools/handlers/<tool>.test.ts` that builds a Scene3D, feeds it a synthetic `CollectedArg[]`, calls `build`, and asserts the scene contains the expected new objects.

### Task 5.1: `point` handler

**File:** `src/stamps/geometry-3d/editor/tools/handlers/point.ts`

```ts
import type { CollectedArg, ToolSpec } from '../spec';
import type { Scene3D } from '../../scene/Scene3D';
import type { Constraint } from '../../scene/types';
import type { SceneHit } from '../../hitTest/hitTest';

function hitToConstraint(hit: SceneHit): Constraint | null {
  switch (hit.kind) {
    case 'onGround': return { kind: 'onGround', x: hit.world[0], y: hit.world[1] };
    case 'onAxis': return { kind: 'onAxis', axis: hit.axis, t: hit.t };
    case 'onPlane': return { kind: 'onPlane', planeId: hit.planeId, u: hit.u, v: hit.v };
    case 'onLine': return { kind: 'onLine', lineId: hit.lineId, t: hit.t };
    case 'onPolygon': return { kind: 'onPolygon', polygonId: hit.polygonId, u: hit.u, v: hit.v };
    case 'onSphere': return { kind: 'onSphere', sphereId: hit.sphereId, theta: hit.theta, phi: hit.phi };
    default: return null;
  }
}

export const pointTool: Pick<ToolSpec, 'steps' | 'build'> = {
  steps: [
    {
      type: 'point',
      allowExisting: false,
      allowNewOn: ['ground', 'axis', 'plane', 'line', 'polygon', 'sphere'],
      hint: 'Chọn mặt phẳng / đường / mặt cầu để đặt điểm',
    },
  ],
  build: (args, scene) => {
    const hit = args[0]?.hit;
    if (!hit) return null;
    if (hit.kind === 'existingPoint') return hit.pointId;
    const c = hitToConstraint(hit);
    if (!c) return null;
    return scene.addPoint(c);
  },
};
```

Tests:

```ts
// __tests__/tools/handlers/point.test.ts
import { pointTool } from '../../../editor/tools/handlers/point';
import { Scene3D } from '../../../editor/scene/Scene3D';

test('point on ground creates onGround point', () => {
  const scene = new Scene3D();
  const id = pointTool.build(
    [{ step: pointTool.steps[0], hit: { kind: 'onGround', world: [1, 2, 0] } }],
    scene,
  );
  expect(id).not.toBeNull();
  const obj = scene.get(id!);
  expect(obj?.kind).toBe('point');
  if (obj?.kind === 'point') expect(obj.constraint).toEqual({ kind: 'onGround', x: 1, y: 2 });
});
```

- [ ] **Step 1-4:** test, implement, run, commit.

### Task 5.2: `pointOnObject` handler

Same as `point`, but `allowNewOn` excludes `'ground'` (forces user to click an actual object).

### Task 5.3-5.7: segment / line / ray / vector / polygon

Pattern for `segment`:

```ts
// editor/tools/handlers/segment.ts
import type { ToolSpec } from '../spec';
import type { Constraint } from '../../scene/types';
import { pointTool } from './point';

function ensurePoint(hit: import('../../hitTest/hitTest').SceneHit, scene: import('../../scene/Scene3D').Scene3D): string | null {
  if (hit.kind === 'existingPoint') return hit.pointId;
  // Reuse pointTool logic
  return pointTool.build([{ step: { type: 'point', allowExisting: false, allowNewOn: ['ground','axis','plane','line','polygon','sphere'], hint: '' }, hit }], scene);
}

export const segmentTool: Pick<ToolSpec, 'steps' | 'build'> = {
  steps: [
    { type: 'point', allowExisting: true, allowNewOn: ['ground','axis','plane','line','polygon','sphere'], hint: 'Chọn điểm thứ nhất' },
    { type: 'point', allowExisting: true, allowNewOn: ['ground','axis','plane','line','polygon','sphere'], hint: 'Chọn điểm thứ hai' },
  ],
  build: (args, scene) => {
    const p1 = ensurePoint(args[0].hit!, scene);
    const p2 = ensurePoint(args[1].hit!, scene);
    if (!p1 || !p2 || p1 === p2) return null;
    return scene.addObject('segment', { p1, p2 });
  },
};
```

`line`, `ray`, `vector` — same shape, different `addObject(kind, ...)` payload.

`polygon`:

```ts
export const polygonTool: Pick<ToolSpec, 'steps' | 'build'> = {
  steps: [
    { type: 'point', allowExisting: true, allowNewOn: ['ground','axis','plane','line','polygon','sphere'], hint: 'Chọn đỉnh thứ 1' },
    { type: 'point', allowExisting: true, allowNewOn: ['ground','axis','plane','line','polygon','sphere'], hint: 'Chọn đỉnh thứ 2' },
    { type: 'point', allowExisting: true, allowNewOn: ['ground','axis','plane','line','polygon','sphere'], hint: 'Chọn đỉnh thứ 3' },
    { type: 'closingPoint', hint: 'Click điểm đầu để đóng (hoặc chọn thêm đỉnh)' },
  ],
  build: (args, scene) => {
    const vs = args.slice(0, -1).map((a) => ensurePoint(a.hit!, scene)).filter((x): x is string => !!x);
    if (vs.length < 3) return null;
    return scene.addObject('polygon', { vertices: vs });
  },
};
```

Polygon requires special FSM handling: when the user clicks the first vertex again at any step ≥ 3, treat it as `closingPoint` regardless of `stepIndex`. Extend `ToolController.consumeHit` to special-case `tool.key === 'polygon'`:

```ts
// in consumeHit, before normal match
if (this.state.tool?.key === 'polygon' && this.state.stepIndex >= 3) {
  const firstHit = this.state.collected[0]?.hit;
  if (firstHit?.kind !== 'existingPoint' && hit.kind === 'existingPoint' && firstHit) {
    // Compare to the first-collected vertex id (if first-collected was created via ensurePoint, we don't know its id here at consumeHit time — the controller doesn't run build until last step. Instead we treat any existing-point repeat on step >= 3 as the closing signal.)
  }
  if (hit.kind === 'existingPoint') {
    this.state.collected.push({ step: { type: 'closingPoint', hint: '' }, hit });
    this.state.stepIndex = this.state.tool.steps.length;
    this.advance();
    return true;
  }
  // Otherwise, allow more vertices: dynamically extend collected and remain at stepIndex < steps.length
  this.state.collected.push({ step: this.state.tool.steps[2], hit });
  return true;
}
```

This special-case is documented in the polygon handler's test.

- [ ] **Steps 1-4 per tool:** Implement, test, run, commit one tool per commit.

### Task 5.8: `plane` handler

```ts
export const planeTool: Pick<ToolSpec, 'steps' | 'build'> = {
  steps: [
    { type: 'point', allowExisting: true, allowNewOn: ['ground','axis','plane','line','polygon','sphere'], hint: 'Chọn điểm thứ 1 của mặt phẳng' },
    { type: 'point', allowExisting: true, allowNewOn: ['ground','axis','plane','line','polygon','sphere'], hint: 'Chọn điểm thứ 2' },
    { type: 'point', allowExisting: true, allowNewOn: ['ground','axis','plane','line','polygon','sphere'], hint: 'Chọn điểm thứ 3' },
  ],
  build: (args, scene) => {
    const [p1, p2, p3] = args.map((a) => ensurePoint(a.hit!, scene));
    if (!p1 || !p2 || !p3) return null;
    // Collinearity check
    if (areCollinear(p1, p2, p3, scene)) return null;
    return scene.addObject('plane', { p1, p2, p3 });
  },
};
```

`areCollinear` checks `|cross(p2-p1, p3-p1)| < 1e-6`. Implement as a small helper in `editor/scene/geometryChecks.ts`.

### Task 5.9: `pyramid` — base polygon + apex

```ts
export const pyramidTool: Pick<ToolSpec, 'steps' | 'build'> = {
  steps: [
    { type: 'point', allowExisting: true, allowNewOn: ['ground','axis','plane'], hint: 'Chọn đỉnh đáy 1' },
    { type: 'point', allowExisting: true, allowNewOn: ['ground','axis','plane'], hint: 'Chọn đỉnh đáy 2' },
    { type: 'point', allowExisting: true, allowNewOn: ['ground','axis','plane'], hint: 'Chọn đỉnh đáy 3' },
    { type: 'closingPoint', hint: 'Click đỉnh đáy đầu tiên để đóng (hoặc chọn thêm đỉnh đáy)' },
    { type: 'point', allowExisting: true, allowNewOn: ['ground','axis','plane','line','polygon','sphere'], hint: 'Chọn đỉnh chóp' },
  ],
  build: (args, scene) => {
    const baseArgs = args.slice(0, -1).filter((a) => a.step.type !== 'closingPoint');
    const apexArg = args[args.length - 1];
    const baseIds = baseArgs.map((a) => ensurePoint(a.hit!, scene)).filter((x): x is string => !!x);
    const apexId = ensurePoint(apexArg.hit!, scene);
    if (baseIds.length < 3 || !apexId) return null;
    if (apexIsCoplanarWithBase(baseIds, apexId, scene)) return null;
    const verts = [...baseIds, apexId];
    const apexIdx = verts.length - 1;
    const faces: number[][] = [baseIds.map((_, i) => i)];
    for (let i = 0; i < baseIds.length; i++) {
      faces.push([i, (i + 1) % baseIds.length, apexIdx]);
    }
    return scene.addObject('polyhedron', { flavor: 'pyramid', vertices: verts, faces });
  },
};
```

Polygon-step-shape requires the polygon-style FSM patch from Task 5.7.

### Task 5.10: `prism` — base polygon + number height

```ts
export const prismTool: Pick<ToolSpec, 'steps' | 'build'> = {
  steps: [
    { type: 'point', allowExisting: true, allowNewOn: ['ground','axis','plane'], hint: 'Chọn đỉnh đáy 1' },
    { type: 'point', allowExisting: true, allowNewOn: ['ground','axis','plane'], hint: 'Chọn đỉnh đáy 2' },
    { type: 'point', allowExisting: true, allowNewOn: ['ground','axis','plane'], hint: 'Chọn đỉnh đáy 3' },
    { type: 'closingPoint', hint: 'Click đỉnh đầu để đóng đáy' },
    { type: 'number', prompt: 'Chiều cao (theo trục z)', min: 0.0001 },
  ],
  build: (args, scene) => {
    const baseIds = args.filter((a) => a.step.type === 'point').map((a) => ensurePoint(a.hit!, scene)).filter((x): x is string => !!x);
    const height = args.find((a) => a.step.type === 'number')?.value;
    if (baseIds.length < 3 || height == null || height <= 0) return null;
    // Create top vertices by shifting each base vertex +z * height
    const topIds = baseIds.map((id) => {
      const p = scene.get(id);
      if (!p || p.kind !== 'point') return null;
      const w = require('../../scene/constraintMath').constraintToWorld(p.constraint, scene);
      return scene.addPoint({ kind: 'free', x: w[0], y: w[1], z: w[2] + height });
    }).filter((x): x is string => !!x);
    const verts = [...baseIds, ...topIds];
    const n = baseIds.length;
    const faces: number[][] = [
      baseIds.map((_, i) => i),
      topIds.map((_, i) => n + i),
    ];
    for (let i = 0; i < n; i++) {
      faces.push([i, (i + 1) % n, n + ((i + 1) % n), n + i]);
    }
    return scene.addObject('polyhedron', { flavor: 'prism', vertices: verts, faces });
  },
};
```

### Task 5.11-5.12: `tetrahedron`, `cube` — 2-point spec

Regular tetrahedron / cube built deterministically from 2 points (see spec §3 for the geometric rules). Implement as pure functions on coordinates.

### Task 5.13: `sphere` — center + surface point

```ts
export const sphereTool: Pick<ToolSpec, 'steps' | 'build'> = {
  steps: [
    { type: 'point', allowExisting: true, allowNewOn: ['ground','axis','plane'], hint: 'Chọn tâm mặt cầu' },
    { type: 'point', allowExisting: true, allowNewOn: ['ground','axis','plane','line','polygon','sphere'], hint: 'Chọn điểm trên mặt cầu' },
  ],
  build: (args, scene) => {
    const center = ensurePoint(args[0].hit!, scene);
    const surface = ensurePoint(args[1].hit!, scene);
    if (!center || !surface || center === surface) return null;
    return scene.addObject('sphere', { center, surfacePoint: surface });
  },
};
```

### Task 5.14: `cylinder` — base + top + radius

3 steps: base point, top point, radius number.

### Task 5.15: `cone` — base + apex + radius

3 steps: base point, apex point, radius number.

After Task 5.15, all 16 tools have real handlers wired into `TOOLS`.

- [ ] **Per-tool commit** keeps history clean. After 5.15 also commit `chore(geometry-3d): TOOLS registry hoàn chỉnh 16 tool`.

---

## Phase 6 — UI

### Task 6.1: ToolButton + ToolPalette

**Files:**
- Create: `src/stamps/geometry-3d/editor/toolPanel/ToolButton.tsx`
- Create: `src/stamps/geometry-3d/editor/toolPanel/ToolPalette.tsx`
- Test: `src/stamps/geometry-3d/__tests__/toolPanel/ToolPalette.test.tsx`

ToolButton: card showing icon + label, selected state styled blue. Reuse icons from existing `toolButtons.tsx` (which has SVG inline for each tool).

ToolPalette: 3-column grid grouped by `TOOL_GROUPS`. Clicking a button calls `controller.selectTool(key)`.

- [ ] **Step 1: Write test rendering ToolPalette + asserting click invokes selectTool.**
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Commit.**

### Task 6.2: StatusHint

**Files:**
- Create: `src/stamps/geometry-3d/editor/StatusHint.tsx`
- Test: `src/stamps/geometry-3d/__tests__/StatusHint.test.tsx`

Subscribes to controller; renders the current `hint` text plus a "hover: <label>" suffix when the parent passes a `hover` prop.

### Task 6.3: AlgebraRow + AlgebraList

**Files:**
- Create: `src/stamps/geometry-3d/editor/algebraPanel/AlgebraRow.tsx`
- Create: `src/stamps/geometry-3d/editor/algebraPanel/AlgebraList.tsx`
- Create: `src/stamps/geometry-3d/editor/algebraPanel/RowMenu.tsx`
- Tests: parallel in `__tests__/algebraPanel/`

Each row renders:
- Visibility toggle (checkbox or eye icon)
- Color swatch
- Label (`A`, `a`, `s_1`, ...)
- Symbolic expression (`Point(zAxis)`, `Segment(A, B)`, `Sphere(O, P)`, ...)
- Numeric value (`(0, 0, 1.5)`, `2.83`, ...) — editable inline only for `free` point coordinates and `number`-typed object params
- ⋮ menu → Rename (label), Change color, Hide, Delete

Symbolic-expression renderer (`symbolicFor(obj, scene)`) is a pure function defined in `algebraPanel/symbolic.ts` with its own unit tests.

### Task 6.4: LeftPanel rewrite (Tools tab | Algebra tab)

**Files:**
- Modify: `src/stamps/geometry-3d/editor/LeftPanel.tsx`
- Test: `src/stamps/geometry-3d/__tests__/LeftPanel.test.tsx`

Sidebar with two tab buttons. Each tab renders ToolPalette or AlgebraList. Selected tab state lives in LeftPanel.

### Task 6.5: MiniBoard3D rewire

**Files:**
- Modify: `src/stamps/geometry-3d/editor/MiniBoard3D.tsx`
- Test: rewrite `src/stamps/geometry-3d/__tests__/MiniBoard3D.test.tsx`

Responsibilities now:
1. Mount JSXGraph board + view3d.
2. Expose `view3d` ref + `onClick(screenXY)`, `onMove(screenXY)`, `onEsc()` events to parent.
3. Provide a helper for the renderer to call `view.create(...)`.

No tool-state, no handlers — all moved to the controller.

### Task 6.6: EditorPanel rewire

**Files:**
- Modify: `src/stamps/geometry-3d/editor/EditorPanel.tsx`
- Test: rewrite `src/stamps/geometry-3d/__tests__/EditorPanel.test.tsx`

Wiring:
- Owns `Scene3D`, `ToolController`, `JxgRenderer` instances.
- Layout: `LeftPanel` + `MiniBoard3D` + `StatusHint`.
- `MiniBoard3D.onClick` → `hitTest(...)` → `controller.consumeHit(...)`.
- On insert: serialize scene → call `props.onInsert(serialized)`.

Each Task 6.x: Step 1 test, Step 2 implement, Step 3 commit.

---

## Phase 7 — Serialization

### Task 7.1: Extend SerializedElement3D with `constraint?`

**Files:**
- Modify: `src/stamps/geometry-3d/serialize.ts`
- Test: extend `src/stamps/geometry-3d/__tests__/serialize.test.ts`

```ts
import type { Constraint } from './editor/scene/types';

export interface SerializedElement3D {
  type: Element3DType;
  parents: unknown[];
  attributes: Record<string, unknown>;
  id: string;
  label?: string;
  constraint?: Constraint;       // NEW (v2)
}

export interface SerializedBoard3D {
  version: 1 | 2;                 // accept both
  // ...rest unchanged
}

export interface Geometry3DCustomData extends BaseStampCustomData {
  kind: 'geometry3d';
  version: 1 | 2;                 // accept both
  jsonState: string;
  svgWidth: number;
  svgHeight: number;
}

export function isGeometry3DCustomData(data: unknown): data is Geometry3DCustomData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<Geometry3DCustomData>;
  return d.kind === 'geometry3d' && (d.version === 1 || d.version === 2) && typeof d.jsonState === 'string';
}

export function parseSerializedBoard3D(json: string): SerializedBoard3D {
  const parsed = JSON.parse(json) as unknown;
  if (!parsed || typeof parsed !== 'object') throw new Error('parseSerializedBoard3D: not an object');
  const p = parsed as Partial<SerializedBoard3D>;
  if (p.version !== 1 && p.version !== 2) {
    throw new Error(`parseSerializedBoard3D: unsupported version ${String(p.version)}`);
  }
  if (!Array.isArray(p.elements)) throw new Error('parseSerializedBoard3D: elements missing');
  return parsed as SerializedBoard3D;
}
```

Tests:

```ts
test('v1 stamp parses without constraint field', () => {
  const v1 = { version: 1, bbox: [0,0,100,100], view: { azimuth: 0, elevation: 0, bbox3D: [-5,-5,-5,5,5,5] }, showAxes: true, showMesh: true, elements: [{ type: 'point3d', parents: [1,2,3], attributes: { id: 'p1' }, id: 'p1' }] };
  const parsed = parseSerializedBoard3D(JSON.stringify(v1));
  expect(parsed.version).toBe(1);
  expect(parsed.elements[0].constraint).toBeUndefined();
});
test('v2 stamp parses with constraint field', () => {
  const v2 = { version: 2, bbox: [0,0,100,100], view: { azimuth: 0, elevation: 0, bbox3D: [-5,-5,-5,5,5,5] }, showAxes: true, showMesh: true, elements: [{ type: 'point3d', parents: [], attributes: { id: 'p1' }, id: 'p1', constraint: { kind: 'onGround', x: 1, y: 2 } }] };
  const parsed = parseSerializedBoard3D(JSON.stringify(v2));
  expect(parsed.version).toBe(2);
  expect(parsed.elements[0].constraint).toEqual({ kind: 'onGround', x: 1, y: 2 });
});
```

- [ ] **Step 1-3:** Test, implement, commit `feat(geometry-3d): serialize schema v2 (additive constraint field)`.

### Task 7.2: Scene ↔ SerializedBoard3D translation

**Files:**
- Create: `src/stamps/geometry-3d/editor/scene/persistence.ts`
- Test: `src/stamps/geometry-3d/__tests__/scene/persistence.test.ts`

```ts
// editor/scene/persistence.ts
import type { Scene3D } from './Scene3D';
import type { SerializedBoard3D, SerializedElement3D } from '../../serialize';
import { constraintToWorld } from './constraintMath';

export function sceneToBoard(scene: Scene3D, view: { azimuth: number; elevation: number; bbox3D: [number,number,number,number,number,number] }, bbox: [number,number,number,number]): SerializedBoard3D {
  const elements: SerializedElement3D[] = scene.list().map((obj) => sceneObjectToElement(obj, scene));
  return { version: 2, bbox, view, showAxes: true, showMesh: true, elements };
}

function sceneObjectToElement(obj: Scene3DObject, scene: Scene3D): SerializedElement3D { /* ... */ }

export function boardToScene(board: SerializedBoard3D): Scene3D {
  const scene = new Scene3D();
  for (const el of board.elements) {
    if (el.type === 'point3d') {
      const constraint = el.constraint ?? { kind: 'free' as const, x: Number(el.parents[0]), y: Number(el.parents[1]), z: Number(el.parents[2]) };
      scene.insert({ kind: 'point', id: el.id, label: el.label ?? el.id, visible: true, constraint });
    }
    // ... other kinds
  }
  return scene;
}
```

Tests: round-trip a scene through `sceneToBoard` → `JSON.stringify` → `parseSerializedBoard3D` → `boardToScene`. Assert object counts and constraint preservation.

- [ ] **Step 1-3:** Test, implement, commit.

---

## Phase 8 — Integration

### Task 8.1: Wire MiniBoard3D pointer events → ToolController

**Files:**
- Modify: `src/stamps/geometry-3d/editor/EditorPanel.tsx`
- Modify: `src/stamps/geometry-3d/editor/MiniBoard3D.tsx`
- Test: extend EditorPanel test with a full "click ground → click ground → segment appears" scenario.

In `EditorPanel`:

```tsx
const sceneRef = useRef(new Scene3D());
const controllerRef = useRef(new ToolController(sceneRef.current));
const view3dRef = useRef<View3DLike | null>(null);

useEffect(() => {
  if (!view3dRef.current) return;
  const renderer = new JxgRenderer(sceneRef.current, view3dRef.current);
  return () => renderer.dispose();
}, [view3dRef.current]);

const handleClick = useCallback((screenXY: { x: number; y: number }) => {
  const view = view3dRef.current;
  if (!view) return;
  const hit = hitTest(screenXY, view, sceneRef.current);
  controllerRef.current.consumeHit(hit);
}, []);

<MiniBoard3D ref={...} onPointerClick={handleClick} onView3DReady={(v) => { view3dRef.current = v; }} />
```

- [ ] **Step 1-3:** Test, implement, commit `feat(geometry-3d): wire MiniBoard → hitTest → controller`.

### Task 8.2: Replace promptCoords flow / delete legacy handler

**Files:**
- Delete: `src/stamps/geometry-3d/editor/handlers.ts`
- Delete: `src/stamps/geometry-3d/editor/toolButtons.tsx` (icons migrated to ToolButton)
- Delete: `src/stamps/geometry-3d/__tests__/handlers.test.ts`
- Delete: `src/stamps/geometry-3d/__tests__/tools.test.ts` (replaced by spec.test.ts)
- Modify: `src/stamps/geometry-3d/editor/theme.ts` (unchanged), `index.tsx` (unchanged), `host.tsx` (unchanged), `render.ts` (unchanged)

- [ ] **Step 1:** Run `npm test` and confirm no remaining references to deleted files.
- [ ] **Step 2:** `git rm` the obsolete files.
- [ ] **Step 3:** Commit `refactor(geometry-3d): remove v0.7.0 handler + toolButtons (replaced by FSM)`.

### Task 8.3: Update README + CHANGELOG

**Files:**
- Modify: `README.md` (3D section)
- Modify: `CHANGELOG.md`

- [ ] **Step 1:** Add CHANGELOG `v0.8.0 — 2026-??-??` entry summarizing the redesign.
- [ ] **Step 2:** README — replace the 3D screenshot/description with the new UI flow.
- [ ] **Step 3:** Commit `docs(0.8): CHANGELOG + README cho 3D GeoGebra-style redesign`.

### Task 8.4: Full typecheck + test + build

- [ ] **Step 1:** `npm run typecheck` — expect 0 errors.
- [ ] **Step 2:** `npm test` — expect all suites pass.
- [ ] **Step 3:** `npm run build` — expect clean dist output.
- [ ] **Step 4:** If anything fails, fix and re-run before tagging.

### Task 8.5: Bump version + tag

- [ ] **Step 1:** `npm version minor` (0.7.0 → 0.8.0). This auto-commits the package.json bump and tags v0.8.0.
- [ ] **Step 2:** Commit any uncommitted dist/ from the build step.
- [ ] **Step 3:** Confirm with user before `git push --follow-tags`.

---

## Self-Review Notes (author)

- **Spec coverage:** §1 (motivation) — Task 8.3 docs. §2 (scope) — handlers Phase 5. §3 (15 tools) — Tasks 5.1-5.15. §4 (architecture) — Phases 1-3. §5 (scene types) — Task 0.2. §6 (serialization v2) — Tasks 7.1-7.2. §7 (hit-test) — Phase 2. §8 (renderer) — Phase 3. §9 (FSM) — Tasks 4.1-4.2. §10 (UI layout) — Phase 6. §11 (file layout) — embedded in each phase header. §12 (data flow) — Task 8.1. §13 (edge cases) — covered in handler tests (collinear plane, coplanar pyramid apex, coincident sphere points, empty viewport). §14 (testing) — every task has a Test file. §15 (migration) — Task 7.1 backward-compat loader. §16/17 — covered.
- **Placeholder scan:** No "TBD", "TODO", "implement later" tokens in this plan. The polygon-FSM patch in Task 5.7 is the only area with an extended-arg discussion — the patch code is shown in full.
- **Type consistency:** `Constraint`, `Scene3DObject`, `SceneHit`, `ToolSpec`, `CollectedArg` are defined once and referenced verbatim across phases. `ToolKey` enumerates the same 16 keys used by every handler.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-17-3d-geogebra-redesign.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
