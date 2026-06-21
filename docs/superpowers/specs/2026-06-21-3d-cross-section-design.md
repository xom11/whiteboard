# Thiết kế: Phase 2 — Thiết diện (cross-section) 3D

> Ngày: 2026-06-21 · Nhánh: `feat/3d-foundation` · Trạng thái: APPROVED (brainstorm)
> Tiếp nối spec nền `docs/superpowers/specs/2026-06-21-3d-figure-pipeline-design.md` §6 (Phase 2).

## 1. Mục tiêu

Dựng **thiết diện** (mặt phẳng cắt khối → đa giác giao) cho pipeline Text→Hình-3D, mirror
discipline foundation: TDD per-rule + probe `diag-all-3d` dịch (before/after) + Playwright
render-verify + 0-regression toàn jest.

**Baseline (HEAD `117558f`, đã xác nhận):**

| Dataset | FULL | PARTIAL | NONE | Total |
|---|---|---|---|---|
| **ss-thietdien** (đích Phase 2) | 30 | 176 | 35 | 241 |
| vuonggoc | 104 | 205 | 59 | 368 |
| tron-xoay | 15 | 30 | 44 | 89 |
| **TOTAL** | **149** | **411** | **138** | 698 |

Đòn bẩy: **176 PARTIAL** ở ss-thietdien — setup (chóp/lăng trụ + điểm) render được nhưng
construct thiết diện/giao-tuyến còn thiếu. Phase 2 nhắm chuyển PARTIAL→FULL ở cụm này.

## 2. Quyết định kiến trúc (chốt qua brainstorm)

| Vấn đề | Chốt | Lý do |
|---|---|---|
| Biểu diễn thiết diện | **B — derived per-vertex** (điểm phái sinh edge∩plane + `polygon3d`) | Edge-walk + sắp đỉnh là chi phí bắt buộc → làm 1 lần lúc build; toạ độ live "free" qua điểm phái sinh; khớp triết lý v1.5 |
| Kind core mới | **KHÔNG** — reuse `intersectionLinePlane{a,b,plane}` | Kind đã có, ngữ nghĩa khớp tuyệt đối (line(a,b)∩plane) |
| Render-capability mới | **KHÔNG** — `polygon3d` trên id điểm phái sinh đã live-update | `polygon3d.ts` truyền object điểm đã resolve; điểm phái sinh dùng function-coord + `needsRegularUpdate` |
| Phạm vi rule | **Core + mặt song song** (cụm ①④⑥ + ③⑦) | Mặt song song là ca 3D đặc thù giá trị cao, dùng chung 1 builder section |
| Topology khi kéo | Cố định lúc build (chỉ sai nếu kéo mặt cắt qua đỉnh đổi số cạnh — hiếm) | Đánh đổi chấp nhận được cho hình SGK; không chặn Option C về sau |
| `Intent3DZ.parse` | Wire 1 dòng ở đầu vòng `intentToScene3d` như **hygiene**, KHÔNG phải gate | Pipeline an toàn nhờ discriminated-union + `Record<op,builder>` exhaustive |

**Sự thật substrate đã xác minh tận file/line:**
- `intersectionLinePlane{a:string, b:string, plane:string}` — `3d-constraint.ts:22`; refs `[c.a,c.b,c.plane]` (line 37).
- `polyhedron3d` attrs `{flavor, vertices: string[], faces: number[][], color?}` — `polyhedron3d.ts:7`. `faces` = index arrays vào `vertices`, mỗi face là **ring**.
- `plane3d` attrs `{p1?,p2?,p3?, construction?}`; construction kinds `planeParallelThrough{point, refPlane}` / `planePerpToLine{point, lineA, lineB}` — `plane3d.ts:12`. Builder hiện đã hỗ trợ `threePoints` + `parallelThrough` + `perpToLine` (`intent-builders/plane.ts`).
- Helper export được: `constraintToWorld(c, state): Vec3` (`constraint3d-math.ts:206`) và `planeConstructionWorld(c, state): {p1,p2,p3: Vec3}` (line 77). **`getPlaneBasis`/`planeOriginNormal`/`getPointWorld` KHÔNG export** → builder tự tính khung mặt từ 3 điểm world.

## 3. Thuật toán section (chạy 1 lần lúc build; toạ độ điểm vẫn live ở render)

Input: `solidId` (polyhedron3d), `planeId` (plane3d). Output: danh sách id đỉnh thiết diện đã
sắp + 1 `polygon3d`.

**Helper builder-local `planeFrame(planeId, state)`:**
- Nếu plane có `construction` → `{p1,p2,p3} = planeConstructionWorld(construction, state)`.
- Nếu plane threePoints → world của p1,p2,p3 = `constraintToWorld(obj.attrs.constraint, state)` cho từng point id.
- `origin = p1`; `normal = normalize((p2−p1) × (p3−p1))`; basis `u = normalize(p2−p1)`, `v = normalize(normal × u)`.

**Bước:**
1. **Liệt kê cạnh** khối: với mỗi `face` (ring index) → cặp `(face[i], face[(i+1)%len])`; dedup theo cặp-không-thứ-tự `min,max`. Trả `vertices[a],vertices[b]` (point id).
2. **Phân loại đỉnh khối:** world `V = constraintToWorld(vertexConstraint, state)`; `d = dot(V−origin, normal)`. `|d| < EPS` (EPS=1e-6) ⇒ đỉnh **nằm trên mặt** → là đỉnh thiết diện, **reuse id** (xử lý ca "(SAC)" qua đỉnh sẵn có; không tạo điểm trùng).
3. **Cạnh cắt:** với cạnh `(a,b)` mà `dA·dB < 0` (đổi dấu **chặt**, cả hai ≠0) → emit điểm cắt phái sinh `point3d{constraint:{kind:'intersectionLinePlane', a, b, plane:planeId}}`. (Cạnh có 1 đầu trên mặt → KHÔNG tính cắt; đỉnh đó đã thu ở bước 2. Cạnh cả hai trên mặt → cạnh nằm trong mặt, hai đầu đã thu ở bước 2.)
4. **Sắp đỉnh quanh chu vi:** với mỗi đỉnh thiết diện (world `P`): toạ độ phẳng `(dot(P−origin,u), dot(P−origin,v))`; tâm = trung bình; sort theo `atan2(y−cy, x−cx)`. Khối lồi ∩ mặt = đa giác lồi ⇒ angular-sort cho đúng thứ tự chu vi.
5. **Guard suy biến:** nếu `<3` đỉnh thiết diện → `throw IntentBuilder3DError` (escalate; partial render giữ phần còn lại).
6. **Emit** `polygon3d` trên id đã sắp. Polygon vô danh + điểm cắt vô danh → `addShape3dObj(..., registerInNameMap=false)` (gotcha nhãn). Nếu đề đặt tên thiết diện → register.

## 4. Intent op `cross-section`

```ts
const CrossSectionIntentZ = z.object({
  op: z.literal('cross-section'),
  name: Label3DZ.optional(),       // tên thiết diện nếu đề đặt (hiếm)
  plane: Label3DZ,                  // tên mặt cắt (tham chiếu plane3d)
  solid: Label3DZ.optional(),      // tên khối; mặc định = polyhedron3d DUY NHẤT trong scene
});
// thành viên thứ 6 của Intent3DZ = z.discriminatedUnion('op', [...])
// helper: export function crossSection3d(spec): Intent3DT
```

## 5. Builder `intent-builders/crossSection.ts`

`buildCrossSection(s: BuildState3D, intent)`:
1. `planeId = resolveId(s, intent.plane)`.
2. `solidId = intent.solid ? resolveId(...) : <polyhedron3d duy nhất trong store; nếu 0 hoặc >1 → throw>`.
3. Chạy thuật toán §3 (đọc world qua `s.store.getState()`).
4. Đăng ký vào `OP_BUILDERS_3D` (1 dòng — compile-enforced bởi `Record<Intent3DT['op'], IntentBuilder3D>`).

## 6. Rules (`rules/crossSection.ts` + reuse) — phạm vi Core + mặt song song

Mỗi match emit **chuỗi intent** (topo `intentTopo3d` tự sắp; cross-section phụ thuộc plane + solid).

| Cụm | Phrasing (đại diện) | Intent emit | ~Tần suất |
|---|---|---|---|
| ① mặt 3 điểm | "thiết diện … (MCD)", "(SBD)" | `plane(auto,{threePoints,M,C,D})` + `cross-section{plane:auto}` | 19% |
| ④ cắt bởi | "… cắt bởi (mp) (IJK)" | như ① | 8% |
| ⑥ giao điểm | "giao điểm của MN với (BCD)" | `add-point{intersectionLinePlane,a:M,b:N,plane:(BCD)}` (building block) | 5% |
| ③ song song mặt | "(α) qua M song song (SBC)" | `plane(SBC,{threePoints})` + `plane(α,{parallelThrough,point:M,refPlane:SBC})` + `cross-section{plane:α}` | một phần 10% |
| ⑦ gọi (α) | "Gọi (α) là mp chứa MN song song CD" | (xem ghi chú dưới) | 4% |

- **Tên mặt auto:** 3 chữ trong ngoặc `(MCD)` → tên plane synth (vd `mp_MCD`), p1/p2/p3 = M,C,D (mỗi chữ là vertex hoặc điểm đã định nghĩa trước; topo sắp sau định nghĩa của chúng).
- **Solid mặc định:** bỏ field `solid` → builder lấy khối duy nhất.
- **Cụm ⑦ / "chứa MN ∥ CD"** (mặt qua *đường* song song *đường* khác): plane spec hiện có là `threePoints|parallelThrough(refPlane)|perpToLine` — **CHƯA có** spec "qua-line-song-song-line". Quyết định lúc plan: nếu thêm spec rẻ (1 construction kind) thì làm; nếu không → **DEFER fast-follow** (ghi log NONE/PARTIAL, không cố ép). Brainstorm đã chốt "include nếu rẻ, else fast-follow".
- Giao tuyến (cụm ②) đã xong ở foundation (`intersectionLine.ts`) — Phase 2 chỉ đảm bảo compose, không sửa.
- Regex tiếng Việt: cờ `u` + lookaround `(?!\p{L})`; mọi `new RegExp(\`…${name}…\`)` bọc `escapeRe(name)`.

## 7. Verify

- **`verify3d.ts` thêm:** với mỗi `polygon3d` sinh từ cross-section — (a) mọi đỉnh **coplanar** với mặt cắt (`|dot(V−origin,normal)| < tol`); (b) điểm cắt phái sinh **on-edge** (`t∈[0,1]`); (c) polygon **≥3 đỉnh**, diện-tích > 0 (không suy biến).
- **Playwright** `tests/e2e/geometry-3d-figure.spec.ts` (mở rộng): load 1 bài thiết diện (vd chóp S.ABCD + mặt (MCD)), mount `view3d` thật, assert polygon3d thiết diện render **không lỗi `plane3d`**, đúng số đỉnh kỳ vọng. Bắt buộc lúc dev (bug-class plane3d `[point,dir1,dir2]` ẩn khỏi unit-mock).

## 8. `Intent3DZ.parse` (hygiene, song song — không gate)

Thêm `Intent3DZ.parse(intent)` 1 dòng đầu vòng lặp `intentToScene3d` để validate intent untrusted (chuẩn bị LLM fallback tương lai). Rule tin cậy hiện tại vẫn pass. Làm như task riêng nhỏ, không chặn ship cross-section.

## 9. Insertion points (7 site — mirror cách thêm op `line`)

1. `rules/crossSection.ts` (mới) + 1 dòng `rules/registry.ts` (`ALL_RULES_3D`).
2. `intent.ts`: `CrossSectionIntentZ` + thành viên thứ 6 của `Intent3DZ` + helper `crossSection3d`.
3. `intent-builders/crossSection.ts` (mới) + 1 dòng `intent-builders/registry.ts` (`OP_BUILDERS_3D` — compile-enforced).
4. `intentTopo3d.ts`: cross-section produce = `name?`; consume = `plane`, `solid?` → build sau plane + solid.
5. `verify3d.ts`: 3 check §7.
6. `tests/e2e/geometry-3d-figure.spec.ts`: case thiết diện.
7. `intentToScene3d.ts`: (hygiene §8) `Intent3DZ.parse`.

## 10. Testing (y đúc 2D)

- **Unit per-rule** `rules/__tests__/crossSection.test.ts`: match() + intent shape + coverage claim (gồm ca threePoints, cắt-bởi, parallelThrough).
- **Builder/algo** `__tests__/intentToScene3d.crossSection.test.ts`: numeric — chóp vuông S.ABCD cắt (MCD) (M trung điểm SA) → polygon 4 đỉnh (hoặc 3 tuỳ vị trí), mọi đỉnh coplanar, đỉnh reuse C,D bằng id sẵn có; tứ diện cắt qua 1 trung điểm → tam giác; lăng trụ cắt ngang → tứ giác; ca <3 đỉnh → throw.
- **Probe** `npx tsx scripts/diag-all-3d.ts` → ghi before/after FULL/PARTIAL/NONE (đặc biệt ss-thietdien).
- **Debug 1 bài** `npx tsx scripts/dbg-bai-3d.ts ss-thietdien <id>`.
- **Jest worktree** `npx jest -c jest.worktree.config.js` (0-regression toàn bộ).

## 11. Rủi ro & giảm thiểu

- **plane3d `[point,dir1,dir2]`**: chỉ ảnh hưởng nếu emit plane mới — builder reuse path plane3d đã đúng (v1.5). Playwright bắt.
- **Đỉnh trên mặt vs cạnh cắt nhầm lẫn (EPS)**: layout canonical → toạ độ tất định; EPS=1e-6 an toàn. Test ca "(SAC)" (3 đỉnh đều trên mặt).
- **Khối lõm**: angular-sort sai cho non-convex. Dataset SGK hầu hết lồi (chóp/lăng trụ/hộp/tứ diện). DEFER non-convex; guard: nếu cần, kiểm lồi → escalate.
- **Topology-change-on-drag**: cố định lúc build (đã chốt). Không xử lý trong Phase 2.
- **Cụm ⑦ line-∥-line**: DEFER nếu spec đắt (§6).

## 12. Ngoài phạm vi (defer)

- Cụm ⑤ đa-ràng-buộc "(P) qua AI cắt SB,SD lần lượt tại M,N" (đặt tên điểm cắt) — semi-structured, Phase 2b.
- Mặt cắt khối lõm / general-position; hidden-line; topology-change-on-drag (Option C).
- Mặt cắt khối tròn xoay (nón/trụ/cầu) — thuộc Phase 4 nếu cần.
