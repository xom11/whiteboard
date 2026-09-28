// src/stamps/geometry-2d/ai/rules/oppositeRayAtLength.ts
//
// Điểm trên TIA ĐỐI có ĐỘ DÀI đề cho, đoạn mới viết ở vế PHẢI (hoặc vế trái):
//
//   "Trên tia đối của tia CB lấy điểm N sao cho BM = CN"   → CN = BM
//   "Trên tia đối của tia IH lấy điểm K sao cho HI = IK"   → IK = IH
//   "Trên tia đối của tia MA lấy điểm D sao cho MD = MA"   → MD = MA
//
// Tia XY gốc X, tia đối gốc X ngược Y ⇒ P = pointAtDistance(from Y, through X,
// d = |đoạn đã biết|) — P nằm bên kia X, XP đúng bằng đoạn đề cho. Nối XP.
//
// `pointAtDistance` chỉ nhận dạng đoạn mới đứng TRƯỚC dấu "=" bắt đầu từ gốc tia;
// `oppositeRayPoint` từng đặt P ở khoảng cách tuỳ ý bất chấp "sao cho" (hình sai).
//
// Thà thiếu còn hơn sai: đoạn chứa P phải đúng là XP (đo từ GỐC tia); vế kia là
// một đoạn đã biết không chứa P; không nhận biểu thức (BD = AC + AB, = 2AB…).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

const RE = new RegExp(
  String.raw`[Tt]rên\s+tia\s+đối\s+(?:của\s+)?(?:tia\s+)?([A-Z])([A-Z])(?![A-Z])[^.]{0,20}?lấy\s+(?:một\s+)?(?:điểm\s+)?([A-Z])(?![\p{L}\d'′])` +
    String.raw`\s*,?\s*sao\s+cho\s+([A-Z])([A-Z])\s*=\s*([A-Z])([A-Z])(?![\p{L}\d'′])(?!\s*[+\-*/·.]\s*[A-Z\d])`,
  'gu',
);

export const oppositeRayAtLengthRule: LanguageRule = {
  id: 'oppositeRayAtLength',
  priority: 56,
  languages: ['vi'],
  patterns: [/tia\s+đối[^.]{0,40}sao\s+cho/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const [, x, y, p, a1, a2, b1, b2] = m;
        if (new Set([x, y, p]).size !== 3) continue;
        const la = (u: string, v: string) => (u === x && v === p) || (u === p && v === x);
        let known: [string, string] | null = null;
        if (la(a1, a2) && b1 !== p && b2 !== p && b1 !== b2) known = [b1, b2];
        else if (la(b1, b2) && a1 !== p && a2 !== p && a1 !== a2) known = [a1, a2];
        if (!known) continue;
        out.push({
          ruleId: 'oppositeRayAtLength',
          clauseIds: [c.id],
          intents: [
            addPoint(p, {
              kind: 'pointAtDistance',
              from: y,
              through: x,
              distance: { kind: 'segmentLength', p1: known[0], p2: known[1] },
            }),
            connect(x, p, 'segment'),
          ],
        });
      }
    }
    return out;
  },
};
