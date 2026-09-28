// src/stamps/geometry-2d/ai/rules/givenPoints.ts
//
// Đề mở đầu bằng ĐIỂM/ĐOẠN TRẦN, không có hình nào (rất hay gặp ở chương Vectơ lớp 10):
//   "Cho đoạn thẳng AB."                       → A, B tự do + đoạn AB
//   "Cho hai điểm phân biệt A và B."            → A, B tự do
//   "Cho ba điểm A, B, C không thẳng hàng."    → 3 điểm tự do không thẳng hàng
//   "Cho bốn điểm A, B, C, D."                 → 4 điểm tự do (không nối)
// Trước đây không rule nào dựng các điểm này ⇒ mọi construct phía sau (trung điểm,
// điểm chia theo tỉ số…) hỏng UNKNOWN_REF và cả bài trắng tay.
//
// "thẳng hàng" / "cùng thuộc một đường thẳng" (không có "không") là việc của
// collinearPoints — bỏ qua. Chỉ nhận ở mệnh đề mở đầu bằng "Cho".
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, connect } from './_shared';

const NAME = "(?<![A-Z])[A-Z](?![A-Z'′])";
const DOAN = new RegExp(String.raw`^(?:[0-9]+\s*[.)]\s*)?[Cc]ho\s+(?:một\s+)?đoạn(?:\s+thẳng)?\s+([A-Z])([A-Z])(?![A-Z'′])`, 'u');
const DIEM = new RegExp(
  String.raw`^(?:[0-9]+\s*[.)]\s*)?[Cc]ho\s+(?:(\d|hai|ba|bốn|năm|sáu)\s+)?điểm\s+(?:phân\s+biệt\s+)?(${NAME}(?:\s*(?:,|và)\s*${NAME})+)`,
  'u',
);
const THANG_HANG = /(?<!không\s)thẳng\s+hàng|(?:thuộc|nằm\s+trên)\s+(?:một\s+)?(?:cùng\s+)?(?:một\s+)?[Đđ]ư[ờơ]ng\s*thẳng/u;
const CON_LAI = /^\s*(?:(?:phân\s+biệt|bất\s+k[ìỳiy]|tu[ỳy]\s+ý|không\s+thẳng\s+hàng|cho\s+trước)\s*,?\s*)*$/u;
const SO: Record<string, number> = { hai: 2, ba: 3, 'bốn': 4, 'năm': 5, 'sáu': 6 };

// Vị trí mẫu: không thẳng hàng, không cân/vuông "tình cờ".
const VI_TRI: Record<number, [number, number][]> = {
  2: [[0, 0], [6, 0]],
  3: [[0, 0], [5, 0], [1.8, 3.4]],
  4: [[0, 0], [5.2, -0.4], [6, 3.2], [1.2, 3.8]],
  5: [[0, 0], [4.6, -0.6], [6.4, 2.6], [3, 4.8], [-0.8, 3]],
  6: [[0, 0], [4, -0.8], [6.6, 1.6], [5.6, 4.6], [1.6, 5.2], [-1, 2.6]],
};

export const givenPointsRule: LanguageRule = {
  id: 'givenPoints',
  // Ngay dưới triangle (100): chỉ khi đề không có hình — điểm free first-wins.
  priority: 99,
  languages: ['vi'],
  patterns: [/[Cc]ho\s+(?:một\s+)?đoạn|[Cc]ho\s+(?:\S+\s+)?điểm/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const d = DOAN.exec(c.text);
      if (d && d[1] !== d[2] && !/^\s*(?:thuộc|nằm|là)(?!\p{L})/u.test(c.text.slice(d.index + d[0].length))) {
        const intents: IntentT[] = [
          addPoint(d[1], { kind: 'free', at: VI_TRI[2][0] }),
          addPoint(d[2], { kind: 'free', at: VI_TRI[2][1] }),
          connect(d[1], d[2]),
        ];
        out.push({ ruleId: 'givenPoints', clauseIds: [c.id], intents });
        continue;
      }
      const m = DIEM.exec(c.text);
      if (!m || THANG_HANG.test(c.text)) continue;
      // Phần sau danh sách tên chỉ được là lời bổ nghĩa "phân biệt/bất kì/không
      // thẳng hàng": "Cho 2 điểm A và B thuộc đường tròn (O)" là điểm TRÊN (O),
      // không phải điểm tự do.
      if (!CON_LAI.test(c.text.slice(m.index + m[0].length))) continue;
      const ten = m[2].split(/\s*,\s*|\s+và\s+/u).map((s) => s.trim());
      if (new Set(ten).size !== ten.length || !VI_TRI[ten.length]) continue;
      if (m[1] && (SO[m[1]] ?? Number(m[1])) !== ten.length) continue;
      const vt = VI_TRI[ten.length];
      out.push({
        ruleId: 'givenPoints',
        clauseIds: [c.id],
        intents: ten.map((t, i) => addPoint(t, { kind: 'free', at: vt[i] })),
      });
    }
    return out;
  },
};
