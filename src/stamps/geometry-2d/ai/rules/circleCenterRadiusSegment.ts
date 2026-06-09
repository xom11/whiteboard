// src/stamps/geometry-2d/ai/rules/circleCenterRadiusSegment.ts
//
// Đường tròn TÂM <X> bán kính = ĐOẠN <XY> (bán kính cho bằng tên đoạn, không số):
//   "Vẽ đường tròn tâm A bán kính AH"
//     → circle TÂM A đi qua H (|AH| là bán kính) → centerThrough {center:'A', through:'H'}
//
//   "Gọi HD là đường kính của đường tròn (A; AH)" — D = điểm đối tâm của H qua A
//     (D = 2A − H), tức reflectPoint của H qua điểm A. (circleRadius / circleDiameter
//     KHÔNG khớp "(A; AH)" vì AH không phải số / ký hiệu [Rr].)
//
//   "Tiếp tuyến của đường tròn tại D cắt CA ở E"
//     → tangent tại D tới đường tròn (tangentAt) + E = giao(tiếp tuyến, CA).
//
// Đây là construct "đường tròn tâm A bán kính AH" điển hình của đề hình học lớp 9
// (tam giác vuông + đường cao + đường tròn quanh chân/đỉnh). circleRadius rule CHỈ
// nhận bán kính SỐ hoặc ký hiệu [Rr]; "bán kính AH" (đoạn) rơi vào rule này.
//
// Circle name = THÔ chữ tâm (vd 'A'); resolveCircleNames đổi 'A'→'A_c' khi A cũng
// là điểm (đỉnh tam giác) — center A đã tồn tại nên KHÔNG inject thêm.
//
// GOTCHA \b: ký tự Việt → cờ 'u' + lookaround (?!\p{L}), KHÔNG \b ASCII.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawCircle, drawLine, CIRCLE_KW } from './_shared';

// "(đường tròn) tâm <X> bán kính <X><Y>" — bán kính là ĐOẠN (2 chữ HOA), chữ đầu
// trùng tâm. Loại bán kính số (\d) / ký hiệu [Rr] (circleRadius sở hữu).
const CENTER_RADIUS_SEG = new RegExp(
  CIRCLE_KW +
    '\\s*(?:\\(\\s*)?(?:tâm\\s+)?([A-Z])(?:\\s*\\))?\\s*bán\\s*kính\\s+([A-Z])([A-Z])(?![A-Z])',
  'u',
);

// "Gọi <H><D> là đường kính của đường tròn (<center>; ...)" — đầu mút thứ hai (D)
// là điểm đối tâm của đầu mút thứ nhất (H) qua TÂM center (D = reflectPoint H qua center).
// Lưu ý segmentClauses cắt tại ';' nên clause chỉ còn "... đường tròn (A".
const DIAMETER_OF_CIRCLE = new RegExp(
  '([A-Z])([A-Z])(?![A-Z])\\s+là\\s+' +
    '[Đđ]ư[ờơ]ng\\s*kính\\s+của\\s+' +
    CIRCLE_KW +
    '\\s*\\(\\s*([A-Z])(?![A-Z])',
  'u',
);

// "Tiếp tuyến của đường tròn tại <D> cắt <C><A> ở/tại <E>"
const TANGENT_AT_CUTS = new RegExp(
  '[Tt]iếp\\s*tuyến\\s+của\\s+' +
    CIRCLE_KW +
    '\\s+tại\\s+([A-Z])(?![A-Z])\\s+cắt\\s+([A-Z])([A-Z])(?![A-Z])\\s+(?:ở|tại)\\s+([A-Z])(?![A-Z])',
  'u',
);

const PREFILTER = new RegExp(
  CIRCLE_KW + '[^.]{0,16}?bán\\s*kính\\s+[A-Z]{2}|' +
    '[A-Z]{2}\\s+là\\s+[Đđ]ư[ờơ]ng\\s*kính|' +
    '[Tt]iếp\\s*tuyến\\s+của\\s+' + CIRCLE_KW + '\\s+tại',
  'u',
);

export const circleCenterRadiusSegmentRule: LanguageRule = {
  id: 'circle-center-radius-segment',
  // Trên circleRadius (75) để "bán kính AH" được rule này lo trước; nhưng vì
  // circleRadius bỏ qua bán-kính-đoạn nên thực tế không tranh chấp. Đặt 76.
  priority: 76,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];

    // Tâm circle suy từ clause "tâm <X> bán kính <XY>" (dùng để map tangentAt).
    let circleCenter: string | undefined;

    for (const c of ctx.clauses) {
      // 1) Đường tròn tâm X bán kính XY (đoạn) → centerThrough.
      const cr = CENTER_RADIUS_SEG.exec(c.text);
      if (cr) {
        const center = cr[1];
        const a = cr[2];
        const b = cr[3];
        // bán kính = đoạn xuất phát từ tâm: chữ đầu PHẢI là tâm, qua đầu kia.
        if (a === center && b !== center) {
          circleCenter = center;
          out.push({
            ruleId: 'circle-center-radius-segment',
            clauseIds: [c.id],
            intents: [drawCircle(center, 'centerThrough', { center, through: b })],
          });
        }
      }

      // 2) "<H><D> là đường kính của đường tròn (center)" → D đối tâm H qua center.
      const dm = DIAMETER_OF_CIRCLE.exec(c.text);
      if (dm) {
        const h = dm[1];
        const d = dm[2];
        const center = dm[3];
        if (h !== d && d !== center) {
          out.push({
            ruleId: 'circle-center-radius-segment',
            clauseIds: [c.id],
            intents: [addPoint(d, { kind: 'reflectPoint', of: h, through: center })],
          });
        }
      }

      // 3) "Tiếp tuyến của đường tròn tại D cắt CA ở E".
      const tg = TANGENT_AT_CUTS.exec(c.text);
      if (tg) {
        const at = tg[1];
        const line = tg[2] + tg[3];
        const e = tg[4];
        // circle ref = tâm THÔ (resolveCircleNames map → _c nếu cần).
        const circle = circleCenter ?? at; // fallback: dùng chính điểm tiếp xúc? không — cần tâm
        if (circleCenter && at !== e && !line.includes(e)) {
          const tName = `t${at}`;
          out.push({
            ruleId: 'circle-center-radius-segment',
            clauseIds: [c.id],
            intents: [
              drawLine(tName, 'tangentAt', { through: at, circle }),
              addPoint(e, { kind: 'intersection', of: [tName, line] }),
            ],
          });
        }
      }
    }

    return out;
  },
};
