// src/stamps/geometry-2d/ai/rules/onSegmentPoint.ts
//
// Điểm tự do trên đoạn/cạnh/bán kính:
//   "Trên cạnh AC lấy điểm M" → M onSegment AC
//   "điểm E thuộc cạnh BC" → E onSegment BC
//   "D nằm giữa A và B" → D onSegment AB
//
// Rule này cố ý không giải metric (AC=10, CB=40, AD=2DB). Mục tiêu là dựng điểm
// đúng constraint trên segment để các construct sau có ref hợp lệ; t mặc định do
// builder chọn.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

// "thuộc <2 HOA>" (vd "D thuộc AC") cũng kích hoạt — KHÔNG bắt buộc chữ "cạnh".
// "thuộc (O)"/"thuộc cung" KHÔNG khớp ([A-Z]{2} cần 2 HOA liền, paren/'cung' loại)
// → onCirclePoint lo. match() vẫn validate SEG nên prefilter rộng vô hại.
// "[Tt]rên\s+[A-Z]{2}" cho dạng đoạn-trước "trên BC, CA, AB … lấy điểm M, N, E"
// (cạnh nêu trần bằng cặp đỉnh, không chữ "cạnh/đoạn"). match() vẫn validate nên
// prefilter rộng vô hại.
// "đường kính AB" là 1 ĐOẠN (đường kính của đường tròn) → cho phép "trên đường
// kính AB lấy điểm C" (phang:14). Thêm vào prefix đoạn-loại.
const PREFILTER = /(?:thuộc\s+(?:các\s+|hai\s+|ba\s+)?(?:cạnh|đoạn|đáy|tia|bán\s*kính|đường\s*kính|dây|[A-Za-z]{1,2}[0-9]?(?![\p{L}\d]))|[Tt]rên\s+(?:các\s+|hai\s+|ba\s+)?(?:cạnh|đoạn|đáy|tia|bán\s*kính|đường\s*kính|đường\s*thẳng|dây|[A-Za-z]{1,2}[0-9]?(?![\p{L}\d]))|(?:di\s*chuyển|di\s*động)\s+trên|nằm\s+giữa)/u;

// "Trên đường thẳng d (lấy)? (một)? (điểm)? M" — đường ĐẶT TÊN chữ thường (d, d1).
// resolveSegmentRef thấy shape "d" (tangentLineNamedAtPoint dựng) → glider trên d.
// Token tên đường = 1 chữ thường + tối đa 1 chữ số, NEO (?!\p{L}) để KHÔNG nuốt
// từ tiếng Việt "vuông"/"song"… ("đường thẳng vuông góc" → "v"+(?!\p{L}) thất bại
// vì sau "v" là "u" (chữ) — không khớp; tránh bịa đoạn "vu").
const ON_NAMED_LINE = new RegExp(
  String.raw`[Tt]rên\s+đường\s*thẳng\s+([a-z][0-9]?)(?!\p{L})[^.]{0,20}?(?:lấy\s+)?(?:một\s+)?(?:điểm\s+)?([A-Z](?:['′])?)(?![A-Z])`,
  'gu',
);

// Dạng VIẾT TẮT (bỏ chữ "đường thẳng"): "Trên d lấy điểm M" / "M thuộc d" — token
// CHỮ THƯỜNG đứng MỘT MÌNH (1-2 ký tự + số), neo (?![\p{L}\d]) để KHÔNG nuốt từ
// Việt + KHÔNG nhầm cặp đỉnh. CHỈ kích hoạt khi đề có "đường thẳng <token>"
// (namedLine/tangentLineNamedAtPoint đã dựng) — guard ở match() qua ctx.problem.
const ON_NAMED_LINE_BARE = new RegExp(
  String.raw`[Tt]rên\s+([a-z]{1,2}[0-9]?)(?![\p{L}\d])\s+(?:lấy\s+)?(?:một\s+)?(?:điểm\s+)?([A-Z](?:['′])?)(?![A-Z])`,
  'gu',
);
const POINT_THUOC_NAMED_BARE = new RegExp(
  String.raw`(?:điểm\s+)?([A-Z](?:['′])?)(?![A-Z])\s+(?:là\s+(?:một\s+)?điểm\s+(?:bất\s*k[iìyỳ]\s+)?)?thuộc\s+([a-z]{1,2}[0-9]?)(?![\p{L}\d])`,
  'gu',
);

const SEG = '([A-Z]{2})(?![A-Z])';
const POINT = "([A-Z](?:['′])?)(?![A-Z])";

// "Trên cạnh AC lấy điểm M" / "Trên đoạn thẳng OB lấy điểm H" / "trên đáy CD …".
const ON_SEG_THEN_POINT = new RegExp(
  String.raw`[Tt]rên\s+(?:cạnh|đáy|đoạn(?:\s+thẳng)?|bán\s*kính|đường\s*kính|dây\s*(?:cung)?)\s+${SEG}[^.]{0,30}?(?:lấy\s+)?(?:một\s+)?(?:điểm\s+)?${POINT}`,
  'gu',
);

// "Trên (cạnh|đáy)? AC lấy (các)? điểm D, E (, F)" — NHIỀU điểm CÙNG đoạn AC
// (toán 8: "Trên cạnh AC lấy các điểm D,E sao cho AD=DE=EC"). group1=seg,
// group2=blob tên. Chạy TRƯỚC metric-skip (đặt điểm free dù có "sao cho =").
const ON_SEG_MULTI_POINT = new RegExp(
  String.raw`[Tt]rên\s+(?:cạnh\s+|đáy\s+|đoạn(?:\s+thẳng)?\s+)?${SEG}\s+(?:lấy\s+)?(?:các\s+)?(?:điểm\s+)?((?:[A-Z](?:['′])?\s*,\s*)+[A-Z](?:['′])?)(?![A-Z])`,
  'gu',
);

// "điểm E thuộc cạnh BC" / "C thuộc đoạn thẳng AB" / "Điểm D thuộc AC" (không
// chữ "cạnh"). Prefix "cạnh|đoạn|…" optional; SEG = cặp HOA [A-Z]{2} nên "thuộc
// (O)"/"thuộc cung BC" KHÔNG khớp (paren/'cung' chữ thường) → onCirclePoint lo.
const POINT_THUOC_SEG = new RegExp(
  String.raw`(?:điểm\s+)?${POINT}\s+(?:là\s+(?:một\s+)?điểm\s+(?:bất\s*k[iìyỳ]\s+)?)?thuộc\s+(?:(?:cạnh|đoạn(?:\s+thẳng)?|bán\s*kính|dây\s*(?:cung)?)\s+)?${SEG}`,
  'gu',
);

// "điểm N thuộc tia AM" — điểm trên TIA (2 đầu mút HOA). CHẠY TRƯỚC metric-skip
// (đặt free dù "sao cho AN=BM" — metric chỉ tinh chỉnh; httcd:128). Tách khỏi
// POINT_THUOC_SEG vì cần né "tia đối của tia AB" (oppositeRayPoint lo): SEG sau
// "tia " phải là cặp HOA NGAY (≠ "đối").
const POINT_THUOC_TIA = new RegExp(
  String.raw`(?:điểm\s+)?${POINT}\s+(?:là\s+(?:một\s+)?điểm\s+(?:bất\s*k[iìyỳ]\s+)?)?thuộc\s+tia\s+${SEG}`,
  'gu',
);

// "M là (một)? điểm (bất kì)? trên (cạnh|đoạn|đáy)? AD" — tên ĐỨNG TRƯỚC + "là
// điểm trên" (KHÔNG "thuộc", KHÔNG động từ chuyển động — son123:9). CHẠY TRƯỚC
// metric-skip ("sao cho ∠=30°"). SEG=[A-Z]{2} + prefix loại "tia/cung/đường tròn"
// (onCirclePoint/oppositeRay lo).
const POINT_ON_SEG_DECL = new RegExp(
  String.raw`${POINT}\s+là\s+(?:một\s+)?điểm\s+(?:bất\s*k[iìyỳ]\s+)?trên\s+(?:cạnh\s+|đáy\s+|đoạn(?:\s+thẳng)?\s+)?${SEG}`,
  'gu',
);

// "Điểm P di chuyển trên cạnh AC" / "P di động trên đoạn BC" / "Lấy P trên cạnh
// AC" — điểm ĐỨNG TRƯỚC + động từ chuyển động (di chuyển/thay đổi/di động/nằm)
// optional + "trên (cạnh) SEG". Điểm 1-DOF (di động) vẫn dựng 1 vị trí đại diện.
// KHÔNG nhận "trên cung" (onCircle lo) — chỉ cạnh/đoạn/đường thẳng/bán kính.
const POINT_MOVE_SEG = new RegExp(
  String.raw`(?:điểm\s+)?${POINT}\s+(?:là\s+(?:một\s+)?điểm\s+)?(?:di\s*chuyển|thay\s*đổi|di\s*động|chuyển\s*động|nằm)\s+trên\s+(?:cạnh\s+|đoạn(?:\s+thẳng)?\s+|đường\s*thẳng\s+|bán\s*kính\s+|đường\s*kính\s+)?${SEG}`,
  'gu',
);

// "D nằm giữa A và B" / "một điểm D nằm giữa A và B" / "M là (một)? điểm nằm
// giữa A và B" (tên đứng TRƯỚC "là điểm" — httcd:67, vao10:219).
const BETWEEN = new RegExp(
  String.raw`(?:một\s+)?(?:điểm\s+)?${POINT}\s+(?:là\s+(?:một\s+)?điểm\s+)?nằm\s+giữa\s+(?:hai\s+điểm\s+)?([A-Z])\s+và\s+([A-Z])(?![A-Z])`,
  'gu',
);

// Distributive CÙNG đoạn: "(Các)? điểm M, N thuộc BC" → M,N đều onSegment BC.
const TWO_SAME_SEG = new RegExp(
  String.raw`(?:[CcNn]ác\s+|[Nn]hững\s+)?điểm\s+([A-Z])\s*,\s*([A-Z])(?![A-Z])\s+thuộc\s+(?:cạnh\s+|đoạn(?:\s+thẳng)?\s+)?${SEG}`,
  'gu',
);
// Distributive ZIP: "(các)? điểm P, Q (theo thứ tự|lần lượt)? thuộc AC, AB"
//   → P↔AC, Q↔AB. (Cần "theo thứ tự"/"lần lượt" để chắc là zip, không phải cùng đoạn.)
const ZIP_SEG = new RegExp(
  String.raw`(?:[CcNn]ác\s+|[Nn]hững\s+)?điểm\s+([A-Z])\s*,\s*([A-Z])(?![A-Z])\s+(?:theo\s+thứ\s+tự|lần\s*lượt)\s+thuộc\s+(?:các\s+)?(?:cạnh\s+|đoạn\s+|tia\s+)?${SEG}\s*,\s*${SEG}`,
  'gu',
);
// Distributive ĐOẠN-TRƯỚC: "trên BC, CA, AB (thứ tự|lần lượt)? lấy (các)? điểm
// M, N, E" → zip SEG_i ↔ point_i (N≥2). Đề hay nêu cạnh TRƯỚC rồi tên điểm SAU.
// CHẠY kể cả khi clause có "sao cho …=…" (metric chỉ TINH CHỈNH vị trí; đặt điểm
// free trên cạnh là đủ cho hình). group1 = blob đoạn, group2 = blob tên điểm.
const SEGS_THEN_POINTS = new RegExp(
  String.raw`[Tt]rên\s+(?:các\s+)?(?:cạnh\s+|đoạn(?:\s+thẳng)?\s+|đáy\s+|bán\s*kính\s+)?((?:[A-Z]{2}\s*,\s*)+[A-Z]{2})(?![A-Z])(?:\s+của\s+(?:tam\s*giác\s+|tứ\s*giác\s+)?[A-Z]{2,4})?\s+(?:(?:theo\s+)?thứ\s+tự\s+|lần\s*lượt\s+)?lấy\s+(?:các\s+)?điểm\s+((?:[A-Z]\s*,\s*)+[A-Z])(?![A-Z])`,
  'gu',
);

// "Trên đoạn BH lấy điểm M và trên đoạn CH lấy điểm N" — 2 điểm trên 2 đoạn KHÁC
// nối "và". Distributive coordinated → CHẠY TRƯỚC metric-skip (đặt free dù "sao
// cho ∠=90°"). Chỉ cạnh/đáy/đoạn (KHÔNG tia → tránh đụng pointAtDistance). KHÔNG
// khớp đơn lẻ "Trên cạnh AB lấy điểm D sao cho AD=2DB" (cần vế "và … lấy" thứ 2).
const TWO_SEG_LAY = new RegExp(
  String.raw`[Tt]rên\s+(?:cạnh|đáy|đoạn(?:\s+thẳng)?)\s+${SEG}\s+(?:lấy\s+)?(?:một\s+)?(?:điểm\s+)?${POINT}\s+và\s+(?:trên\s+)?(?:cạnh|đáy|đoạn(?:\s+thẳng)?)\s+${SEG}\s+(?:lấy\s+)?(?:một\s+)?(?:điểm\s+)?${POINT}`,
  'gu',
);

function normalizePoint(name: string): string {
  return name.replace('′', "'");
}

function validOnSegment(name: string, segment: string): boolean {
  return /^[A-Z]['′]?$/u.test(name) && /^[A-Z]{2}$/u.test(segment) && !segment.includes(name[0]);
}

function hasMetricConstraint(text: string): boolean {
  return /sao\s+cho[^.]{0,40}(?:=|>|<)/u.test(text);
}

// Tập tên đường ĐẶT TÊN chữ thường được KHAI BÁO trong đề ("(đường thẳng|tiếp
// tuyến|cát tuyến) <token>"). Dùng làm guard cho dạng VIẾT TẮT "Trên d"/"thuộc d"
// (chỉ glider trên d khi d thật sự là 1 đường — tránh nhầm chữ thường lẻ).
function declaredNamedLines(problem: string): Set<string> {
  const out = new Set<string>();
  const RE =
    /(?:đường\s*thẳng|tiếp\s*tuyến|cát\s*tuyến)\s+([a-z]{1,2}[0-9]?)(?![\p{L}\d])/gu;
  for (const m of problem.matchAll(RE)) out.add(m[1]);
  return out;
}

export const onSegmentPointRule: LanguageRule = {
  id: 'on-segment-point',
  priority: 62,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    const namedLines = declaredNamedLines(ctx.problem);
    for (const c of ctx.clauses) {
      const intents = [];

      // Điểm trên đường ĐẶT TÊN chữ thường ("Trên đường thẳng d lấy điểm M") —
      // CHẠY TRƯỚC metric-skip (httcd:245 "… sao cho CA < CB"; đặt C free trên d,
      // metric chỉ tinh chỉnh). Dạng CÓ chữ "đường thẳng" nên không cần guard
      // namedLines (đã đặc thù).
      ON_NAMED_LINE.lastIndex = 0;
      for (const m of c.text.matchAll(ON_NAMED_LINE)) {
        const line = m[1];
        const name = normalizePoint(m[2]);
        if (/^[A-Z]['′]?$/u.test(name)) intents.push(addPoint(name, { kind: 'onSegment', of: line }));
      }

      // Điểm trên đường ĐẶT TÊN chữ thường dạng VIẾT TẮT ("Trên d lấy điểm M",
      // "M thuộc d") — CHẠY TRƯỚC metric-skip (đặt free dù "sao cho …"). Guard:
      // token PHẢI là đường khai báo trong đề (namedLines) để không nhầm chữ lẻ.
      if (namedLines.size > 0) {
        ON_NAMED_LINE_BARE.lastIndex = 0;
        for (const m of c.text.matchAll(ON_NAMED_LINE_BARE)) {
          const line = m[1];
          const name = normalizePoint(m[2]);
          if (namedLines.has(line) && /^[A-Z]['′]?$/u.test(name)) {
            intents.push(addPoint(name, { kind: 'onSegment', of: line }));
          }
        }
        POINT_THUOC_NAMED_BARE.lastIndex = 0;
        for (const m of c.text.matchAll(POINT_THUOC_NAMED_BARE)) {
          const name = normalizePoint(m[1]);
          const line = m[2];
          if (namedLines.has(line) && /^[A-Z]['′]?$/u.test(name)) {
            intents.push(addPoint(name, { kind: 'onSegment', of: line }));
          }
        }
      }

      // Distributive đoạn-trước CHẠY TRƯỚC metric-skip (vẽ điểm free trên cạnh dù
      // có "sao cho …=…"). "trên BC, CA, AB … lấy điểm M, N, E" → zip 1-1.
      SEGS_THEN_POINTS.lastIndex = 0;
      for (const m of c.text.matchAll(SEGS_THEN_POINTS)) {
        const segs = m[1].split(',').map((s) => s.trim());
        const pts = m[2].split(',').map((s) => normalizePoint(s.trim()));
        if (segs.length === pts.length && segs.length >= 2) {
          const seenD = new Set<string>();
          for (let i = 0; i < segs.length; i++) {
            if (seenD.has(pts[i])) continue;
            if (validOnSegment(pts[i], segs[i])) {
              seenD.add(pts[i]);
              intents.push(addPoint(pts[i], { kind: 'onSegment', of: segs[i] }));
            }
          }
        }
      }

      // Coordinated "Trên đoạn BH lấy điểm M và trên đoạn CH lấy điểm N" → M∈BH,
      // N∈CH. Pre-metric (đặt free dù "sao cho ∠=90°"). group 1/3 = đoạn, 2/4 = tên.
      TWO_SEG_LAY.lastIndex = 0;
      for (const m of c.text.matchAll(TWO_SEG_LAY)) {
        for (const [pt, seg] of [[m[2], m[1]], [m[4], m[3]]] as Array<[string, string]>) {
          const n = normalizePoint(pt);
          if (validOnSegment(n, seg)) intents.push(addPoint(n, { kind: 'onSegment', of: seg }));
        }
      }

      // "Trên cạnh AC lấy các điểm D, E (, F)" — nhiều điểm CÙNG đoạn, TRƯỚC
      // metric-skip (toán8: "lấy các điểm D,E sao cho AD=DE=EC").
      ON_SEG_MULTI_POINT.lastIndex = 0;
      for (const m of c.text.matchAll(ON_SEG_MULTI_POINT)) {
        const seg = m[1];
        const names = m[2].split(',').map((x) => normalizePoint(x.trim())).filter(Boolean);
        if (names.length < 2) continue;
        for (const n of names) if (validOnSegment(n, seg)) intents.push(addPoint(n, { kind: 'onSegment', of: seg }));
      }

      // ZIP distributive "P, Q lần lượt thuộc (tia|cạnh) AC, AB" CHẠY TRƯỚC
      // metric-skip (đặt điểm free trên cạnh/tia dù có "sao cho …=…" — Bài 47).
      const zipConsumed: Array<[number, number]> = [];
      ZIP_SEG.lastIndex = 0;
      for (const m of c.text.matchAll(ZIP_SEG)) {
        const [n1, n2, s1, s2] = [normalizePoint(m[1]), normalizePoint(m[2]), m[3], m[4]];
        if (validOnSegment(n1, s1) && validOnSegment(n2, s2)) {
          intents.push(addPoint(n1, { kind: 'onSegment', of: s1 }));
          intents.push(addPoint(n2, { kind: 'onSegment', of: s2 }));
          zipConsumed.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
        }
      }

      // "điểm N thuộc tia AM" → onSegment AM, CHẠY TRƯỚC metric-skip (httcd:128
      // "… sao cho AN=BM" — đặt N free; metric chỉ tinh chỉnh).
      POINT_THUOC_TIA.lastIndex = 0;
      for (const m of c.text.matchAll(POINT_THUOC_TIA)) {
        const name = normalizePoint(m[1]);
        const segment = m[2];
        if (validOnSegment(name, segment)) {
          intents.push(addPoint(name, { kind: 'onSegment', of: segment }));
        }
      }

      // "M là (một)? điểm trên cạnh AD" — pre-metric (son123:9 "sao cho ∠=30°").
      POINT_ON_SEG_DECL.lastIndex = 0;
      for (const m of c.text.matchAll(POINT_ON_SEG_DECL)) {
        const name = normalizePoint(m[1]);
        const segment = m[2];
        if (validOnSegment(name, segment)) {
          intents.push(addPoint(name, { kind: 'onSegment', of: segment }));
        }
      }

      // Còn lại CỐ Ý bỏ qua clause có ràng buộc metric (vd "sao cho AD=2DB") để
      // không đoán sai vị trí — distributive ở trên đã dựng điểm free đủ cho hình.
      if (hasMetricConstraint(c.text)) {
        if (intents.length > 0) out.push({ ruleId: 'on-segment-point', clauseIds: [c.id], intents });
        continue;
      }

      ON_SEG_THEN_POINT.lastIndex = 0;
      for (const m of c.text.matchAll(ON_SEG_THEN_POINT)) {
        const segment = m[1];
        const name = normalizePoint(m[2]);
        if (validOnSegment(name, segment)) {
          intents.push(addPoint(name, { kind: 'onSegment', of: segment }));
        }
      }

      // (ZIP đã chạy trước metric-skip ở trên — zipConsumed dùng cho TWO_SAME_SEG.)
      // "Các điểm M, N thuộc BC" — cùng đoạn (bỏ span đã khớp ZIP).
      TWO_SAME_SEG.lastIndex = 0;
      for (const m of c.text.matchAll(TWO_SAME_SEG)) {
        if (zipConsumed.some(([a, b]) => (m.index ?? 0) >= a && (m.index ?? 0) < b)) continue;
        const [n1, n2, seg] = [normalizePoint(m[1]), normalizePoint(m[2]), m[3]];
        if (validOnSegment(n1, seg) && validOnSegment(n2, seg)) {
          intents.push(addPoint(n1, { kind: 'onSegment', of: seg }));
          intents.push(addPoint(n2, { kind: 'onSegment', of: seg }));
        }
      }

      POINT_THUOC_SEG.lastIndex = 0;
      for (const m of c.text.matchAll(POINT_THUOC_SEG)) {
        const name = normalizePoint(m[1]);
        const segment = m[2];
        if (validOnSegment(name, segment)) {
          intents.push(addPoint(name, { kind: 'onSegment', of: segment }));
        }
      }

      // "Điểm P di chuyển/di động/nằm trên cạnh AC" — điểm trước + động từ.
      POINT_MOVE_SEG.lastIndex = 0;
      for (const m of c.text.matchAll(POINT_MOVE_SEG)) {
        const name = normalizePoint(m[1]);
        const segment = m[2];
        if (validOnSegment(name, segment)) {
          intents.push(addPoint(name, { kind: 'onSegment', of: segment }));
        }
      }

      // "cắt … (tại|ở) D và E (D nằm giữa A và E)": D,E là GIAO ĐIỂM cát tuyến
      // (secant/lineCircleIntersection dựng), "nằm giữa" chỉ là thứ tự → onSegment
      // sẽ tạo phụ thuộc vòng (D onSegment AE, E = secondIntersection AD). Bỏ
      // toàn bộ BETWEEN trong clause có "cắt … tại/ở".
      const cutContext = /cắt[^.]{0,40}?(?:tại|ở)\s+[A-Z]/u.test(c.text);
      BETWEEN.lastIndex = 0;
      for (const m of cutContext ? [] : c.text.matchAll(BETWEEN)) {
        // "sao cho X nằm giữa Y và Z" = ĐIỀU KIỆN thứ tự trên điểm ĐÃ có (vd đỉnh
        // hình, hoặc giao điểm vừa dựng) — KHÔNG dựng onSegment (sẽ tạo phụ thuộc
        // vòng nếu Y/Z lại phái sinh từ X). Chỉ nhận "nằm giữa" khi GIỚI THIỆU điểm mới.
        const before = c.text.slice(0, m.index ?? 0);
        if (/sao\s+cho\s*$/u.test(before) || /sao\s+cho\b/u.test(before)) continue;
        const name = normalizePoint(m[1]);
        const segment = `${m[2]}${m[3]}`;
        if (validOnSegment(name, segment)) {
          intents.push(addPoint(name, { kind: 'onSegment', of: segment }));
        }
      }

      if (intents.length > 0) out.push({ ruleId: 'on-segment-point', clauseIds: [c.id], intents });
    }
    return out;
  },
};
