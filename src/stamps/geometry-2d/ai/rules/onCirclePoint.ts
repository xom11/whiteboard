// src/stamps/geometry-2d/ai/rules/onCirclePoint.ts
//
// Points declared on a named circle/semicircle:
//   "Điểm M nằm trên nửa đường tròn" after "(O) đường kính AB" → M on O_c
//   "Lấy điểm F thuộc cung AC nhỏ" with a unique "(O)" circle → F on O_c/O
//
// This rule is intentionally conservative: it needs one unambiguous circle name
// in the whole problem, and it does not try to model arc bounds yet.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const PREFILTER = /(?:nằm|thuộc|lấy\s+điểm|trên\s+(?:nửa\s+)?(?:đường\s*tròn|cung))/iu;
const NAMED_CIRCLE = /(?:nửa\s+)?đường\s*tròn\s*\(\s*([A-Z])(?:\s*[;,]\s*[Rr])?\s*\)/u;
const COMPACT_CIRCLE = /\(\s*([A-Z])\s*[;,]\s*[Rr]\s*\)/u;
const POINT_ON = /(?:[Đđ]iểm\s+)?([A-Z])(?:\s+[^.]{0,12}?)?\s+(?:nằm\s+trên|thuộc)\s+(?:cung\s+[A-Z]{2}\s*(?:nhỏ|lớn)?|(?:nửa\s+)?đường\s*tròn)/u;
const TAKE_ON = /[Ll]ấy\s+điểm\s+([A-Z])[^.]{0,20}?(?:trên|thuộc)\s+(?:cung|(?:nửa\s+)?đường\s*tròn)/u;
// Đảo: "Trên (nửa)? đường tròn (X) lấy điểm P" — clause TỰ nêu circle (X). Bắt
// CẢ circle lẫn điểm để không nhầm sang circle toàn-đề khác. group1=center,
// group2=point. Center emit THÔ (resolveCircleNames map X→X_c nếu cần).
const TAKE_ON_REV =
  /[Tt]rên\s+(?:nửa\s+)?(?:đường\s*tròn|cung)\s*\(\s*([A-Z])(?:\s*[;,]\s*[Rr])?\s*\)[^.]{0,16}?lấy\s+điểm\s+([A-Z])(?![A-Z])/u;

function resolveCircle(problem: string): string | undefined {
  const m = NAMED_CIRCLE.exec(problem) ?? COMPACT_CIRCLE.exec(problem);
  if (!m) return undefined;
  const center = m[1];
  // circleDiameterRule names its support circle "<center>_c"; radius rules use
  // "<center>" then collision resolver may rename to "<center>_c" if referenced
  // as a point. Diameter/semicircle is the dominant DOCX case here.
  return /đường\s*kính/u.test(problem) ? `${center}_c` : center;
}

export const onCirclePointRule: LanguageRule = {
  id: 'on-circle-point',
  priority: 64,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const circle = resolveCircle(ctx.problem);
    const out: RuleMatch[] = [];
    let theta = 1.2;
    for (const c of ctx.clauses) {
      // Đảo trước: clause tự nêu circle (X) → dùng circle ĐÓ (thô), tránh nhầm
      // circle toàn-đề. Khớp rồi thì bỏ qua forward patterns cho clause này.
      const rev = TAKE_ON_REV.exec(c.text);
      if (rev) {
        const name = rev[2];
        if (name.length === 1) {
          out.push({
            ruleId: 'on-circle-point',
            clauseIds: [c.id],
            intents: [addPoint(name, { kind: 'onCircle', circle: rev[1], theta })],
          });
          theta += 0.8;
        }
        continue;
      }
      if (!circle) continue; // forward patterns cần circle toàn-đề
      const m = POINT_ON.exec(c.text) ?? TAKE_ON.exec(c.text);
      if (!m) continue;
      const name = m[1];
      if (name.length !== 1) continue;
      out.push({
        ruleId: 'on-circle-point',
        clauseIds: [c.id],
        intents: [addPoint(name, { kind: 'onCircle', circle, theta })],
      });
      theta += 0.8;
    }
    return out;
  },
};
