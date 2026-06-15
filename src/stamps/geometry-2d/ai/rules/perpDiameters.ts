// src/stamps/geometry-2d/ai/rules/perpDiameters.ts
//
// Đường tròn có HAI ĐƯỜNG KÍNH VUÔNG GÓC:
//   "Cho đường tròn (O) bán kính R có hai đường kính AB và CD vuông góc với nhau"
//     → đường tròn O (centerRadius, tâm O) + 4 điểm trên đường tròn:
//        A=0°, B=180° (1 đường kính); C=90°, D=270° (đường kính vuông góc).
//     Đặt 4 điểm onCircle ở 0/π/π·½/π·1.5 ⇒ AB ⊥ CD theo cách dựng.
//
// Circle name = THÔ 'O'; resolveCircleNames đổi 'O'→'O_c' vì O cũng là tâm/điểm.
// Tâm O cần tồn tại như point — emit add-point O free (resolveCircleNames cũng tự
// inject cho centerRadius khi center===name, nhưng explicit cho chắc + xác định thứ tự).
//
// Đây là construct TOÀN-MỆNH-ĐỀ (whole-clause); claim clause để circleDiameter
// (vốn khớp "đường kính AB") KHÔNG dựng đường tròn đường kính rời — circleDiameter
// có guard riêng bỏ qua dạng "hai đường kính ... vuông góc".
//
// GOTCHA \b: ký tự Việt → cờ 'u' + (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawCircle, CIRCLE_KW, DUONG_KW } from './_shared';
import { SYMBOLIC_RADIUS } from './circleRadius';

// Tên đường tròn: "đường tròn (O)" / "(O;R)" bare (vao10:72 "Cho (O), hai đường
// kính…") / "đường tròn tâm O". 2 group: paren-center | tâm-center.
const CIRC =
  '(?:' + CIRCLE_KW + '\\s*)?\\(\\s*([A-Z])(?:\\s*[;,]\\s*[Rr])?\\s*\\)' +
  '|' + CIRCLE_KW + '\\s+tâm\\s+([A-Z])(?![A-Za-z])';
// Cặp đường kính: "AB và CD" / "AB, CD" / "AB;CD" (vao10:73 — ';' giữa cặp làm
// segmentClauses tách clause, nhưng RE chạy trên ctx.problem nên vẫn khớp).
const PAIR =
  '([A-Z])([A-Z])(?![A-Z])\\s*(?:[,;]\\s*|và\\s+)([A-Z])([A-Z])(?![A-Z])';

// Thứ tự 1 — tên TRƯỚC tính từ: "(O) … hai đường kính AB và CD … vuông góc".
const RE_NAMES_FIRST = new RegExp(
  '(?:' + CIRC + ')[^.]{0,40}?hai\\s+' + DUONG_KW + '\\s*kính\\s+(?:là\\s+)?' +
    PAIR + '[^.]{0,20}?vuông\\s*góc',
  'u',
);
// Thứ tự 2 — tính từ TRƯỚC tên (vao10:127): "(O;R) có hai đường kính vuông góc
// (với nhau)? (là)? AB và CD".
const RE_ADJ_FIRST = new RegExp(
  '(?:' + CIRC + ')[^.]{0,40}?hai\\s+' + DUONG_KW +
    '\\s*kính\\s+vuông\\s*góc(?:\\s+với\\s+nhau)?\\s*(?:là\\s+)?\\s*' + PAIR,
  'u',
);

// Ký hiệu ⊥ vừa là separator vừa là khẳng định ⊥: "hai đường kính AB ⊥ CD" (vao10:71).
const RE_PERP_SYM = new RegExp(
  '(?:' + CIRC + ')[^.]{0,40}?hai\\s+' + DUONG_KW +
    '\\s*kính\\s+(?:là\\s+)?([A-Z])([A-Z])(?![A-Z])\\s*⊥\\s*([A-Z])([A-Z])(?![A-Z])',
  'u',
);

const PREFILTER = new RegExp('hai\\s+' + DUONG_KW + '\\s*kính[^.]{0,40}?(?:vuông\\s*góc|⊥)', 'u');

// Góc đặt 4 đầu mút: AB trục ngang (0,π), CD trục dọc (π/2, 3π/2) ⇒ AB⊥CD.
const THETA_A = 0;
const THETA_B = Math.PI;
const THETA_C = Math.PI / 2;
const THETA_D = (3 * Math.PI) / 2;

export const perpDiametersRule: LanguageRule = {
  id: 'perp-diameters',
  // Trên circleDiameter (67) để chạy trước; circleDiameter cũng tự guard bỏ dạng này.
  priority: 70,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const m = RE_NAMES_FIRST.exec(ctx.problem) ?? RE_ADJ_FIRST.exec(ctx.problem) ?? RE_PERP_SYM.exec(ctx.problem);
    if (!m) return [];
    const center = m[1] ?? m[2];
    const a = m[3];
    const b = m[4];
    const cc = m[5];
    const d = m[6];
    // 5 tên phải phân biệt nhau.
    const names = [center, a, b, cc, d];
    if (new Set(names).size !== names.length) return [];

    // Claim clause chứa "đường kính ... vuông góc". Thêm clause ĐUÔI khi cặp 2
    // bị split tại ';' ("…AB" | "CD vuông góc với nhau" — vao10:73): đuôi chứa
    // đúng cặp thứ hai + "vuông góc".
    const claim = ctx.clauses
      .filter(
        (c) =>
          PREFILTER.test(c.text) ||
          /hai\s+đư[ờơ]ng\s*kính/u.test(c.text) ||
          (c.text.includes(cc + d) && /vuông\s*góc/u.test(c.text)),
      )
      .map((c) => c.id);

    return [
      {
        ruleId: 'perp-diameters',
        clauseIds: claim.length > 0 ? claim : [ctx.clauses[0]?.id ?? 0],
        intents: [
          addPoint(center, { kind: 'free' }),
          drawCircle(center, 'centerRadius', { center, radius: SYMBOLIC_RADIUS }),
          addPoint(a, { kind: 'onCircle', circle: center, theta: THETA_A }),
          addPoint(b, { kind: 'onCircle', circle: center, theta: THETA_B }),
          addPoint(cc, { kind: 'onCircle', circle: center, theta: THETA_C }),
          addPoint(d, { kind: 'onCircle', circle: center, theta: THETA_D }),
        ],
      },
    ];
  },
};
