// src/stamps/geometry-2d/ai/rules/pairSecondIntersection.ts
//
// CẶP giao thứ hai trên một đường tròn (phân phối 1-1):
//   "L1, L2 (lần lượt|thứ tự)? cắt (đường tròn)? (\(O\))? tại P1, P2"
//   (nối "và" hoặc ","). L1,L2 là line token 2 chữ HOA.
//     → P1 = secondIntersection(L1, circle, other1)
//       P2 = secondIntersection(L2, circle, other2)
//
//   Bài 16: "Các đường thẳng CD, AE lần lượt cắt đường tròn tại F, G."  (vô danh)
//   Bài 18: "MA và MB thứ tự cắt đường tròn (O) tại C và D."             ((O))
//
// CIRCLE RESOLUTION:
//   - Nếu clause/đề nêu "(X)" → dùng tâm X (emit RAW 'X'; resolveCircleNames
//     map 'O'→'O_c' nếu cần).
//   - Nếu đường tròn VÔ DANH ("đường tròn" không "(X)") → resolve về đường tròn
//     đường-kính DUY NHẤT trong đề: scan "(nửa)? đường tròn đường kính XY" →
//     đường tròn tên `kXY` (do diameterCircleCutsSides dựng). 0 hoặc >1 ứng viên
//     → BỎ QUA (escalate, không đoán).
//
// `other` (điểm chung đã biết để loại): trong 2 chữ của line, chọn chữ là
// circle-member. circle-member = đầu mút đường kính (B,D với kBD; A,B với O_c)
// CỘNG điểm đã khai báo qua "cắt … tại X" trên đường tròn đó (vd E của Bài 16).
//   Bài 16: "CD"→D (đầu kính), "AE"→E (giao trước). Bài 18: "MA"→A, "MB"→B.
// Nếu không chữ nào là circle-member → fallback chữ THỨ HAI của line (điểm ngoài
// thường viết trước). Hình vẫn render đúng (P nằm trên line∩circle); `other` chỉ
// định hướng chọn nhánh nào trong 2 giao.
//
// KHÔNG đụng lineCircleIntersection (SINGLE "XY cắt (O) tại Z" + TRIPLE distrib):
// rule này CHỈ dạng CẶP. Trùng intent (cùng JSON) thì dedup downstream OK.
//
// GOTCHA \b: dùng (?!\p{L})/(?<!\p{L}) + cờ 'u' quanh ký tự Việt.
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, CIRCLE_KW, DUONG_KW } from './_shared';

// CẶP: hai line token, "lần lượt|thứ tự"?, "cắt", "(đường tròn)?", "(X)?",
// "tại|ở", hai điểm.
const PAIR = new RegExp(
  '([A-Z]{2})(?![A-Z])\\s*(?:,|và)\\s*([A-Z]{2})(?![A-Z])' +
    '[^.;]{0,24}?(?:lần\\s*lượt\\s+|thứ\\s*tự\\s+)?cắt\\s+' +
    '(?:' + CIRCLE_KW + '\\s*)?' +
    '(?:\\(\\s*([A-Z])(?:[\'′]?)\\s*\\)\\s*)?' +
    '(?:lần\\s*lượt\\s+|thứ\\s*tự\\s+)?(?:tại|ở)\\s+' +
    '([A-Z])(?![A-Z])\\s*(?:,|và)\\s*([A-Z])(?![A-Z])',
  'gu',
);

const PREFILTER = /[A-Z]{2}\s*(?:,|và)\s*[A-Z]{2}[^.;]{0,40}?cắt/u;

// "đường tròn đường kính XY" → endpoints (scan toàn đề).
const DIAMETER = new RegExp(
  CIRCLE_KW + '\\s+' + DUONG_KW + '\\s*kính\\s+([A-Z])([A-Z])(?![A-Z])',
  'gu',
);

// "cắt <gì đó> tại X" — điểm giao đã khai báo trên (một) đường tròn.
const PRIOR_CUT = /cắt\s+[^.;]{0,30}?(?:tại|ở)\s+([A-Z])(?![A-Z])/gu;

interface Resolved {
  circle: string;
  members: Set<string>;
}

/** Resolve đường tròn vô danh → kXY duy nhất + thu thập circle-member. */
function resolveUnnamed(problem: string): Resolved | undefined {
  DIAMETER.lastIndex = 0;
  const dias = [...problem.matchAll(DIAMETER)];
  if (dias.length !== 1) return undefined; // 0 hoặc >1 → ambiguous → escalate
  const d0 = dias[0][1];
  const d1 = dias[0][2];
  const members = new Set<string>([d0, d1]);
  // điểm giao đã khai báo trên đường tròn (vd "cắt BC tại E").
  PRIOR_CUT.lastIndex = 0;
  for (const m of problem.matchAll(PRIOR_CUT)) members.add(m[1]);
  return { circle: `k${d0}${d1}`, members };
}

/** Circle-member với đường tròn ĐẶT TÊN "(X)": đầu mút đường kính X + giao trước. */
function resolveNamed(problem: string, center: string): Set<string> {
  const members = new Set<string>();
  // đường kính của (X): "đường tròn (X) đường kính AB" / "(X) đường kính AB".
  const DIA_NAMED = new RegExp(
    '\\(\\s*' + center + '(?:[\'′]?)\\s*\\)\\s*' + DUONG_KW + '\\s*kính\\s+([A-Z])([A-Z])(?![A-Z])',
    'gu',
  );
  for (const m of problem.matchAll(DIA_NAMED)) {
    members.add(m[1]);
    members.add(m[2]);
  }
  PRIOR_CUT.lastIndex = 0;
  for (const m of problem.matchAll(PRIOR_CUT)) members.add(m[1]);
  return members;
}

/** Chọn `other`: chữ là circle-member; else fallback chữ thứ hai của line. */
function pickOther(line: string, members: Set<string>): string {
  if (members.has(line[0]) && !members.has(line[1])) return line[0];
  if (members.has(line[1]) && !members.has(line[0])) return line[1];
  if (members.has(line[0]) && members.has(line[1])) return line[0];
  return line[1]; // điểm ngoài thường viết trước → đầu mút trên đường tròn là chữ 2
}

function valid(name: string, line: string): boolean {
  return /^[A-Z]$/u.test(name) && /^[A-Z]{2}$/u.test(line) && !line.includes(name);
}

export const pairSecondIntersectionRule: LanguageRule = {
  id: 'pairSecondIntersection',
  priority: 46,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      PAIR.lastIndex = 0;
      for (const m of c.text.matchAll(PAIR)) {
        const line1 = m[1];
        const line2 = m[2];
        const center = m[3]; // có thể undefined (vô danh)
        const p1 = m[4];
        const p2 = m[5];
        if (!valid(p1, line1) || !valid(p2, line2)) continue;
        if (p1 === p2) continue;

        let circle: string;
        let members: Set<string>;
        if (center) {
          circle = center;
          members = resolveNamed(ctx.problem, center);
        } else {
          const r = resolveUnnamed(ctx.problem);
          if (!r) continue; // ambiguous → escalate
          circle = r.circle;
          members = r.members;
        }

        const intents: IntentT[] = [
          addPoint(p1, {
            kind: 'secondIntersection',
            line: line1,
            circle,
            other: pickOther(line1, members),
          }),
          addPoint(p2, {
            kind: 'secondIntersection',
            line: line2,
            circle,
            other: pickOther(line2, members),
          }),
        ];
        out.push({ ruleId: 'pairSecondIntersection', clauseIds: [c.id], intents });
      }
    }
    return out;
  },
};
