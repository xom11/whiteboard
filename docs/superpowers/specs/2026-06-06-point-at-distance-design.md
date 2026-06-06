# Spec: primitive `pointAtDistance` — điểm trên tia, cách mốc một khoảng

**Ngày:** 2026-06-06
**Branch:** `worktree-fix-extend-chord-bc`
**Trạng thái:** Đã duyệt thiết kế, chờ review spec → writing-plans

## Bài toán động lực

> Cho đường tròn (O; R) và dây AB. Kéo dài AB về phía B, lấy điểm C sao cho BC = R.

Hiện tại **không vẽ được** và **AI vẽ sai**.

## Nguyên nhân gốc (đã xác minh trong code)

Dựng C cần một primitive **metric** (theo độ dài): "điểm trên tia, cách mốc một khoảng cho trước". Pipeline thiếu primitive này ở mọi tầng:

- `ai/intent.ts:110` — union `add-point` constraint không có nhánh nào theo khoảng cách (chỉ midpoint / onSegment-`t` / intersection / reflect…).
- `dsl/schema.ts:52-72` — không có DSL point kind nhận tham số độ dài.
- `core/scene/kinds/2d-constraint.ts:35-65` — `Constraint2D` không có kind metric-extension. Gần nhất là `onCircleAroundPoint` (center + radiusPoint + **góc cố định** `theta`) — góc không bám hướng A→B nên không tái dùng được.
- `core/scene/kinds/point.ts:445` — kind lạ rơi vào fallback `board.create('point', [0, 0])` → đúng cái **"(0,0) collapse"** đã ghi trong memory.

Hệ quả: AI buộc bịa bằng primitive sẵn có — `reflectPoint` (cho 2B−A, tức BC = AB ≠ R), `onSegment` với `t > 1` (vi phạm `t ∈ [0,1]`), hoặc `free` toạ độ bịa → **không vẽ được / vẽ sai**. Đây là giới hạn pipeline, **không phải lỗi prompt/model**.

## Ngữ nghĩa hình học

```
C = through + d · (through − from) / |through − from|
```

- Điểm trên tia `from → through`, **kéo dài qua `through`**, cách `through` khoảng `d`.
- **Functional point** (giống `arcMidpoint` ở `point.ts:432`) → bám động khi kéo bất kỳ điểm/đường tròn tham chiếu nào.
- **Hướng** đối xứng qua thứ tự đối số, không cần field thừa:
  - "Kéo dài AB về phía B, BC = R" → `from = A, through = B`.
  - "Kéo dài AB về phía A, AC = R" → `from = B, through = A`.

## `DistanceSpec` — 3 nguồn khoảng cách (discriminated union)

| Nguồn | Shape | Render `d` | Đề ví dụ |
|---|---|---|---|
| Bán kính đường tròn | `{ kind: 'circleRadius', circle }` | `resolveRef(circle).Radius()` | "BC = R" |
| Độ dài đoạn (2 điểm) | `{ kind: 'segmentLength', p1, p2 }` | `hypot(p1.X−p2.X, p1.Y−p2.Y)` | "BC = OA", "BC = AB" |
| Số literal | `{ kind: 'literal', value }` | `value` (board units) | "BC = 2cm" |

- `segmentLength` nhận **2 điểm** (không phải segment-id) → phủ cả "= OA", "= AB" mà không cần segment object tồn tại trước.
- Cả 3 đều functional → reactive.

## Thay đổi theo tầng (full path, theo pattern Cụm A: arcMidpoint/excenter)

### 1. Intent vocab — `ai/intent.ts`
Thêm nhánh vào union `add-point` constraint (~dòng 110-130):
```ts
z.object({
  kind: z.literal('pointAtDistance'),
  from: LabelZ,
  through: LabelZ,
  distance: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('circleRadius'), circle: LabelZ }),
    z.object({ kind: z.literal('segmentLength'), p1: LabelZ, p2: LabelZ }),
    z.object({ kind: z.literal('literal'), value: z.number().positive() }),
  ]),
}),
```

### 2. Intent → DSL — `ai/intentToDsl.ts`
Thêm `case 'pointAtDistance'` (~dòng 339+), resolve label → id, `addPoint(s, { name, kind: 'pointAtDistance', from, through, distance })`.

### 3. DSL schema + module + registry
- `dsl/schema.ts` — thêm union member (sau dòng 72):
  ```ts
  | { name: Name; kind: 'pointAtDistance'; from: Name; through: Name; distance: DslDistanceSpec }
  ```
  + định nghĩa `DslDistanceSpec` (3 nhánh như bảng trên).
- `dsl/kinds/points/pointAtDistance.ts` — module mới theo mẫu `onSegment.ts`/`reflectPoint.ts`:
  - `collectRefs`: `[from, through]` + (`circle`) hoặc (`p1, p2`) tuỳ nhánh distance → để topology sort dựng đúng thứ tự.
  - `emit`: `emitPointObject(..., { kind: 'pointAtDistance', from: resolveId(from), through: resolveId(through), distance: <resolve ids trong distance> })`.
- `dsl/registry.ts` — import + thêm `pointAtDistanceModule` vào `ALL_MODULES` (nhóm "Cụm B").

### 4. Constraint union — `core/scene/kinds/2d-constraint.ts`
- Thêm kind:
  ```ts
  | { kind: 'pointAtDistance'; from: string; through: string; distance: ConstraintDistanceSpec }
  ```
  + type `ConstraintDistanceSpec` (3 nhánh, ids là string).
- `constraintRefs2D`: trả `[from, through, ...(distance refs)]`.

### 5. DSL ↔ Constraint (round-trip)
- Chiều DSL → constraint: do module `emit` (tầng 3) tạo `obj.attrs.constraint`.
- Chiều constraint → DSL (re-edit/serialize) — `dsl/serialize.ts`: thêm `case 'pointAtDistance'` (mẫu `arcMidpoint` dòng 174), resolve ids → labels cho cả `from/through` và refs trong `distance`.

### 6. Render — `core/scene/kinds/point.ts`
Trước fallback `[0,0]` (dòng 445), thêm:
```ts
if (c.kind === 'pointAtDistance') {
  const A = ctx.resolveRef(c.from) as any;
  const B = ctx.resolveRef(c.through) as any;
  const dFn = makeDistanceFn(ctx, c.distance); // circleRadius|segmentLength|literal
  const fx = () => { const dx = B.X()-A.X(), dy = B.Y()-A.Y(); const L = Math.hypot(dx,dy)||1; return B.X() + dFn()*dx/L; };
  const fy = () => { const dx = B.X()-A.X(), dy = B.Y()-A.Y(); const L = Math.hypot(dx,dy)||1; return B.Y() + dFn()*dy/L; };
  return board.create('point', [fx, fy], opts);
}
```
+ nhánh `describe` (label tiếng Việt), vd `C = trên tia AB, cách B một khoảng R`.

### 7. Prompt / validator / fixture
- `ai/prompt.ts` + `ai/promptSlim.ts` + `ai/intentPrompt.ts` — thêm dòng bảng từ khoá: "kéo dài XY về phía Y, lấy Z sao cho YZ = R / = đoạn / = số" → `pointAtDistance`.
- `ai/validator.ts` — `extractRequirements()`: regex bắt cụm "kéo dài … (về phía) … = R|=<số>|= <đoạn 2 chữ>" → stub `pointAtDistance`; `applyDeterministicCompletion()` inject stub nếu LLM bỏ sót.
- `dsl/fixtures/extend-chord-bc-radius.ts` — fixture đúng bài động lực (BC = R) để embed vào system prompt + round-trip test.

## Test (TDD — viết test đỏ trước)

1. **Module DSL** (`dsl/kinds/__tests__`): schema accept/reject 3 nhánh distance; `collectRefs` đúng cho từng nhánh.
2. **Serialize round-trip** (`dsl/__tests__`): DSL → scene → DSL bằng nhau cho cả 3 nhánh.
3. **Render** (`core/scene/kinds/__tests__/point`): mock board, verify toạ độ C đúng `B + d·unit(B−A)` (BC = R, đúng phía; segmentLength = OA; literal). Đặc biệt: **không** rơi vào (0,0).
4. **Fixture transpile** (`dsl/fixtures` / integration): fixture bài động lực transpile sạch, C ở đúng vị trí.
5. **Integration completion→transpile** (`ai/__tests__`): chuỗi đề "Cho (O;R), dây AB, kéo dài AB về phía B, BC=R" → intent → DSL → transpile, có điểm `pointAtDistance` đúng tham chiếu.

## Phạm vi defer (ghi rõ — KHÔNG làm lần này)

- **Tool editor vẽ tay** cho `pointAtDistance` (theo đúng quyết định Cụm A defer tool editor).
- **Đơn vị cm-mapping** cho `literal` (giờ là board units thuần).
- **Nguồn distance khác**: bội số k·AB, đường kính 2R, tổng/hiệu 2 đoạn — chưa làm (YAGNI). DistanceSpec là discriminated union nên mở thêm nhánh sau dễ.
- **Tầng metric tổng quát** (distance first-class refactor rộng) — không làm.

## Quyết định kiến trúc

- **1 DSL kind duy nhất** `pointAtDistance`, độ phức tạp dồn vào `DistanceSpec` (discriminated union) → boundary rõ, mở rộng nguồn distance sau không đụng phần hướng/neo.
- Đây là **constraint metric đầu tiên** dùng độ dài tham chiếu (radius / đoạn) — đặt nền cho họ "kéo dài … lấy điểm … = …" rất phổ biến trong đề thi.
