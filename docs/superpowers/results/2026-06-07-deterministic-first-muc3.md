# Deterministic-first dựng hình 2D — Mức 3 (kết quả)

- **Ngày:** 2026-06-07 · **Issue:** #45 (sub-issue #43)
- **Spec/Plan:** `docs/superpowers/{specs,plans}/2026-06-07-deterministic-first-muc3*`
- **Tiền đề:** Mức 1 (`...-muc1.md`) + Mức 2 (`...-muc2.md`). REFACTOR **behavior-preserving** — KHÔNG đổi hành vi.

## Đã ship (Phase 2 + 5 + 6, defer Phase 4)

Registry-hoá 2 file switch trung tâm + capability matrix machine-checkable. Output `intent→DSL` và `picks→store-actions` khớp **byte** trước/sau (golden snapshot chứng minh).

| Phase | File trung tâm | Trước | Sau | Registry mới |
|---|---|---|---|---|
| 2 | `ai/intentToDsl.ts` | 567 dòng switch | **31 dòng** orchestrator | `ai/intent-builders/` (`OP_BUILDERS` 6 op + `ADD_POINT_BUILDERS` 20 kind, gom family file) |
| 5 | `editor/handlers/finalizeShape.ts` | 677 dòng, 40 case | **9 dòng** dispatch | `editor/handlers/finalize/` (`TOOL_MODULES` 40 tool, 5 family file) |
| 6 | — | — | — | `scripts/check-construct-matrix.ts` + `scripts/construct-matrix/manifest.ts` (34 construct) |

### Kiến trúc
- **Phase 2:** orchestrator giữ đúng thứ tự loop intents + `repairCircleIntersections` post-dispatch; `BuildState` vẫn shared mutable; helper move nguyên xi vào `intent-builders/shared.ts` + `_types.ts`. Thêm construct = 1 builder module + 1 dòng register.
- **Phase 5:** mỗi tool = `GeometryToolModule { key, finalize }`; `registry.ts` auto-discover qua `Object.values(...).filter(m => typeof m.finalize === 'function')` → thêm tool = **0 dòng register** (chỉ drop 1 const vào family file). TRANSACTION atomicity / multi-branch / validation early-return / order-flexible `findPickIdByKind` giữ verbatim. Signature `finalizeShape` không đổi → `multiClick.ts` không sửa.
- **Phase 6:** matrix introspect **live** 5 registry (`KIND_REGISTRY`/`OP_BUILDERS`/`ADD_POINT_BUILDERS`/`TOOL_MODULES`/`ALL_RULES`) + manifest declarative. Check #1: mọi DSL kind phải có entry; check #2: mọi `intentKey`/`toolKey`/`ruleId` khai báo phải resolve. Thiếu layer bắt buộc / key sai → `exit≠0`. Logic tách thành `runMatrixCheck()` export (test import, gate `require.main === module` để CLI không exit khi import).

### Lưới an toàn golden snapshot (nền tảng, build trước)
- `intentToDsl.golden.test.ts`: 58 curated (phủ MỌI builder branch) + 37 generated-from-probes = 95 snapshot DSL + 1 throw test (connect angleBisector).
- `finalizeShape.golden.test.ts`: 47 snapshot (44 tool + 3 nhánh bội: tangent on/outside/inside, intersect lineLine/lineCircle/circleCircle, pointOn circle/line/segment).
- Mọi phase chạy `--ci` (KHÔNG `-u`) → **142 snapshot pass, 0 written** = byte-identical.

### Verify (cuối)
- Full suite **2204 pass / 0 fail** (baseline 2060 + 144 golden/matrix; 2 skip, 1 todo). Typecheck clean.
- Diag harness `scripts/probes-adversarial.txt`: **37 render / 16 escalate**, **0 regress**.
- `npm run check:matrix`: **✓ 34 construct / 34 DSL kind**, errors=[].
- Mỗi phase TDD riêng, 8 commit tách bạch; 3 task structural (2b/5b/6a) qua 2-stage review độc lập; final holistic review = READY TO MERGE.

## Defer → Phase 4 (session riêng)
**`core/scene/kinds/point.ts`** (527 dòng, 25+ kind) → `point-constraints/` registry. Defer vì **rủi ro cao nhất**: đụng JSXGraph render side-effect, `_helpers` lifecycle, **drag-sync coupling** (`JxgRenderer.attachFreePointDragSync/attachGliderDragSync` → UPDATE_ATTRS → `update()`), function-based coords. Cần session focus + test render kỹ (golden snapshot DSL-level không phủ được render side-effect). Acceptance Phase 4: `point.ts` chỉ còn KindDef mỏng + dispatch; thêm constraint không sửa `point.ts`.

## Gotcha
- **Recon Explore overcount:** landscape agent báo "37 DSL module" nhưng `KIND_REGISTRY.size` thật = **34** (đếm `ALL_MODULES`). Implementer dùng ground-truth live registry — đúng cách (khớp memory `feedback_verify_explore_agent`). Số 37 trong spec/plan là stale; dùng 34.
- **`TOOL_MODULES` import an toàn dưới `npx tsx`:** `finalize/registry.ts` chỉ kéo type imports + `objKind` value từ `tools` (không leak React/CSS) → script node introspect live được, không cần `keys.ts` fallback.
- **Matrix WARN vs ERROR:** `intentKey`/`toolKey`/`ruleId` thiếu = WARN (không ERROR) vì nhiều kind hợp lệ manual-only (`onLine`/`onCircle`) hoặc escalate-only (`excircle`). Required layer thật sự fail = thiếu entry hoặc key sai.
- **Narrowing guard add-point builder:** `const c = intent.constraint; if (c.kind !== 'X') return;` — purely TS-narrowing (dispatch đã đúng kind), tương đương switch gốc, không đổi emit.
- **serialize ✗:** `reflectPoint`/`reflectLine` mang constraint `transformed` → `serialize.ts` `fail('unsupported-constraint')` (khớp Cụm A defer). 32 kind còn lại roundtrip OK.

## Workflow note
- Recon ban đầu = 1 workflow fan-out 4 Explore agent (map 3 file + landscape) — hiệu quả cho explore breadth, nhưng overcount DSL count → phải verify ground-truth.
- Implementation = subagent-driven tuần tự (tasks stateful + phụ thuộc git), controller tự chạy objective gate (golden `--ci`, diag, matrix) giữa mỗi task — KHÔNG tin self-report. Move thuần (Task 1/3) verify nhẹ; task structural (2b/5b/6a) review đầy đủ. Golden snapshot byte-identical là chốt mạnh hơn human review cho refactor loại này.
