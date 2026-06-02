# AI cho đề Tier 4+5 — Design

**Status:** draft
**Date:** 2026-06-02
**Author:** xinmotlanthua
**Related:** [`2026-06-01-ai-intent-pipeline-design.md`](2026-06-01-ai-intent-pipeline-design.md)

## 1. Vấn đề

Pipeline Intent 4-stage hiện tại (commit `399b45e`) đạt 23/30 (77%) trên fixture
Tier 0/1/3/R (mức THCS lớp 7-9, single shape + 1-2 augmentation). Nhưng:

- Đề thi vào lớp 10 thường + chuyên dùng **compound 3-8 step**: tứ giác nội
  tiếp, tiếp tuyến từ điểm ngoài, 2 đường tròn cắt nhau, cát tuyến, giao điểm
  thứ 2, đường tròn nội tiếp + tiếp điểm trên cạnh.
- Intent schema hiện tại chỉ có **4 op** (draw-shape/add-point/connect/draw-circle)
  + 7 point constraint + 2 circle spec → không đủ vocab cho Tier 4+5.
- Stage 4 verify chỉ check 1 case (`right-at-X` triangle có vuông thật) → không
  catch tangent-touch sai, point off-circle, 4 điểm không concyclic.

Kết quả: trên đề Tier 4+5, pipeline emit DSL **thiếu intent** (đủ ý fail) hoặc
**vẽ sai geometric** (đúng fail), không có cơ chế detect.

## 2. Mục tiêu

- **Đủ ý:** Intent schema cover đủ Tier 4+5 → AI tách được toàn bộ lệnh vẽ.
- **Đúng:** Stage 2 deterministic emit DSL đúng kind + JSXGraph render đúng.
- **Không thừa:** Stage 4 verify catch DSL có entity ngoài intent (đã có).
- **Không vẽ sai:** Stage 4 verify thêm 4 check geometric (tangent-touch,
  on-circle, concyclic, collinear) → fail-fast trước khi user thấy hình sai.

### Success criteria

| Metric | gemma3:4b | gemma3:12b |
|---|---|---|
| Exact-match Intent[] trên 15 fixture mới | ≥60% | ≥85% |
| 0 false-positive build trên 4 đề refuse | required | required |
| Stage 4 catch ≥80% mismatch geometric đã seed | required | required |

## 3. Non-goals

- Phép biến hình (reflect/rotate/translate object) — Tier 6 HSG.
- Tiếp tuyến chung trong/ngoài 2 đường tròn — construction phức tạp, defer.
- Trục đẳng phương, point at infinity — không thực tế cho whiteboard.
- Đổi default model (Gemma 4B/12B giữ nguyên — anh đã chọn logic-first).
- Giữ pipeline cũ `buildFigure` DSL free-form — mark `@deprecated`, gỡ trong
  release sau.

## 4. Approach — Logic-first, mở rộng Intent pipeline

```
Tier 0/1/3 (cũ)  ────┐
                     ├─→ Stage 1 (extract) → Stage 2 (translate) → Stage 3 (render) → Stage 4 (verify)
Tier 4/5  (mới)  ────┘    + 1 op mới             + 6 DSL kind mới      (no change)        + 4 check
                          + 3 circle spec mới
                          + 4 constraint mới
```

Không đụng pipeline architecture (vẫn 4 stage). Mọi thay đổi là **additive**
trên schema + builder + verify.

## 5. Schema thay đổi

### 5.1 Intent schema (`intent.ts`)

**Op mới: `draw-line`** (named line, geometric construction):
```ts
{ op: 'draw-line', name: 'd',
  kind: 'perpThrough' | 'parallelThrough' | 'tangentAt' | 'tangentFromExt',
  through?: Label, to?: Label, from?: Label, circle?: Label,
  which?: 'first' | 'second' | 'both',
}
```

**`draw-circle` spec thêm:**
- `centerRadius` — `{spec:'centerRadius', center:'O', radius:3}` cho "(O; R=3)".
- `inscribedIn` — `{spec:'inscribedIn', triangle:['A','B','C']}` cho đường tròn
  nội tiếp ΔABC.
- Giữ `centerThrough`, `through3`.

**`add-point` constraint kinds mới:**
- `secondIntersection` — `{kind:'secondIntersection', line:'AD', circle:'O', other:'A'}`
  giao điểm thứ 2 của 1 line với 1 circle (biết điểm thứ 1).
- `circleIntersection` — `{kind:'circleIntersection', c1:'O', c2:"O'", which:'first'|'second'}`
  giao 2 đường tròn.
- `tangencyPoint` — `{kind:'tangencyPoint', circle:'I', onLine:'BC'}` tiếp điểm
  của inscribed circle với cạnh.
- `tangentPoint` — `{kind:'tangentPoint', from:'A', circle:'O', which:'first'|'second'}`
  tiếp điểm khi vẽ tiếp tuyến từ ngoài.
- `angleBisectorFoot` — `{kind:'angleBisectorFoot', from:'A', onLine:'BC'}` chân
  phân giác trên cạnh đối diện (đã thiếu trong schema cũ).

### 5.2 DSL kinds mới (`dsl/kinds/`)

| File | Kind type | Mục đích |
|---|---|---|
| `compound/tangentAt.ts` | shape | tiếp tuyến tại 1 điểm trên đường tròn |
| `compound/tangentFromExt.ts` | shape | tiếp tuyến từ điểm ngoài (gen 2 line khi which='both') |
| `circles/circleCR.ts` | shape | đường tròn center + numeric radius |
| `circles/incircle.ts` | shape | đường tròn nội tiếp tam giác |
| `points/secondIntersection.ts` | point | giao điểm thứ 2 line∩circle |
| `points/circleIntersection.ts` | point | giao 2 circle (first/second selector) |
| `points/tangencyPoint.ts` | point | tiếp điểm với cạnh (cho incircle) |
| `points/tangentPointExt.ts` | point | tiếp điểm khi tangent từ ngoài |

JSXGraph backing: `tangent`, `intersection` (với `index` arg để chọn 1st/2nd)
support native — Stage 3 không cần extra code.

### 5.3 Stage 2 builder (`intentToDsl.ts`)

Canonical coord strategy cho new ops:

| Intent | Coord rule |
|---|---|
| `draw-circle centerRadius` không có ref shape | Center tại (4, 2), R per đề. |
| `draw-circle centerRadius` có ref triangle | Center tại centroid của triangle, R per đề (or default 3). |
| `draw-circle inscribedIn` | Center = incenter computed, R = inradius computed. |
| Điểm ngoài đường tròn (cho tangentFromExt) | Place tại (center.x + 2*R, center.y). |
| 2 đường tròn cắt nhau | O=(0,0) R=2, O'=(3,0) R=2 → giao tại y=±√1.75. |
| `secondIntersection` | JSXGraph `intersection(line, circle, 1)` (idx=0 là điểm `other`, idx=1 là điểm cần). |
| `circleIntersection` | JSXGraph `intersection(c1, c2, 0)` first, `intersection(c1, c2, 1)` second. |

### 5.4 Stage 4 verify (`verify.ts`)

Thêm 4 check geometric trên DSL transpile + computed coords:

| Check | Trigger | Tolerance |
|---|---|---|
| `tangent-touch` | shape có kind tangent* | `|dist(center,line) - radius| < 1e-3` |
| `concyclic-4+` | circle có ≥4 named point khai báo on it | `|dist(p,center) - radius| < 1e-3` mọi point |
| `on-circle` | point kind onCircle/secondIntersection/circleIntersection/tangentPoint* | tương tự |
| `collinear-3+` | ≥3 point cùng kind onLine cùng ref | `|cross(p1p2, p1p3)| < 1e-6` |

VerifyReport thêm field `geometric: VerifyIssue[]` (axis thứ 4 ngoài
missing/wrong/extra).

**Retry budget:** Stage 4 fail → inject hint vào Stage 1 retry **tối đa 1
lần** (giữ pattern hiện tại của validateKindCoverage).

## 6. Fixtures + eval

15 đề (`scripts/eval-intent.ts` extension):

**Tier 4 (10):**
1. ΔABC nhọn, đường cao BE & CF cắt tại H
2. (O) và A ngoài (O), vẽ 2 tiếp tuyến AB, AC
3. (O) ∩ (O') = {A, B}
4. AB với M trung điểm; d qua M ⊥ AB cắt (O) tại P, Q
5. ΔABC nội tiếp (O); phân giác AD cắt (O) tại E (E≠A)
6. ΔABC, (I) nội tiếp tiếp xúc BC/CA/AB tại D/E/F
7. (O; R=3) và dây AB, M trung điểm AB
8. (O) và A trên (O), vẽ tiếp tuyến At tại A
9. ΔABC, đường trung trực AB và AC cắt tại O
10. (O), từ P trong (O) vẽ dây AB qua P

**Tier 5 (5):**
11. ΔABC nội tiếp (O); M, N trung điểm AB, AC; MN cắt (O) tại P, Q
12. (O) và 2 dây AB, CD cắt tại P trong (O)
13. ΔABC, (I) nội tiếp tiếp xúc BC tại D; vẽ AD
14. (O) ∩ (O') = {A,B}; qua A song song O'B cắt (O') tại C ≠ A
15. ΔABC vuông tại A, AH ⊥ BC; (A; AH) cắt AB, AC tại P, Q

Eval metric (kế thừa eval-intent):
- `exactMatch` — Intent[] khớp 100% expected
- 3-axis cũ: `missing` / `wrong` / `extra`
- + axis mới `geometric` (Stage 4)
- Latency per problem

Run trên `gemma3:4b` + `gemma3:12b`, output bảng so sánh 2 cột.

## 7. Migration

- `buildFigure.ts` (DSL free-form path) → mark `@deprecated` JSDoc + `console.warn`
  khi gọi runtime. Giữ 1 release (0.25.x), gỡ ở 0.26.0.
- Consumer UI hiện gọi `handleGenerateFigure` — thêm Façade
  `handleGenerateFigureIntent` (đã có `generateFigureIntent`) → switch consumer
  trong release sau.
- Public API barrel `index.ts` không thay đổi (additive only ở internal).
- Version bump: 0.24.x → 0.25.0 (minor — additive intent ops + internal kinds).

## 8. Testing strategy

Mỗi PR/step phải kèm test:
- Unit test per DSL kind mới (mock JSXGraph, check coord math).
- Schema test: `intent.ts` parse/refuse cho từng new op.
- Stage 2 test: golden DSL per intent (extend `intentToDsl.test.ts`).
- Stage 4 test: synthetic mismatch → detect tangent-touch/concyclic fail.
- Manual eval: `npx tsx scripts/eval-intent.ts gemma3:4b` + `gemma3:12b` —
  capture metrics, không CI gate.

## 9. Implementation order (cho writing-plans)

1. 6 DSL kind mới + unit test (lowest level, deterministic).
2. Schema extension `intent.ts` + `intentEnvelope.ts` + zod test.
3. Stage 2 builder additions trong `intentToDsl.ts` + test.
4. Stage 4 verify additions trong `verify.ts` + test.
5. Prompt fixtures (extend `intentPrompt.ts`) — không test, manual review.
6. 15 eval fixture mới trong `eval-intent.ts`.
7. Run eval 4B + 12B, capture metrics. Iterate prompt nếu fail criteria.
8. Mark `buildFigure` `@deprecated`.
9. Update `CLAUDE.md` "Gotchas (AI/DSL pipeline)" + bump version.

## 10. Open questions

- **tangentFromExt `which:'both'`**: Stage 2 expand thành 2 line + 2 tangent
  point automatic — đề xuất đi đường này (gọn cho LLM). Confirm khi implement.
- **circleCR khi đề không cho radius numeric**: default R=3. Có thể conflict
  nếu có 2 circle CR trong 1 đề — Stage 2 detect collision, scale R thứ 2.
- **Refuse fixture Tier 4/5**: hiện chỉ có 4 refuse (sin/cos/cat/phương trình).
  Có cần thêm refuse "không vẽ được" specific cho Tier 4+5 (vd "chứng minh
  bất đẳng thức tam giác" — không vẽ được hình minh hoạ)? → defer, thêm nếu
  eval cho thấy false-positive build cao.
