import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { sphereIntent, addPoint3d, parseSolidHead3D, splitVertexToken, pickCenter } from './_shared';

const CUE = /ngoại\s*tiếp/iu;
const SPHERE_CUE = /(?:mặt|khối|hình)\s*cầu/iu;

// Token NGAY SAU "ngoại tiếp": "hình chóp S.ABC" | "tứ diện ABCD" | "lăng trụ ABC.A′B′C′"
// | bare "SCDE"/"SABCD". Strict [A-Z] capture (/u — KHÔNG /i).
const TARGET = new RegExp(
  'ngoại\\s*tiếp\\s+' +
  '(?:(?:hình\\s+)?chóp\\s+([A-Z])\\.([A-Z]+)' +              // 1=apex 2=base  (chóp dotted)
  '|tứ\\s+diện(?:\\s+đều)?\\s+([A-Z]{3,})' +                  // 3 (tetra/đa diện)
  '|(?:hình\\s+)?lăng\\s+trụ\\s+([A-Z]{3,})\\.([A-Z\'′]+)' +  // 4=base 5=top (lăng trụ)
  '|([A-Z][A-Z\'′]{2,}))',                                     // 6 bare token (≥3 chữ)
  'u',
);
// Base quad non-cyclic trong canonical layout (parallelogram/trapezoid) → cầu vô nghiệm → skip.
// Siết: shape phải KỀ "đáy [nhãn] (là)" — KHÔNG nuốt "mặt bên là hình bình hành" (mặt ≠ đáy).
const NON_CYCLIC = /đáy(?:\s+[A-Z'′]+)?\s+(?:là\s+)?(?:hình\s+)?(?:bình\s+hành|thang)/iu;

function verticesFromMatch(m: RegExpExecArray): string[] | null {
  if (m[1] && m[2]) return [m[1], ...splitVertexToken(m[2])];                        // chóp S.ABC
  if (m[3]) return splitVertexToken(m[3]);                                            // tứ diện ABCD
  if (m[4] && m[5]) return [...splitVertexToken(m[4]), ...splitVertexToken(m[5])];    // lăng trụ
  if (m[6]) return splitVertexToken(m[6]);                                            // bare SCDE
  return null;
}

export const circumsphereRule: LanguageRule3D = {
  id: 'circumsphere',
  priority: 50,
  languages: ['vi'],
  patterns: [/ngoại\s*tiếp/iu, /(?:mặt|khối|hình)\s*cầu/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    if (NON_CYCLIC.test(ctx.problem)) return [];
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      if (!CUE.test(c.text) || !SPHERE_CUE.test(c.text)) continue;
      const m = TARGET.exec(c.text);
      let vertices: string[] | null = m ? verticesFromMatch(m) : null;
      // Generic "ngoại tiếp hình chóp/tứ diện/lăng trụ" (không token) → solid head.
      if (!vertices && /ngoại\s*tiếp\s+(?:(?:hình\s+)?chóp|(?:hình\s+)?lăng\s+trụ|tứ\s+diện)/iu.test(c.text)) {
        const head = parseSolidHead3D(ctx.problem);
        if (head) vertices = [...(head.apex ? [head.apex] : []), ...head.baseLabels];
      }
      if (!vertices || vertices.length < 4) continue;
      const center = pickCenter(vertices);
      const intents: Intent3DT[] = [
        addPoint3d(center, { kind: 'circumsphereCenter', vertices }),
        sphereIntent({ center, surfacePoint: vertices[0] }),
      ];
      out.push({ ruleId: this.id, clauseIds: [c.id], intents });
    }
    return out;
  },
};
