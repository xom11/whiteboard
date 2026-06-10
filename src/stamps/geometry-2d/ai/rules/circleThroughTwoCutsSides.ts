// src/stamps/geometry-2d/ai/rules/circleThroughTwoCutsSides.ts
//
// "Đường tròn (I) (luôn)? (đi)? qua B và C cắt AB, AC (lần lượt)? tại M, N"
//   → tâm I = điểm tự do trên TRUNG TRỰC của BC (⇒ đường tròn qua cả B lẫn C),
//     đường tròn I_c = centerThrough(I, B), M = giao thứ hai (AB, I_c) loại B,
//     N = giao thứ hai (AC, I_c) loại C.
//
// Đường tròn qua 2 điểm có 1 bậc tự do (tâm chạy trên trung trực) — mô hình bằng
// onPerpBisector + centerThrough để kéo vẫn đi qua đúng B, C.
//
// Mỗi cạnh bị cắt PHẢI chứa đúng 1 trong 2 điểm-qua (B hoặc C) để xác định điểm
// chung loại trừ (other) cho giao thứ hai. Lệch → bỏ qua (escalate fail-safe).
//
// \b không khớp ký tự Việt → (?!\p{L}) + cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawCircle } from './_shared';

const PREFILTER = /[Đđ]ường\s*tròn\s*\(?[A-Z]\)?[^.]{0,30}?(?:đi\s+)?qua\s+[A-Z][^.]{0,30}?cắt/u;

// group1 = tâm I, 2+3 = 2 điểm qua (B,C), 4+5 = 2 cạnh (AB,AC), 6+7 = 2 giao (M,N).
const RE = new RegExp(
  '[Đđ]ường\\s*tròn\\s*\\(\\s*([A-Z])\\s*\\)\\s*(?:luôn\\s+)?(?:đi\\s+)?qua\\s+([A-Z])\\s+(?:và|,)\\s+([A-Z])(?!\\p{L})' +
    '[^.]{0,20}?cắt\\s+(?:các\\s+(?:cạnh|đoạn)\\s+|cạnh\\s+|đoạn\\s+)?([A-Z]{2})\\s*(?:,|và)\\s*([A-Z]{2})(?!\\p{L})' +
    '\\s+(?:lần\\s*lượt\\s+)?(?:ở|tại)\\s+([A-Z])\\s*(?:,|và)\\s*([A-Z])(?![A-Z])',
  'gu',
);

/** Điểm-qua (B hoặc C) nằm trên cạnh `side` để làm `other` cho giao thứ hai. */
function commonPoint(side: string, p1: string, p2: string): string | undefined {
  const onP1 = side.includes(p1);
  const onP2 = side.includes(p2);
  if (onP1 && !onP2) return p1;
  if (onP2 && !onP1) return p2;
  return undefined; // 0 hoặc 2 → không xác định → escalate
}

export const circleThroughTwoCutsSidesRule: LanguageRule = {
  id: 'circleThroughTwoCutsSides',
  priority: 58,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const center = m[1];
        const b = m[2];
        const cc = m[3];
        const side1 = m[4];
        const side2 = m[5];
        const n1 = m[6];
        const n2 = m[7];
        if (b === cc || n1 === n2) continue;
        const other1 = commonPoint(side1, b, cc);
        const other2 = commonPoint(side2, b, cc);
        if (!other1 || !other2) continue;
        const circ = `${center}_c`;
        out.push({
          ruleId: 'circleThroughTwoCutsSides',
          clauseIds: [c.id],
          intents: [
            addPoint(center, { kind: 'onPerpBisector', p1: b, p2: cc }),
            drawCircle(circ, 'centerThrough', { center, through: b }),
            addPoint(n1, { kind: 'secondIntersection', line: side1, circle: circ, other: other1 }),
            addPoint(n2, { kind: 'secondIntersection', line: side2, circle: circ, other: other2 }),
          ],
        });
      }
    }
    return out;
  },
};
