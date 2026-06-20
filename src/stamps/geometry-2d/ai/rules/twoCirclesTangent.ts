// src/stamps/geometry-2d/ai/rules/twoCirclesTangent.ts
//
// HAI đường tròn TIẾP XÚC nhau tại 1 điểm (tiếp xúc ngoài / tiếp xúc nhau):
//   "Cho hai đường tròn (O) và (O') tiếp xúc ngoài tại A …"      (httcd:25/61/87)
//   "Cho hai đường tròn (O) và (O') tiếp xúc nhau tại A. …"      (httcd:92)
//
// → 2 đường tròn + tiếp điểm A. Dựng bằng TOẠ ĐỘ TƯỜNG MINH để tiếp xúc THỰC SỰ
//   tại A: O=(-r1,0), O'=(r2,0), A=(0,0) (gốc) → |OA|=r1, |O'A|=r2, A nằm giữa O
//   và O' trên trục → 2 đường tròn centerThrough(O,A)/(O',A) tiếp xúc ngoài tại A.
//
//   (Tiếp xúc TRONG hiếm hơn + cần 1 tâm trong đường tròn kia; tầng này chỉ phủ
//    "tiếp xúc ngoài"/"tiếp xúc nhau" = tiếp xúc ngoài mặc định. Partial OK.)
//
// Đây là "bộ khung" tối thiểu để bài rời NONE; các điểm/đường phái sinh (tiếp
// tuyến chung, cát tuyến qua A …) do rule khác hoặc LLM bù. Tiếp điểm A là gốc
// nhiều phái sinh nên dựng SỚM.
//
// Guard: 2 tâm KHÁC tên (OCR rơi prime → trùng tên = hỏng dữ liệu, escalate).
// A ≠ tâm. KHÔNG kích hoạt dạng "tiếp xúc TRONG" (cần dựng khác) — guard loại.
//
// GOTCHA \b: ký tự Việt → cờ 'u' + lookaround (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawCircle } from './_shared';

const PREFILTER = /hai\s+[Đđ]ư[ờơ]ng\s*tròn[^.]{0,70}?tiếp\s*xúc/u;

// "(X)" / "(X;R)" — X = 1 HOA + prime optional.
const CIRCLE = "\\(\\s*([A-Z]['′]?)(?:\\s*[;,]\\s*(?:[Rr]['′]?|\\d+(?:[.,]\\d+)?\\s*[a-z]*))?\\s*\\)";

// "hai đường tròn (O) và (O') tiếp xúc (ngoài|nhau)? (nhau)? (tại|ở) A".
// "trong" (tiếp xúc trong) bị guard loại sau (cần dựng khác). "ngoài"/"nhau" = ngoài.
const TWO_TANGENT = new RegExp(
  'hai\\s+[Đđ]ư[ờơ]ng\\s*tròn\\s*' +
    CIRCLE +
    '\\s*(?:[;,]\\s*)?và\\s*' +
    CIRCLE +
    '\\s*tiếp\\s*xúc\\s+(ngoài|trong|nhau)?\\s*(?:nhau\\s+)?(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])(?![A-Za-z])',
  'u',
);

const norm = (s: string) => s.replace(/′/g, "'");

export const twoCirclesTangentRule: LanguageRule = {
  id: 'two-circles-tangent',
  // TRÊN chord/externalPoint, cạnh twoCirclesMeet (74): tiếp điểm A là gốc nhiều
  // phái sinh → dựng sớm.
  priority: 74,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const m = TWO_TANGENT.exec(ctx.problem);
    if (!m) return [];
    const c1 = norm(m[1]);
    const c2 = norm(m[2]);
    const mode = m[3]; // "ngoài" | "trong" | "nhau" | undefined
    const a = m[4];
    if (mode === 'trong') return []; // tiếp xúc TRONG: defer (cần dựng khác)
    if (c1 === c2) return []; // 2 tâm trùng tên (OCR mất prime) → escalate
    if (a === c1 || a === c2) return [];

    const r1 = 3;
    const r2 = 2;
    const declId = ctx.clauses.find((c) => /tiếp\s*xúc/u.test(c.text))?.id;
    return [
      {
        ruleId: 'two-circles-tangent',
        clauseIds: declId === undefined ? [] : [declId],
        intents: [
          // A = gốc; O bên trái cách r1, O' bên phải cách r2 → tiếp xúc ngoài tại A.
          addPoint(a, { kind: 'free', at: [0, 0] }),
          addPoint(c1, { kind: 'free', at: [-r1, 0] }),
          addPoint(c2, { kind: 'free', at: [r2, 0] }),
          drawCircle(`${c1}_t`, 'centerThrough', { center: c1, through: a }),
          drawCircle(`${c2}_t`, 'centerThrough', { center: c2, through: a }),
        ],
      },
    ];
  },
};
