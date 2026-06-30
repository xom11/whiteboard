// src/stamps/geometry-2d/ai/rules/hexagon.ts
//
// Lục giác (6 đỉnh) ABCDEF. Mở rộng "họ đa giác" lên N>4 đỉnh — engine cũ chỉ có
// tam giác (3) / tứ giác (4). Biểu diễn = LỤC GIÁC ĐỀU: 6 đỉnh cách đều trên một
// đường tròn ngoại-tiếp-các-đỉnh (bán kính R), nối qua mark-shape kind 'polygon'
// (generic N đỉnh — KHÔNG dùng draw-shape vốn cứng 3/4 đỉnh).
//
// Nhánh "ngoại tiếp (O)" (lục giác BAO QUANH đường tròn, 6 cạnh tiếp xúc) hoặc
// "đường tròn (O) nội tiếp lục giác" → THÊM đường tròn (O) NỘI TIẾP: tâm = tâm
// lục giác, bán kính = apothem = R·cos30° (< R). Tâm O = circumcenter của 3 đỉnh
// xen kẽ (A,C,E) — tâm lục giác đều TRÙNG tâm đường tròn ngoại tiếp các đỉnh. Đặt
// O LÀ ĐIỂM PHÁI SINH (không free coord) có 2 tác dụng: (1) đường tròn nội tiếp
// LUÔN đồng tâm với lục giác kể cả khi đỉnh bị dịch; (2) union-find của
// layoutDisjointComponents thấy O ⟶ A,C,E nên gom O+đường tròn CÙNG component với
// lục giác → KHÔNG bị tách rời ra cạnh nhau (nếu O free thì disjoint-offset đẩy
// đường tròn sang một bên).
//
// Mở rộng về sau (ngũ giác / đa giác đều N tuỳ ý): tham số hoá N + danh sách
// nhãn, dùng CÙNG cơ chế (free vertices trên vòng tròn + mark-shape polygon).
//
// Quy tắc rule (CLAUDE.md): cờ 'u' + lookaround \p{L} thay \b; escapeRe mọi tên
// nội suy vào RegExp; gate chặt (ĐÚNG 6 HOA liền, neo (?![A-Z]) loại 7+ đỉnh).
import type { LanguageRule, RuleContext, RuleMatch } from './_types';
import { addPoint, drawCircle, markShape, CIRCLE_KW, escapeRe } from './_shared';

// ĐÚNG 6 ký tự HOA liền ("ABCDEF"); (?![A-Z]) loại 7+ đỉnh ("ABCDEFG") → escalate.
const HEX = '([A-Z])([A-Z])([A-Z])([A-Z])([A-Z])([A-Z])(?![A-Z])';

// "(lục|ngũ)? giác ABCDEF" — chỉ LỤC giác (6 đỉnh). Cờ 'g' để quét nhiều khai báo
// trong cùng clause; cờ 'u' cho ký tự Việt.
const HEXAGON_DECL = new RegExp('[Ll]ục\\s+giác\\s+' + HEX, 'gu');

// Prefilter toàn đề: có chữ "lục giác".
const PREFILTER = /[Ll]ục\s+giác/u;

// Bán kính ngoại tiếp các đỉnh + apothem (bán kính đường tròn nội tiếp lục giác
// đều). 6 đỉnh tại góc 90°,30°,-30°,-90°,-150°,150° (đi theo chiều kim đồng hồ từ
// đỉnh trên) → bố cục lồi đều A→B→C→D→E→F, đối xứng qua trục đứng.
const HEX_RADIUS = 5;
const HEX_APOTHEM = HEX_RADIUS * Math.cos(Math.PI / 6); // R·cos30° ≈ 4.330
const HEX_THETAS: readonly number[] = Array.from(
  { length: 6 },
  (_, i) => Math.PI / 2 - (i * Math.PI) / 3,
);
function hexVertexCoord(i: number): [number, number] {
  const t = HEX_THETAS[i];
  return [
    +(HEX_RADIUS * Math.cos(t)).toFixed(4),
    +(HEX_RADIUS * Math.sin(t)).toFixed(4),
  ];
}

// Tên tâm: "(O)" hoặc "tâm O".
const CENTER = '(?:\\(\\s*([A-Z])\\s*\\)|tâm\\s+([A-Z]))';

// Pattern A — lục giác NGOẠI TIẾP đường tròn: NGAY SAU 6 đỉnh là
// "ngoại tiếp (đường tròn)? (O)/tâm O". Đường tròn = đường tròn NỘI TIẾP lục giác.
// Neo ^ vào text sau cụm 6 đỉnh. Center = g1|g2.
const HEX_CIRCUMSCRIBES = new RegExp(
  '^[\\s,]*ngoại\\s*tiếp\\s+(?:(?:' + CIRCLE_KW + ')\\s*)?' + CENTER,
  'u',
);

// Pattern B — đường tròn (O) NỘI TIẾP lục giác: "(đường tròn)? (O)/tâm O nội tiếp"
// đứng NGAY TRƯỚC "lục giác ABCDEF". Neo $ vào text trước "lục giác". Center 1|2.
const HEX_INSCRIBED_BY = new RegExp(
  '(?:' + CIRCLE_KW + ')\\s*' + CENTER + '\\s*nội\\s*tiếp\\s+$',
  'u',
);

/** Phát hiện tâm đường tròn nội tiếp cho 1 hit lục giác trong clause. '' = không. */
function detectInscribedCircle(
  text: string,
  start: number,
  afterEnd: number,
): string | undefined {
  const a = HEX_CIRCUMSCRIBES.exec(text.slice(afterEnd));
  if (a) return a[1] ?? a[2] ?? 'O';
  const b = HEX_INSCRIBED_BY.exec(text.slice(0, start));
  if (b) return b[1] ?? b[2] ?? 'O';
  return undefined;
}

/**
 * Lục giác ABCDEF → 6 đỉnh free (trên vòng tròn ngoại tiếp các đỉnh) + polygon.
 * Nếu ngữ cảnh "ngoại tiếp (O)" / "(O) nội tiếp" → thêm đường tròn NỘI TIẾP (tâm
 * O = circumcenter A,C,E = tâm lục giác, bán kính = apothem). 6 đỉnh KHÔNG match
 * đúng (vd 5/7 đỉnh) → bỏ qua.
 *
 * Tâm O emit kind=circumcenter TRƯỚC circle → resolveCircleNameCollisions thấy O
 * đã tồn tại (existingPoints) nên KHÔNG inject lại, chỉ rename circle O→O_c +
 * rewrite ref. O phái sinh ⟶ A,C,E nên đồng tâm + cùng component lúc layout.
 */
export const hexagonRule: LanguageRule = {
  id: 'hexagon',
  priority: 100, // ngang quad (đa giác cơ sở) — gate riêng prefilter "lục giác".
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx: RuleContext): RuleMatch[] {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      HEXAGON_DECL.lastIndex = 0;
      for (const m of c.text.matchAll(HEXAGON_DECL)) {
        const labels = [m[1], m[2], m[3], m[4], m[5], m[6]];
        const start = m.index ?? 0;
        const afterEnd = start + m[0].length;

        const vertices = labels.map((lbl, i) =>
          addPoint(lbl, { kind: 'free', at: hexVertexCoord(i) }),
        );

        const center = detectInscribedCircle(c.text, start, afterEnd);
        const intents = [...vertices];
        if (center !== undefined) {
          // escapeRe phòng tên tâm méo OCR ("(O") nội suy về sau (an toàn hôm nay
          // vì center ∈ [A-Z], nhưng giữ quy tắc 1-nguồn-escape).
          const centerName = escapeRe(center) === center ? center : 'O';
          // Tâm O = circumcenter 3 đỉnh xen kẽ (A=0, C=2, E=4) → tâm lục giác đều.
          intents.unshift(
            addPoint(centerName, {
              kind: 'circumcenter',
              of: [labels[0], labels[2], labels[4]],
            }),
          );
          intents.push(
            drawCircle(centerName, 'centerRadius', {
              center: centerName,
              radius: HEX_APOTHEM,
            }),
          );
        }
        intents.push(markShape('polygon', labels));

        out.push({ ruleId: 'hexagon', clauseIds: [c.id], intents });
      }
    }
    return out;
  },
};
