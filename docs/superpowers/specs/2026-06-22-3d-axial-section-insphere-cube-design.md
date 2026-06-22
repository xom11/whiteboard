# Phase 5 — Thiết diện qua trục + Mặt cầu nội tiếp lập phương (3D text→figure)

> Ngày: 2026-06-22
> Nhánh: feat/3d-foundation
> Trạng thái: APPROVED (brainstorm chốt scope Mức 2 — Cycle A + insphere lập phương; Cycle B nón/trụ nội-tiếp-đa-diện DEFER Phase 5b)
> Tiếp nối: Phase 4 `2026-06-21-3d-solids-of-revolution-design.md` (sphere/cone/cylinder op + circumsphereCenter). HEAD `3d23bb7`.

## 1. Mục tiêu

Mở rộng pipeline 3D `tron-xoay` (89 bài) hai cụm còn hở:

- **Cycle A — Thiết diện qua trục**: nón → tam giác qua trục/đỉnh (Câu 68/69/83…); trụ → hình chữ nhật/vuông qua trục (Câu 71/72/76…). Vẽ thêm `polygon3d` mặt cắt dọc trục lên khối nón/trụ standalone (đã dựng từ Phase 4).
- **Cycle C — Mặt cầu nội tiếp lập phương**: "mặt/khối/hình cầu **nội tiếp** (hình) lập phương" (Câu 6/10/33) → vẽ box + `sphere3d` nội tiếp (tâm = tâm khối, surfacePoint = tâm-mặt → bán kính = nửa cạnh).

**Biểu diễn (chốt Phase 3/4): CHỈ HÌNH, KHÔNG nhãn số.** Layout canonical (≠ metric đề). Đa số `tron-xoay` là câu MC tính giá trị → **giữ PARTIAL đúng**. Deliverable = construct VẼ ĐƯỢC + verify số học, KHÔNG phải FULL count tăng (§10).

**Out of scope (Phase 5b/6):** Cycle B nón/trụ **nội/ngoại tiếp đa diện** (Câu 70/73/74/75/85 — vướng radius phái sinh từ hình học mặt đáy, cone3d/cylinder3d.radius là số literal); mặt cầu **nội tiếp chóp** (Câu 21/35/53 — incenter thật, không phải centroid); nón cụt thiết diện (Câu 84); đồng hồ cát (Câu 89). Xem §11.

## 2. Quyết định kiến trúc (chốt qua brainstorm)

| Vấn đề | Chốt | Lý do |
|---|---|---|
| Vẽ thiết diện qua trục | **1 op intent MỚI `polygon`** `{name?, vertices: string[]}` → `polygon3d` (kind ĐÃ render Phase 2) | cone3d/cylinder3d KHÔNG phải polyhedron ⟹ `crossSection` (edge-walk polyhedron) không áp được. crossSection builder dựng polygon3d từ điểm phái sinh; cần op tạo polygon3d từ NHÃN tường minh |
| Điểm mặt cắt | **Free points ở toạ độ canonical** trên vành đáy/đỉnh (±R trên trục x) | Layout cone/cylinder canonical (z=±1.2, R=1.4). Mặt cắt qua trục = 2 điểm đường kính đáy + đỉnh (nón) / 4 điểm 2 đường kính 2 đáy (trụ). Trùng silhouette khối |
| Rule mặt cắt | **MỞ RỘNG rule cone/cylinder** (KHÔNG rule mới) | Single rule sở hữu cone+section ⟹ tên nhất quán (biết apex name) + claim CẢ clause nón LẪN clause thiết diện → PARTIAL→FULL. Section chỉ emit khi cue "thiết diện qua trục" hiện diện (Phase 4 behavior giữ nguyên) |
| Verify mặt cắt | **Reuse loop `polygon3d` phẳng có sẵn** (verify3d.ts) — 0 verify mới | Điểm free đồng phẳng (y=0) → frame từ 3 đỉnh đầu (`ilpVertex` không có) → tam giác 3 đỉnh / hcn 4 đỉnh y=0 đều phẳng. Xác minh tận file (verify3d.ts:196) |
| Tâm/bán kính insphere cube | **Reuse `centroid` + `sphere`** (0 constraint mới) | Cube: tâm = centroid 8 đỉnh; surfacePoint = centroid 4 đỉnh mặt đáy (= tâm-mặt, cách tâm đúng nửa-cạnh = bán kính insphere). Đúng vì cube đối xứng |
| Box cho insphere cube vô nhãn | Rule insphere **tự emit `solid({flavor:'box',…})`** khi cube vô nhãn (Câu 6/10) | solidRule BOX regex `([A-Z]{4})\.((?:[A-Z]['′])+)` YÊU CẦU nhãn tường minh; "lập phương cạnh a" không nhãn ⟹ solidRule KHÔNG fire ⟹ không có đỉnh để centroid tham chiếu |
| Cube CÓ nhãn (ABCD.A′B′C′D′) | Rule insphere **reference 8 nhãn**, KHÔNG emit box | solidRule tự dựng box ⟹ tránh co-fire DUP box |

**Substrate đã xác minh tận file/line (KHÔNG tái-derive):**

- `Intent3DZ = z.discriminatedUnion('op',[Solid,AddPoint3D,Plane3D,Line3D,Connect3D,CrossSection,Sphere,Cone,Cylinder])` — `intent.ts:77`. Factory sau `cylinderIntent` `:122`. `Label3DZ=/^[A-Za-z][A-Za-z0-9'′’´_]*$/`.
- `polygon3d` scene kind ĐÃ render + registered (Phase 2 e2e assert "5 polygon3d"). `crossSection` builder emit polygon3d `{vertices: string[]}` (id điểm). Attrs polygon3d = `{vertices: string[], color?}`.
- `OP_BUILDERS_3D: Record<Intent3DT['op'],IntentBuilder3D>` — `intent-builders/registry.ts`. **Compiler-forced**: thêm op ⟹ thêm entry. `producesOf` exhaustive switch — `intentTopo3d.ts` ⟹ thêm op ⟹ compile-error tới khi thêm case. `PRODUCE_KEYS` KHÔNG chứa `vertices` ⟹ `consumesOf` coi `vertices` array là ref ⟹ topo xếp polygon SAU điểm.
- `addShape3dObj(s,kind,prefix,label,attrs,visible=true,registerInNameMap=true)` `_types.ts:46`; `resolveId(s,name)` `:18`. buildSolid emit `registerInNameMap=false` `solid.ts:21`. **buildAddPoint3d REF_FIELDS có `vertices` array resolve element-wise** ⟹ `centroid{vertices}` resolve label→id miễn phí (Phase 4 dùng cho circumsphereCenter).
- `verifyFigure3d` polygon3d loop `verify3d.ts:196` — `vertices.length≥3` + đồng phẳng (frame từ ilpVertex-plane HOẶC 3 đỉnh đầu). Free coplanar → 3-đỉnh-đầu, OK.
- `cone.ts`/`cylinder.ts` (Phase 4): canonical `addPoint3d(base,{free z:-1.2})` + `addPoint3d(apex,{free z:1.2})` + `coneIntent({radius:1.4})`. Guard `if (parseSolidHead3D(problem) || /(?:nội|ngoại)\s*tiếp/iu.test(problem)) return []`. cone scope APEX (`/(?:đỉnh\s+([A-Z])|đường\s+cao\s+([A-Z])([A-Z]))/u`) tới CLAUSE nón.
- `solidRule` BOX branch (`solid.ts:129`): `solid({flavor:'box', baseLabels:[4], baseVariant:'rectangle', apexVariant:'free', topLabels:[4]})`. PYRAMID/TETRA/PRISM/BOX đều cần nhãn tường minh; vô nhãn ⟹ `return []`.
- `crossSectionRule` (`rules/crossSection.ts`): cue `/thiết\s+diện|cắt\s+bởi/iu` NHƯNG cần token `\(([A-Z])([A-Z])([A-Z])\)` (3 chữ trong NGOẶC). "thiết diện qua trục" KHÔNG có token paren ⟹ no-op. Co-fire an toàn (vẫn test).
- `centroid` constraint `{kind:'centroid', vertices: string[]}` — `3d-constraint.ts`, math trung bình đỉnh `constraint3d-math.ts:269`, worldToConstraint fall-through derived. ĐÃ verify Phase 1.

**Baseline @3d23bb7 (xác nhận lại `npx tsx scripts/diag-all-3d.ts` 2026-06-22):**

| Dataset | FULL | PARTIAL | NONE | total |
|---|---|---|---|---|
| ss-thietdien | 30 | 176 | 35 | 241 |
| vuonggoc | 122 | 189 | 57 | 368 |
| **tron-xoay** (target) | **30** | **25** | **34** | **89** |
| TOTAL | 182 | 390 | 126 | 698 |

**Hard rule 0-regression:** FULL KHÔNG giảm và NONE KHÔNG tăng trên BẤT KỲ dataset nào. ss-thietdien + vuonggoc = hàng must-not-regress.

## 3. Cycle A — Op `polygon`

```ts
// intent.ts — Zod variant (sau CylinderIntentZ) + thêm vào union array
const PolygonIntentZ = z.object({
  op: z.literal('polygon'),
  name: Label3DZ.optional(),
  vertices: z.array(Label3DZ).min(3),
});
// factory (sau cylinderIntent)
export function polygonIntent(spec: { name?: string; vertices: string[] }): Intent3DT {
  return { op: 'polygon', ...spec } as Intent3DT;
}
```

- **Builder** `intent-builders/polygon.ts` (MỚI): `if (intent.op!=='polygon') return;` → `addShape3dObj(s,'polygon3d','sec', intent.name ?? '', { vertices: intent.vertices.map((v)=>resolveId(s,v)) }, true, false)`. `registerInNameMap=false` (mặt cắt không được ref).
- **registry**: entry `polygon: buildPolygon`.
- **topo `producesOf`**: `case 'polygon': return i.name ? [i.name] : [];`.
- **Re-export** `rules/_shared.ts`: `+ polygonIntent`.

## 4. Cycle A — Mở rộng rule cone/cylinder (thiết diện qua trục)

Cue thiết diện (kiểm trên `ctx.problem` — standalone 1 nón/trụ/đề):

```ts
const AXIAL = /(?:thiết\s*diện\s*qua\s*trục|(?:mặt\s*phẳng|thiết\s*diện)[^.]*qua\s*(?:trục|đỉnh))/iu;
```

### 4.1 cone.ts — thêm sau khi tính `apexName`/`baseName`, trước `return`:

```ts
const intents: Intent3DT[] = [
  addPoint3d(baseName, { kind: 'free', x: 0, y: 0, z: -1.2 }),
  addPoint3d(apexName, { kind: 'free', x: 0, y: 0, z: 1.2 }),
  coneIntent({ baseCenter: baseName, apex: apexName, radius: 1.4 }),
];
const clauseIds = [c.id];
if (AXIAL.test(ctx.problem)) {
  // 2 điểm đường kính đáy (trên vành, R=1.4) + tam giác qua trục [A, đỉnh, B].
  const [pA, pB] = sectionNames(['A', 'B'], [apexName, baseName]);
  intents.push(
    addPoint3d(pA, { kind: 'free', x: -1.4, y: 0, z: -1.2 }),
    addPoint3d(pB, { kind: 'free', x: 1.4, y: 0, z: -1.2 }),
    polygonIntent({ vertices: [pA, apexName, pB] }),
  );
  const sc = ctx.clauses.find((cl) => AXIAL.test(cl.text));
  if (sc && sc.id !== c.id) clauseIds.push(sc.id);
}
return [{ ruleId: this.id, clauseIds, intents }];
```

### 4.2 cylinder.ts — tương tự sau O/I/cylinder:

```ts
if (AXIAL.test(ctx.problem)) {
  // 4 đầu mút 2 đường kính 2 đáy → hcn qua trục [A,B,C,D].
  const [a, b, cc, d] = sectionNames(['A', 'B', 'C', 'D'], ['O', 'I']);
  intents.push(
    addPoint3d(a, { kind: 'free', x: -1.4, y: 0, z: -1.2 }),
    addPoint3d(b, { kind: 'free', x: 1.4, y: 0, z: -1.2 }),
    addPoint3d(cc, { kind: 'free', x: 1.4, y: 0, z: 1.2 }),
    addPoint3d(d, { kind: 'free', x: -1.4, y: 0, z: 1.2 }),
    polygonIntent({ vertices: [a, b, cc, d] }),
  );
  // claim clause thiết diện…
}
```

- `sectionNames(prefer, taken)` — helper THUẦN trong `_shared.ts`: trả N tên đầu trong `['A','B','C','D','E','F','G','H']` (single-letter non-digit non-`_`) KHÔNG ∈ `taken` (tránh trùng apex/base). Đề thường KHÔNG đặt tên mặt cắt; nếu đề có "(hình vuông|tam giác) <tên>" thì DÙNG tên đó (nice-to-have, optional — mặc định synth A/B/…).
- **Toạ độ canonical** trùng cone/cylinder (R=1.4, z=±1.2) ⟹ điểm mặt cắt nằm trên vành đáy/đỉnh khối ⟹ polygon trùng mặt cắt thật.
- **KHÔNG honor "vuông/cân/đều"** (no-metric, canonical). Tam giác/hcn là biểu diễn schematic.

## 5. Cycle C — Rule `insphereCube`

```ts
// rules/insphereCube.ts (MỚI), priority 47
const SPHERE_CUE = /(?:mặt|khối|hình)\s*cầu/iu;
const INSCRIBED = /nội\s*tiếp/iu;
const CUBE = /(?:hình\s*)?(?:lập\s*phương|hộp)/iu;
const BOX_LABELLED = /(?:lập\s*phương|hộp)\s+([A-Z]{4})\.((?:[A-Z]['′])+)/u;
```

Per-problem (1 cube/đề). Điều kiện: `SPHERE_CUE` ∧ `INSCRIBED` ∧ `CUBE` trên `ctx.problem`. Tìm clause chứa cả 3 (claim clause đó).

- **Cube CÓ nhãn** (`BOX_LABELLED` khớp): `verts = [...splitVertexToken(base), ...splitVertexToken(top)]` (8 đỉnh); KHÔNG emit solid (solidRule tự dựng). `baseVerts = base 4 đỉnh`.
- **Cube vô nhãn**: synth `base=['A','B','C','D']`, `top=['E','F','G','H']`; emit `solid({flavor:'box', baseLabels:base, baseVariant:'rectangle', apexVariant:'free', topLabels:top})`. `verts=[...base,...top]`, `baseVerts=base`.
- `center = pickCenter(verts)` (Phase 4 helper — `['O','I','J','K','T']∉verts`); `surf = pickCenter([...verts, center])` (tên thứ 2, vd 'I'/'T').
- Emit: `addPoint3d(center,{kind:'centroid',vertices:verts})` + `addPoint3d(surf,{kind:'centroid',vertices:baseVerts})` + `sphereIntent({center, surfacePoint:surf})`.
- **Guard length**: `verts.length === 8` (cube cần 8 đỉnh).

**Rủi ro biết trước (verify MCP):** layout `box` có thể KHÔNG vuông-cạnh-đều → sphere(R=center→tâm-mặt-đáy) tiếp xúc lệch nhẹ mặt bên. Nếu MCP thấy xấu → **fallback**: insphere rule emit 8 free point cube ±1 (toạ độ riêng, không qua layout) thay vì solid box. Quyết định ở Task C1 sau khi nhìn hình.

## 6. Vocabulary

`GEOMETRY_KEYWORDS_3D` defensive (đa số đã có): `'lập phương'`, `'thiết diện'`, `'qua trục'` (nếu thiếu). Kiểm `vocabulary3d.ts` trước; chỉ thêm keyword thiếu để clause `hasGeometry=true`.

## 7. Verify (`verify3d.ts`)

- **polygon3d (mặt cắt)**: reuse loop có sẵn (`:196`) — ≥3 đỉnh + đồng phẳng. **0 code mới.** Tam giác 3 đỉnh / hcn 4 đỉnh y=0 → frame 3-đỉnh-đầu phẳng.
- **insphere sphere3d**: reuse loop sphere3d có sẵn (`R=|surf−center|` hữu hạn >0). centroid points = derived hợp lệ. **0 code mới.**
- Không construct nào cần verify branch mới ⟹ rủi ro vacuous-pass thấp; gate thật = numeric e2e + diag + MCP.

## 8. Insertion points

1. `ai/intent.ts` — `PolygonIntentZ` + union + `polygonIntent` factory.
2. `ai/rules/_shared.ts` — re-export `polygonIntent` + `sectionNames` helper (hoặc đặt helper trong _shared).
3. `ai/intent-builders/polygon.ts` (MỚI) + `registry.ts` (entry).
4. `ai/intentTopo3d.ts` — case `'polygon'`.
5. `ai/rules/cone.ts` + `cylinder.ts` — AXIAL cue + section emit + claim clause.
6. `ai/rules/insphereCube.ts` (MỚI) + `rules/registry.ts` (import + RULES entry prio 47).
7. `ai/deterministic/vocabulary3d.ts` — keyword thiếu (nếu có).
8. Tests: `__tests__/intentToScene3d.polygon.test.ts`, `rules/__tests__/{coneSection,cylinderSection,insphereCube,axialCofire}.test.ts`, e2e `tests/e2e/geometry-3d-figure.spec.ts` (+3 assert).

**KHÔNG đụng:** `core/scene/kinds/*` (render đã đúng), `verify3d` loop polygon3d/sphere3d (chỉ reuse), engine 2D, `solid.ts` (insphere tự emit solid intent, KHÔNG sửa solidRule), Phase 4 sphere/circumsphere.

## 9. Co-firing & gotcha

1. **crossSection co-fire**: cue chung "thiết diện" nhưng crossSection cần token `(XYZ)` paren → "thiết diện qua trục" no-op. **Test co-fire bắt buộc** (count `.toBe(0)` crossSection cho đề thiết-diện-qua-trục).
2. **cone/cylinder mở rộng KHÔNG đổi Phase 4 behavior**: section chỉ emit khi `AXIAL.test`; test Phase 4 (standalone không section) phải vẫn xanh.
3. **insphereCube vs cone/cylinder**: insphere có "nội tiếp" → cone/cylinder rule SKIP (guard INSCRIBED) → không co-fire. insphere vs solidRule: chỉ emit box khi VÔ nhãn (solidRule không fire vô nhãn) → không dup.
4. **Nhãn synth**: single-letter non-digit non-`_` (A–H/O/I/T) — né subscript-literal `<sub>` ở internal SVG.
5. **Regex Việt**: cue/prefilter `/iu`; capture `[A-Z]` strict `/u`; `(?![\p{L}])` thay `\b`; escapeRe mọi `new RegExp(`…${name}…`)`.
6. **op `polygon` = TS-error kép** (OP_BUILDERS_3D Record + producesOf exhaustive) tới khi wire ĐỦ — thêm 1 op/commit.
7. **Intent3DZ.parse** strip key lạ; `vertices` là field khai báo (z.array) → KHÔNG strip.

## 10. Khung metric trung thực

`diag-all-3d` FULL = all-or-nothing/bài; `tron-xoay` MC-heavy. Dự đoán:
- **Cycle A**: 68/69/72/76/83 đã PARTIAL (cone/cylinder fire) → hình GIÀU hơn (thêm polygon mặt cắt); vài bài mà "thiết diện qua trục" là clause-thiếu DUY NHẤT → PARTIAL→FULL. 67 vẫn NONE (PROOF_ONLY "Tính…" drop — honest).
- **Cycle C**: 6/10/33 hiện NONE (no-match) → vẽ box+sphere → NONE→PARTIAL (hoặc FULL nếu clause "Thể tích … nội tiếp lập phương" được claim đủ).

Deliverable = construct DRAWN + verify số học (polygon phẳng, sphere R>0) + Playwright + **MCP visual mỗi construct** + dbg-bai spot-check. Gate cứng = **0-regression** (FULL không giảm, NONE không tăng mọi dataset) + full jest + tsc xanh.

## 11. Ngoài phạm vi (defer → Phase 5b/6)

- **Cycle B nón/trụ nội/ngoại tiếp đa diện** (Câu 70/73/74/75/85/88c): cone3d/cylinder3d.radius là số literal, bán kính nội/ngoại tiếp phái sinh từ hình học mặt đáy (inradius/circumradius) — không tính được ở rule-time. Cần đổi render nhận radius phái sinh HOẶC constraint incenter/circumcenter mặt 3D + gỡ guard Phase 4. Phase 5b.
- **Mặt cầu nội tiếp chóp** (Câu 21/35/53): incenter chóp (cách đều mọi MẶT) ≠ centroid → cần insphere solver thật.
- **Nón cụt thiết diện** (Câu 84): mặt phẳng cắt phần nón giữa 2 mặt → tứ giác, cần nón cụt.
- **Đồng hồ cát** (Câu 89, trụ + 2 nửa cầu — exotic).
- **Tên mặt cắt từ đề** (Câu 76 "hình vuông ABCD" + M trên cung): bonus, default synth.
