import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { solid, addPoint3d, sphereIntent, pickCenter, parsePyramidTolerant } from './_shared';

const INSCRIBED = /nội\s*tiếp/iu;
const CUBE = /lập\s*phương/iu;
// Cầu phải là CHỦ NGỮ của "nội tiếp" (cầu TRƯỚC nội tiếp = cầu nội tiếp chóp). Né "chóp nội tiếp
// mặt cầu" (chóp-TRONG-cầu = cầu NGOẠI tiếp → circumsphere lo) — review đối kháng bắt false-positive.
const SPHERE_SUBJECT = /(?:mặt|khối|hình)\s*cầu[^.]{0,40}nội\s*tiếp/iu;

// Mặt cầu nội tiếp chóp: tâm = pyramidInsphereCenter (cách đều đáy + mọi mặt bên),
// surfacePoint = centroid đáy (cầu chạm đáy tại tâm-đáy) → R = inradius. Reuse sphere.
// Tách insphereCube (cube) qua guard CUBE; tách circumsphere (ngoại tiếp+cầu) qua INSCRIBED.
export const insphereOfPyramidRule: LanguageRule3D = {
  id: 'insphereOfPyramid',
  priority: 50,
  languages: ['vi'],
  patterns: [/(?:mặt|khối|hình)\s*cầu/iu, /nội\s*tiếp/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    if (!INSCRIBED.test(ctx.problem) || CUBE.test(ctx.problem)) return []; // cube → insphereCube
    const head = parsePyramidTolerant(ctx.problem);
    if (!head) return [];
    // Clause có "cầu … nội tiếp" (cầu là chủ ngữ) — KHÔNG khớp "chóp nội tiếp mặt cầu".
    const c = ctx.clauses.find((cl) => SPHERE_SUBJECT.test(cl.text));
    if (!c) return [];
    const { apex, base, solidRuleDraws } = head;
    const center = pickCenter([apex, ...base]);          // tâm cầu (synth, né đỉnh)
    const surf = pickCenter([apex, ...base, center]);    // tâm đáy = điểm trên mặt cầu
    const intents: Intent3DT[] = [];
    if (!solidRuleDraws) {
      intents.push(solid({
        flavor: 'pyramid', baseLabels: base,
        baseVariant: base.length === 4 ? 'square' : 'equilateral-triangle',
        apex, apexVariant: 'regular',
      }));
    }
    intents.push(
      addPoint3d(center, { kind: 'pyramidInsphereCenter', apex, vertices: base }),
      addPoint3d(surf, { kind: 'centroid', vertices: base }),
      sphereIntent({ center, surfacePoint: surf }),
    );
    return [{ ruleId: this.id, clauseIds: [c.id], intents }];
  },
};
