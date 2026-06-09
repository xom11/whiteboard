// src/stamps/geometry-2d/ai/rules/connect.ts
//
// Construct 'connect': vẽ đoạn / đường thẳng / tia giữa 2 đỉnh có tên.
// BẢO THỦ (priority thấp 40): chỉ claim clause khi có TỪ KHOÁ vẽ rõ ràng
// (đoạn | cạnh | nối | kẻ | đường thẳng | tia) đi kèm cặp 2 ký tự HOA.
// KHÔNG khớp "tam giác ABC" (3 ký tự liền) hay tên đường 1 ký tự ("đường d").
import type { LanguageRule, RuleMatch } from './_types';
import { connect } from './_shared';
import type { IntentT } from '../intent';

// LƯU Ý: \b của JS dựa trên ASCII word-char nên KHÔNG khớp quanh ký tự Việt
// ("đ","ề"…). Dùng lookaround \p{L}; cờ 'u' bắt buộc cho mọi regex Việt.
// Cặp đỉnh = 2 ký tự HOA liền; (?![A-Z]) chặn "ABC" (tam giác) khỏi bị bắt.

// LƯU Ý case: KHÔNG dùng cờ 'i' (nó khiến [A-Z] khớp chữ thường → "đoạn THẳng"
// bắt "th" làm cặp T,H rác, vỡ pipeline). Nhưng vẫn cần khớp keyword HOA đầu câu
// ("Kẻ", "Nối", "Đoạn") → case-insensitive CHỈ ở ký tự đầu keyword bằng [Xx].
// Vertices LUÔN strict [A-Z].
// "đường thẳng AB" → line. "đường thẳng" phải đứng trước cặp.
const LINE_KW = /[Đđ]ường\s*thẳng\s+([A-Z])([A-Z])(?![A-Za-z])/gu;
// "tia AB" → ray. Không bắt "tia phân giác", "tia đối" (theo sau là chữ thường).
const RAY_KW = /(?<!\p{L})[Tt]ia\s+([A-Z])([A-Z])(?![A-Za-z])/gu;
// "tia đối của tia XY": cụm tia ĐỐI — match "tia XY" bên trong KHÔNG được emit ray
// naive X→Y vì điểm mới nằm trên tia NGƯỢC hướng (gốc X, đi xa Y). Vẽ ray X→Y
// sẽ minh hoạ SAI hướng (tia gốc thay vì tia đối). pointAtDistance đã dựng điểm
// mới đúng trên tia đối; connect suppress để tránh ray double/sai hướng.
// Kiểm tra text NGAY TRƯỚC vị trí match "tia": kết thúc bằng "đối của " (≥0 space).
const TIA_DOI_BEFORE = /tia\s*đối\s+của\s+$/u;
// "nối A với/và B" → segment. Tên 1 ký tự, không phải cặp.
const NOI_KW = /(?<!\p{L})[Nn]ối\s+([A-Z])\s+(?:với|và)\s+([A-Z])(?![A-Za-z])/gu;
// "Nối CD" → segment (cặp 2 ký tự HOA liền, KHÔNG "với/và"). (?![A-Z]) chặn "Nối ABC".
const NOI_PAIR_KW = /(?<!\p{L})[Nn]ối\s+([A-Z])([A-Z])(?![A-Za-z])/gu;
// "đoạn (thẳng) AB" | "cạnh AB" | "kẻ AB" → segment.
const SEG_KW =
  /(?<!\p{L})(?:[Đđ]oạn(?:\s*thẳng)?|[Cc]ạnh|[Kk]ẻ)\s+([A-Z])([A-Z])(?![A-Za-z])/gu;

// ============ EN connect forms (issue #46 nhóm B) ============================
// connect.ts vốn VN-only. Mirror các form VN sang EN, GIỮ NGUYÊN parity ở gate
// vocab: VN "đoạn" LÀ keyword → EN "segment" cũng vào vocab (standalone render).
// VN "đường thẳng"/"tia"/"nối"/"kẻ" KHÔNG phải keyword → EN "line"/"ray"/"connect"/
// "join"/"draw" cũng KHÔNG vào vocab → chỉ render IN-CONTEXT (vd có tam giác), đề
// standalone → escalate (geoClauses=0). Đối xứng VN/EN tuyệt đối + tôn trọng
// do-not-add list ("line" đã bị cấm trong vocabulary.ts).
//
// runDeterministicIntents dedup intent theo JSON.stringify CROSS-RULE → "Draw AH
// perpendicular to BC" khớp CẢ perpFoot (emit connect(A,H,'segment')) lẫn DRAW_PAIR_EN
// (cũng connect(A,H,'segment')) → IDENTICAL → deduped, vô hại.

// "segment XY" → segment (đối VN "đoạn"). Group 1,2 = cặp HOA.
const SEG_NOUN_EN = /(?<![A-Za-z])[Ss]egment\s+([A-Z])([A-Z])(?![A-Za-z])/gu;
// "line XY" → line (đối VN "đường thẳng").
const LINE_NOUN_EN = /(?<![A-Za-z])[Ll]ine\s+([A-Z])([A-Z])(?![A-Za-z])/gu;
// Guard cho segment/line noun: BỎ match nếu cặp thuộc clause của rule prio cao
// hơn đã SỞ HỮU cặp: perpBisector ("(perpendicular) bisector (segment|line) PAIR")
// / perpFoot ("perpendicular to (line|segment) PAIR") / pointAtDistance ("Extend(ed)
// segment|line XY beyond …"). 3 rule đó emit cặp đúng style HOẶC dựng điểm phái sinh;
// connect KHÔNG được double-emit segment/line trần — đặc biệt với pointAtDistance:
// clause malformed (thiếu distance / sai hướng) → pointAtDistance KHÔNG emit → clause
// cần ESCALATE; connect claim sẽ MASK escalate đó (silent-incomplete, bỏ điểm mới).
// Case flex [Bb]/[Pp]/[Ee] (BẮT BUỘC: HOA đầu clause không được slip — bài học batch16).
const NOUN_OWNED_BEFORE_EN = /(?:[Bb]isector|[Pp]erpendicular\s+to|[Ee]xtend(?:ed)?)\s+$/u;
// "ray XY" → ray (đối VN "tia"). 2 guard:
//  (a) preceding "opposite ray of ray XY" (OPPOSITE_RAY_BEFORE_EN): điểm mới nằm trên
//      tia ĐỐI → vẽ ray X→Y SAI hướng (EN mirror VN TIA_DOI_BEFORE, batch9 8ee33af).
//  (b) trailing "(?!\s*,?\s*extended)": "ray XY extended beyond Z" là construct CỦA
//      pointAtDistance (RAY_EXTENDED_EN). connect KHÔNG claim — nếu malformed (thiếu
//      distance / Z≠Y sai hướng) pointAtDistance escalate fail-safe; connect claim sẽ
//      MASK (silent-incomplete bỏ điểm D). Well-formed thì pointAtDistance đã lo điểm
//      D — connect đứng ngoài để giữ EN-cũ (batch15) byte-identical.
// "Draw ray AB" trần (không "extended"/không "opposite ray of") → vẫn vẽ ray A→B.
const RAY_NOUN_EN = /(?<![A-Za-z])[Rr]ay\s+([A-Z])([A-Z])(?![A-Za-z])(?!\s*,?\s*extended)/gu;
const OPPOSITE_RAY_BEFORE_EN = /opposite\s+ray\s+of\s+$/u;
// "Connect/Join XY" → segment (đối VN "nối", form cặp HOA).
const JOIN_PAIR_EN = /(?<![A-Za-z])(?:[Cc]onnect|[Jj]oin)\s+([A-Z])([A-Z])(?![A-Za-z])/gu;
// "Connect/Join X and/to/with Y" → segment (tên 1 ký tự, mirror VN NOI_KW).
const JOIN_AND_EN =
  /(?<![A-Za-z])(?:[Cc]onnect|[Jj]oin)\s+([A-Z])\s+(?:and|to|with)\s+([A-Z])(?![A-Za-z])/gu;
// "Draw XY" trần → segment (đối VN "kẻ"). perpFoot draw-form "Draw AH perpendicular
// to BC" cũng khớp nhưng emit connect(A,H,'segment') IDENTICAL → deduped.
// perpBisector/cevian/tangent draw-form có "the"/"two"/chữ thường sau "Draw" →
// KHÔNG cặp HOA → KHÔNG match ở đây.
const DRAW_PAIR_EN = /(?<![A-Za-z])[Dd]raw\s+([A-Z])([A-Z])(?![A-Za-z])/gu;

function collect(
  re: RegExp,
  text: string,
  style: string,
  used: Set<string>,
  out: IntentT[],
  // Guard tuỳ chọn: bỏ qua match nếu text NGAY TRƯỚC vị trí match khớp regex này
  // (vd "tia đối của " trước "tia XY" → không emit ray naive sai hướng).
  skipIfPrecededBy?: RegExp,
): void {
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (skipIfPrecededBy && skipIfPrecededBy.test(text.slice(0, m.index))) {
      continue;
    }
    const a = m[1].toUpperCase();
    const b = m[2].toUpperCase();
    // Dedup theo cặp đỉnh trong cùng clause: vẽ trùng AB nhiều lần vô nghĩa,
    // và tránh 2 từ khoá khác nhau cùng claim 1 cặp (vd "đoạn AB" + "kẻ AB").
    const key = `${a}${b}`;
    if (used.has(key)) continue;
    used.add(key);
    out.push(connect(a, b, style));
  }
}

/**
 * Mỗi clause khớp ≥1 từ khoá vẽ → push 1 RuleMatch (gom mọi cặp tìm được).
 * Nhiều cặp trong cùng clause ⇒ nhiều intent, cùng clauseId.
 * Priority 40: thấp để rule chuyên biệt (trung trực, phân giác…) claim trước.
 */
export const connectRule: LanguageRule = {
  id: 'connect',
  priority: 40,
  languages: ['vi', 'en'],
  patterns: [
    LINE_KW, RAY_KW, NOI_KW, NOI_PAIR_KW, SEG_KW,
    SEG_NOUN_EN, LINE_NOUN_EN, RAY_NOUN_EN, JOIN_PAIR_EN, JOIN_AND_EN, DRAW_PAIR_EN,
  ],
  match(ctx) {
    const result: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const intents: IntentT[] = [];
      // Dùng span-key để 1 vị trí không bị 2 từ khoá double-count, nhưng cho
      // phép nhiều cặp khác vị trí trong cùng clause.
      const used = new Set<string>();
      // Thứ tự quan trọng: "đường thẳng AB" phải claim trước SEG (chứa "thẳng"
      // KHÔNG match SEG vì SEG yêu cầu "đoạn thẳng"/"cạnh"/"kẻ", không "đường").
      collect(LINE_KW, c.text, 'line', used, intents);
      // RAY: suppress ray naive khi nằm trong cụm "tia đối của tia XY" (hướng tia
      // gốc X→Y sai so với điểm mới trên tia đối). pointAtDistance lo điểm mới.
      collect(RAY_KW, c.text, 'ray', used, intents, TIA_DOI_BEFORE);
      collect(NOI_KW, c.text, 'segment', used, intents);
      collect(NOI_PAIR_KW, c.text, 'segment', used, intents);
      collect(SEG_KW, c.text, 'segment', used, intents);
      // EN forms (issue #46 nhóm B). `used` dedup cặp đã claim bởi form VN trong
      // cùng clause (clause trộn ngôn ngữ hiếm, nhưng an toàn). Thứ tự: noun trước,
      // verb sau; DRAW cuối (trần nhất).
      collect(SEG_NOUN_EN, c.text, 'segment', used, intents, NOUN_OWNED_BEFORE_EN);
      collect(LINE_NOUN_EN, c.text, 'line', used, intents, NOUN_OWNED_BEFORE_EN);
      collect(RAY_NOUN_EN, c.text, 'ray', used, intents, OPPOSITE_RAY_BEFORE_EN);
      collect(JOIN_PAIR_EN, c.text, 'segment', used, intents);
      collect(JOIN_AND_EN, c.text, 'segment', used, intents);
      collect(DRAW_PAIR_EN, c.text, 'segment', used, intents);
      if (intents.length > 0) {
        result.push({ ruleId: 'connect', clauseIds: [c.id], intents });
      }
    }
    return result;
  },
};
