// src/stamps/geometry-2d/ai/rules/tangentTwoSidesCircle.ts
//
// "Đường tròn K tiếp xúc với CA, AB lần lượt tại E, F và tiếp xúc trong với (O)
//  tại S" — đường tròn MIXTILINEAR nội tiếp ứng đỉnh A:
//   - K = tâm mixtilinear (of = [đỉnh chung, đỉnh khác cạnh1, đỉnh khác cạnh2]).
//   - S = tiếp điểm với đường tròn ngoại tiếp (O).
//   - E = chân ⊥ từ K xuống cạnh1 (tiếp điểm), F = chân ⊥ xuống cạnh2.
//   - circle K_c = centerThrough(K, E).
//
// Đỉnh A = chữ CHUNG của 2 cạnh tiếp xúc (CA ∩ AB = A). 2 cạnh phải chia sẻ đúng
// 1 đỉnh → else bỏ qua (escalate).
//
// \b không khớp ký tự Việt → (?!\p{L}) + cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawCircle } from './_shared';

const PREFILTER = /[Đđ]ường\s*tròn[^.]{0,30}?tiếp\s*xúc[^.]{0,40}?tiếp\s*xúc\s+trong/u;

// group1=K, 2=cạnh1, 3=cạnh2, 4=E, 5=F, 6=S.
const RE = new RegExp(
  '[Đđ]ường\\s*tròn\\s*\\(?\\s*([A-Z])\\s*\\)?\\s+tiếp\\s*xúc\\s+(?:với\\s+)?(?:các\\s+cạnh\\s+|cạnh\\s+)?' +
    '([A-Z]{2})\\s*,\\s*([A-Z]{2})(?!\\p{L})\\s+(?:lần\\s*lượt\\s+)?(?:ở|tại)\\s+([A-Z])\\s*,\\s*([A-Z])(?!\\p{L})' +
    '\\s+và\\s+tiếp\\s*xúc\\s+trong\\s+(?:với\\s+)?\\(?\\s*[A-Z]\\s*\\)?\\s+(?:ở|tại)\\s+([A-Z])(?![A-Z])',
  'gu',
);

/** Đỉnh chung của 2 cạnh "CA","AB" (vd "A"); undefined nếu 0 hoặc 2 chung. */
function commonVertex(s1: string, s2: string): string | undefined {
  const shared = [...s1].filter((ch) => s2.includes(ch));
  return shared.length === 1 ? shared[0] : undefined;
}

export const tangentTwoSidesCircleRule: LanguageRule = {
  id: 'tangentTwoSidesCircle',
  priority: 61,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const k = m[1];
        const side1 = m[2];
        const side2 = m[3];
        const e = m[4];
        const f = m[5];
        const s = m[6];
        const apex = commonVertex(side1, side2);
        if (!apex || e === f) continue;
        const o1 = [...side1].find((ch) => ch !== apex)!; // đỉnh khác trên cạnh1
        const o2 = [...side2].find((ch) => ch !== apex)!;
        const of: [string, string, string] = [apex, o1, o2];
        const circ = `${k}_c`;
        out.push({
          ruleId: 'tangentTwoSidesCircle',
          clauseIds: [c.id],
          intents: [
            addPoint(k, { kind: 'mixtilinearPoint', of, which: 'center' }),
            addPoint(s, { kind: 'mixtilinearPoint', of, which: 'touch' }),
            addPoint(e, { kind: 'perpFoot', from: k, onLine: side1 }),
            addPoint(f, { kind: 'perpFoot', from: k, onLine: side2 }),
            drawCircle(circ, 'centerThrough', { center: k, through: e }),
          ],
        });
      }
    }
    return out;
  },
};
