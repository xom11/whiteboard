import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { coneIntent, addPoint3d, parseSolidHead3D, polygonIntent, sectionNames } from './_shared';

const CUE = /(?:hình|khối)\s*nón/iu;
const INSCRIBED = /(?:nội|ngoại)\s*tiếp/iu;
// "đỉnh S" hoặc "đường cao SO" (đỉnh = chữ đầu). Strict /u.
const APEX = /(?:đỉnh\s+([A-Z])|đường\s+cao\s+([A-Z])([A-Z]))/u;
// Thiết diện qua trục / mặt phẳng qua trục|đỉnh → vẽ tam giác qua trục.
const AXIAL = /(?:thiết\s*diện\s*qua\s*trục|(?:mặt\s*phẳng|thiết\s*diện)[^.]*qua\s*(?:trục|đỉnh))/iu;

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
    // Scope tới CHÍNH clause nón (tránh nhặt "đỉnh/đường cao" từ tam giác khác trong đề).
    const am = APEX.exec(c.text);
    const apexName = am ? (am[1] ?? am[2]!) : 'S';
    const baseRaw = am && am[3] ? am[3] : 'O';
    const baseName = baseRaw === apexName ? 'O' : baseRaw;
    const intents: Intent3DT[] = [
      addPoint3d(baseName, { kind: 'free', x: 0, y: 0, z: -1.2 }),
      addPoint3d(apexName, { kind: 'free', x: 0, y: 0, z: 1.2 }),
      coneIntent({ baseCenter: baseName, apex: apexName, radius: 1.4 }),
    ];
    const clauseIds = [c.id];
    if (AXIAL.test(ctx.problem)) {
      // 2 đầu mút đường kính đáy (trên vành R=1.4) + tam giác qua trục [A, đỉnh, B].
      const [pA, pB] = sectionNames(2, [apexName, baseName]);
      intents.push(
        addPoint3d(pA, { kind: 'free', x: -1.4, y: 0, z: -1.2 }),
        addPoint3d(pB, { kind: 'free', x: 1.4, y: 0, z: -1.2 }),
        polygonIntent({ vertices: [pA, apexName, pB] }),
      );
      const sc = ctx.clauses.find((cl) => AXIAL.test(cl.text));
      if (sc && sc.id !== c.id) clauseIds.push(sc.id);
    }
    return [{ ruleId: this.id, clauseIds, intents }];
  },
};
