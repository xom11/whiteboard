import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { line3dIntent } from './_shared';

// "giao tuyến của (BCD) và (DMN)" | "giao tuyến (BCD) và (DMN)"
const RE = /giao\s+tuyến\s+(?:của\s+)?\(([A-Z]{3})\)\s*(?:và|,)\s*\(([A-Z]{3})\)/u;

export const intersectionLineRule: LanguageRule3D = {
  id: 'intersectionLine',
  priority: 58,
  languages: ['vi'],
  patterns: [/giao\s+tuyến/u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      const m = RE.exec(c.text);
      if (m) {
        out.push({
          ruleId: this.id,
          clauseIds: [c.id],
          // Pass plane1/plane2 as top-level keys; line3dIntent routes them into refs.
          intents: [
            line3dIntent({ kind: 'planePlaneIntersection', plane1: `mp_${m[1]}`, plane2: `mp_${m[2]}` }),
          ],
        });
      }
    }
    return out;
  },
};
