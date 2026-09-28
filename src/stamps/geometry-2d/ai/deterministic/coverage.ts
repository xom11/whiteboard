// src/stamps/geometry-2d/ai/deterministic/coverage.ts
//
// Clause segmentation + coverage cho deterministic-first gate.
// Track A chỉ "tự tin" dùng kết quả khi MỌI clause mang nội dung hình học
// đều được ít nhất 1 rule match claim. Còn sót → escalate AI.
import { countGeometryKeywords } from './vocabulary';

export interface Clause {
  id: number;
  text: string;
  /** clause chứa ≥1 từ khoá hình học → tính vào mẫu số coverage. */
  hasGeometry: boolean;
}

export interface CoverageReport {
  complete: boolean;
  coveredClauseIds: number[];
  uncovered: Clause[];
  ratio: number;
}

interface MatchLike {
  clauseIds: number[];
}

// Mask dấu câu KHÔNG phải ranh giới clause trước khi split, unmask sau khi split.
// Sentinel = control char không bao giờ xuất hiện trong đề.
// MASK_SEMI_LIST (): ";" được nhận diện là PHÂN CÁCH PHẦN TỬ LIST (case 2/3)
// → unmask về "," (dấu phân cách list chuẩn) thay vì ";" để rule distributive (viết
// theo ",") thấy đúng danh sách. KHÁC MASK_SEMI (";" trong "(O;R)") vốn PHẢI giữ ";".
const MASK_SEMI = '\u0001';
const MASK_DOT = '\u0002';
const MASK_COMMA = '\u0003';
const MASK_SEMI_LIST = '\u0004';

// 1) Dấu ;/./, BÊN TRONG ngoặc ngắn không lồng: "(O;R)", "(M, N thuộc đường tròn;
//    AM khác AN)" — chú thích/tên đường tròn, không phải ranh giới clause. Giới hạn
//    ≤40 ký tự để ngoặc OCR không cân "(O. Gọi…" không nuốt phần sau.
// 2) ";" giữa phần tử LIST ("đường cao AD; BE; CF cắt nhau tại H"): ";" theo sau là
//    token điểm/đoạn ngắn rồi tới ";" "," "lần lượt" hoặc "cắt nhau"/"đồng quy"/"đôi
//    một" → phân cách liệt kê. ";" trước mệnh đề thật ("…tại E; AE và BC kéo dài…")
//    vẫn split vì sau token là TỪ thường ("và", "kéo"…).
// 3) ";" giữa hai nhãn HOA cuối directive distributive ("… ⊥ AB; AC.", "… xuống
//    AB; AC", "… ⊥ AD; DB; AB."): ";" theo sau là nhãn HOA rồi NGAY tới ";" "," "."
//    hoặc hết chuỗi (KHÔNG có từ thường xen vào) → vẫn là phần tử list, không phải
//    ranh giới. "tại E; AB là tiếp tuyến" KHÔNG khớp vì sau "AB" là " là" (từ thường).
function maskNonBoundaryPunct(s: string): string {
  return s
    .replace(/\(([^()\n]{1,40})\)/g, (m) =>
      m.replace(/;/g, MASK_SEMI).replace(/\./g, MASK_DOT).replace(/,/g, MASK_COMMA),
    )
    .replace(
      /;(?=\s*[A-Z][A-Z]?['′]?\d?\s*(?:[;,]|lần lượt|cắt nhau|đồng quy|đôi một))/gu,
      MASK_SEMI_LIST,
    )
    .replace(/;(?=\s*[A-Z][A-Z]?['′]?\d?\s*(?:[;,.]|$))/gu, MASK_SEMI_LIST);
}

function unmask(s: string): string {
  return s
    .replace(/\u0001/g, ';')
    .replace(/\u0002/g, '.')
    .replace(/\u0003/g, ',')
    .replace(/\u0004/g, ',');
}

/**
 * Tách đề thành clause theo dấu câu (. ; xuống dòng) và dấu phẩy đứng trước
 * từ dẫn ("Gọi", "Vẽ", "Kẻ"…). Clause thuần văn xuôi (không từ khoá hình học)
 * vẫn được giữ nhưng `hasGeometry=false` để không ép escalate.
 */
export function segmentClauses(problem: string): Clause[] {
  // Comma-split lookahead: tách clause ở dấu phẩy đứng TRƯỚC từ dẫn. VN dùng
  // (Gọi|Vẽ|Kẻ|Cho|Lấy|Dựng|trên|với). EN ADDITIVE (issue #46 group B): các từ
  // dẫn sub-clause viết HOA đầu câu (Let|Draw|Mark|Take|Construct|Join) — "Triangle
  // ABC, let M be the midpoint of BC" tách thành 2 clause. Thuần additive: không
  // đổi segmentation VN (alternation rời nhau, không trùng từ).
  let proofMode = false;
  let truocLaDinhNghiaVecto = false;

  return maskNonBoundaryPunct(problem)
    .split(
      // (?!\p{L}) thay \b: "Vẽ"/"Kẻ" kết thúc bằng chữ Việt — \b ASCII không bao
      // giờ khớp trước space → split chết im lặng (bug class \b+tiếng Việt).
      // "?" kết thúc câu hỏi (giữ lại dấu — QUESTION_CLAUSE cần nó): "a) Tứ giác BFCH là
      // hình gì? b) Gọi M là …" (xuống dòng đã bị gộp) phải tách thành 2 mệnh đề.
      /[.;\n]+|(?<=\?)\s*|,\s*(?=(?:Gọi|Vẽ|Kẻ|Cho|Lấy|Dựng|trên|với|Let|Draw|Mark|Take|Construct|Join)(?!\p{L}))/u,
    )
    .map((s) => unmask(s).trim())
    .filter((s) => s.length > 0)
    .map((text, id) => {
      const hasGeometryKeyword =
        countGeometryKeywords(text) > 0 ||
        NAMED_LINE_PICK.test(text) ||
        (BARE_SEG_PICK.test(text) && !/tia\s+đối/u.test(text)) ||
        (VECTOR_POINT_DEF.test(text) && !VECTOR_KHONG_DUNG.test(text)) ||
        GIVEN_POINTS.test(text);
      const proofOnly = isProofOnlyClause(text, proofMode);
      if (startsProofSection(text)) proofMode = true;
      // Mệnh đề LOCUS ("điểm A di chuyển/di động trên (O)") = điều kiện chuyển
      // động trên điểm ĐÃ dựng (đỉnh), KHÔNG phải construct → loại khỏi coverage.
      const locusOnly = LOCUS_CLAUSE.test(text) && !CONSTRUCTION_LEAD.test(text);
      // "ba điểm G, H, K thỏa mãn: vectơ KA + vectơ KC = vectơ 0; vectơ GA + … = vectơ 0; …"
      // — các đẳng thức sau dấu ";" vẫn là định nghĩa điểm (mệnh đề trước đã giới thiệu).
      const tiepDinhNghia = truocLaDinhNghiaVecto && DANG_THUC_VECTO_TRAN.test(text) && !proofOnly;
      const laDinhNghia = (VECTOR_POINT_DEF.test(text) && !VECTOR_KHONG_DUNG.test(text)) || tiepDinhNghia;
      truocLaDinhNghiaVecto = laDinhNghia;
      return { id, text, hasGeometry: (hasGeometryKeyword || tiepDinhNghia) && !proofOnly && !locusOnly };
    });
}

// Tiền tố đánh số mục: "1.", "2)", "a)", "b.", "II." — có thể lặp ("1. a)").
// Strip trước khi nhận diện từ dẫn proof/construction (đề thi hay đánh số câu/ý).
const ENUM_PREFIX = '(?:[0-9]+\\s*[.)]?\\s*|[a-zA-Z]\\s*[.)]\\s*)*';

// Locus: "(Điểm)? X di chuyển/di động trên (O)/cung/đường tròn" — điểm chạy
// trên đường tròn/cung thường là ĐỈNH đã dựng (animation), KHÔNG construct mới.
// NHƯNG "di chuyển/di động trên cạnh/đoạn AC" GIỚI THIỆU điểm free mới (P) cần
// dựng để các construct sau (BP, …) có ref hợp lệ → KHÔNG coi là locus.
const LOCUS_CLAUSE = /(?:di\s*chuyển|di\s*động)\s+trên\s+(?:\(|đường\s*tròn|đương\s*tròn|cung|nửa)/u;

// "Trên d lấy điểm M" / "Trên đường thẳng d lấy điểm M" / "Lấy điểm C trên d"
// — điểm tự do trên ĐƯỜNG ĐẶT-TÊN-THƯỜNG (token chữ thường 1-2 + số tuỳ chọn:
// d, d1, Δ→hiếm). Vocab không có signal cho clause này (toàn token tên + "lấy"
// chung chung) → hasGeometry=false → không vào rule engine dù onSegmentPoint ĐÃ
// có nhánh named-line → điểm M không dựng → cascade (vao10:123, vao10:248).
// Signal HẸP: BẮT BUỘC có đường tên thường liền "trên/thuộc" — KHÔNG bắt
// "lấy điểm" chung chung (substring vocab gây regression). `(?![\p{L}])` neo
// để token 1-2 chữ thường KHÔNG nuốt "cạnh"/"cung"/"tia"/"đường tròn"
// (chữ tiếp theo là ký tự Việt → fail).
const NAMED_LINE_PICK =
  /(?:[Tt]rên|[Tt]huộc)\s+(?:đường\s*thẳng\s+)?[a-z]{1,2}[0-9]?(?![\p{L}])\s+(?:[Ll]ấy|có)|[Ll]ấy\s+điểm\s+[A-Z]['′]?[0-9]?\s+(?:trên|thuộc)\s+(?:đường\s*thẳng\s+)?[a-z]{1,2}[0-9]?(?![\p{L}])/u;

// "Lấy/Trên … <cặp HOA> … lấy/trên" — điểm trên đoạn nêu bằng CẶP ĐỈNH (KHÔNG có
// chữ "cạnh/đoạn/thuộc" nên countGeometryKeywords=0 → clause bị coi văn xuôi dù
// onSegmentPoint ĐÃ có nhánh). 2 dạng:
//   A. tên-TRƯỚC:  "Lấy E, F bất kì trên AB và AC" / "Lấy D bất kì trên BC"
//   B. đoạn-TRƯỚC: "Trên AB, AC lấy D, E" / "Trên ME, MO lấy C, D"
// Signal HẸP: BẮT BUỘC "lấy"/"trên" KỀ cặp HOA [A-Z]{2} (neo (?![A-Z]) để KHÔNG
// nuốt đỉnh thứ 3 của tam giác ABC). KHÔNG bắt "lấy" chung chung (substring vocab
// gây regression). Loại "tia đối" để oppositeRayPoint giữ phận sự.
const BARE_SEG_PICK =
  /[Ll]ấy\s+(?:điểm\s+)?[A-Z]['′]?(?:\s*,\s*[A-Z]['′]?)?\s+(?:bất\s*k[iìyỳ]\s+)?(?:trên|thuộc)\s+(?:cạnh\s+|đoạn\s+|tia\s+)?[A-Z]{2}(?![A-Z])|[Tt]rên\s+(?:cạnh\s+|đoạn\s+|tia\s+)?[A-Z]{2}(?:\s*,\s*[A-Z]{2})*\s+(?:(?:theo\s+)?thứ\s+tự\s+|lần\s*lượt\s+)?lấy\s+(?:các\s+)?(?:điểm\s+)?[A-Z]/u;

// Điểm ĐỊNH NGHĨA bằng đẳng thức vectơ (Toán 10): "Gọi I là điểm thoả mãn vectơ IA
// + 2 vectơ IB = vectơ 0", "điểm M sao cho vectơ MA = 2 vectơ MB". Không từ khoá
// hình nào ⇒ trước đây bị coi văn xuôi: hình "đủ" mà thiếu hẳn điểm I. Signal HẸP:
// phải có điểm được giới thiệu ("điểm X" / "X là điểm") + "vectơ" + "=".
const VECTOR_POINT_DEF =
  /(?:[Đđ]iểm\s+[A-Z](?![A-Z])|(?<![A-Z])[A-Z]['′]?\s+(?:lần\s*lượt\s+)?là\s+(?:một\s+|các\s+|hai\s+)?điểm)[^.;]*?[Vv][eé]c\s*-?\s*t[ơo](?!\p{L})[^.;]*=/u;

// "Với M là điểm tùy ý, chứng minh rằng vectơ MA + … = 4 vectơ MO": M bất kỳ trong
// một mệnh đề CHỨNG MINH — không phải điểm cần dựng.
const DANG_THUC_VECTO_TRAN = /^[-−+\d\s/.,]*[Vv][eé]c\s*-?\s*t[ơo](?!\p{L})[^.;]*=[^.;]*$/u;
const VECTOR_KHONG_DUNG = /t[uù][ỳy]\s*ý|bất\s*k[ìỳiy]|[Cc]hứng\s*minh|với\s+mọi/u;

// "Cho ba điểm A, B, C phân biệt" / "Cho hai điểm A và B" — đề chỉ có điểm trần
// (chương Vectơ lớp 10), không từ khoá hình nào ⇒ clause bị coi văn xuôi và các
// điểm không bao giờ được dựng (givenPoints). Neo đầu mệnh đề "Cho".
const GIVEN_POINTS =
  /^(?:[0-9]+\s*[.)]\s*)?[Cc]ho\s+(?:(?:\d|hai|ba|bốn|năm|sáu)\s+)?điểm\s+(?:phân\s+biệt\s+)?[A-Z](?![A-Z])(?:\s*(?:,|và)\s*[A-Z](?![A-Z]))+/u;

// "Hãy tính/tìm/chứng minh …" là câu hỏi, không phải dựng hình (SGK lớp 8/10).
// "C/m"/"CMR" — viết tắt "Chứng minh (rằng)" phổ biến trong đề OCR (vao10:254
// "a.C/m: Bốn điểm…"); thiếu nó clause proof bị coi geo-clause → escalate oan.
const PROOF_SECTION_START = new RegExp(
  `^${ENUM_PREFIX}(?:[Cc]hứng\\s*minh|C/m|CMR|[Tt]ính|[Tt]ìm|[Xx]ác\\s*định|[Hh]ãy\\s+(?:xác\\s*định|chỉ\\s+ra|chia|tìm|tính|biểu\\s+(?:thị|diễn)|viết|gọi\\s+tên|so\\s+sánh|chứng\\s+minh))(?!\\p{L})`,
  'u',
);

const CONSTRUCTION_LEAD = new RegExp(
  `^${ENUM_PREFIX}(?:[Cc]ho|[Gg]ọi|[Vv]ẽ|[Kk]ẻ|[Ll]ấy|[Dd]ựng|[Qq]ua|[Tt]ừ|[Tt]rên|[Nn]ối|[Đđ]ường\\s*thẳng\\s+(?:đó|này)|Let|Draw|Mark|Take|Construct|Join)(?!\\p{L})`,
  'u',
);

// Ý con mở đầu bằng một GIAO ĐIỂM đặt tên ("b) Tia ED cắt tia AH tại K", "AB cắt DE
// tại I") là dựng hình, không phải chứng minh — trước đây trong proofMode nó bị coi
// văn xuôi nên K không được dựng dù ý sau dùng K ("Gọi I là trung điểm của KC").
const CUT_LEAD = new RegExp(
  `^${ENUM_PREFIX}(?:(?:[Tt]ia\\s+|[Đđ]ường\\s*thẳng\\s+)?[A-Z]{2}\\s+cắt\\s+(?:tia\\s+|đường\\s*thẳng\\s+|cạnh\\s+|đoạn\\s+(?:thẳng\\s+)?)?[A-Z]{2}|(?:[Tt]ia|[Đđ]ường\\s*thẳng)\\s[^.;]{0,50}?\\scắt\\s[^.;]{0,30}?)\\s+(?:lần\\s*lượt\\s+)?(?:tại|ở)\\s+(?:điểm\\s+)?[A-Z](?![\\p{L}\\d'′])`,
  'u',
);
// Mệnh đề DỰNG HÌNH nằm GIỮA phần chứng minh (đề vào 10 nhiều ý: "b) Đường thẳng
// qua E vuông góc với BC cắt tia AF tại G. Chứng minh …", "c) Tia FE cắt (O) tại
// P", "Hai đoạn thẳng CM và HN cắt nhau tại T") — không mở bằng từ dẫn dựng hình
// nên trước đây bị coi là câu chứng minh → BỎ QUA IM LẶNG: hình báo "đủ" mà thiếu
// G/K/T. Nhận diện HẸP: chủ ngữ là đường/tia/tiếp tuyến/đoạn/dây/cặp đỉnh, có
// "cắt … tại|ở <điểm>", và KHÔNG chứa động từ chứng minh/tính/tìm hay dấu "?".
// Thêm "CD là đường kính (của (O))" (định nghĩa đầu mút D).
const MID_PROOF_CONSTRUCTION = new RegExp(
  `^${ENUM_PREFIX}` +
    `(?:(?:(?:[Đđ]ường|[Tt]ia|[Tt]iếp\\s*tuyến|[Hh]ai|[Cc]ác|[Đđ]oạn|[Dd]ây|[Cc]át\\s*tuyến|[Nn]ửa)(?!\\p{L})|[A-Z]{2}(?![\\p{L}]))` +
    `[^]*cắt[^]*(?:tại|ở)\\s+(?:(?:hai\\s+|các\\s+)?điểm\\s+(?:thứ\\s+hai\\s+)?)?(?:là\\s+)?[A-Z](?!\\p{L})` +
    `|[A-Z]{2}\\s+là\\s+(?:một\\s+)?đường\\s*kính)`,
  'u',
);
const PROOF_WORD = /[Cc]hứng\s*(?:minh|tỏ)|CMR|C\/m|[Tt]ính(?!\p{L})|[Tt]ìm(?!\p{L})|\?/u;

function isMidProofConstruction(text: string): boolean {
  return MID_PROOF_CONSTRUCTION.test(text) && !PROOF_WORD.test(text);
}

function startsProofSection(text: string): boolean {
  return PROOF_SECTION_START.test(text);
}

// Câu HỎI / GIẢ ĐỊNH (lớp 8 hay hỏi): "a) Tứ giác BPCD có phải là hình bình hành
// không? Tại sao?", "Tam giác FBA và tam giác FCK có bằng nhau không? Vì sao?",
// "Tứ giác AHBK là hình gì?", "b) Khi tam giác ABD vuông cân tại A, hãy tính …".
// ("Giả sử AI cắt OK tại H" KHÔNG thuộc nhóm này — thường là dựng thêm điểm.)
// Không phải dựng hình: coi là geo thì triangle/quad rule vẽ LẠI hình nêu trong câu
// hỏi bằng toạ độ mẫu, đè lên điểm đã dựng (hình sai đề mà vẫn báo đủ).
const QUESTION_CLAUSE = /\?\s*$|(?<!\p{L})(?:[Vv]ì|[Tt]ại)\s+sao(?!\p{L})|là\s+hình\s+gì|có\s+(?:phải\s+)?[^?]{0,60}?không\s*\?/u;
const HYPOTHETICAL_LEAD = new RegExp(
  `^${ENUM_PREFIX}(?:[Kk]hi(?!\\s+đó)|[Nn]ếu|[Tt]rong\\s+trường\\s+hợp)(?!\\p{L})`,
  'u',
);

// "Từ đó suy ra PQ // EF" / "Suy ra …" — kết luận ("Từ" không phải "Từ A kẻ …").
const CONCLUSION_LEAD = new RegExp(`^${ENUM_PREFIX}(?:[Tt]ừ\\s+đó\\s+)?(?:[Ss]uy\\s+ra|[Dd]o\\s+đó)(?!\\p{L})`, 'u');

// "Từ đó …" (lớp 7: "Từ đó suy ra AH vuông góc với BC") là kết luận. "Giả sử AM vuông
// góc với BC" là giả thiết của một ý (trái hình chung) → không dựng; NHƯNG "Giả sử AI
// cắt OK tại H" đặt tên giao điểm → vẫn là dựng hình.
const TU_DO = new RegExp(`^${ENUM_PREFIX}[Tt]ừ\\s+đó(?!\\p{L})`, 'u');
const GIA_SU = new RegExp(`^${ENUM_PREFIX}[Gg]iả\\s+sử(?!\\p{L})`, 'u');
// "Giả sử A, B là hai điểm nằm trên đường tròn" — giới thiệu điểm, vẫn dựng.
const GIOI_THIEU_DIEM = /là\s+(?:một\s+|hai\s+|ba\s+|các\s+)?điểm(?!\p{L})/u;
const DAT_TEN_GIAO = /cắt[^]*(?:tại|ở)\s+(?:điểm\s+)?[A-Z](?![\p{L}\d'′])/u;

function isProofOnlyClause(text: string, proofMode: boolean): boolean {
  if (CONCLUSION_LEAD.test(text) || TU_DO.test(text)) return true;
  if (GIA_SU.test(text) && !DAT_TEN_GIAO.test(text) && !GIOI_THIEU_DIEM.test(text)) return true;
  if (PROOF_SECTION_START.test(text) && !CONSTRUCTION_LEAD.test(text)) return true;
  if ((QUESTION_CLAUSE.test(text) || HYPOTHETICAL_LEAD.test(text)) && !CONSTRUCTION_LEAD.test(text)) return true;
  return proofMode && !CONSTRUCTION_LEAD.test(text) && !CUT_LEAD.test(text) && !isMidProofConstruction(text);
}

export function computeCoverage(
  clauses: readonly Clause[],
  matches: readonly MatchLike[],
): CoverageReport {
  const claimed = new Set<number>();
  for (const m of matches) for (const id of m.clauseIds) claimed.add(id);

  const geoClauses = clauses.filter((c) => c.hasGeometry);
  const uncovered = geoClauses.filter((c) => !claimed.has(c.id));
  const coveredClauseIds = geoClauses
    .filter((c) => claimed.has(c.id))
    .map((c) => c.id);

  return {
    complete: uncovered.length === 0 && geoClauses.length > 0,
    coveredClauseIds,
    uncovered,
    ratio: geoClauses.length === 0 ? 0 : coveredClauseIds.length / geoClauses.length,
  };
}
