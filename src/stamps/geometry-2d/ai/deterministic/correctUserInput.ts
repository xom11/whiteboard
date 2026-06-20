// Lớp sửa-lỗi input HỌC SINH GÕ (case lộn xộn, xuống dòng/space rác, thiếu dấu
// thanh, typo, ký hiệu) — chạy TRƯỚC normalizeProblemText. Khác normalizeText
// (vốn cho nhiễu OCR). Thuần + idempotent. GUARD: chỉ đụng token chữ-thường
// thuần, bỏ qua mọi token trông như nhãn toán (HOA/prime/số/đơn-vị).

/** Fold tiếng Việt về dạng không-dấu để đối-chiếu vocab: lowercase → đ/Đ→d →
 *  NFD tách dấu → strip combining marks (U+0300–U+036F phủ mọi dấu thanh/mũ/móc
 *  của tiếng Việt). "đường"→"duong", "Giác"→"giac". */
export function foldVietnamese(s: string): string {
  return s
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Edit-distance DP (inline, không dependency). Vocab nhỏ nên O(n·m) thoải mái. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    const cur = new Array<number>(n + 1);
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

// Closed-set từ-ĐƠN hình học (canonical, có dấu). Nguồn: GLUE_VOCAB trong
// normalizeText.ts + từ-đơn tách từ GEOMETRY_KEYWORDS (vocabulary.ts) + vài từ
// cấu trúc phổ biến. CHỈ từ-đơn (corrector chạy token-by-token); cụm nhiều-từ
// tự khớp khi từng token khớp ("vuong goc"→"vuông góc"). Thứ tự = ưu tiên: nếu 2
// canonical fold trùng key thì từ ĐỨNG TRƯỚC thắng (geometry-priority).
//
// ⚠️  Collision-winners (identity-form trước để tránh corrupt từ-đa-nghĩa):
//   - 'tam' TRƯỚC 'tâm': fold('tam')=fold('tâm')='tam' → tam giác (NOT tâm giác)
//   - 'thang' TRƯỚC 'thẳng': fold('thang')=fold('thẳng')='thang' → hình thang (NOT thẳng)
// Các winner này được diag-all gate xác thực 0 regression.
export const CORRECTION_VOCAB: readonly string[] = [
  // circle / line core
  'đường', 'tròn', 'bán', 'kính', 'vòng',
  // polygon / triangle (TAM before TÂM, THANG before THẲNG — see collision-winner warning above)
  'tam', 'tâm', 'thang', 'thẳng', 'giác', 'tứ', 'góc', 'cạnh', 'đoạn', 'hình', 'chữ', 'nhật',
  'vuông', 'cân', 'nhọn', 'đều', 'thoi', 'bình', 'hành',
  // chord / arc / point
  'dây', 'cung', 'điểm', 'tia', 'nửa',
  // tangent / inscribed
  'tiếp', 'tuyến', 'nội', 'ngoại', 'xúc',
  // cevians / projection
  'trung', 'trực', 'cao', 'phân', 'chiếu', 'đối', 'xứng',
  // verbs / connectors phổ biến trong đề
  'cho', 'gọi', 'vẽ', 'kẻ', 'lấy', 'qua', 'cắt', 'trên', 'dưới', 'đến',
  // 'đi' ĐÃ GỠ: "di"→"đi" net-harmful trên corpus (regress 7 bài locus "di động"
  // → "đi động"). Từ TRẦN 2 ký tự đa-nghĩa: rủi ro cao, lợi ích thấp.
  'song', 'với', 'của', 'và', 'là', 'có', 'nằm', 'thuộc', 'tại',
  'một', 'hai', 'ba', 'các', 'lần', 'lượt', 'thứ', 'bất', 'kì', 'kỳ',
  'trong', 'ngoài', 'lên', 'xuống',
];

// fold → canonical (first-wins theo thứ tự CORRECTION_VOCAB).
// Exported để test + verify collision-winners.
export const FOLDED_VOCAB: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const w of CORRECTION_VOCAB) {
    const f = foldVietnamese(w);
    if (!m.has(f)) m.set(f, w);
  }
  return m;
})();

export type TokenClass = 'protected' | 'upper' | 'lower';

const LETTERS_ONLY = /^\p{L}+$/u; // thuần chữ (gồm tiếng Việt), không digit/ký-hiệu
const UPPER_LABEL = /^\p{Lu}{1,4}$/u; // toàn HOA, 1-4 ký tự (geometric label: A,BC,ABC,MNPQ)
const HAS_UPPER = /\p{Lu}/u; // có ít nhất 1 chữ HOA

/** Phân loại 1 whitespace-token. Token KHÔNG thuần-chữ (có số/prime/ký-hiệu/ngoặc)
 *  → protected (nhãn/đơn-vị). Thuần-chữ toàn HOA 1-4 ký tự → protected (label A,BC,ABC,MNPQ
 *  và cả "BA"/"CO"/"LA" dù fold trùng vocab: chúng là NHÃN đoạn, không phải từ shouted).
 *  Hệ quả: shouted keyword ALL-CAPS ≤4 ký tự (vd "TRON","GIAC") KHÔNG được phục-hồi-dấu —
 *  hiếm gặp, chấp nhận đánh đổi để tuyệt đối không corrupt nhãn 2 ký tự. ALL-CAPS ≥5 ký tự
 *  (vd "DUONG") vẫn rơi xuống nhánh dưới → 'upper' → phục-hồi-dấu an toàn.
 *  Thuần-chữ có HOA khác (Ax,By,DUONG,Cho,Đường) → upper (chỉ exact-fold). Thuần-chữ
 *  toàn-thường → lower (exact + fuzzy). */
export function classifyToken(token: string): TokenClass {
  if (!LETTERS_ONLY.test(token)) return 'protected';
  // Thuần chữ: kiểm tra có phải label (toàn HOA 1-4 ký tự) — LUÔN protected
  if (UPPER_LABEL.test(token)) return 'protected';
  return HAS_UPPER.test(token) ? 'upper' : 'lower';
}

export interface CorrectConfig {
  /** Tầng 1: whitespace/newline + bảng ký hiệu. Luôn an toàn. */
  structure: boolean;
  /** Tầng 2: phục-hồi-dấu qua fold-khớp-chính-xác vocab. */
  accents: boolean;
  /** Tầng 3: typo fuzzy Levenshtein. */
  typo: boolean;
  /** Tầng 3: ngưỡng edit-distance tối đa (trên dạng fold). */
  maxTypoDistance: number;
  /** Tầng 3: độ dài fold tối thiểu mới fuzzy (tránh phá từ ngắn mơ hồ). */
  minTypoLen: number;
}

export const DEFAULT_CORRECT_CONFIG: CorrectConfig = {
  structure: true,
  accents: true,
  // Tầng 3 (fuzzy typo) MẶC ĐỊNH TẮT: trên corpus thật nó băm từ TRẦN hợp lệ
  // ("nhau"→"nhật", "giao"→"giác", "di"→"đi") vì vocab hình-học trùng không-gian
  // âm với văn xuôi Việt → net-harmful (đo qua diag-all). Vẫn cài đặt đầy đủ + bật
  // được qua flag (mutation test / opt-in tương lai). accents+structure đủ an toàn.
  typo: false,
  maxTypoDistance: 1,
  minTypoLen: 4,
};

// Bảng ký hiệu/cụm → dạng rule engine hiểu. Giữ TỐI THIỂU + high-confidence;
// thêm entry phải qua gate diag-all. "<số> do|độ" → "<số>°".
// LƯU Ý: "//"→"song song" ĐÃ GỠ — qua diag-all nó BIẾN clause bị-bỏ-qua "IM // EF"
// thành clause-hình-học KHÔNG phủ được (ràng buộc song song khó dựng) → coverage
// gate đánh rớt cả bài (regress t02:BT25). Lợi ích ≈0 trên corpus, hại thật → bỏ.
const SYMBOL_MAP: ReadonlyArray<readonly [RegExp, string]> = [
  [/(\d+)\s*(?:độ|do)(?!\p{L})/giu, '$1°'],
];

/** Tầng 1: gộp xuống dòng + khoảng trắng dư về 1 space; áp bảng ký hiệu. */
function applyStructure(s: string): string {
  let out = s;
  for (const [re, to] of SYMBOL_MAP) out = out.replace(re, to);
  return out.replace(/\s+/g, ' ').trim();
}
export { applyStructure };

/** Áp lại kiểu HOA-đầu của token gốc lên canonical: gốc có chữ-đầu HOA → canonical
 *  viết-hoa-chữ-đầu (giữ "Cho"/"Đường" sentence-start, đưa shout "DUONG"→"Đường").
 *  Gốc toàn-thường → trả canonical nguyên (đã có-dấu thường). */
function applyLeadingCase(canonical: string, original: string): string {
  if (/^\p{Lu}/u.test(original)) {
    return canonical.charAt(0).toUpperCase() + canonical.slice(1);
  }
  return canonical;
}

/** Tầng 3: tìm vocab gần-khớp DUY NHẤT trong ngưỡng. Trả canonical hoặc null
 *  (không khớp / mơ hồ → để nguyên). */
function fuzzyLookup(folded: string, cfg: CorrectConfig): string | null {
  if (folded.length < cfg.minTypoLen) return null;
  let best: string | null = null;
  let bestDist = cfg.maxTypoDistance + 1;
  let tie = false;
  for (const [key, canonical] of FOLDED_VOCAB) {
    // Bỏ qua entry không-dấu (canonical == key): chúng không phải target sửa dấu.
    if (canonical === key) continue;
    if (Math.abs(key.length - folded.length) > cfg.maxTypoDistance) continue;
    const d = levenshtein(folded, key);
    if (d < bestDist) {
      bestDist = d;
      best = canonical;
      tie = false;
    } else if (d === bestDist) {
      tie = true;
    }
  }
  if (best === null || bestDist > cfg.maxTypoDistance || tie) return null;
  return best;
}

// Chỉ giữ chữ a-z của dạng fold (bỏ dấu câu/chỉ số dính nhãn) để so neighbor.
function letterFold(token: string): string {
  return foldVietnamese(token).replace(/[^a-z]+/g, '');
}

// Phân-định NGỮ-CẢNH cho fold-key đa-nghĩa (collision). Bare token (thiếu dấu)
// → chọn canonical theo từ-kề. An toàn corpus: corpus đã có dấu nên các từ này
// bị guard "đã có dấu" bỏ qua; bare-form chỉ xuất hiện ở input học-sinh + đúng
// các ngữ cảnh dưới. Khôi phục "tâm" (tâm đường tròn — CỰC phổ biến) mà KHÔNG
// corrupt "tam giác"/"hình thang".
// HẠN CHẾ ĐÃ BIẾT (chấp nhận): nếu TỪ-KỀ phân-định cũng bị typo (vd "tam gisc"),
// neighbor-fold không khớp "giac" → "tam"→"tâm" sai. Hiếm (chỉ khi typo bật + kề
// typo); KHÔNG ảnh hưởng corpus (đã có dấu → guard bỏ qua).
const DISAMBIG: Record<string, (prevFold: string, nextFold: string) => string> = {
  // "tam giác" giữ "tam"; còn lại (tâm O, tâm đường tròn…) → "tâm".
  tam: (_p, n) => (n === 'giac' ? 'tam' : 'tâm'),
  // "hình thang" giữ "thang"; còn lại (đường thẳng, thẳng hàng…) → "thẳng".
  thang: (p, _n) => (p === 'hinh' ? 'thang' : 'thẳng'),
  // "ngoại tiếp" → "ngoại"; còn lại (nằm ngoài, điểm ngoài…) → "ngoài".
  ngoai: (_p, n) => (n === 'tiep' ? 'ngoại' : 'ngoài'),
};

/** Sửa 1 token theo guard + tầng 2/3. Token protected hoặc không khớp → giữ nguyên.
 *  prevFold/nextFold = letterFold của từ-kề (cho phân-định ngữ-cảnh). */
function correctToken(
  token: string,
  cfg: CorrectConfig,
  prevFold = '',
  nextFold = '',
): string {
  const klass = classifyToken(token);
  if (klass === 'protected') return token;
  const folded = foldVietnamese(token);
  // SỐNG CÒN: token ĐÃ có dấu (hoặc chữ 'đ') → coi như người gõ đã chủ đích viết
  // đúng → KHÔNG đụng. Chỉ phục-hồi cho token TRẦN/thiếu-dấu (folded == lowercase).
  // Nếu bỏ guard này, fold-collision sẽ HẠ CẤP từ đúng: "tâm"→"tam", "thẳng"→
  // "thang", "ngoài"→"ngoại", và fuzzy băm từ có-dấu — phá hàng loạt đề OCR (đã
  // đo: FULL 519→253). folded khác lowercase ⇔ token chứa dấu thanh/mũ/móc hoặc đ.
  if (folded !== token.toLowerCase()) return token;
  // Tầng 2: fold-khớp-chính-xác (áp cho cả 'upper' shouted keyword lẫn 'lower').
  if (cfg.accents) {
    const dis = DISAMBIG[folded];
    if (dis) return applyLeadingCase(dis(prevFold, nextFold), token);
    const exact = FOLDED_VOCAB.get(folded);
    if (exact) return applyLeadingCase(exact, token);
  }
  // Tầng 3: fuzzy CHỈ cho token toàn-thường ('lower') — KHÔNG fuzzy token có HOA
  // để tuyệt đối không mangle nhãn (ABD ~ abc…).
  if (cfg.typo && klass === 'lower') {
    const near = fuzzyLookup(folded, cfg);
    if (near) return near;
  }
  return token;
}

/**
 * Sửa lỗi input học sinh gõ. Thuần + idempotent. Chạy TRƯỚC normalizeProblemText.
 * GUARD: chỉ đụng token chữ-thường-thuần; nhãn toán (HOA/prime/số/đơn-vị) bất biến.
 */
export function correctUserInput(
  input: string,
  cfg: CorrectConfig = DEFAULT_CORRECT_CONFIG,
): string {
  let s = input;
  if (cfg.structure) s = applyStructure(s);
  if (!cfg.accents && !cfg.typo) return s;
  // Tách giữ separator để ghép lại nguyên vẹn. Thu thập index từ-token (bỏ space/
  // rỗng) để tra từ-kề cho phân-định ngữ-cảnh (DISAMBIG).
  const parts = s.split(/(\s+)/);
  const wordIdx: number[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] !== '' && !/\s/.test(parts[i])) wordIdx.push(i);
  }
  const out = parts.slice();
  for (let w = 0; w < wordIdx.length; w++) {
    const i = wordIdx[w];
    const prevFold = w > 0 ? letterFold(parts[wordIdx[w - 1]]) : '';
    const nextFold = w < wordIdx.length - 1 ? letterFold(parts[wordIdx[w + 1]]) : '';
    out[i] = correctToken(parts[i], cfg, prevFold, nextFold);
  }
  return out.join('');
}
