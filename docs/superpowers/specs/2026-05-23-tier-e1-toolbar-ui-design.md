# Tier E.1 — Toolbar UI cho 5 derived primitives

**Status:** Spec approved (auto-accepted by user, 2026-05-23). Implementation pending.
**Target version:** v0.22.0 (minor bump)
**Builds on:** Tier E v0.21.0 (constraint + render layer done)

## Mục tiêu

Thêm UI cho 5 derived geometric primitives (perpFoot + 4 triangle centers) đã được wire State layer trong Tier E. Mục tiêu: HS dùng được 5 kinds này **bằng tay** trong editor 2D, không phải chờ AI feature.

## Scope

**In scope:**
- 5 tool entries trong catalog (`tools.tsx`)
- 5 SVG inline icons (theo design system GeoGebra-style)
- 1 new group `'triangle'` (label "Tam giác") chèn sau `'circle'`
- 5 finalize handler cases trong `finalizeShape.ts`
- Unit tests (catalog) + integration tests (handler)

**Out of scope (defer phase 2):**
- Decorations (right-angle mark ⊥, length label, angle marker)
- Auto-create polygon triangle khi click 3 đỉnh
- Tutorial / onboarding cho tool mới
- Snapshot UI tests
- E2E user-flow tests (manual smoke trong consumer app)

## Design

### Tool catalog (`src/stamps/geometry-2d/editor/tools.tsx`)

**`GeomTool` union** mở rộng:
```ts
export type GeomTool = | 'move' | ... existing keys
  | 'perpFoot'
  | 'centroid' | 'circumcenter' | 'incenter' | 'orthocenter';
```

**`GeomGroup`** mở rộng:
```ts
group: 'move' | 'point' | 'line' | 'construct' | 'polygon' | 'circle'
     | 'triangle'   // NEW
     | 'measure' | 'edit' | 'transform';
```

**`GROUP_ORDER`** chèn `'triangle'` sau `'circle'`:
```ts
['move', 'point', 'line', 'construct', 'polygon', 'circle', 'triangle', 'measure', 'edit', 'transform']
```

→ letter shortcut: triangle = **G**, measure = H, edit = I, transform = **J**.

**`GROUP_LABELS`** entry mới:
```ts
triangle: 'Tam giác',
```

**5 ToolDef entries**:

| key | label | group | needs | accepts | hint |
|---|---|---|---|---|---|
| `perpFoot` | "Chân đường vuông góc" | `point` | 2 | `['point','line']` | "Click 1 điểm + 1 đường có sẵn" |
| `centroid` | "Trọng tâm tam giác" | `triangle` | 3 | `['point','point','point']` | "Click 3 đỉnh tam giác" |
| `circumcenter` | "Tâm đường tròn ngoại tiếp" | `triangle` | 3 | `['point','point','point']` | "Click 3 đỉnh tam giác" |
| `incenter` | "Tâm đường tròn nội tiếp" | `triangle` | 3 | `['point','point','point']` | "Click 3 đỉnh tam giác" |
| `orthocenter` | "Trực tâm tam giác" | `triangle` | 3 | `['point','point','point']` | "Click 3 đỉnh tam giác" |

**Vị trí trong TOOLS array:**
- `perpFoot` chèn vào group 'point' sau `midpoint` (thứ tự: point, midpoint, perpFoot, intersect)
- 4 centers append vào TOOLS sau `tangent` (cuối group 'circle'), trước `angle` (group 'measure'). Thứ tự: centroid → circumcenter → incenter → orthocenter (theo độ quen thuộc THCS→THPT).

### Icons (SVG inline trong `tools.tsx`)

Theo design system: BLUE `#2563eb` = input, RED `#dc2626` = output/construct, FILL orange, ARC emerald. ViewBox 24×24.

**`Icon.perpFoot`** — Base line ngang + vertical dashed red từ BLUE point xuống RED chân + right-angle mark □. Khác `Icon.perpendicular` ở chỗ: emphasis lên RED dot (point output), không phải đường.

**`Icon.centroid`** — Tam giác outline + 3 medians dashed gray + RED dot tại giao 3 medians. Fill orange nhạt cho tam giác.

**`Icon.circumcenter`** — Đường tròn ngoại tiếp (currentColor) + tam giác nội tiếp (3 đỉnh trên đường tròn) + RED dot tại tâm.

**`Icon.incenter`** — Tam giác outline + đường tròn nội tiếp + RED dot tại tâm.

**`Icon.orthocenter`** — Tam giác outline + 2 altitudes dashed red + RED dot tại trực tâm (giao 2 altitudes).

Chi tiết SVG: xem brainstorm 2026-05-23 (đã chốt, ~150 dòng SVG total).

### Handler additions (`src/stamps/geometry-2d/editor/handlers/finalizeShape.ts`)

5 case mới trong `switch (key)`, chèn sau `case 'midpoint'`:

```ts
case 'perpFoot': {
  const fromPoint = findPickIdByKind(ctx, 'point');
  const onLine = findPickIdByKind(ctx, 'line');
  if (!fromPoint || !onLine) return;
  const id = freshId(ctx, 'h');
  const label = ctx.nextLabel('point');
  ctx.store.dispatch({
    type: 'ADD',
    payload: { obj: mkSceneObj(id, 'point', label, {
      constraint: { kind: 'perpFoot', from: fromPoint, onLine },
    }) },
  });
  return;
}

case 'centroid': {
  const id = freshId(ctx, 'g');
  const label = ctx.nextLabel('point');
  ctx.store.dispatch({
    type: 'ADD',
    payload: { obj: mkSceneObj(id, 'point', label, {
      constraint: { kind: 'centroid', vertices: [ids[0], ids[1], ids[2]] },
    }) },
  });
  return;
}

case 'circumcenter': {
  const id = freshId(ctx, 'o');
  const label = ctx.nextLabel('point');
  ctx.store.dispatch({
    type: 'ADD',
    payload: { obj: mkSceneObj(id, 'point', label, {
      constraint: { kind: 'circumcenter', vertices: [ids[0], ids[1], ids[2]] },
    }) },
  });
  return;
}

case 'incenter': {
  const id = freshId(ctx, 'i');
  const label = ctx.nextLabel('point');
  ctx.store.dispatch({
    type: 'ADD',
    payload: { obj: mkSceneObj(id, 'point', label, {
      constraint: { kind: 'incenter', vertices: [ids[0], ids[1], ids[2]] },
    }) },
  });
  return;
}

case 'orthocenter': {
  const id = freshId(ctx, 'h');
  const label = ctx.nextLabel('point');
  ctx.store.dispatch({
    type: 'ADD',
    payload: { obj: mkSceneObj(id, 'point', label, {
      constraint: { kind: 'orthocenter', vertices: [ids[0], ids[1], ids[2]] },
    }) },
  });
  return;
}
```

**Design notes:**
- `perpFoot` dùng `findPickIdByKind` (order-flexible, giống `perpendicular`/`parallel` precedent)
- 4 centers dùng `ids[0..2]` (click order, hoán vị không quan trọng vì tâm tam giác bất biến)
- Id prefix: `h` (chân/trực tâm), `g` (trọng tâm), `o` (ngoại tiếp), `i` (nội tiếp). `freshId` tự suffix số → không collision giữa perpFoot và orthocenter.
- Label: `nextLabel('point')` → A, B, C, ... HS rename qua properties popover nếu muốn.

### Letter shortcut verification

Việc thêm letter J (transform) cần verify không conflict với existing chord 2-key trong `useChordShortcut`. Hiện tại GROUP_ORDER có 9 group → A..I. Thêm 1 → J.

**Action item trong plan:** grep `useChordShortcut` hoặc `chord` để confirm không reserved letter J cho function khác.

## Migration & backward compat

**Không cần migration.** Đây là pure UI addition + handler addition. State model không đổi (đã làm xong ở Tier E).

Existing data deserialize OK. Existing tool keys không đổi.

## Testing plan

### Unit tests — tool catalog

File: `src/stamps/geometry-2d/editor/__tests__/tools.test.ts` (tạo mới nếu chưa có).

- `TOOLS có group triangle với 4 centers` (filter + key check)
- `perpFoot thuộc group point với accepts [point, line]`
- `letterForGroup('triangle') === 'G'`
- `GROUP_LABELS.triangle === 'Tam giác'`
- `GROUP_ORDER có 10 entries với 'triangle' tại index 6`

### Integration tests — finalize handler

File: `src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.test.ts` (append).

5 test cases, mỗi cái:
1. Setup HandlerCtx mock với pendingRef + pendingIdsRef
2. Call `finalizeShape(ctx, toolDef)`
3. Assert `store.dispatch` được gọi với ADD payload đúng constraint

### Out of scope tests
- Snapshot toolbar UI rendering — brittle
- E2E user click flow — manual smoke trong consumer app
- Drag-update — đã cover trong Tier E render test

## PR sequencing

**Single PR** (~3-4 ngày):
- File modify list:
  - `src/stamps/geometry-2d/editor/tools.tsx` (catalog + icons)
  - `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts` (5 case)
  - `src/stamps/geometry-2d/editor/__tests__/tools.test.ts` (new hoặc append)
  - `src/stamps/geometry-2d/editor/handlers/__tests__/finalizeShape.test.ts` (append)
- Tag v0.22.0 sau khi merge.

## Out of scope — phase 2 follow-ups

1. **Decorations**: right-angle mark ⊥ kí hiệu vuông góc, length label `|AB|=3` trên segment, angle marker (arc + value). Spec riêng.
2. **AI figure generation**: phase 2 chính. Foundation v0.21.0 + UI v0.22.0 → AI feature có thể emit qua state JSON, đồng thời HS có cách add manual.

## Linked artifacts

- Tier E (foundation): `docs/superpowers/specs/2026-05-23-tier-e-derived-primitives-design.md`
- Tier E artifacts memory: `[[reference_tier_e_artifacts]]`
- AI feature decisions: `[[project_ai_feature_phase2_decisions]]`
