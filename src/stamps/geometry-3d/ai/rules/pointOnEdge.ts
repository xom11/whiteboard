import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { addPoint3d } from './_shared';

// Single: "Lấy (điểm)? M trên AB" | "M ∈ AB" | "M thuộc (cạnh)? SC"
const SINGLE =
  /(?:Lấy\s+(?:điểm\s+)?)?([A-Z])\s*(?:∈|thuộc(?:\s+cạnh)?|(?:nằm\s+)?trên(?:\s+cạnh)?)\s*([A-Z])([A-Z])(?![\p{L}])/u;

// Distributive: "M, N lần lượt thuộc AB, AC"
const DISTRIB =
  /([A-Z])\s*,\s*([A-Z])\s+lần\s+lượt\s+(?:∈|thuộc(?:\s+(?:cạnh|cạnh\s+của)?)?|trên(?:\s+cạnh)?)\s*([A-Z])([A-Z])\s*,\s*([A-Z])([A-Z])(?![\p{L}])/u;

export const pointOnEdgeRule: LanguageRule3D = {
  id: 'pointOnEdge',
  priority: 60,
  languages: ['vi'],
  patterns: [/(?:∈|thuộc|trên)\s*[A-Z]{2}/u, /lần\s+lượt\s+(?:∈|thuộc|trên)/u],
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
        out.push({
          ruleId: this.id,
          clauseIds: [c.id],
          intents: [addPoint3d(m[1], { kind: 'onSegmentEdge', a: m[2], b: m[3], t: 0.5 })],
        });
      }
    }
    return out;
  },
};
