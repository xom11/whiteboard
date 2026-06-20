// src/stamps/geometry-2d/ai/rules/commonTangent.ts
//
// TIẾP TUYẾN CHUNG của 2 đường tròn (đường tiếp xúc CẢ 2 đtròn):
//   "Vẽ tiếp tuyến chung ngoài BC của hai đường tròn (O) và (O') với B ∈ (O),
//    C ∈ (O')"                                                   (vxhung #37)
//   "Kẻ tiếp tuyến chung DE của hai đường tròn với D ∈ (O), E ∈ (O')"  (vxhung #31)
//   "Kẻ tiếp tuyến chung ngoài BC, B ∈ (O), C ∈ (O')"           (hinh9 #225)
//   "Gọi CD là tiếp tuyến chung ngoài của hai đường tròn (với C∈ (O) và D ∈ (O'))"
//
// → 2 đtròn FREE (tâm O, O' — tên KHỚP `circles`) + 2 tiếp điểm
//   commonTangentPoint(on=0/1) + connect(T1,T2) = đường tiếp tuyến.
//
// Toạ độ 2 tâm đặt ĐỦ TÁCH (d > r1+r2) để tiếp tuyến chung TRONG cũng tồn tại
// (render functional trả null nếu lồng/sát biên → escalate). O=(0,0) r=3,
// O'=(12,0) r=2 → d=12 > 5: cả external lẫn internal đều tồn tại.
//
// Gán tiếp điểm↔đtròn theo membership "X ∈ (O)" nếu nêu; else chữ-đầu↔đtròn-đầu.
// variant='internal' khi "trong", else 'external'. side=0.
//
// Guard: PHẢI có "chung" + ≥2 tên đtròn KHÁC nhau (KHÔNG nuốt tiếp tuyến đơn 1
// đtròn); 2 tâm KHÁC tên (OCR rơi prime → escalate); tiếp điểm ∉ {tâm}.
//
// GOTCHA: như twoCirclesTangent, rule LUÔN đặt 2 đtròn (chấp nhận khả năng nhân
// đôi nếu rule khác cũng dựng — resolveCircleNames hợp nhất theo tên; ưu tiên
// FLIP/partial).
// GOTCHA \b: ký tự Việt → cờ 'u' + lookaround (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, connect, drawCircle } from './_shared';

const PREFILTER = /[Tt]iếp\s*tuyến\s+chung/u;

// Tiếp điểm dạng GLUE "BC" / "DE" (2 HOA dính) — chữ đầu↔đtròn 0, sau↔đtròn 1.
const TANGENT_GLUE = /[Tt]iếp\s*tuyến\s+chung\s+(?:(?:ngoài|trong)\s+)?([A-Z])([A-Z])(?![A-Za-z])/u;

// "<XY> là tiếp tuyến chung" (tên đứng TRƯỚC, vd "Gọi CD là tiếp tuyến chung").
const TANGENT_NAMED_BEFORE = /([A-Z])([A-Z])(?![A-Za-z])\s+là\s+tiếp\s*tuyến\s+chung/u;

// variant: "trong" → internal, else external.
const INTERNAL = /tiếp\s*tuyến\s+chung\s+trong/u;

// Tên đtròn "(X)" / "(X;R)" — X = 1 HOA + prime optional. Bắt TẤT CẢ trong đề.
const CIRCLE_G = /\(\s*([A-Z]['′]?)(?:\s*[;,]\s*(?:[Rr]['′]?|\d+(?:[.,]\d+)?\s*[a-z]*))?\s*\)/gu;
const CIRC = "\\(\\s*([A-Z]['′]?)(?:\\s*[;,]\\s*(?:[Rr]['′]?|\\d+(?:[.,]\\d+)?\\s*[a-z]*))?\\s*\\)";
// Phrasing: "tiếp xúc (với)? (X) và (Y) (lần lượt|tương ứng|theo thứ tự)? (tại|ở) P (,|và) Q"
// → c1=X,c2=Y, t1=P (trên X, on=0), t2=Q (trên Y, on=1). Cho cả circle lẫn tiếp điểm
// trong 1 lần (hinh9:55/son123:40: "Một tiếp tuyến chung của (O),(O') tiếp xúc với
// (O) và (O') lần lượt tại P và Q"). groups: 1=c1 2=c2 3=t1 4=t2.
const TANGENT_TOUCH = new RegExp(
  'tiếp\\s*xúc\\s+(?:với\\s+)?' +
    CIRC +
    '\\s*(?:,|và)\\s*' +
    CIRC +
    '\\s+(?:lần\\s*lượt\\s+|tương\\s+ứng\\s+|theo\\s+thứ\\s+tự\\s+)?(?:tại|ở)\\s+(?:các\\s+)?(?:điểm\\s+)?' +
    "([A-Z]['′]?)(?![A-Za-z])\\s*(?:,|và)\\s*([A-Z]['′]?)(?![A-Za-z])",
  'u',
);

const norm = (s: string) => s.replace(/′/g, "'");

/** "<P> (∈|thuộc|nằm trên) (đường tròn (tâm)?)? <C>" → membership P↔C (C = tên tâm). */
function membership(problem: string, pt: string): string | undefined {
  // P ∈ (O) | P thuộc (O) | P thuộc đường tròn tâm O | P nằm trên đường tròn (O)
  const re = new RegExp(
    pt +
      "\\s*(?:∈|thuộc|nằm\\s+trên)\\s*(?:[Đđ]ư[ờơ]ng\\s*tròn\\s*)?(?:\\(\\s*)?(?:tâm\\s+)?([A-Z]['′]?)",
    'u',
  );
  const m = re.exec(problem);
  return m ? norm(m[1]) : undefined;
}

export const commonTangentRule: LanguageRule = {
  id: 'common-tangent',
  // Cạnh twoCirclesTangent (74): 2 đtròn + tiếp điểm là gốc nhiều phái sinh.
  priority: 73,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const p = ctx.problem;

    let t1: string | undefined;
    let t2: string | undefined;
    let c1: string | undefined;
    let c2: string | undefined;

    // Phrasing "tiếp xúc với (X) và (Y) lần lượt tại P, Q" — cho cả circle lẫn tiếp điểm.
    const mt = TANGENT_TOUCH.exec(p);
    if (mt) {
      c1 = norm(mt[1]);
      c2 = norm(mt[2]);
      t1 = norm(mt[3]);
      t2 = norm(mt[4]);
    } else {
      // Tiếp điểm: glue "BC" sau "tiếp tuyến chung", hoặc tên trước "XY là tiếp tuyến chung".
      const mg = TANGENT_GLUE.exec(p);
      if (mg) {
        t1 = mg[1];
        t2 = mg[2];
      } else {
        const mb = TANGENT_NAMED_BEFORE.exec(p);
        if (mb) {
          t1 = mb[1];
          t2 = mb[2];
        }
      }
    }
    if (!t1 || !t2 || t1 === t2) return [];

    // 2 tên đtròn (nếu TANGENT_TOUCH chưa cho): membership của tiếp điểm; else 2 (X) đầu.
    const m1 = c1 ? undefined : membership(p, t1);
    const m2 = c2 ? undefined : membership(p, t2);
    if (c1 && c2) {
      // đã có từ TANGENT_TOUCH
    } else if (m1 && m2 && m1 !== m2) {
      c1 = m1; // đtròn của tiếp điểm t1
      c2 = m2;
    } else {
      // fallback: 2 tên (X) khác nhau ĐẦU TIÊN xuất hiện (loại trùng).
      const seen: string[] = [];
      CIRCLE_G.lastIndex = 0;
      let cm: RegExpExecArray | null;
      while ((cm = CIRCLE_G.exec(p)) !== null) {
        const nm = norm(cm[1]);
        if (!seen.includes(nm)) seen.push(nm);
        if (seen.length === 2) break;
      }
      if (seen.length === 2) {
        [c1, c2] = seen;
      }
    }
    if (!c1 || !c2 || c1 === c2) return []; // <2 đtròn / trùng tên → escalate

    if (t1 === c1 || t1 === c2 || t2 === c1 || t2 === c2) return []; // tiếp điểm ≠ tâm

    const variant = INTERNAL.test(p) ? 'internal' : 'external';
    const r1 = 3;
    const r2 = 2;
    // d=12 > r1+r2=5 → cả external lẫn internal tồn tại.
    const declId = ctx.clauses.find((c) => /tiếp\s*tuyến\s+chung/u.test(c.text))?.id;
    const intents: IntentT[] = [
      addPoint(c1, { kind: 'free', at: [0, 0] }),
      addPoint(c2, { kind: 'free', at: [12, 0] }),
      drawCircle(c1, 'centerRadius', { center: c1, radius: r1 }),
      drawCircle(c2, 'centerRadius', { center: c2, radius: r2 }),
      addPoint(t1, { kind: 'commonTangentPoint', circles: [c1, c2], on: 0, variant, side: 0 }),
      addPoint(t2, { kind: 'commonTangentPoint', circles: [c1, c2], on: 1, variant, side: 0 }),
      connect(t1, t2, 'segment'),
    ];
    return [
      {
        ruleId: 'common-tangent',
        clauseIds: declId === undefined ? [] : [declId],
        intents,
      } as RuleMatch,
    ];
  },
};
