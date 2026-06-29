// src/stamps/geometry-2d/ai/rules/quad.ts
//
// Tứ giác / đa giác 4 đỉnh: hình vuông, chữ nhật, bình hành, thoi, thang
// (cân/vuông/thường), tứ giác chung. Mỗi loại trích 4 ký tự HOA liền sau tên
// hình → draw-shape với shape + variant tương ứng.
import type { LanguageRule, RuleContext, RuleMatch } from './_types';
import { drawShape, drawCircle, addPoint, markShape } from './_shared';

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

// CHỮ HOA ĐẦU CÂU: tên hình ("Hình thang cân ABCD …" / "Tứ giác ABCD …") đứng
// đầu câu (KHÔNG có "Cho" phía trước) viết HOA → chỉ linh hoạt ký tự ĐẦU của cụm
// (`[Hh]ình`, `[Tt]ứ`). TUYỆT ĐỐI KHÔNG cờ 'i' (sẽ phá nhóm [A-Z] bắt nhãn đỉnh).
const KINDS: QuadKind[] = [
  // hình thang cân / vuông (modifier TRƯỚC đỉnh) — phải match trước thang chung
  {
    name: new RegExp('[Hh]ình\\s+thang\\s+cân\\s+' + QUAD, 'gu'),
    shape: 'trapezoid',
    variant: 'isoceles',
  },
  {
    name: new RegExp('[Hh]ình\\s+thang\\s+vuông\\s+' + QUAD, 'gu'),
    shape: 'trapezoid',
    variant: 'right',
  },
  // hình thang chung — sau đó dò modifier 'vuông'/'cân' đứng SAU đỉnh
  // ("hình thang ABCD vuông tại A" → right; "...cân" → isoceles).
  {
    name: new RegExp('[Hh]ình\\s+thang\\s+' + QUAD, 'gu'),
    shape: 'trapezoid',
    variant: 'general',
  },
  {
    name: new RegExp('[Hh]ình\\s+vuông\\s+' + QUAD, 'gu'),
    shape: 'square',
    variant: 'standard',
  },
  {
    name: new RegExp('[Hh]ình\\s+chữ\\s+nhật\\s+' + QUAD, 'gu'),
    shape: 'rectangle',
    variant: 'wide',
  },
  {
    name: new RegExp('[Hh]ình\\s+bình\\s+hành\\s+' + QUAD, 'gu'),
    shape: 'parallelogram',
    variant: 'standard',
  },
  {
    name: new RegExp('[Hh]ình\\s+thoi\\s+' + QUAD, 'gu'),
    shape: 'rhombus',
    variant: 'standard',
  },
  {
    name: new RegExp('[Tt]ứ\\s+giác(?:\\s+lồi)?\\s+' + QUAD, 'gu'),
    shape: 'quadrilateral',
    variant: 'any',
  },

  // === EN names (issue #46 group B) — same shape/variant mapping as VN ========
  // First-letter case flex ([Ss]quare…) — KHÔNG cờ 'i' (sẽ phá [A-Z] nhãn QUAD).
  // Modifier EN đứng TRƯỚC tên ("isosceles trapezoid ABCD") → entry riêng cho
  // isosceles/right trapezoid, đặt TRƯỚC trapezoid chung để giành quyền (overlaps).
  // KHÔNG có post-positional modifier EN trong slice này (chỉ pre-positional).
  {
    name: new RegExp('[Ii]sosceles\\s+(?:[Tt]rapezoid|[Tt]rapezium)\\s+' + QUAD, 'gu'),
    shape: 'trapezoid',
    variant: 'isoceles',
  },
  {
    name: new RegExp('[Rr]ight\\s+(?:[Tt]rapezoid|[Tt]rapezium)\\s+' + QUAD, 'gu'),
    shape: 'trapezoid',
    variant: 'right',
  },
  {
    name: new RegExp('(?:[Tt]rapezoid|[Tt]rapezium)\\s+' + QUAD, 'gu'),
    shape: 'trapezoid',
    variant: 'general',
  },
  {
    name: new RegExp('[Ss]quare\\s+' + QUAD, 'gu'),
    shape: 'square',
    variant: 'standard',
  },
  {
    name: new RegExp('[Rr]ectangle\\s+' + QUAD, 'gu'),
    shape: 'rectangle',
    variant: 'wide',
  },
  {
    name: new RegExp('[Pp]arallelogram\\s+' + QUAD, 'gu'),
    shape: 'parallelogram',
    variant: 'standard',
  },
  {
    name: new RegExp('[Rr]hombus\\s+' + QUAD, 'gu'),
    shape: 'rhombus',
    variant: 'standard',
  },
  {
    name: new RegExp('[Qq]uadrilateral\\s+' + QUAD, 'gu'),
    shape: 'quadrilateral',
    variant: 'any',
  },
];

// Prefilter toàn đề: bất kỳ tên hình 4 đỉnh nào (VN + EN).
const PREFILTER =
  /[Hh]ình\s+(?:vuông|chữ\s+nhật|bình\s+hành|thoi|thang)|[Tt]ứ\s+giác|[Ss]quare|[Rr]ectangle|[Pp]arallelogram|[Rr]hombus|[Tt]rapezoid|[Tt]rapezium|[Qq]uadrilateral/u;

// "hình thang ABCD vuông tại A" / "...cân ..." — modifier đứng SAU đỉnh, ngay
// sau cụm 4 đỉnh (cho phép xen khoảng trắng). Cờ 'u' bắt buộc cho ký tự Việt.
const RIGHT_AFTER = /vuông(?!\p{L})/u;
const ISO_AFTER = /(?<!\p{L})cân(?!\p{L})/u;
// Biên cắt tail: KHÔNG cho modifier "vuông"/"cân" của hình SAU ("…và hình vuông
// EFGH") bị gán nhầm cho hình thang đứng trước → dừng tail ở khai báo hình kế.
const NEXT_SHAPE = /[Hh]ình\s|[Tt]ứ\s+giác/u;

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

// --- Tứ giác nội tiếp đường tròn (cyclic quadrilateral) — issue #46 nhóm C/B --
//
// "Cho tứ giác ABCD nội tiếp đường tròn (O)" hiện chỉ vẽ tứ giác, BỎ đường tròn
// (render coverage-complete nhưng thiếu hình). Bổ sung đường tròn ngoại tiếp đi
// qua đúng 4 đỉnh — đặt 4 đỉnh ĐỒNG VIÊN để circle3 thực sự đi qua cả 4.
//
// EN (nhóm B Tier 2, fix silent-incomplete): detectCyclic nay nhận thêm các dạng
// tiếng Anh — Pattern A "(is/are) inscribed in (a/the) circle (O)", Pattern B
// "circle (O) circumscribes/(is) circumscribed (about/around) ...". Trước đây đề
// EN render quad-ONLY (rớt circle âm thầm); nay parity VN (quad concyclic +
// through3). TRIANGLE_DECL cũng nhận "Triangle ABC" để fail-safe ownedByOthers
// chặn silent-wrong khi tứ giác EN chia đỉnh với tam giác EN.
//
// KIẾN TRÚC single-emitter: quadRule LÀ emitter DUY NHẤT của hình tứ giác. Khi
// phát hiện ngữ cảnh nội tiếp, CHÍNH rule này emit (circle + 4 glider + polygon)
// — KHÔNG dùng draw-shape (vốn tạo đỉnh FREE) cho nhánh nội tiếp.
//
// FIX 2026-06-09 (bug "đỉnh D không trên đường tròn, kéo đường tròn D không theo"):
// trước đây nhánh nội tiếp emit draw-shape (4 đỉnh FREE ở toạ độ đồng viên TĨNH) +
// circle3 qua 3 đỉnh → đỉnh thứ 4 chỉ TÌNH CỜ nằm trên circle, KHÔNG ràng buộc →
// kéo 1 trong 3 đỉnh kia (định nghĩa lại circle3) thì đỉnh 4 ở lại, rời đường tròn.
// NAY: đường tròn centerRadius (tâm O hiện) + 4 đỉnh là glider `onCircle` (theta cố
// định) → TẤT CẢ ràng buộc trên đường tròn; kéo tâm O cả 4 di chuyển theo, luôn
// đồng viên. polygon nối 4 đỉnh qua mark-shape (không tạo coord mới).
//
// 4 đỉnh trên đường tròn bán kính 5 (đồng viên), góc theta cố định cho layout lồi
// A→B→C→D (chiều kim đồng hồ), bảo toàn bố cục cũ.
const CYCLIC_QUAD_COORDS: readonly [number, number][] = [
  [-3, 4],
  [4, 3],
  [3, -4],
  [-4, -3],
];
// Bán kính + góc theta dẫn xuất TỪ toạ độ trên (đồng bộ layout): glider đặt tại
// (cos θ, sin θ)·r quanh tâm → giữ đúng vị trí lồi như bản free cũ.
const CYCLIC_RADIUS = Math.hypot(CYCLIC_QUAD_COORDS[0][0], CYCLIC_QUAD_COORDS[0][1]);
const CYCLIC_QUAD_THETAS: readonly number[] = CYCLIC_QUAD_COORDS.map(([x, y]) =>
  Math.atan2(y, x),
);

// Tên tâm tuỳ chọn: "(O)" hoặc "tâm O" (mượn idiom của circleTriangle).
const CENTER = '(?:\\(\\s*([A-Z])\\s*\\)|tâm\\s+([A-Z]))?';

// Pattern A — tứ giác nội tiếp đường tròn: "ABCD nội tiếp (trong) đường tròn
// (O)/tâm O" HOẶC bare "ABCD nội tiếp (O)" (KHÔNG chữ "đường tròn" — C31). Neo ^
// vào phần text NGAY SAU 4 đỉnh (hit.afterEnd). Center = g1|g2 (đường tròn) | g3
// (bare paren) | g4|g5 (EN circle).
const QUAD_INSCRIBED_IN_CIRCLE = new RegExp(
  '^[\\s,]*(?:' +
    'nội\\s*tiếp\\s+(?:trong\\s+)?(?:một\\s+)?đường\\s*tròn\\s*' + CENTER +
    '|nội\\s*tiếp\\s+\\(\\s*([A-Z])\\s*\\)' +
    '|(?:is\\s+|are\\s+)?inscribed\\s+in\\s+(?:a\\s+|the\\s+)?circle\\s*' + CENTER +
    ')',
  'iu',
);

// Pattern B — đường tròn ngoại tiếp tứ giác: "đường tròn (O)/tâm O ngoại tiếp"
// đứng NGAY TRƯỚC "tứ giác ABCD". Neo $ vào phần text TRƯỚC hit.index. Center 1|2.
const CIRCLE_CIRCUMSCRIBES_QUAD = new RegExp(
  '(?:đường\\s*tròn|circle)\\s*' +
    CENTER +
    '\\s*(?:ngoại\\s*tiếp|(?:is\\s+|are\\s+)?circumscrib(?:es|ed)(?:\\s+(?:about|around))?)\\s+$',
  'iu',
);

// "tứ giác (nội tiếp) (O)? ABCD" — ĐỈNH ĐỨNG SAU "nội tiếp" (KHÁC KINDS quét đỉnh
// ngay sau "tứ giác"). Cyclic quad: 4 đỉnh đồng viên + đường tròn ngoại tiếp. Tâm
// optional "(O)" trước/sau "nội tiếp". t02:BT9 "Cho tứ giác nội tiếp ABCD".
const TUGIAC_NOITIEP = new RegExp(
  '[Tt]ứ\\s+giác(?:\\s+lồi)?\\s+nội\\s*tiếp\\s+(?:(?:trong\\s+)?(?:một\\s+)?đường\\s*tròn\\s+)?' +
    '(?:\\(\\s*([A-Z])\\s*\\)\\s+)?' + QUAD,
  'gu',
);

// Khai báo tam giác bất kỳ trong đề — 3 đỉnh HOA của nó "thuộc" tam giác (không
// được dời sang toạ độ đồng viên của tứ giác). Cờ 'g' để quét mọi khai báo.
const TRIANGLE_DECL = /(?:tam\s*giác|[Tt]riangle)\s+([A-Z])([A-Z])([A-Z])(?![A-Z])/gu;

/**
 * Tập ký tự đỉnh "thuộc về hình khác" trong TOÀN đề: mọi đỉnh tam giác + đỉnh
 * của mọi tứ giác hit KHÁC (chuỗi nhãn khác hit hiện tại). Nếu 4 đỉnh của tứ
 * giác này giao tập đó → KHÔNG áp dụng đồng viên (đặt chúng theo CYCLIC_QUAD
 * sẽ phá toạ độ đã có của hình kia → silent-wrong).
 */
function ownedByOthers(ctx: RuleContext, selfLabels: string[]): Set<string> {
  const owned = new Set<string>();
  TRIANGLE_DECL.lastIndex = 0;
  for (const m of ctx.problem.matchAll(TRIANGLE_DECL)) {
    owned.add(m[1]);
    owned.add(m[2]);
    owned.add(m[3]);
  }
  const selfKey = selfLabels.join('');
  for (const c of ctx.clauses) {
    for (const h of scanClause(c.text)) {
      if (h.labels.join('') === selfKey) continue; // chính tứ giác này
      for (const lbl of h.labels) owned.add(lbl);
    }
  }
  return owned;
}

/**
 * Phát hiện ngữ cảnh nội tiếp cho 1 hit tứ giác chung trong clause `text`.
 * Trả tên tâm (hoặc '') nếu khớp Pattern A/B; undefined nếu không nội tiếp.
 */
function detectCyclic(text: string, hit: Hit): string | undefined {
  // Pattern A: phần text NGAY SAU 4 đỉnh. Center = g1|g2 (đường tròn) | g3 (bare
  // paren "(O)") | g4|g5 (EN circle).
  const a = QUAD_INSCRIBED_IN_CIRCLE.exec(text.slice(hit.afterEnd));
  if (a) return a[1] ?? a[2] ?? a[3] ?? a[4] ?? a[5] ?? '';
  // Pattern B: phần text TRƯỚC "tứ giác" (hit.index = đầu "tứ giác").
  const b = CIRCLE_CIRCUMSCRIBES_QUAD.exec(text.slice(0, hit.index));
  if (b) return b[1] ?? b[2] ?? '';
  return undefined;
}

/**
 * Tứ giác / đa giác 4 đỉnh → draw-shape. Duyệt từng clause, quét EMIT-ALL mọi
 * khai báo hình (theo thứ tự text). KHÔNG trích được ĐÚNG 4 đỉnh HOA liền (vd
 * "ABCDE" 5 đỉnh) → bỏ qua khai báo đó (escalate AI qua guard).
 *
 * Tứ giác CHUNG (shape 'quadrilateral') có ngữ cảnh nội tiếp đường tròn → emit
 * THÊM draw-circle (through3) + đặt 4 đỉnh đồng viên qua explicitCoords. Hình
 * có tên (vuông/chữ nhật/...) NGOÀI phạm vi increment này (giữ hành vi cũ).
 *
 * GIỚI HẠN ĐÃ BIẾT (defer, không sửa): nếu CÙNG nhãn tứ giác được khai báo ở
 * HAI clause (vd "Cho tứ giác ABCD. Đường tròn ngoại tiếp tứ giác ABCD") — một
 * plain + một cyclic — cả hai draw-shape sống sót qua JSON dedup (explicitCoords
 * khác nhau) → polygon trùng "ABCD2" chồng lên nhau. Hiếm gặp + lành tính
 * (polygon trùng khít, không sai hình học). Test/probe để 1-clause để né.
 */
export const quadRule: LanguageRule = {
  id: 'quad',
  priority: 100,
  languages: ['vi', 'en'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    // Theo dõi vùng đã claim bởi nhánh "tứ giác nội tiếp ABCD" để scanClause
    // KHÔNG quét lại (scanClause không bắt dạng này vì đỉnh đứng sau "nội tiếp",
    // nên thực tế không trùng — pass riêng dưới).
    for (const c of ctx.clauses) {
      // --- "tứ giác (nội tiếp) (O)? ABCD" — đỉnh SAU "nội tiếp" → cyclic quad ---
      TUGIAC_NOITIEP.lastIndex = 0;
      for (const m of c.text.matchAll(TUGIAC_NOITIEP)) {
        const labels = [m[2], m[3], m[4], m[5]];
        const owned = ownedByOthers(ctx, labels);
        if (labels.some((lbl) => owned.has(lbl))) continue; // đỉnh dùng chung → bỏ
        const centerName = m[1] || 'O';
        out.push({
          ruleId: 'quad',
          clauseIds: [c.id],
          intents: [
            drawCircle(centerName, 'centerRadius', { center: centerName, radius: CYCLIC_RADIUS }),
            ...labels.map((lbl, i) =>
              addPoint(lbl, { kind: 'onCircle', circle: centerName, theta: CYCLIC_QUAD_THETAS[i] }),
            ),
            markShape('quadrilateral', labels),
          ],
        });
      }
      for (const hit of scanClause(c.text)) {
        let intents = [drawShape(hit.shape, hit.labels, hit.variant)];
        // Chỉ tứ giác CHUNG: thử phát hiện đường tròn ngoại tiếp.
        if (hit.shape === 'quadrilateral') {
          const center = detectCyclic(c.text, hit);
          if (center !== undefined) {
            // Fail-safe: đỉnh dùng chung với hình khác → giữ quad-only.
            const owned = ownedByOthers(ctx, hit.labels);
            const shared = hit.labels.some((lbl) => owned.has(lbl));
            if (!shared) {
              const centerName = center || 'O';
              // Đường tròn centerRadius (tâm `centerName`) — resolveCircleNames sẽ
              // inject point tâm + rename circle khi name trùng center ("(O)"=tâm O).
              // 4 đỉnh = glider onCircle (theta cố định, layout lồi) → CONSTRAINED.
              // polygon nối 4 đỉnh qua mark-shape (đỉnh đã có, không tạo coord mới).
              // Thứ tự: circle TRƯỚC (glider ref nó), rồi 4 glider, rồi polygon.
              intents = [
                drawCircle(centerName, 'centerRadius', {
                  center: centerName,
                  radius: CYCLIC_RADIUS,
                }),
                ...hit.labels.map((lbl, i) =>
                  addPoint(lbl, { kind: 'onCircle', circle: centerName, theta: CYCLIC_QUAD_THETAS[i] }),
                ),
                markShape(hit.shape, hit.labels),
              ];
            }
          }
        }
        out.push({
          ruleId: 'quad',
          clauseIds: [c.id],
          intents,
        });
      }
    }
    return out;
  },
};
