# Phase 6 — Trụ nội/ngoại tiếp trên MẶT NGHIÊNG tứ diện (Câu 73/85) — Design

## 1. Mục tiêu & phạm vi

Gỡ DEFER "trụ trên mặt NGHIÊNG tứ diện" (`inscribedRoundSolid.ts:120-123`, Phase 5b). Cho phép dựng **khối trụ** có một đáy là đường tròn **nội tiếp** (incircle) hoặc **ngoại tiếp** (circumcircle) MỘT MẶT của tứ diện, chiều cao = chiều cao tứ diện, trục **⊥ mặt** đó dù layout tứ diện không-đều-thật.

**Bài đích (dataset `tron-xoay`):**
- **Câu 73:** "tứ diện đều ABCD … hình trụ có một đường tròn đáy là đường tròn **nội tiếp** tam giác BCD và chiều cao bằng chiều cao của tứ diện ABCD".
- **Câu 85:** "tứ diện đều ABCD … hình trụ có đáy là đường tròn **ngoại tiếp** tam giác BCD và chiều cao bằng chiều cao của tứ diện".

**Out of scope (giữ DEFER):** nón XIÊN 88c (apex = đỉnh tứ diện → cone3d chỉ right-cone); Câu 74 inverse (lăng trụ trong trụ); nón cụt 84; đồng hồ cát 89; `faceIncenter` (incircle mặt KHÔNG đều — 0 bài dataset). KHÔNG đổi layout3d global.

## 2. Blocker (đã xác minh tận file/line)

`cone3d`/`cylinder3d` render dựng vành tròn bằng `perpBasis` ⊥ **trục** (baseCenter→topCenter/apex). Trục phải ⊥ mặt BCD thì vành mới nằm trên mặt.

- `layout3d` 'tetrahedron' KHÔNG phải tứ diện ĐỀU thật (cạnh đáy ≠ cạnh bên) ⟹ nếu lấy `topCenter` = đỉnh đối A thì `A − tâm(BCD)` **không ⊥** BCD ⟹ vành nghiêng lệch (MCP Phase 5b bắt → defer).
- Hiện nhánh này `return []` (dòng 123) ⟹ trụ KHÔNG được vẽ (NONE/PARTIAL cho 73/85).

## 3. Giải pháp — constraint mới `pointAboveFace{base, face, apex}`

Điểm tâm-đáy-trên = tâm mặt offset **dọc pháp tuyến mặt** một đoạn = chiều cao ⊥ từ đỉnh đối tới mặt (= chiều cao tứ diện trong layout thật). Đảm bảo trục ⊥ mặt bất kể layout.

**Math (`constraintToWorldInner`, closed-form, mirror `faceCircumcenter`):**
```
G  = getPointWorld(base)                        // tâm mặt: centroid (incircle) | faceCircumcenter (circum)
P  = face.map(getPointWorld)                     // ≥3 đỉnh mặt
if P.length < 3: return G
n  = normalize(cross(P[1]−P[0], P[2]−P[0]))
S  = getPointWorld(apex)                         // đỉnh đối diện mặt
if dot(n, S − P[0]) < 0: n = −n                  // hướng về đỉnh đối
h  = dot(S − P[0], n)                            // chiều cao ⊥ đỉnh→mặt-phẳng
if !finite(h) or h <= 1e-9: return G             // suy biến → trùng tâm (fail-safe hữu hạn)
return G + h·n
```

- **worldToConstraint:** never-arm non-draggable → `return current` (nhóm derived như centroid/faceCircumcenter).
- **verify3d branch (THẬT, không vacuous — bài học Phase 5b):**
  (a) **trên trục ⊥ mặt:** `cross(P_out − G, n) ≈ 0` (P_out − G ∥ pháp tuyến mặt);
  (b) **đúng chiều cao:** `| |P_out − G| − dist(apex, plane(face)) | ≤ tol` (tol tương đối như `circumsphereCenter` `verify3d.ts:131-151`). `dist(apex, plane)` dùng `planeFrame` (`crossSectionGeometry.ts:18`, đã import verify3d).
- **refs:** `base`, `apex` = scalar → thêm vào `REF_FIELDS` (`addPoint3d.ts:7`); `face` = `string[]` → auto-resolve (`addPoint3d.ts:31`). `intentTopo3d`: `producesOf` case mới; `consumesOf` thu `base`+`apex`+`face`.
- **render:** 0 code — `point3d.ts:108-122` fallback `constraintToWorld` phủ mọi derived kind.

**Radius (không đổi):** `radiusTo` build-time literal qua `projectedRadius3d`. incircle → `radiusTo` = trung điểm 1 cạnh mặt (⊥-dist tới trục = inradius); circum → `radiusTo` = 1 đỉnh mặt (⊥-dist = circumradius). Vì trục ⊥ mặt và radiusTo nằm trong mặt-phẳng, ⊥-component = full distance tâm→điểm.

## 4. Rule `inscribedRoundSolid` — nhánh tetra-face

Thay `return []` (dòng 120-123) bằng nhánh mới (chạy SAU nhánh cone + nhánh prism hiện có):

- **Điều kiện fire:** clause `c` có `(?:hình|khối)\s*trụ` ∧ `(?:nội|ngoại)\s*tiếp` ∧ (`đường tròn`|`đáy`) **VÀ** host là **tứ diện** (`parseSolidHead3D` flavor tetra/pyramid 4 đỉnh, hoặc regex `tứ\s*diện`). Mặt = `FACE` regex (BCD). Đỉnh đối = `tetraLabels ∖ faceVerts` (đúng 1).
- `circum = NGOAI.test(c.text)`.
- **Guard incircle mặt không-đều:** giữ `if (!circum && !REGULAR.test(ctx.problem)) return []` (incircle chỉ hợp lệ khi mặt đều → centroid ≡ incenter; "tứ diện đều" ⟹ mặt đều).
- **Solid host:** nếu solidRule vẽ tứ diện → chỉ reference đỉnh. Nếu miss → tự `solid({flavor:'pyramid'/'tetra', baseLabels, apex})` + claim head clause (`headClauseId`, cơ chế fail-safe Phase 5b).
- **Emit:** tâm mặt (`centroid`[incircle] | `faceCircumcenter`[circum]) + `pointAboveFace`(topCenter) + radiusTo point (`midpoint` incircle | đỉnh circum) + `cylinderIntent({baseCenter, topCenter, radiusTo})`. Tên synth qua `pickCenter`/`sectionNames`.

## 5. 0-regression (hard rule)

Nhánh mới CHỈ fire khi (trụ ∧ nội/ngoại-tiếp ∧ mặt-tứ-diện) — trước đây `return []`. Thuần additive. Constraint `pointAboveFace` thuần thêm. `ss-thietdien` + `vuonggoc` KHÔNG được giảm FULL / tăng NONE. Verify: `npx tsx scripts/diag-all-3d.ts` so baseline.

**Baseline (Phase 5b, `project_ai_3d_v2_pipeline`): tron-xoay 35 FULL / 26 PARTIAL / 28 NONE.** 73/85 hiện PARTIAL (host vẽ, trụ thiếu) hoặc NONE.

## 6. Verify (bài học Phase 5b: R>0 + e2e-count VACUOUS → BẮT BUỘC MCP visual)

1. **Unit:** constraint math `pointAboveFace` (trên trục ⊥ mặt; đúng chiều cao; fallback suy biến). verify3d branch (pass đúng / fail khi lệch trục). Rule fire 73/85 → đúng intents (1 cylinder, baseCenter/topCenter/radiusTo đúng kind). Co-fire: đúng 1 tứ diện vẽ.
2. **diag-all-3d:** 0-regression 3 dataset.
3. **Playwright e2e:** 73 & 85 generate → scene có cylinder3d + topCenter ⊥ mặt (đo toạ độ JXG: `(topCenter − base) · edgeVector_mặt ≈ 0`).
4. **MCP visual GATE:** `npm run demo` :5173 → nhập đề 73 & 85 → nhìn HÌNH THẬT: trụ đứng ⊥ mặt BCD, vành đáy NẰM TRÊN mặt, KHÔNG nghiêng lệch, KHÔNG thò ngang. Nếu lệch → STOP debug.

## 7. Substrate (recon Phase 5b, không tái-derive)

- Template constraint `faceCircumcenter`: union `3d-constraint.ts`; refs case + never-default `:51`; math `constraint3d-math.ts:337-353`; worldToConstraint never-arm `:478`; describe `point3d.ts`. 3 site TS-forced (refs never-default, math non-exhaustive switch, worldToConstraint never-default). verify3d + describe + rule KHÔNG TS-forced → PHẢI thêm verify tay.
- Helpers `constraint3d-math.ts`: `sub/add/scale/dot/cross/norm/normalize`, `solve3`, `getPointWorld` (resolve recursive mọi point kể cả derived). `planeFrame` `crossSectionGeometry.ts:18`.
- `getPointWorld` (`constraint3d-math.ts:38`) resolve point id → world coords (đệ quy qua constraint) ⟹ `pointAboveFace` ref `base`/`apex` tới derived point OK.
- `projectedRadius3d` `intent-builders/_types.ts:57` (⊥-dist tới trục, build-time). `buildCylinder` `intent-builders/cylinder.ts` (baseCenter/topCenter = point IDs, radius literal).
- Rule `_shared.ts`: `parseSolidHead3D`, `parsePyramidTolerant`, `parsePrismTolerant`, `splitVertexToken`, `pickCenter`, `sectionNames`, `escapeRe`.
- `intent.ts:28` constraint = `z.record(z.unknown())` passthrough → KHÔNG sửa zod cho constraint mới.

## 8. Out of scope / DEFER (giữ nguyên)

`faceIncenter` (0 bài), nón xiên 88c, Câu 74 inverse, nón cụt 84, đồng hồ cát 89. Cone-on-slanted-face KHÔNG làm (scope chốt: chỉ TRỤ 73/85).
