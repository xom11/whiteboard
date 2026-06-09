# Prompt: triển khai 5 miss rule-base còn lại (deterministic, KHÔNG LLM)

> Copy toàn bộ block dưới vào session Claude Code mới (mở tại repo `whiteboard`).

---

Bạn làm việc trong repo `@xom11/whiteboard`. Nhiệm vụ: **mở rộng rule engine deterministic** (`src/stamps/geometry-2d/ai/rules/`) để dựng thêm các construct vẽ hình mà hiện đang escalate sang LLM. **Mục tiêu xuyên suốt: tối đa hoá phủ deterministic để KHÔNG phải gọi LLM** (LLM chậm + tốn tiền). KHÔNG động vào hybrid/LLM Phase 2-3.

## TOÀN QUYỀN (đừng hỏi xác nhận từng bước)
- Tự lên kế hoạch, tự code, tự test, tự commit + push thẳng `main` sau mỗi task hoàn tất (1 commit/rule). KHÔNG cần hỏi tôi duyệt.
- Commit message tiếng Việt (prefix EN: `feat`/`fix`/`refactor`), **KHÔNG** thêm `Co-Authored-By`.
- Mỗi rule = 1 module `rules/<name>.ts` + 1 dòng `rules/registry.ts` + 1 test `rules/__tests__/<name>.test.ts`. KHÔNG sửa engine.
- **Definition of Done mỗi task**: (1) test rule (TDD: viết test trước) xanh; (2) e2e probe qua `tryDeterministicFigure` trả `ok:true` với đúng kind; (3) `npm run typecheck` sạch; (4) `npx jest` toàn bộ xanh (hiện ~2557 test); (5) commit + push.
- **Nếu 1 task quá phức tạp/rủi ro** (dễ sinh bug, không khớp model rule sạch): DỪNG task đó, ghi lý do vào CLAUDE.md mục gaps, chuyển task khác. Miss vẫn escalate LLM an toàn — thà defer còn hơn dựng SAI/THIẾU.

## Đọc trước khi code
- `CLAUDE.md` mục "Gotchas (AI/DSL pipeline)" — kiến trúc single-pipeline rules-first + danh sách gap.
- Rule mẫu SẠCH gần đây: `rules/excenter.ts`, `rules/parallelPerp.ts`, `rules/arcMidpoint.ts`, `rules/cevian.ts`, `rules/perpFoot.ts`, `rules/circleTriangle.ts`.
- Intent schema: `ai/intent.ts` (`AddPointIntentZ` constraint kinds, `DrawLineIntentZ`, `DrawCircleIntentZ`). Builder: `ai/intent-builders/`.
- Factory intent: `rules/_shared.ts` (`addPoint`, `connect`, `drawLine`, `drawCircle`, `drawShape`).

## GOTCHAS BẮT BUỘC
- Regex chứa ký tự Việt: dùng cờ `u` + lookaround `(?!\p{L})`/`(?<!\p{L})` — **KHÔNG dùng `\b`** (ASCII, không khớp quanh "à/đ/ề…"). Đây là bug đã gặp nhiều lần.
- KHÔNG cờ `i` trên regex bắt nhãn `[A-Z]` (sẽ nuốt chữ thường). Hoa-đầu-câu: dùng first-letter flex `[Đđ]`/`[Kk]`…
- Triết lý fail-safe: thiếu tên/tam giác/tham chiếu → **bỏ qua clause (escalate)**, KHÔNG bịa tên. "Thà escalate còn hơn dựng sai."
- Tên điểm HOA khai báo trong đề ("Gọi X"/"X là …"/đỉnh hình) PHẢI có trong DSL (guard `allNamedEntitiesPresent`) — nếu rule không dựng được điểm đã đặt tên → escalate. Tên line tự synthesize (lowercase/`parA`…) KHÔNG bị guard track.
- `_shared.ts extractPointName` NAME_LA dính bug `là\b` (trả undefined cho "X là …" không từ dẫn) — rule mới TỰ neo tên bằng regex riêng, đừng phụ thuộc nó. (Có thể fix luôn nó: `là(?!\p{L})` + chạy full suite — nhưng cẩn thận multi-"X là" trong 1 clause.)

## Phương pháp đo (data-driven, KHÔNG LLM)
`tryDeterministicFigure(problem)` (từ `deterministic/tryDeterministicFigure.ts`) là hàm THUẦN, không gọi LLM. Viết probe `npx tsx` chạy 1 loạt đề → phân loại HIT / MISS(`reason`). Reason: `no-match` (0 rule), `incomplete-coverage` (clause geo không phủ), `named-missing` (điểm đặt tên thiếu), `transpile-fail`. Dùng để xác nhận fix + tránh regress. (Đừng commit file probe — xoá sau.)

## 5 NHIỆM VỤ (làm theo thứ tự dễ→khó; làm được tới đâu commit tới đó)

### 1. angleBisectorFoot — "D là chân đường phân giác từ A" (moderate, phổ biến)
- Target intent: `addPoint('D', {kind:'angleBisectorFoot', from:'A', onLine:'BC'})` — BC = cạnh đối đỉnh A trong tam giác. Kind `angleBisectorFoot` đã có (intent + builder + render qua cevian). Phân giác NGOÀI → `externalAngleBisectorFoot`.
- Phrasing: "D là chân đường phân giác (trong)? (hạ|kẻ)? từ A (đến|xuống|trên)? BC"; "chân phân giác góc A"; suy cạnh đối từ tam giác nếu không nêu.
- Approach: rule mới `angleBisectorFoot.ts` mô phỏng `perpFoot.ts` FOOT_CORE nhưng cho "phân giác" + cần tam giác để suy cạnh đối. KHÔNG đụng cevian ("phân giác AD" inline — khác phrasing). Guard: foot trùng đỉnh → skip; "phân giác ngoài" → externalAngleBisectorFoot (hoặc defer nếu phức tạp).

### 2. Generic intersection — "D là giao điểm của AB và CE" (moderate)
- Target: `addPoint('D', {kind:'intersection', of:['AB','CE']})` (2 line ref = cặp đỉnh hoặc tên đường). Kind `intersection` đã có.
- Phrasing: "<D> là giao điểm của <ref1> và <ref2>"; "<ref1> cắt <ref2> tại <D>"; "<ref1> giao <ref2> tại <D>".
- Approach: rule mới `intersection.ts`. ref = pair "AB" hoặc tên đường 1 ký tự. CHÚ Ý phân biệt: "giao điểm của (O) và (O')" = giao 2 ĐƯỜNG TRÒN → kind `circleIntersection`/`circleSecondIntersection` (khác) → để nhánh đó cho rule khác / defer. Guard: ref chứa chính D → vô nghĩa.

### 3. circle + chord — "đường tròn (O), dây AB" (moderate)
- Target: circle tâm O + A,B nằm TRÊN circle (`onCircle`) + dây = segment AB. Kind `onCircle` đã có (`{kind:'onCircle', circle:'O', theta?}`).
- Vấn đề: "(O)" KHÔNG bán kính. Kiểm tra cách biểu diễn circle chỉ-tâm (xem `resolveCircleNames` + circle spec trong intent/dsl — có thể cần centerRadius với R mặc định, hoặc circle vẽ ngầm từ tâm). Có thể phải thêm circle spec "centerOnly default R".
- Phrasing: "đường tròn (O), dây AB"; "dây cung AB của (O)"; "AB là dây của đường tròn (O)".
- Approach: rule mới `chord.ts` (hoặc mở rộng circleRadius). Emit circle (O) + onCircle A,B + connect A-B. Nếu biểu diễn circle-chỉ-tâm khó → defer, ghi lý do.

### 4. arcMidpoint implied circumcircle — "M là trung điểm cung BC" (không nêu (O)) (moderate)
- Hiện `arcMidpoint.ts` trả `[]` nếu `resolveCircle` undefined. Khi có TAM GIÁC mà cung BC dùng 2 đỉnh của nó → đường tròn ngầm = circumcircle.
- Approach: trong arcMidpoint, nếu không có circle NHƯNG có tam giác chứa cặp cung → emit THÊM circumcircle (`drawCircle('O','through3',{points:tri})`) + arcMidpoint ref 'O'. Synthesize tên 'O' (tránh collision: nếu đã có điểm/đường tên O thì chọn tên khác hoặc skip). Rủi ro: bịa circle khi đề không muốn → chỉ làm khi cung trùng 2 đỉnh tam giác (tín hiệu mạnh).

### 5. perpBisector ∩ line — "đường trung trực BC cắt AB tại D" (HARD — làm cuối, defer nếu rối)
- Cần: dựng đường trung trực BC (named line) + điểm D = giao(trung_trực, AB). Kind `intersection` of 2 line ref, nhưng 1 ref là ĐƯỜNG DỰNG (perpBisector) → phải đặt TÊN cho perpBisector rồi intersection ref tên đó.
- Approach: mở rộng `perpBisector.ts` bắt "… cắt <line> tại <D>" → emit perpBisector (named) + intersection D. Tổng quát hoá họ "đường-dựng cắt … tại" (đường cao, phân giác…). PHỨC TẠP — nếu không sạch thì DEFER, ghi CLAUDE.md.

## Kết thúc
- Re-scan coverage corpus (mở rộng 22 đề + vài đề mới cho mỗi construct), báo cáo HIT trước/sau.
- Cập nhật CLAUDE.md mục gaps (đánh dấu ✅ done / defer + lý do) + memory `project_ai_rule_engine_wire_cleanup.md`.
- Tóm tắt: rule nào ship, coverage tăng bao nhiêu, gì còn defer.
