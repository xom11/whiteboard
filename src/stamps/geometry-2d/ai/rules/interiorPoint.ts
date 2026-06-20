// src/stamps/geometry-2d/ai/rules/interiorPoint.ts
//
// Điểm TỰ DO bên trong một hình:
//   "P là một điểm nằm trong tam giác ABC" → addPoint(P, {kind:'free'})
//   "Lấy điểm M nằm bên trong tứ giác ABCD"
//   "Lấy P là một điểm bất kỳ nằm trong tam giác ABC" (qualifier "bất kỳ"/"tùy ý")
//   "Gọi P là một điểm nằm trong tam giác" (KHÔNG nêu đỉnh)
//   "Lấy điểm M nằm trong đường tròn (O)" / "trong (O)"
//
// Điểm tự do (kéo được) — chỉ để UNBLOCK các construct phái sinh (vd PA, trung
// trực ∩ PA). KHÔNG kích hoạt khi clause CŨNG nói "trên đường tròn/cung" (onCircle
// giữ điểm đó — priority cao hơn + addPoint idempotent, nhưng guard để khỏi claim thừa).
//
// \b không khớp ký tự Việt → (?!\p{L}) + cờ 'u'. Priority THẤP (sau onCircle…).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

// Hình "chứa" điểm: tam/tứ giác, hình <loại>, đường tròn (kèm tên paren tuỳ chọn),
// hoặc CHỈ paren "(O)" (vd "nằm trong (O)"). Đỉnh/tên hình đều tuỳ chọn.
const SHAPE =
  '(?:(?:tam\\s*giác|tứ\\s*giác|đường\\s*tròn|hình(?:\\s+(?:chữ\\s*nhật|vuông|thoi|bình\\s*hành|thang))?)(?:\\s+(?:[A-Z]{3,4}(?![A-Z])|\\([^)]*\\)))?|\\([^)]*\\))';
// Qualifier chêm giữa "điểm" và "nằm/trong": "bất kỳ"/"bất kì"/"tùy ý"/"tuỳ ý".
const QUAL = '(?:\\s+(?:bất\\s*k[iìyỳ]|t[uù][yỳ]\\s*ý))?';

const PREFILTER =
  /(?:nằm\s+)?(?:bên\s+)?trong\s+(?:tam\s*giác|tứ\s*giác|đường\s*tròn|hình|mặt\s*phẳng|\()/u;
// "trong tam giác/tứ giác/hình/đường tròn (O)/(O)" HOẶC "trong mặt phẳng (chứa) tam giác ABC".

// Dạng tên-TRƯỚC: "Gọi/Lấy P (là (một)?)? điểm (bất kỳ)? (nằm)? (bên)? trong <hình>".
const RE = new RegExp(
  '(?:[Gg]ọi\\s+|[Ll]ấy\\s+)?(?:điểm\\s+)?([A-Z])(?!\\p{L})\\s+(?:là\\s+)?(?:một\\s+)?điểm' +
    QUAL +
    '\\s+(?:nằm\\s+)?(?:bên\\s+)?trong\\s+(?:mặt\\s*phẳng\\s+(?:chứa\\s+)?)?' +
    SHAPE,
  'u',
);

// Dạng tên-SAU-"điểm": "(một)? điểm O (bất kỳ)? nằm (bên)? trong <hình>".
// (Bài 5: "và một điểm O nằm trong hình chữ nhật"; hình đã dựng ở chỗ khác.)
const RE2 = new RegExp(
  '(?:một\\s+)?[Đđ]iểm\\s+([A-Z])(?!\\p{L})' +
    QUAL +
    '\\s+nằm\\s+(?:bên\\s+)?trong\\s+' +
    SHAPE,
  'u',
);

export const interiorPointRule: LanguageRule = {
  id: 'interiorPoint',
  priority: 30,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      // onCircle/onSegment giữ điểm nếu clause nêu "trên (đường tròn|cung|…)".
      if (/trên\s+(?:đường\s*tròn|cung|nửa|\()/u.test(c.text)) continue;
      const m = RE.exec(c.text) ?? RE2.exec(c.text);
      if (!m) continue;
      out.push({
        ruleId: 'interiorPoint',
        clauseIds: [c.id],
        intents: [addPoint(m[1], { kind: 'free' })],
      });
    }
    return out;
  },
};
