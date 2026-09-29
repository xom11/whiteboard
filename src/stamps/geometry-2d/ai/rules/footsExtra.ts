// src/stamps/geometry-2d/ai/rules/footsExtra.ts
//
// Chân đường vuông góc / hình chiếu — các cách viết perpFoot chưa nhận:
//   (A) chung một đường, hai điểm chiếu:
//       "M, N lần lượt là hình chiếu vuông góc của A và B lên đường thẳng EF"
//       "H, K theo thứ tự là chân đường vuông góc kẻ từ A và B đến CD"
//   (B) chân đường cao từ ĐỈNH, không nêu cạnh (suy cạnh đối từ tam giác):
//       "H là chân đường cao hạ từ đỉnh A của tam giác ABC"
//       "D và E lần lượt là chân đường cao của tam giác ABC hạ từ B và C"
// → perpFoot + đoạn nối điểm → chân.
//
// \b cạnh chữ Việt → (?!\p{L}) + cờ 'u'; không cờ 'i' (nhãn [A-Z]).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

const LANLUOT = String.raw`(?:(?:lần\s*lượt|theo\s+thứ\s+tự|thứ\s+tự|tương\s+ứng)\s+)?`;
const CHIEU = String.raw`(?:hình\s*chiếu(?:\s+vuông\s*góc)?|chân\s+(?:của\s+)?(?:các\s+)?đường\s+(?:vuông\s*góc|cao))`;

// (A) g1,g2 = tên; g3,g4 = điểm chiếu; g5 = đường.
const CHUNG_DUONG = new RegExp(
  String.raw`(?<![A-Z])([A-Z])\s*(?:,|và)\s*([A-Z])(?![A-Z'′])\s+` + LANLUOT + String.raw`là\s+(?:các\s+)?` + CHIEU +
    String.raw`\s+(?:của\s+|(?:kẻ|hạ|vẽ)\s+từ\s+|từ\s+)?(?:các\s+)?(?:điểm\s+)?([A-Z])\s*(?:,|và)\s*([A-Z])(?![A-Z'′])` +
    String.raw`\s+(?:trên|lên|xuống|đến|tới)\s+(?:đường\s*thẳng\s+|cạnh\s+|đoạn(?:\s+thẳng)?\s+)?([A-Z]{2})(?![A-Z])(?!\s*(?:,|và)\s*[A-Z]{2})`,
  'gu',
);

const DUONG_CAO = String.raw`chân\s+(?:của\s+)?(?:các\s+)?đường\s+cao`;
const TU_DINH = String.raw`(?:(?:hạ|kẻ|vẽ)\s+)?(?:từ\s+)?(?:các\s+)?(?:đỉnh\s+)?`;
const CUA_TG = String.raw`(?:\s*(?:của|trong)\s+tam\s*giác\s+[A-Z]{3})?`;
// (B1) "H là chân đường cao (của tam giác ABC)? hạ từ (đỉnh)? A (của tam giác ABC)?"
const MOT_DINH = new RegExp(
  String.raw`(?<![A-Z])([A-Z])(?![A-Z'′])\s+là\s+` + DUONG_CAO + CUA_TG + String.raw`\s+` + TU_DINH + String.raw`([A-Z])(?![A-Z'′])` + CUA_TG +
    String.raw`(?!\s*(?:trên|lên|xuống|đến|tới|,|và)\s)`,
  'gu',
);
// (B2) "D và E lần lượt là chân đường cao (của tam giác ABC)? hạ từ B và C"
const HAI_DINH = new RegExp(
  String.raw`(?<![A-Z])([A-Z])\s*(?:,|và)\s*([A-Z])(?![A-Z'′])\s+` + LANLUOT + String.raw`là\s+(?:các\s+)?` + DUONG_CAO + CUA_TG + String.raw`\s+` + TU_DINH +
    String.raw`([A-Z])\s*(?:,|và)\s*([A-Z])(?![A-Z'′])` + CUA_TG + String.raw`(?!\s*(?:trên|lên|xuống|đến|tới)\s)`,
  'gu',
);

const TAM_GIAC = /tam\s*giác\s+(?:(?:nhọn|vuông|cân|đều|tù)\s+)?([A-Z])([A-Z])([A-Z])(?![A-Z])/gu;

/** Cạnh đối đỉnh v của tam giác đầu tiên trong đề chứa v. */
function canhDoi(problem: string, v: string): string | undefined {
  for (const m of problem.matchAll(TAM_GIAC)) {
    const d = [m[1], m[2], m[3]];
    if (new Set(d).size === 3 && d.includes(v)) return d.filter((x) => x !== v).join('');
  }
  return undefined;
}

const PREFILTER = /hình\s*chiếu|chân\s+(?:của\s+)?(?:các\s+)?đường\s+(?:vuông\s*góc|cao)/u;

export const footsExtraRule: LanguageRule = {
  id: 'footsExtra',
  priority: 65, // như perpFoot
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    const chan = (id: number, ten: string, tu: string, duong: string) => {
      if (ten === tu || duong.includes(ten) || duong.includes(tu)) return;
      out.push({
        ruleId: 'footsExtra',
        clauseIds: [id],
        intents: [addPoint(ten, { kind: 'perpFoot', from: tu, onLine: duong }), connect(tu, ten, 'segment')],
      });
    };
    for (const c of ctx.clauses) {
      CHUNG_DUONG.lastIndex = 0;
      for (const m of c.text.matchAll(CHUNG_DUONG)) {
        if (m[1] === m[2] || m[3] === m[4]) continue;
        chan(c.id, m[1], m[3], m[5]);
        chan(c.id, m[2], m[4], m[5]);
      }
      MOT_DINH.lastIndex = 0;
      for (const m of c.text.matchAll(MOT_DINH)) {
        const canh = canhDoi(ctx.problem, m[2]);
        if (canh) chan(c.id, m[1], m[2], canh);
      }
      HAI_DINH.lastIndex = 0;
      for (const m of c.text.matchAll(HAI_DINH)) {
        if (m[1] === m[2] || m[3] === m[4]) continue;
        const c1 = canhDoi(ctx.problem, m[3]);
        const c2 = canhDoi(ctx.problem, m[4]);
        if (c1 && c2) {
          chan(c.id, m[1], m[3], c1);
          chan(c.id, m[2], m[4], c2);
        }
      }
    }
    return out;
  },
};
