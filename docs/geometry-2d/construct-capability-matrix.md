# Construct capability matrix — geometry-2d

Mỗi **construct** hình học (điểm/đường/đường tròn/đa giác...) đi qua nhiều "lớp" trong pipeline. Tài liệu này liệt kê từng construct và lớp nào đã wire, để PR thêm construct không bỏ sót lớp bắt buộc.

## Nguồn chân lý (source of truth)

Danh sách construct enumerate từ **`src/stamps/geometry-2d/dsl/registry.ts`** — `KIND_REGISTRY` (34 DSL kind). Mỗi DSL kind là 1 dòng trong matrix.

Khai báo lớp của mỗi construct nằm ở **`scripts/construct-matrix/manifest.ts`** (`CONSTRUCT_MANIFEST`, 34 entry). Manifest là declarative; script `check:matrix` introspect 4 registry runtime rồi đối chiếu manifest:

- `KIND_REGISTRY` — `dsl/registry.ts`
- `OP_BUILDERS` + `ADD_POINT_BUILDERS` — `ai/intent-builders/`
- `TOOL_MODULES` — `editor/handlers/finalize/registry.ts`
- `ALL_RULES` — `ai/rules/registry.ts`

## Lớp bắt buộc vs tuỳ chọn

| Lớp | Cột | Bắt buộc? | Ý nghĩa |
|---|---|---|---|
| **Scene** | `scene` | ✅ bắt buộc | `SceneObject.kind` mà DSL emit sinh ra (point/line/circle/polygon...). |
| **DSL** | (dòng tồn tại) | ✅ bắt buộc | Có module trong `KIND_REGISTRY` — điều kiện để construct có mặt trong matrix. |
| **Intent** | `intent` | ✅ bắt buộc* | op (`OP_BUILDERS`) hoặc add-point `constraint.kind` (`ADD_POINT_BUILDERS`) sinh ra DSL kind này. |
| **Serialize** | `ser` | ✅ bắt buộc* | `dsl/serialize.ts` roundtrip được kind này (re-edit stamp). |
| **Rule** | `rule` | ⬜ tuỳ chọn | id rule deterministic (`ALL_RULES`) sinh DSL kind này từ đề tiếng Việt; `—` nếu chỉ escalate AI. |
| **Tool** | `tool` | ⬜ tuỳ chọn | key tool vẽ tay (`TOOL_MODULES`) tạo ra nó; `—` nếu không có UI vẽ tay. |
| **Eval** | (manifest `evalFixture`) | ⬜ tuỳ chọn | path fixture eval; null nếu chưa có. |

\* "bắt buộc" theo nghĩa *mong đợi* — nhưng một số construct có lý do chính đáng để thiếu (xem [WARN gaps](#warn-gaps-thiếu-có-chủ-đích)). Script chỉ **fail (đỏ)** khi DSL kind thiếu entry trong manifest, hoặc khi key khai báo (intent/tool/rule) **lệch tên** không resolve được trong registry. Lớp tuỳ chọn null chỉ in **WARN** (vàng), không fail.

Ký hiệu trong bảng:

- `—` : construct **không có path** ở lớp đó (vd không có rule deterministic, hoặc không có tool vẽ tay).
- cột `ser`: `✓` = serialize roundtrip được; `✗` = chưa hỗ trợ (`fail('unsupported-constraint')` khi re-edit).

## Cách chạy

```bash
npm run check:matrix
```

In bảng 34 dòng + danh sách WARN + `✓ Matrix OK — 34 construct, 34 DSL kind.` (exit 0). Nếu có ERROR → in `ERRORS:` + `process.exit(1)`.

## Matrix (34 construct)

| DSL kind | scene | intent | tool | rule | ser |
|---|---|---|---|---|---|
| `free` | point | `free` | `pointOn` | — | ✓ |
| `midpoint` | point | `midpoint` | `midpoint` | `midpoint` | ✓ |
| `onSegment` | point | `onSegment` | `pointOn` | — | ✓ |
| `onLine` | point | — | `pointOn` | — | ✓ |
| `onCircle` | point | — | `pointOn` | — | ✓ |
| `perpFoot` | point | `perpFoot` | `perpFoot` | `perpFoot` | ✓ |
| `circumcenter` | point | `circumcenter` | `circumcenter` | `centers` | ✓ |
| `incenter` | point | `incenter` | `incenter` | `centers` | ✓ |
| `centroid` | point | `centroid` | `centroid` | `centers` | ✓ |
| `orthocenter` | point | `orthocenter` | `orthocenter` | `centers` | ✓ |
| `intersection` | point | `intersection` | `intersect` | — | ✓ |
| `secondIntersection` | point | `secondIntersection` | `secondIntersection` | — | ✓ |
| `circleIntersection` | point | `circleIntersection` | `circleIntersection` | — | ✓ |
| `tangencyPoint` | point | `tangencyPoint` | `tangencyPoint` | — | ✓ |
| `tangentPointExt` | point | `tangentPoint` | `tangentPointExt` | — | ✓ |
| `arcMidpoint` | point | `arcMidpoint` | `arcMidpoint` | `arcMidpoint` | ✓ |
| `excenter` | point | `excenter` | `excenter` | `centers` | ✓ |
| `reflectPoint` | point | `reflectPoint` | — | `reflection` | ✗ |
| `reflectLine` | point | `reflectLine` | — | `reflection` | ✗ |
| `pointAtDistance` | point | `pointAtDistance` | — | `pointAtDistance` | ✓ |
| `segment` | segment | `connect` | `segment` | `connect` | ✓ |
| `line` | line | `connect` | `line` | `connect` | ✓ |
| `ray` | ray | `connect` | `ray` | `connect` | ✓ |
| `perpendicular` | line | `draw-line` | `perpendicular` | — | ✓ |
| `parallel` | line | `draw-line` | `parallel` | — | ✓ |
| `perpBisector` | line | `connect` | `perpBisector` | `perpBisector` | ✓ |
| `angleBisector` | line | `angleBisectorFoot` | `angleBisector` | `cevian` | ✓ |
| `tangent` | tangent | `draw-line` | `tangent` | `tangentFromExt` | ✓ |
| `polygon` | polygon | `draw-shape` | `square` | `triangle` | ✓ |
| `circleCP` | circle | `draw-circle` | `circleCenter` | `circleRadius` | ✓ |
| `circle3` | circle | `draw-circle` | `circle3` | `circleTriangle` | ✓ |
| `circleCR` | circle | `draw-circle` | — | `circleRadius` | ✓ |
| `incircle` | circle | `draw-circle` | `incircle` | `circleTriangle` | ✓ |
| `excircle` | circle | — | `excircle` | — | ✓ |

> Lệch tên đáng chú ý (DSL kind ≠ key lớp): DSL `tangentPointExt` ← intent `tangentPoint`; DSL `circleCP`/`circle3`/`circleCR`/`incircle` ← intent `draw-circle`; DSL `polygon` ← intent `draw-shape`, tool `square` (đại diện — polygon có nhiều tool); DSL `angleBisector` ← rule `cevian`, tool `angleBisector`; `segment`/`line`/`ray`/`perpBisector` ← intent `connect`.

## Thêm construct mới

PR thêm construct → **cập nhật `scripts/construct-matrix/manifest.ts`** (thêm 1 entry cho DSL kind mới). CI `check:matrix` sẽ **đỏ** nếu:

- DSL kind có trong `KIND_REGISTRY` nhưng **thiếu entry** trong manifest, hoặc
- `intentKey` / `toolKey` / `ruleId` khai báo **sai/lệch tên** (không resolve được trong registry tương ứng), hoặc
- `evalFixture` trỏ tới file **không tồn tại**.

Lớp tuỳ chọn (rule/tool/eval) có thể để `null` — chỉ in WARN, không fail.

## WARN gaps (thiếu có chủ đích)

Các WARN dưới là **gap đã biết, cố ý** — không phải bug. Liệt kê ở đây để khỏi bất ngờ khi đọc output `check:matrix`:

**Không có rule deterministic** (`rule` = `—`) — construct chỉ tới qua manual tool hoặc AI escalate, chưa có rule từ keyword tiếng Việt:

- `free`, `onSegment`, `onLine`, `onCircle` — điểm tự do / trên đối tượng: không có "đề" deterministic, đặt tay hoặc qua intent.
- `intersection`, `secondIntersection`, `circleIntersection`, `tangencyPoint`, `tangentPointExt` — giao/tiếp điểm: phụ thuộc đối tượng có sẵn, đi qua intent layer chứ không rule keyword.
- `perpendicular`, `parallel` — đường vuông góc / song song: qua `draw-line` intent, chưa có rule.
- `excircle` — đường tròn bàng tiếp: chỉ manual tool.

**Không có path Intent** (`intent` = `—`) — construct chỉ tạo được bằng tay (tool) hoặc AI escalate, không có builder intent deterministic:

- `onLine`, `onCircle` — điểm trên đường/đường tròn: chỉ qua tool `pointOn` (click).
- `excircle` — chỉ qua tool `excircle`.

**Không có manual tool** (`tool` = `—`) — construct chỉ sinh qua AI/intent, chưa có UI vẽ tay:

- `reflectPoint`, `reflectLine` — phép đối xứng: qua intent/rule, chưa có tool editor (xem CLAUDE.md Cụm A — editor tool defer).
- `pointAtDistance` — điểm trên tia cách mốc khoảng d: qua intent/rule, tool vẽ tay defer (CLAUDE.md Cụm B).
- `circleCR` — đường tròn (tâm, bán kính số): qua `draw-circle` intent, chưa có tool riêng.

**Không serialize** (`ser` = `✗`) — chưa roundtrip re-edit được:

- `reflectPoint`, `reflectLine` — `dsl/serialize.ts` trả `fail('unsupported-constraint')`; re-edit stamp chứa các kind này sẽ mất constraint (TODO khi cần re-edit).
