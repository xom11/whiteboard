// src/stamps/geometry-2d/ai/rules/quad.ts
//
// Tứ giác / đa giác 4 đỉnh: hình vuông, chữ nhật, bình hành, thoi, thang
// (cân/vuông/thường), tứ giác chung. Mỗi loại trích 4 ký tự HOA liền sau tên
// hình → draw-shape với shape + variant tương ứng.
import type { LanguageRule, RuleMatch } from './_types';
import { drawShape } from './_shared';

// LƯU Ý: \b của JS dựa trên ASCII word-char nên KHÔNG khớp quanh ký tự Việt
// ("đ","ề","ạ"…). Dùng lookaround \p{L} (cờ 'u') ở prefilter để chặn biên từ.
// 4 đỉnh = ĐÚNG 4 ký tự HOA liền nhau (vd "ABCD") neo ngay sau tên hình; neo
// biên cuối (?![A-Z]) để 5+ đỉnh ("ABCDE") KHÔNG match → escalate qua guard.
const QUAD = '([A-Z])([A-Z])([A-Z])([A-Z])(?![A-Z])';

// Mỗi entry: regex tên hình (đã neo trước 4 đỉnh) → shape + variant.
// CỜ 'g' để matchAll quét MỌI khai báo hình trong cùng một clause (vd "hình
// bình hành ABCD và hình chữ nhật EFGH" → 2 shape, theo thứ tự TEXT).
// Thứ tự QUAN TRỌNG: loại cụ thể (hình thang cân/vuông) phải đứng TRƯỚC loại
// chung (hình thang), và mọi "hình ..." phải đứng trước "tứ giác" chung — vì
// engine consume vùng text đã match nên loại cụ thể giành quyền trước.
interface QuadKind {
  name: RegExp;
  shape: string;
  variant: string;
}

const KINDS: QuadKind[] = [
  // hình thang cân / vuông (modifier TRƯỚC đỉnh) — phải match trước thang chung
  {
    name: new RegExp('hình\\s+thang\\s+cân\\s+' + QUAD, 'gu'),
    shape: 'trapezoid',
    variant: 'isoceles',
  },
  {
    name: new RegExp('hình\\s+thang\\s+vuông\\s+' + QUAD, 'gu'),
    shape: 'trapezoid',
    variant: 'right',
  },
  // hình thang chung — sau đó dò modifier 'vuông'/'cân' đứng SAU đỉnh
  // ("hình thang ABCD vuông tại A" → right; "...cân" → isoceles).
  {
    name: new RegExp('hình\\s+thang\\s+' + QUAD, 'gu'),
    shape: 'trapezoid',
    variant: 'general',
  },
  {
    name: new RegExp('hình\\s+vuông\\s+' + QUAD, 'gu'),
    shape: 'square',
    variant: 'standard',
  },
  {
    name: new RegExp('hình\\s+chữ\\s+nhật\\s+' + QUAD, 'gu'),
    shape: 'rectangle',
    variant: 'wide',
  },
  {
    name: new RegExp('hình\\s+bình\\s+hành\\s+' + QUAD, 'gu'),
    shape: 'parallelogram',
    variant: 'standard',
  },
  {
    name: new RegExp('hình\\s+thoi\\s+' + QUAD, 'gu'),
    shape: 'rhombus',
    variant: 'standard',
  },
  {
    name: new RegExp('tứ\\s+giác\\s+' + QUAD, 'gu'),
    shape: 'quadrilateral',
    variant: 'any',
  },
];

// Prefilter toàn đề: bất kỳ tên hình 4 đỉnh nào.
const PREFILTER =
  /hình\s+(?:vuông|chữ\s+nhật|bình\s+hành|thoi|thang)|tứ\s+giác/u;

// "hình thang ABCD vuông tại A" / "...cân ..." — modifier đứng SAU đỉnh, ngay
// sau cụm 4 đỉnh (cho phép xen khoảng trắng). Cờ 'u' bắt buộc cho ký tự Việt.
const RIGHT_AFTER = /vuông(?!\p{L})/u;
const ISO_AFTER = /(?<!\p{L})cân(?!\p{L})/u;
// Biên cắt tail: KHÔNG cho modifier "vuông"/"cân" của hình SAU ("…và hình vuông
// EFGH") bị gán nhầm cho hình thang đứng trước → dừng tail ở khai báo hình kế.
const NEXT_SHAPE = /hình\s|tứ\s+giác/u;

interface Hit {
  index: number;
  shape: string;
  variant: string;
  labels: string[];
  /** offset ngay sau cụm 4 đỉnh, để dò modifier hậu vị cho hình thang chung. */
  afterEnd: number;
}

/**
 * Quét MỌI khai báo hình trong một clause. Mỗi vị trí ký tự chỉ thuộc một kind
 * (kind cụ thể giành trước nhờ thứ tự KINDS). Trả về danh sách hit đã sắp theo
 * vị trí TEXT để emit đúng thứ tự xuất hiện trong đề.
 */
function scanClause(text: string): Hit[] {
  const claimed: Hit[] = [];
  const taken: Array<[number, number]> = []; // vùng [start,end) đã thuộc kind trước

  const overlaps = (start: number, end: number) =>
    taken.some(([s, e]) => start < e && end > s);

  for (const k of KINDS) {
    k.name.lastIndex = 0;
    for (const m of text.matchAll(k.name)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (overlaps(start, end)) continue; // đã bị kind cụ thể hơn chiếm
      taken.push([start, end]);

      let variant = k.variant;
      // Hình thang chung: dò modifier hậu vị ngay sau 4 đỉnh ("ABCD vuông tại A").
      // Cắt tail tại khai báo hình kế tiếp để không nuốt modifier của hình sau.
      if (k.shape === 'trapezoid' && k.variant === 'general') {
        let tail = text.slice(end, end + 24);
        const next = NEXT_SHAPE.exec(tail);
        if (next) tail = tail.slice(0, next.index);
        if (RIGHT_AFTER.test(tail)) variant = 'right';
        else if (ISO_AFTER.test(tail)) variant = 'isoceles';
      }
      claimed.push({
        index: start,
        shape: k.shape,
        variant,
        labels: [m[1], m[2], m[3], m[4]],
        afterEnd: end,
      });
    }
  }

  claimed.sort((a, b) => a.index - b.index);
  return claimed;
}

/**
 * Tứ giác / đa giác 4 đỉnh → draw-shape. Duyệt từng clause, quét EMIT-ALL mọi
 * khai báo hình (theo thứ tự text). KHÔNG trích được ĐÚNG 4 đỉnh HOA liền (vd
 * "ABCDE" 5 đỉnh) → bỏ qua khai báo đó (escalate AI qua guard).
 */
export const quadRule: LanguageRule = {
  id: 'quad',
  priority: 100,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      for (const hit of scanClause(c.text)) {
        out.push({
          ruleId: 'quad',
          clauseIds: [c.id],
          intents: [drawShape(hit.shape, hit.labels, hit.variant)],
        });
      }
    }
    return out;
  },
};
