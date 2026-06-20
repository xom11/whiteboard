# PROMPT TỰ-CHẠY: Dựng năng lực Hình học 3D ngang tầm 2D (foundation-first)

> Dán nguyên file này làm prompt cho một phiên Claude Code mới ở repo `@xom11/whiteboard`.
> Bạn (AI thực thi) được TRAO TOÀN QUYỀN. Xem mục "Toàn quyền & không hỏi lại".

---

## 0. Toàn quyền & không hỏi lại (BẮT BUỘC)

- Bạn có **toàn quyền quyết định** mọi chi tiết kỹ thuật. **KHÔNG hỏi lại người dùng.** Mọi điểm mơ hồ → chọn phương án hợp lý nhất, ghi 1 dòng lý do trong commit/spec, rồi tiếp tục.
- **Defaults khi phân vân:** (a) luôn mô phỏng đúng pattern của phần 2D đã có; (b) ưu tiên ít rủi ro + 0 regression hơn là "đẹp lý thuyết"; (c) làm tăng dần theo phase, commit nhỏ, verify từng bước; (d) đặt tên/comment tiếng Việt như phần còn lại của repo.
- **Bắt buộc dùng kỷ luật:** TDD (test đỏ trước), `superpowers:test-driven-development`, `superpowers:verification-before-completion`. Với bug → `superpowers:systematic-debugging`.
- Làm việc trên nhánh `feat/3d-foundation`; ff-merge vào `main` + push khi MỖI phase xanh hoàn toàn (standing authorization của chủ repo: push + ff-merge + close issue không cần hỏi; commit/PR tiếng Việt; **KHÔNG** thêm `Co-Authored-By`).
- Mỗi phase là một loạt commit độc lập + verify. Sau mỗi phase: in báo cáo ngắn (đã làm gì, số test, diag-all, quyết định đáng chú ý) rồi tự đi tiếp phase kế — KHÔNG dừng chờ duyệt trừ khi gặp quyết định phá vỡ kiến trúc (hiếm; khi đó ghi rõ + chọn mặc định an toàn + tiếp).

---

## 1. Nhiệm vụ

Phần **Hình học 2D** của repo này có 3 tầng: editor thủ công + **DSL/IR** (`dsl/`) + **rule engine AI text→hình** (`ai/`, 95 rule, ~18K LOC). Phần **Hình học 3D** hiện **chỉ có editor thủ công** với constraint **anchor-only** (đặt điểm tự do/trên bề mặt) — **thiếu hoàn toàn construct PHÁI SINH** (trung điểm, giao điểm, giao tuyến, chân vuông góc, trọng tâm…). Vì bài hình-không-gian VN ~90% xoay quanh construct phái sinh, 3D hiện **gần như chưa dùng được cho dạy học**.

Mục tiêu: nâng 3D lên ngang tầm 2D, **theo lộ trình foundation-first**, mô phỏng đúng kiến trúc 2D.

**Quyết định kiến trúc ĐÃ CHỐT (không bàn lại):**
- **Scene-constraints-FIRST**, KHÔNG làm DSL big-bang trước. Lý do: DSL rồi cũng transpile XUỐNG scene constraint → scene phải có construct trước; cách này cho giá trị nhìn-thấy-ngay + de-risk (không refactor 16 tool imperative cùng lúc) + scene constraint sạch chính là "đường ray" mà DSL/AI tương lai nhắm tới.
- Phân rã 4 phase (làm tuần tự): **v1 điểm phái sinh** → **v1.5 đường/mặt phái sinh** → **v2 DSL/IR** → **v3 rule engine text→hình 3D**.

---

## 2. Hiểu kiến trúc 2D để mô phỏng (đọc trước khi code)

| Vai trò | File 2D (mẫu để mô phỏng) | Tương ứng 3D |
|---|---|---|
| Union constraint + refs | `src/core/scene/kinds/2d-constraint.ts` (`Constraint2D` + `constraintRefs2D`, có **exhaustive never-guard** mới thêm) | `src/core/scene/kinds/3d-constraint.ts` (`Constraint3D` + `constraintRefs`) — **MỞ RỘNG** |
| Tính toạ độ từ constraint | (2D render qua JSXGraph) | `src/stamps/geometry-3d/editor/scene/constraintMath.ts` — `constraintToWorld(c,state)`/`worldToConstraint` (hàm THUẦN, đệ quy) — **MỞ RỘNG** |
| Điểm tự render từ constraint | — | `src/core/scene/kinds/point3d.ts` (render điểm từ `constraintToWorld` → điểm phái sinh tự hiện) |
| DSL kind module + registry | `src/stamps/geometry-2d/dsl/kinds/` (vd `points/onPerpBisector.ts`, `points/mixtilinearPoint.ts`) + `dsl/registry.ts` + `dsl/transpile/refs.ts` (refSpecs registry-driven) | (Phase v2) tạo `src/stamps/geometry-3d/dsl/` mirror |
| Rule engine | `src/stamps/geometry-2d/ai/rules/` (1 module/rule + `registry.ts` + `_shared.ts`) | (Phase v3) tạo `src/stamps/geometry-3d/ai/` mirror |
| Tool editor | `src/stamps/geometry-2d/editor/tools.tsx` | `src/stamps/geometry-3d/editor/tools/spec.ts` + `tools/handlers/*` (step-based: point/closingPoint/object/number) — **THÊM tool** |
| Renderer | `src/core/scene/render/JxgRenderer.ts` | `src/core/scene/render/JxgRenderer3D.ts` |

**Điểm cắm vàng:** `constraintToWorld` (constraintMath.ts) là hàm thuần đệ quy — thêm 1 `case` cho mỗi construct phái sinh dạng ĐIỂM là điểm tự render qua `point3d`, **gần như không đụng renderer**.

---

## 3. Trạng thái 3D hiện tại (đã khảo sát)

- Stamp `geometry3d` (`experimental: true`, `src/stamps/geometry-3d/index.tsx`), serialize/re-edit qua `serialize.ts` (scene JSON), render SVG qua `render.ts` + `JxgRenderer3D`.
- 16 tool primitive (`tools/spec.ts`): move, point, pointOnObject, segment, line, ray, vector, polygon, plane, pyramid, prism, tetrahedron, cube, sphere, cylinder, cone.
- Shape 3D đầy đủ: `point3d/segment3d/line3d/ray3d/vector3d/plane3d/polygon3d/sphere3d/cylinder3d/cone3d/polyhedron3d`.
- `Constraint3D` hiện CHỈ: `free | onGround | onAxis | onPlane | onLine | onPolygon | onSphere` (anchor-only).
- hitTest/rayCast/snapping/usePointDrag có sẵn (interaction 3D).
- **KHÔNG có `dsl/` lẫn `ai/` trong geometry-3d.**

---

## 4. PHASE v1 — Điểm phái sinh (LÀM ĐẦU TIÊN, đầy đủ)

Thêm các construct phái sinh **dạng ĐIỂM** vào scene 3D. Mỗi construct = thêm case vào **3 hàm** + 1 tool + test.

**Tập constraint v1 (đặt tên mô phỏng `Constraint2D`):**
- `midpoint` `{ p1, p2 }` — trung điểm đoạn/cạnh.
- `centroid` `{ vertices: string[] }` — trọng tâm tam giác (3) / tứ diện (4) (trung bình các đỉnh; cho phép N đỉnh).
- `intersectionLines` `{ line1, line2 }` — giao 2 đường ĐỒNG PHẲNG (line/segment/ray/vector). Nếu chéo nhau → trả điểm gần nhất giữa 2 đường (hoặc đánh dấu vô định; chọn mặc định: điểm giữa đoạn vuông góc chung — ghi lý do).
- `intersectionLinePlane` `{ line, plane }` — giao đường ∩ mặt phẳng.
- `perpFootOnLine` `{ from, line }` — chân vuông góc từ điểm xuống đường.
- `perpFootOnPlane` `{ from, plane }` — chân vuông góc từ điểm xuống mặt phẳng.

(Có thể gộp 2 perpFoot thành `perpFoot {from, onto}` với `onto` là line-or-plane nếu sạch hơn — tự quyết.)

**Việc cho MỖI constraint (TDD từng cái):**
1. `src/core/scene/kinds/3d-constraint.ts`: thêm biến thể vào union `Constraint3D` + case vào `constraintRefs`. **ĐỒNG THỜI sửa `constraintRefs` thành exhaustive never-guard** (hiện `default: return []` — mô phỏng đúng `constraintRefs2D` đã sửa: liệt kê `free/onGround/onAxis` tường minh + `default: { const _:never = c; void _; return []; }`).
2. `constraintMath.ts`: thêm case `constraintToWorld` (toán Vec3 thuần — đã có sẵn `sub/add/scale/dot/cross/normalize`). Trong `worldToConstraint`: điểm phái sinh **KHÔNG kéo được** → `return current` (giống điểm derived 2D).
3. Tool: thêm `ToolKey` + `ToolSpec` trong `tools/spec.ts` + build handler trong `tools/handlers/` (mô phỏng handler có sẵn; emit scene object point3d với constraint mới). Thêm vào `TOOL_GROUPS` nhóm hợp lý (vd nhóm "Dựng hình").
4. Test: **unit test thuần cho `constraintToWorld`** với toạ độ biết trước (vd trung điểm (0,0,0)&(2,0,0)=(1,0,0); chân vuông góc; giao đường-mặt) — đây là test rẻ + mạnh nhất. Thêm test cạnh file.
5. Kiểm dependency graph: cascade-delete khi xoá điểm gốc phải xoá điểm phái sinh (constraintRefs đã khai đúng → graph tự lo; thêm 1 test xác nhận).

**Acceptance v1:** đặt được trung điểm/giao điểm/chân vuông góc/trọng tâm trong editor 3D; điểm phái sinh tự cập nhật khi kéo điểm gốc; serialize/re-edit giữ nguyên; xoá gốc cascade đúng; 0 regression.

---

## 5. PHASE v1.5 — Đường/mặt phái sinh

Cần "construction variant" cho shape (mô phỏng 2D `circleDiameter` có `attrs.construction`):
- **Giao tuyến** mặt∩mặt → `line3d` construction `{ kind:'planePlaneIntersection', plane1, plane2 }`.
- **Đường qua điểm song song/vuông góc** đường/mặt → `line3d` construction.
- **Mặt phẳng qua điểm song song/vuông góc** mặt → `plane3d` construction.

Mỗi cái: thêm construction variant vào attrs shape tương ứng + nhánh tính trong constraintMath/renderer + refs (dependency) + tool + test thuần. Render: `JxgRenderer3D` dựng line/plane từ 2 điểm/điểm+normal đã tính.

**Acceptance v1.5:** vẽ được giao tuyến 2 mặt, đường/mặt song song-vuông góc; tất cả cập nhật động + cascade + 0 regression.

---

## 6. PHASE v2 — DSL/IR cho 3D (rail cho AI)

Tạo `src/stamps/geometry-3d/dsl/` mirror `geometry-2d/dsl/`: `kinds/` (1 module/kind: schema zod + `collectRefs` + **`refSpecs`** + `emit`) + `registry.ts` + `transpile/` (validateRefs registry-driven + build scene). Mỗi DSL kind transpile XUỐNG scene constraint/shape đã làm ở v1/v1.5. Tool editor (tuỳ chọn) có thể chuyển sang emit DSL thay vì mutate store trực tiếp — làm dần, KHÔNG big-bang.

**Acceptance v2:** từ một DSL 3D JSON → transpile → scene render đúng; refSpecs validate ref sai kiểu/không tồn tại; round-trip test.

---

## 7. PHASE v3 — Rule engine text→hình 3D

Tạo `src/stamps/geometry-3d/ai/rules/` mirror 2D: 1 module/rule (`{id, priority, languages, patterns, match}`) + `registry.ts` + `_shared.ts` (factory + **`escapeRe` export** ngay từ đầu) + `coverage`/`vocabulary` + `intentToDsl` (3D) + `tryDeterministicFigure` (3D). Bắt đầu từ cụm phrasing phổ biến nhất: "Cho hình chóp S.ABCD …", "hình lập phương ABCD.A'B'C'D'", "trung điểm/giao điểm/giao tuyến …". Tạo `scripts/diag-3d.ts` (mô phỏng `diag-all.ts`) + một dataset đề hình-không-gian nhỏ để đo phủ.

**Acceptance v3:** một tập đề mẫu → dựng hình 3D deterministic không cần LLM; có script đo phủ.

---

## 8. Kỷ luật & cổng chất lượng (áp dụng MỌI phase)

- **Baseline TRƯỚC khi sửa:** `npm test` (ghi số suite/test) + `npx tsx scripts/diag-all.ts` (2D coverage — 3D KHÔNG được làm tụt số này). Yêu cầu **0 regression** cả hai sau mỗi commit.
- **Mỗi thay đổi:** TDD (viết test đỏ → xem fail đúng lý do → code xanh) → `npx tsc --noEmit` (0 lỗi) → `npx jest <liên quan>` → verify → commit.
- **Exhaustive never-guard:** mọi `switch` trên discriminated-union có ref (constraintRefs, transpile) PHẢI dùng `const _:never = x` ở `default` (chống quên case → cascade-delete/deps sai âm thầm).
- **Verify thật:** với render/interaction, verify runtime (Playwright trên board 3D thật) — **KHÔNG tin `index.d.ts` của jsxgraph** (đã biết sai: Sector/Angle là `radiuspoint`/`anglepoint` chữ THƯỜNG ở runtime, .d.ts ghi HOA). Phân loại element JSXGraph dùng `elementClass` (1=POINT,2=LINE,3=CIRCLE), KHÔNG dựa `elType` string.
- **Label JSXGraph:** đặt `JXG.Options.text.display = 'internal'` để clone-SVG export có nhãn (gotcha đã biết).
- Commit conventional tiếng Việt (`feat`/`fix`/`refactor`/`docs`/`test`), KHÔNG `Co-Authored-By`. ff-merge `feat/3d-foundation` → `main` + push sau mỗi phase xanh.

---

## 9. Bug-class BẮT BUỘC tránh (đã cắn nhiều lần ở 2D)

- `\b` ASCII KHÔNG khớp quanh ký tự tiếng Việt → mọi regex tiếng Việt dùng cờ `u` + lookaround `(?!\p{L})` thay `\b`.
- MỌI `new RegExp(\`...${name}...\`)` nội suy tên runtime PHẢI bọc `escapeRe(name)` (tên méo OCR "(O"/"O*" → "Unterminated group" crash cả pipeline). Dùng 1 `escapeRe` chung (ở 3D thì export từ `ai/rules/_shared.ts` khi tới phase v3).
- Constraint phái sinh KHÔNG kéo được → `worldToConstraint` trả `current` (đừng cố quy ngược).
- Khi thêm constraint kind: PHẢI khai trong CẢ `constraintRefs` (deps) lẫn `constraintToWorld` (toạ độ) — quên một chỗ = điểm (0,0,0) hoặc cascade sai.

---

## 10. Khởi động (chạy ngay)

1. `git checkout -b feat/3d-foundation`.
2. Lấy baseline: `npm test` + `npx tsx scripts/diag-all.ts` (lưu số).
3. Đọc 5 file mẫu ở Mục 2 (2d-constraint.ts, 3d-constraint.ts, constraintMath.ts, point3d.ts, tools/spec.ts).
4. Bắt đầu PHASE v1, construct đầu tiên = `midpoint` (đơn giản nhất, prove pattern), TDD.
5. Đi hết v1 → verify → ff-merge → push → báo cáo ngắn → tiếp v1.5 → … (KHÔNG dừng chờ duyệt).

> Tham chiếu bối cảnh đầy đủ: `CLAUDE.md` (gotchas 2D/DSL/AI) + memory `project_2d_arch_mobile_3d.md` (đánh giá kiến trúc 2026-06-20). Commit 2D mẫu để soi diff pattern: `fab5232` (refSpecs+never-guard), `b5eb699` (escapeRe), `e0ef78f` (type boundary).
