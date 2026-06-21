# Thiết kế: Phase 3a — Metric / Vuông góc 3D (chân ⊥, đường/mặt ⊥, góc đường–mặt)

> Ngày: 2026-06-21 · Nhánh: `feat/3d-foundation` · Trạng thái: APPROVED (brainstorm)
> Tiếp nối spec nền `docs/superpowers/specs/2026-06-21-3d-figure-pipeline-design.md` (Phase 3)
> + spec Phase 2 `docs/superpowers/specs/2026-06-21-3d-cross-section-design.md` (mẫu cấu trúc).

## 1. Mục tiêu

Dựng cụm **metric/vuông góc** cho pipeline Text→Hình-3D trên dataset `11-vuonggoc-khoangcach`
(368 bài): **chân đường vuông góc / hình chiếu** xuống mặt & xuống đường, **đường ⊥ mặt**,
**mặt ⊥ đường**, **đoạn khoảng cách**, và **góc giữa đường và mặt** (vẽ bằng tam giác chiếu).

Mirror discipline foundation/Phase 2: TDD per-rule + probe `diag-all-3d` (before/after) +
Playwright render-verify + 0-regression toàn jest.

**Baseline (HEAD `6dbfaad`, đã xác nhận lại bằng `npx tsx scripts/diag-all-3d.ts`):**

| Dataset | FULL | PARTIAL | NONE | Total |
|---|---|---|---|---|
| ss-thietdien | 30 | 176 | 35 | 241 |
| **vuonggoc** (đích Phase 3) | 104 | 205 | 59 | 368 |
| tron-xoay | 15 | 30 | 44 | 89 |
| **TOTAL** | **149** | **411** | **138** | 698 |

**Cluster vuonggoc** (427 clause chưa phủ = PARTIAL.uncovered + NONE.intro-split, đo bằng
`.work/escalations-3d.json`): chân ⊥ mặt/đường ~17 sạch (+ nhiều trong OTHER), góc đường–mặt
~36 + ~50 "tạo với đáy một góc", k/c-2-đường-chéo 51 (đa số câu hỏi MC — defer), "mặt ⊥ đáy"
27 (đặc tả layout — defer), OTHER 202 (đa số trị-số "bằng a" / câu hỏi — KHÔNG vẽ được, PARTIAL
đúng). **Dataset thiên về đề trắc nghiệm tính toán** → PARTIAL cao là ĐÚNG (khung metric §9).

## 2. Quyết định kiến trúc (chốt qua brainstorm)

| Vấn đề | Chốt | Lý do |
|---|---|---|
| Kind core mới | **KHÔNG** | `perpFootPlane`/`perpFootLine` constraint + `linePerpToPlane`/`planePerpToLine` construction + `sphere3d`/`segment3d` đã có & render (v1.5) |
| Intent op mới | **KHÔNG** | `add-point-3d` (perpFoot*), `plane{perpToLine}`, `line{perpToPlane}`, `connect` đều đã wire |
| Builder mới | **KHÔNG** | `buildAddPoint3d.REF_FIELDS` đã chứa `from,plane,a,b` → resolve thẳng; `buildPlane3d` có `perpToLine`; `buildLine3d` có `perpToPlane`; `buildConnect` vẽ segment3d |
| `intentTopo3d`/`Intent3DZ` | **KHÔNG đổi** | Không op mới → `producesOf` switch + discriminated-union nguyên vẹn; `consumesOf` tự dò `from/plane/a/b` (string fields) |
| Biểu diễn k/c & góc | **Chỉ hình, KHÔNG nhãn số** | Layout canonical (toạ độ chuẩn hoá) ≠ độ dài đề (SA=a…) → nhãn số sẽ SAI/gây hiểu lầm. Đoạn nối = `connect` segment; góc = tam giác chiếu (không cung góc) |
| "đáy"/"mặt đáy" không token | **Tổng hợp mặt đáy từ solid-head** | Đa số bài = đỉnh chiếu xuống đáy; suy 3 đỉnh đáy từ "hình chóp S.ABCD" → plane ẩn |
| Phạm vi | **3a = chân ⊥ + đường/mặt ⊥ + góc đường–mặt** | Cụm sạch, hạ tầng 100% sẵn; dihedral/skew-distance/coincidence-foot → 3b |

**Sự thật substrate đã xác minh tận file/line:**
- `Constraint3D` (`3d-constraint.ts`): `perpFootLine{from,a,b}` + `perpFootPlane{from,plane}` —
  `constraintRefs` khai sẵn; `constraintToWorldInner` tính (math line 292 `perpFootLine`, 301
  `perpFootPlane`); `worldToConstraint` xếp vào nhóm phái-sinh-không-kéo (line 396–397).
- `buildAddPoint3d` (`intent-builders/addPoint3d.ts`): `REF_FIELDS = {p1,p2,from,plane,a,b,a1,b1,a2,b2,lineId,planeId,polygonId,sphereId}`
  → general path resolve `from/plane/a/b` → constraint perpFoot* chạy thẳng, **0 builder mới**.
- `buildPlane3d` (`intent-builders/plane.ts`): `spec.kind==='perpToLine'` → `planePerpToLine{point,lineA,lineB}` (đã có).
- `buildLine3d` (`intent-builders/line.ts`): `intent.kind==='perpToPlane'` → `linePerpToPlane{point,plane}` (đã có); `line3dIntent` factory dồn key ≠(name|kind) vào `refs`.
- `buildConnect` (`intent-builders/connect.ts`): `connect3d(from,to,'segment')` → `segment3d{p1,p2}` (visible, registerInNameMap=false).
- `AddPoint3DIntentZ.constraint = z.record(z.unknown())` / `Plane3DIntentZ.spec = z.record` → schema chấp nhận record bất kỳ; `Intent3DZ.parse` KHÔNG strip field perpFoot.
- `runRules3D` chạy **MỌI** rule khớp prefilter trên TOÀN problem rồi **NỐI** intents (không first-match-wins). `runDeterministicIntents3d` dedup `JSON.stringify(intent)`.
- `planeNamed` token = **đúng 3 chữ** `\(([A-Z])([A-Z])([A-Z])\)` → "(ABCD)" 4 chữ KHÔNG bị planeNamed claim/vẽ (gap — base synth của ta sẽ vẽ `mp_ABC`).
- `guards3d.SOLID_HEAD` + `_shared.splitVertexToken` parse solid-head (apex + base labels).

## 3. Helper dùng chung — `baseFaceOf(problem)`

Trong `rules/_shared.ts` (cạnh `extractName3D`/`splitVertexToken`):

```ts
// Trả đỉnh đáy + apex của khối đầu đề. null nếu không nhận diện được solid-head.
export interface SolidHead3D { apex?: string; baseLabels: string[] }
export function parseSolidHead3D(problem: string): SolidHead3D | null;
// Mặt đáy ẩn từ 3 đỉnh đáy đầu (đủ xác định mặt). null nếu <3 đỉnh đáy.
export function baseFaceOf(problem: string): { planeName: string; p1: string; p2: string; p3: string } | null;
```

- `parseSolidHead3D`: regex mô phỏng `SOLID_HEAD` (hình chóp `S.ABCD` → apex S, base ABCD;
  tứ diện ABCD → base ABCD, apex undefined; lăng trụ `ABC.A'B'C'` → base ABC). Dùng `splitVertexToken`.
- `baseFaceOf`: `planeName = 'mp_' + p1+p2+p3` (3 đỉnh đáy đầu, **strip prime** cho tên hợp lệ —
  base luôn là đỉnh không-prime); dedup tên với planeNamed khi đáy là tam giác có "(ABC)".
- **Tên mặt đích từ token (XYZ):** dùng trực tiếp `mp_XYZ` (khớp planeNamed → dedup). Rule luôn
  **tự emit `plane(mp_XYZ, threePoints X,Y,Z)`** kèm theo (mirror Phase 2 crossSection) để ref
  chắc tồn tại dù prefilter planeNamed có lệch.

## 4. Rules (4 rule mới — band ưu tiên 51–54, dưới planeNamed 55)

Topo + dedup + concat lo thứ tự build → priority chỉ ảnh hưởng thứ tự trong danh sách nối (không
tới đúng/sai). Đặt dưới planeNamed để claim mặt vẫn có mặt trong danh sách.

### 4.1 `projectionFoot` (priority 54) — chân ⊥ / hình chiếu / khoảng cách-điểm
Cue (prefilter): `/hình\s*chiếu|chân\s+đường|khoảng\s*cách/iu`.

| Biến thể | Phrasing đại diện | Emit |
|---|---|---|
| ⊥ xuống MẶT (token) | "Hình chiếu (vuông góc) của S (lên/trên/xuống) (mp)? **(XYZ…)**" | token N≥3 chữ ⇒ lấy **3 chữ đầu** → `plane(mp_<L1L2L3>, threePoints L1,L2,L3)` + `add-point{perpFootPlane,from:S,plane:mp_<L1L2L3>}` H + `connect(S,H)` |
| ⊥ xuống ĐÁY (trần) | "Hình chiếu của S (lên/trên) **mặt đáy/đáy**" (KHÔNG token) | `baseFaceOf` → plane đáy + `perpFootPlane{from:S,plane:base}` H + `connect(S,H)` |
| ⊥ xuống ĐƯỜNG | "Gọi H là hình chiếu của A trên (cạnh)? **SB**" | `add-point{perpFootLine,from:A,a:S,b:B}` H + `connect(A,H)` |
| k/c điểm→MẶT | "khoảng cách từ A đến (mp)? **(SBC)**/đáy" | như ⊥ xuống mặt (foot synth + segment) |
| k/c điểm→ĐƯỜNG | "khoảng cách từ A đến (đường thẳng)? **BC**" | như ⊥ xuống đường (foot synth + segment) |

- **Tên foot:** có "Gọi H là …"/"…là H"/"… H của …" → dùng `H`; vô danh ("khoảng cách từ A …")
  → synth `H_<from>` (vd `H_A`, hợp Label3DZ; Phase 3b có thể ẩn nhãn). Strip prime của from cho tên synth.
- **Đoạn k/c:** `connect3d(from, footName, 'segment')` — màu phân biệt set ở builder? KHÔNG (connect
  không nhận màu) → để màu default segment; nhấn mạnh để 3b.
- **Loại MẶT vs ĐƯỜNG:** đích là token `(XYZ)` / "mặt phẳng" / "đáy"/"mặt đáy" ⇒ perpFootPlane;
  đích là cặp 2 chữ HOA `XY` (đường) ⇒ perpFootLine.

### 4.2 `perpLineToPlane` (priority 53) — đường qua điểm ⊥ mặt
Cue: `/vuông\s*góc|⊥/iu` + chủ ngữ ĐƯỜNG, đích MẶT.
- "(đường thẳng) (d)? qua A (và)? vuông góc (với)? (mặt phẳng)? **(SBC)**/đáy" →
  `line3dIntent({name?, kind:'perpToPlane', point:A, plane:mp_SBC})` (+ emit plane ref/đáy synth).
- Tên đường: có tên chữ thường (d/Δ→ASCII) hoặc "AH" → đặt; else vô danh (builder nextLabel).
- **Guard co-fire:** bỏ clause nếu có cue `hình chiếu|chân đường|khoảng cách` (projectionFoot trội)
  hoặc đích là ĐƯỜNG (để perpPlaneToLine xử lý).

### 4.3 `perpPlaneToLine` (priority 52) — mặt qua điểm ⊥ đường
Cue: `/vuông\s*góc|⊥/iu` + chủ ngữ MẶT, đích ĐƯỜNG.
- "(mặt phẳng) (P)? qua A (và)? vuông góc (với)? (đường thẳng)? **BC**/d" / "(P) ⊥ SA tại A" →
  `plane3d(name, {kind:'perpToLine', point:A, lineA:B, lineB:C})`.
- **Guard co-fire:** bỏ nếu đích là MẶT `(XYZ)`/"đáy" (perpLineToPlane trội) hoặc cue projectionFoot.

### 4.4 `angleLinePlane` (priority 51) — góc đường–mặt = tam giác chiếu
Cue: `/góc\s+(giữa|hợp)|tạo\s+với/iu`.
- "góc giữa (cạnh|đường thẳng)? **SC** và (mặt phẳng)? **đáy/(ABCD)**"; "**SC** tạo với (mặt)? đáy (một)? góc" →
  off-plane endpoint = **apex** (từ solid-head); on-plane = đỉnh còn lại. Emit:
  - base plane (token hoặc `baseFaceOf`),
  - `add-point{perpFootPlane, from:apex, plane:base}` foot `H_<apex>` (vô danh),
  - `connect(apex, foot)` + `connect(foot, vtx)` + `connect(apex, vtx)` (tam giác chiếu).
- **Guard:** chỉ fire khi 1 đầu mút = apex pyramid (off-base) & đầu kia là đỉnh đáy; ngược lại (2
  đỉnh đáy / "góc giữa hai mặt phẳng"/"mặt bên và đáy" = dihedral) → bỏ (defer 3b). Bỏ clause
  thuần trị-số nếu không có cặp đầu mút hợp lệ.

**Idempotent:** nhiều clause cùng apex → cùng `perpFootPlane{apex,base}` + cùng plane → dedup
collapse; chỉ `connect` tới đỉnh khác là mới. An toàn lặp.

## 5. Verify (`verify3d.ts` thêm — mirror Phase 2 §7)

Trong vòng lặp `point3d` (sau block intersectionLinePlane):
- `perpFootPlane`: foot **on-plane** (`|signedDistance(foot, frame)| < 1e-6`) ∧ vector
  `(foot − from)` **∥ normal** (cross ≈ 0, hoặc |from→foot trừ thành phần normal| ≈ 0). Fail-soft try/catch.
- `perpFootLine`: foot **collinear** với (a,b) ∧ `(foot − from)·(b − a) ≈ 0`.
- Plane frame lấy từ plane ref (qua `planeWorld3` đã có cho intersectionLinePlane).

## 6. Insertion points

1. `rules/_shared.ts`: + `parseSolidHead3D`, `baseFaceOf` (+ re-export đã có `plane3d/addPoint3d/line3dIntent/connect3d`).
2. `rules/projectionFoot.ts` (mới) + `rules/perpLineToPlane.ts` (mới) + `rules/perpPlaneToLine.ts` (mới) + `rules/angleLinePlane.ts` (mới).
3. `rules/registry.ts`: import + thêm 4 rule (band 51–54).
4. `verify3d.ts`: 2 check perpFoot*.
5. `tests/e2e/geometry-3d-figure.spec.ts`: + case "hình chiếu/khoảng cách" render foot + segment, không lỗi plane3d.
6. **KHÔNG đụng** `intent.ts`, `intent-builders/*`, `intentTopo3d.ts`, `core/scene/kinds/*` (reuse 100%).

## 7. Testing (y đúc Phase 2)

- **Unit per-rule** `rules/__tests__/{projectionFoot,perpLineToPlane,perpPlaneToLine,angleLinePlane}.test.ts`:
  match() + intent shape + coverage claim + **co-firing ở `runRules3D`** (RED khi gỡ guard → 2 construct sai; GREEN khi khôi phục).
- **Builder/e2e numeric** `__tests__/intentToScene3d.metric.test.ts`: chóp vuông S.ABCD →
  perpFootPlane{S, đáy} foot coplanar đáy ∧ S→foot ∥ normal; perpFootLine{A,S,B} foot trên SB ∧ ⊥;
  perpToPlane line tồn tại; perpToLine plane tồn tại; tam giác chiếu = foot + 3 segment3d; fail-soft.
- **verify3d** `__tests__/verify3d.metric.test.ts`: state hợp lệ pass; foot bịa lệch mặt → fail.
- **Probe** `npx tsx scripts/diag-all-3d.ts` ghi before/after (đặc biệt vuonggoc); **0-regression cứng** (FULL không giảm, NONE không tăng mọi dataset).
- **Debug** `npx tsx scripts/dbg-bai-3d.ts vuonggoc <id>` (id chứa "hình chiếu"/"góc giữa").
- **Playwright** mount view3d thật, 1 bài hình-chiếu → assert point3d foot + segment3d, không lỗi `plane3d` (bug-class ẩn khỏi unit-mock).
- **Jest worktree** `npx jest -c jest.worktree.config.js` (toàn bộ xanh).

## 8. Co-firing & gotcha (Phase 2 đã dạy — KHÔNG phát hiện lại)

1. **RULE CO-FIRING:** `runRules3D` nối MỌI match. 4 rule metric chung cue "vuông góc/⊥/hình
   chiếu/góc" → guard `continue` theo chủ-ngữ + loại-đích để không đồng-fire sai. Test ở mức
   runRules3D (coverage-independent).
2. **Regex VN:** cờ `u` + `(?!\p{L})` thay `\b`; cue HOA-đầu-câu → `/iu` cho CUE/prefilter NHƯNG
   `[A-Z]` capture STRICT (blanket /i nhận nhãn thường = sai).
3. Mọi `new RegExp(\`…${name}…\`)` → `escapeRe(name)`.
4. Builder/helper FAIL-SOFT: `baseFaceOf`/parse trả null → rule bỏ clause đó (không throw); throw chỉ khi ref thật thiếu (resolveId).
5. Shape/điểm phái sinh vô danh: connect đã `registerInNameMap=false`; foot synth có tên hợp Label3DZ (registered — chấp nhận, tên `H_<x>` không trùng đỉnh).
6. `plane3d` JSXGraph nhận `[point,dir1,dir2]` toạ-độ-THÔ — chỉ ảnh hưởng khi emit plane mới; reuse path đúng (v1.5). Playwright bắt. meta.view az 1.0/el 0.6.
7. `Intent3DZ.parse` strip key lạ → constraint perpFoot* dùng `z.record` nên không bị strip; field đọc (`from/plane/a/b`) hợp lệ.

## 9. Khung metric trung thực

`diag-all-3d` FULL **có thể nhích nhẹ** (bài mà clause metric là gap DUY NHẤT — vd "Gọi H là
hình chiếu của A trên SB" claim xong → FULL) nhưng **phần lớn PARTIAL giữ nguyên** (đa số uncovered
là câu-hỏi-trị-số "nhận giá trị nào sau?" — KHÔNG ép claim, để PARTIAL đúng). **Giá trị thật =
construct ĐƯỢC VẼ** (chân ⊥ / đường cao / đường⊥mặt / mặt⊥đường / tam-giác-chiếu) — verify numeric
+ Playwright + dbg-bai, KHÔNG chỉ nhìn FullCount. Mục tiêu = chuyển NONE→PARTIAL/FULL ở cụm sạch,
**0-regression cứng**.

## 10. Ngoài phạm vi (defer → Phase 3b / 4)

- Chân ⊥ "trùng với trung điểm/trọng tâm H của …" (ràng buộc vị-trí metric + cần layout faithful).
- Góc nhị diện / "góc giữa hai mặt phẳng" / "mặt bên và đáy" (cần dựng nửa-mặt-phẳng + cung).
- Khoảng cách 2 đường thẳng chéo nhau (đoạn ⊥ chung — `intersectionLines` cho trung điểm; cần 2 chân) — 51 clause nhưng đa số câu hỏi MC, khối đã vẽ.
- "Tam giác (SAB) nằm trong mặt phẳng ⊥ đáy" (đặc tả LAYOUT vị trí đỉnh — không phải construct rule emit).
- Nhãn số đo (đã chốt KHÔNG vẽ); cung góc; màu segment k/c riêng.
- **Phase 4**: mặt cầu ngoại tiếp tâm-trên-trục (dataset tron-xoay; `sphere3d{center,surfacePoint}` đã render) — chu trình brainstorm→spec→plan riêng.
