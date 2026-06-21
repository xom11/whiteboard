import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { coneIntent, addPoint3d, parseSolidHead3D } from './_shared';

const CUE = /(?:hình|khối)\s*nón/iu;
const INSCRIBED = /(?:nội|ngoại)\s*tiếp/iu;
// "đỉnh S" hoặc "đường cao SO" (đỉnh = chữ đầu). Strict /u.
const APEX = /(?:đỉnh\s+([A-Z])|đường\s+cao\s+([A-Z])([A-Z]))/u;

export const coneRule: LanguageRule3D = {
  id: 'cone',
  priority: 49,
  languages: ['vi'],
  patterns: [/(?:hình|khối)\s*nón/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    // Standalone only: skip compound (solid head / nội-ngoại tiếp đa diện-mặt cầu).
    if (parseSolidHead3D(ctx.problem) || INSCRIBED.test(ctx.problem)) return [];
    const c = ctx.clauses.find((cl) => CUE.test(cl.text));
    if (!c) return [];
    const am = APEX.exec(ctx.problem);
    const apexName = am ? (am[1] ?? am[2]!) : 'S';
    const baseRaw = am && am[3] ? am[3] : 'O';
    const baseName = baseRaw === apexName ? 'O' : baseRaw;
    const intents: Intent3DT[] = [
      addPoint3d(baseName, { kind: 'free', x: 0, y: 0, z: -1.2 }),
      addPoint3d(apexName, { kind: 'free', x: 0, y: 0, z: 1.2 }),
      coneIntent({ baseCenter: baseName, apex: apexName, radius: 1.4 }),
    ];
    return [{ ruleId: this.id, clauseIds: [c.id], intents }];
  },
};
