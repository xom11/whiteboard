# Phase 5b — Nón/trụ nội-ngoại tiếp mặt đa diện + Mặt cầu nội tiếp chóp (3D text→figure)

> Ngày: 2026-06-23
> Nhánh: feat/3d-foundation
> Trạng thái: APPROVED (brainstorm chốt: Crux = C-refined "literal tính ở builder"; Scope = Mức 2)
> Tiếp nối: Phase 5 `2026-06-22-3d-axial-section-insphere-cube-design.md` (op polygon + AXIAL + insphereCube). HEAD `39cd594`.

## 1. Mục tiêu

Mở rộng pipeline 3D `tron-xoay` (89 bài) hai cụm còn hở mà Phase 5 đã defer (§11 spec Phase 5):

- **Cycle B1 — Mặt cầu nội tiếp chóp** (Câu 21/35/53): "mặt/khối cầu **nội tiếp** hình chóp tứ giác đều" → tâm = incenter chóp (cách đều đáy + MỌI mặt bên, **KHÔNG** phải centroid, **KHÔNG** phải insphereCube cube-centroid) → `sphere3d` nội tiếp.
- **Cycle B4 — Nón/trụ nội/ngoại tiếp mặt đa diện** (Câu 70/73/75/85/88c): đáy nón/trụ = đường tròn **nội tiếp** (incircle) hoặc **ngoại tiếp** (circumcircle) một mặt của đa diện. Bán kính = inradius/circumradius **phái sinh** từ mặt đã dựng.

Hai cycle hạ tầng (B2 `faceCircumcenter`, B3 cơ chế `radiusTo`) là enabler cho B4.

**Biểu diễn (chốt Phase 3/4/5): CHỈ HÌNH, KHÔNG nhãn số.** Layout canonical (≠ metric đề). Đa số `tron-xoay` là câu MC tính giá trị → **giữ PARTIAL đúng**. Deliverable = construct VẼ ĐƯỢC + verify số học + **MCP visual mỗi construct**, KHÔNG phải FULL count tăng (§10).

**Out of scope (Phase 6):** `faceIncenter` (incircle tam giác **không đều** — toàn dataset incircle là mặt đều ⟹ centroid chính xác); Câu 88c (intro multi-part truncate ở part a — cần sửa intro-extraction); Câu 74 (lăng trụ lục giác đều nội tiếp trụ — **đảo chiều** polyhedron-in-solid, 1 bài); nón cụt (84); đồng hồ cát (89). Xem §11.

## 2. Quyết định kiến trúc (chốt qua brainstorm)

| Vấn đề | Chốt | Lý do |
|---|---|---|
| **Crux: radius phái sinh** | **C-refined: literal tính ở BUILDER** | `crossSection.ts:12` đã resolve điểm bất kỳ ra world coords *trong builder* (build-time resolution là cơ chế hạng nhất). cone/cylinder builder resolve `baseCenter`+`radiusTo` → tính radius literal. cone3d/cylinder3d **kind/render/verify KHÔNG đổi** ⟹ editor v1 (radius number-step, `intent-builders/cone.ts:6-29`) **không vỡ**. Hướng A (radiusPoint trong kind, render-time) tổng quát hơn nhưng phá editor + đụng core — reactivity drag KHÔNG cần cho figure AI tĩnh/canonical |
| Tâm incircle mặt | **Reuse `centroid`** (0 constraint mới cho incircle) | Toàn dataset incircle là mặt **đều** (tam giác đều / hình vuông) ⟹ incenter ≡ centroid. Guard nhánh incircle chỉ fire khi host "đều"/đáy vuông |
| Tâm circumcircle mặt | **Constraint MỚI `faceCircumcenter{vertices}`** | 88c: tam giác ABC (OA,OB,OC ⊥ đôi một, độ dài khác nhau) KHÔNG đều ⟹ circumcenter ≠ centroid. Genuinely cần. 85 trùng centroid nhưng dùng faceCircumcenter cho đúng tổng quát |
| Tâm insphere chóp | **Constraint MỚI `pyramidInsphereCenter{apex, vertices}`** | Cách đều đáy + mọi mặt bên ≠ centroid ≠ circumsphereCenter ≠ insphereCube. Closed-form trên trục chóp đều |
| surfacePoint của 2 sphere | **Reuse `centroid`** (insphere chạm đáy tại tâm-đáy) | insphere chóp: chạm đáy tại G=centroid(đáy), R=|P−G|. 0 op sphere mới |
| radiusTo điểm trên đường tròn | **Reuse `midpoint3d` (incircle) / đỉnh trần (circumcircle)** | incircle mặt đều: chân ⊥ tâm→cạnh = trung điểm cạnh (midpoint3d sẵn). circumcircle: đỉnh nằm trên đường tròn ⟹ radiusTo = 1 đỉnh mặt. 0 perpFoot mới |
| topCenter trụ-trên-tứ-diện-đều | **Đỉnh đối diện mặt** (tận dụng đối xứng) | Tứ diện đều: apex chiếu xuống đúng centroid mặt đối ⟹ topCenter ≡ đỉnh đối diện (điểm sẵn từ solid) |
| Rule nón/trụ nội-ngoại tiếp | **Rule MỚI `inscribedRoundSolid`** (KHÔNG nới guard cone/cylinder cũ) | Guard `|| INSCRIBED` của cone/cylinder cũ là cái GIỮ standalone Phase 4 + chặn co-fire. Rule mới sở hữu trọn, neo INSCRIBED vào chủ-ngữ nón\|trụ |

**Substrate đã xác minh tận file/line (recon 4-agent, KHÔNG tái-derive):**

- **Wiring constraint** — template `circumsphereCenter`: union arm `3d-constraint.ts:28`; constraintRefs case `:42` (`return [...c.vertices]`, never-default `:51`); constraintToWorldInner case `constraint3d-math.ts:292-314` (switch `234-349`, **no default → TS bắt non-exhaustive**); worldToConstraint never-arm `:437` (nhóm non-draggable `431-438`, never-default `:440`); verify3d branch `verify3d.ts:131-151`. `centroid`: union `:16`, refs `:37`, math `285-291`, worldToConstraint `:432`, describe `point3d.ts:51`.
- **3 site TS-forced** (compile-error tới khi wire đủ): constraintRefs never-default (`3d-constraint.ts:51`), constraintToWorldInner non-exhaustive (`constraint3d-math.ts:234-349`), worldToConstraint never-default (`:440`). **verify3d + describe + rule KHÔNG TS-forced** (string-`if`) → dễ quên verify → vacuous-pass. **PHẢI thêm verify branch tay.**
- **Math helpers** (`constraint3d-math.ts`, module-private, reuse trong case mới cùng file): `sub/add/scale/dot/cross/norm/normalize` (`19-27`); `solve3(M,b): Vec3|null` 3×3 Cramer |det|<1e-9→null (`207-220`); `getPlaneBasis` (`46-66`). `planeFrame(p1,p2,p3)→{origin,normal,u,v}` ở `crossSectionGeometry.ts:18-23` (đã import `verify3d.ts:3`) cho verify in-plane.
- **Resolve ref miễn phí:** `addPoint3d.ts:31` special-case `vertices:string[]` (`v.map(name=>resolveId(s,name))`) chạy TRƯỚC REF_FIELDS check (`:33`), độc lập REF_FIELDS set (`:7-10` chỉ scalar p1/from/plane/lineId…). Constraint `{vertices}` resolve label→id tự do. **Scalar ref mới (vd `apex`) PHẢI thêm vào REF_FIELDS `:7`.**
- **Render derived 0-code:** `point3d.ts:108-122` fallback `constraintToWorld(c, getState())` (function-coord, needsRegularUpdate) phủ MỌI derived kind mới. **KHÔNG thêm render case.**
- **Zod 3D constraint:** `intent.ts:28` `add-point-3d.constraint = z.record(z.unknown())` passthrough (KHÔNG có union như 2D) → **KHÔNG sửa zod cho constraint mới.**
- **Build-time resolve:** `crossSection.ts:12` resolve điểm ra world coords trong builder (pattern cho B3). Builder nhận `(s, intent)`.
- **Intent cone/cylinder:** `intent.ts` `ConeIntentZ`/`CylinderIntentZ`, factory sau `cylinderIntent` (`:122`). `Label3DZ=/^[A-Za-z][A-Za-z0-9'′’´_]*$/`.
- **topo:** `intentTopo3d.ts` `producesOf` exhaustive switch (thêm op→case); `consumesOf` thu field ref. `PRODUCE_KEYS` không chứa `vertices`/`radiusTo` → coi là ref.
- **Rule guard cũ:** `cone.ts:6` `INSCRIBED=/(?:nội|ngoại)\s*tiếp/iu`, guard `:20` `if(parseSolidHead3D||INSCRIBED) return []`. `cylinder.ts:18` y hệt. `circumsphere.ts:5-6` CUE `/ngoại\s*tiếp/` ∧ SPHERE_CUE `/cầu/` cùng clause (match `:39`), NON_CYCLIC `:20`, vertices≥4 `:47`, prio 50. `insphereCube.ts:35` cần `nội tiếp`∧`lập phương`; BOX_LABELLED `:39` escalate named cube; prio 47.
- **runRules3D nối MỌI match** (`runDeterministicIntents3d.ts`), priority chỉ thứ-tự-lặp, KHÔNG dedup → guard ở `match()` mới chặn co-fire. Priorities: solid=90, …, circumsphere=50, cone=49, cylinder=48, insphereCube=47.
- **`_shared.ts` helpers:** `parseSolidHead3D`, `baseFaceOf`, `splitVertexToken`, `escapeRe`, `sectionNames`, `pickCenter`.

**Baseline @39cd594 (`npx tsx scripts/diag-all-3d.ts`, xác nhận lại):**

| Dataset | FULL | PARTIAL | NONE | total |
|---|---|---|---|---|
| ss-thietdien | 30 | 176 | 35 | 241 |
| vuonggoc | 122 | 189 | 57 | 368 |
| **tron-xoay** (target) | **34** | **25** | **30** | **89** |
| TOTAL | 186 | 390 | 122 | 698 |

**Hard rule 0-regression:** FULL KHÔNG giảm và NONE KHÔNG tăng trên BẤT KỲ dataset nào. ss-thietdien + vuonggoc = hàng must-not-regress.

## 3. Cycle B1 — `pyramidInsphereCenter` + rule `insphereOfPyramid` (Câu 21/35/53)

### 3.1 Constraint `pyramidInsphereCenter{apex: string, vertices: string[]}`

`apex` = đỉnh chóp; `vertices` = đỉnh đáy (cyclic order từ solidRule layout).

**Math (`constraintToWorldInner`, closed-form, KHÔNG iterative):**

```
G   = mean(base coords)                       // centroid đáy
n   = normalize(cross(B0-A0, C0-A0))          // pháp tuyến đáy (A0,B0,C0 = base[0..2])
if dot(n, S-G) < 0: n = -n                    // hướng về apex
// 1 mặt bên: apex S + cạnh đáy (A0,B0)
m   = normalize(cross(A0-S, B0-S))            // pháp tuyến mặt bên
if dot(m, G-A0) < 0: m = -m                   // hướng vào trong (về G)
denom = 1 - dot(m, n)
s   = dot(m, G-A0) / denom                    // inradius (height tâm trên đáy)
P   = G + s*n
// degenerate fallback:
if |denom|<1e-9 OR s<=0 OR not finite: return mean(apex+base)   // → centroid
return P
```

- `worldToConstraint`: never-arm non-draggable → `return current`.
- **verify3d branch (THẬT, không vacuous):** (a) on-axis: `cross(P-G, S-G) ≈ 0`; (b) đẳng-cự: với MỌI mặt bên (apex + cạnh đáy liên tiếp `base[i],base[i+1 mod n]`), `|dist(P, mặtBên) − dist(P, đáy)| ≤ tol` (tol tương đối như circumsphereCenter `verify3d.ts:131-151`). dist(P,đáy)=s. Đây là đặc tính insphere chạm-tất-cả-mặt.
- `apex` thêm vào `REF_FIELDS` (`addPoint3d.ts:7`); `vertices` tự resolve.

### 3.2 Rule `insphereOfPyramid` (priority ~50, cạnh circumsphere)

- **Cue:** `SPHERE_CUE /(?:mặt|khối|hình)\s*cầu/iu` ∧ `INSCRIBED /nội\s*tiếp/iu` ∧ chóp (`parseSolidHead3D` → flavor pyramid).
- **Guard tách co-fire:** `!/lập\s*phương/iu` (tách insphereCube) + KHÔNG khớp khi chủ-ngữ là "ngoại tiếp" (circumsphere dùng ngoại). insphereCube cần "lập phương" (vắng ⟹ không fire); circumsphere cần "ngoại tiếp"+"cầu" (đề nội tiếp ⟹ CUE fail).
- **Parse:** apex + base từ solid head (chóp tứ giác đều S.ABCD → apex S, base ABCD).
- **B1-task0 (kiểm TRƯỚC code rule):** solidRule có fire "chóp tứ giác đều S.ABCD" không? (Phase 4 gotcha #5 nghi "tứ giác đều" chen giữa làm PYRAMID regex miss). Verify bằng `runRules3D` trên đề thật.
  - **Nếu solidRule MISS** → `insphereOfPyramid` **tự emit `solid({flavor:'pyramid', baseLabels, apexLabel})`** (như insphereCube vô-nhãn) → không dup vì solidRule không fire.
  - **Nếu solidRule HIT** → chỉ reference apex+base (không emit solid → tránh dup).
  - **Co-fire test bắt buộc:** đúng **1** chóp được vẽ (count point3d/polygon3d).
- **Emit:** `addPoint3d(P, {kind:'pyramidInsphereCenter', apex, vertices: base})` + `addPoint3d(G, {kind:'centroid', vertices: base})` + `sphereIntent({center:P, surfacePoint:G})`. Tên P/G synth qua `pickCenter` (`['O','I','J','K','T']∉{apex,base}`), single-letter non-`_`/digit.
- Claim clause chứa cue cầu+nội tiếp.

## 4. Cycle B2 — `faceCircumcenter{vertices: string[]}` (tâm ngoại tiếp tam giác 3D)

`vertices` = đỉnh mặt; math dùng **3 đỉnh đầu** (`P0,P1,P2`). Hợp lệ cho mọi mặt đồng-viên (tam giác; cả tứ giác đều/vuông vì circumcenter 3 đỉnh ≡ tâm). Dataset chỉ có tam giác (85 BCD, 88c ABC).

**Math (`constraintToWorldInner`):**

```
P0,P1,P2 = coords(vertices[0..2])
e1=P1-P0; e2=P2-P0; nrm=cross(e1,e2)
M   = [ 2*e1 ; 2*e2 ; nrm ]                          // 3 rows
rhs = [ dot(P1,P1)-dot(P0,P0) ;
        dot(P2,P2)-dot(P0,P0) ;
        dot(nrm, P0) ]
O = solve3(M, rhs)
if O == null (degenerate/collinear): return mean(P0,P1,P2)   // → centroid
return O
```

- `worldToConstraint`: never-arm → `return current`.
- **verify3d branch:** (a) in-plane: `|dot(normalize(nrm), O-P0)| ≤ tol`; (b) đẳng-cự: `|O-P0| ≈ |O-P1| ≈ |O-P2|` trong tol tương đối. Dùng `planeFrame` (`crossSectionGeometry.ts:18`) sẵn.
- B2 KHÔNG có rule (unit-tested; rule dùng ở B4). Constraint wire đủ 5 site + verify.

## 5. Cycle B3 — Cơ chế radius phái sinh (C-refined)

### 5.1 Intent (`intent.ts`)

- `ConeIntentZ`: thêm `radiusTo: Label3DZ.optional()`; `radius` → `.optional()`. `CylinderIntentZ`: tương tự. Factory `coneIntent`/`cylinderIntent` nhận `radiusTo?`.
- **Bất biến:** đường standalone Phase 4 truyền `radius` literal (không `radiusTo`) → KHÔNG đổi hành vi.

### 5.2 Builder (`intent-builders/cone.ts`, `cylinder.ts`)

`resolveWorld(s, name)` = helper resolve điểm ra world coords trong builder (symbol chính xác pin lúc impl theo pattern `crossSection.ts:12` — `resolveId` + `constraintToWorld`).

```
if (intent.radiusTo) {
  C = resolveWorld(s, baseCenter)             // pattern crossSection.ts:12
  apexOrTop = resolveWorld(s, apex|topCenter)
  R = resolveWorld(s, radiusTo)
  u = normalize(apexOrTop - C)                // trục
  v = R - C
  radius = norm(v - scale(u, dot(v,u)))       // thành phần ⊥ trục (chiếu lên mặt đáy)
} else {
  radius = intent.radius                      // literal (standalone)
}
// emit cone3d/cylinder3d kind với radius literal — KIND KHÔNG ĐỔI
```

- **topo (`intentTopo3d.ts`):** `consumesOf` cone/cylinder thêm `radiusTo` (xếp cone/cylinder SAU điểm bán kính). `producesOf` không đổi.
- cone3d/cylinder3d scene kind, render (`cone3d.ts`/`cylinder3d.ts`), verify3d **KHÔNG đụng**. Editor v1 **KHÔNG đụng** (vẫn truyền `radius` literal).

## 6. Cycle B4 — Rule `inscribedRoundSolid` (Câu 70/73/75/85/88c)

Priority ~46 (dưới insphereCube=47, cạnh họ round-solid). Sở hữu trọn "nón/trụ nội/ngoại tiếp mặt". Coexist solidRule@90 (host vẽ riêng).

### 6.1 Parse

- **Round solid:** `/(?:hình|khối)\s*(nón|trụ)/iu` → `nón`→cone / `trụ`→cylinder. **Prefilter patterns round-solid-specific** (yêu cầu CẢ nón\|trụ LẪN nội\|ngoại tiếp) ⟹ KHÔNG fire trên ss-thietdien/vuonggoc (gate diag 0-regression xác nhận chéo-dataset).
- **Relation:** clause "đường tròn đáy … **nội tiếp**" → incircle; "**ngoại tiếp**" → circumcircle.
- **Mặt định nghĩa đường tròn:** `/(?:tam\s*giác|tứ\s*giác)\s+([A-Z]{3,4})/u` → face verts (`splitVertexToken`).
- **Cone apex:** `/đỉnh\s+([A-Z])(?![\p{L}])/u`.
- **Host:** `parseSolidHead3D` (tứ diện / lăng trụ / chóp).

### 6.2 Dựng theo host

| Host | Shape | baseCenter | apex / topCenter | radiusTo |
|---|---|---|---|---|
| chóp (70) | cone | centroid(đáy)[nội] / faceCircumcenter[ngoại] | apex = "đỉnh S" | midpoint(đáy[0],đáy[1])[nội] / đáy[0][ngoại] |
| tứ diện (88c nón) | cone | faceCircumcenter(mặt) | apex = "đỉnh O" | mặt[0] |
| tứ diện (73/85 trụ) | cylinder | centroid(mặt)[nội] / faceCircumcenter[ngoại] | topCenter = **đỉnh đối diện mặt** (∈ head ∉ face) | midpoint(mặt[0],mặt[1])[nội] / mặt[0][ngoại] |
| lăng trụ (75 trụ) | cylinder | centroid(face_đáy) | topCenter = centroid(face_đỉnh) | midpoint(face_đáy[0],[1]) |

- Trụ-trên-tứ-diện: topCenter = đỉnh ∈ base-head NHƯNG ∉ face (vd head ABCD, face BCD → topCenter=A). Tứ diện đều → A chiếu đúng centroid(BCD) ⟹ trục ⊥ đáy chuẩn.
- Lăng trụ "hai đáy": face_đáy = base-head (ABC), face_đỉnh = top-head (A'B'C') từ `parseSolidHead3D`.
- **Guard incircle = host đều:** nhánh incircle CHỈ fire khi đề có "đều" (tứ diện/lăng trụ đều) HOẶC đáy "vuông"/"tứ giác đều" (centroid ≡ incenter chính xác). Khác ⟹ escalate (`return []`, defer faceIncenter Phase 6).
- **Emit:** center point(s) (centroid/faceCircumcenter) + radiusTo point (midpoint3d nếu cần) + `coneIntent({baseCenter, apex, radiusTo})` / `cylinderIntent({baseCenter, topCenter, radiusTo})`. Tên center synth `pickCenter`. KHÔNG emit host solid (solidRule@90 lo).

### 6.3 Co-fire guard

- cone/cylinder cũ: `|| INSCRIBED` tự bail → không emit trên đề nội/ngoại tiếp. **KHÔNG nới.**
- circumsphere: cần "ngoại tiếp"+"cầu" cùng clause → đề "trụ ngoại tiếp tam giác" không có "cầu" → không fire. Guard rule mới neo INSCRIBED vào nón\|trụ (không claim clause chủ-ngữ "cầu ngoại tiếp").
- insphereCube: cần "lập phương" → vắng ⟹ không fire.
- crossSection: cần token `(XYZ)` paren → vắng ⟹ no-op.
- solidRule@90: vẽ host (tứ diện/lăng trụ/chóp) — **DESIRED coexist**, clauseId khác. Đảm bảo rule mới claim clause round-solid riêng (coverage không double-count).
- **Test runRules3D `.toBe(N)`** cho từng đề target: đúng 1 nón/trụ + 1 host + 0 cầu sai.

## 7. Vocabulary (`vocabulary3d.ts`)

Defensive (đa số đã có): `'nội tiếp'`, `'ngoại tiếp'`, `'đường tròn'`, `'tam giác'`, `'tứ giác'`, `'mặt cầu'`. Kiểm trước; chỉ thêm keyword thiếu để clause `hasGeometry=true` (vd `'đường sinh'` nếu cần). KHÔNG đổi nếu đã đủ.

## 8. Verify (`verify3d.ts`)

- **pyramidInsphereCenter** (MỚI): on-axis + đẳng-cự đáy↔mọi mặt bên. Bắt buộc — bài học verify-R>0 vacuous.
- **faceCircumcenter** (MỚI): in-plane + đẳng-cự 3 đỉnh.
- **sphere3d / cone3d / cylinder3d / centroid / midpoint3d:** reuse loop có sẵn (R>0, trục≠0). Faithfulness của inscribe đảm bảo bởi **construction** (center đúng + radiusTo trên đường tròn) — KHÔNG có verify riêng cho "radius = inradius" (phức tạp generic) ⟹ **MCP visual là gate faithfulness bắt buộc**.

## 9. Insertion points

1. `src/core/scene/kinds/3d-constraint.ts` — union arm + constraintRefs case cho `pyramidInsphereCenter`, `faceCircumcenter`.
2. `src/core/scene/kinds/constraint3d-math.ts` — constraintToWorldInner case + worldToConstraint never-arm (×2 constraint).
3. `src/core/scene/kinds/point3d.ts` — describe case (optional, conventional).
4. `src/stamps/geometry-3d/ai/verify3d.ts` — 2 verify branch.
5. `src/stamps/geometry-3d/ai/intent-builders/addPoint3d.ts` — REF_FIELDS thêm `apex` (cho pyramidInsphereCenter).
6. `src/stamps/geometry-3d/ai/intent.ts` — `ConeIntentZ`/`CylinderIntentZ` thêm `radiusTo?`, `radius` optional; factory.
7. `src/stamps/geometry-3d/ai/intent-builders/cone.ts` + `cylinder.ts` — nhánh build-time radius từ `radiusTo`.
8. `src/stamps/geometry-3d/ai/intentTopo3d.ts` — `consumesOf` cone/cylinder thêm `radiusTo`.
9. `src/stamps/geometry-3d/ai/rules/insphereOfPyramid.ts` (MỚI) + `inscribedRoundSolid.ts` (MỚI) + `registry.ts` (2 entry, prio ~50 / ~46).
10. `src/stamps/geometry-3d/ai/deterministic/vocabulary3d.ts` — keyword thiếu (nếu có).
11. Tests: `__tests__/constraint3d-math.{pyramidInsphere,faceCircumcenter}.test.ts`, `ai/__tests__/verify3d.{pyramidInsphere,faceCircumcenter}.test.ts`, `ai/__tests__/intentToScene3d.radiusTo.test.ts`, `rules/__tests__/{insphereOfPyramid,inscribedRoundSolid,roundSolidCofire}.test.ts`, e2e `tests/e2e/geometry-3d-figure.spec.ts` (+ insphere chóp, nón-incircle, trụ-incircle, trụ-circumcircle).

**KHÔNG đụng:** `core/scene/kinds/cone3d.ts`/`cylinder3d.ts`/`sphere3d.ts` render (chỉ reuse), verify loop sphere/cone/cylinder, engine 2D, `solid.ts` solidRule (B1-task0 quyết định emit-từ-rule vs reference; nếu cần sửa solidRule "tứ giác đều" thì tách quyết định + regression riêng), cone/cylinder rule cũ (guard `|| INSCRIBED` GIỮ), Phase 4/5 sphere/circumsphere/insphereCube/AXIAL.

## 10. Khung metric trung thực

`diag-all-3d` FULL = all-or-nothing/bài; `tron-xoay` MC-heavy. **Thực tế dataset (recon):**
- **Fire-được-trong-diag:** 70 (NONE), 75 (NONE), 21/35/53 (NONE×3) → vẽ construct → NONE→PARTIAL (hoặc FULL nếu clause được claim đủ).
- **KHÔNG fire-trong-diag (clause rớt khỏi intro):** 73/85 hiện **FALSE-FULL** (chỉ vẽ tứ diện trần; clause trụ ở câu hỏi bị PROOF_ONLY drop) → rule mới không thấy clause → **giữ FULL, 0-regression**; construct **vẫn vẽ đúng qua e2e/MCP text trực tiếp**. 88c (intro truncate part a) + 74 (inverse) **out-of-scope**.

Dự đoán diag: tron-xoay FULL nhích nhẹ (+2..+4), NONE giảm (−3..−5). ss-thietdien + vuonggoc **flat**. Deliverable = **5 construct DRAWN + verify số học + Playwright + MCP visual mỗi construct** + dbg-bai spot-check. Gate cứng = **0-regression** + full jest + tsc xanh.

## 11. Ngoài phạm vi (defer → Phase 6)

- **`faceIncenter{vertices}`** (incircle tam giác **không đều**): toàn dataset incircle là mặt đều ⟹ centroid chính xác; guard incircle = host đều. Tam giác bất kỳ → cần faceIncenter (`I=(a·A+b·B+c·C)/(a+b+c)`), wiring y faceCircumcenter.
- **Câu 88c** (mặt cầu/lăng trụ/nón multi-part): intro-extraction truncate ở part a → cả tứ diện OABC chưa match. Cần sửa intro multi-part (ngoài scope construct).
- **Câu 74** (lăng trụ lục giác đều **nội tiếp** trụ): **đảo chiều** (polyhedron-in-solid) — đa giác đáy nội tiếp đường tròn host; 1 bài, khó nhất.
- **Nón cụt thiết diện** (84); **đồng hồ cát** (89, trụ + 2 nửa cầu).
