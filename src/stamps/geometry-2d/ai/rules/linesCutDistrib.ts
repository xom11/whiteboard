// src/stamps/geometry-2d/ai/rules/linesCutDistrib.ts
//
// Giao điểm phân phối viết theo động từ "cắt … lần lượt tại":
//   (a) nhiều chủ ngữ, một đường: "BC và AC cắt DE lần lượt tại F và I"
//       → F = BC ∩ DE, I = AC ∩ DE
//   (b) một chủ ngữ, nhiều đường: "Đường thẳng BC cắt OA, AD lần lượt tại H và K"
//       → H = BC ∩ OA, K = BC ∩ AD
// (intersectionDistrib chỉ nhận dạng "giao điểm của … với …".) Số tên phải bằng số
// đường, đường không chứa tên giao điểm; ngược lại bỏ qua (thà thiếu còn hơn sai).
// Chủ ngữ không đứng sau "với/song song/vuông góc" (đường tham chiếu, không phải
// chủ ngữ). \b cạnh chữ Việt → (?!\p{L}), cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const PAIR = String.raw`[A-Z]{2}(?![A-Z'′])`;
const LIST = String.raw`(${PAIR}(?:\s*(?:,|và)\s*${PAIR})+)`;
const PRE = String.raw`(?:đường\s*thẳng\s+|cạnh\s+|tia\s+|đoạn(?:\s+thẳng)?\s+|các\s+(?:đường\s*thẳng|cạnh|tia)\s+)?`;
const TAI = String.raw`\s+(?:lần\s*lượt|theo\s+thứ\s+tự|thứ\s+tự|tương\s+ứng)\s+(?:tại|ở)\s+(?:các\s+điểm\s+)?([A-Z](?:\s*(?:,|và)\s*[A-Z])+)(?![A-Z'′])`;
const KHONG_THAM_CHIEU = String.raw`(?<!(?:với|song\s*song|vuông\s*góc|của|và|,)\s+(?:đường\s*thẳng\s+)?)(?<![A-Z])`;

const NHIEU_CHU_NGU = new RegExp(KHONG_THAM_CHIEU + PRE + LIST + String.raw`\s+(?:lần\s*lượt\s+)?cắt\s+` + PRE + `(${PAIR})` + TAI, 'gu');
const MOT_CHU_NGU = new RegExp(KHONG_THAM_CHIEU + PRE + `(${PAIR})` + String.raw`\s+cắt\s+` + PRE + LIST + TAI, 'gu');
const PREFILTER = /cắt[^.]{0,40}?(?:lần\s*lượt|thứ\s+tự|tương\s+ứng)\s+(?:tại|ở)/u;

const tach = (s: string) => s.split(/\s*(?:,|và)\s*/u).map((x) => x.trim()).filter(Boolean);

export const linesCutDistribRule: LanguageRule = {
  id: 'linesCutDistrib',
  priority: 45, // như intersection: các đường đã có trước
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const emit = (cap: Array<[string, string]>, ten: string[]) => {
        if (cap.length !== ten.length || new Set(ten).size !== ten.length) return;
        const khoa = (d: string) => [...d].sort().join('');
        if (cap.some(([a, b], i) => a.includes(ten[i]) || b.includes(ten[i]) || khoa(a) === khoa(b))) return;
        out.push({
          ruleId: 'linesCutDistrib',
          clauseIds: [c.id],
          intents: cap.map(([a, b], i) => addPoint(ten[i], { kind: 'intersection', of: [a, b] })),
        });
      };
      NHIEU_CHU_NGU.lastIndex = 0;
      for (const m of c.text.matchAll(NHIEU_CHU_NGU)) emit(tach(m[1]).map((x) => [x, m[2]] as [string, string]), tach(m[3]));
      MOT_CHU_NGU.lastIndex = 0;
      for (const m of c.text.matchAll(MOT_CHU_NGU)) emit(tach(m[2]).map((x) => [m[1], x] as [string, string]), tach(m[3]));
    }
    return out;
  },
};
