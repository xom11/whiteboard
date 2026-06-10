# Arc-midpoint "chứa X" + phân phối 2-tên — Design

**Ngày:** 2026-06-10
**Trọng tâm dự án:** mở rộng RULE BASE deterministic để LLM hiếm khi cần.

## Vấn đề

Đề mục tiêu:

> Cho tam giác ABC (AB < AC), có tâm ngoại tiếp O và tâm nội tiếp I. D là hình
> chiếu của I lên BC, M là trung điểm BC. N, T lần lượt là trung điểm của cung BC
> không chứa A và chứa A.

`tryDeterministicFigure` hiện trả `incomplete-coverage`: phủ được tam giác
(AB<AC) + circumcenter O + incenter I + perpFoot D + midpoint M, nhưng **MISS**
clause cuối:

> N, T lần lượt là trung điểm của cung BC không chứa A và chứa A

Hai năng lực còn thiếu:

1. **Phân phối 2-tên** — một clause đặt 2 điểm (N, T) ứng với 2 cung (không chứa
   A / chứa A). `arcMidpointRule` chỉ xử lý 1 điểm/clause.
2. **Containment dương "chứa A"** — trung điểm cung BC *chứa* A. Rule hiện
   **defer** (`if (/chứa/ && !/không chứa/) continue;`) và core render
   `arcMidpoint` chỉ hỗ trợ `notContaining`.

## Quyết định thiết kế

- **Render "chứa X"**: mở rộng constraint `arcMidpoint` với field optional
  `containing` (loại trừ lẫn nhau với `notContaining`). KHÔNG thêm primitive
  `antipode` riêng (tránh phụ thuộc thứ tự N→T). Tự mô tả, gắn liền cung.
- **Phạm vi**: tổng quát hóa — phân phối `X, Y lần lượt là … cung PQ không chứa Z
  và chứa Z` + dạng đơn `chứa X` / `không chứa X`, cả VN + EN.

## Kiến trúc (theo tầng)

### 1. Core scene (render)

**`src/core/scene/kinds/2d-constraint.ts`**
- Type arcMidpoint: `notContaining?: string`, `containing?: string` (đúng 1 trong 2).
- `refs` (dòng ~107): `[c.circle, c.a, c.b, (c.notContaining ?? c.containing)!]`.

**`src/core/scene/kinds/pointConstructions.ts`**
- `arcMidpoint(center, radius, a, b, reference, sameSide = false)`: thêm tham số
  thứ 6. `sameSide=true` → lật side-test, lấy ứng viên **cùng phía** `reference`
  (= antipode của candidate notContaining qua tâm). Mặc định `false` ⇒ caller cũ
  byte-identical.
- Nhánh suy biến (reference trên đường AB): `sameSide=true` đảo điều kiện chọn
  ứng viên gần/xa cho nhất quán.

**`src/core/scene/kinds/point-constraints/arcMidpoint.ts`**
- `validate`: cần `circle,a,b` + đúng 1 của `{notContaining, containing}`, else throw.
- `render`: ref = `c.containing ?? c.notContaining`; gọi `arcMidpoint(..., sameSide = !!c.containing)`.
- `describe`: `containing` → "… (chứa <X>)", else "… (không chứa <X>)".

### 2. Intent layer

**`src/stamps/geometry-2d/ai/intent.ts`** (dòng ~143)
- `z.object({ kind: z.literal('arcMidpoint'), circle, a, b, notContaining: LabelZ.optional(), containing: LabelZ.optional() })`.

**`src/stamps/geometry-2d/ai/intent-builders/add-point/arcMidpoint.ts`**
- Truyền cả `notContaining` + `containing` qua `addPoint`.

### 3. Rule (`src/stamps/geometry-2d/ai/rules/arcMidpoint.ts`)

- **Bỏ guard defer "chứa"**. Thay bằng phân loại containment cho mỗi mệnh đề
  containment: `không chứa X` → notContaining:X; `chứa X` (không có "không" ngay
  trước) → containing:X.
- **Phân phối 2-tên**: phát hiện "`<N1>, <N2> lần lượt là … cung <PQ> <CONTAIN1>
  và <CONTAIN2>`" → 2 add-point, zip tên↔containment 1-1. Tên qua HOA-trước-"lần
  lượt"; thiếu thành phần → bỏ qua clause (escalate, fail-safe).
- **Dạng đơn**: 1 tên + `chứa X` → containing:X (trước đây defer).
- Áp cả VN + EN ("containing X" dương).
- Circumcircle ngầm (không nêu "(O)") giữ nguyên cơ chế `withCircum`.

### 4. Test (TDD, viết trước)

- `pointConstructions.test`: `sameSide=true` → kết quả = antipode của `sameSide=false`
  (cùng |center distance|, đối qua tâm), cùng phía reference.
- `rules/__tests__/arcMidpoint.test`: đề đầy đủ → intents N{notContaining:A},
  T{containing:A}; dạng đơn "chứa X"; **không regress** dạng "không chứa" cũ.
- E2E: `tryDeterministicFigure(đề mục tiêu)` → `ok:true`.

## Bất biến / chống regress

- `sameSide` mặc định `false` ⇒ mọi arcMidpoint hiện có render byte-identical.
- `containing`/`notContaining` optional ⇒ DSL/JSON cũ vẫn hợp lệ.
- Named-entity guard: T (và N) đều có trong DSL ⇒ không silent-incomplete.

## Out of scope (defer LLM)

- "cung lớn / major arc" (ngữ nghĩa cung đối) — giữ defer như hiện tại.
- Phân phối > 2 điểm trong 1 clause.
- containment tham chiếu điểm không phải đỉnh tam giác khi dùng circumcircle ngầm.
