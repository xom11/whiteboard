# ADR: Extend `core/scene` cho geometry-3d

**Status:** ⚠️ **SUPERSEDED 2026-05-21** — premise sai, decision không relevant.
**Date:** 2026-05-22
**Owners:** @xinmotlanthua
**Liên quan:** issue #28 (Tier A — A3), spec [`2026-05-21-refactor-tier-a-b-design.md`](./2026-05-21-refactor-tier-a-b-design.md)

> ## ⚠️ SUPERSEDED
>
> ADR này dựa trên báo cáo audit SAI: cho rằng `geometry-3d` dùng "legacy `AlgebraList` + `Scene3D` class" và `JxgRenderer3D` là dead file.
>
> Verify lại bằng grep thực tế (2026-05-21):
> - `AlgebraList` và `Scene3D` class **KHÔNG TỒN TẠI** trong codebase.
> - `geometry-3d` import `core/scene` ở **26 file** (nhiều hơn 2D 18 file).
> - `JxgRenderer3D.ts` được wire vào `geometry-3d/render.ts:5` + có 3 test file cover.
> - **Cả 3 stamp interactive (2D/3D/graph-2d) đã dùng scene store rồi.**
>
> Câu hỏi "extend hay freeze" không còn ý nghĩa — extension đã xong từ Phase 2.
>
> **Vấn đề thật** (đã được capture lại ở spec section A3 + B2 mới): chuẩn hoá Tools DSL giữa 3 stamp + promote `useSceneStore` hook từ `geometry-2d/editor/` lên shared. Không phải migration lớn.
>
> Để file này lại để keep history (đừng xoá) — bài học: **luôn grep thực tế trước khi viết ADR**.

---

## Context

Sau Phase 2 (#21) + Phase 3 (#22) của Scene v2 refactor:
- `geometry-2d` và `graph-2d` dùng `useSceneStore` + `JxgRenderer`.
- `geometry-3d` vẫn dùng legacy `AlgebraList` + `Scene3D` class với local state.
- `core/scene/kinds/` đã đăng ký sẵn **12 kind 3D** (point3d, line3d, sphere3d, …) từ Phase 1.
- `core/scene/render/JxgRenderer3D.ts` (166 LoC) đã viết xong nhưng **chưa được wire vào `geometry-3d`** — hiện là dead file.

Trạng thái này là **half-done work**, không phải design intentional. Tier A refactor cần chốt scope cho Tier B's `EditorShell`.

## Options đã cân nhắc

### (a) Extend cho 3D — CHỌN

Migrate `geometry-3d` sang scene store, wire `JxgRenderer3D`, xoá legacy.

**Pros:**
- Hoàn thiện Phase 2 (code đã viết, chỉ chưa wire).
- 3 stamp interactive cùng 1 pattern → `EditorShell` (Tier B1) đơn giản (1 mode).
- Undo/redo consistent cross-stamp.
- Contract test generic + doc add-stamp thống nhất.
- Schema migration sẵn có cho per-kind 3D.

**Cons:**
- 2-3 tuần effort.
- Risk regression — `geometry-3d` đang stable; cần e2e safety net trước migrate.
- Cần migration cho file save format `customData.scene` cũ.

### (b) Freeze 2D-only

Document scene store chỉ phục vụ 2D + graph-2d, rename export tránh ngộ nhận, xoá hoặc gắn deprecated cho code 3D đã viết.

**Pros:**
- ~1 ngày effort (README + rename).
- Không risk regression `geometry-3d`.

**Cons:**
- Bỏ hoang 12 kind 3D + `JxgRenderer3D` (166 LoC) đã viết.
- `EditorShell` phải support 2 mode (store + local) → API phức tạp gấp đôi.
- Vĩnh viễn 2 pattern song song → stamp interactive thứ 5 phải chọn copy pattern nào.
- Người mới đọc code khó hiểu vì sao 2D dùng store mà 3D không.

## Decision

**Chọn (a) Extend.**

Lý do then chốt: **code 3D đã viết, chỉ chưa wire**. Đây không phải build mới mà là finish Phase 2. Trade-off chấp nhận được — 2-3 tuần migrate đổi lấy pattern thống nhất vĩnh viễn.

## Consequences

### Immediate (Tier A)

- Document quyết định này (file ADR đang đọc).
- Comment trên issue #28 ghi nhận.
- Không cần PR code ở Tier A; Tier A vẫn focus tách god-file.

### Tier B (mục B2)

- B2 trở thành 1 mục có scope rõ: migrate `geometry-3d` sang scene store. Xem spec mục B2 cho 7 sub-step.
- B1 `EditorShell` thiết kế với assumption: mọi stamp interactive dùng scene store.

### Risk mitigation

- E2E safety net (`tests/e2e/geometry-3d.spec.ts` mở rộng) BẮT BUỘC chạy pass TRƯỚC mỗi sub-step migration.
- Schema migration cho `customData.scene` cũ → mới: viết unit test với fixture từ v0.15.
- Mỗi sub-step migration là 1 PR riêng để bisect dễ nếu intro regression.

### Long-term

- Stamp interactive thứ N tiếp theo (nếu có) MẶC ĐỊNH dùng scene store.
- Nếu phát hiện kind nào KHÔNG fit scene store (vd: stamp non-2D-canvas-based), revisit ADR này.

## Reversal cost

Nếu sau migrate phát hiện regression nghiêm trọng không fix được trong 1 tuần: revert PR migrate (mỗi sub-step 1 PR → bisect + revert sạch). `core/scene` 3D vẫn còn nhưng không ai dùng — quay lại trạng thái pre-decision. Cost reversal: thấp nhờ chiến lược PR nhỏ.
