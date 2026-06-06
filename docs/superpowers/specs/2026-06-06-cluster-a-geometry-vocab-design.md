# Cụm A — Mở rộng vocab DSL hình học phẳng (arcMidpoint, reflect, excenter)

- **Ngày:** 2026-06-06
- **Trạng thái:** Design (chờ implement)
- **Nguồn động lực:** Dataset `docs/datasets/julielltv-hinh-hoc-phang.json` (29 bài Olympic/đội tuyển) — nhiều bài dùng construct mà pipeline hiện chưa vẽ được.
- **Mục tiêu (user chốt):** Phủ tối đa dataset. Đây là **sub-project đầu tiên (Cụm A)** của roadmap mở rộng vocab; Cụm B (đẳng phương/Miquel) và Cụm C (compound: Euler/Simson/Mixtilinear) là spec riêng sau.

## 1. Bối cảnh & hiện trạng (đã grep verify)

Pipeline sinh hình: **đề (text) → intent → DSL → SceneObject → JSXGraph render**. Mỗi "construct" muốn vẽ được phải đi qua 7 layer:

1. `ai/intent.ts` — zod discriminated union (op + constraint).
2. `ai/intentToDsl.ts` (+ `normalizeIntent.ts`) — map intent → DSL entity.
3. `dsl/kinds/<category>/<name>.ts` — `DslKindModule` (kind, role, category, prefix, schema, collectRefs, emit).
4. `dsl/registry.ts` — đăng ký module vào `ALL_MODULES`.
5. `core/scene/kinds/point.ts | line.ts` — eval toạ độ + `board.create` (JSXGraph).
6. Anti-bias 3 lớp: `ai/intentPrompt.ts` + `ai/prompt.ts` (từ khoá→kind + ví dụ); `ai/validator.ts` `extractRequirements()` + `applyDeterministicCompletion()`.
7. `dsl/fixtures/` + tests cạnh mỗi file.

**Kind đã có (verify ngày 2026-06-06):**
- Points (15): free, midpoint, onSegment, onLine, onCircle, perpFoot, circumcenter, incenter, centroid, orthocenter, intersection, secondIntersection, circleIntersection, tangencyPoint, tangentPointExt.
- Lines (8): segment, line, ray, perpendicular, parallel, perpBisector, angleBisector, tangent.
- Circles (4): circleCP, circle3, circleCR, incircle. Polygons (1): polygon.
- `dsl/kinds/compound/` **rỗng** (architecture compound-ready nhưng chưa có module).
- Transform engine (`reflectPoint`, `reflectLine`, `rotate`, `translate`, `dilate`) **đã có trong `core/scene/kinds/point.ts`** (construction `transformed`) nhưng **chưa expose ra DSL/intent**.

**Đã có sẵn, KHÔNG làm lại (verify):**
- `tangentAt` (tiếp tuyến tại điểm trên đường tròn, `branch:'on'`) và `tangentFromExt` (từ điểm ngoài, `branch 0|1`) — đã wire đủ qua intent `draw-line` → DSL `tangent` → `line.ts`. Vì vậy **không** thêm `tangentLineAt`.

## 2. Phạm vi Cụm A

**Thêm 3 capability:** `arcMidpoint`, `reflect` (qua điểm + qua đường), `excenter`.

**Loại trừ (YAGNI):** rotate/translate/dilate (ít gặp trong dataset); tangentLineAt (đã có); toàn bộ Cụm B/C (đẳng phương, Miquel, Euler, Simson, Mixtilinear).

## 3. Chiến lược dựng hình: function-coordinate points

`arcMidpoint` và `excenter` dựng bằng **point toạ-độ-hàm**: `board.create('point', [() => formula(parents)], opts)`.

- Reactive (kéo đỉnh → điểm cập nhật), code renderer tối thiểu.
- **Chọn nhánh bằng side-test giải tích**, KHÔNG dùng index của `board.create('intersection', …)` — vì index JXG không ổn định, đúng loại bug gây "(0,0) collapse" đã ghi trong memory `project_ai_pdf_eval_session`.

`reflect` **tái dùng** transform engine `transformed` sẵn có trong `point.ts` → không sửa renderer.

## 4. Spec chi tiết từng kind

### 4.1 `arcMidpoint` — trung điểm cung (point, mới hoàn toàn)

- **Ngữ nghĩa:** trung điểm của cung `AB` của đường tròn `circle`, nằm ở **cung không chứa** `notContaining`. (User chốt: chỉ định cung theo điểm loại trừ — khớp ngôn ngữ đề "cung BC không chứa A".)
- **Intent** (`add-point` constraint, thêm vào union `ai/intent.ts`):
  ```ts
  { kind: 'arcMidpoint', circle: NameZ, a: LabelZ, b: LabelZ, notContaining: LabelZ }
  ```
- **intentToDsl** (`ai/intentToDsl.ts`): `case 'arcMidpoint'` → `addPoint({ name, kind:'arcMidpoint', circle, a, b, notContaining })`.
- **DSL kind** `dsl/kinds/points/arcMidpoint.ts`:
  - role `point`, category `points`, prefix `p`.
  - schema: `{ name, kind:'arcMidpoint', circle: NameZ, a: NameZ, b: NameZ, notContaining: NameZ }`.
  - `collectRefs`: `[circle, a, b, notContaining]`.
  - `emit`: 1 primary point, construction `{ kind:'arcMidpoint', circleId, aId, bId, notContainingId }`.
  - Đăng ký vào `dsl/registry.ts` (`ALL_MODULES` + import).
- **Renderer** `core/scene/kinds/point.ts` (thêm nhánh `c.kind === 'arcMidpoint'` ở cả eval-coords và `board.create`):
  - Toạ độ: lấy tâm `O` và bán kính của `circle`; điểm cung = giao của **trung trực AB** với đường tròn; trong 2 giao điểm, chọn điểm **khác phía** với `notContaining` qua đường thẳng `AB` (side-test bằng dấu của tích có hướng).
  - `board.create('point', [() => arcMid(O, A, B, notC, R)], opts)` (toạ-độ-hàm).
- **Edge cases:**
  - `notContaining` nằm trên đường `AB` (suy biến side-test) → fallback: chọn nhánh xa `notContaining` hơn (khoảng cách Euclid lớn hơn) + `console.warn`.
  - `circle` chưa tồn tại nhưng đề nói "đường tròn ngoại tiếp ABC" → xem §6 (deterministic completion tạo `circle3` trước).

### 4.2 `reflect` — đối xứng (point; renderer ĐÃ CÓ, chỉ expose)

- **Ngữ nghĩa:** `reflectPoint` = đối xứng điểm `of` qua **điểm** `through`; `reflectLine` = đối xứng `of` qua **đường** `through`.
- **Intent** (2 constraint mới trong `add-point` union):
  ```ts
  { kind: 'reflectPoint', of: LabelZ, through: LabelZ }
  { kind: 'reflectLine',  of: LabelZ, through: z.string() }  // through = id/tên đường
  ```
- **intentToDsl:** `case 'reflectPoint' | 'reflectLine'` → DSL point kind tương ứng.
- **DSL kind** `dsl/kinds/points/reflectPoint.ts` & `reflectLine.ts`:
  - role `point`, prefix `p`.
  - `emit`: 1 primary point, construction `transformed` với transform `{ kind:'reflectPoint', center }` / `{ kind:'reflectLine', line }` (đúng shape engine `point.ts` đang nhận).
  - `collectRefs`: reflectPoint `[of, through]`; reflectLine `[of, through]`.
  - Đăng ký vào registry.
- **Renderer:** **không sửa** — `point.ts` đã xử lý `transformed` + `reflectPoint`/`reflectLine`.
- **Edge:** `reflectLine.through` nếu là cạnh tam giác (BC/AB) chưa thành line object → §6 tạo segment/line ref trước.

### 4.3 `excenter` — tâm bàng tiếp (point, mới hoàn toàn)

- **Ngữ nghĩa:** tâm bàng tiếp đối diện đỉnh `opposite` của tam giác `of = [A,B,C]`.
- **Intent** (`add-point` constraint mới):
  ```ts
  { kind: 'excenter', of: z.tuple([LabelZ, LabelZ, LabelZ]), opposite: LabelZ }
  ```
- **intentToDsl:** `case 'excenter'` → `addPoint({ name, kind:'excenter', vertices: intent.of, opposite })` (intent field `of` → DSL field `vertices`).
- **DSL kind** `dsl/kinds/points/excenter.ts`: role `point`, prefix `p`, schema `{ name, kind:'excenter', vertices: tuple3, opposite: NameZ }`, `collectRefs: [...vertices]`, emit construction `{ kind:'excenter', vertices, opposite }`. Đăng ký registry.
- **Renderer** `core/scene/kinds/point.ts` (nhánh `c.kind === 'excenter'`):
  - Công thức trọng tâm có dấu, lật dấu ở đỉnh `opposite`. Với excenter đối diện A: `I_A = (−a·A + b·B + c·C) / (−a + b + c)` (a,b,c = độ dài cạnh đối A,B,C). Tổng quát hoá theo `opposite`.
  - `board.create('point', [() => excenter(A,B,C,opposite)], opts)` (toạ-độ-hàm).
- **Edge:** tam giác suy biến (3 điểm thẳng hàng) → `−a+b+c ≈ 0` → warn + giữ điểm cũ/không vẽ.

## 5. Dạy LLM (anti-bias 3 lớp — bắt buộc đủ cả 3)

| Lớp | File | Nội dung |
|-----|------|----------|
| 1. Prompt | `ai/intentPrompt.ts` (+ mirror `ai/prompt.ts` nếu còn dùng) | Bảng từ khoá→kind: "trung điểm cung XY (không) chứa Z"→`arcMidpoint`; "đối xứng … qua điểm"→`reflectPoint`, "đối xứng … qua (đường) BC"→`reflectLine`; "tâm bàng tiếp / bàng tiếp góc X"→`excenter`. + 1 ví dụ input→intent JSON mỗi kind. |
| 2. Keyword validator | `ai/validator.ts` `extractRequirements()` | Regex tiếng Việt → intent stub cho 3 kind. VD `arcMidpoint`: `/trung điểm cung\s+([A-Z])\s*([A-Z])[^.]*?không chứa\s+([A-Z])/`. |
| 3. Deterministic completion | `ai/validator.ts` `applyDeterministicCompletion()` | Inject/replace stub vào intent **trước** transpile (fallback độc lập LLM). Bao gồm: tự tạo `circle3(A,B,C)` nếu arcMidpoint tham chiếu đường tròn ngoại tiếp chưa có; tạo line ref cho `reflectLine.through` nếu là cạnh chưa thành object. |

## 6. Phụ thuộc tiền đề tự động (deterministic completion)

- **arcMidpoint** cần một circle object: nếu đề nói "(O) ngoại tiếp ABC" mà chưa có → tạo `circle3(A,B,C)` (kind đã tồn tại) và trỏ `circle` vào nó.
- **reflectLine.through** = cạnh tam giác (BC…) chưa có line/segment object → tạo `segment`/`line` ref trước khi emit.

## 7. Editor tool (full path bao gồm dựng tay)

Thêm 3 tool vào `editor/tools.tsx` + icon `editor/icons.tsx` + handler trong `editor/handlers/`:

- **arcMidpoint:** chọn đường tròn → A → B → điểm-loại-trừ.
- **reflect:** chọn điểm `of` → chọn tâm đối xứng (điểm → reflectPoint; đường → reflectLine).
- **excenter:** chọn 3 đỉnh → popover chọn đỉnh đối diện.

Roundtrip/serialize tự động qua construction (`transformed` + 2 construction mới) — không cần xử lý riêng.

## 8. Eval

- **Fixtures** `dsl/fixtures/`: 1 fixture/kind — `arc-midpoint-bisector.ts`, `reflect-over-bc.ts`, `excenter-opposite-a.ts`. Embed vào system prompt (theo cơ chế fixtures hiện tại).
- **Dataset eval subset:** rút các bài dùng đúng 3 construct từ `docs/datasets/julielltv-hinh-hoc-phang.json` làm case mới cho `scripts/eval-intent.ts`. Ứng viên: id 9 (mixtilinear: trung điểm cung), 16 (Lyness/trung điểm cung), 17 (trung điểm cung + đối xứng), 19 (trung điểm cung), 20 (đối xứng qua trung điểm), 29 (excenter). **Verify thủ công từng bài trước khi thêm** — chỉ giữ phần construct mà Cụm A thực sự phủ (không kỳ vọng vẽ trọn bài Tier 3).
- **Target:** kind-accuracy 3 kind mới ≥ **0.9** với provider default (Claude Agent SDK / Sonnet 4.6); ghi nhận 4B/12b để so sánh. Pipeline + deterministic completion phải **pass 100%** (LLM-independent). Không chặn merge nếu LLM dưới target (bottleneck là LLM — memory `project_ai_tier45_eval`).

## 9. Testing (TDD)

- DSL kind: `dsl/kinds/__tests__/<name>.test.ts` — schema parse, collectRefs, emit shape (3 kind).
- Renderer: `core/scene/kinds/__tests__/point.test.ts` — arcMidpoint **test cả 2 nhánh + case suy biến**; excenter công thức (so với giá trị tính tay); reflect dựa test engine cũ.
- intentToDsl: `ai/__tests__` — mapping 3 kind.
- Deterministic completion: test regex→stub + tự tạo circle3/line tiền đề.
- **Final deep-review layer:** plan ≥5 task → bắt buộc 1 pass review cross-file cuối (memory `feedback_deep_review_finds_bugs`).

## 10. Out of scope / rủi ro

- **Rủi ro #1 — arcMidpoint side-test:** chỗ dễ sai nhất; bắt buộc test 2 nhánh + suy biến.
- **Rủi ro #2 — circle/line tiền đề:** deterministic completion phải tạo `circle3`/line ref đúng thứ tự, nếu không arcMidpoint/reflectLine fail resolveRef.
- **Rủi ro #3 — LLM map từ khoá:** Tier 3 (mixtilinear…) vẫn ngoài tầm; Cụm A chỉ phủ construct đơn lẻ, không phủ trọn bài khó.
- **Ngoài phạm vi:** rotate/translate/dilate; tangentLineAt; Cụm B (radicalAxis/radicalCenter/miquelPoint); Cụm C (Euler/Simson/Mixtilinear).

## 11. Touch-map tổng hợp (checklist implement)

Mỗi kind đụng: intent.ts → intentToDsl.ts → dsl/kinds/points/*.ts → registry.ts → point.ts (trừ reflect) → intentPrompt.ts/prompt.ts → validator.ts (extract + completion) → fixtures → tests. reflect bỏ qua point.ts (renderer reuse).
