import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { cylinderIntent, addPoint3d, parseSolidHead3D } from './_shared';

const CUE = /(?:hình|khối)\s*trụ/iu;
const INSCRIBED = /(?:nội|ngoại)\s*tiếp/iu;

export const cylinderRule: LanguageRule3D = {
  id: 'cylinder',
  priority: 48,
  languages: ['vi'],
  patterns: [/(?:hình|khối)\s*trụ/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    // Standalone only: skip compound (lăng trụ dotted / nội-ngoại tiếp).
    if (parseSolidHead3D(ctx.problem) || INSCRIBED.test(ctx.problem)) return [];
    const c = ctx.clauses.find((cl) => CUE.test(cl.text));
    if (!c) return [];
    const intents: Intent3DT[] = [
      addPoint3d('O', { kind: 'free', x: 0, y: 0, z: -1.2 }),
      addPoint3d('I', { kind: 'free', x: 0, y: 0, z: 1.2 }),
      cylinderIntent({ baseCenter: 'O', topCenter: 'I', radius: 1.4 }),
    ];
    return [{ ruleId: this.id, clauseIds: [c.id], intents }];
  },
};
