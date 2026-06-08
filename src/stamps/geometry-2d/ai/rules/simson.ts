// src/stamps/geometry-2d/ai/rules/simson.ts
//
// Đường thẳng Simson (issue #47, construct 3): P trên đường tròn ngoại tiếp tam
// giác ABC → 3 chân vuông góc hạ từ P xuống 3 cạnh (BC, CA, AB) THẲNG HÀNG
// (định lý Simson). KHÔNG kind DSL riêng — compose:
//   - P = onCircle (glider trên đường tròn ngoại tiếp, theta cố định 0.7).
//   - 3 chân = perpFoot (chiếu trực giao xuống đường vô hạn BC/CA/AB).
//   - đường Simson = lineThrough([chân1, chân2, chân3]).
//
// Fail-safe (escalate, KHÔNG dựng sai):
//   - Không có đường tròn ngoại tiếp khai báo → KHÔNG đặt được P → bỏ qua.
//   - 0 hoặc >1 tam giác phân biệt (nhập nhằng) → bỏ qua.
//   - P trùng đỉnh (Simson của A) → 3 chân suy biến → bỏ qua.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine } from './_shared';

// "Simson" — danh từ riêng. \b không khớp quanh ký tự ASCII letter ổn, nhưng
// dùng lookaround [A-Za-z] để chắc chắn không khớp trong từ khác.
const SIMSON_KW = /(?<![A-Za-z])[Ss]imson(?![A-Za-z])/u;

// Tam giác (global): quét mọi tam giác nêu trong đề.
const TRI_G = /tam giác\s+([A-Z])([A-Z])([A-Z])/gu;

// Tên tâm đường tròn ngoại tiếp: "(O)" — dạng ngoặc 1 chữ HOA.
const CIRCLE_CENTER = /\(\s*([A-Z])\s*\)/u;

// P của Simson: "Simson của (điểm) P".
const SIMSON_OF = /[Ss]imson\s+của\s+(?:điểm\s+)?([A-Z])(?![A-Za-z])/u;

/** Bộ 3 đỉnh duy nhất toàn đề; undefined nếu 0 hoặc >1 tam giác phân biệt. */
function uniqueTriangle(problem: string): [string, string, string] | undefined {
  TRI_G.lastIndex = 0;
  const tris: string[][] = [];
  let m: RegExpExecArray | null;
  while ((m = TRI_G.exec(problem)) !== null) {
    tris.push([m[1], m[2], m[3]]);
  }
  const distinct = new Set(tris.map((t) => t.join('')));
  if (distinct.size !== 1) return undefined;
  const t = tris[0];
  return [t[0], t[1], t[2]];
}

export const simsonRule: LanguageRule = {
  id: 'simson',
  priority: 64,
  languages: ['vi'],
  patterns: [SIMSON_KW],
  match(ctx) {
    const tri = uniqueTriangle(ctx.problem);
    if (!tri) return []; // 0 hoặc >1 tam giác → nhập nhằng → escalate.
    const [A, B, C] = tri;

    // Đường tròn ngoại tiếp PHẢI được khai báo (vd "(O)") — circleTriangle dựng
    // circle tên theo chữ trong "(O)". Thiếu → KHÔNG đặt được P → escalate.
    const cm = CIRCLE_CENTER.exec(ctx.problem);
    if (!cm) return [];
    const O = cm[1];

    // P của Simson.
    const pm = SIMSON_OF.exec(ctx.problem);
    if (!pm) return []; // không xác định được P → escalate.
    const P = pm[1];

    // Suy biến: P là 1 đỉnh tam giác → 3 chân trùng → đường Simson suy biến.
    if (P === A || P === B || P === C) return [];

    const f1 = 'S' + A + B + C + '1';
    const f2 = 'S' + A + B + C + '2';
    const f3 = 'S' + A + B + C + '3';

    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      if (!SIMSON_KW.test(c.text)) continue;
      out.push({
        ruleId: 'simson',
        clauseIds: [c.id],
        intents: [
          addPoint(P, { kind: 'onCircle', circle: O, theta: 0.7 }),
          addPoint(f1, { kind: 'perpFoot', from: P, onLine: B + C }),
          addPoint(f2, { kind: 'perpFoot', from: P, onLine: C + A }),
          addPoint(f3, { kind: 'perpFoot', from: P, onLine: A + B }),
          drawLine('simson' + P, 'lineThrough', { points: [f1, f2, f3] }),
        ],
      });
    }
    return out;
  },
};
