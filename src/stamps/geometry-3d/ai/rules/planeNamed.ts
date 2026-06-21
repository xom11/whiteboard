import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { plane3d } from './_shared';

// Match "(ABC)" tokens — exactly 3 uppercase letters
const PLANE_TOKEN = /\(([A-Z])([A-Z])([A-Z])\)/gu;

export const planeNamedRule: LanguageRule3D = {
  id: 'planeNamed',
  priority: 55,
  languages: ['vi'],
  patterns: [/mặt\s+phẳng/u, /giao\s+tuyến/u, /thiết\s+diện/u, /\([A-Z]{3}\)/u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const seen = new Set<string>();
    const intents: Intent3DT[] = [];
    const claimed: number[] = [];
    for (const c of ctx.clauses) {
      PLANE_TOKEN.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = PLANE_TOKEN.exec(c.text))) {
        const key = `${m[1]}${m[2]}${m[3]}`;
        if (seen.has(key)) continue;
        seen.add(key);
        intents.push(plane3d(`mp_${key}`, { kind: 'threePoints', p1: m[1], p2: m[2], p3: m[3] }));
        if (!claimed.includes(c.id)) claimed.push(c.id);
      }
    }
    return intents.length ? [{ ruleId: this.id, clauseIds: claimed, intents }] : [];
  },
};
