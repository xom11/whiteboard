# Plan — rule `lineConcurrency`

Spec: `docs/superpowers/specs/2026-06-11-line-concurrency-design.md`

## Task 1 — Rule module + test (TDD)

**File mới:** `src/stamps/geometry-2d/ai/rules/lineConcurrency.ts`
**Test mới:** `src/stamps/geometry-2d/ai/rules/__tests__/lineConcurrency.test.ts`

### Cấu trúc rule
- `id: 'lineConcurrency'`, `priority: 69`, `languages: ['vi']`, `patterns` =
  prefilter (đường cao | phân giác | trung trực | trung tuyến) ∧ verb đồng quy.
- TYPE → kind: cao→orthocenter, phân giác(trong)→incenter, trung trực→circumcenter,
  trung tuyến→centroid.
- VERB: `cắt\s+nhau | đồng\s*quy | gặp\s+nhau | cùng\s+đi\s+qua`.
- Point name: `VERB (tại|qua)? (điểm)? ([A-Z])(?!\p{L})`.
- Tam giác: in-clause (nearest) → unique-problem fallback; trung trực thêm
  suy-đỉnh-từ-cạnh (union 3 đỉnh phân biệt).
- Guard named-skip cho {cao, phân giác, trung tuyến}: ≥2 cặp `[A-Z][A-Z]` giữa
  keyword và verb → return [] (nhường rule cũ). Trung trực miễn guard.
- Fail-safe: thiếu tên / không suy được tam giác → bỏ qua clause.

### Test cases (TDD — viết trước)
1. Unnamed bundle mỗi TYPE → emit đúng center kind:
   - "Ba đường cao của tam giác ABC đồng quy tại H" → orthocenter H of ABC.
   - "Ba đường phân giác của tam giác ABC cắt nhau tại I" → incenter I.
   - "Ba đường trung tuyến của tam giác ABC đồng quy tại G" → centroid G.
   - "Ba đường trung trực của tam giác ABC cắt nhau tại O" → circumcenter O.
2. Verb "cùng đi qua" → vẫn emit (vá silent-bug).
3. Named-skip: "Các đường cao AD, BE, CF … cắt nhau tại H" → rule trả [] (≥2 pair).
   "Các đường phân giác AD, BE, CF … tại I" → []. "Trung tuyến AM, BN, CP … G" → [].
4. Trung trực named-sides: "Đường trung trực của AB, BC, CA đồng quy tại O" →
   circumcenter O (vẫn emit; suy đỉnh A,B,C).
5. Fail-safe: không có tam giác → [].

## Task 2 — Đăng ký registry
Import + thêm `lineConcurrencyRule` vào mảng RULES (`registry.ts`).

## Task 3 — Verify e2e + regression
- `npx tsx scripts/dbg-trace.ts` cho ma trận audit → tất cả OK đúng kind.
- `npx tsx scripts/diag-all.ts` → so baseline, không giảm coverage.
- `npm test` (jest) toàn bộ xanh; `npm run typecheck`.

## Task 4 — Commit
`feat(ai): rule lineConcurrency — điểm đồng quy cao/phân giác/trung trực/trung tuyến`
