import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { plane3d, crossSection3d } from './_shared';
import type { Intent3DT } from '../intent';

const CUE = /thiết\s+diện|cắt\s+bởi/u;
const TOKEN = /\(([A-Z])([A-Z])([A-Z])\)/u; // first 3-letter plane token in the clause

export const crossSectionRule: LanguageRule3D = {
  id: 'crossSection',
  priority: 57,
  languages: ['vi'],
  patterns: [/thiết\s+diện/u, /cắt\s+bởi/u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      if (!CUE.test(c.text)) continue;
      const m = TOKEN.exec(c.text);
      if (!m) continue;
      const [, a, b, d] = m;
      const planeName = `mp_${a}${b}${d}`;
      const intents: Intent3DT[] = [
        plane3d(planeName, { kind: 'threePoints', p1: a, p2: b, p3: d }),
        crossSection3d({ plane: planeName }),
      ];
      out.push({ ruleId: this.id, clauseIds: [c.id], intents });
    }
    return out;
  },
};
