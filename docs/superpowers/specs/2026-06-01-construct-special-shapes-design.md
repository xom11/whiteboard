# Construct Special Shapes — Design

**Date:** 2026-06-01
**Status:** Draft — awaiting user approval
**Scope:** geometry-2d stamp, parametric construction tools cho 7 hình đặc biệt

## 1. Goal

Thêm 7 tool dựng hình **parametric** vào panel `geometry-2d`:

1. Hình vuông
2. Hình chữ nhật
3. Hình thoi
4. Hình bình hành
5. Hình thang cân
6. Tam giác cân
7. Tam giác vuông

Yêu cầu chính (user): **"dù kéo hình thì vẫn là hình đó"** — kéo bất kỳ điểm điều khiển nào, hình giữ nguyên tính chất (góc, tỷ lệ cạnh, song song...).

## 2. Non-goals

- KHÔNG dùng popover/numeric input (vd "nhập chiều cao") — dựng thuần điểm-click.
- KHÔNG đụng base Excalidraw, KHÔNG đụng các stamp khác (3D, graph-2d, latex).
- KHÔNG migrate schema cũ — variants mới thêm thuần nội union, polygon kind không bump schemaVersion.
- KHÔNG thêm tool cho **tam giác đều** riêng (đã có qua `regularPolygon` n=3).

## 3. Approach (chọn từ 3 options)

Đã chọn **Approach B** (xem decision log dưới): mở rộng `Constraint2D` (Point kind) + mở rộng `PolygonConstruction` (Polygon kind). Tái sử dụng glider/drag infrastructure đã có. Không tạo kind mới per-shape.

### Decision log (rút gọn)

- **A — inline all in `polygon.construction`**: render branch nhiều, drag handle 3rd vertex cần custom listener vào store. Reject — duplicate logic với Constraint2D đã có.
- **B — extend Constraint2D + polygon.construction ✅**: 3 constraint variant mới có thể tái dùng độc lập (vd "đặt điểm trên đường vuông góc" tool sau này). Glider/drag tự động qua Point kind render. Sửa 2 file core nhưng thay đổi cô lập.
- **C — per-shape kind**: 7 file kind mới, duplicate validate/migrate/describe. Reject — không scale khi cần thêm shape biến thể.

## 4. Data model changes

### 4.1 `Constraint2D` — thêm 3 variant

File: `src/core/scene/kinds/2d-constraint.ts`

```ts
export type Constraint2D =
  // ...existing variants (free, onAxis, onLine, onSegment, onCircle, onPolygon,
  //                      midpoint, transformed, perpFoot, circumcenter, incenter,
  //                      centroid, orthocenter)
  | { kind: 'onPerpendicular';     through: string; perpToA: string; perpToB: string; t: number }
  | { kind: 'onPerpBisector';      p1: string; p2: string; t: number }
  | { kind: 'onCircleAroundPoint'; center: string; radiusPoint: string; theta: number };
```

Semantics:

- **`onPerpendicular`**: Điểm nằm trên đường vuông góc tại `through`, vuông góc với line(`perpToA`, `perpToB`). `t` = signed scalar offset từ `through` dọc theo direction perpendicular đã chuẩn hoá unit-vector. Dấu của `t` xác định nửa nào của trục perp.
- **`onPerpBisector`**: Điểm nằm trên đường trung trực của đoạn (`p1`, `p2`). `t` = signed offset từ midpoint(p1,p2) dọc theo direction vuông góc với p1p2 (chuẩn hoá unit).
- **`onCircleAroundPoint`**: Điểm trên vòng tròn tâm `center`, bán kính = |center − radiusPoint|. `theta` = góc radian từ tâm.

`constraintRefs2D` được mở rộng 3 case tương ứng để dependency graph hoạt động (vd khi user kéo `perpToA`, glider trên perp tự re-position).

### 4.2 `PolygonConstruction` — thêm 7 variant

File: `src/core/scene/kinds/polygon.ts`

```ts
export type PolygonConstruction =
  | { kind: 'regular'; p1: string; p2: string; n: number }  // (existing)
  // NEW:
  | { kind: 'square';         p1: string; p2: string }
  | { kind: 'rectangle';      p1: string; p2: string; p3: string }
  | { kind: 'rhombus';        p1: string; p2: string; p3: string }
  | { kind: 'parallelogram';  p1: string; p2: string; p3: string }
  | { kind: 'isoTrapezoid';   p1: string; p2: string; p3: string }
  | { kind: 'isoTriangle';    base1: string; base2: string; apex: string }
  | { kind: 'rightTriangle';  rightAngle: string; leg1End: string; leg2End: string };
```

Quan hệ giữa constraint của vertices và polygon construction:

| Shape | Free pts | Constrained pt | Constraint kind | Derived pt (in-render) |
|---|---|---|---|---|
| `square` | p1, p2 | — | — | C, D qua JSXGraph `regularpolygon` n=4 |
| `rectangle` | p1, p2 | p3 | `onPerpendicular(p2, p1, p2)` | D = p1 + (p3 − p2) |
| `rhombus` | p1, p2 | p3 | `onCircleAroundPoint(p2, p1)` | D = p1 + (p3 − p2) |
| `parallelogram` | p1, p2, p3 | — | — | D = p1 + (p3 − p2) |
| `isoTrapezoid` | p1, p2, p3 | — | — | D = reflect(p3, perpBisector(p1,p2)) |
| `isoTriangle` | base1, base2 | apex | `onPerpBisector(base1, base2)` | (none — 3 vertices, không có 4th) |
| `rightTriangle` | rightAngle, leg1End | leg2End | `onPerpendicular(rightAngle, rightAngle, leg1End)` | (none) |

### 4.3 Polygon kind methods

- **`validate`**: mỗi variant kiểm tra IDs hợp lệ (string non-empty).
- **`dependsOn`**: return tất cả point IDs trong variant đang dùng.
- **`describe`**: Vietnamese label theo variant:
  - `square` → "Hình vuông ABCD"
  - `rectangle` → "Hình chữ nhật ABCD"
  - `rhombus` → "Hình thoi ABCD"
  - `parallelogram` → "Hình bình hành ABCD"
  - `isoTrapezoid` → "Hình thang cân ABCD"
  - `isoTriangle` → "Tam giác cân ABC"
  - `rightTriangle` → "Tam giác vuông ABC"
- **`render`**: switch trên `construction.kind`, mỗi nhánh tạo polygon JSXGraph với vertices tương ứng (free + constrained + derived in-render).

### 4.4 Migration

`polygon.schemaVersion` giữ nguyên = 1. Lý do: union mở rộng, variants cũ vẫn parse đúng. Test snapshot serialize→deserialize verify backward compatibility.

`point.schemaVersion` cũng giữ nguyên = 1, vì Constraint2D union mở rộng analogously.

## 5. Tool catalog (UX)

File: `src/stamps/geometry-2d/editor/tools.tsx`

### 5.1 Group mới

```ts
group: 'special'  →  label 'Hình đặc biệt'
```

`GROUP_ORDER` thêm `'special'` cuối list, auto-derive chord letter = **K** (positional A..K).

### 5.2 Tool entries

```ts
{ key: 'square',         label: 'Hình vuông',         hint: 'Click 2 điểm — cạnh đầu',
  icon: Icon.square,         group: 'special', needs: 2,
  accepts: ['point', 'point'] },
{ key: 'rectangle',      label: 'Hình chữ nhật',      hint: 'Click 2 điểm đáy + 1 điểm chiều cao (auto-vuông góc)',
  icon: Icon.rectangle,      group: 'special', needs: 3,
  accepts: ['point', 'point', 'point'] },
{ key: 'rhombus',        label: 'Hình thoi',          hint: 'Click 2 điểm cạnh + 1 điểm hướng (auto-bằng độ dài)',
  icon: Icon.rhombus,        group: 'special', needs: 3,
  accepts: ['point', 'point', 'point'] },
{ key: 'parallelogram',  label: 'Hình bình hành',     hint: 'Click 3 điểm liên tiếp (đỉnh 4 tự suy)',
  icon: Icon.parallelogram,  group: 'special', needs: 3,
  accepts: ['point', 'point', 'point'] },
{ key: 'isoTrapezoid',   label: 'Hình thang cân',     hint: 'Click 2 điểm đáy lớn + 1 đỉnh trên',
  icon: Icon.isoTrapezoid,   group: 'special', needs: 3,
  accepts: ['point', 'point', 'point'] },
{ key: 'isoTriangle',    label: 'Tam giác cân',       hint: 'Click 2 điểm đáy + 1 đỉnh (auto-trên trung trực)',
  icon: Icon.isoTriangle,    group: 'special', needs: 3,
  accepts: ['point', 'point', 'point'] },
{ key: 'rightTriangle',  label: 'Tam giác vuông',     hint: 'Click đỉnh vuông + 2 đầu cạnh góc (cạnh 2 auto-vuông góc)',
  icon: Icon.rightTriangle,  group: 'special', needs: 3,
  accepts: ['point', 'point', 'point'] },
```

### 5.3 Icons

7 icon mới trong `editor/icons.tsx`, SVG 16×16, stroke 1.5, không fill:

- `square`: outline vuông
- `rectangle`: outline chữ nhật ngang
- `rhombus`: outline thoi (4 cạnh nghiêng 45°)
- `parallelogram`: outline bình hành nghiêng
- `isoTrapezoid`: outline thang cân (đáy dưới rộng hơn)
- `isoTriangle`: outline tam giác cân (đỉnh trên giữa)
- `rightTriangle`: outline tam giác vuông + ô vuông nhỏ ở góc vuông

### 5.4 Chord shortcut

Auto-derive từ `GROUP_ORDER`. Group `special` → letter K. Trong group, mỗi tool vị trí 1..7 theo thứ tự khai báo:

```
K → 1 = Hình vuông
K → 2 = Hình chữ nhật
K → 3 = Hình thoi
K → 4 = Hình bình hành
K → 5 = Hình thang cân
K → 6 = Tam giác cân
K → 7 = Tam giác vuông
```

(Tận dụng `useChordShortcut.ts` đã có.)

## 6. Click handler flow

File: `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts` (+ neighbors)

Tools mới dùng nhánh `handleMultiClickTool` đã có (`needs >= 2`, slot-based picks). Khi đủ `needs` picks, hàm `finalizeShape(ctx, toolDef)` xử lý dispatch.

### 6.1 Logic flow

```
User chọn tool 'rectangle'
  ├─ Click 1 → handler tạo free point A (hoặc snap nếu hit point có sẵn)
  ├─ Click 2 → handler tạo free point B
  └─ Click 3 → handler tạo free point C tại vị trí click
              → finalize:
                 ├─ Tính t_init từ click position projected onto perpendicular through B perp to AB
                 ├─ TRANSACTION:
                 │    UPDATE_ATTRS pointId=C, patch={ constraint: { kind: 'onPerpendicular',
                 │                                                    through: B, perpToA: A, perpToB: B,
                 │                                                    t: t_init } }
                 │    ADD polygon { construction: { kind: 'rectangle', p1: A, p2: B, p3: C } }
                 └─ clear pending
```

### 6.2 Shape-specific finalize cases

```ts
// Trong finalizeShape.ts:

switch (toolDef.key) {
  case 'square': {
    // 2 free points, không cần promote
    const id = freshId(ctx, 'sq');
    ctx.store.dispatch({ type: 'ADD', payload: { obj: mkSceneObj(id, 'polygon',
      ctx.nextLabel('polygon'),
      { construction: { kind: 'square', p1: ids[0], p2: ids[1] } }) } });
    return;
  }
  case 'rectangle': {
    const A = ids[0], B = ids[1], C = ids[2];
    const t = computePerpendicularT(ctx, C, B, A, B);  // signed scalar
    ctx.store.dispatch({ type: 'TRANSACTION', payload: { actions: [
      { type: 'UPDATE_ATTRS', payload: { id: C, patch: {
          constraint: { kind: 'onPerpendicular', through: B, perpToA: A, perpToB: B, t } } } },
      { type: 'ADD', payload: { obj: mkSceneObj(freshId(ctx, 'rect'), 'polygon',
          ctx.nextLabel('polygon'),
          { construction: { kind: 'rectangle', p1: A, p2: B, p3: C } }) } },
    ] } });
    return;
  }
  case 'rhombus': {
    const A = ids[0], B = ids[1], C = ids[2];
    const theta = computeCircleTheta(ctx, C, B);  // góc từ B đến C
    ctx.store.dispatch({ type: 'TRANSACTION', payload: { actions: [
      { type: 'UPDATE_ATTRS', payload: { id: C, patch: {
          constraint: { kind: 'onCircleAroundPoint', center: B, radiusPoint: A, theta } } } },
      { type: 'ADD', payload: { obj: mkSceneObj(freshId(ctx, 'rho'), 'polygon',
          ctx.nextLabel('polygon'),
          { construction: { kind: 'rhombus', p1: A, p2: B, p3: C } }) } },
    ] } });
    return;
  }
  case 'isoTriangle': {
    const B = ids[0], C = ids[1], A = ids[2];  // base = B, C; apex = A
    const t = computePerpBisectorT(ctx, A, B, C);
    ctx.store.dispatch({ type: 'TRANSACTION', payload: { actions: [
      { type: 'UPDATE_ATTRS', payload: { id: A, patch: {
          constraint: { kind: 'onPerpBisector', p1: B, p2: C, t } } } },
      { type: 'ADD', payload: { obj: mkSceneObj(freshId(ctx, 'iso'), 'polygon',
          ctx.nextLabel('polygon'),
          { construction: { kind: 'isoTriangle', base1: B, base2: C, apex: A } }) } },
    ] } });
    return;
  }
  case 'rightTriangle': {
    const R = ids[0], P = ids[1], Q = ids[2];  // R = đỉnh vuông; P = end cạnh 1; Q = end cạnh 2 ⊥
    const t = computePerpendicularT(ctx, Q, R, R, P);
    ctx.store.dispatch({ type: 'TRANSACTION', payload: { actions: [
      { type: 'UPDATE_ATTRS', payload: { id: Q, patch: {
          constraint: { kind: 'onPerpendicular', through: R, perpToA: R, perpToB: P, t } } } },
      { type: 'ADD', payload: { obj: mkSceneObj(freshId(ctx, 'rtri'), 'polygon',
          ctx.nextLabel('polygon'),
          { construction: { kind: 'rightTriangle', rightAngle: R, leg1End: P, leg2End: Q } }) } },
    ] } });
    return;
  }
  case 'parallelogram':
  case 'isoTrapezoid': {
    // 3 free points, không cần promote
    const id = freshId(ctx, toolDef.key === 'parallelogram' ? 'pgm' : 'trap');
    ctx.store.dispatch({ type: 'ADD', payload: { obj: mkSceneObj(id, 'polygon',
      ctx.nextLabel('polygon'),
      { construction: { kind: toolDef.key, p1: ids[0], p2: ids[1], p3: ids[2] } }) } });
    return;
  }
}
```

### 6.3 Helper functions

```ts
// Tính signed scalar t cho onPerpendicular
function computePerpendicularT(ctx, draggedPointId, throughId, perpAId, perpBId): number {
  const P = readJxgCoord(ctx, draggedPointId);
  const T = readJxgCoord(ctx, throughId);
  const A = readJxgCoord(ctx, perpAId);
  const B = readJxgCoord(ctx, perpBId);
  // direction line AB
  const dx = B.x - A.x, dy = B.y - A.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return 0;
  // perp direction = (-dy, dx) / len
  const ux = -dy / len, uy = dx / len;
  // t = (P - T) · u
  return (P.x - T.x) * ux + (P.y - T.y) * uy;
}

function computePerpBisectorT(ctx, draggedPointId, p1Id, p2Id): number {
  const P = readJxgCoord(ctx, draggedPointId);
  const A = readJxgCoord(ctx, p1Id);
  const B = readJxgCoord(ctx, p2Id);
  const Mx = (A.x + B.x) / 2, My = (A.y + B.y) / 2;
  const dx = B.x - A.x, dy = B.y - A.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return 0;
  const ux = -dy / len, uy = dx / len;
  return (P.x - Mx) * ux + (P.y - My) * uy;
}

function computeCircleTheta(ctx, draggedPointId, centerId): number {
  const P = readJxgCoord(ctx, draggedPointId);
  const C = readJxgCoord(ctx, centerId);
  return Math.atan2(P.y - C.y, P.x - C.x);
}
```

## 7. Render logic

### 7.1 Point kind — render 3 constraint mới

File: `src/core/scene/kinds/point.ts`

Switch trong render:

```ts
case 'onPerpendicular': {
  const T = ctx.resolveRef(c.through);
  const A = ctx.resolveRef(c.perpToA);
  const B = ctx.resolveRef(c.perpToB);
  // Aux line: perpendicular through T perp to (A, B), hidden
  const auxLine = board.create('perpendicular', [board.create('line', [A, B], { visible: false }), T],
                                { visible: false, withLabel: false, straightFirst: true, straightLast: true });
  // Compute initial coords from t
  const dx = () => B.X() - A.X(), dy = () => B.Y() - A.Y();
  const len = () => Math.hypot(dx(), dy()) || 1;
  const ux = () => -dy() / len(), uy = () => dx() / len();
  const x0 = () => T.X() + c.t * ux();
  const y0 = () => T.Y() + c.t * uy();
  return board.create('glider', [x0(), y0(), auxLine], { ...standardPointAttrs });
  // Listener: on drag, recompute t from glider position → dispatch UPDATE_ATTRS
}
case 'onPerpBisector': {
  // Tương tự, aux line = perpBisector(p1, p2)
}
case 'onCircleAroundPoint': {
  // Aux circle = circle through (center, radiusPoint), hidden
  const C = ctx.resolveRef(c.center);
  const R = ctx.resolveRef(c.radiusPoint);
  const auxCircle = board.create('circle', [C, R], { visible: false, withLabel: false });
  const x0 = () => C.X() + Math.hypot(R.X() - C.X(), R.Y() - C.Y()) * Math.cos(c.theta);
  const y0 = () => C.Y() + Math.hypot(R.X() - C.X(), R.Y() - C.Y()) * Math.sin(c.theta);
  return board.create('glider', [x0(), y0(), auxCircle], { ...standardPointAttrs });
}
```

**Drag listener** (sync glider position → store):

Trong `MiniBoard.tsx`, sau khi tạo glider, attach event listener:

```ts
gliderJxg.on('drag', () => {
  const newT = ... // recompute từ glider current coords
  ctx.store.dispatch({ type: 'UPDATE_ATTRS', payload: { id: pointId, patch: { constraint: { ...oldConstraint, t: newT } } } });
});
```

(Pattern này có thể đã có cho `pointOnCurve` glider — kiểm tra và reuse trong implementation phase.)

### 7.2 Polygon kind — render 7 variant

File: `src/core/scene/kinds/polygon.ts`

```ts
case 'square': {
  const p1 = ctx.resolveRef(c.p1);
  const p2 = ctx.resolveRef(c.p2);
  return board.create('regularpolygon', [p1, p2, 4], { ...commonAttrs });
}
case 'rectangle':
case 'rhombus': {
  // 3 explicit pts + 1 derived
  const A = ctx.resolveRef(c.p1);
  const B = ctx.resolveRef(c.p2);
  const C = ctx.resolveRef(c.p3);
  const D = board.create('point',
    [() => A.X() + C.X() - B.X(), () => A.Y() + C.Y() - B.Y()],
    { visible: false, withLabel: false, fixed: true });
  return board.create('polygon', [A, B, C, D], { ...commonAttrs });
}
case 'parallelogram': {
  // 3 free pts + 1 derived (same formula as rectangle/rhombus)
  const A = ctx.resolveRef(c.p1);
  const B = ctx.resolveRef(c.p2);
  const C = ctx.resolveRef(c.p3);
  const D = board.create('point',
    [() => A.X() + C.X() - B.X(), () => A.Y() + C.Y() - B.Y()],
    { visible: false, withLabel: false, fixed: true });
  return board.create('polygon', [A, B, C, D], { ...commonAttrs });
}
case 'isoTrapezoid': {
  // D = reflect(C, perpBisector(A, B))
  const A = ctx.resolveRef(c.p1);
  const B = ctx.resolveRef(c.p2);
  const C = ctx.resolveRef(c.p3);
  // Compute D = (A + B) − C reflected across line perpendicular to AB through midpoint(AB):
  // M = midpoint(A, B); u = unit(AB)
  // D = C + 2 * ((M - C) · u) * u  (reflect C across line through M perp to ... wait, qua trung trực)
  // Đúng công thức: D = 2*proj_AB(C - M) reflected → ngược direction AB
  // Equivalent: D.x = A.x + B.x - C.x's projection on AB direction
  // Simpler: D = reflectAcrossLine(C, M, perp direction of AB)
  // = C - 2 * ((C - M) · u_AB) * u_AB     (reflect across line ⊥ AB through M)
  const Dx = () => {
    const Mx = (A.X() + B.X()) / 2, My = (A.Y() + B.Y()) / 2;
    const ux = B.X() - A.X(), uy = B.Y() - A.Y();
    const len2 = ux*ux + uy*uy || 1;
    const proj = ((C.X() - Mx) * ux + (C.Y() - My) * uy) / len2;
    return C.X() - 2 * proj * ux;
  };
  const Dy = () => {
    const Mx = (A.X() + B.X()) / 2, My = (A.Y() + B.Y()) / 2;
    const ux = B.X() - A.X(), uy = B.Y() - A.Y();
    const len2 = ux*ux + uy*uy || 1;
    const proj = ((C.X() - Mx) * ux + (C.Y() - My) * uy) / len2;
    return C.Y() - 2 * proj * uy;
  };
  const D = board.create('point', [Dx, Dy], { visible: false, withLabel: false, fixed: true });
  return board.create('polygon', [A, B, C, D], { ...commonAttrs });
}
case 'isoTriangle': {
  const A = ctx.resolveRef(c.base1);
  const B = ctx.resolveRef(c.base2);
  const ApexJxg = ctx.resolveRef(c.apex);
  return board.create('polygon', [A, B, ApexJxg], { ...commonAttrs });
}
case 'rightTriangle': {
  const R = ctx.resolveRef(c.rightAngle);
  const P = ctx.resolveRef(c.leg1End);
  const Q = ctx.resolveRef(c.leg2End);
  return board.create('polygon', [R, P, Q], { ...commonAttrs });
}
```

`commonAttrs` = `{ name: label, withLabel: ..., borders: { strokeColor, strokeWidth }, fillColor, fillOpacity, visible, fixed }` — giống regular polygon render hiện tại.

### 7.3 Vertex label naming

Theo precedent `regularVertexLabels` — labels A, B, C, D theo thứ tự click. Khi `nextLabel('polygon')` chọn label tự động (vd "Hình vuông 1"), describe có thể derive 4 vertex labels từ p1.label, p2.label nếu sequential.

(Detail polish — không phải critical path. Có thể defer sang follow-up.)

## 8. Test plan

### 8.1 Unit tests per shape

File: `src/core/scene/kinds/__tests__/polygon.<shape>.test.ts` cho mỗi variant (7 file mới).

Mỗi file test:

1. **Validate**: tạo polygon với construction hợp lệ → pass; với invalid ID → throw.
2. **DependsOn**: trả về đúng point IDs.
3. **Describe**: trả về Vietnamese string đúng format.
4. **Round-trip**: state → serialize → deserialize → equal.

### 8.2 Constraint correctness (integration)

File: `src/core/scene/kinds/__tests__/special-shapes-geometry.test.ts`

Cho mỗi shape:

1. Setup state với shape + free points.
2. Render board.
3. Assertion tính chất hình:
   - `square`: 4 góc = 90°, 4 cạnh = nhau.
   - `rectangle`: 4 góc = 90°.
   - `rhombus`: 4 cạnh = nhau.
   - `parallelogram`: AB ∥ CD và |AB| = |CD|.
   - `isoTrapezoid`: AB ∥ CD và |AD| = |BC|.
   - `isoTriangle`: |AB| = |AC|.
   - `rightTriangle`: góc tại R = 90°.
4. Kéo 1 free point → assertion vẫn thoả.

### 8.3 Constraint variant tests

File: `src/core/scene/kinds/__tests__/point.constraint.special.test.ts`

Test 3 variants mới của Constraint2D:

1. `onPerpendicular`: point luôn nằm trên perp line.
2. `onPerpBisector`: point luôn cách đều p1, p2.
3. `onCircleAroundPoint`: point luôn cách center một khoảng = |center − radiusPoint|.

### 8.4 Handler integration tests

File: `src/stamps/geometry-2d/editor/handlers/__tests__/specialShapes.test.tsx`

Simulate 2-3 click sequence cho mỗi tool → verify state diff đúng (free points + constrained point promotion + polygon ADD).

### 8.5 Smoke render

Mount MiniBoard với state chứa từng shape → no exception, SVG produced.

## 9. Files modified / created

### Modified

- `src/core/scene/kinds/2d-constraint.ts` — 3 constraint variant + `constraintRefs2D` 3 case.
- `src/core/scene/kinds/point.ts` — render switch 3 case mới + drag listener attach.
- `src/core/scene/kinds/polygon.ts` — 7 construction variant + validate + dependsOn + describe + render switch.
- `src/stamps/geometry-2d/editor/tools.tsx` — group 'special' + 7 tool entry.
- `src/stamps/geometry-2d/editor/icons.tsx` — 7 icon SVG.
- `src/stamps/geometry-2d/editor/handlers/finalizeShape.ts` — 7 case handler.
- `src/stamps/geometry-2d/editor/MiniBoard.tsx` — attach drag listener cho 3 constraint mới (nếu chưa generic).

### Created

- `src/core/scene/kinds/__tests__/polygon.square.test.ts`
- `src/core/scene/kinds/__tests__/polygon.rectangle.test.ts`
- `src/core/scene/kinds/__tests__/polygon.rhombus.test.ts`
- `src/core/scene/kinds/__tests__/polygon.parallelogram.test.ts`
- `src/core/scene/kinds/__tests__/polygon.isoTrapezoid.test.ts`
- `src/core/scene/kinds/__tests__/polygon.isoTriangle.test.ts`
- `src/core/scene/kinds/__tests__/polygon.rightTriangle.test.ts`
- `src/core/scene/kinds/__tests__/special-shapes-geometry.test.ts`
- `src/core/scene/kinds/__tests__/point.constraint.special.test.ts`
- `src/stamps/geometry-2d/editor/handlers/__tests__/specialShapes.test.tsx`

## 10. Risks & open questions

- **JSXGraph `perpendicular` element**: cần verify behavior khi parent line bị hidden + parent line auto-created từ A, B. Có thể cần dùng `parallel` + `normal` thay vì `perpendicular`. Resolve in implementation phase.
- **Drag listener leakage**: glider drag listener cần được clean khi point bị delete hoặc khi state reset. Pattern này có thể đã có cho `pointOnCurve` — verify khi implement.
- **Vertex auto-labeling for 4-vertex constructions**: derive D label từ A, B, C (vd A, B, C → D) khi 3 letters liên tiếp; fallback "p1Label·p2Label·p3Label·..." khi không. Polish, có thể defer.
- **Aux line/circle bbox impact**: JSXGraph aux objects có ảnh hưởng tính bbox auto-zoom không? Nếu có, set `withLabel: false, visible: false` và `lineCap: 'butt'` — verify in implementation.
- **Mobile drawer integration**: `MobileToolDrawer` auto-list từ TOOLS, không cần code mobile-specific. Verify khi implement.

## 11. Implementation order (suggested)

1. Constraint2D 3 variant + `constraintRefs2D` + unit test.
2. Point kind render 3 case + drag listener + unit test.
3. Polygon kind 7 variant (validate/dependsOn/describe) + unit test.
4. Polygon kind render 7 case + integration test (constraint correctness).
5. Tools catalog 7 entry + icons + chord shortcut auto-derive.
6. finalizeShape.ts 7 handler case + integration test.
7. Smoke test in real MiniBoard (click flow).
8. CHANGELOG + bump version + npm publish.

## 12. Acceptance criteria

- ✅ Tất cả 7 tool xuất hiện trong panel group 'Hình đặc biệt' (chord K).
- ✅ Click theo flow định nghĩa → shape được dựng đúng tính chất hình học.
- ✅ Kéo bất kỳ điểm điều khiển nào → shape giữ nguyên type (đúng yêu cầu user).
- ✅ Roundtrip serialize/deserialize → state khôi phục đúng, không mất constraint.
- ✅ Test suite pass (unit + integration + smoke).
- ✅ Typecheck pass.
- ✅ Backward compat: polygon variants cũ vẫn hoạt động bình thường.
