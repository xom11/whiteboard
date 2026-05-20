# Scene Refactor — Phase 2 (2D) Implementation Plan SKELETON

> **Status**: SKELETON. Full TDD steps sẽ viết khi bắt đầu execute (dùng `writing-plans` skill).
> **For agentic workers (khi đã chuyển thành full plan)**: REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`.

**Goal**: Port stamp 2D từ `creationLogRef`/`objMapRef` pattern sang dùng `src/core/scene/` store. Xoá monolithic 1469 dòng `MiniBoard.tsx` thành `<500` dòng. Release `v0.13.0`.

**Issue**: #21
**Spec**: `docs/superpowers/specs/2026-05-20-scene-v2-design.md`
**Phase 1 plan** (reference pattern): `docs/superpowers/plans/2026-05-20-scene-phase-1-3d.md`
**Tag baseline**: `v0.12.0` (`f1ad07b`)

## Pre-flight checklist (đầu session sau)

- [ ] Đọc spec section 4–7 (Components & API, Data flow, Error handling, Testing strategy).
- [ ] Đọc Phase 1 plan để hiểu các pattern đã work (TDD shape, commit message format, kind file structure).
- [ ] Manual test Phase 1: `npm run demo` → 3D stamp → vẽ điểm → polygon → drag → undo/redo → insert canvas → re-edit. Nếu hỏng phải fix trước khi đi Phase 2.
- [ ] `git pull origin main` để chắc chắn ở tip.
- [ ] `npm run typecheck && npm test` — baseline phải clean.

## File structure dự kiến

### Files tạo mới (kinds)

```
src/core/scene/kinds/point.ts                    # KindDef cho point 2D
src/core/scene/kinds/segment.ts
src/core/scene/kinds/line.ts                     # qua 2 điểm, vô hạn
src/core/scene/kinds/ray.ts
src/core/scene/kinds/vector.ts
src/core/scene/kinds/circle.ts                   # tâm + điểm trên đường tròn
src/core/scene/kinds/polygon.ts
src/core/scene/kinds/intersection.ts             # derived point — giao 2 line/segment/circle
src/core/scene/kinds/2d-constraint.ts            # Vec2, Constraint2D union (analog 3d-constraint.ts)
src/core/scene/kinds/__tests__/<kind>.test.ts    # 8 test file
src/core/scene/render/JxgRenderer.ts             # 2D renderer (analog JxgRenderer3D)
src/core/scene/render/__tests__/JxgRenderer.test.ts
```

### Files modified

```
src/stamps/geometry-2d/editor/MiniBoard.tsx           # 1469 → ~400 dòng. XOÁ creationLogRef, objMapRef.
src/stamps/geometry-2d/editor/EditorPanel.tsx         # wire store + JxgRenderer 2D
src/stamps/geometry-2d/editor/LeftPanel.tsx           # selectors-based
src/stamps/geometry-2d/editor/PropertiesPopover.tsx   # dispatch UPDATE_ATTRS
src/stamps/geometry-2d/editor/handlers.ts             # dispatch actions
src/stamps/geometry-2d/editor/tools.tsx               # nếu tool depend vào scene API cũ
src/stamps/geometry-2d/editor/hitTest.ts              # nhận State
src/stamps/geometry-2d/editor/transforms.ts           # nếu touch scene
src/stamps/geometry-2d/serialize.ts                   # version 2 format
src/stamps/geometry-2d/render.ts                      # offscreen render qua store + JxgRenderer
src/stamps/geometry-2d/renderInline.ts                # tương tự
src/stamps/geometry-2d/host.tsx                       # undo/redo wiring qua store
src/core/scene/kinds/index.ts                         # thêm import 8 kind 2D
```

### Files deleted

```
src/stamps/geometry-2d/__tests__/<test cũ dùng creationLog/objMap>
```

Phải verify cẩn thận — tests nào còn relevant thì keep, còn dùng API cũ thì xoá.

## PR breakdown (4 PR, ~1.5 tuần)

### PR 2.1 — 8 kind 2D + tests (~3 ngày)

Cấu trúc giống Phase 1 PR 1.2 (đã work tốt — 14 commits, 33 tests):

1. `2d-constraint.ts` — types: `Vec2`, `Constraint2D` union (free, onAxis, onLine, onCircle, onPolygon, onSegment).
2. `point.ts` — analog point3d, validate constraint, dependsOn delegate `constraintRefs2D`, describe in toạ độ.
3. `segment.ts` — `{ p1, p2 }`, dependsOn = [p1, p2].
4. `line.ts` — `{ p1, p2 }`, dependsOn = [p1, p2].
5. `ray.ts` — `{ origin, through }`.
6. `vector.ts` — `{ from, to }`.
7. `circle.ts` — `{ center, surfacePoint }` (giống sphere3d 2D version).
8. `polygon.ts` — `{ vertices: string[] }`, validate ≥3.
9. `intersection.ts` — **đặc biệt**: `{ kind: 'lineLine' | 'lineCircle' | 'circleCircle' | ...; ref1: string; ref2: string; branch?: 0 | 1 }`. dependsOn = [ref1, ref2].
10. Smoke test registry 19 kind (11 3D + 8 2D).

Mỗi kind 1 commit: `feat(scene/kinds): <kind>`.

### PR 2.2 — JxgRenderer 2D (~2 ngày)

Giống PR 1.3 — analog JxgRenderer3D nhưng cho board 2D:

1. `render/JxgRenderer.ts` class — subscribe store, diff state, apply qua `kind.render(obj, ctx)`. ctx.jxg = JXG.Board.
2. Wire `render: (obj, ctx) => ...` thực vào 8 kind 2D (analog Phase 1 task 1.3.2). Reference: `src/stamps/geometry-2d/editor/MiniBoard.tsx` (đoạn `board.create(...)` cũ).
3. Test mock JSXGraph với 6+ test case (như JxgRenderer3D).
4. Test cascade delete + UPDATE_ATTRS recreate + LOAD initial state.

### PR 2.3 — Port MiniBoard + EditorPanel + LeftPanel + Properties + handlers + serialize (~4 ngày)

**Đây là PR risk cao nhất Phase 2** — giống PR 1.4. Strategy:

1. **Trước tiên** đọc kỹ `MiniBoard.tsx` (1469 dòng) — identify các thành phần:
   - Tool state machine (đang vẽ point/segment/polygon...)
   - `creationLogRef` (append-only log mọi action)
   - `objMapRef` (id → JxgObj)
   - `redoStackRef` (cho redo)
   - Excalidraw integration (capture phase event listeners, intercept double-click crop)
   - Property edit popover triggers
   - Drag/snap logic

2. **Sub-PR breakdown gợi ý**:
   - 2.3.1 `serialize.ts` 2D → version 2 + test.
   - 2.3.2 Handlers + hit-test → dispatch.
   - 2.3.3 `MiniBoard.tsx` — split: extract `useSceneStore` hook + `useToolStateMachine` hook. Replace `creationLogRef` với store subscription. Replace `objMapRef` với renderer internal Map.
   - 2.3.4 `EditorPanel.tsx` — wire store + JxgRenderer 2D.
   - 2.3.5 `LeftPanel.tsx` + `PropertiesPopover.tsx`.
   - 2.3.6 `host.tsx` — undo/redo qua store.
   - 2.3.7 `render.ts` + `renderInline.ts` (offscreen).
   - 2.3.8 Verify + xoá test cũ + manual smoke.

3. **Mỗi sub-PR sequential commit, KHÔNG bundle** để dễ revert.

### PR 2.4 — Release v0.13.0 (~0.5 ngày)

1. `npm run build`
2. `git add -f dist/ && git commit -m "build: dist/ cho v0.13.0"`
3. `npm version minor`
4. `git push --follow-tags origin main`

## Key technical decisions từ Phase 1 carry-over

- **Commit straight to main** (no PR, no worktree) — đã thống nhất.
- **No backcompat** file cũ — wipe + reset OK.
- **`registerKind` đã generic** — `registerKind<FooAttrs>({...})` work.
- **Drag undo pattern**: dùng `store.withoutHistory(() => { dispatch(LOAD(snapBeforeDrag)); }); dispatch(LOAD(currentState));` để emulate `pushUndoCheckpoint`.
- **`id` generation**: `${prefix}${state.counter + 1}` trong handler trước mỗi dispatch — counter tăng tự động qua reducer.
- **JxgRenderer** nên có constructor option theme + dispose pattern (như JxgRenderer3D).

## Gotchas đặc thù 2D cần research khi viết full plan

1. **Intersection point** model — Old code có `valueLabel` riêng (`creationLogRef`). New model: kind `intersection` với derived attrs? Hay kind `point` với constraint `onIntersection`? **Decision needed early**.
2. **Excalidraw crop intercept** — `MiniBoard` có logic intercept double-click image để reopen editor thay vì crop mode. Phải preserve khi refactor. Có thể tách thành 1 hook riêng.
3. **`safeJsx` helper** — đang dùng để wrap JSXGraph create calls (silent catch). Quyết định giữ nguyên hay đưa vào renderer error handling.
4. **`nextLabel` scan-fill A-Z** đã có ở `selectors.ts` (Phase 1) — verify pattern khớp 2D semantics (commit `265e0e3`).
5. **Mobile drawer + header bar** — UI portion không đổi, chỉ wire qua store.

## Concerns biết trước

- 2D MiniBoard 1469 dòng = 3-4× phức tạp hơn EditorPanel 3D đã port → buffer 1 ngày extra cho sub-PR 2.3.3.
- 28 test cũ của 3D đã xoá ở Phase 1 (handler tests, EditorPanel/LeftPanel integration). 2D có thể cần action tương tự — chấp nhận **regression risk** trong khoảng 1-2 release, viết integration test mới ở Phase 3.

## Khi nào không nên đi Phase 2

- Phase 1 v0.12.0 chưa được test manual trong demo app — fix bug Phase 1 trước.
- User đang ship feature mới trên 2D (không phải bug fix) — freeze trước khi start.
- Có bug Phase 1 đang report mà chưa fix.

## Phase 3 (sẽ có plan riêng sau Phase 2)

- Object list panel cho 2D + 3D (selector-based, hoàn thành 1 phần spec Acceptance criteria).
- Action recorder demo (proof-of-concept cho animation timeline + AI agent dispatch).
