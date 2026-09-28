import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { addPoint3d } from './_shared';

// Single: "Lấy (điểm)? M trên AB" | "M ∈ AB" | "M thuộc (cạnh)? SC"
// `(?<!chiếu của|từ …)`: "hình chiếu của A trên SB" / "khoảng cách từ A trên…" KHÔNG phải "A ∈ SB"
// (trước đây sinh điểm A THỨ HAI nằm trên SB — trùng nhãn đỉnh, hình sai).
const SINGLE =
  /(?:Lấy\s+(?:điểm\s+)?)?(?<!(?:chiếu(?:\s+vuông\s+góc)?\s+của|từ|đỉnh)\s+(?:điểm\s+)?)([A-Z])\s*(?:∈|thuộc(?:\s+cạnh)?|(?:nằm\s+)?trên(?:\s+cạnh)?)\s*([A-Z])([A-Z])(?![\p{L}])/u;

// Distributive: "M, N lần lượt thuộc AB, AC"
const DISTRIB =
  /(?<!(?:,|và)\s*)([A-Z])\s*,\s*([A-Z])\s+lần\s+lượt\s+(?:∈|thuộc(?:\s+(?:cạnh|cạnh\s+của)?)?|trên(?:\s+cạnh)?)\s*([A-Z])([A-Z])\s*,\s*([A-Z])([A-Z])(?![\p{L}])/u;

const FOOT_CUE = /hình\s*chiếu|chân\s+đường/iu;
// "… sao cho HB = 2HA" ngay sau "H ∈ AB": |XP1| = k|XP2| ⇒ X = P1 + k/(k+1)·(P2 − P1).
const RATIO = /^\s*(?:,\s*)?(?:sao\s+cho|thỏa\s+mãn|với)?\s*:?\s*([A-Z])([A-Z])\s*=\s*(\d+)\s*\.?\s*([A-Z])([A-Z])(?![\p{L}])/u;

/** t trên đoạn a→b cho điểm X theo tỉ số đề nêu; không có tỉ số → 0.5 (điểm bất kỳ trên cạnh). */
function ratioT(X: string, a: string, b: string, after: string): number {
  const r = RATIO.exec(after);
  if (!r) return 0.5;
  const lhs = [r[1], r[2]], rhs = [r[4], r[5]], k = Number(r[3]);
  if (!lhs.includes(X) || !rhs.includes(X) || !(k > 0)) return 0.5;
  const P1 = lhs.find((y) => y !== X), P2 = rhs.find((y) => y !== X);
  const f = k / (k + 1);
  if (P1 === a && P2 === b) return f;
  if (P1 === b && P2 === a) return 1 - f;
  return 0.5;
}

export const pointOnEdgeRule: LanguageRule3D = {
  id: 'pointOnEdge',
  priority: 60,
  languages: ['vi'],
  patterns: [/(?:∈|thuộc|trên)\s*(?:cạnh\s+)?[A-Z]{2}/u, /lần\s+lượt\s+(?:∈|thuộc|trên)/u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      const d = DISTRIB.exec(c.text);
      if (d) {
        out.push({
          ruleId: this.id,
          clauseIds: [c.id],
          intents: [
            addPoint3d(d[1], { kind: 'onSegmentEdge', a: d[3], b: d[4], t: 0.5 }),
            addPoint3d(d[2], { kind: 'onSegmentEdge', a: d[5], b: d[6], t: 0.55 }),
          ],
        });
        continue;
      }
      const m = SINGLE.exec(c.text);
      if (m) {
        // "hình chiếu của S … là điểm H ∈ AB …" → chân hình chiếu (projectionFoot) ĐÃ là H; thêm
        // H ∈ AB nữa = 2 điểm cùng nhãn (hình sai). Nhường projectionFoot.
        const before = c.text.slice(0, m.index + m[0].indexOf(m[1]));
        if (FOOT_CUE.test(c.text) && /là\s+(?:điểm\s+)?$/u.test(before)) {
          out.push({ ruleId: this.id, clauseIds: [c.id], intents: [] });
          continue;
        }
        const t = ratioT(m[1], m[2], m[3], c.text.slice((m.index ?? 0) + m[0].length));
        out.push({
          ruleId: this.id,
          clauseIds: [c.id],
          intents: [addPoint3d(m[1], { kind: 'onSegmentEdge', a: m[2], b: m[3], t })],
        });
      }
    }
    return out;
  },
};
