# Deterministic-first Mức 2 — vá coverage gap + fixture matrix VN

- **Ngày:** 2026-06-06 · **Issue:** #43 · **Tiền đề:** Mức 1 (`docs/superpowers/results/2026-06-06-deterministic-first-muc1.md`)
- **Phạm vi:** mở rộng vùng phủ phrasing tiếng Việt trên backbone Mức 1. **KHÔNG đổi kiến trúc** (rule registry 14 module, coverage gate 5 lớp giữ nguyên).
- **EN language:** defer hoàn toàn → Mức 3.

## Nguyên tắc bất biến

- **Fail-safe:** mơ hồ / không nhận dạng / xung đột → KHÔNG claim → escalate AI. Thà thiếu (escalate) còn hơn render SAI im lặng.
- **Gotcha regex (Mức 1):** `\b` ASCII không khớp ký tự Việt → dùng `(?<!\p{L})…(?!\p{L})` + cờ `u`. KHÔNG cờ `i` trên regex bắt tên đỉnh (làm `[A-Z]` khớp chữ thường → rác). Keyword hoa đầu câu dùng `[Xx]`. Variant tam giác POSITIONAL theo index đỉnh.
- **Verify:** baseline `npx tsx scripts/diag-deterministic.ts scripts/probes-adversarial.txt` = **27 det / 12 escalate**; AI suite **64 suite / 666 test**. Sau mỗi gap chạy lại — escalate-đúng không tăng do regress; det tăng đúng probe mới. Full suite phải xanh.

## 6 sửa đổi (đã verify đối kháng — Workflow Phase A, 6 agent read-only)

### Gap 1 — `midpoint.ts`: "trung điểm cạnh huyền/đoạn thẳng BC"
`NAME_BEFORE_G` & `NAME_AFTER_G`: thay `(?:cạnh\s+|đoạn\s+)?` → `(?:cạnh(?:\s+huyền)?\s+|đoạn(?:\s+thẳng)?\s+)?`. Rút helper `sidePrefix` vào `_shared.ts` (tái dùng được). Fail-safe: "cạnh **thẳng**"/"đoạn **huyền**" (sai cặp) tự không khớp.

### Gap 2 — `cevian.ts`: "phân giác trong AD"
Chèn `(?:\s+trong)?` sau "phân giác" ở 2 pattern bisector forward. Pattern suffix thêm `(?:\s+trong)?(?!\s+ngoài)` — **`(?!\s+ngoài)` vá bug fail-safe**: "AD là phân giác ngoài" (external bisector, chưa hỗ trợ) hiện bị nhận nhầm thành angleBisectorFoot → phải escalate. Forward tự reject "phân giác ngoài AD" (sau "phân giác " là chữ thường "ngoài", không HOA pair).

### Gap 3 — `circleTriangle.ts`: "(O; R) ngoại/nội tiếp tam giác XYZ" (ký hiệu ngoặc)
Segmenter cắt `;` → per-clause không bao giờ thấy "đường tròn…ngoại tiếp" liền. Thêm nhánh quét **toàn đề** (`ctx.problem`, như circleRadius PAREN), gán clauseId qua helper tìm clause chứa fragment `(<center>`:
- `CIRCUM_TRI_PAREN`: `(?:đường\s*tròn\s*)?\(\s*([A-Z])\s*[;,]\s*(?![^)]*[A-Z]\s*[;,])[^()]*?\)\s*ngoại\s*tiếp\s+tam\s*giác\s+([A-Z])([A-Z])([A-Z])(?![A-Z])` → through3, center=g1.
- `INCIRCLE_TRI_PAREN`: như trên, `nội` → inscribedIn.
- Guard `(?![^)]*[A-Z]\s*[;,])` chặn paren méo `(A;B;C)`.
- Không xung đột circleRadius: R là CHỮ (circleRadius cần `\d`); `(O;5)` số → circleRadius (priority 75>72) claim, đúng ngữ nghĩa (radius là constraint chính).

### Gap 4 — `circleTriangle.ts`: "tam giác ABC ngoại tiếp đường tròn (I)" = incircle
Tam giác ngoại tiếp (circumscribes) đường tròn = đường tròn nội tiếp tam giác = **inscribedIn**, center I. Thêm vào `scanClause` (form "(I)" không có `;` nên không bị segment):
`TRI_CIRCUMSCRIBES_CIRCLE` = `tam\s*giác\s+([A-Z])([A-Z])([A-Z])(?![A-Z])[^.]{0,40}?ngoại\s*tiếp\s+đường\s*tròn\s*(?:\(\s*([A-Z])\s*\)|tâm\s+([A-Z]))?` → inscribedIn, tri=g1-3, center=g4|g5 (default 'O').
**Siết so với đề xuất agent:** "đường tròn" **BẮT BUỘC** sau "ngoại tiếp" (không optional) — phân biệt với "đường tròn ngoại tiếp tam giác" (circumcircle, "ngoại tiếp" theo sau bởi "tam giác"). Dedup `spec:tri` với "đường tròn nội tiếp tam giác".

### Gap 5 — `pointAtDistance.ts`: điểm phẩy C′ trong DIST_CLAUSE (bug thật)
`DIST_CLAUSE` `([A-Z])([A-Z])(?![A-Z])\s*=` — với "BC′ = R" khớp B,C nhưng `\s*=` gặp ký tự ′ → fail. Thêm `(?:['′]?)` sau cặp đỉnh (đồng bộ với TAKE_POINT): `([A-Z])([A-Z])(?:['′]?)(?![A-Z])\s*=`.

### Gap 6 — `perpFoot.ts`: "Kẻ AH ⊥ BC tại H" / "Kẻ AH vuông góc BC"
connect.ts SEG_KW đã emit `connect(A,H,segment)` cho "Kẻ AH" → perpFoot **chỉ** thiếu add-point H. Thêm PREFILTER `⊥|vuông\s*góc` + pattern global:
`(?:[Kk]ẻ|[Vv]ẽ|[Dd]ựng)\s+([A-Z])([A-Z])(?![A-Z])\s+(?:⊥|vuông\s*góc(?:\s+với)?)\s+(?:với\s+)?(?:đường\s*thẳng\s+|cạnh\s+|đoạn\s+)?([A-Z]{1,2})(?![A-Z])(?:\s+tại\s+([A-Z]))?`
→ from=g1, foot=g2, onLine=g3. **Chỉ** emit add-point (KHÔNG connect — tránh double với connect.ts). Skip (escalate) nếu: "tại X" (g4) tồn tại và ≠ foot(g2); hoặc foot ∈ onLine (degenerate).

## Fixture matrix

Mỗi module sửa → 5-10 biến thể phrasing đề-thi-vào-10 THẬT trong `__tests__/<name>.test.ts` cạnh module, assert `Intent[]` đúng + ≥2 ca `expectedBehavior='escalate'` chốt ranh giới fail-safe (vd "phân giác ngoài", "cạnh thẳng", "tứ giác ngoại tiếp"). Bổ sung các ca Mức 2 vào `scripts/probes-adversarial.txt` (nhóm "PHẢI render" + "PHẢI escalate") để diag harness regress-guard.

## Verify (TDD + đối kháng)

1. TDD từng gap: viết fixtures đỏ → fix regex → rule test xanh → diag harness không regress → gap kế.
2. Sau 6 gap: full AI suite xanh (≥ baseline + fixtures mới); full repo suite xanh.
3. **Workflow Phase C (đối kháng):** fan-out agent sinh ~10-15 phrasing đa dạng/ construct (render + escalate), main loop chạy qua diag harness thật, triage silent-wrong/regression → fix.

## Ngoài phạm vi (defer → Mức 3)

- EN language đầy đủ.
- "đường tròn ngoại tiếp **tứ giác**" (circle qua 4 điểm) — vẫn escalate.
- phân giác **ngoài** (external bisector), tia phân giác theo GÓC (không đặt tên chân).
- onLine tên đường chữ **thường** ('d') trong perpFoot ⊥ — escalate (giữ `[A-Z]` HOA-only).
- `(K; R)` capture center cho form "tam giác nội tiếp đường tròn (K;R)" — hiện default 'O' (latent, không phải gap mới).
