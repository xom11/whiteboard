// src/stamps/geometry-2d/ai/rules/diameterEndpoint.ts
//
// "Gọi AD là đường kính của (O)" / "AD là đường kính đường tròn (O)"
//   → D = điểm xuyên tâm đối của A qua tâm O (reflectPoint of A through O).
//     A đã nằm trên (O) (đỉnh/điểm cũ) ⇒ D = đầu mút kia của đường kính.
// Dạng ĐỘNG TỪ (vao10): "kẻ/vẽ/dựng đường kính AD (cắt BC tại H)" — không có
//   "là", tâm suy từ đề; đầu mút đầu phải ĐÃ xuất hiện trước match.
//
// CHỈ kích hoạt khi 1 trong 2 đầu mút đã là điểm nêu trước (đỉnh tam giác…) và
// đầu kia là điểm MỚI cần dựng. Tâm lấy từ "(O)"/"tâm O" trong clause/đề.
// KHÁC circleDiameter ("đường tròn đường kính AB" — dựng đường tròn MỚI): ở đây
// "AD là đường kính CỦA (O)" — (O) đã có, chỉ cần đầu mút đối tâm.
//
// \b không khớp ký tự Việt → (?!\p{L}) + cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

// group1+2 = cặp đầu mút đường kính (AD), 3 = tâm O.
const RE = new RegExp(
  '([A-Z])([A-Z])(?![A-Z])\\s+là\\s+đường\\s*kính\\s+(?:của\\s+)?(?:đường\\s*tròn\\s*)?(?:tâm\\s+)?\\(?\\s*([A-Z])\\s*\\)?',
  'gu',
);

// Dạng động từ: groups 1=đầu mút cũ 2=đầu mút mới (có thể prime "CC'").
const RE_VERB = new RegExp(
  "(?:[Kk]ẻ|[Vv]ẽ|[Dd]ựng)\\s+(?:[^.;,]{0,24}?và\\s+)?đường\\s*kính\\s+([A-Z])([A-Z]['′]?)(?![A-Za-z'′])",
  'gu',
);
// Tâm từ đề: "(O)" / "(O;R)" / "(O,R)" / "tâm O" — match ĐẦU TIÊN (đường tròn
// nền). reflectPoint.through trỏ POINT tâm (resolveCircleNames inject scene
// point cho circumcenter/midpoint nên tên tâm là điểm thật).
const RESOLVE_CENTER = /\(\s*([A-Z])(?:\s*[;,]\s*[Rr0-9][^)]*)?\s*\)|tâm\s+([A-Z])(?![A-Za-z])/u;

const PREFILTER = /[A-Z]{2}\s+là\s+đường\s*kính|(?:[Kk]ẻ|[Vv]ẽ|[Dd]ựng)\s+(?:[^.;,]{0,24}?và\s+)?đường\s*kính/u;

export const diameterEndpointRule: LanguageRule = {
  id: 'diameterEndpoint',
  priority: 56,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    const emitted = new Set<string>();
    // Tập tên điểm "đã biết" thô: đỉnh tam giác/điểm xuất hiện trước. Heuristic
    // đơn giản: đầu mút đầu (A) coi là điểm cũ (gốc), đầu sau (D) là điểm mới.
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const a = m[1];
        const d = m[2];
        const center = m[3];
        if (a === d || center === a || center === d) continue;
        // D = xuyên tâm đối của A qua O.
        emitted.add(d);
        out.push({
          ruleId: 'diameterEndpoint',
          clauseIds: [c.id],
          intents: [addPoint(d, { kind: 'reflectPoint', of: a, through: center })],
        });
      }
    }
    const cm = RESOLVE_CENTER.exec(ctx.problem);
    const center = cm?.[1] ?? cm?.[2];
    if (!center) return out;
    for (const c of ctx.clauses) {
      RE_VERB.lastIndex = 0;
      for (const m of c.text.matchAll(RE_VERB)) {
        const a = m[1];
        const d = m[2].replace(/′/g, "'");
        if (a === d || center === a || center === d || emitted.has(d)) continue;
        // Đầu mút đầu phải ĐÃ xuất hiện trước match trong đề ("kẻ đường kính
        // MN" qua điểm tuỳ ý — cả 2 mút mới — KHÔNG thuộc rule này). Lookbehind
        // chỉ loại chữ THƯỜNG: "C" trong "ABC" (sau B hoa) vẫn là điểm đã biết.
        const before = ctx.problem.slice(0, ctx.problem.indexOf(m[0]));
        if (!new RegExp(`(?<![a-z])${a}(?![a-z])`, 'u').test(before)) continue;
        emitted.add(d);
        out.push({
          ruleId: 'diameterEndpoint',
          clauseIds: [c.id],
          intents: [addPoint(d, { kind: 'reflectPoint', of: a, through: center })],
        });
      }
    }
    return out;
  },
};
