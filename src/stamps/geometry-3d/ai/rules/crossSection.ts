import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { plane3d, crossSection3d } from './_shared';
import type { Intent3DT } from '../intent';

const CUE = /thiết\s+diện|cắt\s+bởi/iu;
const TOKEN = /\(([A-Z])([A-Z])([A-Z])\)/u; // first 3-letter plane token in the clause — stay case-sensitive

export const crossSectionRule: LanguageRule3D = {
  id: 'crossSection',
  priority: 57,
  languages: ['vi'],
  patterns: [/thiết\s+diện/iu, /cắt\s+bởi/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      if (!CUE.test(c.text)) continue;
      // Parallel-plane phrasing ("qua M song song (SBC)") is owned by crossSectionParallelRule —
      // the (XYZ) token here is the REFERENCE plane, not the cutting plane. Skip to avoid a spurious section.
      if (/qua\s+[A-Z]\s*(?:và\s+)?song\s+song/u.test(c.text)) continue;
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
