// src/stamps/geometry-2d/ai/rules/ratioPointOnSegment.ts
//
// Điểm chia ĐOẠN THẲNG theo TỈ SỐ đề cho (dạng trọng tâm lớp 7):
//
//   "Trên cạnh BC lấy điểm G sao cho BG = 2GC"            → BG/BC = 2/3
//   "điểm M thuộc đoạn thẳng BC sao cho BM = 2MC"          → BM/BC = 2/3
//   "Gọi G là điểm trên đoạn AM sao cho AG = 2/3 AM"       → AG/AM = 2/3
//   "trên đoạn thẳng AD lấy hai điểm E, G sao cho AE = EG = GD" → chia ba
//
// Dựng CHÍNH XÁC bằng pointAtDistance từ đầu mút X về phía Y với độ dài
// = t·XY (segmentLength scale t, origin 'from') — không phụ thuộc chiều p1/p2 của
// segment có sẵn.
//
// Thà thiếu còn hơn sai: chỉ nhận CẠNH/ĐOẠN (trên TIA thì "XP = 2PY" có hai vị
// trí), đẳng thức phải chứa đúng các điểm mới + hai đầu mút, t ∈ (0,1).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, connect } from './_shared';

// Đoạn chứa điểm: "(trên|thuộc) (cạnh|đoạn (thẳng)?) XY" (có thể đứng đầu câu "Trên").
const SEG = /(?:[Tt]rên|thuộc|nằm\s+trên)\s+(?:cạnh|đoạn\s*thẳng|đoạn)\s+([A-Z])([A-Z])(?![\p{L}\d'′])/u;
// Phần đẳng thức sau "sao cho".
const SAO_CHO = /sao\s+cho\s+([^,;.]+)/u;

const TOK = String.raw`([A-Z])([A-Z])(?![\p{L}\d'′])`;
// "XP = k PY" | "XP = k/m PY" | "XP = k.PY" | "XP = PY/k"
const RATIO = new RegExp(
  String.raw`^\s*` + TOK + String.raw`\s*=\s*(?:(\d+)(?:\s*\/\s*(\d+))?\s*[.·]?\s*)?` + TOK + String.raw`(?:\s*\/\s*(\d+))?\s*$`,
  'u',
);
const CHAIN = new RegExp(String.raw`^\s*[A-Z][A-Z](?:\s*=\s*[A-Z][A-Z])+\s*$`, 'u');

function place(x: string, y: string, p: string, t: number): IntentT {
  return addPoint(p, {
    kind: 'pointAtDistance',
    from: x,
    through: y,
    origin: 'from',
    distance: { kind: 'segmentLength', p1: x, p2: y, scale: t },
  });
}

const same = (a: string, b: string, u: string, v: string) => (a === u && b === v) || (a === v && b === u);

/** Trả {điểm → t (tính từ X)} hoặc null nếu không chắc. */
export function giaiTiSo(x: string, y: string, eq: string): Map<string, number> | null {
  if (CHAIN.test(eq)) {
    const toks = eq.split('=').map((s) => s.trim());
    // chuỗi viết từ phía Y ("GD = EG = AE") → giải từ Y rồi đổi mốc.
    if (!toks[0].includes(x) && toks[0].includes(y)) {
      const r = giaiTiSo(y, x, eq);
      return r && new Map([...r].map(([k, v]) => [k, 1 - v]));
    }
    // đường đi X → … → Y qua các token liền nhau
    const path = [x];
    for (const tk of toks) {
      const last = path[path.length - 1];
      if (tk[0] === last) path.push(tk[1]);
      else if (tk[1] === last) path.push(tk[0]);
      else return null;
    }
    if (path[path.length - 1] !== y) return null;
    const inner = path.slice(1, -1);
    if (inner.length === 0 || new Set(path).size !== path.length) return null;
    const n = toks.length;
    return new Map(inner.map((p, i) => [p, (i + 1) / n]));
  }
  const m = RATIO.exec(eq);
  if (!m) return null;
  const [, l1, l2, num, den, r1, r2, div] = m;
  let c = num ? Number(num) / (den ? Number(den) : 1) : 1;
  if (div) c = c / Number(div);
  if (!(c > 0)) return null;
  const pts = new Set([l1, l2, r1, r2]);
  pts.delete(x);
  pts.delete(y);
  if (pts.size !== 1) return null;
  const p = [...pts][0];
  let t: number | null = null;
  if (same(l1, l2, x, p) && same(r1, r2, p, y)) t = c / (1 + c);
  else if (same(l1, l2, p, y) && same(r1, r2, x, p)) t = 1 / (1 + c);
  else if (same(l1, l2, x, p) && same(r1, r2, x, y)) t = c;
  else if (same(l1, l2, p, y) && same(r1, r2, x, y)) t = 1 - c;
  if (t === null || !(t > 0 && t < 1)) return null;
  return new Map([[p, t]]);
}

export const ratioPointOnSegmentRule: LanguageRule = {
  id: 'ratioPointOnSegment',
  priority: 57,
  languages: ['vi'],
  patterns: [/sao\s+cho\s+[A-Z][A-Z]\s*=\s*(?:\d|[A-Z][A-Z])/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const s = SEG.exec(c.text);
      const e = SAO_CHO.exec(c.text);
      if (!s || !e || e.index < s.index) continue;
      const [x, y] = [s[1], s[2]];
      const sol = giaiTiSo(x, y, e[1].replace(/\s+và\s+.*$/u, ''));
      if (!sol) continue;
      // Điểm được đặt phải được NÊU trong đoạn trước "sao cho" (là điểm mới của câu).
      const truoc = c.text.slice(0, e.index);
      if (![...sol.keys()].every((p) => new RegExp(String.raw`(?<![A-Z])${p}(?![\p{L}\d'′])`, 'u').test(truoc))) continue;
      const intents: IntentT[] = [];
      for (const [p, t] of sol) intents.push(place(x, y, p, t));
      intents.push(connect(x, y, 'segment'));
      out.push({ ruleId: 'ratioPointOnSegment', clauseIds: [c.id], intents });
    }
    return out;
  },
};
