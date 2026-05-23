# Tier E — Derived geometric primitives (Constraint2D extension)

**Status:** Spec approved (auto-accepted by user, 2026-05-23). Implementation pending.
**Target version:** v0.21.0
**Foundation for:** AI figure generation feature (phase 2)

## Mục tiêu

Mở rộng `Constraint2D` discriminated union để hỗ trợ 5 derived point kinds mới: `perpFoot`, `circumcenter`, `incenter`, `centroid`, `orthocenter`. Tận dụng JSXGraph native primitives để derived points tự cập nhật khi user kéo điểm gốc.

**Lý do làm trước AI feature:**
1. AI feature sẽ stress test State model — phơi bày gap về derived geometry. Làm trước → DSL map 1:1 với State, prompt sạch hơn.
2. UX win độc lập với AI: HS vẽ tay đường cao AH → kéo A → H tự đi theo (hiện tại đông cứng).
3. Tránh làm 2 lần: nếu ship AI trên transpiler-compute thì sau cũng phải refactor State + re-eval prompt.

## Scope

**In scope:**
- `Constraint2D` extension với 5 variant mới
- `point.ts` render path qua JSXGraph native primitives
- `describe` Việt hoá cho từng kind
- Dependency graph (`constraintRefs2D`) cập nhật
- Test coverage (smoke + drag-update behavior)

**Out of scope (defer phase 2 hoặc sau):**
- Editor toolbar buttons để add 5 kinds thủ công (AI feature có thể emit qua state JSON; manual UX sau)
- Decorations: right-angle mark ⊥, length label trên segment, angle marker. Đây là visualization, không phải foundation.
- AI feature itself (sẽ design riêng sau Tier E ship)
- Schema migration: additive, không cần bump `schemaVersion`

## Coverage analysis (đã verify trong code)

State model hiện tại đã có:

| Primitive | Đã có |
|---|---|
| Anchor / on-axis / on-line / on-segment / on-circle / on-polygon / midpoint | `Constraint2D` ✅ |
| 4 transforms (translate / rotate / reflect line / reflect point / dilate) | `Constraint2D.transformed` ✅ |
| Line construction: perpendicular / parallel / perpBisector / angleBisector / angleBisectorLines / tangent | `LineConstruction` ✅ |
| Circle construction: circumscribed (qua 3 điểm) | `CircleConstruction` ✅ |
| Intersection: lineLine / lineCircle / circleCircle (với branch) | `intersection` kind ✅ |

**Gap thực:** 5 derived point primitives mà việc compose từ primitives hiện có thì verbose (3-5 object/cái) và LLM dễ sai khi emit.

## Design

### Constraint2D extension

File: `src/core/scene/kinds/2d-constraint.ts`

```ts
export type Constraint2D =
  // (existing — không đổi)
  | { kind: 'free';        x: number; y: number }
  | { kind: 'onAxis';      axis: 'x' | 'y'; t: number }
  | { kind: 'onLine';      lineId: string; t: number }
  | { kind: 'onSegment';   segmentId: string; t: number }
  | { kind: 'onCircle';    circleId: string; theta: number }
  | { kind: 'onPolygon';   polygonId: string; u: number; v: number }
  | { kind: 'midpoint';    p1: string; p2: string }
  | { kind: 'transformed'; source: string; transform: TransformDef }

  // NEW — Tier E:
  | { kind: 'perpFoot';     from: string; onLine: string }
  | { kind: 'circumcenter'; vertices: [string, string, string] }
  | { kind: 'incenter';     vertices: [string, string, string] }
  | { kind: 'centroid';     vertices: [string, string, string] }
  | { kind: 'orthocenter';  vertices: [string, string, string] };
```

Field design rationale:
- `perpFoot` dùng `from` + `onLine` (không phải `vertices`) vì semantic asymmetric: 1 điểm chiếu xuống 1 line. `onLine` chấp nhận id của bất kỳ kind nào JSXGraph treat như line — `line`, `segment`, `ray`, plus synthetic `<polyId>:border:<i>` (pattern đã có trong `line.ts.stripBorderSuffix`).
- 4 triangle centers dùng tuple `[A, B, C]` — order không quan trọng về kết quả, nhưng giữ thứ tự để label "ABC" reproducible.

### Dependency graph

`constraintRefs2D` extension:

```ts
case 'perpFoot':     return [c.from, c.onLine];
case 'circumcenter':
case 'incenter':
case 'centroid':
case 'orthocenter':  return c.vertices;
```

### Rendering strategy

File: `src/core/scene/kinds/point.ts` (render function)

```ts
// perpFoot — JSXGraph 'perpendicularpoint' element
//   create('perpendicularpoint', [line, point]) → chân vuông góc của point xuống line
case 'perpFoot': {
  const from = ctx.resolveRef(c.from);
  const onLine = ctx.resolveRef(c.onLine);
  return board.create('perpendicularpoint', [onLine, from], opts);
}

// circumcenter — JSXGraph native
case 'circumcenter': {
  const [a, b, c3] = c.vertices.map(ctx.resolveRef);
  return board.create('circumcenter', [a, b, c3], opts);
}

// incenter — JSXGraph native
case 'incenter': {
  const [a, b, c3] = c.vertices.map(ctx.resolveRef);
  return board.create('incenter', [a, b, c3], opts);
}

// centroid — function-based point (avg 3 vertices), live update khi kéo
case 'centroid': {
  const [a, b, c3] = c.vertices.map(ctx.resolveRef);
  return board.create('point', [
    () => (a.X() + b.X() + c3.X()) / 3,
    () => (a.Y() + b.Y() + c3.Y()) / 3,
  ], opts);
}

// orthocenter — compose 2 altitudes + intersection. JSXGraph 1.12 không có element 'orthocenter'.
case 'orthocenter': {
  const [a, b, c3] = c.vertices.map(ctx.resolveRef);
  const hide = { visible: false, withLabel: false, fixed: true, name: '' };
  const lineBC = board.create('line', [b, c3], hide);
  const altA   = board.create('perpendicular', [lineBC, a], hide);
  const lineAC = board.create('line', [a, c3], hide);
  const altB   = board.create('perpendicular', [lineAC, b], hide);
  const ortho  = board.create('intersection', [altA, altB, 0], opts);
  (ortho as Record<string, unknown>)._helpers = [lineBC, altA, lineAC, altB];
  return ortho;
}
```

Helper pattern (`_helpers` array on element) đã có precedent trong `line.ts` cho `perpBisector` / `angleBisectorLines` / `tangent`. JxgRenderer cleanup recurses qua `_helpers` khi xoá element.

### Describe (Vietnamese)

File: `src/core/scene/kinds/point.ts` (describe function)

```ts
if (c.kind === 'perpFoot') {
  const fromLabel = state?.objects[c.from]?.label ?? c.from;
  const lineLabel = state?.objects[c.onLine]?.label ?? c.onLine;
  return `${obj.label} = chân ⟂ từ ${fromLabel} xuống ${lineLabel}`;
}
if (c.kind === 'circumcenter') {
  const labels = c.vertices.map(id => state?.objects[id]?.label ?? id).join('');
  return `${obj.label} = tâm ngoại tiếp Δ${labels}`;
}
if (c.kind === 'incenter') {
  const labels = c.vertices.map(id => state?.objects[id]?.label ?? id).join('');
  return `${obj.label} = tâm nội tiếp Δ${labels}`;
}
if (c.kind === 'centroid') {
  const labels = c.vertices.map(id => state?.objects[id]?.label ?? id).join('');
  return `${obj.label} = trọng tâm Δ${labels}`;
}
if (c.kind === 'orthocenter') {
  const labels = c.vertices.map(id => state?.objects[id]?.label ?? id).join('');
  return `${obj.label} = trực tâm Δ${labels}`;
}
```

### Update behavior

`point.ts > update()` hiện tại có fast path cho `free → free` (drag-sync). Các kind mới khi update sẽ throw → JxgRenderer recreate. Acceptable vì:
- User không drag derived points (chúng là computed)
- Đổi vertices của triangle center hiếm (chỉ qua undo/redo)

Validate function update:

```ts
validate: (a) => {
  if (!a || !a.constraint || !a.constraint.kind) {
    throw new Error('point: constraint required');
  }
  const c = a.constraint;
  if (c.kind === 'perpFoot') {
    if (!c.from || !c.onLine) throw new Error('point.perpFoot: from và onLine bắt buộc');
  }
  if (c.kind === 'circumcenter' || c.kind === 'incenter' ||
      c.kind === 'centroid' || c.kind === 'orthocenter') {
    if (!Array.isArray(c.vertices) || c.vertices.length !== 3) {
      throw new Error(`point.${c.kind}: vertices phải là tuple 3 id`);
    }
    const [a1, a2, a3] = c.vertices;
    if (!a1 || !a2 || !a3) throw new Error(`point.${c.kind}: 3 vertex id phải non-empty`);
  }
},
```

## Migration & backward compat

Discriminated union **additive only** → không cần migration. Data hiện tại với `free|onAxis|...` vẫn deserialize OK. `schemaVersion: 1` của `point` kind giữ nguyên.

**Files cần audit exhaustiveness check** (switch trên `constraint.kind` thiếu `default` có thể silently miss new kinds):
- `src/stamps/geometry-2d/__tests__/finalizeTransform.test.ts` — test, không runtime risk
- `src/core/scene/kinds/point3d.ts` — 3D, không liên quan Tier E (3D constraint là `Constraint3D`)

Còn lại các consumer của Constraint2D chỉ là `point.ts` và `2d-constraint.ts` — đã update trong design.

## Testing plan

File: `src/core/scene/kinds/__tests__/point.test.ts` (mở rộng nếu đã có, tạo mới nếu chưa)

**Unit tests per new constraint:**
1. **Smoke render** — deserialize state có new constraint, render → không throw, element được tạo
2. **describe** — output đúng format tiếng Việt
3. **dependsOn** — `constraintRefs2D` trả về đúng list refs

**Integration tests (cần JxgRenderer mock hoặc smoke):**
4. **Drag update** — drag 1 vertex của triangle → derived center cập nhật vị trí (snapshot toạ độ before/after)
5. **Serialize/deserialize roundtrip** — state có 5 kinds mới round-trip qua JSON không mất data

**Edge cases:**
6. `perpFoot.onLine` reference tới `segment` id (không phải `line`) — JSXGraph perpendicularpoint chấp nhận cả 2
7. `orthocenter` của tam giác tù — intersection vẫn compute đúng (có thể nằm ngoài tam giác)
8. `circumcenter` của tam giác suy biến (3 điểm thẳng hàng) — JSXGraph trả về Infinity, expected; render không crash (visible: false fallback nếu cần)

## PR sequencing

**PR 1 — perpFoot** (~1 ngày)
- `2d-constraint.ts`: thêm `perpFoot` variant + constraintRefs case
- `point.ts`: thêm validate + describe + render case
- Tests: smoke + describe + drag + roundtrip

**PR 2 — 4 triangle centers** (~2 ngày)
- `2d-constraint.ts`: thêm 4 variant + constraintRefs case
- `point.ts`: thêm 4 validate + describe + render case (orthocenter có helper pattern)
- Tests: smoke + describe + drag + roundtrip + degenerate cases

**Total estimate:** 3-5 ngày, 2 PR, bump v0.21.0.

## Out of scope — phase 2 follow-ups

Document để không quên:

1. **Editor toolbar buttons** cho 5 kinds — UX manual add. Sẽ design khi AI feature settle (HS có thể muốn add tay sau khi AI generate).
2. **Decorations**:
   - Right-angle mark (⊥ ký hiệu) tại 1 điểm — cần thiết cho đề VN
   - Length label trên segment (`|AB|=3`)
   - Angle mark + label (arc + value)
   Đây là kind mới hoặc attrs trên existing kinds. Spec riêng.
3. **AI figure generation feature** — design sau Tier E ship. DSL Section 2 trong brainstorm này sẽ map 1:1 vào State.

## Linked artifacts

- AI feature brainstorm context: trao đổi 2026-05-23 (decisions: Claude SDK direct, DSL+transpiler, UX trong EditorPanel, geometry-2d MVP, "AI phác → HS chỉnh")
- Tier D status: `[[reference_tier_d_artifacts]]`
- Scene refactor history: `[[project_scene_refactor_status]]`
