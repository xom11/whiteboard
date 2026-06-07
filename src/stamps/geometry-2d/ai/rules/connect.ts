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
// "đoạn (thẳng) AB" | "cạnh AB" | "kẻ AB" → segment.
const SEG_KW =
  /(?<!\p{L})(?:[Đđ]oạn(?:\s*thẳng)?|[Cc]ạnh|[Kk]ẻ)\s+([A-Z])([A-Z])(?![A-Za-z])/gu;

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
  languages: ['vi'],
  patterns: [LINE_KW, RAY_KW, NOI_KW, SEG_KW],
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
      collect(SEG_KW, c.text, 'segment', used, intents);
      if (intents.length > 0) {
        result.push({ ruleId: 'connect', clauseIds: [c.id], intents });
      }
    }
    return result;
  },
};
