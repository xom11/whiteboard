# Scene Refactor — Phase 1 (3D + foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây `src/core/scene/` — module pure TypeScript chứa immutable store + action dispatch + kind registry + per-kind schema migrations. Port stamp 3D sang dùng store mới. Xoá `Scene3D` class + `persistence.ts` + `labels.ts` cũ. Release v0.12.0.

**Architecture:**
- Pure core không phụ thuộc JSXGraph (chạy được trong Node, test thuần không cần jsdom).
- Render layer (`src/core/scene/render/JxgRenderer3D.ts`) là adapter duy nhất biết JSXGraph view3d — subscribe store, diff state, apply qua `kind.render(obj, ctx)`.
- Mỗi kind 1 file ở `src/core/scene/kinds/` với `KindDef { schemaVersion, migrate, dependsOn, describe, render, ... }`.
- Immer cho immutable update + structural sharing → snapshot history rẻ.
- Bỏ kiến trúc cũ hoàn toàn — không giữ song song, không backcompat file cũ.

**Tech Stack:** TypeScript strict, React 18, Immer, JSXGraph 1.12, Jest 29 + jsdom + ts-jest, Playwright (E2E harness sẵn có).

**Spec reference:** `docs/superpowers/specs/2026-05-20-scene-v2-design.md`

**Out of scope** (sẽ ở Phase 2/3):
- 2D MiniBoard refactor (Phase 2).
- Object list panel + action recorder demo (Phase 3).

---

## File Structure

### Files created

```
src/core/scene/types.ts                              # State, Action, KindDef, RenderCtx, SceneObject
src/core/scene/store.ts                              # createStore() — getState/dispatch/subscribe/undo/redo/transaction
src/core/scene/reducer.ts                            # reduce(state, action): State
src/core/scene/registry.ts                          # registerKind / getKind / listKinds
src/core/scene/selectors.ts                         # listObjects, byKind, dependentsOf, nextLabel
src/core/scene/migrations/runMigrations.ts          # migrateState(raw): State
src/core/scene/migrations/state.ts                  # state-level migration table
src/core/scene/kinds/index.ts                       # barrel — import = register
src/core/scene/kinds/point3d.ts                     # KindDef cho point3d
src/core/scene/kinds/segment3d.ts                   # KindDef cho segment3d
src/core/scene/kinds/line3d.ts                      # KindDef cho line3d
src/core/scene/kinds/ray3d.ts                       # KindDef cho ray3d
src/core/scene/kinds/vector3d.ts                    # KindDef cho vector3d
src/core/scene/kinds/plane3d.ts                     # KindDef cho plane3d
src/core/scene/kinds/polygon3d.ts                   # KindDef cho polygon3d
src/core/scene/kinds/sphere3d.ts                    # KindDef cho sphere3d
src/core/scene/kinds/polyhedron3d.ts                # KindDef cho polyhedron3d
src/core/scene/kinds/cylinder3d.ts                  # KindDef cho cylinder3d
src/core/scene/kinds/cone3d.ts                      # KindDef cho cone3d
src/core/scene/render/types.ts                      # RenderCtx (3D-specific helper types)
src/core/scene/render/JxgRenderer3D.ts              # subscribe store → diff → JXG view3d
src/core/scene/index.ts                             # public barrel
src/core/scene/__tests__/store.test.ts
src/core/scene/__tests__/reducer.test.ts
src/core/scene/__tests__/registry.test.ts
src/core/scene/__tests__/selectors.test.ts
src/core/scene/__tests__/migrations.test.ts
src/core/scene/kinds/__tests__/point3d.test.ts
src/core/scene/kinds/__tests__/segment3d.test.ts
src/core/scene/kinds/__tests__/line3d.test.ts
src/core/scene/kinds/__tests__/ray3d.test.ts
src/core/scene/kinds/__tests__/vector3d.test.ts
src/core/scene/kinds/__tests__/plane3d.test.ts
src/core/scene/kinds/__tests__/polygon3d.test.ts
src/core/scene/kinds/__tests__/sphere3d.test.ts
src/core/scene/kinds/__tests__/polyhedron3d.test.ts
src/core/scene/kinds/__tests__/cylinder3d.test.ts
src/core/scene/kinds/__tests__/cone3d.test.ts
src/core/scene/render/__tests__/JxgRenderer3D.test.ts
```

### Files modified

```
package.json                                                 # add immer dep
src/stamps/geometry-3d/serialize.ts                          # serialize/deserialize state shape mới
src/stamps/geometry-3d/editor/EditorPanel.tsx                # owns store, render qua JxgRenderer3D
src/stamps/geometry-3d/editor/MiniBoard3D.tsx                # gọi store.dispatch thay vì scene.add*
src/stamps/geometry-3d/editor/LeftPanel.tsx                  # đọc state.objects qua selectors
src/stamps/geometry-3d/editor/tools/handlers/*.ts            # dispatch actions
src/stamps/geometry-3d/editor/hitTest/*.ts                   # nhận State thay vì Scene3D
src/stamps/geometry-3d/editor/algebraPanel/*                 # đọc qua describe/measure
src/stamps/geometry-3d/host.tsx                              # wire onUndo/onRedo từ store
src/index.ts                                                  # (optional) export public scene API nếu cần
```

### Files deleted

```
src/stamps/geometry-3d/editor/scene/Scene3D.ts
src/stamps/geometry-3d/editor/scene/persistence.ts
src/stamps/geometry-3d/editor/scene/labels.ts
src/stamps/geometry-3d/editor/scene/types.ts                  # (move types vào core/scene/kinds/3d-constraint.ts)
src/stamps/geometry-3d/__tests__/scene/Scene3D.test.ts        # tests cũ → viết lại trong core/scene
```

### Files kept nhưng nội dung gần như viết lại

```
src/stamps/geometry-3d/editor/scene/constraintMath.ts        # math thuần, giữ; chỉ đổi import path
src/stamps/geometry-3d/editor/scene/geometryChecks.ts        # giữ
```

---

## PR 1.1 — Core skeleton (không có kind nào)

**Mục tiêu**: types, store, reducer, registry, selectors, migration runner — đủ để Phase tiếp viết kinds vào.

### Task 1.1.1: Thêm `immer` vào dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1.1.1.1: Cài immer**

Run: `npm install immer@10`
Expected: package.json có `"immer": "^10.x.x"` ở `dependencies`. Không lỗi.

- [ ] **Step 1.1.1.2: Verify**

Run: `node -e "console.log(require('immer').produce)"`
Expected: in ra `[Function: produce]`.

- [ ] **Step 1.1.1.3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): thêm immer cho scene store immutable update"
```

---

### Task 1.1.2: Tạo `types.ts`

**Files:**
- Create: `src/core/scene/types.ts`

Types thuần, không có logic → không cần test riêng.

- [ ] **Step 1.1.2.1: Tạo file types.ts**

```ts
// src/core/scene/types.ts

export type SceneObject<A = Record<string, unknown>> = {
  id: string;
  kind: string;
  label: string;
  visible: boolean;
  locked: boolean;
  layer: string;
  schemaVersion: number;
  attrs: A;
};

export type State = {
  readonly objects: Readonly<Record<string, SceneObject>>;
  readonly order: readonly string[];
  readonly counter: number;
  readonly meta: { readonly domain: '2d' | '3d'; readonly version: number };
};

export type Action =
  | { type: 'ADD'; payload: { obj: SceneObject } }
  | { type: 'UPDATE'; payload: { id: string; patch: Partial<Omit<SceneObject, 'id' | 'kind' | 'attrs'>> } }
  | { type: 'UPDATE_ATTRS'; payload: { id: string; patch: Record<string, unknown> } }
  | { type: 'DELETE'; payload: { id: string } }
  | { type: 'RESET' }
  | { type: 'LOAD'; payload: { state: State } }
  | { type: 'TRANSACTION'; payload: { actions: Action[] } };

export type RenderCtx = {
  jxg: unknown;
  resolveRef: (id: string) => unknown;
  defaults: Readonly<Record<string, unknown>>;
};

export type KindDef<A = Record<string, unknown>> = {
  type: string;
  schemaVersion: number;
  migrate: Record<number, (prev: any) => any>;
  validate?: (attrs: A) => void;
  dependsOn: (attrs: A) => string[];
  describe: (obj: SceneObject<A>) => string;
  measure?: (obj: SceneObject<A>, state: State) =>
    | { label: string; value: number }[]
    | null;
  render: (obj: SceneObject<A>, ctx: RenderCtx) => unknown;
  update?: (
    obj: SceneObject<A>,
    prev: SceneObject<A>,
    ctx: RenderCtx,
    existing: unknown,
  ) => void;
};

export const EMPTY_STATE: State = {
  objects: {},
  order: [],
  counter: 0,
  meta: { domain: '3d', version: 1 },
};

export function createEmptyState(domain: '2d' | '3d'): State {
  return { ...EMPTY_STATE, meta: { domain, version: 1 } };
}
```

- [ ] **Step 1.1.2.2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 1.1.2.3: Commit**

```bash
git add src/core/scene/types.ts
git commit -m "feat(scene): types State/Action/KindDef + EMPTY_STATE"
```

---

### Task 1.1.3: Tạo `registry.ts` (TDD)

**Files:**
- Create: `src/core/scene/registry.ts`
- Test: `src/core/scene/__tests__/registry.test.ts`

- [ ] **Step 1.1.3.1: Viết test registry**

```ts
// src/core/scene/__tests__/registry.test.ts
import { registerKind, getKind, listKinds, __clearRegistryForTests } from '../registry';
import type { KindDef } from '../types';

const mkDef = (type: string): KindDef => ({
  type,
  schemaVersion: 1,
  migrate: {},
  dependsOn: () => [],
  describe: () => '',
  render: () => null,
});

describe('registry', () => {
  beforeEach(() => __clearRegistryForTests());

  test('register + getKind trả về định nghĩa', () => {
    const def = mkDef('foo');
    registerKind(def);
    expect(getKind('foo')).toBe(def);
  });

  test('getKind throw nếu kind chưa đăng ký', () => {
    expect(() => getKind('missing')).toThrow(/missing/);
  });

  test('register lần thứ 2 cùng type ghi đè + cảnh báo', () => {
    const a = mkDef('foo');
    const b = mkDef('foo');
    registerKind(a);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    registerKind(b);
    expect(getKind('foo')).toBe(b);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('listKinds trả về tất cả đã đăng ký', () => {
    registerKind(mkDef('a'));
    registerKind(mkDef('b'));
    expect(listKinds().map(k => k.type).sort()).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 1.1.3.2: Chạy test xem fail**

Run: `npm test -- --testPathPattern 'core/scene/__tests__/registry'`
Expected: FAIL — "Cannot find module '../registry'".

- [ ] **Step 1.1.3.3: Implement registry.ts**

```ts
// src/core/scene/registry.ts
import type { KindDef } from './types';

const registry = new Map<string, KindDef>();

export function registerKind(def: KindDef): void {
  if (registry.has(def.type)) {
    console.warn(`[scene] kind "${def.type}" đã được đăng ký — ghi đè định nghĩa cũ`);
  }
  registry.set(def.type, def);
}

export function getKind(type: string): KindDef {
  const def = registry.get(type);
  if (!def) throw new Error(`[scene] unknown kind: ${type}`);
  return def;
}

export function listKinds(): KindDef[] {
  return Array.from(registry.values());
}

// Chỉ dùng cho test — reset registry giữa các test case.
export function __clearRegistryForTests(): void {
  registry.clear();
}
```

- [ ] **Step 1.1.3.4: Verify test pass**

Run: `npm test -- --testPathPattern 'core/scene/__tests__/registry'`
Expected: PASS, 4 tests.

- [ ] **Step 1.1.3.5: Commit**

```bash
git add src/core/scene/registry.ts src/core/scene/__tests__/registry.test.ts
git commit -m "feat(scene): registry với registerKind/getKind/listKinds"
```

---

### Task 1.1.4: Tạo `reducer.ts` (TDD)

**Files:**
- Create: `src/core/scene/reducer.ts`
- Test: `src/core/scene/__tests__/reducer.test.ts`

- [ ] **Step 1.1.4.1: Viết test reducer**

```ts
// src/core/scene/__tests__/reducer.test.ts
import { produce } from 'immer';
import { reduce } from '../reducer';
import { registerKind, __clearRegistryForTests } from '../registry';
import { createEmptyState } from '../types';
import type { SceneObject, KindDef } from '../types';

const mkPoint = (id: string, x = 0, y = 0): SceneObject => ({
  id, kind: 'point', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { x, y },
});

const mkLine = (id: string, p1: string, p2: string): SceneObject => ({
  id, kind: 'line', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { p1, p2 },
});

const pointDef: KindDef = {
  type: 'point', schemaVersion: 1, migrate: {},
  dependsOn: () => [], describe: () => '', render: () => null,
};
const lineDef: KindDef = {
  type: 'line', schemaVersion: 1, migrate: {},
  dependsOn: (a: any) => [a.p1, a.p2], describe: () => '', render: () => null,
};

describe('reducer', () => {
  beforeEach(() => {
    __clearRegistryForTests();
    registerKind(pointDef);
    registerKind(lineDef);
  });

  test('ADD thêm object + push vào order + tăng counter', () => {
    const s0 = createEmptyState('3d');
    const s1 = produce(s0, d => reduce(d, { type: 'ADD', payload: { obj: mkPoint('p1') } }));
    expect(s1.objects.p1.id).toBe('p1');
    expect(s1.order).toEqual(['p1']);
    expect(s1.counter).toBe(1);
  });

  test('ADD throw nếu id trùng', () => {
    let s = createEmptyState('3d');
    s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: mkPoint('p1') } }));
    expect(() => produce(s, d => reduce(d, { type: 'ADD', payload: { obj: mkPoint('p1') } })))
      .toThrow(/p1/);
  });

  test('UPDATE patch metadata', () => {
    let s = createEmptyState('3d');
    s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: mkPoint('p1') } }));
    s = produce(s, d => reduce(d, { type: 'UPDATE', payload: { id: 'p1', patch: { visible: false } } }));
    expect(s.objects.p1.visible).toBe(false);
  });

  test('UPDATE_ATTRS merge attrs', () => {
    let s = createEmptyState('3d');
    s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: mkPoint('p1', 0, 0) } }));
    s = produce(s, d => reduce(d, { type: 'UPDATE_ATTRS', payload: { id: 'p1', patch: { x: 5 } } }));
    expect(s.objects.p1.attrs).toEqual({ x: 5, y: 0 });
  });

  test('DELETE xoá object + cascade dependents', () => {
    let s = createEmptyState('3d');
    s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: mkPoint('p1') } }));
    s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: mkPoint('p2') } }));
    s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: mkLine('l1', 'p1', 'p2') } }));
    s = produce(s, d => reduce(d, { type: 'DELETE', payload: { id: 'p1' } }));
    expect(s.objects.p1).toBeUndefined();
    expect(s.objects.l1).toBeUndefined();
    expect(s.objects.p2).toBeDefined();
    expect(s.order).toEqual(['p2']);
  });

  test('DELETE no-op nếu id không tồn tại', () => {
    const s = createEmptyState('3d');
    const next = produce(s, d => reduce(d, { type: 'DELETE', payload: { id: 'ghost' } }));
    expect(next).toEqual(s);
  });

  test('RESET đưa về empty (giữ meta)', () => {
    let s = createEmptyState('3d');
    s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: mkPoint('p1') } }));
    s = produce(s, d => reduce(d, { type: 'RESET' }));
    expect(s.objects).toEqual({});
    expect(s.order).toEqual([]);
    expect(s.counter).toBe(0);
    expect(s.meta.domain).toBe('3d');
  });

  test('LOAD thay state hoàn toàn', () => {
    const initial = createEmptyState('3d');
    const loaded = produce(createEmptyState('3d'), d =>
      reduce(d, { type: 'ADD', payload: { obj: mkPoint('p1') } }));
    const next = produce(initial, d => reduce(d, { type: 'LOAD', payload: { state: loaded } }));
    expect(next.objects.p1).toBeDefined();
  });

  test('TRANSACTION apply nhiều action tuần tự trong 1 lần', () => {
    const s0 = createEmptyState('3d');
    const next = produce(s0, d => reduce(d, {
      type: 'TRANSACTION',
      payload: { actions: [
        { type: 'ADD', payload: { obj: mkPoint('p1') } },
        { type: 'ADD', payload: { obj: mkPoint('p2') } },
        { type: 'UPDATE', payload: { id: 'p1', patch: { locked: true } } },
      ] },
    }));
    expect(next.order).toEqual(['p1', 'p2']);
    expect(next.objects.p1.locked).toBe(true);
    expect(next.counter).toBe(2);
  });
});
```

- [ ] **Step 1.1.4.2: Chạy test xem fail**

Run: `npm test -- --testPathPattern 'core/scene/__tests__/reducer'`
Expected: FAIL — "Cannot find module '../reducer'".

- [ ] **Step 1.1.4.3: Implement reducer.ts**

```ts
// src/core/scene/reducer.ts
import type { Draft } from 'immer';
import type { Action, State, SceneObject } from './types';
import { getKind } from './registry';

function collectDependents(state: Draft<State> | State, rootId: string): Set<string> {
  const dependents = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const obj of Object.values(state.objects) as SceneObject[]) {
      if (dependents.has(obj.id)) continue;
      let kindDef;
      try { kindDef = getKind(obj.kind); } catch { continue; }
      const refs = kindDef.dependsOn(obj.attrs as never);
      if (refs.some(r => dependents.has(r))) {
        dependents.add(obj.id);
        grew = true;
      }
    }
  }
  return dependents;
}

export function reduce(draft: Draft<State>, action: Action): void {
  switch (action.type) {
    case 'ADD': {
      const { obj } = action.payload;
      if (draft.objects[obj.id]) throw new Error(`[scene] id "${obj.id}" đã tồn tại`);
      const kindDef = getKind(obj.kind);
      kindDef.validate?.(obj.attrs as never);
      draft.objects[obj.id] = obj;
      draft.order.push(obj.id);
      draft.counter += 1;
      return;
    }
    case 'UPDATE': {
      const { id, patch } = action.payload;
      const obj = draft.objects[id];
      if (!obj) return;
      Object.assign(obj, patch);
      return;
    }
    case 'UPDATE_ATTRS': {
      const { id, patch } = action.payload;
      const obj = draft.objects[id];
      if (!obj) return;
      const kindDef = getKind(obj.kind);
      const nextAttrs = { ...(obj.attrs as object), ...patch };
      kindDef.validate?.(nextAttrs as never);
      obj.attrs = nextAttrs;
      return;
    }
    case 'DELETE': {
      const { id } = action.payload;
      if (!draft.objects[id]) return;
      const toDelete = collectDependents(draft, id);
      for (const delId of toDelete) {
        delete draft.objects[delId];
      }
      draft.order = draft.order.filter(x => !toDelete.has(x));
      return;
    }
    case 'RESET': {
      draft.objects = {};
      draft.order = [];
      draft.counter = 0;
      return;
    }
    case 'LOAD': {
      const { state } = action.payload;
      draft.objects = { ...state.objects };
      draft.order = [...state.order];
      draft.counter = state.counter;
      draft.meta = { ...state.meta };
      return;
    }
    case 'TRANSACTION': {
      for (const sub of action.payload.actions) {
        reduce(draft, sub);
      }
      return;
    }
  }
}
```

- [ ] **Step 1.1.4.4: Verify test pass**

Run: `npm test -- --testPathPattern 'core/scene/__tests__/reducer'`
Expected: PASS, 9 tests.

- [ ] **Step 1.1.4.5: Commit**

```bash
git add src/core/scene/reducer.ts src/core/scene/__tests__/reducer.test.ts
git commit -m "feat(scene): reducer pure cho ADD/UPDATE/UPDATE_ATTRS/DELETE-cascade/RESET/LOAD/TRANSACTION"
```

---

### Task 1.1.5: Tạo `store.ts` (TDD)

**Files:**
- Create: `src/core/scene/store.ts`
- Test: `src/core/scene/__tests__/store.test.ts`

- [ ] **Step 1.1.5.1: Viết test store**

```ts
// src/core/scene/__tests__/store.test.ts
import { createStore } from '../store';
import { registerKind, __clearRegistryForTests } from '../registry';
import { createEmptyState } from '../types';
import type { SceneObject, KindDef } from '../types';

const pointDef: KindDef = {
  type: 'point', schemaVersion: 1, migrate: {},
  dependsOn: () => [], describe: () => '', render: () => null,
};

const mkPoint = (id: string): SceneObject => ({
  id, kind: 'point', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { x: 0, y: 0 },
});

describe('store', () => {
  beforeEach(() => {
    __clearRegistryForTests();
    registerKind(pointDef);
  });

  test('dispatch ADD → getState phản ánh thay đổi', () => {
    const store = createStore(createEmptyState('3d'));
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p1') } });
    expect(store.getState().objects.p1).toBeDefined();
  });

  test('subscribe được gọi với (next, prev, action)', () => {
    const store = createStore(createEmptyState('3d'));
    const listener = jest.fn();
    store.subscribe(listener);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p1') } });
    expect(listener).toHaveBeenCalledTimes(1);
    const [next, prev, action] = listener.mock.calls[0];
    expect(prev.objects.p1).toBeUndefined();
    expect(next.objects.p1).toBeDefined();
    expect(action.type).toBe('ADD');
  });

  test('subscribe unsubscribe', () => {
    const store = createStore(createEmptyState('3d'));
    const listener = jest.fn();
    const off = store.subscribe(listener);
    off();
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p1') } });
    expect(listener).not.toHaveBeenCalled();
  });

  test('undo/redo round-trip', () => {
    const store = createStore(createEmptyState('3d'));
    expect(store.canUndo()).toBe(false);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p1') } });
    expect(store.canUndo()).toBe(true);
    store.undo();
    expect(store.getState().objects.p1).toBeUndefined();
    expect(store.canRedo()).toBe(true);
    store.redo();
    expect(store.getState().objects.p1).toBeDefined();
  });

  test('redo bị xoá khi dispatch action mới', () => {
    const store = createStore(createEmptyState('3d'));
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p1') } });
    store.undo();
    expect(store.canRedo()).toBe(true);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p2') } });
    expect(store.canRedo()).toBe(false);
  });

  test('transaction gộp nhiều dispatch thành 1 undo entry', () => {
    const store = createStore(createEmptyState('3d'));
    store.transaction((d) => {
      d({ type: 'ADD', payload: { obj: mkPoint('p1') } });
      d({ type: 'ADD', payload: { obj: mkPoint('p2') } });
    });
    expect(Object.keys(store.getState().objects)).toHaveLength(2);
    store.undo();
    expect(Object.keys(store.getState().objects)).toHaveLength(0);
  });

  test('withoutHistory skip snapshot', () => {
    const store = createStore(createEmptyState('3d'));
    store.withoutHistory(() => {
      store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p1') } });
    });
    expect(store.canUndo()).toBe(false);
    expect(store.getState().objects.p1).toBeDefined();
  });

  test('historyLimit shift cũ nhất khi tràn', () => {
    const store = createStore(createEmptyState('3d'), { historyLimit: 2 });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p1') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p2') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p3') } });
    // history chỉ giữ 2 → undo 2 lần là hết (vẫn còn p1)
    store.undo();
    store.undo();
    expect(store.canUndo()).toBe(false);
    expect(store.getState().objects.p1).toBeDefined();
  });

  test('dispatch bên trong subscriber throw', () => {
    const store = createStore(createEmptyState('3d'));
    store.subscribe(() => {
      store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p2') } });
    });
    expect(() => store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p1') } }))
      .toThrow(/dispatch/i);
  });
});
```

- [ ] **Step 1.1.5.2: Chạy test xem fail**

Run: `npm test -- --testPathPattern 'core/scene/__tests__/store'`
Expected: FAIL — "Cannot find module '../store'".

- [ ] **Step 1.1.5.3: Implement store.ts**

```ts
// src/core/scene/store.ts
import { produce } from 'immer';
import { reduce } from './reducer';
import type { Action, State } from './types';

export type StoreListener = (next: State, prev: State, action: Action) => void;

export interface Store {
  getState(): State;
  dispatch(action: Action): void;
  subscribe(listener: StoreListener): () => void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  transaction(fn: (dispatch: (a: Action) => void) => void): void;
  withoutHistory(fn: () => void): void;
}

export type StoreOptions = { historyLimit?: number };

const HISTORY_DEFAULT = 100;

const UNDO_ACTION: Action = { type: 'TRANSACTION', payload: { actions: [] } };
const REDO_ACTION: Action = { type: 'TRANSACTION', payload: { actions: [] } };

export function createStore(initial: State, options: StoreOptions = {}): Store {
  const limit = options.historyLimit ?? HISTORY_DEFAULT;
  let state = initial;
  const past: State[] = [];
  const future: State[] = [];
  const listeners = new Set<StoreListener>();
  let dispatching = false;
  let suspendHistory = false;
  let transactionActions: Action[] | null = null;

  function notify(prev: State, action: Action): void {
    listeners.forEach(l => l(state, prev, action));
  }

  function pushHistory(prev: State): void {
    if (suspendHistory) return;
    past.push(prev);
    if (past.length > limit) past.shift();
    future.length = 0;
  }

  function applyAction(action: Action): void {
    const prev = state;
    state = produce(state, draft => { reduce(draft, action); });
    if (state !== prev) {
      pushHistory(prev);
      notify(prev, action);
    }
  }

  return {
    getState: () => state,

    dispatch(action: Action) {
      if (dispatching) throw new Error('[scene] không được dispatch trong subscriber');
      if (transactionActions) {
        transactionActions.push(action);
        return;
      }
      dispatching = true;
      try { applyAction(action); } finally { dispatching = false; }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },

    undo() {
      const prev = past.pop();
      if (!prev) return;
      future.push(state);
      const old = state;
      state = prev;
      notify(old, UNDO_ACTION);
    },

    redo() {
      const next = future.pop();
      if (!next) return;
      past.push(state);
      if (past.length > limit) past.shift();
      const old = state;
      state = next;
      notify(old, REDO_ACTION);
    },

    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,

    transaction(fn) {
      if (transactionActions) throw new Error('[scene] transaction lồng nhau không hỗ trợ');
      transactionActions = [];
      try { fn((a) => { transactionActions!.push(a); }); }
      finally {
        const actions = transactionActions;
        transactionActions = null;
        if (actions.length > 0) {
          applyAction({ type: 'TRANSACTION', payload: { actions } });
        }
      }
    },

    withoutHistory(fn) {
      const prevSuspend = suspendHistory;
      suspendHistory = true;
      try { fn(); } finally { suspendHistory = prevSuspend; }
    },
  };
}
```

- [ ] **Step 1.1.5.4: Verify test pass**

Run: `npm test -- --testPathPattern 'core/scene/__tests__/store'`
Expected: PASS, 9 tests.

- [ ] **Step 1.1.5.5: Commit**

```bash
git add src/core/scene/store.ts src/core/scene/__tests__/store.test.ts
git commit -m "feat(scene): createStore với dispatch/subscribe/undo/redo/transaction/withoutHistory"
```

---

### Task 1.1.6: Tạo `selectors.ts` (TDD)

**Files:**
- Create: `src/core/scene/selectors.ts`
- Test: `src/core/scene/__tests__/selectors.test.ts`

- [ ] **Step 1.1.6.1: Viết test selectors**

```ts
// src/core/scene/__tests__/selectors.test.ts
import { produce } from 'immer';
import { reduce } from '../reducer';
import { listObjects, byKind, dependentsOf, nextLabel } from '../selectors';
import { registerKind, __clearRegistryForTests } from '../registry';
import { createEmptyState } from '../types';
import type { SceneObject, KindDef } from '../types';

const pointDef: KindDef = {
  type: 'point', schemaVersion: 1, migrate: {},
  dependsOn: () => [], describe: () => '', render: () => null,
};
const lineDef: KindDef = {
  type: 'line', schemaVersion: 1, migrate: {},
  dependsOn: (a: any) => [a.p1, a.p2], describe: () => '', render: () => null,
};

const mkPoint = (id: string, label = id): SceneObject => ({
  id, kind: 'point', label, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { x: 0, y: 0 },
});

const mkLine = (id: string, p1: string, p2: string): SceneObject => ({
  id, kind: 'line', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { p1, p2 },
});

function build(...objs: SceneObject[]) {
  let s = createEmptyState('3d');
  for (const o of objs) s = produce(s, d => reduce(d, { type: 'ADD', payload: { obj: o } }));
  return s;
}

describe('selectors', () => {
  beforeEach(() => {
    __clearRegistryForTests();
    registerKind(pointDef);
    registerKind(lineDef);
  });

  test('listObjects giữ thứ tự insert', () => {
    const s = build(mkPoint('p2'), mkPoint('p1'));
    expect(listObjects(s).map(o => o.id)).toEqual(['p2', 'p1']);
  });

  test('byKind lọc đúng', () => {
    const s = build(mkPoint('p1'), mkPoint('p2'), mkLine('l1', 'p1', 'p2'));
    expect(byKind(s, 'point').map(o => o.id)).toEqual(['p1', 'p2']);
    expect(byKind(s, 'line').map(o => o.id)).toEqual(['l1']);
  });

  test('dependentsOf BFS qua nhiều cấp', () => {
    // p1 → l1, l1 không có dep ngược; nhưng test cascade: xoá p1 phải kéo l1.
    const s = build(mkPoint('p1'), mkPoint('p2'), mkLine('l1', 'p1', 'p2'));
    expect([...dependentsOf(s, 'p1')].sort()).toEqual(['l1', 'p1']);
  });

  test('nextLabel A→Z rồi A1, A2…', () => {
    // scan-fill: nếu thiếu 'B', dùng 'B'.
    const s = build(mkPoint('p1', 'A'), mkPoint('p2', 'C'));
    expect(nextLabel(s, 'point')).toBe('B');
  });

  test('nextLabel khi đã dùng hết A-Z → A1', () => {
    const objs: SceneObject[] = [];
    for (let i = 0; i < 26; i++) {
      objs.push(mkPoint(`p${i}`, String.fromCharCode(65 + i)));
    }
    const s = build(...objs);
    expect(nextLabel(s, 'point')).toBe('A1');
  });
});
```

- [ ] **Step 1.1.6.2: Chạy test xem fail**

Run: `npm test -- --testPathPattern 'core/scene/__tests__/selectors'`
Expected: FAIL — "Cannot find module '../selectors'".

- [ ] **Step 1.1.6.3: Implement selectors.ts**

```ts
// src/core/scene/selectors.ts
import type { State, SceneObject } from './types';
import { getKind } from './registry';

export function listObjects(state: State): SceneObject[] {
  return state.order
    .map(id => state.objects[id])
    .filter((o): o is SceneObject => o !== undefined);
}

export function byKind(state: State, kind: string): SceneObject[] {
  return listObjects(state).filter(o => o.kind === kind);
}

export function dependentsOf(state: State, rootId: string): Set<string> {
  const result = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const obj of Object.values(state.objects)) {
      if (result.has(obj.id)) continue;
      let def;
      try { def = getKind(obj.kind); } catch { continue; }
      const refs = def.dependsOn(obj.attrs as never);
      if (refs.some(r => result.has(r))) {
        result.add(obj.id);
        grew = true;
      }
    }
  }
  return result;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function nextLabel(state: State, kind: string): string {
  const used = new Set(byKind(state, kind).map(o => o.label));
  for (const c of ALPHABET) if (!used.has(c)) return c;
  let idx = 1;
  while (true) {
    for (const c of ALPHABET) {
      const candidate = `${c}${idx}`;
      if (!used.has(candidate)) return candidate;
    }
    idx += 1;
  }
}
```

- [ ] **Step 1.1.6.4: Verify test pass**

Run: `npm test -- --testPathPattern 'core/scene/__tests__/selectors'`
Expected: PASS, 5 tests.

- [ ] **Step 1.1.6.5: Commit**

```bash
git add src/core/scene/selectors.ts src/core/scene/__tests__/selectors.test.ts
git commit -m "feat(scene): selectors listObjects/byKind/dependentsOf/nextLabel (scan-fill A-Z)"
```

---

### Task 1.1.7: Tạo `migrations/` (TDD)

**Files:**
- Create: `src/core/scene/migrations/runMigrations.ts`
- Create: `src/core/scene/migrations/state.ts`
- Test: `src/core/scene/__tests__/migrations.test.ts`

- [ ] **Step 1.1.7.1: Viết test migrations**

```ts
// src/core/scene/__tests__/migrations.test.ts
import { migrateState } from '../migrations/runMigrations';
import { registerKind, __clearRegistryForTests } from '../registry';
import { __clearStateMigrationsForTests, registerStateMigration } from '../migrations/state';
import type { KindDef } from '../types';

const pointV3Def: KindDef = {
  type: 'point',
  schemaVersion: 3,
  migrate: {
    1: (v0) => ({ ...v0, label: '' }),
    2: (v1) => ({ ...v1, locked: false }),
    3: (v2) => ({ ...v2, layer: 'default' }),
  },
  dependsOn: () => [], describe: () => '', render: () => null,
};

describe('migrations', () => {
  beforeEach(() => {
    __clearRegistryForTests();
    __clearStateMigrationsForTests();
    registerKind(pointV3Def);
  });

  test('migrate chain v0 → v3 chạy đủ 3 step', () => {
    const raw = {
      objects: { p1: { id: 'p1', kind: 'point', schemaVersion: 0, attrs: { x: 0, y: 0 } } },
      order: ['p1'],
      counter: 1,
      meta: { domain: '3d', version: 1 },
    };
    const state = migrateState(raw);
    const obj = state.objects.p1;
    expect(obj.schemaVersion).toBe(3);
    expect(obj.label).toBe('');
    expect(obj.locked).toBe(false);
    expect(obj.layer).toBe('default');
  });

  test('throw nếu kind không có trong registry', () => {
    const raw = {
      objects: { x: { id: 'x', kind: 'unknown', schemaVersion: 1, attrs: {} } },
      order: ['x'], counter: 1, meta: { domain: '3d', version: 1 },
    };
    expect(() => migrateState(raw)).toThrow(/unknown/);
  });

  test('throw nếu version gap không có migration', () => {
    const raw = {
      objects: { p1: { id: 'p1', kind: 'point', schemaVersion: 10, attrs: {} } },
      order: ['p1'], counter: 1, meta: { domain: '3d', version: 1 },
    };
    expect(() => migrateState(raw)).toThrow(/migration/i);
  });

  test('state-level migration chạy trước per-object', () => {
    registerStateMigration(2, (s) => ({ ...s, meta: { ...s.meta, version: 2 } }));
    const raw = {
      objects: {}, order: [], counter: 0,
      meta: { domain: '3d', version: 1 },
    };
    const state = migrateState(raw);
    expect(state.meta.version).toBe(2);
  });
});
```

- [ ] **Step 1.1.7.2: Chạy test xem fail**

Run: `npm test -- --testPathPattern 'core/scene/__tests__/migrations'`
Expected: FAIL — "Cannot find module '../migrations/runMigrations'".

- [ ] **Step 1.1.7.3: Implement migrations/state.ts**

```ts
// src/core/scene/migrations/state.ts
import type { State } from '../types';

type StateMigration = (state: any) => any;

const stateMigrations = new Map<number, StateMigration>();

export function registerStateMigration(toVersion: number, fn: StateMigration): void {
  stateMigrations.set(toVersion, fn);
}

export function listStateMigrations(): Map<number, StateMigration> {
  return stateMigrations;
}

export const CURRENT_STATE_VERSION = 1;

export function __clearStateMigrationsForTests(): void {
  stateMigrations.clear();
}
```

- [ ] **Step 1.1.7.4: Implement migrations/runMigrations.ts**

```ts
// src/core/scene/migrations/runMigrations.ts
import { getKind } from '../registry';
import type { State, SceneObject } from '../types';
import { listStateMigrations, CURRENT_STATE_VERSION } from './state';

export function migrateState(raw: any): State {
  if (!raw || typeof raw !== 'object') throw new Error('[scene] invalid state shape');
  let state = raw;

  const currentVersion: number = state.meta?.version ?? 1;
  const stateMigs = listStateMigrations();
  for (let v = currentVersion + 1; v <= Math.max(CURRENT_STATE_VERSION, ...stateMigs.keys()); v++) {
    const fn = stateMigs.get(v);
    if (fn) state = fn(state);
  }

  const migratedObjects: Record<string, SceneObject> = {};
  for (const [id, obj] of Object.entries<any>(state.objects ?? {})) {
    const def = getKind(obj.kind);
    let cur = obj;
    while ((cur.schemaVersion ?? 0) < def.schemaVersion) {
      const next = (cur.schemaVersion ?? 0) + 1;
      const mig = def.migrate[next];
      if (!mig) throw new Error(`[scene] missing migration cho ${obj.kind} v${next}`);
      cur = mig(cur);
      cur.schemaVersion = next;
    }
    migratedObjects[id] = cur;
  }

  return {
    objects: migratedObjects,
    order: state.order ?? [],
    counter: state.counter ?? 0,
    meta: state.meta ?? { domain: '3d', version: CURRENT_STATE_VERSION },
  };
}
```

- [ ] **Step 1.1.7.5: Verify test pass**

Run: `npm test -- --testPathPattern 'core/scene/__tests__/migrations'`
Expected: PASS, 4 tests.

- [ ] **Step 1.1.7.6: Commit**

```bash
git add src/core/scene/migrations src/core/scene/__tests__/migrations.test.ts
git commit -m "feat(scene): migrations runner cho per-kind schema + state-level"
```

---

### Task 1.1.8: Public barrel `src/core/scene/index.ts`

**Files:**
- Create: `src/core/scene/index.ts`
- Create: `src/core/scene/kinds/index.ts`

- [ ] **Step 1.1.8.1: Tạo `kinds/index.ts` (rỗng — kind sẽ thêm ở PR 1.2)**

```ts
// src/core/scene/kinds/index.ts
// Side-effect: mỗi kind file gọi registerKind tại import-time.
// Sẽ được điền ở PR 1.2 (3D) và Phase 2 (2D).
export {};
```

- [ ] **Step 1.1.8.2: Tạo barrel `src/core/scene/index.ts`**

```ts
// src/core/scene/index.ts
export type {
  SceneObject,
  State,
  Action,
  KindDef,
  RenderCtx,
} from './types';
export { EMPTY_STATE, createEmptyState } from './types';
export { createStore } from './store';
export type { Store, StoreListener, StoreOptions } from './store';
export { reduce } from './reducer';
export { registerKind, getKind, listKinds } from './registry';
export { listObjects, byKind, dependentsOf, nextLabel } from './selectors';
export { migrateState } from './migrations/runMigrations';
export { registerStateMigration, CURRENT_STATE_VERSION } from './migrations/state';

// IMPORTANT: import kinds barrel để side-effect register chạy.
import './kinds';
```

- [ ] **Step 1.1.8.3: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 1.1.8.4: Verify toàn bộ test core pass**

Run: `npm test -- --testPathPattern 'core/scene'`
Expected: PASS — 4 test file (registry, reducer, store, selectors, migrations).

- [ ] **Step 1.1.8.5: Commit**

```bash
git add src/core/scene/index.ts src/core/scene/kinds/index.ts
git commit -m "feat(scene): public barrel + kinds barrel skeleton"
```

---

### Task 1.1.9: Push PR 1.1

- [ ] **Step 1.1.9.1: Push**

Run: `git push origin main`
Expected: Push thành công.

---

## PR 1.2 — 3D kinds

**Mục tiêu**: 11 kind 3D đăng ký xong, có test. Sau PR này `getKind('point3d')` dùng được. Chưa wire vào EditorPanel.

### Task 1.2.0: Helper test chung

**Files:**
- Create: `src/core/scene/kinds/__tests__/helpers.ts`

- [ ] **Step 1.2.0.1: Tạo helper builders**

```ts
// src/core/scene/kinds/__tests__/helpers.ts
import type { SceneObject } from '../../types';

export function mkObj<A>(kind: string, id: string, attrs: A): SceneObject<A> {
  return {
    id, kind, label: id, visible: true, locked: false, layer: 'default',
    schemaVersion: 1, attrs,
  };
}
```

- [ ] **Step 1.2.0.2: Commit**

```bash
git add src/core/scene/kinds/__tests__/helpers.ts
git commit -m "test(scene/kinds): helper mkObj cho kind tests"
```

---

### Task 1.2.1: Kind `point3d`

**Files:**
- Create: `src/core/scene/kinds/3d-constraint.ts` (Vec3 + Constraint3D types)
- Create: `src/core/scene/kinds/point3d.ts`
- Test: `src/core/scene/kinds/__tests__/point3d.test.ts`

- [ ] **Step 1.2.1.1: Tạo file constraint chung**

```ts
// src/core/scene/kinds/3d-constraint.ts
export type Vec3 = [number, number, number];

export type Constraint3D =
  | { kind: 'free'; x: number; y: number; z: number }
  | { kind: 'onGround'; x: number; y: number }
  | { kind: 'onAxis'; axis: 'x' | 'y' | 'z'; t: number }
  | { kind: 'onPlane'; planeId: string; u: number; v: number }
  | { kind: 'onLine'; lineId: string; t: number }
  | { kind: 'onPolygon'; polygonId: string; u: number; v: number }
  | { kind: 'onSphere'; sphereId: string; theta: number; phi: number };

export function constraintRefs(c: Constraint3D): string[] {
  switch (c.kind) {
    case 'onPlane': return [c.planeId];
    case 'onLine': return [c.lineId];
    case 'onPolygon': return [c.polygonId];
    case 'onSphere': return [c.sphereId];
    default: return [];
  }
}
```

- [ ] **Step 1.2.1.2: Viết test point3d**

```ts
// src/core/scene/kinds/__tests__/point3d.test.ts
import '../point3d';
import { getKind, __clearRegistryForTests } from '../../registry';
import '../point3d';
import { mkObj } from './helpers';

describe('kinds/point3d', () => {
  test('đã đăng ký với registry', () => {
    const def = getKind('point3d');
    expect(def.schemaVersion).toBe(1);
  });

  test('validate throw nếu thiếu constraint', () => {
    const def = getKind('point3d');
    expect(() => def.validate?.({} as never)).toThrow(/constraint/);
  });

  test('dependsOn free → []', () => {
    const def = getKind('point3d');
    expect(def.dependsOn({ constraint: { kind: 'free', x: 0, y: 0, z: 0 } } as never))
      .toEqual([]);
  });

  test('dependsOn onPlane → [planeId]', () => {
    const def = getKind('point3d');
    expect(def.dependsOn({ constraint: { kind: 'onPlane', planeId: 'pl1', u: 0, v: 0 } } as never))
      .toEqual(['pl1']);
  });

  test('describe in toạ độ', () => {
    const def = getKind('point3d');
    const obj = mkObj('point3d', 'A', { constraint: { kind: 'free', x: 1, y: 2, z: 3 } });
    expect(def.describe(obj)).toMatch(/A.*1.*2.*3/);
  });
});
```

- [ ] **Step 1.2.1.3: Chạy test xem fail**

Run: `npm test -- --testPathPattern 'point3d'`
Expected: FAIL — "Cannot find module '../point3d'".

- [ ] **Step 1.2.1.4: Implement point3d.ts**

```ts
// src/core/scene/kinds/point3d.ts
import { registerKind } from '../registry';
import type { KindDef, RenderCtx, SceneObject } from '../types';
import { type Constraint3D, constraintRefs } from './3d-constraint';

export type Point3DAttrs = {
  constraint: Constraint3D;
  color?: string;
};

const def: KindDef<Point3DAttrs> = {
  type: 'point3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a || !a.constraint || !a.constraint.kind) {
      throw new Error('point3d: constraint required');
    }
  },
  dependsOn: (a) => constraintRefs(a.constraint),
  describe: (obj) => {
    const c = obj.attrs.constraint;
    if (c.kind === 'free') return `${obj.label} = (${c.x.toFixed(2)}, ${c.y.toFixed(2)}, ${c.z.toFixed(2)})`;
    if (c.kind === 'onGround') return `${obj.label} = (${c.x.toFixed(2)}, ${c.y.toFixed(2)}, 0)`;
    if (c.kind === 'onAxis') return `${obj.label} trên trục ${c.axis} (t=${c.t.toFixed(2)})`;
    if (c.kind === 'onPlane') return `${obj.label} trên mặt ${c.planeId}`;
    if (c.kind === 'onLine') return `${obj.label} trên đường ${c.lineId}`;
    if (c.kind === 'onPolygon') return `${obj.label} trên đa giác ${c.polygonId}`;
    if (c.kind === 'onSphere') return `${obj.label} trên mặt cầu ${c.sphereId}`;
    return obj.label;
  },
  render: (obj, ctx: RenderCtx) => {
    // Render thực được implement ở JxgRenderer3D (task 1.3.2).
    // Helper này chỉ cần giữ signature; renderer gọi nó với jxg = view3d.
    return null;
  },
};

registerKind(def);
```

> **Note**: phần `render` đầy đủ sẽ implement ở **PR 1.3** khi đã có context view3d. Ở PR 1.2 này, render trả null — store/reducer hoạt động độc lập với renderer.

- [ ] **Step 1.2.1.5: Verify test pass**

Run: `npm test -- --testPathPattern 'point3d'`
Expected: PASS, 5 tests.

- [ ] **Step 1.2.1.6: Update barrel `kinds/index.ts`**

```ts
// src/core/scene/kinds/index.ts
import './point3d';
export {};
```

- [ ] **Step 1.2.1.7: Commit**

```bash
git add src/core/scene/kinds/3d-constraint.ts src/core/scene/kinds/point3d.ts \
        src/core/scene/kinds/__tests__/point3d.test.ts src/core/scene/kinds/index.ts
git commit -m "feat(scene/kinds): point3d với constraint + describe"
```

---

### Task 1.2.2: Kind `segment3d`

**Files:**
- Create: `src/core/scene/kinds/segment3d.ts`
- Test: `src/core/scene/kinds/__tests__/segment3d.test.ts`

- [ ] **Step 1.2.2.1: Viết test**

```ts
// src/core/scene/kinds/__tests__/segment3d.test.ts
import '../segment3d';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/segment3d', () => {
  test('registered', () => {
    expect(getKind('segment3d').schemaVersion).toBe(1);
  });

  test('validate throw nếu thiếu p1/p2', () => {
    const def = getKind('segment3d');
    expect(() => def.validate?.({ p1: '', p2: 'x' } as never)).toThrow();
    expect(() => def.validate?.({ p1: 'x', p2: '' } as never)).toThrow();
  });

  test('dependsOn = [p1, p2]', () => {
    const def = getKind('segment3d');
    expect(def.dependsOn({ p1: 'a', p2: 'b' } as never)).toEqual(['a', 'b']);
  });

  test('describe in nhãn 2 đầu', () => {
    const def = getKind('segment3d');
    const obj = mkObj('segment3d', 's1', { p1: 'A', p2: 'B' });
    expect(def.describe(obj)).toContain('A');
    expect(def.describe(obj)).toContain('B');
  });
});
```

- [ ] **Step 1.2.2.2: Chạy fail**

Run: `npm test -- --testPathPattern 'segment3d'`
Expected: FAIL.

- [ ] **Step 1.2.2.3: Implement**

```ts
// src/core/scene/kinds/segment3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Segment3DAttrs = { p1: string; p2: string; color?: string };

const def: KindDef<Segment3DAttrs> = {
  type: 'segment3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.p1 || !a?.p2) throw new Error('segment3d: p1 và p2 bắt buộc');
  },
  dependsOn: (a) => [a.p1, a.p2],
  describe: (obj) => `Đoạn ${obj.attrs.p1}${obj.attrs.p2}`,
  render: () => null,
};

registerKind(def);
```

- [ ] **Step 1.2.2.4: Verify pass + update barrel**

```ts
// src/core/scene/kinds/index.ts
import './point3d';
import './segment3d';
export {};
```

Run: `npm test -- --testPathPattern 'segment3d'`
Expected: PASS, 4 tests.

- [ ] **Step 1.2.2.5: Commit**

```bash
git add src/core/scene/kinds/segment3d.ts src/core/scene/kinds/__tests__/segment3d.test.ts src/core/scene/kinds/index.ts
git commit -m "feat(scene/kinds): segment3d"
```

---

### Task 1.2.3: Kind `line3d`

Tương tự segment3d nhưng describe khác. Same shape `{ p1, p2 }`.

- [ ] **Step 1.2.3.1: Viết test**

```ts
// src/core/scene/kinds/__tests__/line3d.test.ts
import '../line3d';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/line3d', () => {
  test('registered', () => { expect(getKind('line3d').schemaVersion).toBe(1); });
  test('dependsOn', () => {
    expect(getKind('line3d').dependsOn({ p1: 'a', p2: 'b' } as never)).toEqual(['a', 'b']);
  });
  test('describe', () => {
    const obj = mkObj('line3d', 'L', { p1: 'A', p2: 'B' });
    expect(getKind('line3d').describe(obj)).toMatch(/L|AB/);
  });
});
```

- [ ] **Step 1.2.3.2: Chạy fail, implement, pass, barrel, commit**

Run: `npm test -- --testPathPattern 'line3d'` (sau khi viết test) → FAIL.

```ts
// src/core/scene/kinds/line3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Line3DAttrs = { p1: string; p2: string; color?: string };

registerKind<Line3DAttrs>({
  type: 'line3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => { if (!a?.p1 || !a?.p2) throw new Error('line3d: p1/p2 required'); },
  dependsOn: (a) => [a.p1, a.p2],
  describe: (obj) => `Đường ${obj.label} qua ${obj.attrs.p1}, ${obj.attrs.p2}`,
  render: () => null,
});
```

Update barrel: thêm `import './line3d';`. Run test → PASS. Commit:

```bash
git add src/core/scene/kinds/line3d.ts src/core/scene/kinds/__tests__/line3d.test.ts src/core/scene/kinds/index.ts
git commit -m "feat(scene/kinds): line3d"
```

---

### Task 1.2.4: Kind `ray3d`

Cùng pattern, attrs `{ origin, through }`.

- [ ] **Step 1.2.4.1: Viết test**

```ts
// src/core/scene/kinds/__tests__/ray3d.test.ts
import '../ray3d';
import { getKind } from '../../registry';

describe('kinds/ray3d', () => {
  test('registered', () => { expect(getKind('ray3d').schemaVersion).toBe(1); });
  test('dependsOn = [origin, through]', () => {
    expect(getKind('ray3d').dependsOn({ origin: 'O', through: 'T' } as never)).toEqual(['O', 'T']);
  });
  test('validate', () => {
    expect(() => getKind('ray3d').validate?.({ origin: '', through: 'T' } as never)).toThrow();
  });
});
```

- [ ] **Step 1.2.4.2: Implement**

```ts
// src/core/scene/kinds/ray3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Ray3DAttrs = { origin: string; through: string; color?: string };

registerKind<Ray3DAttrs>({
  type: 'ray3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => { if (!a?.origin || !a?.through) throw new Error('ray3d: origin/through required'); },
  dependsOn: (a) => [a.origin, a.through],
  describe: (obj) => `Tia ${obj.label} từ ${obj.attrs.origin} qua ${obj.attrs.through}`,
  render: () => null,
});
```

Update barrel, run test, commit:
```bash
git add src/core/scene/kinds/ray3d.ts src/core/scene/kinds/__tests__/ray3d.test.ts src/core/scene/kinds/index.ts
git commit -m "feat(scene/kinds): ray3d"
```

---

### Task 1.2.5: Kind `vector3d`

Attrs `{ from, to }`.

- [ ] **Step 1.2.5.1: Test**

```ts
// src/core/scene/kinds/__tests__/vector3d.test.ts
import '../vector3d';
import { getKind } from '../../registry';

describe('kinds/vector3d', () => {
  test('registered', () => { expect(getKind('vector3d').schemaVersion).toBe(1); });
  test('dependsOn = [from, to]', () => {
    expect(getKind('vector3d').dependsOn({ from: 'A', to: 'B' } as never)).toEqual(['A', 'B']);
  });
});
```

- [ ] **Step 1.2.5.2: Implement**

```ts
// src/core/scene/kinds/vector3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Vector3DAttrs = { from: string; to: string; color?: string };

registerKind<Vector3DAttrs>({
  type: 'vector3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => { if (!a?.from || !a?.to) throw new Error('vector3d: from/to required'); },
  dependsOn: (a) => [a.from, a.to],
  describe: (obj) => `Véc-tơ ${obj.label}: ${obj.attrs.from} → ${obj.attrs.to}`,
  render: () => null,
});
```

Update barrel, commit:
```bash
git add src/core/scene/kinds/vector3d.ts src/core/scene/kinds/__tests__/vector3d.test.ts src/core/scene/kinds/index.ts
git commit -m "feat(scene/kinds): vector3d"
```

---

### Task 1.2.6: Kind `plane3d`

Attrs `{ p1, p2, p3 }`.

- [ ] **Step 1.2.6.1: Test**

```ts
// src/core/scene/kinds/__tests__/plane3d.test.ts
import '../plane3d';
import { getKind } from '../../registry';

describe('kinds/plane3d', () => {
  test('registered', () => { expect(getKind('plane3d').schemaVersion).toBe(1); });
  test('dependsOn = [p1, p2, p3]', () => {
    expect(getKind('plane3d').dependsOn({ p1: 'a', p2: 'b', p3: 'c' } as never)).toEqual(['a', 'b', 'c']);
  });
  test('validate throw nếu thiếu', () => {
    expect(() => getKind('plane3d').validate?.({ p1: 'a', p2: 'b' } as never)).toThrow();
  });
});
```

- [ ] **Step 1.2.6.2: Implement**

```ts
// src/core/scene/kinds/plane3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Plane3DAttrs = { p1: string; p2: string; p3: string; color?: string };

registerKind<Plane3DAttrs>({
  type: 'plane3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => { if (!a?.p1 || !a?.p2 || !a?.p3) throw new Error('plane3d: cần 3 điểm'); },
  dependsOn: (a) => [a.p1, a.p2, a.p3],
  describe: (obj) => `Mặt ${obj.label} qua ${obj.attrs.p1}, ${obj.attrs.p2}, ${obj.attrs.p3}`,
  render: () => null,
});
```

Update barrel, commit:
```bash
git add src/core/scene/kinds/plane3d.ts src/core/scene/kinds/__tests__/plane3d.test.ts src/core/scene/kinds/index.ts
git commit -m "feat(scene/kinds): plane3d"
```

---

### Task 1.2.7: Kind `polygon3d`

Attrs `{ vertices: string[] }`.

- [ ] **Step 1.2.7.1: Test**

```ts
// src/core/scene/kinds/__tests__/polygon3d.test.ts
import '../polygon3d';
import { getKind } from '../../registry';

describe('kinds/polygon3d', () => {
  test('registered', () => { expect(getKind('polygon3d').schemaVersion).toBe(1); });
  test('dependsOn trả về toàn bộ vertices', () => {
    expect(getKind('polygon3d').dependsOn({ vertices: ['a', 'b', 'c', 'd'] } as never))
      .toEqual(['a', 'b', 'c', 'd']);
  });
  test('validate throw nếu < 3 vertices', () => {
    expect(() => getKind('polygon3d').validate?.({ vertices: ['a', 'b'] } as never)).toThrow(/3/);
  });
});
```

- [ ] **Step 1.2.7.2: Implement**

```ts
// src/core/scene/kinds/polygon3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Polygon3DAttrs = { vertices: string[]; color?: string };

registerKind<Polygon3DAttrs>({
  type: 'polygon3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.vertices || a.vertices.length < 3) throw new Error('polygon3d: cần ≥3 vertices');
  },
  dependsOn: (a) => [...a.vertices],
  describe: (obj) => `Đa giác ${obj.label} (${obj.attrs.vertices.length} đỉnh)`,
  render: () => null,
});
```

Update barrel, commit:
```bash
git add src/core/scene/kinds/polygon3d.ts src/core/scene/kinds/__tests__/polygon3d.test.ts src/core/scene/kinds/index.ts
git commit -m "feat(scene/kinds): polygon3d"
```

---

### Task 1.2.8: Kind `sphere3d`

Attrs `{ center, surfacePoint }`.

- [ ] **Step 1.2.8.1: Test**

```ts
// src/core/scene/kinds/__tests__/sphere3d.test.ts
import '../sphere3d';
import { getKind } from '../../registry';

describe('kinds/sphere3d', () => {
  test('registered', () => { expect(getKind('sphere3d').schemaVersion).toBe(1); });
  test('dependsOn = [center, surfacePoint]', () => {
    expect(getKind('sphere3d').dependsOn({ center: 'O', surfacePoint: 'P' } as never))
      .toEqual(['O', 'P']);
  });
});
```

- [ ] **Step 1.2.8.2: Implement**

```ts
// src/core/scene/kinds/sphere3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Sphere3DAttrs = { center: string; surfacePoint: string; color?: string };

registerKind<Sphere3DAttrs>({
  type: 'sphere3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => { if (!a?.center || !a?.surfacePoint) throw new Error('sphere3d: center/surfacePoint required'); },
  dependsOn: (a) => [a.center, a.surfacePoint],
  describe: (obj) => `Mặt cầu ${obj.label} tâm ${obj.attrs.center}`,
  render: () => null,
});
```

Update barrel, commit:
```bash
git add src/core/scene/kinds/sphere3d.ts src/core/scene/kinds/__tests__/sphere3d.test.ts src/core/scene/kinds/index.ts
git commit -m "feat(scene/kinds): sphere3d"
```

---

### Task 1.2.9: Kind `polyhedron3d`

Attrs `{ flavor, vertices, faces }`.

- [ ] **Step 1.2.9.1: Test**

```ts
// src/core/scene/kinds/__tests__/polyhedron3d.test.ts
import '../polyhedron3d';
import { getKind } from '../../registry';

describe('kinds/polyhedron3d', () => {
  test('registered', () => { expect(getKind('polyhedron3d').schemaVersion).toBe(1); });
  test('dependsOn trả về vertices', () => {
    expect(getKind('polyhedron3d').dependsOn({
      flavor: 'pyramid', vertices: ['a', 'b', 'c', 'd'], faces: [],
    } as never)).toEqual(['a', 'b', 'c', 'd']);
  });
  test('describe ghi flavor', () => {
    const obj: any = {
      id: 'h', kind: 'polyhedron3d', label: 'H', visible: true, locked: false, layer: 'default',
      schemaVersion: 1,
      attrs: { flavor: 'cube', vertices: ['a','b','c','d','e','f','g','h'], faces: [] },
    };
    expect(getKind('polyhedron3d').describe(obj)).toMatch(/Khối/);
  });
});
```

- [ ] **Step 1.2.9.2: Implement**

```ts
// src/core/scene/kinds/polyhedron3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type PolyhedronFlavor = 'pyramid' | 'prism' | 'tetrahedron' | 'cube';

export type Polyhedron3DAttrs = {
  flavor: PolyhedronFlavor;
  vertices: string[];
  faces: number[][];
  color?: string;
};

const FLAVOR_LABEL: Record<PolyhedronFlavor, string> = {
  pyramid: 'chóp',
  prism: 'lăng trụ',
  tetrahedron: 'tứ diện',
  cube: 'lập phương',
};

registerKind<Polyhedron3DAttrs>({
  type: 'polyhedron3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.vertices || a.vertices.length < 4) throw new Error('polyhedron3d: cần ≥4 vertices');
    if (!a?.faces || a.faces.length < 4) throw new Error('polyhedron3d: cần ≥4 faces');
  },
  dependsOn: (a) => [...a.vertices],
  describe: (obj) => `Khối ${FLAVOR_LABEL[obj.attrs.flavor]} ${obj.label}`,
  render: () => null,
});
```

Update barrel, commit:
```bash
git add src/core/scene/kinds/polyhedron3d.ts src/core/scene/kinds/__tests__/polyhedron3d.test.ts src/core/scene/kinds/index.ts
git commit -m "feat(scene/kinds): polyhedron3d"
```

---

### Task 1.2.10: Kind `cylinder3d`

Attrs `{ baseCenter, topCenter, radius }`.

- [ ] **Step 1.2.10.1: Test**

```ts
// src/core/scene/kinds/__tests__/cylinder3d.test.ts
import '../cylinder3d';
import { getKind } from '../../registry';

describe('kinds/cylinder3d', () => {
  test('registered', () => { expect(getKind('cylinder3d').schemaVersion).toBe(1); });
  test('dependsOn = [base, top]', () => {
    expect(getKind('cylinder3d').dependsOn({ baseCenter: 'B', topCenter: 'T', radius: 1 } as never))
      .toEqual(['B', 'T']);
  });
  test('validate throw nếu radius <= 0', () => {
    expect(() => getKind('cylinder3d').validate?.({ baseCenter: 'B', topCenter: 'T', radius: 0 } as never)).toThrow();
  });
});
```

- [ ] **Step 1.2.10.2: Implement**

```ts
// src/core/scene/kinds/cylinder3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Cylinder3DAttrs = { baseCenter: string; topCenter: string; radius: number; color?: string };

registerKind<Cylinder3DAttrs>({
  type: 'cylinder3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.baseCenter || !a?.topCenter) throw new Error('cylinder3d: baseCenter/topCenter required');
    if (!(a.radius > 0)) throw new Error('cylinder3d: radius > 0');
  },
  dependsOn: (a) => [a.baseCenter, a.topCenter],
  describe: (obj) => `Trụ ${obj.label} R=${obj.attrs.radius.toFixed(2)}`,
  render: () => null,
});
```

Update barrel, commit:
```bash
git add src/core/scene/kinds/cylinder3d.ts src/core/scene/kinds/__tests__/cylinder3d.test.ts src/core/scene/kinds/index.ts
git commit -m "feat(scene/kinds): cylinder3d"
```

---

### Task 1.2.11: Kind `cone3d`

Attrs `{ baseCenter, apex, radius }`.

- [ ] **Step 1.2.11.1: Test**

```ts
// src/core/scene/kinds/__tests__/cone3d.test.ts
import '../cone3d';
import { getKind } from '../../registry';

describe('kinds/cone3d', () => {
  test('registered', () => { expect(getKind('cone3d').schemaVersion).toBe(1); });
  test('dependsOn = [base, apex]', () => {
    expect(getKind('cone3d').dependsOn({ baseCenter: 'B', apex: 'A', radius: 1 } as never))
      .toEqual(['B', 'A']);
  });
});
```

- [ ] **Step 1.2.11.2: Implement**

```ts
// src/core/scene/kinds/cone3d.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export type Cone3DAttrs = { baseCenter: string; apex: string; radius: number; color?: string };

registerKind<Cone3DAttrs>({
  type: 'cone3d',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a?.baseCenter || !a?.apex) throw new Error('cone3d: baseCenter/apex required');
    if (!(a.radius > 0)) throw new Error('cone3d: radius > 0');
  },
  dependsOn: (a) => [a.baseCenter, a.apex],
  describe: (obj) => `Nón ${obj.label} R=${obj.attrs.radius.toFixed(2)}`,
  render: () => null,
});
```

Update barrel:
```ts
// src/core/scene/kinds/index.ts
import './point3d';
import './segment3d';
import './line3d';
import './ray3d';
import './vector3d';
import './plane3d';
import './polygon3d';
import './sphere3d';
import './polyhedron3d';
import './cylinder3d';
import './cone3d';
export {};
```

Commit:
```bash
git add src/core/scene/kinds/cone3d.ts src/core/scene/kinds/__tests__/cone3d.test.ts src/core/scene/kinds/index.ts
git commit -m "feat(scene/kinds): cone3d + cập nhật barrel với 11 kind 3D"
```

---

### Task 1.2.12: Smoke test toàn registry

**Files:**
- Test: `src/core/scene/__tests__/registry-smoke.test.ts`

- [ ] **Step 1.2.12.1: Viết smoke test**

```ts
// src/core/scene/__tests__/registry-smoke.test.ts
import '../kinds';
import { listKinds } from '../registry';

describe('registry smoke (sau khi import barrel kinds)', () => {
  test('có đủ 11 kind 3D đã đăng ký', () => {
    const types = listKinds().map(k => k.type).sort();
    expect(types).toEqual([
      'cone3d',
      'cylinder3d',
      'line3d',
      'plane3d',
      'point3d',
      'polygon3d',
      'polyhedron3d',
      'ray3d',
      'segment3d',
      'sphere3d',
      'vector3d',
    ]);
  });

  test('mọi kind có describe và dependsOn', () => {
    for (const def of listKinds()) {
      expect(typeof def.describe).toBe('function');
      expect(typeof def.dependsOn).toBe('function');
    }
  });
});
```

- [ ] **Step 1.2.12.2: Run test**

Run: `npm test -- --testPathPattern 'registry-smoke'`
Expected: PASS.

- [ ] **Step 1.2.12.3: Run typecheck + toàn bộ test core**

Run: `npm run typecheck && npm test -- --testPathPattern 'core/scene'`
Expected: PASS toàn bộ.

- [ ] **Step 1.2.12.4: Commit + push PR 1.2**

```bash
git add src/core/scene/__tests__/registry-smoke.test.ts
git commit -m "test(scene): smoke check đủ 11 kind 3D"
git push origin main
```

---

## PR 1.3 — `JxgRenderer3D`

**Mục tiêu**: subscribe store → diff state → render qua JSXGraph view3d. Test với mock JSXGraph (re-purpose `__tests__/renderer/JxgRenderer.test.ts` cũ).

### Task 1.3.1: RenderCtx + render helpers cho 3D

**Files:**
- Create: `src/core/scene/render/types.ts`

- [ ] **Step 1.3.1.1: Tạo file types render**

```ts
// src/core/scene/render/types.ts
import type { RenderCtx } from '../types';

export type Theme3D = {
  point: { size: number; color: string };
  line: { strokeWidth: number; color: string };
  plane: { fillOpacity: number; color: string };
};

export const DEFAULT_THEME_3D: Theme3D = {
  point: { size: 4, color: '#1e40af' },
  line: { strokeWidth: 2, color: '#0f172a' },
  plane: { fillOpacity: 0.15, color: '#60a5fa' },
};

export type RenderCtx3D = RenderCtx & {
  theme: Theme3D;
};
```

- [ ] **Step 1.3.1.2: Commit**

```bash
git add src/core/scene/render/types.ts
git commit -m "feat(scene/render): RenderCtx3D + DEFAULT_THEME_3D"
```

---

### Task 1.3.2: Cài render function vào từng kind 3D

**Mục tiêu**: thay `render: () => null` ở 11 kind thành render thật. Bước này không có test riêng (test ở renderer ở task tiếp). Mỗi kind sửa 1 commit nhỏ — hoặc gộp 1 commit "feat(scene/kinds): render JSXGraph view3d cho 11 kind 3D".

- [ ] **Step 1.3.2.1: Sửa point3d render**

Mở `src/core/scene/kinds/point3d.ts`, thay `render`:

```ts
  render: (obj, ctx) => {
    const view = ctx.jxg as any;
    const c = obj.attrs.constraint;
    const opts = {
      name: obj.label,
      visible: obj.visible,
      fixed: obj.locked,
      strokeColor: obj.attrs.color ?? '#1e40af',
      fillColor: obj.attrs.color ?? '#1e40af',
    };
    let coords: number[];
    if (c.kind === 'free') coords = [c.x, c.y, c.z];
    else if (c.kind === 'onGround') coords = [c.x, c.y, 0];
    else if (c.kind === 'onAxis') {
      coords = c.axis === 'x' ? [c.t, 0, 0] : c.axis === 'y' ? [0, c.t, 0] : [0, 0, c.t];
    } else if (c.kind === 'onPlane') {
      const plane = ctx.resolveRef(c.planeId) as any;
      return view.create('point3d', [() => plane.F(c.u, c.v)[0], () => plane.F(c.u, c.v)[1], () => plane.F(c.u, c.v)[2]], opts);
    } else if (c.kind === 'onLine') {
      const line = ctx.resolveRef(c.lineId) as any;
      return view.create('point3d', [() => line.F(c.t)[0], () => line.F(c.t)[1], () => line.F(c.t)[2]], opts);
    } else if (c.kind === 'onPolygon') {
      const poly = ctx.resolveRef(c.polygonId) as any;
      return view.create('point3d', [() => poly.F(c.u, c.v)[0], () => poly.F(c.u, c.v)[1], () => poly.F(c.u, c.v)[2]], opts);
    } else if (c.kind === 'onSphere') {
      const sph = ctx.resolveRef(c.sphereId) as any;
      return view.create('point3d', [
        () => sph.F(c.theta, c.phi)[0],
        () => sph.F(c.theta, c.phi)[1],
        () => sph.F(c.theta, c.phi)[2],
      ], opts);
    } else {
      coords = [0, 0, 0];
    }
    return view.create('point3d', coords, opts);
  },
```

- [ ] **Step 1.3.2.2: Sửa render cho segment3d, line3d, ray3d, vector3d**

Cùng pattern — `ctx.resolveRef(p1)`, `ctx.resolveRef(p2)`, gọi `view.create('line3d', [pA, pB], { straightFirst, straightLast, ... })`.

Ví dụ `segment3d.ts`:

```ts
  render: (obj, ctx) => {
    const view = ctx.jxg as any;
    const pA = ctx.resolveRef(obj.attrs.p1);
    const pB = ctx.resolveRef(obj.attrs.p2);
    return view.create('line3d', [pA, pB], {
      straightFirst: false, straightLast: false,
      strokeColor: obj.attrs.color ?? '#0f172a',
      strokeWidth: 2,
      visible: obj.visible,
    });
  },
```

`line3d.ts`: `straightFirst: true, straightLast: true`.
`ray3d.ts`: `straightFirst: false, straightLast: true`, resolveRef(origin), resolveRef(through).
`vector3d.ts`: `straightFirst: false, straightLast: false`, `lastArrow: { type: 1 }`, resolveRef(from), resolveRef(to).

- [ ] **Step 1.3.2.3: Sửa render plane3d, polygon3d, sphere3d**

`plane3d.ts`:
```ts
  render: (obj, ctx) => {
    const view = ctx.jxg as any;
    return view.create('plane3d', [
      ctx.resolveRef(obj.attrs.p1),
      ctx.resolveRef(obj.attrs.p2),
      ctx.resolveRef(obj.attrs.p3),
    ], { fillOpacity: 0.15, strokeColor: obj.attrs.color ?? '#60a5fa', visible: obj.visible });
  },
```

`polygon3d.ts`:
```ts
  render: (obj, ctx) => {
    const view = ctx.jxg as any;
    return view.create('polygon3d',
      obj.attrs.vertices.map(id => ctx.resolveRef(id)),
      { fillOpacity: 0.15, fillColor: obj.attrs.color ?? '#60a5fa', visible: obj.visible }
    );
  },
```

`sphere3d.ts`:
```ts
  render: (obj, ctx) => {
    const view = ctx.jxg as any;
    return view.create('sphere3d', [
      ctx.resolveRef(obj.attrs.center),
      ctx.resolveRef(obj.attrs.surfacePoint),
    ], { fillOpacity: 0.1, strokeColor: obj.attrs.color ?? '#60a5fa', visible: obj.visible });
  },
```

- [ ] **Step 1.3.2.4: Sửa render polyhedron3d**

Tạo từng face polygon3d. Pattern: tham khảo `src/stamps/geometry-3d/editor/renderer/JxgRenderer*` cũ (đoạn create 6 faces cho pyramid). Trả về object `{ faces: any[] }`:

```ts
  render: (obj, ctx) => {
    const view = ctx.jxg as any;
    const pts = obj.attrs.vertices.map(id => ctx.resolveRef(id));
    const faces = obj.attrs.faces.map(idxs =>
      view.create('polygon3d', idxs.map(i => pts[i]),
        { fillOpacity: 0.15, fillColor: obj.attrs.color ?? '#fbbf24', visible: obj.visible }));
    return { faces };
  },
```

- [ ] **Step 1.3.2.5: Sửa render cylinder3d + cone3d**

`cylinder3d.ts`: tạo 2 đáy (circle3d hoặc polygon faceted) + mặt bên. Có thể tham khảo logic faceted polygon hiện tại của JxgRenderer cũ ở `src/stamps/geometry-3d/__tests__/renderer/JxgRenderer.test.ts` line 116. Đơn giản hoá:

```ts
  render: (obj, ctx) => {
    const view = ctx.jxg as any;
    const a = ctx.resolveRef(obj.attrs.baseCenter);
    const b = ctx.resolveRef(obj.attrs.topCenter);
    return view.create('parametricsurface3d', [
      (u: number, v: number) => (a as any).Z[1] + obj.attrs.radius * Math.cos(u),
      (u: number, v: number) => (a as any).Z[2] + obj.attrs.radius * Math.sin(u),
      (u: number, v: number) => (a as any).Z[3] + v * ((b as any).Z[3] - (a as any).Z[3]),
      [0, 2 * Math.PI], [0, 1],
    ], { strokeColor: obj.attrs.color ?? '#f97316', visible: obj.visible });
  },
```

`cone3d.ts`: tương tự nhưng radius giảm tuyến tính theo v.

> **Note**: nếu logic render cũ ở `src/stamps/geometry-3d/editor/renderer/JxgRenderer*` (file hiện tại) có optimization cho cylinder/cone, copy y nguyên — đừng tự nghĩ lại. Đọc file đó trước khi viết.

- [ ] **Step 1.3.2.6: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 1.3.2.7: Verify test kinds vẫn pass (render không bị test trực tiếp)**

Run: `npm test -- --testPathPattern 'core/scene'`
Expected: PASS.

- [ ] **Step 1.3.2.8: Commit**

```bash
git add src/core/scene/kinds/*.ts
git commit -m "feat(scene/kinds): wire render JSXGraph view3d cho 11 kind 3D"
```

---

### Task 1.3.3: `JxgRenderer3D` (TDD với mock JSXGraph)

**Files:**
- Create: `src/core/scene/render/JxgRenderer3D.ts`
- Test: `src/core/scene/render/__tests__/JxgRenderer3D.test.ts`

- [ ] **Step 1.3.3.1: Viết mock JSXGraph + test**

```ts
// src/core/scene/render/__tests__/JxgRenderer3D.test.ts
import { createStore } from '../../store';
import { createEmptyState } from '../../types';
import { JxgRenderer3D } from '../JxgRenderer3D';
import '../../kinds';
import type { SceneObject } from '../../types';

function mockView() {
  const created: any[] = [];
  const removed: any[] = [];
  const view = {
    create: jest.fn((type: string, parents: any, attrs: any) => {
      const el = { type, parents, attrs, _id: `${type}_${created.length}` };
      created.push(el);
      return el;
    }),
    removeObject: jest.fn((el: any) => { removed.push(el); }),
  };
  return { view, created, removed };
}

const mkPoint = (id: string, x = 0, y = 0, z = 0): SceneObject => ({
  id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1,
  attrs: { constraint: { kind: 'free', x, y, z } },
});

const mkSegment = (id: string, p1: string, p2: string): SceneObject => ({
  id, kind: 'segment3d', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1,
  attrs: { p1, p2 },
});

describe('JxgRenderer3D', () => {
  test('ADD point → view.create("point3d", ...)', () => {
    const store = createStore(createEmptyState('3d'));
    const { view, created } = mockView();
    new JxgRenderer3D(store, view as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A', 1, 2, 3) } });
    expect(created).toHaveLength(1);
    expect(created[0].type).toBe('point3d');
    expect(created[0].parents).toEqual([1, 2, 3]);
  });

  test('ADD segment sau 2 point → resolveRef giải đúng', () => {
    const store = createStore(createEmptyState('3d'));
    const { view, created } = mockView();
    new JxgRenderer3D(store, view as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkSegment('s1', 'A', 'B') } });
    expect(created).toHaveLength(3);
    const seg = created[2];
    expect(seg.type).toBe('line3d');
    expect(seg.parents[0]).toBe(created[0]);
    expect(seg.parents[1]).toBe(created[1]);
  });

  test('DELETE point cascade → segment cũng bị removeObject', () => {
    const store = createStore(createEmptyState('3d'));
    const { view, removed } = mockView();
    new JxgRenderer3D(store, view as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkSegment('s1', 'A', 'B') } });
    store.dispatch({ type: 'DELETE', payload: { id: 'A' } });
    expect(removed.length).toBeGreaterThanOrEqual(2); // A + s1 (cascade)
  });

  test('UPDATE_ATTRS với kind không có update() → remove + recreate', () => {
    const store = createStore(createEmptyState('3d'));
    const { view, created, removed } = mockView();
    new JxgRenderer3D(store, view as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A', 0, 0, 0) } });
    store.dispatch({ type: 'UPDATE_ATTRS', payload: { id: 'A', patch: { constraint: { kind: 'free', x: 5, y: 5, z: 5 } } } });
    expect(removed).toHaveLength(1);
    expect(created).toHaveLength(2);
  });

  test('dispose unsubscribe + remove tất cả', () => {
    const store = createStore(createEmptyState('3d'));
    const { view, removed } = mockView();
    const renderer = new JxgRenderer3D(store, view as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A') } });
    renderer.dispose();
    expect(removed).toHaveLength(1);
    // Dispatch sau dispose không gây thêm side effect
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B') } });
    expect(removed).toHaveLength(1);
  });

  test('LOAD state từ empty → tạo hết object', () => {
    const store = createStore(createEmptyState('3d'));
    const { view, created } = mockView();
    new JxgRenderer3D(store, view as never);
    const loaded = {
      objects: {
        A: mkPoint('A'),
        B: mkPoint('B'),
        s1: mkSegment('s1', 'A', 'B'),
      },
      order: ['A', 'B', 's1'],
      counter: 3,
      meta: { domain: '3d' as const, version: 1 },
    };
    store.dispatch({ type: 'LOAD', payload: { state: loaded } });
    expect(created).toHaveLength(3);
  });
});
```

- [ ] **Step 1.3.3.2: Run fail**

Run: `npm test -- --testPathPattern 'JxgRenderer3D'`
Expected: FAIL — module not found.

- [ ] **Step 1.3.3.3: Implement `JxgRenderer3D.ts`**

```ts
// src/core/scene/render/JxgRenderer3D.ts
import type { Store } from '../store';
import type { State, SceneObject, RenderCtx } from '../types';
import { getKind } from '../registry';
import { DEFAULT_THEME_3D, type Theme3D } from './types';

export type JxgRenderer3DOptions = { theme?: Theme3D };

export class JxgRenderer3D {
  private view: unknown;
  private store: Store;
  private theme: Theme3D;
  private elements = new Map<string, unknown>();
  private unsubscribe: () => void;
  private disposed = false;

  constructor(store: Store, view: unknown, options: JxgRenderer3DOptions = {}) {
    this.store = store;
    this.view = view;
    this.theme = options.theme ?? DEFAULT_THEME_3D;
    this.unsubscribe = store.subscribe((next, prev) => this.applyDiff(prev, next));
    // Render state hiện tại (vd LOAD đã chạy trước khi subscribe)
    this.applyDiff(undefined, store.getState());
  }

  private ctx(): RenderCtx {
    return {
      jxg: this.view,
      resolveRef: (id: string) => {
        const el = this.elements.get(id);
        if (!el) throw new Error(`[scene] resolveRef: chưa render id="${id}"`);
        return el;
      },
      defaults: {},
    };
  }

  private create(obj: SceneObject): void {
    try {
      const def = getKind(obj.kind);
      const el = def.render(obj, this.ctx());
      this.elements.set(obj.id, el);
    } catch (err) {
      console.warn(`[scene/render] không render được ${obj.kind} id="${obj.id}":`, err);
    }
  }

  private remove(id: string): void {
    const el = this.elements.get(id);
    if (!el) return;
    try {
      this.removeFromView(el);
    } catch (err) {
      console.warn(`[scene/render] không remove được id="${id}":`, err);
    }
    this.elements.delete(id);
  }

  private removeFromView(el: unknown): void {
    const view = this.view as { removeObject?: (e: unknown) => void };
    if (el && typeof el === 'object' && 'faces' in (el as Record<string, unknown>)) {
      for (const face of (el as { faces: unknown[] }).faces) {
        view.removeObject?.(face);
      }
      return;
    }
    view.removeObject?.(el);
  }

  private applyDiff(prev: State | undefined, next: State): void {
    if (this.disposed) return;
    const prevObjs = prev?.objects ?? {};
    const nextObjs = next.objects;

    // Xoá ids biến mất, theo thứ tự ngược order trước (để khử dep an toàn)
    for (const id of Object.keys(prevObjs)) {
      if (!(id in nextObjs)) this.remove(id);
    }

    // Thêm/cập nhật, theo state.order (đảm bảo refs có trước)
    for (const id of next.order) {
      const cur = nextObjs[id];
      const old = prevObjs[id] as SceneObject | undefined;
      if (!old) {
        this.create(cur);
        continue;
      }
      if (Object.is(old, cur)) continue;
      // Thay đổi: nếu kind expose update, gọi update; ngược lại remove + create.
      const def = getKind(cur.kind);
      const existing = this.elements.get(id);
      if (def.update && existing) {
        try { def.update(cur, old, this.ctx(), existing); continue; }
        catch (err) { console.warn(`[scene/render] update fail, recreate:`, err); }
      }
      this.remove(id);
      this.create(cur);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.unsubscribe();
    for (const id of Array.from(this.elements.keys())) this.remove(id);
    this.disposed = true;
  }
}
```

- [ ] **Step 1.3.3.4: Run test pass**

Run: `npm test -- --testPathPattern 'JxgRenderer3D'`
Expected: PASS, 6 tests.

- [ ] **Step 1.3.3.5: Commit + push PR 1.3**

```bash
git add src/core/scene/render/JxgRenderer3D.ts src/core/scene/render/__tests__/JxgRenderer3D.test.ts
git commit -m "feat(scene/render): JxgRenderer3D subscribe store → diff → JSXGraph view3d"
git push origin main
```

---

## PR 1.4 — Port 3D EditorPanel + xoá kiến trúc cũ

**Mục tiêu**: Wire store vào EditorPanel 3D, MiniBoard3D, LeftPanel, handlers, hitTest. Xoá `Scene3D.ts`, `persistence.ts`, `labels.ts`, `scene/types.ts` cũ. Cập nhật `serialize.ts` xuất shape mới.

> **Lưu ý quan trọng**: PR này là **risk-cao nhất Phase 1**. Trước khi bắt đầu, đảm bảo có nhánh backup: `git checkout -b backup/pre-pr-1.4 && git checkout main`. Nếu fail giữa chừng có thể rollback.

### Task 1.4.1: Cập nhật `serialize.ts` 3D

**Files:**
- Modify: `src/stamps/geometry-3d/serialize.ts`

- [ ] **Step 1.4.1.1: Đọc file hiện tại**

Run: `cat src/stamps/geometry-3d/serialize.ts`
Expected: thấy `SerializedBoard3D` shape cũ.

- [ ] **Step 1.4.1.2: Viết lại serialize.ts dùng State mới**

```ts
// src/stamps/geometry-3d/serialize.ts
import type { State } from '../../core/scene';
import { migrateState } from '../../core/scene';

export type SerializedBoard3D = {
  version: 2;
  state: State;
};

export function serializeBoard3D(state: State): SerializedBoard3D {
  return { version: 2, state };
}

export function deserializeBoard3D(raw: unknown): State {
  if (raw && typeof raw === 'object' && (raw as any).version === 2) {
    return migrateState((raw as any).state);
  }
  // Format không nhận diện được → wipe (đã thống nhất trong spec).
  console.warn('[3d/serialize] format không nhận diện, dùng state rỗng');
  const { createEmptyState } = require('../../core/scene');
  return createEmptyState('3d');
}
```

- [ ] **Step 1.4.1.3: Cập nhật/viết lại test serialize**

```ts
// src/stamps/geometry-3d/__tests__/serialize.test.ts (viết mới — xoá file cũ nếu có)
import { serializeBoard3D, deserializeBoard3D } from '../serialize';
import { createEmptyState } from '../../../core/scene';

describe('3d/serialize', () => {
  test('round-trip empty state', () => {
    const s = createEmptyState('3d');
    const raw = serializeBoard3D(s);
    expect(raw.version).toBe(2);
    const back = deserializeBoard3D(raw);
    expect(back).toEqual(s);
  });

  test('deserialize format không nhận diện → empty', () => {
    const s = deserializeBoard3D({ version: 1, foo: 'bar' });
    expect(s.objects).toEqual({});
  });
});
```

- [ ] **Step 1.4.1.4: Run test + commit**

Run: `npm test -- --testPathPattern 'geometry-3d/__tests__/serialize'`
Expected: PASS.

```bash
git add src/stamps/geometry-3d/serialize.ts src/stamps/geometry-3d/__tests__/serialize.test.ts
git commit -m "feat(geometry-3d): serialize.ts dùng core/scene State v2"
```

---

### Task 1.4.2: Sub-task — replace `Scene3D` API trong tool handlers

**Files:**
- Modify: `src/stamps/geometry-3d/editor/tools/handlers/_ensurePoint.ts`
- Modify: `src/stamps/geometry-3d/editor/tools/handlers/point.ts`
- Modify: `src/stamps/geometry-3d/editor/tools/handlers/polygon.ts`
- Modify: `src/stamps/geometry-3d/editor/tools/handlers/pyramid.ts`
- Modify: `src/stamps/geometry-3d/editor/tools/handlers/prism.ts`

Mỗi handler hiện gọi `scene.addPoint(...)` / `scene.addObject(...)`. Sửa thành `store.dispatch(...)`.

- [ ] **Step 1.4.2.1: Đọc 1 handler để hiểu signature**

Run: `cat src/stamps/geometry-3d/editor/tools/handlers/point.ts`
Expected: thấy `scene: Scene3D` trong signature.

- [ ] **Step 1.4.2.2: Thay đổi `_ensurePoint.ts`**

Đổi tham số `scene: Scene3D` thành `store: Store`. Trong body:
- `scene.addPoint(constraint, label)` → tạo `SceneObject` với `nextLabel(store.getState(), 'point3d')`, `dispatch({ type: 'ADD', payload: { obj } })`.
- Trả về `obj.id`.

```ts
// src/stamps/geometry-3d/editor/tools/handlers/_ensurePoint.ts
import type { Store, SceneObject } from '../../../../../core/scene';
import { nextLabel } from '../../../../../core/scene';
import type { Constraint3D } from '../../../../../core/scene/kinds/3d-constraint';

let counter = 0;

export function ensurePoint(store: Store, constraint: Constraint3D, label?: string): string {
  const state = store.getState();
  counter += 1;
  const id = `p${state.counter + 1}_${counter}`;
  const obj: SceneObject = {
    id,
    kind: 'point3d',
    label: label ?? nextLabel(state, 'point3d'),
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
    attrs: { constraint },
  };
  store.dispatch({ type: 'ADD', payload: { obj } });
  return id;
}
```

> Lưu ý id pattern phải unique nhưng dễ debug — dùng counter local + state counter. Nếu codebase đã có id-generator pattern khác, follow cái đó.

- [ ] **Step 1.4.2.3: Thay đổi `point.ts`, `polygon.ts`, `pyramid.ts`, `prism.ts`**

Tương tự — đổi `scene: Scene3D` thành `store: Store`, đổi `scene.addObject('polygon', ...)` thành `store.dispatch({ type: 'ADD', payload: { obj: { kind: 'polygon3d', attrs: { vertices: [...] }, ... } } })`.

- [ ] **Step 1.4.2.4: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS sau khi sửa hết (có thể vẫn còn lỗi ở file chưa sửa — đánh dấu để task tiếp).

- [ ] **Step 1.4.2.5: Commit**

```bash
git add src/stamps/geometry-3d/editor/tools/handlers/*.ts
git commit -m "refactor(geometry-3d/handlers): dispatch action vào store thay vì gọi Scene3D"
```

---

### Task 1.4.3: Thay `Scene3D` trong `MiniBoard3D.tsx`

**Files:**
- Modify: `src/stamps/geometry-3d/editor/MiniBoard3D.tsx`

- [ ] **Step 1.4.3.1: Đọc file**

Run: `wc -l src/stamps/geometry-3d/editor/MiniBoard3D.tsx`
Expected: 388 dòng.

- [ ] **Step 1.4.3.2: Sửa MiniBoard3D**

Thay `scene = new Scene3D()` bằng `store = createStore(createEmptyState('3d'))`. Thay tất cả `scene.on('add', ...)` bằng `store.subscribe(...)`. Thay `scene.addPoint(...)` bằng các handler đã sửa ở Task 1.4.2.

Thay `JxgRenderer` cũ bằng `JxgRenderer3D` từ `core/scene/render`.

Pattern chính:
```tsx
import { createStore, createEmptyState, type Store } from '../../../core/scene';
import { JxgRenderer3D } from '../../../core/scene/render/JxgRenderer3D';

// trong component:
const storeRef = useRef<Store | null>(null);
if (!storeRef.current) {
  storeRef.current = createStore(createEmptyState('3d'));
}

useEffect(() => {
  if (!viewRef.current) return;
  const renderer = new JxgRenderer3D(storeRef.current!, viewRef.current);
  return () => renderer.dispose();
}, []);
```

- [ ] **Step 1.4.3.3: Verify typecheck cục bộ**

Run: `npm run typecheck 2>&1 | grep -A2 MiniBoard3D | head -20`
Expected: 0 lỗi cho file này (file khác có thể còn).

- [ ] **Step 1.4.3.4: Commit**

```bash
git add src/stamps/geometry-3d/editor/MiniBoard3D.tsx
git commit -m "refactor(geometry-3d/MiniBoard3D): port sang core/scene store + JxgRenderer3D"
```

---

### Task 1.4.4: Thay `Scene3D` trong `EditorPanel.tsx`

**Files:**
- Modify: `src/stamps/geometry-3d/editor/EditorPanel.tsx`

- [ ] **Step 1.4.4.1: Đọc file (400 dòng)**

- [ ] **Step 1.4.4.2: Thay**

- `scene = new Scene3D()` → `store = createStore(...)`.
- `scene.snapshot()` cho persist serialize → `store.getState()`.
- `scene.undo()/redo()/canUndo()/canRedo()` → `store.undo()/redo()/canUndo()/canRedo()`.
- `scene.on('add'/'change'/'delete')` → `store.subscribe((next, prev) => {...})`.
- Persist serialize cuối khi insert: `serializeBoard3D(store.getState())`.

- [ ] **Step 1.4.4.3: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS cho EditorPanel (file khác có thể còn).

- [ ] **Step 1.4.4.4: Commit**

```bash
git add src/stamps/geometry-3d/editor/EditorPanel.tsx
git commit -m "refactor(geometry-3d/EditorPanel): wire store + JxgRenderer3D"
```

---

### Task 1.4.5: `LeftPanel.tsx` dùng selectors

**Files:**
- Modify: `src/stamps/geometry-3d/editor/LeftPanel.tsx`

- [ ] **Step 1.4.5.1: Sửa LeftPanel**

- Subscribe store qua `useSyncExternalStore(store.subscribe, store.getState)`.
- Render danh sách qua `listObjects(state)` + `getKind(o.kind).describe(o)`.
- Algebra rows: gọi `kind.measure?.(obj, state)` nếu có.

- [ ] **Step 1.4.5.2: Commit**

```bash
git add src/stamps/geometry-3d/editor/LeftPanel.tsx
git commit -m "refactor(geometry-3d/LeftPanel): đọc state qua selectors + kind.describe/measure"
```

---

### Task 1.4.6: hitTest + constraintMath không phụ thuộc Scene3D

**Files:**
- Modify: `src/stamps/geometry-3d/editor/hitTest/*.ts`
- Modify: `src/stamps/geometry-3d/editor/scene/constraintMath.ts` (di chuyển nếu cần)
- Modify: `src/stamps/geometry-3d/editor/scene/geometryChecks.ts`

- [ ] **Step 1.4.6.1: Đổi signature**

Mỗi function trong `hitTest/*.ts` hiện nhận `scene: Scene3D`. Đổi thành `state: State`. Internal:
- `scene.get(id)` → `state.objects[id]`
- `scene.list()` → `listObjects(state)`

- [ ] **Step 1.4.6.2: Commit**

```bash
git add src/stamps/geometry-3d/editor/hitTest src/stamps/geometry-3d/editor/scene/constraintMath.ts src/stamps/geometry-3d/editor/scene/geometryChecks.ts
git commit -m "refactor(geometry-3d/hitTest): nhận State thay vì Scene3D"
```

---

### Task 1.4.7: host.tsx — wire undo/redo qua store

**Files:**
- Modify: `src/stamps/geometry-3d/host.tsx`

- [ ] **Step 1.4.7.1: Sửa host**

- `scene.onHistoryChange(...)` → `store.subscribe(() => setCanUndo(store.canUndo()))`.
- `onUndo={() => scene.undo()}` → `onUndo={() => store.undo()}`.

- [ ] **Step 1.4.7.2: Commit**

```bash
git add src/stamps/geometry-3d/host.tsx
git commit -m "refactor(geometry-3d/host): undo/redo wiring qua store.subscribe"
```

---

### Task 1.4.8: Xoá file cũ

**Files:**
- Delete: `src/stamps/geometry-3d/editor/scene/Scene3D.ts`
- Delete: `src/stamps/geometry-3d/editor/scene/persistence.ts`
- Delete: `src/stamps/geometry-3d/editor/scene/labels.ts`
- Delete: `src/stamps/geometry-3d/editor/scene/types.ts`
- Delete: `src/stamps/geometry-3d/__tests__/scene/Scene3D.test.ts`
- Delete: `src/stamps/geometry-3d/editor/renderer/` (toàn bộ folder cũ — JxgRenderer cũ + test cũ)
- Delete: `src/stamps/geometry-3d/__tests__/renderer/JxgRenderer.test.ts`

- [ ] **Step 1.4.8.1: Tìm còn ai import file sắp xoá**

Run: `grep -rln "from.*scene/Scene3D\|from.*scene/persistence\|from.*scene/labels\|from.*editor/renderer" src/`
Expected: 0 kết quả (đã sửa hết ở task 1.4.2–1.4.7).

- [ ] **Step 1.4.8.2: Xoá**

```bash
git rm src/stamps/geometry-3d/editor/scene/Scene3D.ts \
       src/stamps/geometry-3d/editor/scene/persistence.ts \
       src/stamps/geometry-3d/editor/scene/labels.ts \
       src/stamps/geometry-3d/editor/scene/types.ts \
       src/stamps/geometry-3d/__tests__/scene/Scene3D.test.ts \
       src/stamps/geometry-3d/__tests__/renderer/JxgRenderer.test.ts
git rm -r src/stamps/geometry-3d/editor/renderer
```

- [ ] **Step 1.4.8.3: Verify typecheck + test**

Run: `npm run typecheck && npm test`
Expected: PASS toàn bộ.

- [ ] **Step 1.4.8.4: Commit**

```bash
git commit -m "refactor(geometry-3d): xoá Scene3D + persistence + labels + JxgRenderer cũ"
```

---

### Task 1.4.9: Playwright smoke 3D

**Files:**
- Tests có sẵn ở `tests-e2e/` hoặc `tests/playwright/` — chạy chúng.

- [ ] **Step 1.4.9.1: Run E2E**

Run: `npm run test:e2e -- --grep "3d"` (hoặc tên test 3D thực tế nếu khác)
Expected: PASS smoke 3D.

- [ ] **Step 1.4.9.2: Nếu fail**

Investigate kỹ. Common issues:
- JxgRenderer3D không subscribe trước khi LOAD → fix: gọi `applyDiff(undefined, store.getState())` trong constructor (đã có).
- Label collision → fix: ensurePoint dùng id pattern unique hơn.
- Render thiếu khi LOAD: `state.order` không có id → verify deserialize giữ order.

- [ ] **Step 1.4.9.3: Manual smoke trong demo app**

Run: `npm run demo` (mở demo app), thử:
1. Vẽ điểm A, B, C.
2. Vẽ polygon ABC.
3. Drag điểm A → polygon move theo.
4. Undo 4 lần → empty.
5. Redo 4 lần → khôi phục.
6. Insert vào canvas → reload → re-edit → state khớp.

Expected: tất cả OK.

- [ ] **Step 1.4.9.4: Commit (nếu có fix)**

```bash
git add src/
git commit -m "fix(geometry-3d): [mô tả fix cụ thể từ smoke]"
```

---

### Task 1.4.10: Push PR 1.4

- [ ] **Step 1.4.10.1: Push**

Run: `git push origin main`
Expected: success.

---

## PR 1.5 — Release v0.12.0

### Task 1.5.1: Bump version + build dist

- [ ] **Step 1.5.1.1: Update CHANGELOG/README nếu có**

(Repo này không có CHANGELOG.md riêng → skip.)

- [ ] **Step 1.5.1.2: Run build**

Run: `npm run build`
Expected: dist/ regenerated. Không lỗi.

- [ ] **Step 1.5.1.3: Verify dist có "use client"**

Run: `head -2 dist/index.js dist/index.mjs`
Expected: dòng đầu là `"use client";`.

- [ ] **Step 1.5.1.4: Commit dist**

```bash
git add dist/
git commit -m "build: dist/ cho v0.12.0 (scene core + 3D port)"
```

- [ ] **Step 1.5.1.5: Bump version + tag**

Run: `npm version minor`
Expected: 0.11.0 → 0.12.0. Tự commit + tag `v0.12.0`.

- [ ] **Step 1.5.1.6: Push với tag**

Run: `git push --follow-tags origin main`
Expected: push commit + tag thành công.

---

## Self-Review

**Spec coverage:**
- ✅ `core/scene/` pure TS → PR 1.1.
- ✅ Immutable + Immer → PR 1.1.5.
- ✅ Action layer → PR 1.1.4 + 1.1.5.
- ✅ Per-kind schema + migrations → PR 1.1.7.
- ✅ Kind registry — 11 kind 3D → PR 1.2.
- ✅ JxgRenderer3D apply diff → PR 1.3.
- ✅ 3D EditorPanel port → PR 1.4.
- ✅ Xoá Scene3D + persistence cũ → PR 1.4.8.
- ⬜ 2D port → **Phase 2** (out of scope plan này).
- ⬜ Object list panel + action recorder → **Phase 3** (out of scope).

**Placeholder check:** không có TBD/TODO. Có 1 chỗ note "đọc file cũ trước khi viết" ở Task 1.3.2.5 cho render cylinder/cone — đây là chỉ dẫn cụ thể tham khảo file đường dẫn cụ thể, không phải placeholder.

**Type consistency:** Store/State/Action/SceneObject/KindDef nhất quán suốt plan. `dispatch({ type: 'ADD', payload: { obj } })` shape giống nhau ở mọi nơi.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-20-scene-phase-1-3d.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch fresh subagent per task, review giữa các task. Tốc độ nhanh, isolation tốt.

**2. Inline Execution** — Execute tasks trong session hiện tại, checkpoint review theo batch (vd: theo PR).

**Bạn chọn cách nào?**
