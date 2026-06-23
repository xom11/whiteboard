import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import {
  coneIntent, cylinderIntent, addPoint3d, solid,
  splitVertexToken, pickCenter, parsePyramidTolerant, parsePrismTolerant, sectionNames,
} from './_shared';

const ROUND = /(?:hình|khối)\s*(?:nón|trụ)/iu;
const CONE_T = /(?:hình|khối)\s*nón/iu;
const INSCRIBED = /(?:nội|ngoại)\s*tiếp/iu;
const NGOAI = /ngoại\s*tiếp/iu;
const FACE = /(?:tam\s*giác|tứ\s*giác)\s+([A-Z]{3,4})(?![\p{L}])/u; // mặt định nghĩa đường tròn đáy
const APEX = /đỉnh\s+([A-Z])(?![\p{L}])/u;
const CUBE = /lập\s*phương/iu;
const REGULAR = /(?:đều|hình\s*vuông|tứ\s*giác\s*đều|tam\s*giác\s*đều)/iu; // incircle ≡ centroid hợp lệ
const HEAD = /(?:chóp|lăng\s*trụ|tứ\s*diện)/iu;

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

function topCenterIntent(topVerts: string[], circum: boolean, taken: string[]): { name: string; intent: Intent3DT } {
  const name = pickCenter([...topVerts, ...taken]);
  return {
    name,
    intent: circum
      ? addPoint3d(name, { kind: 'faceCircumcenter', vertices: topVerts })
      : addPoint3d(name, { kind: 'centroid', vertices: topVerts }),
  };
}

// Khi rule TỰ vẽ host (solidRule miss "đều"/"tứ giác đều" qualifier), claim luôn clause đầu-đề
// chứa head solid → coverage đủ (else clause head uncovered → PARTIAL → UI không render).
function headClauseId(ctx: RuleContext3D, exceptId: number): number[] {
  const h = ctx.clauses.find((cl) => cl.id !== exceptId && HEAD.test(cl.text));
  return h ? [h.id] : [];
}

// Nón/trụ nội/ngoại tiếp MẶT đa diện. Bán kính phái sinh (inradius/circumradius mặt) qua radiusTo.
// Coexist solidRule@90 (host vẽ riêng); khi solidRule miss qualifier → rule tự emit host + claim head.
// Render ⊥-trục (perpBasis) ⟹ trục đứng (nón-chóp, trụ-lăng-trụ) đúng. Defer trụ trên mặt NGHIÊNG
// tứ diện (layout không-đều → trục không ⊥ mặt) & nón XIÊN (Phase 6).
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
    const circum = NGOAI.test(c.text);

    // ── Nón: CHỈ right-cone (đỉnh trên tâm đáy) ⟹ host chóp đều (đáy ngang, apex trên centroid).
    // Nón trên mặt tứ diện (đỉnh = đỉnh đáy, vd 88c) = nón XIÊN → defer (cone3d chỉ right-cone).
    if (CONE_T.test(c.text)) {
      const faceM = FACE.exec(c.text);
      if (!faceM) return [];
      const faceVerts = splitVertexToken(faceM[1]);
      if (faceVerts.length < 3) return [];
      if (!circum && !REGULAR.test(ctx.problem)) return []; // incircle mặt không-đều → defer faceIncenter
      const py = parsePyramidTolerant(ctx.problem);
      if (!py) return [];
      const apexM = APEX.exec(c.text);
      const apex = apexM ? apexM[1] : py.apex;
      const intents: Intent3DT[] = [];
      const clauseIds = [c.id];
      if (!py.solidRuleDraws) {
        intents.push(solid({
          flavor: 'pyramid', baseLabels: py.base,
          baseVariant: py.base.length === 4 ? 'square' : 'equilateral-triangle',
          apex: py.apex, apexVariant: 'regular',
        }));
        clauseIds.push(...headClauseId(ctx, c.id));
      }
      const base = buildCircleBase(faceVerts, circum, [apex]);
      intents.push(...base.intents, coneIntent({ baseCenter: base.centerName, apex, radiusTo: base.radiusTo }));
      return [{ ruleId: this.id, clauseIds, intents }];
    }

    // ── Trụ trên 2 đáy lăng trụ (trục ĐỨNG — render ⊥-trục đúng). Mặt lấy từ head lăng trụ.
    const prism = parsePrismTolerant(ctx.problem);
    if (prism) {
      const { base: baseVerts, top: topVerts, solidRuleDraws } = prism;
      if (baseVerts.length < 3) return [];
      if (!circum && !REGULAR.test(ctx.problem)) return [];
      const intents: Intent3DT[] = [];
      const clauseIds = [c.id];
      if (!solidRuleDraws) {
        intents.push(solid({
          flavor: 'prism', baseLabels: baseVerts,
          baseVariant: baseVerts.length === 3 ? 'equilateral-triangle' : 'square',
          apexVariant: 'free', topLabels: topVerts,
        }));
        clauseIds.push(...headClauseId(ctx, c.id));
      }
      const bc = buildCircleBase(baseVerts, circum, []);
      const tc = topCenterIntent(topVerts, circum, [bc.centerName, bc.radiusTo]);
      intents.push(...bc.intents, tc.intent, cylinderIntent({ baseCenter: bc.centerName, topCenter: tc.name, radiusTo: bc.radiusTo }));
      return [{ ruleId: this.id, clauseIds, intents }];
    }

    // DEFER trụ trên mặt NGHIÊNG tứ diện (Câu 73/85): layout3d 'tetrahedron' KHÔNG phải tứ diện ĐỀU
    // thật (cạnh đáy ≠ cạnh bên) ⟹ trục đỉnh→tâm-mặt-đối KHÔNG ⊥ mặt ⟹ vành ⊥-trục KHÔNG nằm trên
    // mặt (MCP visual bắt: trụ vẽ nghiêng lệch). Cần layout regular HOẶC point=baseCenter+h·normal (Phase 6).
    return [];
  },
};
