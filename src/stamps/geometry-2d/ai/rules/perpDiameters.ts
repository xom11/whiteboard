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

// "(đường tròn) (O) ... hai đường kính AB và CD ... vuông góc"
const RE = new RegExp(
  CIRCLE_KW +
    '\\s*\\(\\s*([A-Z])(?:\\s*[;,]\\s*[Rr])?\\s*\\)' +
    '[^.]{0,40}?hai\\s+' +
    DUONG_KW +
    '\\s*kính\\s+([A-Z])([A-Z])(?![A-Z])\\s+và\\s+([A-Z])([A-Z])(?![A-Z])' +
    '[^.]{0,20}?vuông\\s*góc',
  'u',
);

const PREFILTER = new RegExp('hai\\s+' + DUONG_KW + '\\s*kính[^.]{0,40}?vuông\\s*góc', 'u');

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
    const m = RE.exec(ctx.problem);
    if (!m) return [];
    const center = m[1];
    const a = m[2];
    const b = m[3];
    const cc = m[4];
    const d = m[5];
    // 5 tên phải phân biệt nhau.
    const names = [center, a, b, cc, d];
    if (new Set(names).size !== names.length) return [];

    // Claim clause chứa "đường kính ... vuông góc".
    const claim = ctx.clauses
      .filter((c) => PREFILTER.test(c.text) || /hai\s+đư[ờơ]ng\s*kính/u.test(c.text))
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
