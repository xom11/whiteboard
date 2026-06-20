// src/stamps/geometry-2d/ai/rules/rightAngleVertexCircles.ts
//
// Góc vuông xOy + 2 điểm trên 2 cạnh + 2 đường tròn cắt 2 tia (httcd:94):
//   "Cho góc vuông xOy. Lấy các điểm I và K lần lượt trên các tia Ox và Oy.
//    Vẽ đường tròn (I; OK) cắt tia Ox tại M (...). Vẽ đường tròn (K; OI) cắt tia
//    Oy tại N (...)."
//
// → O đỉnh góc vuông; Ox, Oy = 2 tia vuông góc (X, Y free trên 2 trục); I∈OX,
//   K∈OY; đường tròn tâm I, tâm K; M, N = giao thứ hai với mỗi tia.
//
// Tiếp cận: dựng "bộ khung" góc vuông + 2 điểm + 2 đường tròn (tâm I qua K, tâm K
// qua I — XẤP XỈ "(I;OK)"/"(K;OI)": bán kính ≈ đúng cấp độ, đủ cho hình rời NONE)
// + M,N giao thứ hai. Partial OK: ưu tiên render được thay vì khớp bán kính tuyệt
// đối.
//
// Guard: cần tên đỉnh O + 2 điểm trên 2 tia + tên 2 giao điểm. Thiếu → escalate.
//
// GOTCHA \b: ký tự Việt → cờ 'u' + lookaround (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawCircle, connect } from './_shared';

const PREFILTER = /góc\s+vuông\s+[a-z][A-Z][a-z]/u;

// "góc vuông xOy" — đỉnh = chữ HOA GIỮA (vd "xOy" → O). 2 tia = Ox, Oy.
const RIGHT_ANGLE = /góc\s+vuông\s+([a-z])([A-Z])([a-z])(?![\p{L}])/u;

// "Lấy (các)? điểm I và K (lần lượt)? trên (các)? tia Ox và Oy" — 2 điểm ↔ 2 tia.
// Tia = chữ-thường-tên-tia (vd "Ox" = O + x). Ở đây chỉ cần TÊN 2 điểm + xác nhận
// chúng trên 2 tia khác nhau; toạ độ đặt theo trục.
const TWO_ON_RAYS = new RegExp(
  'Lấy\\s+(?:các\\s+|hai\\s+)?điểm\\s+([A-Z])\\s+và\\s+([A-Z])(?![A-Z])\\s+(?:lần\\s*lượt\\s+)?' +
    'trên\\s+(?:các\\s+|hai\\s+)?tia\\s+[A-Z][a-z]\\s+và\\s+[A-Z][a-z]',
  'u',
);

// "Vẽ đường tròn (I; OK) cắt tia Ox tại M" — tâm = HOA đầu trong ngoặc; tia bị cắt
// = "O?" (chữ HOA + thường); tên giao điểm SAU "tại". Bán kính "OK" bỏ qua (xấp xỉ).
const CIRCLE_CUTS_RAY = new RegExp(
  '[Vv]ẽ\\s+[Đđ]ư[ờơ]ng\\s*tròn\\s*\\(\\s*([A-Z])\\s*[;,]\\s*([A-Z])([A-Z])\\s*\\)\\s*' +
    'cắt\\s+tia\\s+([A-Z])([a-z])\\s+(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])',
  'gu',
);

export const rightAngleVertexCirclesRule: LanguageRule = {
  id: 'right-angle-vertex-circles',
  priority: 76, // dựng bộ khung góc + điểm sớm (trên twoCirclesMeet/tangent 74).
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const ra = RIGHT_ANGLE.exec(ctx.problem);
    if (!ra) return [];
    const o = ra[2]; // đỉnh góc vuông
    const xRay = ra[1]; // tên tia 1 (chữ thường, vd 'x')
    const yRay = ra[3]; // tên tia 2

    // 2 điểm trên 2 tia.
    let pI = '';
    let pK = '';
    for (const c of ctx.clauses) {
      const t = TWO_ON_RAYS.exec(c.text);
      if (t) {
        pI = t[1];
        pK = t[2];
        break;
      }
    }
    if (!pI || !pK || pI === pK || pI === o || pK === o) return [];

    // Tên 2 điểm cuối 2 trục (đặt theo trục) — synth từ tên tia HOA hoá.
    const xEnd = xRay.toUpperCase() === o ? `${o}x` : xRay.toUpperCase();
    const yEnd = yRay.toUpperCase() === o ? `${o}y` : yRay.toUpperCase();
    // Tránh trùng tên điểm đã có.
    const used = new Set([o, pI, pK]);
    const ax = used.has(xEnd) ? 'X9' : xEnd;
    const ay = used.has(yEnd) ? 'Y9' : yEnd;

    const intents = [
      addPoint(o, { kind: 'free', at: [0, 0] }),
      addPoint(ax, { kind: 'free', at: [8, 0] }),
      addPoint(ay, { kind: 'free', at: [0, 8] }),
      addPoint(pI, { kind: 'onSegment', of: `${o}${ax}`, t: 0.35 }),
      addPoint(pK, { kind: 'onSegment', of: `${o}${ay}`, t: 0.35 }),
      connect(o, ax, 'segment'),
      connect(o, ay, 'segment'),
    ];

    // Đường tròn cắt tia → tâm + giao thứ hai.
    const clauseFor = (txt: string) => ctx.clauses.find((c) => c.text === txt);
    for (const c of ctx.clauses) {
      CIRCLE_CUTS_RAY.lastIndex = 0;
      for (const m of c.text.matchAll(CIRCLE_CUTS_RAY)) {
        const center = m[1]; // I hoặc K
        const rayVertex = m[4]; // O
        const rayDir = m[5]; // x|y
        const hit = m[6]; // M|N
        if (![pI, pK, o].includes(center)) continue;
        if (hit === center || hit === o) continue;
        // Tia Ox → đoạn O-ax ; Oy → đoạn O-ay.
        const rayAxisEnd =
          rayDir.toUpperCase() === xRay.toUpperCase() ? ax : rayDir.toUpperCase() === yRay.toUpperCase() ? ay : '';
        if (!rayAxisEnd || rayVertex !== o) continue;
        const otherCenter = center === pI ? pK : pI; // bán kính ≈ qua điểm kia
        const circ = `${center}_c`;
        intents.push(drawCircle(circ, 'centerThrough', { center, through: otherCenter }));
        intents.push(
          addPoint(hit, { kind: 'secondIntersection', line: `${o}${rayAxisEnd}`, circle: circ, other: o }),
        );
        void clauseFor;
      }
    }

    return [{ ruleId: 'right-angle-vertex-circles', clauseIds: ctx.clauses.map((c) => c.id), intents }];
  },
};
