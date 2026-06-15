// src/stamps/geometry-2d/ai/rules/circleExternalPoint.ts
//
// Mở đầu đề CỰC PHỔ BIẾN (tiếp tuyến từ điểm ngoài):
//   "Cho đường tròn (O) và điểm A (nằm)? (ở)? ngoài (đường tròn)?"
//   → drawCircle(O) bán kính canonical + addPoint(A, externalToCircle O).
//
// circleRadius CỐ Ý bỏ "(O)" TRƠ (không bán kính/đi qua) vì mơ hồ. Nhưng khi đề
// nêu KÈM "điểm A ngoài (O)" thì đường tròn LÀ hình nền (phải vẽ) và A là điểm
// ngoài để kẻ tiếp tuyến/cát tuyến. Rule này claim cả cụm trong 1 clause → vẽ
// circle + A một lần, UNBLOCK tangentPointsFromExt / secant / intersection OA∩BC.
//
// externalPoint.ts xử dạng "Lấy/Gọi điểm A ngoài (O)" (chỉ điểm, dựa circleRadius
// vẽ circle). Ở đây circle KHÔNG có bán kính nên externalPoint không đủ → rule
// riêng tự emit cả circle.
//
// GOTCHA \b: ký tự Việt "ngoài"/"đường" → cờ 'u', không \b.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawCircle } from './_shared';
import { SYMBOLIC_RADIUS } from './circleRadius';

// "đường tròn (O) ... và (có)? điểm A (nằm/ở)? ngoài". group1=tâm O, group2=A.
// [^.A-Z]{0,8}? giữa "(O)" và "và/điểm" cho phép "; R)" hoặc khoảng trắng; chặn
// nhảy dấu chấm / nhãn HOA khác.
// "đường tròn" optional — vao10 259/268 "Cho (O) và điểm A nằm ngoài (O)" viết
// paren trần; "một điểm" cũng gặp.
const VN_FORM = new RegExp(
  String.raw`(?:đường\s*tròn\s*)?\(\s*([A-Z])(?:\s*[;,]\s*[Rr])?\s*\)[^.A-Z]{0,8}?(?:và\s+)?(?:có\s+)?(?:một\s+)?điểm\s+([A-Z])(?:['′]?)[^.A-Z]{0,14}?(?:nằm\s+|ở\s+)?ngoài`,
  'u',
);

// Dạng ĐẢO — điểm trước, đường tròn sau (vao10:28 "Cho điểm M nằm ngoài đường
// tròn tâm O"; vao10:31 "một điểm A nằm ngoài đường tròn" — tâm vắng, resolve
// từ đề). group1=điểm, group2=tâm (optional — '.' chặn \s* nên không nuốt chữ
// HOA mở câu sau).
const VN_REV = new RegExp(
  String.raw`điểm\s+([A-Z])(?:['′]?)\s+(?:nằm\s+|ở\s+)?ngoài\s+đường\s*tròn\s*(?:tâm\s+)?\(?\s*([A-Z])?`,
  'u',
);
// Resolve tâm từ toàn đề khi VN_REV không có tâm sau "ngoài đường tròn":
// "đường tròn (tâm)? O" / "(O)" / "(O;R)".
const RESOLVE_CENTER =
  /đường\s*tròn\s*(?:\(\s*)?(?:tâm\s+)?([A-Z])(?![A-Za-z])|\(\s*([A-Z])(?:\s*[;,]\s*[Rr])?\s*\)/u;

// Điểm ngoài qua METRIC (không chữ "ngoài"): "(O; 3cm) và điểm A có OA = 6 cm"
// → 6 > 3 ⇒ A ngoài (O). group1=tâm, group2=R, group3=điểm, group4=cặp đo (OA),
// group5=khoảng cách d. Chỉ external khi cặp-đo = {tâm, điểm} và d > R.
const VN_METRIC = new RegExp(
  String.raw`\(\s*([A-Z])\s*[;,]\s*(\d+(?:[.,]\d+)?)\s*cm\s*\)[^.A-Z]{0,12}?(?:và\s+)?(?:có\s+)?điểm\s+([A-Z])(?:['′]?)[^.]{0,12}?([A-Z]{2})\s*=\s*(\d+(?:[.,]\d+)?)`,
  'u',
);

// EN mirror: "circle (O) and (a)? point A (lies|lying)? outside".
const EN_FORM = new RegExp(
  String.raw`(?:[Cc]ircle\s*)?\(\s*([A-Z])(?:\s*[;,]\s*[Rr])?\s*\)[^.A-Z]{0,8}?and\s+(?:a\s+)?point\s+([A-Z])(?:['′]?)[^.A-Z]{0,18}?outside`,
  'u',
);

export const circleExternalPointRule: LanguageRule = {
  id: 'circleExternalPoint',
  priority: 70,
  languages: ['vi', 'en'],
  patterns: [/ngoài/u, /[Oo]utside/u, /điểm\s+[A-Z][^.]{0,12}?[A-Z]{2}\s*=\s*\d/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = VN_FORM.exec(c.text) ?? EN_FORM.exec(c.text);
      let center: string | undefined;
      let ext: string | undefined;
      if (m) {
        center = m[1];
        ext = m[2];
      } else if (VN_METRIC.test(c.text)) {
        const mm = VN_METRIC.exec(c.text)!;
        const [ctr, r, pt, pair, d] = [mm[1], mm[2], mm[3], mm[4], mm[5]];
        // cặp đo phải gồm tâm + điểm; d > R ⇒ ngoài.
        const norm = (s: string) => parseFloat(s.replace(',', '.'));
        if (pair.includes(ctr) && pair.includes(pt) && norm(d) > norm(r)) {
          center = ctr;
          ext = pt;
        }
      } else {
        const rv = VN_REV.exec(c.text);
        if (!rv) continue;
        ext = rv[1];
        // Tâm sau "ngoài đường tròn" nếu có, else resolve từ toàn đề.
        const rc = rv[2] ? undefined : RESOLVE_CENTER.exec(ctx.problem);
        center = rv[2] ?? rc?.[1] ?? rc?.[2];
      }
      if (!center || !ext || center === ext) continue;
      out.push({
        ruleId: 'circleExternalPoint',
        clauseIds: [c.id],
        intents: [
          drawCircle(center, 'centerRadius', { center, radius: SYMBOLIC_RADIUS }),
          addPoint(ext, { kind: 'externalToCircle', circle: center }),
        ],
      });
    }
    return out;
  },
};
