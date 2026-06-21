import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { plane3d, addPoint3d } from './_shared';
import type { Intent3DT } from '../intent';

// "giao điểm [I] [của] MN với|và (BCD)" — [Gg]iao tolerates sentence-initial capital
const RE = /[Gg]iao\s+điểm\s+(?:([A-Z])\s+)?(?:của\s+)?([A-Z])([A-Z])\s*(?:với|và)\s*\(([A-Z])([A-Z])([A-Z])\)/u;

export const linePlanePointRule: LanguageRule3D = {
  id: 'linePlanePoint',
  priority: 56,
  languages: ['vi'],
  patterns: [/giao\s+điểm/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      const m = RE.exec(c.text);
      if (!m) continue;
      const [, named, a, b, x, y, z] = m;
      const planeName = `mp_${x}${y}${z}`;
      const name = named ?? `gp_${a}${b}`;
      const intents: Intent3DT[] = [
        plane3d(planeName, { kind: 'threePoints', p1: x, p2: y, p3: z }),
        addPoint3d(name, { kind: 'intersectionLinePlane', a, b, plane: planeName }),
      ];
      out.push({ ruleId: this.id, clauseIds: [c.id], intents });
    }
    return out;
  },
};
