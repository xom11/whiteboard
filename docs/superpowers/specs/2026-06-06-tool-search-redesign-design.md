# Thiết kế lại "Tìm công cụ" + lộ các kind chưa có icon (geometry-2d)

**Ngày:** 2026-06-06
**Trạng thái:** Đã chốt qua brainstorming, chờ review trước khi viết plan.

## 1. Bối cảnh & vấn đề

Ô search "Tìm công cụ…" trong `ToolGrid.tsx` (shared cho 3 stamp editor: geometry-2d, geometry-3d, graph-2d) hiện:

- Lọc tool theo `label` + `hint` (bỏ dấu tiếng Việt, case-insensitive).
- Render kết quả **chỉ icon** dạng grid 4 cột; tên công cụ **chỉ hiện ở tooltip hover** → khó biết công cụ nào nếu không rê chuột.

Ngoài ra, geometry-2d có nhiều **DSL kind** dùng được qua AI/DSL nhưng **không có tool/icon** để vẽ tay (manual). Ví dụ người dùng nêu: "đường tròn bàng tiếp" (excircle). Các kind này vô hình với người dùng vẽ tay.

## 2. Mục tiêu

1. **Search hiển thị tên**: khi đang gõ tìm kiếm, kết quả chuyển sang **list (icon + tên + hint)**; khi ô search rỗng, giữ nguyên **grid 4-cột icon** + chia group như hiện tại.
2. **Vẽ tương tác đầy đủ** cho các kind Tier 1+2 hiện chưa có icon — mỗi kind thành một `ToolDef` thật (click vào → vào chế độ vẽ → click các điểm → dựng hình thật).
3. Các tool advanced / không có icon tự nhiên gom vào group mới **"Nâng cao"**.

## 3. Kiến trúc

### 3.1. Req 1 — `ToolGrid.tsx` (shared, áp dụng cả 3 editor)

- Thêm nhánh render theo `normalizedQuery`:
  - `normalizedQuery !== ''` → **list mode**: danh sách phẳng (đã lọc, bỏ chia group), mỗi item = `[icon] label` + dòng `hint` mờ bên dưới. Item là `<button data-tool={key}>` giữ nguyên `onToolChange`, `aria-pressed`, highlight active.
  - `normalizedQuery === ''` → **grid mode** hiện tại (group + 4-cột icon + chord highlight) không đổi.
- Tách phần list thành sub-component `ToolResultList` trong cùng file để `ToolGrid` gọn.
- Empty state ("Không có công cụ nào khớp…") giữ nguyên, dùng cho cả 2 mode.
- Tooltip hover (`useToolHoverTooltip`) vẫn dùng cho grid mode; list mode không cần (tên đã hiện) nhưng không phải gỡ.
- Vì các kind mới (req 2) là `ToolDef` thật nên tự động xuất hiện trong cả grid lẫn list search → req1 và req2 ghép tự nhiên.

### 3.2. Req 2 — geometry-2d: mỗi kind = một `ToolDef`

Với mỗi kind thêm vào:
1. Thêm key vào union `GeomTool` (`editor/tools.tsx`).
2. Thêm entry `TOOLS`: `key`, `label`, `hint`, `icon`, `group`, `needs`, `accepts`.
3. Thêm `case` trong `editor/handlers/finalizeShape.ts` dispatch scene object với `attrs.kind` / `construction` đúng để render.

Interaction tái dùng `pointerDown/multiClick` generic (đếm click theo `needs`, lọc theo `accepts`). Ba pattern đặc biệt:

- **Nhập tham số (circleCR)**: click tâm → mở param popover nhập bán kính `R` (theo mẫu `regularPolygon` nhập số cạnh / `rotate` nhập góc, dùng `TransformParamPopover`).
- **Glider — điểm trên đối tượng (`pointOn`)**: một tool `accepts:['lineOrCircle']` (mở rộng cho cả segment nếu khả thi). `finalizeShape` đọc toạ độ click cuối, tính `theta` (trên circle) / `t` (trên line/segment) bằng helper sẵn có (`computeCircleTheta`, `computePerpendicularT`, `computePerpBisectorT`) → dispatch `onCircle` / `onLine` / `onSegment` theo `objKind` của object được click.
- **Chọn nghiệm `which` (circleIntersection, tangentPointExt)**: sau khi click đủ object, chọn nghiệm hình học gần vị trí click nhất → set `which: 0 | 1`.

### 3.3. Group "Nâng cao"

- Thêm group key `advanced` vào `ToolDef['group']`, `GROUP_LABELS` (`'Nâng cao'`), và **append cuối** `GROUP_ORDER` (giữ ổn định letter chord của các group cũ; `letterForGroup` derive theo index).
- Các tool advanced gom vào đây; tool thông dụng đặt vào group tự nhiên.

## 4. Phạm vi tool mới (Tier 1+2) + tình trạng render đã verify

Render verify trong `src/core/scene/kinds/`: tất cả **điểm phái sinh** đã có trong `pointConstructions.ts`; `circleCR` có trong `circle.ts`. **incircle** và **excircle** chưa render.

| Kind | Tool (label) | Group | Interaction | Render hiện trạng | Việc cần |
|---|---|---|---|---|---|
| `pointOn` (`onLine/onSegment/onCircle`) | Điểm trên đối tượng | point | click 1 đường/đtròn, tính theta/t từ click | ✅ | tool + finalizeShape (theta/t) |
| `circleCR` | Đường tròn (tâm + bán kính) | circle | click tâm → nhập R | ✅ | tool + param popover |
| `incircle` | Đường tròn nội tiếp | triangle | click 3 đỉnh | ❌ chưa wire | tool + **wire render** trong `circle.ts` + test |
| excircle | Đường tròn bàng tiếp | advanced | click 3 đỉnh + đỉnh đối diện | ❌ chưa có kind | **DSL kind mới** + render + register (registry/schema/prompt) + fixture + tool |
| `excenter` | Tâm đường tròn bàng tiếp | advanced | 3 đỉnh + opposite | ✅ | tool + finalizeShape |
| `arcMidpoint` | Điểm giữa cung | advanced | circle + 2 đầu cung + điểm chỉ phía | ✅ | tool (4-pick) |
| `secondIntersection` | Giao điểm thứ hai | advanced | line + circle + điểm giao đã có | ✅ | tool |
| `circleIntersection` | Giao 2 đường tròn | advanced | 2 đtròn, pick nghiệm gần click | ✅ | tool + which |
| `tangencyPoint` | Tiếp điểm (đường tiếp xúc) | advanced | circle + đường tiếp tuyến | ✅ | tool |
| `tangentPointExt` | Tiếp điểm từ điểm ngoài | advanced | điểm ngoài + circle, pick which | ✅ | tool + which |

> `pointOn`, `circleCR`, `incircle` đặt ở group thông dụng (point/circle/triangle) vì hay dùng; phần còn lại vào "Nâng cao". Có thể tinh chỉnh khi triển khai nếu grid chật.

## 5. Hai render gap cần xử lý

- **incircle**: thêm nhánh trong `core/scene/kinds/circle.ts` đọc `attrs.kind === 'incircle'` + `vertices` (3 đỉnh) → dựng đường tròn nội tiếp (JSXGraph `incircle`, hoặc tự tính incenter + bán kính nội tiếp). Thêm test render. Đây cũng đóng luôn bug "incircle defer".
- **excircle**: tạo module `dsl/kinds/circles/excircle.ts` (schema `vertices: [3] + opposite`), thêm render branch tương ứng trong `circle.ts`, đăng ký theo gotcha "thêm kind mới = cập nhật registry + schema + prompt + fixture". (Có thể dựng từ excenter + bán kính tới cạnh đối.)

## 6. Test & verify

- **ToolGrid**: test list-mode khi có query (item có `data-tool` + hiển thị text `label`), grid-mode khi rỗng; "Nâng cao" group render đúng vị trí cuối.
- **Mỗi tool mới**: test `finalizeShape` dispatch đúng `attrs.kind` + refs (mock pending picks); test glider tính theta/t; test which chọn nghiệm gần click.
- **Render**: test `core/scene/kinds/circle.ts` cho incircle + excircle (mock board.create, kiểm element type + tham số).
- **Smoke e2e**: chọn tool từ search-list → click các điểm → object xuất hiện đúng kind.
- `npm run typecheck` + toàn bộ jest xanh.

## 7. Ngoài phạm vi

- geometry-3d / graph-2d **không** thêm tool mới (chỉ hưởng search-list từ shared `ToolGrid`).
- Tier 3 (parity toàn bộ DSL kind ↔ tool tay).
- Thay đổi AI/DSL pipeline ngoài việc thêm `excircle` kind.
- Thay đổi cơ chế persist/serialize (các kind đã serialize sẵn).
