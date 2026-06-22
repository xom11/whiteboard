import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { cylinderIntent, addPoint3d, parseSolidHead3D, polygonIntent, sectionNames } from './_shared';

const CUE = /(?:hình|khối)\s*trụ/iu;
const INSCRIBED = /(?:nội|ngoại)\s*tiếp/iu;
// Thiết diện qua trục / mặt phẳng qua trục → vẽ hình chữ nhật qua trục.
const AXIAL = /(?:thiết\s*diện\s*qua\s*trục|(?:mặt\s*phẳng|thiết\s*diện)[^.]*qua\s*(?:trục|đỉnh))/iu;

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
    const clauseIds = [c.id];
    if (AXIAL.test(ctx.problem)) {
      // 4 đầu mút 2 đường kính 2 đáy → hcn qua trục [A(đáy−),B(đáy+),C(đỉnh+),D(đỉnh−)].
      const [a, b, cc, d] = sectionNames(4, ['O', 'I']);
      intents.push(
        addPoint3d(a, { kind: 'free', x: -1.4, y: 0, z: -1.2 }),
        addPoint3d(b, { kind: 'free', x: 1.4, y: 0, z: -1.2 }),
        addPoint3d(cc, { kind: 'free', x: 1.4, y: 0, z: 1.2 }),
        addPoint3d(d, { kind: 'free', x: -1.4, y: 0, z: 1.2 }),
        polygonIntent({ vertices: [a, b, cc, d] }),
      );
      const sc = ctx.clauses.find((cl) => AXIAL.test(cl.text));
      if (sc && sc.id !== c.id) clauseIds.push(sc.id);
    }
    return [{ ruleId: this.id, clauseIds, intents }];
  },
};
