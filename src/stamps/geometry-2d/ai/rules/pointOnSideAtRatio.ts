// src/stamps/geometry-2d/ai/rules/pointOnSideAtRatio.ts
//
// Điểm trên cạnh/đoạn/đường chéo chia theo TỈ SỐ — dạng lõi của định lý Thalès,
// đường trung bình, tam giác đồng dạng (lớp 8):
//   "Trên cạnh AB lấy điểm D sao cho AD = 2DB"            → AD/AB = 2/3
//   "điểm D thuộc cạnh AB sao cho AD = 1/3 AB"             → 1/3
//   "Trên đường chéo AC lấy điểm E sao cho AC = 3AE"       → 1/3
//   "M thuộc cạnh BC sao cho BM/MC = 2/3" / "BM : MC = 2 : 3"
//   "Trên cạnh AC lấy các điểm D, E sao cho AD = DE = EC"  → 1/3, 2/3
//   "Trên các cạnh AB, AC lấy lần lượt M, N sao cho AM = 2MB, AN = 2NC"
//   "Điểm D nằm trên cạnh BC sao cho BD = 2 cm" (BC = 8 cm đề cho) → 1/4
//
// Mỗi điểm P trên đoạn XY có ẩn t = XP/XY; XP = t, PY = 1 − t, XY = 1 (theo thang
// |XY|). Mỗi đẳng thức tỉ lệ là một phương trình tuyến tính của các t → giải; điểm
// cùng một đoạn được giả thiết đúng thứ tự nêu (D trước E). Nghiệm phải nằm TRONG
// (0; 1) và đúng thứ tự, không thì bỏ (escalate) — không đặt "đại khái".
//
// Dựng CHÍNH XÁC: pointAtDistance{from X, through Y, distance = |XY|·t, origin
// 'from'} — kéo đỉnh, điểm vẫn chia đúng tỉ số (khác glider onSegment t cố định).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const PREFILTER = /sao\s+cho|thoả\s+mãn|thỏa\s+mãn/u;

const PT = "([A-Z](?:['′])?)(?![A-Z'′])";
const SEG_KIND = String.raw`(?:cạnh(?:\s+bên|\s+đáy|\s+huyền)?|đáy(?:\s+lớn|\s+nhỏ)?|đoạn(?:\s+thẳng)?|đường\s+chéo)`;
const SEG = '([A-Z]{2})(?![A-Z])';

// Dạng một điểm — một đoạn (tên điểm nhóm 1/2, đoạn nhóm kia).
const DANG_DON: { re: RegExp; p: number; s: number }[] = [
  // "Trên cạnh AB lấy (một)? (điểm)? D"
  { re: new RegExp(String.raw`[Tt]rên\s+${SEG_KIND}\s+${SEG}(?:\s+của\s+[^,.;]{0,30}?)?\s*,?\s*lấy\s+(?:một\s+)?(?:điểm\s+)?${PT}`, 'gu'), p: 2, s: 1 },
  // "Lấy (điểm)? D trên/thuộc cạnh AB"
  { re: new RegExp(String.raw`[Ll]ấy\s+(?:một\s+)?(?:điểm\s+)?${PT}\s+(?:trên|thuộc)\s+(?:${SEG_KIND}\s+)?${SEG}`, 'gu'), p: 1, s: 2 },
  // "(Điểm|Gọi)? D (là (một)? điểm)? (nằm)? trên/thuộc cạnh AB"
  { re: new RegExp(String.raw`(?:[Đđ]iểm\s+|[Gg]ọi\s+)?${PT}\s+(?:là\s+(?:một\s+)?điểm\s+)?(?:nằm\s+)?(?:trên|thuộc)\s+(?:${SEG_KIND}\s+)?${SEG}`, 'gu'), p: 1, s: 2 },
  // "D ∈ AB" / "(D ∈ cạnh AB)"
  { re: new RegExp(String.raw`${PT}\s*∈\s*(?:${SEG_KIND}\s+)?${SEG}`, 'gu'), p: 1, s: 2 },
];
// "Trên cạnh AC lấy (các|hai)? điểm D, E" — nhiều điểm cùng đoạn, theo thứ tự nêu.
const NHIEU_CUNG_DOAN = new RegExp(
  String.raw`[Tt]rên\s+(?:${SEG_KIND}\s+)?${SEG}\s*,?\s*lấy\s+(?:các\s+|hai\s+|ba\s+)?(?:điểm\s+)?((?:[A-Z]\s*(?:,|và)\s*)+[A-Z])(?![A-Z])`,
  'gu',
);
// "Lấy (các|hai)? điểm D và E trên cạnh AB" — nhiều điểm, tên đứng trước.
const NHIEU_TEN_TRUOC = new RegExp(
  String.raw`[Ll]ấy\s+(?:các\s+|hai\s+|ba\s+)?(?:điểm\s+)?((?:[A-Z]\s*(?:,|và)\s*)+[A-Z])(?![A-Z])\s+(?:trên|thuộc)\s+(?:${SEG_KIND}\s+)?${SEG}`,
  'gu',
);
// "Trên (các)? cạnh AB, AC lấy (lần lượt|theo thứ tự)? (các)? (điểm)? M, N"
const PHAN_PHOI = new RegExp(
  String.raw`[Tt]rên\s+(?:các\s+|hai\s+)?(?:${SEG_KIND}\s+)?((?:[A-Z]{2}\s*(?:,|và)\s*)+[A-Z]{2})(?![A-Z])\s*,?\s*lấy\s+(?:(?:theo\s+)?thứ\s+tự\s+|lần\s*lượt\s+)?(?:các\s+|hai\s+)?(?:điểm\s+)?((?:[A-Z]\s*(?:,|và)\s*)+[A-Z])(?![A-Z])`,
  'gu',
);

// Điểm trên TIA XY (có thể vượt Y): chỉ nhận quan hệ giữa XP và XY ("AP = 2AB",
// "AB = 3AP") — dạng PY mơ hồ (P trước hay sau Y) thì bỏ.
const TIA_DON = [
  new RegExp(String.raw`[Ll]ấy\s+(?:một\s+)?(?:điểm\s+)?${PT}\s+(?:trên|thuộc)\s+tia\s+${SEG}\s*,?\s*sao\s+cho\s+([^,.;]+)`, 'u'),
  new RegExp(String.raw`[Tt]rên\s+tia\s+${SEG}\s*,?\s*lấy\s+(?:một\s+)?(?:điểm\s+)?${PT}\s*,?\s*sao\s+cho\s+([^,.;]+)`, 'u'),
];
const HE_SO = String.raw`(?:(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?))?`;

function tiaTiSo(p: string, x: string, y: string, rel: string): number | undefined {
  const m = new RegExp(String.raw`^\s*${HE_SO}\s*([A-Z]{2})\s*=\s*${HE_SO}\s*([A-Z]{2})\s*$`, 'u').exec(rel);
  if (!m) return undefined;
  const he = (a?: string, b?: string, c?: string) => (a ? so(a) / so(b!) : c ? so(c) : 1);
  const h1 = he(m[1], m[2], m[3]);
  const h2 = he(m[5], m[6], m[7]);
  const k1 = key(m[4][0], m[4][1]);
  const k2 = key(m[8][0], m[8][1]);
  const xp = key(x, p);
  const xy = key(x, y);
  // h1·S1 = h2·S2 ; t = XP/XY
  if (k1 === xp && k2 === xy) return h2 / h1;
  if (k1 === xy && k2 === xp) return h1 / h2;
  return undefined;
}

// --- Biểu thức độ dài --------------------------------------------------------

const NUM = String.raw`\d+(?:[.,]\d+)?`;
// Vế: hệ số (2 | 1/3 | ½)? + đoạn + (/ số)?   hoặc   số (cm)?
const VE = String.raw`(?:(?:${NUM}\s*\/\s*${NUM}|${NUM}|½)\s*)?[A-Z]{2}(?![A-Z])(?:\s*\/\s*${NUM}(?![\d]))?|${NUM}\s*(?:cm|dm|mm|m)?(?![\p{L}\d])`;
// Lookbehind: không đứng sau chữ/số/phép toán ("2,5AB" là số thập phân) — dấu phẩy
// liệt kê "AM = 2MB, AN = 2NC" thì được.
const CHUOI = new RegExp(String.raw`(?<!(?:[A-Z\d/:+\-·²]|\d[.,])\s*)(?:${VE})(?:\s*=\s*(?:${VE}))+`, 'gu');
// Tỉ số: "BM/MC = 2/3", "BM : MC = 2 : 3", "AM/AB = 1/3", "AD/DB = 2"
const TI_SO = new RegExp(
  String.raw`(?<![A-Z])([A-Z]{2})\s*(?:\/|:)\s*([A-Z]{2})(?![A-Z])\s*=\s*(${NUM})(?:\s*(?:\/|:)\s*(${NUM}))?(?![\d/:]|\s*[A-Z])`,
  'gu',
);

function so(s: string): number {
  return Number(s.replace(',', '.'));
}

/** Dạng tuyến tính: c0 + Σ c[v]·t_v, tính theo thang |base|. */
type Lin = { base: string; c0: number; c: Map<string, number> };

interface Diem { name: string; x: string; y: string; order: number }

function key(a: string, b: string) {
  return [a, b].sort().join('');
}

/** Độ dài đoạn "UV" dưới dạng tuyến tính theo các điểm mới cùng đoạn gốc. */
function doanLin(uv: string, diem: Map<string, Diem>): Lin | null {
  const [u, v] = [uv[0], uv[1]];
  const pu = diem.get(u);
  const pv = diem.get(v);
  // Vị trí (theo t) của một nhãn trên đoạn gốc XY: X → 0, Y → 1, điểm mới → t.
  const viTri = (n: string, base: Diem): Lin | null => {
    if (n === base.x) return { base: key(base.x, base.y), c0: 0, c: new Map() };
    if (n === base.y) return { base: key(base.x, base.y), c0: 1, c: new Map() };
    const d = diem.get(n);
    if (d && key(d.x, d.y) === key(base.x, base.y)) {
      // cùng đoạn gốc nhưng có thể nêu ngược chiều (YX) — quy về X gốc của base
      if (d.x === base.x) return { base: key(base.x, base.y), c0: 0, c: new Map([[n, 1]]) };
      return { base: key(base.x, base.y), c0: 1, c: new Map([[n, -1]]) };
    }
    return null;
  };
  const base = pu ?? pv;
  if (!base) {
    // không dính điểm mới: chỉ nhận chính một đoạn gốc (vd "AB" khi D ∈ AB)
    return null;
  }
  const a = viTri(u, base);
  const b = viTri(v, base);
  if (!a || !b) return null;
  // |pos(v) − pos(u)| với dấu theo thứ tự giả định: điểm nêu trước gần X hơn.
  const hieu: Lin = { base: a.base, c0: b.c0 - a.c0, c: new Map(b.c) };
  for (const [n, k] of a.c) hieu.c.set(n, (hieu.c.get(n) ?? 0) - k);
  // Độ dài = |hiệu|; dấu lấy theo thứ tự GIẢ ĐỊNH (các điểm cùng đoạn rải đều theo
  // thứ tự nêu). Nghiệm sai thứ tự bị loại ở bước kiểm sau khi giải.
  const cung = [...diem.values()].filter((d) => key(d.x, d.y) === a.base);
  const gia = (n: string) => {
    const d = diem.get(n)!;
    const t = (cung.indexOf(d) + 1) / (cung.length + 1);
    return d.x === base.x ? t : 1 - t;
  };
  let val = hieu.c0;
  for (const [n, k] of hieu.c) val += k * gia(n);
  if (val < 0) {
    hieu.c0 = -hieu.c0;
    for (const [n, k] of hieu.c) hieu.c.set(n, -k);
  }
  return hieu;
}

/** Vế → tuyến tính (nhân hệ số), hoặc số đo tuyệt đối. */
function veLin(t: string, diem: Map<string, Diem>, doanGoc: Set<string>): { lin?: Lin; he: number; soDo?: number } | null {
  const s = t.trim();
  let m = /^(?:(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)|(½))?\s*([A-Z]{2})(?:\s*\/\s*(\d+(?:[.,]\d+)?))?$/u.exec(s);
  if (m) {
    let he = 1;
    if (m[1]) he = so(m[1]) / so(m[2]);
    else if (m[3]) he = so(m[3]);
    else if (m[4]) he = 0.5;
    if (m[6]) he /= so(m[6]);
    if (!(he > 0)) return null;
    const uv = m[5];
    if (doanGoc.has(key(uv[0], uv[1]))) return { lin: { base: key(uv[0], uv[1]), c0: 1, c: new Map() }, he };
    const lin = doanLin(uv, diem);
    return lin ? { lin, he } : null;
  }
  m = /^(\d+(?:[.,]\d+)?)\s*(?:cm|dm|mm|m)?$/u.exec(s);
  if (m && so(m[1]) > 0) return { he: 1, soDo: so(m[1]) };
  return null;
}

/** Giải hệ tuyến tính nhỏ (Gauss) — trả nghiệm khi mọi ẩn xác định duy nhất. */
function giai(eqs: { c: Map<string, number>; rhs: number }[], vars: string[]): Map<string, number> | null {
  const n = vars.length;
  const rows = eqs.map((e) => [...vars.map((v) => e.c.get(v) ?? 0), e.rhs]);
  let r = 0;
  const pivotCol: number[] = [];
  for (let col = 0; col < n && r < rows.length; col++) {
    let best = r;
    for (let i = r + 1; i < rows.length; i++) if (Math.abs(rows[i][col]) > Math.abs(rows[best][col])) best = i;
    if (Math.abs(rows[best][col]) < 1e-12) continue;
    [rows[r], rows[best]] = [rows[best], rows[r]];
    for (let i = 0; i < rows.length; i++) {
      if (i === r) continue;
      const f = rows[i][col] / rows[r][col];
      for (let j = col; j <= n; j++) rows[i][j] -= f * rows[r][j];
    }
    pivotCol.push(col);
    r++;
  }
  // Mâu thuẫn: hàng 0 = khác 0
  for (let i = r; i < rows.length; i++) if (Math.abs(rows[i][n]) > 1e-9) return null;
  if (pivotCol.length !== n) return null;
  const out = new Map<string, number>();
  pivotCol.forEach((col, i) => out.set(vars[col], rows[i][n] / rows[i][col]));
  return out;
}

function tachDs(blob: string): string[] {
  return blob.split(/\s*,\s*|\s+và\s+/u).map((s) => s.trim()).filter(Boolean);
}

function diemTrongMenhDe(text: string): Diem[] {
  const out: Diem[] = [];
  const them = (name: string, seg: string) => {
    const n = name.replace('′', "'");
    if (n.length !== 1 || seg.includes(n) || seg[0] === seg[1]) return;
    if (out.some((d) => d.name === n)) return;
    out.push({ name: n, x: seg[0], y: seg[1], order: out.length });
  };
  for (const m of text.matchAll(PHAN_PHOI)) {
    const segs = tachDs(m[1]);
    const names = tachDs(m[2]);
    if (segs.length >= 2 && segs.length === names.length) segs.forEach((s, i) => them(names[i], s));
  }
  for (const m of text.matchAll(NHIEU_TEN_TRUOC)) {
    for (const n of tachDs(m[1])) them(n, m[2]);
  }
  for (const m of text.matchAll(NHIEU_CUNG_DOAN)) {
    for (const n of tachDs(m[2])) them(n, m[1]);
  }
  for (const { re, p, s } of DANG_DON) for (const m of text.matchAll(re)) them(m[p], m[s]);
  return out;
}

// Độ dài đề cho: "BC = 8 cm" (để quy số đo cm về tỉ lệ).
const DO_DAI = /(?<![A-Z])([A-Z]{2})\s*=\s*(\d+(?:[.,]\d+)?)\s*(?:cm|dm|mm|m)?(?![\p{L}\d/])/gu;

export const pointOnSideAtRatioRule: LanguageRule = {
  id: 'pointOnSideAtRatio',
  // TRÊN pointOnSideAtLength (64) và onSegmentPoint (62): điều kiện tỉ số là định
  // nghĩa chính xác — thắng "điểm tự do trên cạnh" (addPoint first-wins theo priority).
  priority: 65,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    const doDai = new Map<string, number>();
    for (const m of ctx.problem.matchAll(DO_DAI)) doDai.set(key(m[1][0], m[1][1]), so(m[2]));

    for (const c of ctx.clauses) {
      const idx = c.text.search(PREFILTER);
      if (idx < 0) continue;
      const t0 = TIA_DON[0].exec(c.text);
      const tia = t0 ?? TIA_DON[1].exec(c.text);
      if (tia) {
        const [p, seg, rel] = t0 ? [tia[1], tia[2], tia[3]] : [tia[2], tia[1], tia[3]];
        const t = !seg.includes(p) && seg[0] !== seg[1] ? tiaTiSo(p, seg[0], seg[1], rel) : undefined;
        if (t !== undefined && t > 0 && Math.abs(t - 1) > 1e-9) {
          out.push({
            ruleId: 'pointOnSideAtRatio',
            clauseIds: [c.id],
            intents: [addPoint(p, {
              kind: 'pointAtDistance', from: seg[0], through: seg[1],
              distance: { kind: 'segmentLength', p1: seg[0], p2: seg[1], scale: t }, origin: 'from',
            })],
          });
        }
        continue;
      }
      const truoc = c.text.slice(0, idx);
      const sau = c.text.slice(idx);
      const ds = diemTrongMenhDe(truoc);
      if (ds.length === 0) continue;
      const diem = new Map(ds.map((d) => [d.name, d]));
      const doanGoc = new Set(ds.map((d) => key(d.x, d.y)));

      // Phương trình: Σ c·t = rhs (mỗi phương trình cùng MỘT đoạn gốc).
      const eqs: { c: Map<string, number>; rhs: number }[] = [];
      let hong = false;
      const themPt = (a: { lin: Lin; he: number }, b: { lin?: Lin; he: number; soDo?: number }) => {
        // a.he·a.lin = b.he·b.lin   hoặc   a.he·a.lin·|base| = soDo
        const cc = new Map<string, number>();
        let rhs = 0;
        for (const [v, k] of a.lin.c) cc.set(v, (cc.get(v) ?? 0) + a.he * k);
        rhs -= a.he * a.lin.c0;
        if (b.lin) {
          if (b.lin.base !== a.lin.base) { hong = true; return; }
          for (const [v, k] of b.lin.c) cc.set(v, (cc.get(v) ?? 0) - b.he * k);
          rhs += b.he * b.lin.c0;
        } else {
          const L = doDai.get(a.lin.base);
          if (!L) { hong = true; return; }
          rhs += b.soDo! / L;
        }
        if ([...cc.values()].every((k) => Math.abs(k) < 1e-12)) return; // hằng đẳng thức (AB = AB)
        eqs.push({ c: cc, rhs });
      };

      for (const m of sau.matchAll(CHUOI)) {
        const end = (m.index ?? 0) + m[0].length;
        if (/^\s*(?:[.·×*]\s*[A-Z]{2}(?![\p{L}])|[+\-²:]|\/\s*[A-Z\d])/u.test(sau.slice(end))) continue;
        const ves = m[0].split('=').map((t) => veLin(t, diem, doanGoc));
        if (ves.some((v) => !v)) {
          // Chuỗi nói về điểm mới mà không quy được về tỉ số (AM = BC…) → không đoán.
          if ([...m[0]].some((ch) => diem.has(ch))) hong = true;
          continue;
        }
        const vs = ves as { lin?: Lin; he: number; soDo?: number }[];
        if (!vs.some((v) => v.lin && v.lin.c.size > 0)) continue; // không dính điểm mới
        const goc = vs.find((v) => v.lin)!;
        for (const v of vs) if (v !== goc) themPt(goc as { lin: Lin; he: number }, v);
      }
      for (const m of sau.matchAll(TI_SO)) {
        const p = veLin(m[1], diem, doanGoc);
        const q = veLin(m[2], diem, doanGoc);
        if (!p?.lin || !q?.lin) continue;
        const [a, b] = [so(m[3]), m[4] ? so(m[4]) : 1];
        if (!(a > 0 && b > 0)) continue;
        // p/q = a/b ⇔ b·p = a·q
        themPt({ lin: p.lin, he: b }, { lin: q.lin, he: a });
      }
      if (hong || eqs.length === 0) continue;

      const vars = [...new Set(eqs.flatMap((e) => [...e.c.keys()]))];
      const t = giai(eqs, vars);
      if (!t) continue;
      // Trong (0;1) + đúng thứ tự nêu trên cùng đoạn.
      let ok = true;
      for (const [n, v] of t) if (!(v > 1e-9 && v < 1 - 1e-9)) ok = false;
      for (const d1 of ds) for (const d2 of ds) {
        if (d1.order < d2.order && key(d1.x, d1.y) === key(d2.x, d2.y) && t.has(d1.name) && t.has(d2.name)) {
          const p1 = d1.x === d2.x ? t.get(d1.name)! : 1 - t.get(d1.name)!;
          if (!(p1 < t.get(d2.name)! - 1e-9)) ok = false;
        }
      }
      if (!ok) continue;

      // Điểm không có phương trình nào = điểm TỰ DO trên cạnh (đề không ràng buộc).
      // Nhưng nếu nó xuất hiện trong phần "sao cho" (quan hệ chưa đọc được) → bỏ cả mệnh đề.
      if (ds.some((d) => !t.has(d.name) && sau.includes(d.name))) continue;
      const intents = ds.map((d) => !t.has(d.name)
        ? addPoint(d.name, { kind: 'onSegment', of: d.x + d.y })
        : addPoint(d.name, {
          kind: 'pointAtDistance',
          from: d.x,
          through: d.y,
          distance: { kind: 'segmentLength', p1: d.x, p2: d.y, scale: t.get(d.name)! },
          origin: 'from',
        }));
      if (intents.length === 0) continue;
      out.push({ ruleId: 'pointOnSideAtRatio', clauseIds: [c.id], intents });
    }
    return out;
  },
};
