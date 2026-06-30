// src/stamps/geometry-2d/ai/vision/repairOcrSymbols.ts
//
// Vá các lỗi NHẬN DẠNG SYMBOL đặc thù của Tesseract trên đề toán hình học VN.
// Chạy Ở TẦNG OCR (extractProblem.postProcess) — KHÔNG nhét vào normalizeText
// dùng chung, vì "L" gõ tay = điểm L, "ABCD" = tứ giác thật; luật dưới đây chỉ
// đúng trên TOKEN ĐÃ HỎNG do OCR. Xem spec:
//   docs/superpowers/specs/2026-06-29-ocr-symbol-repair-design.md
//
// Failure modes đo thực nghiệm (tesseract.js 7 vie+eng, PDF rasterize @200dpi):
//   ⊥ → 1 | L  ·  △/∆ → A dính đầu (AABC)  ·  (O) → (0)  ·  ∈ → e dính cuối list
//   ∩ → N dính ("ABN CD = {E}")  ·  ² → ? ("EF?")
// Triết lý: PRECISION-FIRST — thà bỏ sót còn hơn vá sai (vá sai đổi luôn hình).
// Lưới an toàn: user review textarea + rule engine chịu nhiễu. Hàm thuần, idempotent.

// Tên điểm/đoạn: 2-3 chữ HOA, prime optional. (1 chữ quá mơ hồ → bỏ.)
const PT = `[A-Z]{2,3}['′]?`;

// R1 — ⊥ : token đơn 1/|/L kẹp giữa hai nhóm-hoa.  "IH 1 CE" → "IH ⊥ CE"
const PERP_RE = new RegExp(
  `(?<![\\p{L}\\d])(${PT})\\s+([1|L])\\s+(${PT})(?![\\p{L}\\d])`,
  'gu',
);

// R2a — △/∆ : glyph tam giác đọc thành "A" dính đầu tên + hậu tố TAM-GIÁC-THUẦN
// (cân/đều/nhọn/vuông) NGAY sau. KHÔNG cần Cho/Xét (bắt cả "Chứng minh: APQE cân").
// Guard `(?<!giác )(?<!thang )` chặn tứ giác/hình thang cân. CỐ Ý bỏ "nội tiếp/
// ngoại tiếp" khỏi hậu tố ở đây vì tứ giác cũng "nội tiếp" → xem R2b.
const TRI_STRICT_RE =
  /(?<!giác )(?<!thang )(?<![\p{L}\d])A([A-Z]{3})\s+(đều|cân|nhọn|vuông)(?![\p{L}])/gu;

// R2b — △ABC: tín hiệu A NHÂN ĐÔI ("AABC" = △+ABC) tự PHÂN BIỆT với TỨ GIÁC
// (single-A "ABCD"). Doubled-A word-bounded (chính xác 4 ký tự, `(?![A-Z])` chặn
// "AABCD") gần như CHẮC CHẮN là △ → KHÔNG cần tính-từ ngay sau (bản cũ yêu cầu →
// miss "AABC không cân"/"AABC có AB<AC"/"AABM tiếp xúc": 16 chỗ). Tứ giác single-A
// không khớp "AA" nên không bị vá nhầm.
const TRI_DOUBLE_RE = /(?<![\p{L}\d])AA([A-Z]{2})(?![A-Z])/gu;

// R3 — (O) : tâm đường tròn O bị đọc thành số 0. Chỉ dạng bare "(0)" (né "(0;…)" toạ độ).
const CIRCLE_O_RE = /\(0\)/gu;

// R4 — ∈ : "A,B,C,De (O)" — ∈ đọc thành e dính cuối list điểm phẩy.
const ELEM_RE =
  /(?<![\p{L}\d])([A-Z](?:\s*,\s*[A-Z])+)\s*e\s*\((?:O|0)\)/gu;

// R5 — ∩ : "AB ∩ CD = {E}" → ∩ đọc thành "N" dính ("ABN CD = {E}"). Gate "= {"
// (ký hiệu tập hợp giao điểm) ⇒ rất hiếm false-positive.
const INTERSECT_RE = /([A-Z]{2,3})N\s+([A-Z]\S{0,2})\s*=\s*\{/gu;

// R6 — mũ ² : "EF²" → "EF?" (chữ HOA + "?" + toán tử). Reconstruction precision cao
// (khác "TÂU"/"<" bất khả thi). Né câu hỏi VN (chữ THƯỜNG trước "?").
const SQUARE_RE = /([A-Z])\?(?=\s*[-=+)])/gu;

// R7 — nhãn điểm C đọc thành "Ơ" (U+01A0, O-có-móc): "BƠ"→"BC", "ƠD"→"CD",
// "Gọi Ơ là"→"Gọi C là", "(Ơ)"→"(C)". Đo trên đề scan font CM (38/38 chỗ "Ơ"
// HOA = nhãn C). Gate `(?<!\p{Ll})Ơ(?!\p{Ll})` chỉ vá khi KHÔNG kề chữ THƯỜNG
// → chừa từ Việt thật ("Ơn"/"Ơi"); "ơ" thường (trơn/sơ) không bị đụng (≠ U+01A0 HOA).
const HORN_O_C_RE = /(?<!\p{Ll})Ơ(?!\p{Ll})/gu;

// ── R8-R11: rớt-dấu tiếng Việt đặc thù OCR (Tesseract vie) — GATE theo ngữ cảnh
// hình học để precision-first (chỉ vá khi gần như chắc chắn là từ hình-học). ──

// R20 — "Dường" → "Đường" (OCR rớt gạch ngang Đ HOA, U+0110 → D U+0044). Gate =
// WHITELIST danh-từ hình-học theo sau (KHÔNG dùng `(?!như\b)` vì `\b` cạnh "ư"
// Việt lỗi — bug-class \b-ASCII đã biết). Né "Dường như". Chạy TRƯỚC R8.
const DUONG_DBAR_RE =
  /D(?:ường|uong)(?= (?:tròn|tron|thẳng|kính|cao|chéo|trung|phân|vuông|nối|gấp|tâm))/gu;

// R8 — "đường tron" → "đường tròn" (g/dấu rớt). Gate `(?![\p{L}])` né "đường trong".
const DUONG_TRON_RE = /([Đđ]ường\s+)tron(?![\p{L}])/gu;

// R9 — "Ƒ" (U+0192 florin) → "F": OCR đọc nhãn điểm F thành dấu florin. Né nhầm 0.
const FLORIN_F_RE = /Ƒ/gu;

// R10 — "tai" → "tại" CHỈ khi theo sau là nhãn HOA / "(" / "điểm" (ngữ cảnh "tại
// <điểm>"). Né từ thật "tai" (lỗ tai) — không bao giờ đứng trước nhãn HOA.
const TAI_TAI_RE = /(?<![\p{L}])tai(\s+)(?=[A-Z(]|điểm)/gu;

// R11 — "tam" → "tâm" CHỈ trước "đường"/"(" (tâm đường tròn / tâm (O)). Gate này
// KHÔNG đụng "tam giác" (theo sau là "giác", không phải "đường"/"(").
const TAM_TAM_RE = /(?<![\p{L}])tam(\s+)(?=đường|\(|đối xứng)/gu;

// ── R12-R19: glyph thay-thế + rớt-dấu khác (đo trên cùng PDF, gate precision-first) ──

// R12 — "€" (euro U+20AC) → "∈": OCR đọc ∈ thành €. "C € (O)" → "C ∈ (O)". € không
// bao giờ xuất hiện hợp lệ trong đề hình.
const EURO_ELEM_RE = /€/gu;

// R13 — "||" → "∥": OCR đọc ∥ (song song) thành 2 gạch đứng. "OK || MB" → "OK ∥ MB".
const PARALLEL_RE = /\|\|/gu;

// R14 — "¢" (cent U+00A2) → "c": đọc nhãn ý "c)" / "c," thành ¢. ¢ không hợp lệ.
const CENT_C_RE = /¢/gu;

// R15 — "Ð" (Eth U+00D0, KHÁC Đ-Việt U+0110) → "D": nhãn điểm D. Gate `(?<!\p{Ll})…(?!\p{Ll})`
// chừa trường hợp Ð là Đ-Việt đầu từ ("Ðường" — theo sau lowercase → giữ nguyên).
const ETH_D_RE = /(?<!\p{Ll})Ð(?!\p{Ll})/gu;

// R16 — "Ø" (O-slash U+00D8) → "O": nhãn điểm/đường tròn O (verify ảnh gốc: "(O') cắt
// nhau"). Gate như trên (Ø không là chữ Việt nên rất an toàn).
const SLASH_O_RE = /(?<!\p{Ll})Ø(?!\p{Ll})/gu;

// R17 — "Goi" → "Gọi" ("Goi" không là từ Việt). Gate word-boundary Unicode.
const GOI_RE = /(?<!\p{L})Goi(?!\p{L})/gu;

// R18 — "Lay" → "Lấy" (động từ "lấy điểm"). Gate word-boundary.
const LAY_RE = /(?<!\p{L})Lay(?!\p{L})/gu;

// R19 — "di qua" → "đi qua" (CHỈ bigram — né "di chuyển"/"di động" hợp lệ).
const DIQUA_RE = /(?<!\p{L})di qua(?!\p{L})/gu;

// R21 — "va" → "và" (rớt dấu huyền liên từ). Gate: theo sau là nhãn HOA / "(" /
// "dây" / "đường" (ref hình học) → phủ "X va (O)"/"AB va AC"/"va dây"; CHỪA "va
// chạm"/"va li" (từ thật, theo sau lowercase-khác).
const VA_VAND_RE = /(?<!\p{L})va (?=[A-Z(]|dây|đường)/gu;

// R22 — "Trén/trén" → "Trên/trên" (OCR é↔ê trên từ "trên"). "trén" không là từ Việt.
const TREN_RE = /([Tt])rén(?![\p{L}])/gu;

// ── R23-R29: dấu/glyph đo trên PDF "Tổng hợp HHP vào 10 2018-2019" (precision-first) ──

// R23 — "dường" (thường) → "đường": bản chữ-thường của R20 (D mất gạch giữa câu, vd
// "Kẻ dường kính"/"dường cao"/"Một dường thẳng"). Gate = WHITELIST danh-từ hình-học
// theo sau ⇒ né "dường như". Chạy TRƯỚC R8 để "dường tron"→"đường tron"→"đường tròn".
const DUONG_LOWER_RE =
  /(?<![\p{L}])dường(?= (?:tròn|tron|thẳng|kính|cao|chéo|trung|phân|vuông|nối|gấp|tâm))/gu;

// R24 — "day" → "dây" (dây cung): OCR rớt dấu mũ+huyền. Gate = "Vẽ/Kẻ day <2 HOA>"
// (vẽ dây <nhãn>) hoặc "day cung". Né "day" tiếng Anh (theo sau chữ thường).
const DAY_RE = /(?<![\p{L}])day(?=\s+(?:cung(?![\p{L}])|[A-Z]{2}))/gu;

// R25 — "Chứng mình" → "Chứng minh" (OCR thêm dấu huyền vào "minh"). "Chứng mình"
// không hợp lệ (mình = self) → an toàn. Chỉ vá "mình" NGAY sau "Chứng".
const CHUNG_MINH_RE = /([Cc]hứng )mình(?![\p{L}])/gu;

// R26 — "thẳng hang" → "thẳng hàng" (rớt dấu "hàng"). Gate = sau "thẳng".
const THANG_HANG_RE = /thẳng hang(?![\p{L}])/gu;

// R27 — "Tinh" → "Tính" (mệnh lệnh "Tính <đại lượng>"). Gate = theo sau nhãn HOA /
// "do"/"độ"/đại-lượng ⇒ né danh từ "tinh" (tinh thể…) hiếm + "tỉnh"/"tình".
const TINH_RE =
  /(?<![\p{L}])Tinh(?= (?:[A-Z]|do(?![\p{L}])|độ|diện|bán|chu|số|giá))/gu;

// R28 — "do dai" → "độ dài" (rớt dấu cụm "độ dài"). Bigram word-bounded → an toàn.
const DO_DAI_RE = /(?<![\p{L}])do dai(?![\p{L}])/gu;

// R29 — "năm/nim giữa|trên" → "nằm" (rớt/đọc sai dấu "nằm"). "nim" không là từ Việt
// (gate giữa|trên|trong); "năm" (year) CHỈ vá khi "năm giữa|trên <nhãn HOA>" ⇒ né
// "năm 2018"/"trong năm".
const NIM_RE = /(?<![\p{L}])nim(?= (?:giữa|trên|trong)(?![\p{L}]))/gu;
const NAM_GIUA_RE = /(?<![\p{L}])năm(?= (?:giữa|trên) [A-Z])/gu;

// R30 — "∠" (góc) đọc thành "Z" (đôi khi tiền tố méo "4Z"). Token Z + 2-3 HOA =
// tên góc (∠DAB, ∠ABC, ∠AEO). Gate: Z PHẢI ở đầu token (`(?<![\p{L}\d])`) + theo
// sau 2-3 HOA + `(?![A-Z])` ⇒ né đoạn "AZ" (Z giữa), điểm "Z " (đứng riêng, 0 HOA
// sau), "Oz" (z thường), và cụm 4+ HOA (đề phòng nhiễu OCR như "ZGCBD"). Cùng lớp
// glyph với R12 €→∈ / R13 ||→∥. Verify ảnh p36 (Câu 24): sách in ∠, OCR ra "Z".
const ANGLE_Z_RE = /(?<![\p{L}\d])4?Z([A-Z]{2,3})(?![A-Z])/gu;

// ── R31: attribution cuối đề "(Đề xuất bởi …)" / "(Đề thi …)" (metadata) ──
// "Đề" (Đ-bar + ề) bị OCR đọc rớt-dấu thành "Dé"; động từ "xuất" méo thành
// zudt/ruất/suất. CHỈ vá trong ngoặc attribution (gate "(Dé ") → KHÔNG đụng
// "Dé dàng" (=Dễ dàng) giữa câu. R31b chuẩn hoá động-từ về "xuất" CHỈ khi có
// "bởi" (attribution người đề xuất) ⇒ "(Đề thi …)" giữ nguyên "thi".
const DE_PAREN_RE = /\(Dé /gu;
const DE_VERB_RE = /(\(Đề )\S+( bởi)/gu;
const DE_THI_LOWER_RE = /(?<![\p{L}])dé(?= thi)/gu;

// R32 — "di dong" → "di động" (điểm/đường DI ĐỘNG). Bigram word-bounded; "di dong"
// không là từ Việt (≠ "di chuyển"/"di qua" đã có R19).
const DI_DONG_RE = /(?<![\p{L}])di dong(?![\p{L}])/gu;

// R33 — "£" (bảng Anh U+00A3) → "E": OCR đọc nhãn điểm E thành £ (vạch ngang ≈ E).
// £ KHÔNG bao giờ hợp lệ trong đề hình → map về E (verify: "tại £ và F" = "E và F").
const POUND_E_RE = /£/gu;

// R34 — OCR chèn SPACE vào tên tam giác 3-đỉnh: "tam giác BC M"→"BCM", "tam giác
// K AB"→"KAB" (8 chỗ trên dataset). Phá MỌI rule cần "tam giác XYZ" liền (triangle/
// circumcircle…). Gate: NGAY sau "tam giác" + đúng 3 HOA tách 1 space (2+1 hoặc
// 1+2) + lookahead (?![A-Z\p{Ll}]) ⇒ né 4-đỉnh ("AB CD") + né nuốt từ mở câu HOA
// ("tam giác AB Cho…"). 2 nhánh cho 2 vị trí space.
const TRI_SPACE_2_1 = /(tam\s*giác\s+)([A-Z])([A-Z])\s+([A-Z])(?![A-Z\p{Ll}])/gu;
const TRI_SPACE_1_2 = /(tam\s*giác\s+)([A-Z])\s+([A-Z])([A-Z])(?![A-Z\p{Ll}])/gu;

// R35 — "Ö" (O-diaeresis U+00D6, KHÁC Đ/Ø) → "O": nhãn điểm/tâm O bị OCR đọc thành
// O-hai-chấm (verify PDF vào-10 C28: "đường thẳng qua Ö vuông góc BC" = qua O).
// Cùng lớp glyph-O với R16 Ø→O; gate `(?<!\p{Ll})…(?!\p{Ll})` chừa trường hợp Ö kề
// chữ THƯỜNG (không phải nhãn) — Ö không là chữ Việt nên rất an toàn.
const DIAERESIS_O_RE = /(?<!\p{Ll})Ö(?!\p{Ll})/gu;

// R36 — ∩ (giao) đứng RỜI sau ")" đọc thành "N": "(BMC) N AC = {C, N}" → "(BMC) ∩
// AC = {C, N}" (C40). KHÁC R5 (N DÍNH nhóm-hoa "ABN CD"): ở đây N là token RỜI
// ngay sau ngoặc đóng đường-tròn "(XYZ)". Gate "= {" (set-notation giao điểm) ⇒
// rất hiếm false-positive; né "N" làm nhãn điểm thật (không kèm "= {").
const INTERSECT_PAREN_RE = /(\([A-Z]{3}\))\s+N\s+([A-Z]{2})(\s*=\s*\{)/gu;

export function repairOcrSymbols(text: string): string {
  let t = text;
  t = t.replace(PERP_RE, '$1 ⊥ $3');
  t = t.replace(TRI_STRICT_RE, 'tam giác $1 $2');
  t = t.replace(TRI_DOUBLE_RE, 'tam giác A$1');
  t = t.replace(CIRCLE_O_RE, '(O)');
  t = t.replace(ELEM_RE, '$1 ∈ (O)');
  t = t.replace(INTERSECT_RE, '$1 ∩ $2 = {');
  t = t.replace(SQUARE_RE, '$1²');
  t = t.replace(HORN_O_C_RE, 'C');
  t = t.replace(DUONG_DBAR_RE, 'Đường'); // R20 — trước R8 để "Dường tron"→"Đường tròn"
  t = t.replace(DUONG_LOWER_RE, 'đường'); // R23 — trước R8 (chuỗi "dường tron"→"đường tròn")
  t = t.replace(DUONG_TRON_RE, '$1tròn');
  t = t.replace(FLORIN_F_RE, 'F');
  t = t.replace(TAI_TAI_RE, 'tại$1');
  t = t.replace(TAM_TAM_RE, 'tâm$1');
  t = t.replace(EURO_ELEM_RE, '∈');
  t = t.replace(PARALLEL_RE, '∥');
  t = t.replace(CENT_C_RE, 'c');
  t = t.replace(ETH_D_RE, 'D');
  t = t.replace(SLASH_O_RE, 'O');
  t = t.replace(GOI_RE, 'Gọi');
  t = t.replace(LAY_RE, 'Lấy');
  t = t.replace(DIQUA_RE, 'đi qua');
  t = t.replace(VA_VAND_RE, 'và ');
  t = t.replace(TREN_RE, '$1rên');
  t = t.replace(DAY_RE, 'dây'); // R24
  t = t.replace(CHUNG_MINH_RE, '$1minh'); // R25
  t = t.replace(THANG_HANG_RE, 'thẳng hàng'); // R26
  t = t.replace(TINH_RE, 'Tính'); // R27 — trước R28 ("Tinh do dai"→"Tính độ dài")
  t = t.replace(DO_DAI_RE, 'độ dài'); // R28
  t = t.replace(NIM_RE, 'nằm'); // R29
  t = t.replace(NAM_GIUA_RE, 'nằm'); // R29
  t = t.replace(ANGLE_Z_RE, '∠$1'); // R30
  t = t.replace(DE_PAREN_RE, '(Đề '); // R31a — trước R31b
  t = t.replace(DE_VERB_RE, '$1xuất$2'); // R31b — chỉ khi có "bởi"
  t = t.replace(DE_THI_LOWER_RE, 'đề'); // R31c
  t = t.replace(DI_DONG_RE, 'di động'); // R32
  t = t.replace(POUND_E_RE, 'E'); // R33
  t = t.replace(TRI_SPACE_2_1, '$1$2$3$4'); // R34 — join "tam giác XY Z"→"XYZ"
  t = t.replace(TRI_SPACE_1_2, '$1$2$3$4'); // R34 — join "tam giác X YZ"→"XYZ"
  t = t.replace(DIAERESIS_O_RE, 'O'); // R35 — Ö → O (nhãn tâm/điểm)
  t = t.replace(INTERSECT_PAREN_RE, '$1 ∩ $2$3'); // R36 — "(XYZ) N PQ = {" → ∩
  return t;
}
