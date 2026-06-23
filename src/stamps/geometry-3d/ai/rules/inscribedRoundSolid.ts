import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import {
  coneIntent, cylinderIntent, addPoint3d, solid,
  splitVertexToken, pickCenter, parsePyramidTolerant, sectionNames,
} from './_shared';

const ROUND = /(?:hình|khối)\s*(?:nón|trụ)/iu;
const CONE_T = /(?:hình|khối)\s*nón/iu;
const INSCRIBED = /(?:nội|ngoại)\s*tiếp/iu;
const NGOAI = /ngoại\s*tiếp/iu;
const FACE = /(?:tam\s*giác|tứ\s*giác)\s+([A-Z]{3,4})(?![\p{L}])/u; // mặt định nghĩa đường tròn đáy
const APEX = /đỉnh\s+([A-Z])(?![\p{L}])/u;
const CUBE = /lập\s*phương/iu;
const REGULAR = /(?:đều|hình\s*vuông|tứ\s*giác\s*đều|tam\s*giác\s*đều)/iu; // incircle ≡ centroid hợp lệ
const TETRA = /tứ\s*diện(?:\s*đều)?\s+([A-Z]{4})(?![\p{L}])/u;
const PRISM = /lăng\s*trụ(?:\s*đều)?\s+([A-Z]{3,4})\.((?:[A-Z]['′])+)/u;

// Tâm + điểm-bán-kính (radiusTo) đường tròn đáy. nội tiếp(mặt đều)→centroid + radiusTo=trung
// điểm cạnh; ngoại tiếp→faceCircumcenter + radiusTo=đỉnh mặt. Trả intents emit + tên dùng cho op.
function buildCircleBase(
  faceVerts: string[], circum: boolean, taken: string[],
): { centerName: string; radiusTo: string; intents: Intent3DT[] } {
  const centerName = pickCenter([...faceVerts, ...taken]);
  const intents: Intent3DT[] = [];
  if (circum) {
    intents.push(addPoint3d(centerName, { kind: 'faceCircumcenter', vertices: faceVerts }));
    return { centerName, radiusTo: faceVerts[0], intents }; // đỉnh nằm trên đường tròn ngoại tiếp
  }
  intents.push(addPoint3d(centerName, { kind: 'centroid', vertices: faceVerts }));
  const [midName] = sectionNames(1, [...faceVerts, ...taken, centerName]);
  intents.push(addPoint3d(midName, { kind: 'midpoint', p1: faceVerts[0], p2: faceVerts[1] }));
  return { centerName, radiusTo: midName, intents }; // trung điểm cạnh = chân ⊥ tâm (mặt đều)
}

// Nón/trụ nội/ngoại tiếp MẶT đa diện. Bán kính phái sinh (inradius/circumradius mặt) qua radiusTo.
// Coexist solidRule@90 (host vẽ riêng). Render ⊥-trục (perpBasis) ⟹ đáy nghiêng (tetra slant face) đúng.
export const inscribedRoundSolidRule: LanguageRule3D = {
  id: 'inscribedRoundSolid',
  priority: 46,
  languages: ['vi'],
  patterns: [/(?:hình|khối)\s*(?:nón|trụ)/iu, /(?:nội|ngoại)\s*tiếp/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    if (CUBE.test(ctx.problem)) return [];
    const c = ctx.clauses.find(
      (cl) => ROUND.test(cl.text) && INSCRIBED.test(cl.text) && (/đường\s*tròn/iu.test(cl.text) || /đáy/iu.test(cl.text)),
    );
    if (!c) return [];
    const faceM = FACE.exec(c.text);
    if (!faceM) return [];
    const faceVerts = splitVertexToken(faceM[1]);
    if (faceVerts.length < 3) return [];
    const circum = NGOAI.test(c.text);
    if (!circum && !REGULAR.test(ctx.problem)) return []; // incircle mặt không-đều → defer faceIncenter
    const isCone = CONE_T.test(c.text);

    if (isCone) {
      // Nón nội/ngoại tiếp: CHỈ right-cone (đỉnh trên tâm đáy) ⟹ host chóp đều (đáy ngang, apex trên
      // centroid). Nón trên mặt tứ diện (đỉnh = đỉnh đáy, vd 88c) = nón XIÊN → defer (cone3d right-cone).
      const py = parsePyramidTolerant(ctx.problem);
      if (!py) return [];
      const apexM = APEX.exec(c.text);
      const apex = apexM ? apexM[1] : py.apex;
      const intents: Intent3DT[] = [];
      if (!py.solidRuleDraws) {
        intents.push(solid({
          flavor: 'pyramid', baseLabels: py.base,
          baseVariant: py.base.length === 4 ? 'square' : 'equilateral-triangle',
          apex: py.apex, apexVariant: 'regular',
        }));
      }
      const base = buildCircleBase(faceVerts, circum, [apex]);
      intents.push(...base.intents, coneIntent({ baseCenter: base.centerName, apex, radiusTo: base.radiusTo }));
      return [{ ruleId: this.id, clauseIds: [c.id], intents }];
    }

    // Trụ → Task B4.2 (tứ diện slant face / lăng trụ). Tránh lint unused TETRA/PRISM/cylinderIntent.
    void TETRA; void PRISM; void cylinderIntent;
    return [];
  },
};
