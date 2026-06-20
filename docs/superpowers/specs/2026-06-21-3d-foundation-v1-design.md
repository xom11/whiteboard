# 3D Foundation v1 — Quyết định kiến trúc (điểm phái sinh)

> Bổ sung cho brief `2026-06-20-3d-foundation-autonomous-brief.md`. Ghi lại quyết định
> đã chốt sau khi khảo sát code thật (không bàn lại trừ khi runtime bác bỏ).

## Bối cảnh: cơ chế live-update 3D KHÁC 2D

Khảo sát `usePointDrag.ts` + `reducer.ts` + `JxgRenderer3D.applyDiff` + `point3d.render`:

- **2D:** JSXGraph **tự sở hữu** drag → base point KHÔNG bị recreate. Điểm phái sinh
  render bằng native element (`midpoint`/`circumcenter`) hoặc functional callback
  `() => a.X()` đọc element sống. Store chỉ sync lúc drag-end. KHÔNG có `constraintToWorld` 2D.
- **3D:** app **chặn** `pointermove` → dispatch `UPDATE_ATTRS {kind:'free',x,y,z}` MỖI FRAME →
  `applyDiff` thấy ref của điểm bị kéo đổi → vì `point3d` không có `update` hook →
  **remove + recreate** điểm đó. Dependents (ref Immer KHÔNG đổi do structural sharing)
  bị **skip** trong `applyDiff` → giữ nguyên element + closure cũ.

**Hệ quả:** pattern 2D centroid (`const a = resolveRef(id); () => a.X()`) **KHÔNG dịch sang 3D**
— sau frame đầu, `a` trỏ element ĐÃ BỊ XOÁ. Phải đọc toạ độ tươi MỖI lần eval.

## Quyết định

1. **`constraintToWorld`/`worldToConstraint` chuyển về core.**
   Toán thuần trên type core (`Constraint3D` + `State` + `*3DAttrs`, tất cả ở `core/scene/kinds`).
   File mới `src/core/scene/kinds/constraint3d-math.ts`; `stamps/.../scene/constraintMath.ts`
   re-export (giữ mọi import cũ: usePointDrag, tools, tests). Gỡ rào layering core→stamps,
   cho phép `point3d.render` (core) dùng nó. Refactor thuần — 0 thay đổi hành vi.

2. **Mở rộng `RenderCtx` thêm `getState?: () => State` (OPTIONAL).**
   `JxgRenderer3D` cấp `() => this.store.getState()`. 2D `JxgRenderer` bỏ qua → 0 ảnh hưởng 2D.
   Đây là lối cấp State sống cho render (RenderCtx hiện chỉ có jxg/resolveRef/defaults).

3. **`point3d.render`: nhánh generic cho constraint PHÁI SINH** (mọi kind ngoài
   free/onGround/onAxis/onPlane/onLine/onPolygon/onSphere) → **function-based point3d**:
   ```ts
   const cw = () => constraintToWorld(c, ctx.getState!());
   return view.create('point3d', [() => cw()[0], () => cw()[1], () => cw()[2]],
     { ...opts, needsRegularUpdate: true });
   ```
   `needsRegularUpdate:true` → JSXGraph re-eval mỗi board.update() (xảy ra khi base recreate).
   Nhánh anchor cũ giữ nguyên → **0 regression**.

4. **`worldToConstraint`: kind phái sinh trả `current`** (KHÔNG kéo được — giống điểm derived 2D).

5. **`constraintRefs` (3d-constraint.ts): đổi `default:return[]` → exhaustive never-guard**
   (mô phỏng `constraintRefs2D`): liệt kê tường minh free/onGround/onAxis +
   `default:{ const _:never = c; void _; return []; }`. Buộc khai ref khi thêm kind mới
   (chống cascade-delete sai âm thầm).

## Test & verify

- **Cheap-strong:** unit `constraintToWorld(kind, state)` với toạ độ biết trước
  (trung điểm (0,0,0)&(2,0,0)=(1,0,0); chân ⊥; giao đường-mặt). File test ĐẦU TIÊN cho math 3D.
- **Tích hợp:** cascade-delete (xoá gốc → xoá điểm phái sinh) + serialize roundtrip (constraint
  là JSON thuần → tự sống).
- **Runtime (cổng v1):** Playwright board 3D thật xác minh điểm phái sinh chạy LIVE khi kéo gốc.
  Nếu function-point KHÔNG re-eval live → **contingency**: cho `applyDiff` recreate
  transitive-dependents (đổi renderer, có guard 0-regression).

## Baseline (2026-06-21, trước khi sửa)

- Jest: **333 suite / 3210 test** (3209 pass, 1 todo), 207 snapshot.
- diag-all (2D coverage): **729/1788 FULL** / 16 dataset. 3D không đụng → phải giữ nguyên.
