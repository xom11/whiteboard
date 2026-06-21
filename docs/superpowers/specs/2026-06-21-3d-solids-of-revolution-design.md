# Phase 4 — Mặt cầu ngoại tiếp + Khối nón/trụ (3D text→figure)

> Ngày: 2026-06-21
> Nhánh: feat/3d-foundation
> Trạng thái: APPROVED (brainstorm chốt scope ở phiên trước — xem memory `project_ai_3d_v2_pipeline`)
> Tiếp nối: spec nền `2026-06-21-3d-figure-pipeline-design.md`, `…-cross-section-design.md` (Phase 2), `…-metric-perpendicular-design.md` (Phase 3a). HEAD `971ce8d`.

## 1. Mục tiêu

Pipeline dựng hình 3D học **khối tròn xoay** từ đề (dataset `tron-xoay`, 89 bài):

- **Cycle A — Mặt cầu ngoại tiếp**: "mặt cầu / khối cầu / hình cầu **ngoại tiếp** hình chóp S.ABC / tứ diện ABCD / lăng trụ ABC.A′B′C′ / SCDE" → vẽ `sphere3d` trong suốt + **tâm** (điểm cách đều mọi đỉnh) đánh dấu. Cluster ~17 bài (`sphereCircum`) + generic ~14.
- **Cycle B — Khối nón / trụ standalone**: "Cho hình nón đỉnh S …" / "Cho hình trụ có thiết diện qua trục …" → vẽ `cone3d` / `cylinder3d` ở toạ độ canonical. Cluster cone ~18, cylinder ~13.

**Biểu diễn (chốt Phase 3): CHỈ HÌNH, KHÔNG nhãn số.** Layout canonical (≠ metric đề); mặt cầu trong suốt; tâm là điểm đánh dấu được. Đa số `tron-xoay` là câu MC tính giá trị ("Tính bán kính / diện tích / thể tích") → **giữ PARTIAL** (không vẽ được con số). Deliverable thật = **khối/mặt cầu ĐƯỢC VẼ + verify số học**, không phải FULL count tăng (xem §10).

**Out of scope (Phase 4b/sau):** mặt cầu **nội tiếp** (tiếp xúc các mặt — chỉ 2 bài); nón/trụ **nội/ngoại tiếp đa diện** (compound, cần hình học đa diện); **thiết diện qua trục** (tam giác/hcn qua trục); đường sinh/dây cung nhãn. Xem §11.

## 2. Quyết định kiến trúc (chốt qua brainstorm)

| Vấn đề | Chốt | Lý do |
|---|---|---|
| Tâm mặt cầu ngoại tiếp | **Constraint core MỚI** `circumsphereCenter{vertices}` (điểm phái sinh = nghiệm least-squares hệ tâm-cách-đều-N-đỉnh) | KHÁC Phase 2/3 (chỉ thêm rule). Chưa có constraint circumsphere-3D (chỉ `onSphere`/`circumcenter` 2D). Mirror `centroid{vertices}` (cùng shape ref) |
| Vẽ mặt cầu/nón/trụ | **3 op intent MỚI** `sphere`/`cone`/`cylinder` → 1:1 scene kind ĐÃ render | `sphere3d{center,surfacePoint}`, `cone3d{baseCenter,apex,radius}`, `cylinder3d{baseCenter,topCenter,radius}` đã có render (`core/scene/kinds/*`). Chỉ thiếu tầng AI (op/builder/rule). KHÔNG nhét vào `solid` (schema `baseLabels.min(3)` không khớp đáy-tròn) |
| Tâm mặt cầu = đỉnh nào? | Tâm cách đều **tất cả đỉnh** của khối (vertices parse từ token sau "ngoại tiếp"); `surfacePoint` = đỉnh đầu | Cầu ngoại tiếp qua mọi đỉnh ⟹ tâm cách đều ⟹ R = k/c tới 1 đỉnh bất kỳ. Layout canonical đáy đều/vuông/cn ⟹ đồng viên ⟹ cầu tồn tại |
| Bán kính nón/trụ standalone | Hằng canonical `R=1.4` (= base radius layout), trục dọc z | Không metric ⟹ canonical. Đồng bộ `layout3d` base R=1.4, camera box [-3,3]³ |
| Toạ độ tâm cone/cyl | Free points ở canonical coords (builder đặt thẳng, KHÔNG qua `layout3d`/`solidLayout`) | Standalone chỉ cần 2 điểm trục; layout3d dành cho đa diện. Builder đặt free coords như buildSolid |
| Guard verify-fail (đáy không đồng viên) | Rule circumsphere **skip** base `parallelogram`/`trapezoid` (non-cyclic trong canonical layout) + verify equidistant là cổng cuối | Tránh emit cầu vô-nghiệm → verify-fail → flip FULL→PARTIAL (regression). Triangle/square/rectangle/rhombus/đều → đồng viên trong template |
| Cone/trụ vs đa diện | Rule cone/cylinder **skip khi `parseSolidHead3D≠null`** (DEFER compound nội tiếp) | Co-fire với solidRule; compound cần hình học đa diện (Phase 4b) |

**Sự thật substrate đã xác minh tận file/line (KHÔNG tái-derive):**

- `Intent3DZ = z.discriminatedUnion('op',[Solid,AddPoint3D,Plane3D,Line3D,Connect3D,CrossSection])` — `intent.ts:57`. Thêm op = thêm variant + factory + re-export ở `rules/_shared.ts:1`.
- `OP_BUILDERS_3D: Record<Intent3DT['op'],IntentBuilder3D>` — `intent-builders/registry.ts:10`. **Compiler-forced**: thêm op ⟹ phải thêm entry.
- `producesOf(i)` `intentTopo3d.ts:4` — switch **exhaustive over op KHÔNG default** ⟹ thêm op ⟹ compile-error tới khi thêm case. `PRODUCE_KEYS` (`:25`) KHÔNG chứa center/surfacePoint/baseCenter/apex/topCenter/radius ⟹ `consumesOf` tự coi chúng là ref (trừ số `radius` non-string → bỏ qua) ⟹ topo xếp op SAU điểm nó tham chiếu.
- `buildAddPoint3d` REF_FIELDS có **`vertices` array resolve element-wise** (`addPoint3d.ts`) ⟹ `circumsphereCenter{vertices}` resolve label→id MIỄN PHÍ. Constraint `record(z.unknown())` không strip.
- `Constraint3D` union + `constraintRefs` never-guard — `3d-constraint.ts:4,28`. `centroid{vertices}` đã `return [...c.vertices]` (`:35`) → mirror.
- `constraintToWorld` switch — `constraint3d-math.ts:218`; `worldToConstraint` switch + never-guard `default:never` — `:313,399`. `centroid` math `:269` (trung bình đỉnh) — mẫu để viết circumsphere solve.
- `sphere3d` `Sphere3DAttrs={center,surfacePoint,color?}` render `view.create('sphere3d',[center,surfacePoint])` — `kinds/sphere3d.ts:6`. `cone3d{baseCenter,apex,radius}` `:5`, `cylinder3d{baseCenter,topCenter,radius}` `:5` — faceted 16-seg, KHÔNG cần radius trong dependsOn. Registered qua `kinds/index.ts` (import side-effect).
- `verifyFigure3d` chỉ lặp `point3d` + loop riêng `polygon3d` — `verify3d.ts:24,133`. Kind khác (sphere3d/cone3d/cylinder3d) **KHÔNG được verify** ⟹ phải thêm branch. `ptWorld`/`planeWorld3` helper `:5,8`.
- `addShape3dObj(s,kind,prefix,label,attrs,visible=true,registerInNameMap=true)` — `intent-builders/_types.ts:46`. buildSolid emit polyhedron `registerInNameMap=false` (`solid.ts:21`) → mirror cho shape vô-danh.
- `tryPartial3d` → `diag-all-3d.ts:81` tính PARTIAL khi `detIntents>0 && uncovered<geoCount`. ⟹ cone/trụ standalone (hiện NONE) → PARTIAL (đo được); sphere thêm vào hình PARTIAL hiện có (count phẳng, hình giàu hơn).
- `parseSolidHead3D(problem)` `_shared.ts:30` (apex+baseLabels từ "hình chóp S.ABCD"/"tứ diện ABCD"/"lăng trụ ABC.A′B′C′"); `splitVertexToken` `:19` ("A′B′C′"→[A′,B′,C′]); `escapeRe` `:3`. `Label3DZ=/^[A-Za-z][A-Za-z0-9'′’´_]*$/` cho phép `'`/`_`.

**Baseline @971ce8d (xác nhận lại `npx tsx scripts/diag-all-3d.ts` 2026-06-21):**

| Dataset | FULL | PARTIAL | NONE | total |
|---|---|---|---|---|
| ss-thietdien | 30 | 176 | 35 | 241 |
| vuonggoc | 122 | 189 | 57 | 368 |
| **tron-xoay** (target) | **16** | **30** | **43** | **89** |
| TOTAL | 168 | 395 | 135 | 698 |

**Hard rule 0-regression:** FULL KHÔNG được giảm và NONE KHÔNG được tăng trên BẤT KỲ dataset nào. ss-thietdien + vuonggoc = hàng must-not-regress.

## 3. Hạ tầng core — Constraint `circumsphereCenter`

Điểm phái sinh: tâm O cách đều N đỉnh `Pᵢ`. Giải hệ tuyến tính (trừ phương trình `|O−P₀|²=R²` cho `|O−Pᵢ|²=R²`):

```
2(Pᵢ−P₀)·O = |Pᵢ|² − |P₀|²   (i=1..N−1)
```

A·O = b (A: (N−1)×3, hàng i = 2(Pᵢ−P₀); b_i = |Pᵢ|²−|P₀|²). Giải bình phương tối thiểu qua **normal equations** AᵀA·O = Aᵀb (3×3 Gaussian/Cramer). Tâm tốt-định khi đỉnh non-coplanar (chóp/tứ diện) hoặc đáy đồng viên.

```ts
// 3d-constraint.ts — thêm vào union + constraintRefs
| { kind: 'circumsphereCenter'; vertices: string[] }
// constraintRefs: case 'circumsphereCenter': return [...c.vertices];

// constraint3d-math.ts — constraintToWorldInner
case 'circumsphereCenter': {
  const P = c.vertices.map((id) => getPointWorld(id, state));
  if (P.length < 4) return P.length ? P[0] : [0, 0, 0]; // <4 điểm: vô định → fail-soft
  const p0 = P[0];
  // AᵀA (3×3) + Aᵀb (3) từ các hàng 2(Pi−p0)
  const M = [[0,0,0],[0,0,0],[0,0,0]]; const rhs: Vec3 = [0,0,0];
  for (let i = 1; i < P.length; i++) {
    const r: Vec3 = [2*(P[i][0]-p0[0]), 2*(P[i][1]-p0[1]), 2*(P[i][2]-p0[2])];
    const bi = dot(P[i], P[i]) - dot(p0, p0);
    for (let a = 0; a < 3; a++) { for (let bcol = 0; bcol < 3; bcol++) M[a][bcol] += r[a]*r[bcol]; rhs[a] += r[a]*bi; }
  }
  return solve3(M, rhs); // Cramer; det≈0 → fail-soft trả centroid(P)
}
// worldToConstraint: case 'circumsphereCenter': return current; // điểm phái sinh, không kéo
```

`solve3` (helper THUẦN nội bộ `constraint3d-math.ts`): Cramer 3×3, |det|<1e−9 → fallback trung bình đỉnh (hữu hạn, không NaN).

## 4. Intent ops mới (sphere / cone / cylinder)

```ts
// intent.ts — 3 Zod variant + factory; thêm vào discriminatedUnion array
const SphereIntentZ   = z.object({ op: z.literal('sphere'),   name: Label3DZ.optional(), center: Label3DZ, surfacePoint: Label3DZ });
const ConeIntentZ     = z.object({ op: z.literal('cone'),     name: Label3DZ.optional(), baseCenter: Label3DZ, apex: Label3DZ, radius: z.number() });
const CylinderIntentZ = z.object({ op: z.literal('cylinder'), name: Label3DZ.optional(), baseCenter: Label3DZ, topCenter: Label3DZ, radius: z.number() });
export function sphereIntent(spec):   Intent3DT { return { op:'sphere', ...spec } as Intent3DT; }
export function coneIntent(spec):     Intent3DT { return { op:'cone', ...spec } as Intent3DT; }
export function cylinderIntent(spec): Intent3DT { return { op:'cylinder', ...spec } as Intent3DT; }
```

- **Builders** (`intent-builders/{sphere,cone,cylinder}.ts`): `if (intent.op!=='sphere') return;` → `addShape3dObj(s,'sphere3d','sp',intent.name??'', { center:resolveId(s,intent.center), surfacePoint:resolveId(s,intent.surfacePoint) }, true, false)`. Cone: `{ baseCenter:resolveId(...), apex:resolveId(...), radius:intent.radius }` (radius KHÔNG resolveId). Cylinder tương tự `topCenter`. `registerInNameMap=false` (shape không được ref).
- **registry**: 3 entry `sphere:buildSphere, cone:buildCone, cylinder:buildCylinder`.
- **topo `producesOf`**: `case 'sphere'|'cone'|'cylinder': return i.name ? [i.name] : [];`.

## 5. Rules (3 rule mới — band ưu tiên 48–50)

### 5.1 circumsphere (priority 50) — mặt cầu ngoại tiếp khối

Cue/prefilter: `/ngoại\s*tiếp/iu` (+ patterns `/mặt\s*cầu/iu`, `/khối\s*cầu/iu`, `/hình\s*cầu/iu`). Per-clause (`ctx.clauses`): clause phải có "ngoại tiếp" + cue cầu.

Parse vertex list từ token NGAY SAU "ngoại tiếp":

| Biến thể | Phrasing đại diện | Vertices | Emit |
|---|---|---|---|
| Chóp dotted | "ngoại tiếp **hình chóp S.ABC**" | parseSolidHead/dotted → [S,A,B,C] | center+sphere |
| Tứ diện | "ngoại tiếp **tứ diện ABCD**" | [A,B,C,D] | center+sphere |
| Lăng trụ | "ngoại tiếp **lăng trụ ABC.A′B′C′**" | [A,B,C,A′,B′,C′] | center+sphere |
| Bare token | "ngoại tiếp **SCDE**" / "**SABCD**" | splitVertexToken | center+sphere |
| Generic | "ngoại tiếp **hình chóp**" (không token) | parseSolidHead3D(problem) | center+sphere |

Emit: `addPoint3d(centerName, { kind:'circumsphereCenter', vertices })` + `sphereIntent({ center:centerName, surfacePoint:vertices[0] })`.

- `centerName` = phần tử đầu trong `['O','I','J','K','T']` KHÔNG ∈ vertices (synth, KHÔNG `_`/digit → tránh subscript-literal gotcha). Đề thường "Xác định tâm" không đặt tên.
- **Guard verify-fail**: nếu vertices = 4 đỉnh + base quad non-cyclic (`baseVariantFrom`→parallelogram/trapezoid) → skip. Triangle/square/rectangle/rhombus/đều → đồng viên trong layout → ok.
- **Guard length**: `vertices.length >= 4` (cầu cần ≥4 điểm non-coplanar; "ngoại tiếp tam giác" = đường tròn, bỏ).
- Mọi tên nội suy `new RegExp` → `escapeRe`.

### 5.2 cone (priority 49) — khối nón standalone

Cue/prefilter: `/hình\s*nón|khối\s*nón/iu`. **Guard: skip nếu `parseSolidHead3D(problem)!==null`** (compound nội tiếp đa diện → DEFER). Per-problem (1 nón/đề).

| Biến thể | Phrasing | Emit |
|---|---|---|
| Có đỉnh | "hình nón **đỉnh S**" / "đường cao **SO**" | apex='S', baseCenter='O' |
| Trần | "Cho **hình nón** có chiều cao …" | apex synth 'S', baseCenter synth 'O' |

Emit: `addPoint3d(baseName,{kind:'free',x:0,y:0,z:-1.2})` + `addPoint3d(apexName,{kind:'free',x:0,y:0,z:1.2})` + `coneIntent({baseCenter:baseName, apex:apexName, radius:1.4})`. Tên non-digit (O/S/I). Đỉnh từ "đỉnh ([A-Z])" hoặc "đường cao ([A-Z])([A-Z])" nếu có; else synth.

### 5.3 cylinder (priority 48) — khối trụ standalone

Cue/prefilter: `/hình\s*trụ|khối\s*trụ/iu`. **Guard: skip nếu `parseSolidHead3D≠null`** (trừ chính "lăng trụ"? — `parseSolidHead3D` chỉ khớp "lăng trụ X.Y" dotted; "hình trụ" thường không kèm đa diện. Skip khi có chóp/tứ diện/lăng-trụ-dotted). Per-problem.

Emit: `addPoint3d('O',{kind:'free',x:0,y:0,z:-1.2})` + `addPoint3d('I',{kind:'free',x:0,y:0,z:1.2})` + `cylinderIntent({baseCenter:'O', topCenter:'I', radius:1.4})`.

### 5.4 Vocabulary

`GEOMETRY_KEYWORDS_3D` thêm (defensive, đa số clause đã có keyword): `'khối cầu'`, `'khối nón'`, `'khối trụ'`, `'đường sinh'`, `'trục'`. (`'mặt cầu'/'hình cầu'/'hình nón'/'hình trụ'/'ngoại tiếp'/'nội tiếp'` ĐÃ có.)

## 6. Verify (`verify3d.ts`)

- **point loop** `if (c.kind === 'circumsphereCenter')`: resolve `Pᵢ = ptWorld(vertices[i])`; `r₀ = |w − P₀|`; với mọi i: `| |w−Pᵢ| − r₀ | ≤ tol·max(1,r₀)` (tol tương đối 1e−6·scale). Fail → `'tâm mặt cầu không cách đều đỉnh'`. (Bắt đáy non-cyclic lọt guard.)
- **loop mới** `obj.kind === 'sphere3d'`: `R = |surface − center|`; `R` hữu hạn ∧ `R > 1e−9` → else `'mặt cầu bán kính ≤ 0'`. Resolve qua `ptWorld(attrs.center/surfacePoint)` (ref hỏng → throw → issue).
- **loop mới** `obj.kind === 'cone3d'`: `attrs.radius>0` ∧ `|apex−baseCenter|>1e−9` → else `'khối nón suy biến'`.
- **loop mới** `obj.kind === 'cylinder3d'`: `attrs.radius>0` ∧ `|topCenter−baseCenter|>1e−9` → else `'khối trụ suy biến'`.

Tất cả wrap try/catch fail-soft (đồng bộ perpFoot block). cone3d/cylinder3d render sinh point/polygon con TRONG JSXGraph (không phải scene object) ⟹ verify chỉ thấy 1 object cone3d/cylinder3d.

## 7. Insertion points

1. `src/core/scene/kinds/3d-constraint.ts` — union + constraintRefs (circumsphereCenter).
2. `src/core/scene/kinds/constraint3d-math.ts` — constraintToWorldInner + worldToConstraint + `solve3` helper.
3. `src/stamps/geometry-3d/ai/intent.ts` — 3 Zod variant + union + 3 factory.
4. `src/stamps/geometry-3d/ai/rules/_shared.ts` — re-export sphereIntent/coneIntent/cylinderIntent.
5. `src/stamps/geometry-3d/ai/intent-builders/{sphere,cone,cylinder}.ts` — 3 builder (MỚI) + `registry.ts` (3 entry).
6. `src/stamps/geometry-3d/ai/intentTopo3d.ts` — 3 case producesOf.
7. `src/stamps/geometry-3d/ai/rules/{circumsphere,cone,cylinder}.ts` — 3 rule (MỚI) + `rules/registry.ts` (3 entry, priority 50/49/48).
8. `src/stamps/geometry-3d/ai/deterministic/vocabulary3d.ts` — 5 keyword.
9. `src/stamps/geometry-3d/ai/verify3d.ts` — 1 point-check + 3 shape-loop.
10. Tests: `kinds/__tests__/constraint3d-math.test.ts` (circumsphere solve), `ai/rules/__tests__/{circumsphere,cone,cylinder}.test.ts`, `ai/__tests__/verify3d.solids.test.ts`, `ai/__tests__/intentToScene3d.solids.test.ts`, `tests/e2e/geometry-3d-figure.spec.ts` (thêm assert).

**KHÔNG đụng:** `core/scene/kinds/{sphere3d,cone3d,cylinder3d}.ts` (render đã đúng — chỉ DÙNG), `editor/tools/handlers/*` (không thêm tool editor — AI-only), engine 2D, `solid.ts`/`solidLayout` (nón/trụ KHÔNG qua solid op).

## 8. Testing (y đúc Phase 2/3)

- **Unit per-rule** (`rules/__tests__`): RED→GREEN, assert `match()` trả `{clauseIds, intents}` đúng cho ≥3 phrasing/rule; e2e qua `runDeterministicIntents3d` coverage (lưu ý đa số tron-xoay PARTIAL → test e2e dùng đề self-contained không có clause metric thừa).
- **Constraint math** (`constraint3d-math.test.ts`): circumsphereCenter của tứ diện đều/chóp vuông → tâm cách đều mọi đỉnh (assert |O−Pᵢ| bằng nhau 1e−9); det suy biến → fail-soft.
- **intentToScene3d.solids** (numeric e2e): build `[solid, addPoint3d(circumsphereCenter), sphere]` → state có sphere3d, center cách đều đỉnh; `[cone]`/`[cylinder]` → cone3d/cylinder3d hợp lệ; `Intent3DZ.parse` không strip.
- **verify3d.solids**: positive (figure hợp lệ ok=true) + negative (tâm bịa lệch, radius 0 → ok=false).
- **co-firing** (`metricCofire`-style, runRules3D level, count `.toBe(N)`): "ngoại tiếp" + solidRule không double; cone/cylinder skip khi có solid head.
- **Playwright** `tests/e2e/geometry-3d-figure.spec.ts`: mount view3d, nhập đề mặt cầu / nón / trụ, click AI-generate, assert JXG có sphere3d/cone3d/cylinder3d object + KHÔNG console error `/sphere3d|cone3d|Cannot read/`. **Live visual MCP** spot-check (bài học Phase 2/3a: headless + per-task review BỎ SÓT bug nhãn render).
- **diag-all-3d** before/after — §10. **Full jest** `npx jest -c jest.worktree.config.js` 0-regression.

## 9. Co-firing & gotcha (đã biết — KHÔNG phát hiện lại)

1. **RULE CO-FIRING**: `runRules3D` chạy MỌI rule prefilter-khớp + nối intents (KHÔNG first-match-wins), dedup JSON.stringify. circumsphere chia cue "ngoại tiếp" với khả-năng tương lai; cone/cylinder chia "thiết diện qua trục" với crossSection? — crossSection cue là "thiết diện/cắt bởi" + cần token (XYZ) 3-điểm → "thiết diện qua trục" KHÔNG có token (XYZ) ⟹ crossSection no-op (an toàn). Vẫn test co-fire count.
2. **Nhãn synth subscript-literal**: điểm có `_`/digit-đuôi → JSXGraph `text.display='internal'` render `<sub>` LITERAL trong SVG. ⟹ centerName/apex/baseCenter synth PHẢI single-letter non-digit non-`_` (O/I/J/K/S/T). KHÔNG dùng O′/O1/O_c cho điểm HIỂN THỊ.
3. **Regex Việt**: cờ `u` + `(?![\p{L}])` thay `\b`. Cue/prefilter `/iu` (HOA đầu câu "Cho hình…"); regex CAPTURE `[A-Z]` GIỮ strict `/u` (blanket `/i` → `[A-Z]` khớp thường = nhãn sai).
4. **escapeRe** mọi `new RegExp(`…${name}…`)` — crash-class "(O"→"Unterminated group".
5. **Intent3DZ.parse** strip key lạ; `radius` là field khai báo (z.number) trong ConeIntentZ/CylinderIntentZ ⟹ KHÔNG strip; nhưng nếu nhét vào `constraint`/`spec` record thì cần giữ trong record. Sphere/cone/cylinder là op riêng nên field tường minh → an toàn.
6. **plane3d nhận `[point,dir1,dir2]` toạ-thô** — KHÔNG liên quan sphere/cone/cylinder (không tạo plane), nhưng nếu sau thêm thiết-diện-qua-trục thì nhớ.
7. **verify chỉ lặp point3d + polygon3d** — phải thêm loop cho sphere3d/cone3d/cylinder3d, else vacuous-pass.
8. **Camera cố định** bbox3D `[-3,-3,-3,3,3,3]` az 1.0 el 0.6 — cone/cyl trục z ±1.2, R 1.4 nằm gọn trong box; el 0.6 thấy đáy.
9. **worktree jest**: `npx jest -c jest.worktree.config.js <path>` (base config ignore `/.claude/worktrees/`). Playwright: vite từ worktree cổng riêng (stale-server gotcha).

## 10. Khung metric trung thực

`diag-all-3d` FULL = all-or-nothing/bài + đa số `tron-xoay` là **câu hỏi MC giá trị** ("Tính bán kính/diện tích/thể tích", "… bằng:") — clause này KHÔNG vẽ được ⟹ ĐÚNG khi giữ PARTIAL. **Đừng kỳ vọng FULL nhảy mạnh.** Dự đoán:

- **Cone/cylinder standalone**: nhiều bài hiện NONE (không rule nào fire) → **PARTIAL** (đo được, NONE giảm). Đây là metric gain rõ nhất.
- **Sphere circumscribe**: bài có solid head dotted đã PARTIAL (solidRule vẽ khối) → vẫn PARTIAL nhưng **mặt cầu ĐƯỢC THÊM vào hình** (count phẳng, hình giàu hơn). Vài bài mà "ngoại tiếp" là clause-thiếu DUY NHẤT → PARTIAL→FULL.

Deliverable = construct DRAWN + verify số học (circumsphere equidistant 1e−9, sphere/cone/cyl sanity) + Playwright + MCP visual + dbg-bai spot-check. **Đo coverage che mất quality-gain** (lặp bài học Phase 2/3a). Gate cứng = **0-regression** (FULL không giảm, NONE không tăng mọi dataset) + full jest xanh.

## 11. Ngoài phạm vi (defer → Phase 4b)

- **Mặt cầu nội tiếp** (tiếp xúc mọi mặt — tâm = điểm cách đều mặt, R = k/c tới mặt): cần constraint `insphereCenter` (giải bất đẳng/khoảng-cách-mặt) — chỉ 2 bài (`sphereInscribed`).
- **Nón/trụ nội/ngoại tiếp đa diện** (Câu 70/73/74/75/85): cone đỉnh S + đáy nội tiếp ABCD; trụ đáy nội/ngoại tiếp tam giác — cần hình học đa diện (bán kính từ cạnh đáy), co-fire với solidRule.
- **Thiết diện qua trục** (tam giác qua đỉnh+2 đầu đường kính cho nón; hcn cho trụ): cần đặt 2 điểm trên đường tròn đáy + polygon3d. Bonus value nhưng tăng độ phức tạp.
- **Đường sinh / dây cung / cung** đáy đặt tên; **đồng hồ cát** (Câu 89, trụ + 2 nửa cầu — exotic).
- **Editor tool** dựng circumsphere bằng tay (AI-only phase này; handlers sphere/cone/cylinder đã có tool thủ-công riêng).
- **Phase 5 (gợi ý):** mặt cầu nội tiếp + nón/trụ nội tiếp đa diện + thiết diện qua trục.
