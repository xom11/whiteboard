// src/stamps/geometry-2d/ai/rules/pointOnSideAtLength.ts
//
// Điểm trên cạnh/tia xác định bằng ĐỘ DÀI bằng một đoạn khác — dạng rất hay gặp
// ở lớp 7 (tam giác bằng nhau, tam giác cân):
//   "Trên cạnh AB lấy điểm E sao cho AE = AD"        → E = A + |AD|·hướng AB
//   "Trên tia AC lấy điểm E sao cho AE = AB"
//   "Trên cạnh BC lấy điểm D sao cho CD = FE"         (mốc là đầu CUỐI của cạnh)
//   "…lấy điểm I, trên cạnh AC lấy điểm H sao cho AI = AH"   (I đã dựng ở mệnh đề trước)
//   "Trên các cạnh AB, AC lấy theo thứ tự các điểm D và E sao cho AD = AE"
//   "Trên cạnh AB, BC, CD, DA lấy theo thứ tự M, N, P, Q sao cho AM = CN = CP = AQ"
//   "Cho tam giác ABC có AB = 4 cm, AC = 8 cm. Trên cạnh AC lấy D sao cho AD = 2 cm"
//       → D = A + ¼|AC|·hướng AC (tỉ lệ theo độ dài đề cho, KHÔNG đặt 2 đơn vị tuỳ ý)
//
// Dựng CHÍNH XÁC bằng pointAtDistance{origin:'from'} — không đặt "đại khái" trên
// đoạn: hình sai điều kiện đề còn tệ hơn hình thiếu (onSegmentPoint cố ý bỏ qua
// mệnh đề có "sao cho" vì lý do đó).
//
// Chuỗi bằng nhau: một vế KHÔNG chứa điểm mới nào (AD, FE, số cm) là "độ dài
// chuẩn" → mọi điểm mới đo theo nó. Không có vế như vậy (AD = AE, AM = CN = …) →
// điểm mới ĐẦU TIÊN là điểm tự do trên cạnh của nó, các điểm sau đo theo vế của
// nó. Vế có hệ số/phép cộng ("BM = 2MC", "AD = AB + AC") → bỏ qua (escalate),
// không đoán.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const PREFILTER = /sao\s+cho/u;

const PT = "([A-Z](?:['′])?)(?![A-Z])";
const SEG_KIND = String.raw`(cạnh(?:\s+bên|\s+đáy|\s+huyền)?|đoạn(?:\s+thẳng)?|tia)`;

// "trên (cạnh|đoạn|tia) XY (của …)? lấy (một)? (điểm)? P" — một điểm, một cạnh.
const TREN_LAY = new RegExp(
  String.raw`[Tt]rên\s+${SEG_KIND}\s+([A-Z]{2})(?![A-Z])(?:\s+của\s+[^,.;]{0,30}?)?\s*,?\s*lấy\s+(?:một\s+)?(?:điểm\s+)?${PT}`,
  'gu',
);
// "Lấy (điểm)? P trên/thuộc (cạnh|đoạn|tia) XY" — tên đứng trước.
const LAY_TREN = new RegExp(
  String.raw`[Ll]ấy\s+(?:một\s+)?(?:điểm\s+)?${PT}\s+(?:trên|thuộc)\s+${SEG_KIND}\s+([A-Z]{2})(?![A-Z])`,
  'gu',
);
// Phân phối: "Trên (các)? cạnh (bên)? AB, AC (, …) lấy (theo thứ tự|lần lượt) (các)? (điểm)? D và E"
const TREN_LAY_DISTRIB = new RegExp(
  String.raw`[Tt]rên\s+(?:các\s+)?${SEG_KIND}\s+((?:[A-Z]{2}\s*(?:,|và)\s*)+[A-Z]{2})(?![A-Z])\s*,?\s*lấy\s+(?:(?:theo\s+)?thứ\s+tự\s+|lần\s*lượt\s+)?(?:các\s+)?(?:điểm\s+)?((?:[A-Z](?:['′])?\s*(?:,|và)\s*)+[A-Z](?:['′])?)(?![A-Z])`,
  'u',
);

// Vế chuỗi bằng nhau sau "sao cho": cặp đỉnh "AE" hoặc số đo "2 cm" / "2,5cm" / "3".
const TERM = String.raw`(?:[A-Z]{2}(?![A-Z])|\d+(?:[.,]\d+)?\s*(?:cm|dm|mm|m)?(?!\p{L}))`;
const CHAIN = new RegExp(String.raw`sao\s+cho\s+(${TERM}(?:\s*=\s*${TERM})+)(?=\s*(?:$|[,.;)]|và\s|thì\s))`, 'u');

// "AC = 8 cm" ở bất kỳ đâu trong đề → độ dài đề cho, để quy số cm về tỉ lệ.
const GIVEN_LEN = /(?<![A-Z])([A-Z]{2})\s*=\s*(\d+(?:[.,]\d+)?)\s*(?:cm|dm|mm|m)?(?!\p{L})/gu;

type Taken = { name: string; a: string; b: string; ray: boolean };

function splitList(blob: string): string[] {
  return blob.split(/\s*,\s*|\s+và\s+/u).map((s) => s.trim()).filter(Boolean);
}
function normName(n: string): string {
  return n.replace('′', "'");
}
function num(s: string): number {
  return Number(s.replace(',', '.'));
}

function takenPoints(text: string): Taken[] {
  const out: Taken[] = [];
  const d = TREN_LAY_DISTRIB.exec(text);
  if (d) {
    const segs = splitList(d[2]);
    const names = splitList(d[3]).map(normName);
    if (segs.length >= 2 && segs.length === names.length) {
      const ray = d[1].startsWith('tia');
      segs.forEach((s, i) => out.push({ name: names[i], a: s[0], b: s[1], ray }));
      return out;
    }
  }
  for (const m of text.matchAll(TREN_LAY)) {
    out.push({ name: normName(m[3]), a: m[2][0], b: m[2][1], ray: m[1].startsWith('tia') });
  }
  for (const m of text.matchAll(LAY_TREN)) {
    out.push({ name: normName(m[1]), a: m[3][0], b: m[3][1], ray: m[2].startsWith('tia') });
  }
  return out;
}

/** Vế "XP"/"PX" của điểm P: trả mốc X (phải là đầu mút cạnh). */
function anchorOf(term: string, t: Taken): string | null {
  if (term.length !== 2 || !term.includes(t.name)) return null;
  const other = term[0] === t.name ? term[1] : term[0];
  // Tia XY chỉ đo từ gốc X; cạnh đo được từ cả hai đầu.
  if (other === t.a) return t.a;
  if (!t.ray && other === t.b) return t.b;
  return null;
}

export const pointOnSideAtLengthRule: LanguageRule = {
  id: 'pointOnSideAtLength',
  // TRÊN onSegmentPoint (62): điểm này có điều kiện độ dài — định nghĩa chính xác
  // phải thắng định nghĩa "điểm tự do trên cạnh" (addPoint first-wins theo priority).
  priority: 64,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    const given = new Map<string, number>();
    for (const m of ctx.problem.matchAll(GIVEN_LEN)) {
      const v = num(m[2]);
      if (v > 0) {
        given.set(m[1], v);
        given.set(m[1][1] + m[1][0], v);
      }
    }

    for (const c of ctx.clauses) {
      if (!PREFILTER.test(c.text)) continue;
      const taken = takenPoints(c.text.split(/sao\s+cho/u)[0]);
      if (taken.length === 0) continue;
      const chainM = CHAIN.exec(c.text);
      if (!chainM) continue;
      const terms = chainM[1].split(/\s*=\s*/u).map((t) => t.trim());
      const names = new Set(taken.map((t) => t.name));
      if (taken.some((t) => new Set([t.a, t.b, t.name]).size !== 3)) continue;

      // Vế của từng điểm mới + mốc đo.
      const plan: { t: Taken; anchor: string }[] = [];
      let ok = true;
      for (const t of taken) {
        const term = terms.find((x) => anchorOf(x, t));
        if (!term) { ok = false; break; }
        plan.push({ t, anchor: anchorOf(term, t)! });
      }
      if (!ok) continue;

      // Độ dài chuẩn: vế KHÔNG dính điểm mới nào.
      const indep = terms.find((x) => ![...x].some((ch) => names.has(ch)));
      let distance: Record<string, unknown> | null = null;
      let firstFree = false;
      if (indep && /^[A-Z]{2}$/u.test(indep)) {
        distance = { kind: 'segmentLength', p1: indep[0], p2: indep[1] };
      } else if (indep) {
        // Số đo: chỉ dựng được khi đề cho độ dài CHÍNH cạnh/tia chứa điểm (quy tỉ lệ).
        const v = num(indep.replace(/[^\d.,]/gu, ''));
        const p = plan[0];
        const len = given.get(p.t.a + p.t.b);
        if (taken.length !== 1 || !len || !(v > 0) || (!p.t.ray && v >= len)) continue;
        const [p1, p2] = [p.t.a, p.t.b];
        distance = { kind: 'segmentLength', p1, p2, scale: v / len };
      } else {
        firstFree = true;
      }

      const intents = [];
      for (let i = 0; i < plan.length; i++) {
        const { t, anchor } = plan[i];
        const other = anchor === t.a ? t.b : t.a;
        if (firstFree && i === 0) {
          // Điểm tự do trên CẠNH (tia: không có đoạn giới hạn → bỏ, escalate).
          if (t.ray) { ok = false; break; }
          intents.push(addPoint(t.name, { kind: 'onSegment', of: t.a + t.b }));
          continue;
        }
        const d = firstFree
          ? { kind: 'segmentLength', p1: plan[0].anchor, p2: plan[0].t.name }
          : distance;
        intents.push(addPoint(t.name, { kind: 'pointAtDistance', from: anchor, through: other, distance: d, origin: 'from' }));
      }
      if (!ok || intents.length === 0) continue;
      out.push({ ruleId: 'pointOnSideAtLength', clauseIds: [c.id], intents });
    }
    return out;
  },
};
