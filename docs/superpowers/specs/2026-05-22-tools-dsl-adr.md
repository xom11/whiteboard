# ADR: Tools DSL — giữ 3 pattern hiện có

**Status:** Accepted
**Date:** 2026-05-22
**Owner:** @xinmotlanthua
**Related:** Issue #28 (Tier A), spec [`2026-05-21-refactor-tier-a-b-design.md`](./2026-05-21-refactor-tier-a-b-design.md)

## Bối cảnh

3 stamp interactive (`geometry-2d`, `geometry-3d`, `graph-2d`) đều dùng `core/scene` store nhưng triển khai Tools DSL khác nhau:

| Stamp | Tools layout | LoC |
|---|---|---|
| `geometry-2d` | `editor/tools.tsx` (single declarative `TOOLS` map) | 272 |
| `geometry-3d` | `editor/tools/spec.ts` + `editor/toolPanel/groups.ts` + `editor/toolPanel/icons.tsx` | 245 + ~100 + ~70 |
| `graph-2d` | `editor/tools.ts` + `editor/rows/FunctionRow.tsx` + `editor/rows/ParameterRow.tsx` | ~100 + ~100 + ~90 |

Spec ban đầu (`2026-05-21-refactor-tier-a-b-design.md`) đặt câu hỏi: có nên chuẩn hoá `ToolSpec` contract dùng chung cho cả 3?

## Câu hỏi

- (a) Chuẩn hoá `ToolSpec` contract dùng chung → 3D + graph-2d migrate.
- (b) Giữ nguyên 3 pattern + document lý do.

## Quyết định: **(b) Giữ 3 pattern**

### Lý do

1. **`graph-2d` cần `rows/` thật sự.** Function row + parameter row có inline edit (text input cho biểu thức + slider cho parameter). Không phù hợp với pattern "tool button + click handler" của 2D. Force chung schema sẽ phải thêm `renderRow` slot vào `ToolSpec`, làm contract phức tạp hơn benefit thực tế.
2. **`geometry-3d`'s `toolPanel/` phản ánh complexity 3D.** Tool 3D có grouping rich (point/line/circle/plane/transform sub-menu). Single-file `tools.tsx` pattern của 2D không đủ. Tách `groups.ts` + `icons.tsx` là correct decomposition cho complexity 3D — gộp lại sẽ làm 1 file dài 400+ dòng.
3. **`geometry-2d`'s `tools.tsx` là simple flat list.** Không có group, không có inline edit. Single file pattern đủ. Không cần ép pattern phức tạp hơn.
4. **Cost / benefit thực tế:**
   - Migrate (option a): ~3-5 ngày dev work + risk break visual layout + handler routing trong 2 stamp.
   - Benefit chính: DRY ở level type interface. Nhưng 3 stamp có needs khác nhau → DRY chỉ đạt được ở `ToolSpec` boundary, không ở internal logic. Lợi ích thực tế nhỏ.
5. **Tier B target "stamp interactive mới ≤300 LoC" KHÔNG yêu cầu chuẩn hoá Tools DSL.** Stamp mới chỉ cần chọn 1 trong 3 pattern theo nhu cầu:
   - Flat tool list → copy 2D's `tools.tsx` pattern.
   - Grouped tools với sub-menu → copy 3D's `tools/spec.ts` + `toolPanel/` pattern.
   - Inline edit rows → copy graph-2d's `tools.ts` + `rows/` pattern.

### Trade-off chấp nhận

- **Người mới phải đọc 3 example folder để chọn pattern phù hợp.** Mitigation: Tier B½ doc `add-new-stamp-howto.md` sẽ liệt kê 3 pattern + flowchart "khi nào dùng cái nào".
- **Contract test generic (Tier B½) chỉ test `StampType` boundary** (renderSvg, matchesCustomData, roundtrip), không test tools layout — chấp nhận. Tools là implementation detail của stamp, không phải public contract.

## Hệ quả

- **Tier B mục B2 (chuẩn hoá Tools DSL) → DROP.** Giữ nguyên scope khác của B2: promote `useSceneStore` hook từ `geometry-2d/editor/` lên `core/scene/hooks/` (3D + graph-2d cũng cần dùng).
- **Tier B½ `src/stamps/README.md`** (sẽ tạo trong Tier B½) document 3 pattern + khi nào dùng.

## Alternatives considered

- **(a) Chuẩn hoá:** viability OK (đã xem code), nhưng cost > benefit cho codebase size hiện tại (4 stamp, ~1 dev). Có thể revisit khi codebase scale lên >10 stamp hoặc khi xuất hiện 1 pattern mới đủ generic.
- **(c) Build `ToolSpec` + slot mechanism:** over-engineer, đẩy `EditorShell` (Tier B1) phức tạp hơn cần thiết. Ưu tiên YAGNI.

## Revisit conditions

Re-open ADR này nếu:
- Codebase scale lên ≥6 stamp interactive (cùng pattern xuất hiện ≥3 lần → DRY có giá trị).
- Cần auto-generate documentation/UI từ tools spec (e.g., shortcut help panel) → cần shared contract.
- Refactor lớn khác bắt buộc đụng cả 3 (e.g., undo/redo per-tool, telemetry).
