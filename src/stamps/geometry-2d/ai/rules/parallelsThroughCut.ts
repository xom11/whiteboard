// src/stamps/geometry-2d/ai/rules/parallelsThroughCut.ts
//
// Đường song song / vuông góc QUA MỘT ĐIỂM rồi cắt một đường tại điểm đặt tên —
// các dạng Thalès lớp 8 mà rule cũ dựng SAI hoặc bỏ sót:
//
//   (1) Hai đường qua CÙNG một điểm, nêu gộp (zip):
//       "Qua D kẻ các đường thẳng song song với AB và AC, cắt AC và AB lần lượt tại F và E"
//       → F = (qua D ∥ AB) ∩ AC,  E = (qua D ∥ AC) ∩ AB.
//       (perpThroughCutsLines chỉ đọc "song song với AB", lấy E = (∥ AB) ∩ AB — giao
//       hai đường SONG SONG: điểm rác.)
//   (2) Nhiều đoạn "song song với R cắt L tại X" trong cùng mệnh đề, cùng điểm qua:
//       "từ điểm D trên cạnh BC, kẻ đường thẳng song song với AB cắt AC tại F và kẻ
//        đường thẳng song song với AC cắt AB tại E"
//   (3) Đoạn đặt tên + chú thích vị trí đầu mút:
//       "Kẻ IM song song với BK (M thuộc AC)"  /  "Qua E kẻ EM // CD (M ∈ AD)"
//       → M = (qua I ∥ BK) ∩ AC.  (onSegmentPoint đọc "(M thuộc AC)" rồi đặt M TỰ DO
//       giữa AC — hình sai điều kiện song song.)
//
// Mỗi đường mang tên riêng theo điểm qua + đường tham chiếu (par/prp + P + R) để hai
// đường qua cùng một điểm không đè tên nhau. Priority 66 > pointOnSideAtLength (64) >
// onSegmentPoint (62): định nghĩa chính xác của điểm phải thắng "điểm tự do trên cạnh"
// (add-point first-wins).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, connect, drawLine } from './_shared';

const PREFILTER = /song\s*song|\/\/|∥|vuông\s*góc|⊥/u;

const PT = "([A-Z])(?!['′A-Z])";
const SEG = '([A-Z]{2})(?![A-Z])';
const KW = String.raw`(song\s*song|\/\/|∥|vuông\s*góc|⊥)`;
const LINE_PREFIX = String.raw`(?:(?:các\s+)?(?:cạnh|đoạn(?:\s+thẳng)?|đường\s*thẳng|tia)\s+)?`;
const THU_TU = String.raw`(?:(?:lần\s*lượt|theo\s+thứ\s+tự|thứ\s+tự)\s+)?`;

// (1) zip: g1 = điểm qua, g2 = kw, g3/g4 = hai đường tham chiếu, g5/g6 = hai đường bị
// cắt, g7/g8 = hai giao điểm.
const ZIP = new RegExp(
  String.raw`(?:[Qq]ua|[Tt]ừ)\s+(?:điểm\s+)?${PT}[^.;]{0,40}?(?:kẻ|vẽ|dựng)\s+(?:các\s+|hai\s+)?đường(?:\s*thẳng)?\s+${THU_TU}${KW}\s*(?:với\s+)?${LINE_PREFIX}${SEG}\s*(?:,|và)\s*${SEG}\s*,?\s*(?:(?:chúng|hai\s+đường\s*thẳng\s+này|các\s+đường\s*thẳng\s+này)\s+)?${THU_TU}cắt\s+${LINE_PREFIX}${SEG}\s*(?:,|và)\s*${SEG}\s*,?\s*${THU_TU}(?:tại|ở)\s+(?:các\s+điểm\s+|điểm\s+)?${PT}\s*(?:,|và)\s*${PT}`,
  'gu',
);

// (2) điểm qua đầu mệnh đề: "(Qua|Từ) (điểm)? P"
const QUA = new RegExp(String.raw`(?:[Qq]ua|[Tt]ừ)\s+(?:một\s+)?(?:điểm\s+)?${PT}`, 'u');
// một đoạn "(kẻ)? (đường thẳng)? kw (với)? R (,)? cắt L tại X"
const MANH = new RegExp(
  String.raw`đường(?:\s*thẳng)?\s+${KW}\s*(?:với\s+)?${LINE_PREFIX}${SEG}\s*,?\s*(?:và\s+)?cắt\s+${LINE_PREFIX}${SEG}\s+(?:tại|ở)\s+(?:điểm\s+)?${PT}`,
  'gu',
);

// (3) "(Kẻ|Vẽ|Dựng) PX kw ZW (X ∈|thuộc L)" — PX là đoạn đặt tên, X đầu mút mới.
const DAT_TEN = new RegExp(
  String.raw`(?:[Kk]ẻ|[Vv]ẽ|[Dd]ựng)\s+(?:đoạn\s+(?:thẳng\s+)?|đường\s*thẳng\s+)?([A-Z])${PT}\s*${KW}\s*(?:với\s+)?${LINE_PREFIX}${SEG}\s*\(\s*([A-Z])\s*(?:∈|thuộc)\s*${LINE_PREFIX}${SEG}\s*\)`,
  'gu',
);

function tenDuong(ss: boolean, qua: string, ref: string) {
  return (ss ? 'par' : 'prp') + qua + ref;
}

/** Đường qua `qua` (∥/⊥ `ref`) cắt `cat` tại `ten`. null nếu suy biến. */
function dung(kw: string, qua: string, ref: string, cat: string, ten: string): IntentT[] | null {
  const ss = /song|\/\/|∥/u.test(kw);
  if (ten === qua || ref.includes(ten) || cat.includes(ten)) return null;
  if (ss && ref.includes(qua)) return null; // đường ∥ qua điểm nằm trên chính nó
  if (ss && ref.split('').sort().join('') === cat.split('').sort().join('')) return null; // ∥ cắt chính nó
  const ln = tenDuong(ss, qua, ref);
  return [
    drawLine(ln, ss ? 'parallelThrough' : 'perpThrough', { through: qua, to: ref }),
    addPoint(ten, { kind: 'intersection', of: [ln, cat] }),
    // nối đoạn qua–giao (hợp nhất twoParallelsThroughPoint của nhánh lớp 7)
    connect(qua, ten, 'segment'),
  ];
}

export const parallelsThroughCutRule: LanguageRule = {
  id: 'parallelsThroughCut',
  priority: 66,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      let daXong = false;
      // (1)
      for (const m of c.text.matchAll(ZIP)) {
        const [, qua, kw, r1, r2, l1, l2, x1, x2] = m;
        const a = dung(kw, qua, r1, l1, x1);
        const b = dung(kw, qua, r2, l2, x2);
        if (!a || !b || x1 === x2) continue;
        out.push({ ruleId: 'parallelsThroughCut', clauseIds: [c.id], intents: [...a, ...b] });
        daXong = true;
      }
      // (2) — chỉ khi ≥ 2 đoạn (một đoạn đơn đã có rule khác lo đúng).
      if (!daXong) {
        const q = QUA.exec(c.text);
        const manh = [...c.text.matchAll(MANH)];
        if (q && manh.length >= 2 && (q.index ?? 0) < (manh[0].index ?? 0)) {
          const intents: IntentT[] = [];
          let ok = true;
          for (const m of manh) {
            const r = dung(m[1], q[1], m[2], m[3], m[4]);
            if (!r) { ok = false; break; }
            intents.push(...r);
          }
          if (ok && new Set(manh.map((m) => m[4])).size === manh.length) {
            out.push({ ruleId: 'parallelsThroughCut', clauseIds: [c.id], intents });
          }
        }
      }
      // (3)
      for (const m of c.text.matchAll(DAT_TEN)) {
        const [, qua, x, kw, ref, x2, cat] = m;
        if (x !== x2) continue;
        // "Kẻ GI ⊥ HF (I ∈ HF)" = chân đường vuông góc — perpFoot lo (không vẽ thêm đường).
        if (!/song|\/\/|∥/u.test(kw)) continue;
        const r = dung(kw, qua, ref, cat, x);
        if (!r) continue;
        out.push({ ruleId: 'parallelsThroughCut', clauseIds: [c.id], intents: [...r, connect(qua, x, 'segment')] });
      }
    }
    return out;
  },
};
