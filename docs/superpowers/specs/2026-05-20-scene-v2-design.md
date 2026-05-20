# Scene v2 — Immutable state + actions + schema migrations + kind registry

**Date**: 2026-05-20
**Issue**: #20
**Status**: Approved design, awaiting implementation plan
**Driver**: Toàn diện — animation timeline/replay, plugin stamp ecosystem, AI agent + multi-user (CRDT) tương lai, code quality (MiniBoard 2D 1469 dòng).
**Approach**: Phương án C (domain-by-domain — 3D trước, 2D sau); freeze feature work trên 2 stamp 3-4 tuần; **bỏ kiến trúc cũ hoàn toàn**, không giữ song song.

---

## 1. Bối cảnh

Hai stamp hình học hiện tại có 2 kiến trúc khác nhau:

- **2D** (`src/stamps/geometry-2d/`): JSXGraph vừa là model vừa là view. `MiniBoard.tsx` (1469 dòng) tự quản qua `creationLogRef` (log replay-only) + `objMapRef` (id → JxgObj). Không có model layer.
- **3D** (`src/stamps/geometry-3d/`): có `Scene3D` class (253 dòng, `src/stamps/geometry-3d/editor/scene/Scene3D.ts`) làm model riêng — Map + listeners + snapshot-based undo/redo. `JxgRenderer` (có test ở `__tests__/renderer/JxgRenderer.test.ts`) apply diff vào JSXGraph view3d.

3D đi đúng hướng nhưng còn 4 friction sẽ chặn các feature roadmap: animation/replay, plugin stamp, AI agent dispatch action, multi-user. Scene v2 hợp nhất 2 stamp về cùng pattern và xử lý cả 4.

## 2. Goals / Non-goals

### Goals
- 1 module pure TypeScript `src/core/scene-v2/` không phụ thuộc JSXGraph — test 100% không cần jsdom.
- Immutable state qua Immer; structural sharing cho undo/redo; equality bằng `Object.is`.
- Action layer (Redux-style) — mọi thay đổi state đi qua `dispatch(action)`. Action serializable JSON.
- Kind registry: thêm kind mới = 1 file `kinds/<kind>.ts`, không sửa core.
- Per-kind schema versioning + migration chain. Lock file format v2 trở đi.
- 2 renderer (`JxgRenderer` 2D, `JxgRenderer3D` 3D) tự subscribe store, apply diff.
- Xoá hoàn toàn `Scene3D` class, `creationLogRef`, `objMapRef`, `persistence.ts` cũ — không giữ song song.

### Non-goals
- **Không** đọc file đã lưu format cũ. Wipe + reset là OK (user đã xác nhận). Migration chỉ phục vụ tương lai (v2 → v3 → v4).
- **Không** làm multi-user CRDT, AI agent runtime, plugin loader runtime trong scope này — chỉ chuẩn bị nền (action serializable, registry mở).
- **Không** đổi UX/UI hiện tại — refactor thuần kiến trúc. EditorPanel/LeftPanel/PropertiesPopover giữ nguyên hành vi.
- **Không** đổi format Excalidraw custom data ở element-level — chỉ đổi nội dung serialized của stamp.

## 3. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  src/core/scene-v2/                    (pure TS, 0 dep JSXGraph)  │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  types.ts         State, Action, KindDef, SceneObject      │   │
│  │  store.ts         createStore() → getState/dispatch/       │   │
│  │                   subscribe/undo/redo/transaction          │   │
│  │  reducer.ts       reduce(state, action): State             │   │
│  │  registry.ts      registerKind / getKind / listKinds       │   │
│  │  selectors.ts     listObjects, byKind, dependentsOf,       │   │
│  │                   nextLabel                                │   │
│  │  kinds/                                                    │   │
│  │    index.ts       barrel — import = đăng ký xong           │   │
│  │    point.ts, segment.ts, line.ts, circle.ts, polygon.ts    │   │
│  │    point3d.ts, line3d.ts, plane3d.ts, polygon3d.ts,        │   │
│  │    sphere3d.ts, polyhedron3d.ts, cylinder3d.ts, cone3d.ts  │   │
│  │  migrations/                                               │   │
│  │    runMigrations.ts                                        │   │
│  │  __tests__/        pure unit tests, không cần jsdom        │   │
│  └────────────────────────────────────────────────────────────┘   │
│         ▲ dispatch(action)              │ state changes            │
│         │                               ▼                          │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  src/core/scene-v2/render/         (dep: jsxgraph)         │   │
│  │    JxgRenderer.ts     subscribe store → diff → JXG board   │   │
│  │    JxgRenderer3D.ts   subscribe store → diff → JXG view3d  │   │
│  │    __tests__/         test với mock JSXGraph (như hiện tại)│   │
│  └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                  ▲                     │
                  │ dispatch            │ subscribe
                  │                     ▼
┌──────────────────────────────────────────────────────────────────┐
│  src/stamps/geometry-2d/editor/  &  geometry-3d/editor/            │
│    EditorPanel.tsx   ─ owns store + renderer                       │
│    MiniBoard.tsx     ─ DOM/event → dispatch(action)                │
│    LeftPanel.tsx     ─ object list từ selectors                    │
│    PropertiesPopover ─ dispatch UPDATE_ATTRS                       │
└──────────────────────────────────────────────────────────────────┘
```

**Nguyên tắc**:
- `core/scene-v2/` (trừ subdir `render/`) **không import JSXGraph** — chạy được trong Node, test thuần.
- `render/` là adapter layer duy nhất biết JSXGraph. Đổi engine sau này chỉ thay layer này.
- `kinds/<kind>.ts` là **single source of truth** cho 1 kind: schema, migrate, render, describe, measure, dependsOn. Thêm kind = 1 file.
- Store expose API hẹp. Không expose mutation trực tiếp.

## 4. Components & API

### 4.1 `types.ts`

```ts
export type SceneObject = {
  id: string;
  kind: string;                       // 'point' | 'segment' | 'point3d' | ...
  label: string;
  visible: boolean;
  locked: boolean;
  layer: string;                      // 'default' để tương thích tương lai
  schemaVersion: number;              // per-kind version
  attrs: Record<string, unknown>;     // kind-specific (toạ độ, refs, color...)
};

export type State = {
  readonly objects: Readonly<Record<string, SceneObject>>;
  readonly order: readonly string[];
  readonly counter: number;
  readonly meta: { domain: '2d' | '3d'; version: number };  // state-level version
};

export type Action =
  | { type: 'ADD'; payload: { obj: SceneObject } }
  | { type: 'UPDATE'; payload: { id: string; patch: Partial<SceneObject> } }
  | { type: 'UPDATE_ATTRS'; payload: { id: string; patch: Record<string, unknown> } }
  | { type: 'DELETE'; payload: { id: string } }       // cascade qua dependsOn
  | { type: 'RESET' }
  | { type: 'LOAD'; payload: { state: State } }
  | { type: 'TRANSACTION'; payload: { actions: Action[] } };

export type KindDef<A = Record<string, unknown>> = {
  type: string;
  schemaVersion: number;
  migrate: Record<number, (prev: any) => any>;        // {1: v0→v1, 2: v1→v2, ...}
  validate?: (attrs: A) => void;                      // throw nếu invalid
  dependsOn: (attrs: A) => string[];                  // ids tham chiếu
  describe: (obj: SceneObject) => string;             // cho object list / algebra
  measure?: (obj: SceneObject, state: State) =>
    | { label: string; value: number }[]
    | null;
  render: (obj: SceneObject, ctx: RenderCtx) => unknown;   // tạo JSXGraph obj
  update?: (obj: SceneObject, prev: SceneObject, ctx: RenderCtx, existing: unknown) => void;
    // optional cheap-update path: nếu định nghĩa, renderer ưu tiên gọi update
    // thay vì remove+render khi chỉ attrs đổi (không phải refs)
};

export type RenderCtx = {
  jxg: any;                          // JXG.Board hoặc View3D
  resolveRef: (id: string) => unknown;  // get existing JSXGraph obj by id
  defaults: Record<string, unknown>;    // theme attrs
};
```

### 4.2 `store.ts`

```ts
export function createStore(initial: State, options?: { historyLimit?: number }): Store;

export interface Store {
  getState(): State;
  dispatch(action: Action): void;
  subscribe(listener: (state: State, prev: State, action: Action) => void): () => void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  transaction(fn: (dispatch: (a: Action) => void) => void): void;   // 1 history entry
  withoutHistory(fn: () => void): void;                              // skip snapshot
}
```

- Mỗi `dispatch` → `produce(state, draft => reduce(draft, action))` (Immer).
- History = `State[]` ref. Structural sharing → snapshot chi phí O(diff size).
- Default `historyLimit = 100`. Cũ nhất bị shift khi tràn.
- `transaction(fn)` capture 1 snapshot trước fn, gộp tất cả dispatch bên trong vào 1 undo entry.
- `withoutHistory(fn)` skip snapshot — dùng cho thao tác internal (vd reload state lúc init).

### 4.3 `reducer.ts`

Pure `(state, action) => state`. Cho `DELETE` chạy `collectDependents(state, id)` (BFS qua `kind.dependsOn`), xoá hết. Cho `ADD`/`UPDATE` chạy `kind.validate` nếu định nghĩa, throw nếu invalid.

### 4.4 `registry.ts`

```ts
const registry = new Map<string, KindDef>();
export function registerKind(def: KindDef): void;
export function getKind(type: string): KindDef;       // throw nếu unknown
export function listKinds(): KindDef[];
```

Side-effect at import: mỗi file trong `kinds/` gọi `registerKind` tại top-level. `kinds/index.ts` re-export tất cả → consumer chỉ cần `import 'core/scene-v2/kinds'` một lần (làm trong `core/scene-v2/index.ts`).

### 4.5 `kinds/<kind>.ts`

Ví dụ:
```ts
// kinds/point3d.ts
import { registerKind } from '../registry';

type Point3DAttrs = {
  constraint: Constraint3D;
  color?: string;
};

registerKind({
  type: 'point3d',
  schemaVersion: 1,
  migrate: {},
  validate: (attrs) => {
    if (!attrs.constraint) throw new Error('point3d: constraint required');
  },
  dependsOn: (attrs) => {
    const c = attrs.constraint;
    switch (c.kind) {
      case 'onPlane': return [c.planeId];
      case 'onLine': return [c.lineId];
      case 'onPolygon': return [c.polygonId];
      case 'onSphere': return [c.sphereId];
      default: return [];
    }
  },
  describe: (obj) => formatPoint3DLabel(obj),
  render: (obj, ctx) => ctx.jxg.create('point3d', [obj.attrs.constraint], { ...ctx.defaults, ... }),
});
```

### 4.6 `render/JxgRenderer.ts` / `JxgRenderer3D.ts`

```ts
export class JxgRenderer {
  constructor(store: Store, board: JXG.Board, options?: { theme?: Theme });
  dispose(): void;
}
```

- Constructor `subscribe(store)`. Trên mỗi callback `(state, prev, action)`:
  - Diff `state.objects` vs `prev.objects` bằng `Object.is`.
  - Với mỗi changed id: nếu obj mới → `kind.render(obj, ctx)`; nếu obj đổi → `removeObject` + `kind.render`; nếu obj biến mất → `removeObject`.
- Maintain internal `Map<id, JxgObject>` để `resolveRef` cho ctx.
- `dispose()` unsubscribe + remove all elements.

### 4.7 `migrations/runMigrations.ts`

```ts
export function migrateState(raw: unknown): State;
```

- Validate raw shape có `meta.version`.
- Per object: lấy `kind.schemaVersion` hiện tại, chạy migration chain từ `obj.schemaVersion` lên.
- State-level migrations (đổi shape của `meta` hoặc top-level State) chạy theo bảng đăng ký ở `migrations/state.ts`.
- Throw nếu kind không có trong registry hoặc version gap không có migration.

### 4.8 `selectors.ts`

Pure helpers cho UI:
```ts
listObjects(state): SceneObject[];          // theo state.order
byKind(state, kind): SceneObject[];
dependentsOf(state, id): string[];          // BFS qua registry.dependsOn
nextLabel(state, kind): string;             // tận dụng scan-fill A-Z hiện tại
canDelete(state, id): boolean;
```

### 4.9 Wiring trong EditorPanel

```tsx
function EditorPanel() {
  const storeRef = useRef<Store>();
  if (!storeRef.current) {
    storeRef.current = createStore(initialState(...));
  }
  const store = storeRef.current;

  const boardRef = useRef<JXG.Board>();
  useEffect(() => {
    const renderer = new JxgRenderer(store, boardRef.current!);
    return () => renderer.dispose();
  }, [store]);

  const state = useSyncExternalStore(store.subscribe, store.getState);
  // render UI từ state qua selectors
}
```

## 5. Data flow

### 5.1 User vẽ điểm
1. User click MiniBoard tại `(x, y)`.
2. Tool handler tính `Constraint`, tạo id qua `nextLabel(state, 'point3d')`.
3. `store.dispatch({ type: 'ADD', payload: { obj: { id, kind: 'point3d', ... } } })`.
4. Reducer thêm vào `objects[id]` + `order`.
5. Renderer subscribe callback → thấy id mới → `kind.render` tạo JXG element → add vào `Map<id, JxgObject>`.
6. LeftPanel subscribe → list mới → re-render object list.

### 5.2 User drag điểm
1. JSXGraph drag handler gửi `(x, y)` mới.
2. Tool gọi `store.dispatch({ type: 'UPDATE_ATTRS', payload: { id, patch: { constraint: { kind: 'free', x, y, z: 0 } } } })`.
3. Reducer dùng Immer update obj.
4. Renderer diff → obj đổi → `kind.render` lại (hoặc kind expose `update(obj, ctx)` optional cho diff cheap).
5. **Optimization**: với drag, có thể batch qua `transaction(d => d({ type: 'UPDATE_ATTRS', ... }))` chỉ commit history khi `pointer up`.

### 5.3 Delete cascade
1. User chọn line `l1` (phụ thuộc point `p1`, `p2`).
2. Chọn p1 → delete.
3. `dispatch({ type: 'DELETE', payload: { id: 'p1' } })`.
4. Reducer chạy `collectDependents(state, 'p1')` → `Set { p1, l1 }`.
5. Xoá cả 2 trong objects + order.
6. Renderer diff → 2 ids biến mất → `removeObject` cả 2.

### 5.4 Undo
1. `store.undo()` pop history past, push current vào future, restore prev state.
2. Subscribers fire `(prev, current, undo-marker)`.
3. Renderer diff lại → restore JSXGraph elements.

### 5.5 Load từ persisted JSON
1. Stamp re-edit: lấy serialized JSON từ Excalidraw custom data.
2. Gọi `migrateState(raw)` → State hiện tại.
3. `store.dispatch({ type: 'LOAD', payload: { state } })` (inside `withoutHistory`).
4. Renderer subscribe callback diff từ empty → full → render hết.

## 6. Error handling

- **Unknown kind**: `getKind('foo')` throw `KindNotFoundError`. EditorPanel catch ở root, log + fallback render empty board (user thấy board trống thay vì crash app).
- **Schema migration gap**: `runMigrations` throw `MigrationError(fromVersion, toVersion, kind)`. Caller hiển thị toast "File hình học không tương thích, vui lòng tạo mới".
- **Validation fail** (`kind.validate` throw): reducer catch, không apply state change, log warning. Action coi như no-op (thay vì crash).
- **Renderer fail** (JSXGraph throw khi create): renderer catch per-object trong loop diff. Log warning, skip object đó, tiếp tục các object khác. Internal `Map<id, JxgObject>` bỏ qua id lỗi.
- **Dispatch trong subscriber**: forbid — store có guard `isDispatching` boolean; nếu listener gọi `dispatch` → throw. Force user dùng `queueMicrotask` hoặc `transaction`.

## 7. Testing strategy

### 7.1 Pure unit tests (không cần jsdom)
- `__tests__/store.test.ts`: dispatch tăng counter, subscribe được gọi, undo/redo, transaction gộp 1 entry, withoutHistory skip.
- `__tests__/reducer.test.ts`: từng action — ADD, UPDATE, DELETE cascade, RESET, LOAD, TRANSACTION.
- `__tests__/registry.test.ts`: register + getKind throw nếu unknown.
- `__tests__/selectors.test.ts`: listObjects giữ order, dependentsOf BFS đúng, nextLabel A-Z scan-fill.
- `__tests__/migrations.test.ts`: chain 1→3 qua 2 migration. Throw nếu thiếu step.
- `kinds/__tests__/<kind>.test.ts`: validate, dependsOn, describe — pure logic không touch DOM.

### 7.2 Renderer tests (mock JSXGraph)
Tận dụng mock pattern hiện tại của `__tests__/renderer/JxgRenderer.test.ts`.
- Add point → board.create('point3d', ...) được gọi đúng args.
- Update point → element cũ remove + new element create (hoặc nếu kind impl `update`, chỉ `setAttribute`).
- Delete cascade → tất cả elements liên quan bị remove.
- Undo → diff đi ngược.

### 7.3 Integration tests (EditorPanel — mock Excalidraw, jsdom)
Tận dụng test hiện tại của `EditorPanel.test.tsx`.
- Mount panel → click → board.create() được gọi.
- Properties popover → dispatch UPDATE_ATTRS → re-render.
- Insert vào canvas → serialize state → deserialize → state khớp.

### 7.4 E2E (Playwright harness sẵn có)
- 3D + 2D smoke: vẽ điểm/line/polygon, undo, redo, save, reload.
- Object list panel hiển thị đúng.

### 7.5 Coverage gate
- `core/scene-v2/` (excluding `render/`): 95%+ coverage required.
- `render/`: 80%+ coverage.
- Existing tests sau migration: 100% pass (nếu test cũ bám API cũ, viết lại — không skip).

## 8. Migration plan (Phương án C)

### Phase 1 — 3D (~2 tuần, 5 PRs nhỏ kéo thẳng vào main)

| PR | Scope | Acceptance |
|---|---|---|
| 1.1 | `core/scene-v2/` skeleton: types, store, reducer, registry, selectors, migrations runner. Chưa có kind. Add `immer` dep. | Tests pure pass. typecheck pass. |
| 1.2 | Kinds 3D (point3d, segment3d, line3d, ray3d, vector3d, plane3d, polygon3d, sphere3d, polyhedron3d, cylinder3d, cone3d) + reducer cases + tests. | Mỗi kind có ≥3 test (validate, dependsOn, describe). |
| 1.3 | `JxgRenderer3D` apply-diff + tests mock JSXGraph (re-purpose test hiện tại). | Tests pass. Coverage 80%+. |
| 1.4 | Port `3D EditorPanel` + LeftPanel + tool handlers dùng store. **Xoá** `Scene3D.ts`, `persistence.ts`, `labels.ts` cũ. Update `serialize.ts` xuất state v2. | Playwright 3D smoke pass. Manual smoke đầy đủ. |
| 1.5 | `npm version 0.12.0` + build dist + commit dist + tag. | Release done. |

### Phase 2 — 2D (~1.5 tuần, 4 PRs)

| PR | Scope | Acceptance |
|---|---|---|
| 2.1 | Kinds 2D (point, segment, line, ray, vector, circle, polygon, intersection) + reducer cases + tests. | Mỗi kind có test. |
| 2.2 | `JxgRenderer` 2D + tests mock. | Tests pass. |
| 2.3 | Port `MiniBoard.tsx` — tách 1469 dòng thành: `MiniBoard.tsx` (UI/event ~400 dòng), `useSceneStore` hook, handlers gọi dispatch. **Xoá** `creationLogRef`, `objMapRef`. Update `serialize.ts` 2D. | Playwright 2D smoke pass. Toàn bộ test cũ refactored và pass. |
| 2.4 | `npm version 0.13.0` + dist + tag. | Release done. |

### Phase 3 — Payoff (~0.5 tuần, 2 PRs)

| PR | Scope | Acceptance |
|---|---|---|
| 3.1 | Object list panel cho cả 2D + 3D qua `listObjects(state)` selector. Click row → highlight + scroll-into-view. | Panel hiển thị đúng, click hoạt động. |
| 3.2 | Demo Action recorder: dev-only tool ghi `actions[]` vào sessionStorage → có button "replay" tạo lại scene. Chứng minh foundation cho animation/AI. | Replay scene thành công sau reset. |

### Total
**~4 tuần dev** (chưa tính buffer). Mỗi PR ≤ 600 dòng diff (trừ 1.2 và 2.1 do nhiều kind).

## 9. Acceptance criteria (tổng hợp từ issue + design)

- [ ] `src/core/scene-v2/` module mới — pure TS, 0 dep JSXGraph trong subdir chính.
- [ ] Reducer pure function, mỗi action có test đơn vị (≥1 happy + ≥1 edge case).
- [ ] Kind registry: 11 kind 3D (point3d, segment3d, line3d, ray3d, vector3d, plane3d, polygon3d, sphere3d, polyhedron3d, cylinder3d, cone3d) + 8 kind 2D (point, segment, line, ray, vector, circle, polygon, intersection) đăng ký, mỗi kind 1 file.
- [ ] Migration chain runMigrations hoạt động, có test 1→3 qua 2 step.
- [ ] JxgRenderer 2D + JxgRenderer3D apply diff đúng (test mock).
- [ ] 2D MiniBoard refactor — xoá `creationLogRef` + `objMapRef`, tách file < 600 dòng.
- [ ] 3D EditorPanel refactor — xoá `Scene3D`, dùng store.
- [ ] Object list panel hoạt động cho 2D + 3D.
- [ ] Toàn bộ test cũ refactored và pass (không skip, không xoá để né).
- [ ] Playwright smoke 2D + 3D pass.
- [ ] dist/ committed cho v0.12.0 + v0.13.0.

## 10. Out of scope (xác nhận lại)

- Multi-user CRDT runtime.
- AI agent runtime.
- Plugin loader runtime (chỉ chuẩn bị registry mở).
- Đọc file đã lưu format cũ — wipe + reset là OK.
- Đổi UX/UI.

## 11. Trade-offs / rủi ro

- **Freeze main 3-4 tuần**: bug fix khẩn cấp trên 2D/3D vẫn cho phép nhưng phải port lên scene-v2 trong phase tương ứng.
- **PR 1.4 và PR 2.3 cao rủi ro nhất** — port toàn bộ EditorPanel. Mitigate: chia thêm sub-PR nếu cần (vd 1.4a port read-only, 1.4b port write actions).
- **Test cũ phải viết lại nhiều** (~2200 dòng). Buffer 1 tuần riêng cho test.
- **Immer overhead**: với scene 100+ objects và drag 60fps có thể nhận thấy. Mitigate: transaction batch trong drag, dispatch UPDATE_ATTRS chỉ tại pointer-up.

## 12. Open questions

*(Không có. Tất cả các quyết định scope đã được người dùng xác nhận trong session brainstorming 2026-05-20.)*

## 13. References

- Issue #20 (this repo).
- `src/stamps/geometry-3d/editor/scene/Scene3D.ts` — pattern hiện tại.
- `src/stamps/geometry-3d/__tests__/renderer/JxgRenderer.test.ts` — mock JSXGraph reference.
- [tldraw store architecture](https://tldraw.dev/docs/editor#The-store).
- [Immer](https://immerjs.github.io/immer/).
- Redux Toolkit action/reducer pattern.
