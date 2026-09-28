// src/stamps/geometry-2d/ai/rules/pointRatio.ts
//
// Điểm CHIA ĐOẠN THEO TỈ SỐ / điểm xác định bởi ĐẲNG THỨC VECTƠ (Toán 10):
//   "Gọi M là điểm thuộc đoạn AB sao cho MA = 2MB"      → AM = 2/3·AB (chia trong)
//   "Trên cạnh BC lấy điểm D sao cho BD = 1/3 BC"        → BD = 1/3·BC
//   "Trên cạnh BC lấy hai điểm M, N sao cho BM = MN = NC" → chia ba đều
//   "lấy M, N lần lượt thuộc AB, AC sao cho AM = 1/3 AB, AN = 2/3 AC"
//   "Gọi I là điểm thoả mãn vectơ IA + 2 vectơ IB = vectơ 0" → I = (A + 2B)/3
//   "Gọi M là điểm sao cho vectơ MA = 2 vectơ MB"         → M = 2B − A (chia NGOÀI:
//                                                           B là trung điểm AM)
//   "Gọi M là điểm thoả vectơ AM = 1/3 vectơ AC"
//
// Dựng CHÍNH XÁC bằng pointAtDistance (khoảng cách = t·|XY|, kéo đỉnh vẫn đúng tỉ
// số), không đặt "đại khái" trên đoạn như onSegmentPoint. Lời giải là tổ hợp của ba
// điểm trở lên ("vectơ MA + vectơ MB + 2 vectơ MC = vectơ 0", "vectơ AD = vectơ BC")
// → điểm affine Σ wᵢ·Pᵢ (constraint 'affine', cũng phái sinh theo đỉnh).
//
// Hệ thức ĐỘ DÀI (không vectơ) chỉ dựng khi đề nói rõ điểm nằm trên ĐOẠN/CẠNH: trên
// đường thẳng thì "MA = 2MB" có hai nghiệm (chia trong / chia ngoài) — nhập nhằng.
// Có cả chỗ chứa lẫn vectơ ("M thuộc đoạn AB sao cho vectơ …") mà lời giải rơi ra
// ngoài đoạn ⇒ đề mâu thuẫn với cách hiểu ⇒ bỏ qua.
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, connect } from './_shared';
import {
  chuanHoaVecto, moiDangThucVecto, giaiDiem, docChuoiDoDai, viTriTrenDoan, chiaDeu, quySoDo,
} from './vectorEquation';
import { pointOnSideAtRatioRule } from './pointOnSideAtRatio';

const PREFILTER = /sao\s+cho|th[oỏ][aả](?:\s+mãn)?|xác\s+định\s+bởi|[Vv][eé]c\s*-?\s*t[ơo]/u;

const NAME = "(?<![A-Z])[A-Z](?:['′])?(?![A-Z])";
const NAMES = String.raw`(${NAME}(?:\s*(?:,|và)\s*${NAME})*)`;
const SEG_WORD = String.raw`(?:đoạn(?:\s+thẳng)?|cạnh(?:\s+(?:bên|đáy|huyền))?)`;
const SEGS = String.raw`([A-Z]{2}(?![A-Z])(?:\s*(?:,|và)\s*[A-Z]{2}(?![A-Z]))*)`;

// Chỗ chứa: tên điểm + đoạn (một hoặc phân phối "lần lượt").
//  (1) "M (là (một)? điểm)? (nằm)? (thuộc|trên) (các)? (đoạn|cạnh)? AB"
//      "M, N lần lượt (là các điểm)? thuộc (các cạnh)? AB, AC"
const TEN_THUOC = new RegExp(
  String.raw`(?:[Đđ]iểm\s+|[Gg]ọi\s+|[Ll]ấy\s+(?:các\s+|hai\s+|ba\s+)?(?:điểm\s+)?)?${NAMES}\s+(?:(?:lần\s*lượt|theo\s+thứ\s+tự)\s+)?(?:là\s+(?:một\s+|các\s+|hai\s+|ba\s+)?điểm\s+)?(?:nằm\s+)?(?:(?:lần\s*lượt|theo\s+thứ\s+tự)\s+)?(?:thuộc|trên)\s+(?:các\s+|hai\s+)?(?:${SEG_WORD}\s+)?${SEGS}`,
  'gu',
);
//  (2) "Trên (các)? (đoạn|cạnh) AB (, AC)? lấy (lần lượt)? (các|hai)? (điểm)? M (, N)?"
const TREN_LAY = new RegExp(
  String.raw`[Tt]rên\s+(?:các\s+|hai\s+)?(?:${SEG_WORD}\s+)?${SEGS}(?:\s+của\s+(?:tam\s+giác|tứ\s+giác|hình\s+\S+(?:\s+\S+)?)\s+[A-Z]{3,4}(?![A-Z]))?\s*,?\s*(?:ta\s+)?lấy\s+(?:(?:lần\s*lượt|theo\s+thứ\s+tự)\s+)?(?:các\s+|hai\s+|ba\s+|một\s+)?(?:điểm\s+)?${NAMES}`,
  'gu',
);

// Điểm được GIỚI THIỆU trong mệnh đề (ứng viên ẩn của đẳng thức vectơ).
const GIOI_THIEU = [
  new RegExp(String.raw`(?:[Đđ]iểm|[Gg]ọi|[Ll]ấy|[Dd]ựng|[Xx]ác\s+định)\s+(?:các\s+|hai\s+|ba\s+)?(?:điểm\s+)?${NAMES}`, 'gu'),
  new RegExp(String.raw`${NAMES}\s+(?:(?:lần\s*lượt|theo\s+thứ\s+tự)\s+)?là\s+(?:một\s+|các\s+|hai\s+|ba\s+|những\s+)?điểm`, 'gu'),
];

// "BC = 8 cm" ở đâu đó trong đề — để quy "BD = 2 cm" về tỉ số trên đoạn BC.
const DO_DAI = /(?<![A-Z])([A-Z]{2})\s*=\s*(\d+(?:[.,]\d+)?)(?!\s*[√\d/])\s*(?:cm|dm|mm|m)?(?![\p{L}\d])/gu;

const tachTen = (blob: string) =>
  blob.split(/\s*,\s*|\s+và\s+/u).map((s) => s.trim().replace('′', "'")).filter(Boolean);

// "thuộc AB" trần được hiểu là thuộc ĐOẠN AB (cách viết tắt quen thuộc); "tia"/
// "đường thẳng" không khớp SEG_WORD/SEGS nên không bao giờ vào đây.
interface ChoChua { ten: string; X: string; Y: string }

/** Các cặp (điểm, đoạn chứa nó) đọc được trong mệnh đề. */
function choChua(text: string): ChoChua[] {
  const out: ChoChua[] = [];
  const zip = (names: string[], segs: string[]) => {
    // "Trên cạnh BC lấy hai điểm M, N" → mọi điểm trên cùng một đoạn.
    if (segs.length === 1) for (const n of names) out.push({ ten: n, X: segs[0][0], Y: segs[0][1] });
    else if (segs.length === names.length) names.forEach((n, i) => out.push({ ten: n, X: segs[i][0], Y: segs[i][1] }));
  };
  for (const m of text.matchAll(TEN_THUOC)) zip(tachTen(m[1]), tachTen(m[2]));
  for (const m of text.matchAll(TREN_LAY)) zip(tachTen(m[2]), tachTen(m[1]));
  return out.filter((c) => c.X !== c.Y && c.ten !== c.X && c.ten !== c.Y);
}

function gioiThieu(text: string): Set<string> {
  const out = new Set<string>();
  for (const re of GIOI_THIEU) for (const m of text.matchAll(re)) for (const n of tachTen(m[1])) out.add(n);
  return out;
}

/** P = X + t·(Y − X) ⇒ intent pointAtDistance (t > 0: từ X về phía Y; t < 0: vượt X). */
function dungTheoT(P: string, X: string, Y: string, t: number): IntentT[] {
  if (t > 0) {
    const it = [addPoint(P, { kind: 'pointAtDistance', from: X, through: Y, origin: 'from', distance: { kind: 'segmentLength', p1: X, p2: Y, scale: t } })];
    // Chia ngoài vượt Y: nối Y–P cho thấy ba điểm thẳng hàng.
    if (t > 1 + 1e-9) it.push(connect(Y, P));
    return it;
  }
  return [
    addPoint(P, { kind: 'pointAtDistance', from: Y, through: X, distance: { kind: 'segmentLength', p1: X, p2: Y, scale: -t } }),
    connect(X, P),
  ];
}

export const pointRatioRule: LanguageRule = {
  id: 'pointRatio',
  // TRÊN pointOnSideAtLength (64) và onSegmentPoint (62): định nghĩa chính xác theo
  // tỉ số phải thắng "điểm tự do trên cạnh" (addPoint first-wins theo priority).
  priority: 65,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    const doDai = new Map<string, number>();
    for (const m of ctx.problem.matchAll(DO_DAI)) {
      const v = Number(m[2].replace(',', '.'));
      if (v > 0) doDai.set(m[1], v);
    }
    for (const c of ctx.clauses) {
      const text = chuanHoaVecto(c.text);
      if (!PREFILTER.test(text)) continue;
      const cho = choChua(text);
      const intents: IntentT[] = [];
      const daDung = new Set<string>();
      let hong = false;

      // (A) Đẳng thức vectơ: mỗi đẳng thức có đúng MỘT ẩn là điểm được giới thiệu.
      if (/vectơ/u.test(text)) {
        let moi = gioiThieu(text);
        // Mệnh đề chỉ có đẳng thức (sau ";"): ẩn là điểm giới thiệu ở mệnh đề trước.
        for (const truoc of ctx.clauses.filter((k) => k.id < c.id).reverse()) {
          if (moi.size > 0 || !/vectơ|v[eé]c\s*t[ơo]/u.test(truoc.text)) break;
          moi = gioiThieu(chuanHoaVecto(truoc.text));
        }
        for (const c2 of cho) moi.add(c2.ten);
        for (const lin of moiDangThucVecto(text)) {
          const an = [...lin.keys()].filter((q) => moi.has(q) && !daDung.has(q));
          if (an.length !== 1) continue;
          const P = an[0];
          const sol = giaiDiem(lin, P);
          if (!sol || sol.size < 2) { hong = true; continue; }
          if (sol.size > 2) {
            // Ba điểm trở lên: tổ hợp affine (không nằm trên một đoạn cho trước).
            if (cho.some((k) => k.ten === P)) { hong = true; continue; }
            intents.push(addPoint(P, { kind: 'affine', points: [...sol.keys()], weights: [...sol.values()] }));
            daDung.add(P);
            continue;
          }
          const [[X, a], [Y, b]] = [...sol];
          if (Math.abs(a + b - 1) > 1e-9 || Math.abs(b) < 1e-12 || Math.abs(a) < 1e-12) { hong = true; continue; }
          // P = a·X + b·Y = X + b·(Y − X).
          const chua = cho.find((k) => k.ten === P);
          if (chua) {
            const trong = new Set([chua.X, chua.Y]);
            if (!trong.has(X) || !trong.has(Y) || !(b > 0 && b < 1)) { hong = true; continue; }
          }
          intents.push(...dungTheoT(P, X, Y, b));
          daDung.add(P);
        }
      }

      // (B) Hệ thức độ dài sau "sao cho" cho điểm trên ĐOẠN.
      // "sao cho" hoặc "thỏa mãn" ("Các điểm D, E thuộc cạnh BC thỏa mãn BD = DE = EC").
      const sau = text.split(/sao\s+cho|th[oỏ][aả]\s+mãn/u)[1];
      if (sau && cho.length > 0 && !/vectơ/u.test(sau)) {
        const chuois: ReturnType<typeof docChuoiDoDai>[] = [];
        for (const m of sau.matchAll(/(?:^|,|;|\svà\s)/gu)) {
          const ch = docChuoiDoDai(sau.slice(m.index! + m[0].length));
          if (ch) chuois.push(ch);
        }
        // Chia đều "BM = MN = NC": nhiều điểm trên cùng một đoạn.
        const theoDoan = new Map<string, ChoChua[]>();
        for (const k of cho) theoDoan.set(k.X + k.Y, [...(theoDoan.get(k.X + k.Y) ?? []), k]);
        for (const [xy, ks] of theoDoan) {
          if (ks.length < 2) continue;
          for (const ch of chuois) {
            const deu = ch && chiaDeu(ch, ks.map((k) => k.ten), xy[0], xy[1]);
            if (!deu) continue;
            for (const [P, t] of deu) {
              if (daDung.has(P)) continue;
              intents.push(...dungTheoT(P, xy[0], xy[1], t));
              daDung.add(P);
            }
          }
        }
        for (const k of cho) {
          if (daDung.has(k.ten)) continue;
          for (const ch0 of chuois) {
            if (!ch0 || !ch0.some((v) => v.cap.includes(k.ten))) continue;
            // "BD = 2 cm" chỉ quy được về tỉ số khi đề cho độ dài chính đoạn BC.
            const ch = quySoDo(ch0, k.X, k.Y, doDai.get(k.X + k.Y) ?? doDai.get(k.Y + k.X));
            if (!ch) continue;
            const t = viTriTrenDoan(ch, k.ten, k.X, k.Y);
            if (t === undefined) continue;
            intents.push(...dungTheoT(k.ten, k.X, k.Y, t));
            daDung.add(k.ten);
            break;
          }
        }
      }

      if (hong || intents.length === 0) continue;
      // Mọi điểm mới có chỗ chứa trong mệnh đề phải dựng được — thiếu một thì để
      // mệnh đề chưa phủ (rule khác / GV lo), không claim nửa vời.
      if (cho.some((k) => !daDung.has(k.ten) && /sao\s+cho|th[oỏ][aả]\s+mãn/u.test(text))) continue;
      out.push({ ruleId: 'pointRatio', clauseIds: [c.id], intents });
    }
    // MỘT điểm quyết định cho "điểm chia đoạn theo tỉ số": mệnh đề nào pointRatio đã
    // dựng thì giữ; mệnh đề còn lại mới thử bộ giải tuyến tính của pointOnSideAtRatio
    // (điểm trên TIA vượt đầu mút, "Trên các tia AB, AC lần lượt lấy … AM = 10 cm",
    // "AD = DE = EB" với tên đứng trước, điểm tự do cùng mệnh đề …). Hai rule cùng
    // priority mà chạy song song thì first-wins có thể chọn định nghĩa khác nhau.
    const daPhu = new Set(out.flatMap((m) => m.clauseIds));
    for (const m of pointOnSideAtRatioRule.match(ctx)) {
      if (!m.clauseIds.some((id) => daPhu.has(id))) out.push(m);
    }
    return out;
  },
};
