// src/stamps/geometry-2d/ai/rules/diameterCirclePairwise.ts
//
// Đề "đường tròn đường kính đôi một cắt nhau lần thứ hai" (whole-problem construct):
//
//   Cho đường tròn (O) và ba dây cung AB, AC, AD bất kì. Các đường tròn đường
//   kính AB, AC, AD đôi một cắt nhau lần thứ hai tại M, N, P.
//
// Bản chất: (đ.kính AX)∩(đ.kính AY) lần 2 = chân vuông góc hạ từ A xuống XY
// (∠ nhìn AX,AY = 90°). M,N,P = 3 chân Simson của A với ΔBCD. Đề gốc chỉ là
// GIẢ THIẾT → hình tối giản: (O)+O, A/B/C/D, dây AX, 3 đường tròn đường kính,
// M/N/P (giao điểm thứ hai, loại điểm chung A).
//
// Fail-safe (escalate, KHÔNG dựng sai): thiếu tâm "(O)"; <2 đường kính chung
// apex; đầu mút/kết quả trùng; số tên kết quả ≠ số đường kính.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect, drawCircle, DUONG_KW } from './_shared';

// Tâm đường tròn: "(O)" — ngoặc 1 chữ HOA.
const CIRCLE_CENTER = /\(\s*([A-Z])\s*\)/u;
// Prefilter: phải có "đường kính" + dấu hiệu "đôi một"/"cắt nhau".
const KW_DIAMETER = new RegExp(DUONG_KW + '\\s*kính', 'u');
const KW_PAIRWISE = /đôi một|cắt nhau/u;

// Góc đặt điểm (radian) — apex trên cao, các đầu mút còn lại rải cung dưới ở
// vị trí TỔNG QUÁT (tránh suy biến chân vuông góc trùng nhau).
const APEX_THETA = 2.0;
const OTHER_THETAS = [5.5, 4.0, 0.6, 3.3, 1.1, 5.0] as const;

interface Parsed {
  center: string;
  apex: string;
  others: string[];
  results: string[];
}

function parse(problem: string): Parsed | undefined {
  const cm = CIRCLE_CENTER.exec(problem);
  if (!cm) return undefined;
  const center = cm[1];

  // Vùng sau "đường kính" tới khi gặp "đôi một"/"cắt nhau" (cùng câu).
  const dm = new RegExp(DUONG_KW + '\\s*kính\\s+([^.;\n]*)', 'u').exec(problem);
  if (!dm) return undefined;
  let region = dm[1];
  const cut = region.search(/đôi một|cắt nhau/u);
  if (cut >= 0) region = region.slice(0, cut);
  const pairs = region.match(/[A-Z][A-Z]/g) ?? [];
  if (pairs.length < 2) return undefined;

  // apex = chữ xuất hiện trong MỌI cặp.
  const counts = new Map<string, number>();
  for (const pr of pairs) {
    counts.set(pr[0], (counts.get(pr[0]) ?? 0) + 1);
    counts.set(pr[1], (counts.get(pr[1]) ?? 0) + 1);
  }
  const apexEntries = [...counts].filter(([, n]) => n === pairs.length);
  if (apexEntries.length !== 1) return undefined; // 0 → không chung; >1 → nhập nhằng
  const apex = apexEntries[0][0];
  const others = pairs.map((pr) => (pr[0] === apex ? pr[1] : pr[0]));
  if (new Set(others).size !== others.length) return undefined; // đầu mút trùng
  if (others.includes(apex)) return undefined;

  // Tên kết quả sau "tại": các chữ HOA đơn lẻ (M, N, P, ...).
  const rm = /\btại\s+([A-Z][^.;\n]*)/u.exec(problem);
  if (!rm) return undefined;
  const results = rm[1].match(/\b[A-Z]\b/g) ?? [];
  // "đôi một cắt nhau" của n đường kính chung apex = TẤT CẢ C(n,2) cặp → C(n,2)
  // giao điểm. Số tên kết quả phải khớp đúng (n=3 → 3; n=4 → 6; ...).
  const numPairs = (others.length * (others.length - 1)) / 2;
  if (results.length !== numPairs) return undefined;
  if (new Set(results).size !== results.length) return undefined;

  return { center, apex, others, results };
}

export const diameterCirclePairwiseRule: LanguageRule = {
  id: 'diameter-circle-pairwise',
  priority: 66,
  languages: ['vi'],
  patterns: [KW_DIAMETER],
  match(ctx) {
    if (!KW_PAIRWISE.test(ctx.problem)) return [];
    const p = parse(ctx.problem);
    if (!p) return [];
    const { center, apex, others, results } = p;

    const circOf = (other: string) => `k${apex}${other}`;
    const oCircle = `k${center}`; // tên entity đường tròn (O) (khác điểm tâm O)

    // Tất cả cặp (i<j) theo thứ tự từ điển — "đôi một" = mọi cặp đường kính.
    const allPairs: Array<[number, number]> = [];
    for (let i = 0; i < others.length; i++)
      for (let j = i + 1; j < others.length; j++) allPairs.push([i, j]);

    const intents = [
      // (O): tâm `center` (free) + bán kính cố định.
      drawCircle(oCircle, 'centerRadius', { center, radius: 4 }),
      // apex + các đầu mút = glider trên (O), vị trí tổng quát.
      addPoint(apex, { kind: 'onCircle', circle: oCircle, theta: APEX_THETA }),
      ...others.map((o, i) =>
        addPoint(o, { kind: 'onCircle', circle: oCircle, theta: OTHER_THETAS[i % OTHER_THETAS.length] }),
      ),
      // Dây cung apex–đầu mút.
      ...others.map((o) => connect(apex, o, 'segment')),
      // Đường tròn đường kính apex–đầu mút.
      ...others.map((o) => drawCircle(circOf(o), 'diameter', { endpoints: [apex, o] })),
      // Giao điểm thứ hai của TỪNG cặp đường tròn đường kính, loại điểm chung apex.
      ...results.map((r, k) =>
        addPoint(r, {
          kind: 'circleSecondIntersection',
          c1: circOf(others[allPairs[k][0]]),
          c2: circOf(others[allPairs[k][1]]),
          exclude: apex,
        }),
      ),
    ];

    const out: RuleMatch[] = [{
      ruleId: 'diameter-circle-pairwise',
      // Whole-problem construct: claim mọi clause để coverage gate đầy đủ.
      clauseIds: ctx.clauses.map((c) => c.id),
      intents,
    }];
    return out;
  },
};
