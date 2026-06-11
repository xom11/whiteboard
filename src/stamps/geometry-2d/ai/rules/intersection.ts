// src/stamps/geometry-2d/ai/rules/intersection.ts
//
// Giao điểm GENERIC của 2 đường thẳng/đoạn cho bởi CẶP ĐỈNH (2 ký tự HOA):
//   "D là giao điểm của AB và CE"        → tên TRƯỚC ("X là …")
//   "AM cắt CN tại K"                     → tên SAU ("… tại D")
//   "AC và BD cắt nhau tại O"             → tên SAU, dạng "cắt nhau"
// → add-point D {kind:'intersection', of:['AB','CE']} (builder ensure 2 segment
//   rồi lấy giao). Mỗi ref = 1 đường qua 2 điểm đã có; thiếu điểm → transpile-fail
//   → escalate (fail-safe).
//
// CHỈ nhận ref CẶP ĐỈNH "AB" (2 ký tự HOA). KHÔNG nhận:
//   - giao 2 ĐƯỜNG TRÒN "(O) và (O')" → kind circleIntersection (rule khác/defer);
//     ref "(O)" có ngoặc nên [A-Z]{2} không khớp → tự loại.
//   - line∩circle "AB cắt (O) tại M" → secondIntersection (defer); "(O)" không
//     phải cặp đỉnh → tự loại.
//   - "đôi một cắt nhau" (diameterCirclePairwise) → "đôi một" chen giữa cặp đỉnh
//     và "cắt nhau" phá khớp dạng C; dạng dùng dấu phẩy (không "và") cũng không khớp.
//
// Guard degenerate (fail-safe — thà escalate còn hơn dựng điểm vô nghĩa):
//   - 4 đầu mút phải PHÂN BIỆT: chia sẻ đỉnh → 2 đường gặp tại đỉnh chung (không
//     phải điểm mới) → bỏ qua.
//   - tên điểm cần dựng KHÔNG được nằm trong ref (định nghĩa vòng) → bỏ qua.
//
// GOTCHA \b: \b của JS theo ASCII nên KHÔNG khớp quanh ký tự Việt. Regex chứa ký
// tự Việt dùng cờ 'u' + lookaround (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, DUONG_KW } from './_shared';

// Ref = cặp đỉnh "AB" (đúng 2 ký tự HOA, cho phép khoảng trắng ở giữa "A B", neo (?![A-Z]) chặn cụm 3+).
// Tiền tố "đường thẳng|đoạn|tia|cạnh" optional.
const REF =
  '(?:' +
  DUONG_KW +
  '\\s*thẳng\\s+|đoạn(?:\\s+thẳng)?\\s+|tia\\s+|cạnh\\s+)?([A-Z]\\s*[A-Z])(?![A-Z])';
const CONN = '(?:và|với)';

// A: "giao điểm (của)? REF1 (và|với) REF2" — tên đứng TRƯỚC qua "X là". "của"
//    lặp 0..2 (OCR đôi khi nhân đôi "của của").
const GIAO_DIEM = new RegExp(`giao\\s*điểm\\s+(?:của\\s+){0,2}${REF}\\s*${CONN}\\s*${REF}`, 'gu');
// A2: "giao điểm (của)? REF1 (và|với) REF2 là Z" — tên đứng SAU ("… là M").
const GIAO_LA = new RegExp(`giao\\s*điểm\\s+(?:của\\s+){0,2}${REF}\\s*${CONN}\\s*${REF}\\s+là\\s+([A-Z])(?![A-Z])`, 'gu');
// B: "REF1 cắt REF2 tại (điểm)? D" — tên SAU.
const CAT_TAI = new RegExp(`${REF}\\s+cắt\\s+${REF}\\s+tại\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])`, 'gu');
// C: "REF1 (và|với) REF2 (cắt|giao) nhau tại D" — tên SAU. REF2 NGAY trước "cắt
//    nhau" → "đôi một" (diameterCirclePairwise) chen vào sẽ phá khớp.
// CONN gồm dấu phẩy: "AB, CD cắt nhau tại E" (Câu 13). "đôi một" vẫn bị loại vì
// nó chen giữa REF2 và "cắt nhau" → REF2 không liền "cắt nhau".
const CAT_NHAU = new RegExp(
  `${REF}\\s*(?:,|và|với)\\s*${REF}\\s+(?:của\\s+tam\\s*giác\\s+[A-Z]{3}\\s+)?(?:cắt|giao)\\s+nhau\\s+(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])`,
  'gu',
);
// D: "E, F lần lượt là giao điểm của AB và CD, của AD và BC" → zip 2 tên với 2 cặp.
const DISTRIB_TWO = new RegExp(
  `([A-Z])\\s*,\\s*([A-Z])\\s+lần\\s*lượt\\s+là\\s+giao\\s*điểm\\s+của\\s+${REF}\\s*${CONN}\\s*${REF}\\s*,\\s*của\\s+${REF}\\s*${CONN}\\s*${REF}`,
  'gu',
);
// E: 1 đường ∩ 2 đường — "MA cắt DB, DC (theo thứ tự|lần lượt)? tại X, Z"
//    → X=MA∩DB, Z=MA∩DC. groups: 1=line, 2=ref1, 3=ref2, 4=name1, 5=name2.
const CAT_ONE_TWO = new RegExp(
  `${REF}\\s+cắt\\s+${REF}\\s*,\\s*${REF}\\s+(?:theo\\s+thứ\\s+tự\\s+|lần\\s*lượt\\s+)?tại\\s+([A-Z])\\s*(?:,|và)\\s*([A-Z])(?![A-Z])`,
  'gu',
);
// F: 2 đường ∩ 1 đường — "TC, TB (lần lượt|theo thứ tự)? cắt EF tại P, Q"
//    → P=TC∩EF, Q=TB∩EF. groups: 1=ref1, 2=ref2, 3=sharedLine, 4=name1, 5=name2.
const CAT_TWO_ONE = new RegExp(
  `${REF}\\s*,\\s*${REF}\\s+(?:lần\\s*lượt\\s+|theo\\s+thứ\\s+tự\\s+)?cắt\\s+${REF}\\s+tại\\s+([A-Z])\\s*(?:,|và)\\s*([A-Z])(?![A-Z])`,
  'gu',
);

// F2: "giao điểm của R1 (,|và) R2 với R3 (lần lượt|theo thứ tự)? là M và N" →
//     M=R1∩R3, N=R2∩R3 (2 đường giao 1 đường chung, tên SAU, dạng "giao điểm
//     của"). Bài 29 ("CF,DE với AB"), Bài 122 ("PB và BC với AD").
//     groups: 1=ref1 2=ref2 3=shared 4=name1 5=name2.
const GIAO_TWO_ONE_LA = new RegExp(
  `giao\\s*điểm\\s+(?:của\\s+)?${REF}\\s*(?:,|và)\\s*${REF}\\s+với\\s+${REF}\\s+(?:lần\\s*lượt\\s+|theo\\s+thứ\\s+tự\\s+)?là\\s+([A-Z])\\s*(?:,|và)\\s*([A-Z])(?![A-Z])`,
  'gu',
);

// F3 (ZIP): "R1, R2 lần lượt cắt R3, R4 tại M, N" → M=R1∩R3, N=R2∩R4 (zip
//   1-1, KHÔNG dùng chung đường). "lần lượt/theo thứ tự" BẮT BUỘC để chắc zip.
//   Bài 99: "Các đường thẳng BO,CO lần lượt cắt các đoạn thẳng AC,AB tại M,N".
//   groups: 1=ref1 2=ref2 3=ref3 4=ref4 5=name1 6=name2.
const CAT_ZIP = new RegExp(
  `${REF}\\s*,\\s*${REF}\\s+(?:lần\\s*lượt\\s+|theo\\s+thứ\\s+tự\\s+)cắt\\s+(?:các\\s+)?(?:đoạn(?:\\s+thẳng)?\\s+|cạnh\\s+|${DUONG_KW}\\s*thẳng\\s+)?${REF}\\s*,\\s*${REF}\\s+(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])\\s*(?:,|và)\\s*([A-Z])(?![A-Z])`,
  'gu',
);

// Tên điểm đứng TRƯỚC (pattern A): "X là " NGAY TRƯỚC "giao điểm".
const NAME_BEFORE = /([A-Z])(?:['′]?)\s+là\s+$/u;

// G: phân phối N CẶP — "X, Y, Z lần lượt là giao (điểm)? của (các)? cặp (đường
//    thẳng)? (R1a, R1b), (R2a, R2b), …" / "… AC và BD; AB và CD; …". Zip tên↔cặp.
//    Brokard/Pappus-family (giao của 3-4 cặp đường thẳng).
const NAMES_LIST = '((?:[A-Z]\\s*,\\s*)+[A-Z])(?![A-Z])';
const DISTRIB_PAIRS = new RegExp(
  NAMES_LIST +
    '\\s+(?:lần\\s*lượt\\s+|theo\\s+thứ\\s+tự\\s+)?là\\s+giao\\s*(?:điểm)?\\s+(?:của\\s+)?(?:các\\s+)?cặp\\s+(?:đường\\s*thẳng\\s+)?([^.]+)',
  'u',
);
// Cặp bên trong blob: "(R1, R2)" hoặc "R1 và R2" — quét toàn cục, optional ngoặc.
const PAIR_IN_BLOB = new RegExp(`\\(?\\s*([A-Z]\\s*[A-Z])\\s*(?:,|${CONN})\\s*([A-Z]\\s*[A-Z])\\s*\\)?`, 'gu');

// H: ký hiệu ∩ — "X = REF1 ∩ REF2", HỖ TRỢ điểm CÓ CHỈ SỐ (A1, A', B1C1):
//    "A1 = BC ∩ AP", "A2 = BC ∩ B1C1". PT = HOA + (số|prime) optional. Cặp =
//    2 PT liền (greedy → "B1C1"→B1,C1). builder resolveSegmentRef tách cặp
//    subscript qua splitKnownPair. Tên = 1 PT trước "=".
const PT = "[A-Z](?:[0-9]|['′])?";
const CAP_SYMBOL = new RegExp(
  `(${PT})\\s*=\\s*(${PT})\\s*(${PT})\\s*∩\\s*(${PT})\\s*(${PT})(?!${PT})`,
  'gu',
);

// I (fallback): "Z là giao điểm của (hai)? (tia)? REF1 (,|và|với) REF2" với đầu
// mút CÓ PRIME ("M'A") và/hoặc separator DẤU PHẨY — 2 trường hợp GIAO_DIEM (chỉ
// và|với, ref 2 HOA) bỏ lỡ. Vd "S là giao điểm của hai tia BM, M'A" (d80:10).
// CHẠY CUỐI per-clause (sau mọi pattern khác) + seen-dedup → thuần additive.
const PTP = "[A-Z](?:['′])?";
const REFP = `(?:đường\\s*thẳng\\s+|đoạn(?:\\s+thẳng)?\\s+|tia\\s+|cạnh\\s+)?(${PTP}\\s*${PTP})(?![A-Za-z])`;
const GIAO_PRIMED = new RegExp(
  `giao\\s*điểm\\s+(?:của\\s+)?(?:hai\\s+)?(?:tia\\s+|đường\\s*thẳng\\s+|đoạn\\s+|cạnh\\s+)?${REFP}\\s*(?:,|và|với)\\s*${REFP}`,
  'gu',
);
// "REF1, REF2 cắt nhau tại Z" với đầu mút CÓ PRIME ("EF, B'C' cắt nhau tại K").
// Tên SAU. group1=ref1, 2=ref2, 3=tên.
const CAT_NHAU_PRIMED = new RegExp(
  `${REFP}\\s*(?:,|và|với)\\s*${REFP}\\s+(?:cắt|giao)\\s+nhau\\s+(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])`,
  'gu',
);
function splitPrimedPair(tok: string): [string, string] {
  const m = /^([A-Z](?:['′])?)([A-Z](?:['′])?)$/u.exec(tok.replace(/\s+/g, ''));
  if (!m) return ['', ''];
  return [m[1].replace('′', "'"), m[2].replace('′', "'")];
}

// Prefilter toàn đề.
const PREFILTER = /giao\s*điểm|cắt|giao\s+nhau|giao\s+của|∩/u;

/**
 * Build intent intersection nếu hợp lệ: 4 đầu mút phân biệt (không chia sẻ đỉnh)
 * + tên không nằm trong ref. Ngược lại trả null (escalate).
 */
function makeIntent(name: string, ref1: string, ref2: string): IntentT | null {
  ref1 = ref1.replace(/\s+/g, '');
  ref2 = ref2.replace(/\s+/g, '');
  const ends = [ref1[0], ref1[1], ref2[0], ref2[1]];
  if (new Set(ends).size !== 4) return null; // chia sẻ đỉnh / ref trùng → degenerate
  if (ends.includes(name)) return null; // ref chứa chính điểm cần dựng → vô nghĩa
  return addPoint(name, { kind: 'intersection', of: [ref1, ref2] });
}

/** Như makeIntent nhưng 4 đầu mút TƯỜNG MINH (cho điểm có chỉ số: B1, A'…). */
function makeIntentEnds(name: string, e1: string, e2: string, e3: string, e4: string): IntentT | null {
  const ends = [e1, e2, e3, e4];
  if (new Set(ends).size !== 4) return null;
  if (ends.includes(name)) return null;
  return addPoint(name, { kind: 'intersection', of: [e1 + e2, e3 + e4] });
}

export const intersectionRule: LanguageRule = {
  id: 'intersection',
  // THẤP HƠN mọi rule tạo điểm (midpoint=50 thấp nhất, perpFoot/cevian/center…
  // đều ≥50): intentsToDsl xử lý intent THEO THỨ TỰ priority DESC (không topo-sort)
  // → các điểm đầu mút (vd M,N trung điểm trong "AM cắt CN tại K") phải được dựng
  // TRƯỚC khi intersection tham chiếu chúng. Đặt 45 (>connect 40) để chạy sau cùng.
  priority: 45,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const seen = new Set<string>(); // tên đã claim trong clause (tránh trùng tên)
      const emit = (name: string, ref1: string, ref2: string) => {
        if (seen.has(name)) return;
        const intent = makeIntent(name, ref1, ref2);
        if (!intent) return;
        seen.add(name);
        out.push({ ruleId: 'intersection', clauseIds: [c.id], intents: [intent] });
      };

      DISTRIB_TWO.lastIndex = 0;
      for (const m of c.text.matchAll(DISTRIB_TWO)) {
        emit(m[1], m[3], m[4]);
        emit(m[2], m[5], m[6]);
      }

      // H: ký hiệu ∩ — "X = e1e2 ∩ e3e4" (hỗ trợ chỉ số). Dùng emit-by-ends để
      //    không index ref[0]/ref[1] (sai với "B1C1").
      CAP_SYMBOL.lastIndex = 0;
      for (const m of c.text.matchAll(CAP_SYMBOL)) {
        const name = m[1];
        if (seen.has(name)) continue;
        const intent = makeIntentEnds(name, m[2], m[3], m[4], m[5]);
        if (!intent) continue;
        seen.add(name);
        out.push({ ruleId: 'intersection', clauseIds: [c.id], intents: [intent] });
      }

      // E: 1 đường ∩ 2 đường ("MA cắt DB, DC tại X, Z").
      CAT_ONE_TWO.lastIndex = 0;
      for (const m of c.text.matchAll(CAT_ONE_TWO)) {
        emit(m[4], m[1], m[2]);
        emit(m[5], m[1], m[3]);
      }
      // F: 2 đường ∩ 1 đường ("TC, TB cắt EF tại P, Q").
      CAT_TWO_ONE.lastIndex = 0;
      for (const m of c.text.matchAll(CAT_TWO_ONE)) {
        emit(m[4], m[1], m[3]);
        emit(m[5], m[2], m[3]);
      }
      // F2: "giao điểm của R1 (,|và) R2 với R3 lần lượt là M và N".
      GIAO_TWO_ONE_LA.lastIndex = 0;
      for (const m of c.text.matchAll(GIAO_TWO_ONE_LA)) {
        emit(m[4], m[1], m[3]);
        emit(m[5], m[2], m[3]);
      }
      // F3 (ZIP): "R1, R2 lần lượt cắt R3, R4 tại M, N" → M=R1∩R3, N=R2∩R4.
      CAT_ZIP.lastIndex = 0;
      for (const m of c.text.matchAll(CAT_ZIP)) {
        emit(m[5], m[1], m[3]);
        emit(m[6], m[2], m[4]);
      }

      // A2: tên SAU — "giao điểm của REF1 và REF2 là Z" (ưu tiên trước A để
      //     không bị NAME_BEFORE bắt nhầm lời dẫn "Gọi" đứng trước).
      GIAO_LA.lastIndex = 0;
      for (const m of c.text.matchAll(GIAO_LA)) emit(m[3], m[1], m[2]);
      // A: tên TRƯỚC — "X là giao điểm của REF1 và REF2".
      GIAO_DIEM.lastIndex = 0;
      for (const m of c.text.matchAll(GIAO_DIEM)) {
        const nm = NAME_BEFORE.exec(c.text.slice(0, m.index));
        if (nm) emit(nm[1], m[1], m[2]);
      }
      // B: "REF1 cắt REF2 tại D".
      CAT_TAI.lastIndex = 0;
      for (const m of c.text.matchAll(CAT_TAI)) emit(m[3], m[1], m[2]);
      // C: "REF1 và REF2 cắt nhau tại D".
      CAT_NHAU.lastIndex = 0;
      for (const m of c.text.matchAll(CAT_NHAU)) emit(m[3], m[1], m[2]);

      // I (fallback): primed/comma — "Z là giao điểm của hai tia BM, M'A". Tên
      //   ĐỨNG TRƯỚC. Chỉ điểm chưa được pattern trên claim (seen-dedup).
      GIAO_PRIMED.lastIndex = 0;
      for (const m of c.text.matchAll(GIAO_PRIMED)) {
        const nm = NAME_BEFORE.exec(c.text.slice(0, m.index));
        if (!nm) continue;
        const name = nm[1];
        if (seen.has(name)) continue;
        const [a, b] = splitPrimedPair(m[1]);
        const [d, e] = splitPrimedPair(m[2]);
        if (!a || !b || !d || !e) continue;
        const ends = [a, b, d, e];
        if (new Set(ends).size !== 4 || ends.includes(name)) continue;
        seen.add(name);
        out.push({
          ruleId: 'intersection',
          clauseIds: [c.id],
          intents: [addPoint(name, { kind: 'intersection', of: [a + b, d + e] })],
        });
      }

      // J (fallback): primed "cắt nhau" — "EF, B'C' cắt nhau tại K". Tên SAU.
      CAT_NHAU_PRIMED.lastIndex = 0;
      for (const m of c.text.matchAll(CAT_NHAU_PRIMED)) {
        const name = m[3];
        if (seen.has(name)) continue;
        const [a, b] = splitPrimedPair(m[1]);
        const [d, e] = splitPrimedPair(m[2]);
        if (!a || !b || !d || !e) continue;
        const ends = [a, b, d, e];
        if (new Set(ends).size !== 4 || ends.includes(name)) continue;
        seen.add(name);
        out.push({
          ruleId: 'intersection',
          clauseIds: [c.id],
          intents: [addPoint(name, { kind: 'intersection', of: [a + b, d + e] })],
        });
      }
    }

    // G: phân phối N cặp — quét TOÀN ĐỀ (segmentClauses cắt ';' nên blob
    //    "AC và BD; AB và CD; AD và BC" bị tách; cặp 2,3 ở clause khác). Claim
    //    clause chứa danh sách tên ("lần lượt là giao").
    const dp = DISTRIB_PAIRS.exec(ctx.problem);
    if (dp) {
      const names = dp[1].split(',').map((s) => s.trim()).filter(Boolean);
      const pairs: Array<[string, string]> = [];
      PAIR_IN_BLOB.lastIndex = 0;
      for (const pm of dp[2].matchAll(PAIR_IN_BLOB)) pairs.push([pm[1], pm[2]]);
      // Zip 1-1: số tên = số cặp (≥2). Lệch → bỏ (escalate, không đoán lệch).
      if (names.length >= 2 && names.length === pairs.length) {
        // Clause chứa danh sách tên + "giao của ... cặp" (để coverage claim).
        const owner = ctx.clauses.find(
          (c) => c.text.includes(names[0]) && /giao\s*(?:điểm)?\s+(?:của\s+)?(?:các\s+)?cặp/u.test(c.text),
        );
        const seenG = new Set<string>();
        for (let i = 0; i < names.length; i++) {
          const intent = makeIntent(names[i], pairs[i][0], pairs[i][1]);
          if (!intent || seenG.has(names[i])) continue;
          seenG.add(names[i]);
          out.push({ ruleId: 'intersection', clauseIds: owner ? [owner.id] : [], intents: [intent] });
        }
      }
    }
    return out;
  },
};
