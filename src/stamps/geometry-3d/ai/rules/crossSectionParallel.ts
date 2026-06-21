import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { plane3d, crossSection3d } from './_shared';
import type { Intent3DT } from '../intent';

const CUE = /thiết\s+diện|cắt\s+bởi/iu;
// "qua <P> [và] song song [với] (<X><Y><Z>)"
const RE = /qua\s+([A-Z])\s*(?:và\s+)?song\s+song\s+(?:với\s+)?\(([A-Z])([A-Z])([A-Z])\)/u;

export const crossSectionParallelRule: LanguageRule3D = {
  id: 'crossSectionParallel',
  priority: 58,
  languages: ['vi'],
  patterns: [/song\s+song/u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      if (!CUE.test(c.text)) continue;
      const m = RE.exec(c.text);
      if (!m) continue;
      const [, p, x, y, z] = m;
      const refName = `mp_${x}${y}${z}`;
      const parName = `mp_par_${p}`;
      const intents: Intent3DT[] = [
        plane3d(refName, { kind: 'threePoints', p1: x, p2: y, p3: z }),
        plane3d(parName, { kind: 'parallelThrough', point: p, refPlane: refName }),
        crossSection3d({ plane: parName }),
      ];
      out.push({ ruleId: this.id, clauseIds: [c.id], intents });
    }
    return out;
  },
};
