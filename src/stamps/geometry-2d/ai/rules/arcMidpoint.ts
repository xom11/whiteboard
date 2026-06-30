// src/stamps/geometry-2d/ai/rules/arcMidpoint.ts
//
// Điểm chính giữa cung: "Gọi M là điểm chính giữa cung BC (không chứa A)".
//   → add-point M {kind:'arcMidpoint', circle:'O', a:'B', b:'C', notContaining:'A'}
//
// circle lấy từ toàn đề ("(O)" / "đường tròn (tâm) O"); KHÔNG có circle → bỏ qua
// (escalate AI — không thể dựng cung mà không biết đường tròn).
//
// notContaining (PHẢI là đỉnh thứ 3, ∉ {a,b}):
//   - "không chứa X"               → X (chỉ nhận nếu X ∉ {a,b}; X∈{a,b} vô nghĩa → bỏ qua)
//   - không nêu nhưng có tam giác  → đỉnh thứ 3 (đỉnh tam giác không thuộc cặp cung)
//   - cả hai đều không suy được    → bỏ qua (escalate)
//
// CHỈ xử lý cú pháp "cung (nhỏ)? <PAIR> không chứa <Z>" (containment ÂM, cung nhỏ).
// Vượt scope → bỏ qua (escalate, an toàn — đừng mis-render):
//   - "cung lớn <PAIR>"            → cung lớn, ngữ nghĩa cung đối → defer
//   - "chứa X" (containment DƯƠNG, không có "không" đứng trước) → defer
//
// Tên điểm qua extractPointName / ký tự HOA trước "(là) điểm chính giữa"; không
// trích được tên → bỏ qua (đừng bịa tên).
//
// EN (issue #46 group B): hỗ trợ thêm các dạng tiếng Anh tương đương —
//   "Let M be the midpoint of arc BC not containing A"
//   "M is the midpoint of the (minor) arc BC" (suy notContaining từ "Triangle ABC")
//   "major arc" → defer (mirror "cung lớn"); "containing X" dương → defer.
// Tên điểm EN qua "X is/be the midpoint of … arc" (extractPointName là VN-only).
// Collision midpoint EN (rule prio 50): KHÔNG xảy ra — midpoint EN cần
// "midpoint of (segment|side)? [A-Z][A-Z]", nhưng sau "of" ở đây là "arc" (chữ
// thường) → [A-Z] fail → midpoint không grab "BC".
//
// GOTCHA \b: \b của JS dựa ASCII word-char nên KHÔNG khớp quanh ký tự Việt
// ("đ","ề","ạ"…). Mọi regex chứa ký tự Việt dùng cờ 'u' + lookaround \p{L}.
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, drawCircle, extractPointName, pairFromToken } from './_shared';

// Prefilter toàn đề: "chính giữa cung" hoặc "trung điểm cung".
const ARC_MID = /(?:chính\s+giữa|trung\s*điểm)\s+(?:của\s+|các\s+)*cung/u;

// Cụm cung + cặp đỉnh: "điểm chính giữa cung (nhỏ|lớn) BC".
// "nhỏ|lớn" optional; "của" optional. Cặp đỉnh = 2 ký tự HOA liền.
// group1 = tính từ cung (nhỏ|lớn) optional, group2+3 = cặp đỉnh.
const ARC_PAIR =
  /(?:chính\s+giữa|trung\s*điểm)\s+(?:của\s+)?cung\s+(nhỏ\s+|lớn\s+)?([A-Z])([A-Z])/u;

// Tên điểm đứng TRƯỚC cụm: "M (là) (điểm) (chính giữa|trung điểm) cung".
const NAME_BEFORE =
  /([A-Z])(?:['′]?)\s+(?:là\s+)?(?:điểm\s+)?(?:chính\s+giữa|trung\s*điểm)\s+(?:của\s+)?cung/u;

// Tam giác trong toàn đề → 3 đỉnh (dùng suy notContaining khi đề không nêu).
const TRI = /tam giác\s+([A-Z])([A-Z])([A-Z])/u;

// Tên đường tròn trong toàn đề: "đường tròn (tâm) O" / "(O)".
//   - "đường tròn tâm O" / "đường tròn O"  → O
//   - "(O)" đứng riêng (1 ký tự HOA trong ngoặc, không phải cặp đỉnh / số)
const CIRCLE_WORDS = /đường\s*tròn\s*(?:\(\s*)?(?:tâm\s+)?([A-Z])(?![A-Z])/u;
// "(O)" bare HOẶC compact "(O;R)"/"(O,R)" — vao10:35 "Cho nửa (O;R) đường kính
// AB" không có chữ "đường tròn" → CIRCLE_WORDS fail, fallback paren phải nhận ;R.
const CIRCLE_PAREN = /\(\s*([A-Z])(?:\s*[;,]\s*[Rr])?\s*\)/u;

// === EN patterns (issue #46 group B) =========================================
// First-letter case-flex [Mm]/[Tt]; KHÔNG cờ 'i' (phá nhãn [A-Z]). Nhãn STRICT
// [A-Z] + neo (?![A-Za-z]) cuối cặp đỉnh (chặn "BCD" 3 chữ → escalate-safe).
// Prefilter EN: "midpoint of (the)? (minor|major)? arc".
const ARC_MID_EN = /[Mm]idpoint\s+of\s+(?:the\s+)?(?:minor\s+|major\s+)?arc/u;
// Cụm cung + cặp đỉnh EN.
const ARC_PAIR_EN =
  /[Mm]idpoint\s+of\s+(?:the\s+)?(?:minor\s+|major\s+)?arc\s+([A-Z])([A-Z])(?![A-Za-z])/u;
// Tên đứng TRƯỚC: "M is/be the midpoint of arc". (EN không có lời dẫn VN; extractPointName VN-only.)
const NAME_BEFORE_EN =
  /([A-Z])(?:['′]?)\s+(?:is|be)\s+the\s+midpoint\s+of\s+(?:the\s+)?(?:minor\s+|major\s+)?arc/u;
// Tam giác EN (suy notContaining khi không nêu "not containing").
const TRI_EN = /[Tt]riangle\s+([A-Z])([A-Z])([A-Z])(?![A-Za-z])/u;
// Scope guard: "major arc" → defer (mirror VN "cung lớn").
const MAJOR_ARC_EN = /major\s+arc/u;

// === Containment (chứa / không chứa) =========================================
// Một mệnh đề containment = "(không )?chứa X". `rel:'not'` ⇒ notContaining,
// `rel:'in'` ⇒ containing. Trích THEO THỨ TỰ để zip với danh sách tên (phân phối).
// /g + lastIndex reset 0; ký tự Việt ⇒ lookaround \p{L} thay \b.
type Containment = { rel: 'not' | 'in'; point: string };
function parseContainmentsVN(text: string): Containment[] {
  const re = /(không\s+)?chứa\s+(?:điểm\s+|đỉnh\s+)?([A-Z])(?!\p{L})/gu;
  const out: Containment[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ rel: m[1] ? 'not' : 'in', point: m[2] });
  return out;
}
function parseContainmentsEN(text: string): Containment[] {
  const re = /(not\s+)?containing\s+(?:the\s+)?(?:point\s+|vertex\s+)?([A-Z])(?![A-Za-z])/gu;
  const out: Containment[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ rel: m[1] ? 'not' : 'in', point: m[2] });
  return out;
}

// Trường constraint từ 1 mệnh đề containment (notContaining XOR containing).
function containmentField(ct: Containment): { notContaining: string } | { containing: string } {
  return ct.rel === 'in' ? { containing: ct.point } : { notContaining: ct.point };
}

// Phân phối VN: "N, T lần lượt là (điểm) (chính giữa|trung điểm) (của) cung (nhỏ|lớn)? BC <tail>".
// group1 = blob tên (≥2, phẩy), group2/3 = cặp đỉnh, group4 = đuôi chứa danh sách containment.
const DISTRIB_VN = new RegExp(
  '((?:[A-Z](?:[\'′]?)\\s*,\\s*)+[A-Z](?:[\'′]?))\\s+lần\\s*lượt\\s+(?:là\\s+)?(?:điểm\\s+)?' +
    '(?:chính\\s+giữa|trung\\s*điểm)\\s+(?:của\\s+)?cung\\s+(?:nhỏ\\s+|lớn\\s+)?([A-Z])([A-Z])\\s+(.+)',
  'u',
);

// Phân phối 2 CUNG: "N và P lần lượt là (điểm)? chính giữa (của)? cung AM và cung
// MB" → zip N↔cung AM, P↔cung MB (httcd:237; tên nối "và"/phẩy, mỗi cung nêu
// "cung XY" riêng). KHÁC DISTRIB_VN (1 cung + nhiều containment). Không containment
// (nửa đường tròn / cung nêu tường minh từng cặp). groups: 1=n1 2=n2 3=a1 4=b1 5=a2 6=b2.
const DISTRIB_TWO_ARCS = new RegExp(
  "([A-Z])(?:['′]?)\\s*(?:,|và)\\s*([A-Z])(?:['′]?)\\s+lần\\s*lượt\\s+(?:là\\s+)?(?:điểm\\s+)?" +
    '(?:chính\\s+giữa|trung\\s*điểm)\\s+(?:của\\s+)?cung\\s+(?:nhỏ\\s+|lớn\\s+)?([A-Z])([A-Z])(?![A-Z])' +
    '\\s+và\\s+(?:điểm\\s+)?(?:(?:chính\\s+giữa|trung\\s*điểm)\\s+)?(?:của\\s+)?cung\\s+(?:nhỏ\\s+|lớn\\s+)?([A-Z])([A-Z])(?![A-Z])',
  'u',
);

// Phân phối 2 cung tên 3-CHỮ: "M và N lần lượt là điểm chính giữa (các)? cung ADC
// và ABC" (C80) → cung XYZ = cung từ X tới Z CHỨA Y (chữ giữa) → arcMidpoint
// {a:X, b:Z, containing:Y}. M↔ADC (a=A,b=C,containing=D), N↔ABC (a=A,b=C,containing=B).
// groups: 1=n1 2=n2 3-5=arc1(XYZ) 6-8=arc2(UVW).
const DISTRIB_TWO_ARCS3 = new RegExp(
  "([A-Z])(?:['′]?)\\s*(?:,|và)\\s*([A-Z])(?:['′]?)\\s+lần\\s*lượt\\s+(?:là\\s+)?(?:điểm\\s+)?" +
    '(?:chính\\s+giữa|trung\\s*điểm)\\s+(?:của\\s+|các\\s+)*cung\\s+([A-Z])([A-Z])([A-Z])(?![A-Z])' +
    // "cung" thứ 2 OPTIONAL: "các cung ADC và ABC" (cung chung) HOẶC "cung ADC và cung ABC".
    '\\s+và\\s+(?:điểm\\s+)?(?:(?:chính\\s+giữa|trung\\s*điểm)\\s+)?(?:của\\s+)?(?:cung\\s+)?([A-Z])([A-Z])([A-Z])(?![A-Z])',
  'u',
);

/** Tên đường tròn từ toàn đề; undefined nếu không tìm thấy. */
function resolveCircle(problem: string): string | undefined {
  const w = CIRCLE_WORDS.exec(problem);
  if (w) return w[1];
  const p = CIRCLE_PAREN.exec(problem);
  if (p) return p[1];
  return undefined;
}

/**
 * Tên cho circumcircle NGẦM (khi đề không nêu "(O)"): ưu tiên 'O' (quy ước), né
 * nếu đã là token HOA đứng riêng trong đề (vd điểm O); else 'O1'/'O2'/'W'.
 */
function synthCircleName(problem: string): string {
  for (const cand of ['O', 'O1', 'O2', 'W']) {
    if (!new RegExp(`(?<!\\p{L})${cand}(?![\\p{L}\\d])`, 'u').test(problem)) return cand;
  }
  return 'O'; // fallback (resolveCircleNameCollisions sẽ dedup nếu cần)
}

/**
 * "Gọi M là điểm chính giữa cung nhỏ BC không chứa A" → add-point M
 * {kind:'arcMidpoint', circle, a:'B', b:'C', notContaining:'A'}.
 *
 * Một clause khớp khi: trích được tên điểm, cặp đỉnh cung, đường tròn, và
 * notContaining (nêu "không chứa X" hoặc suy từ đỉnh thứ 3 của tam giác). Thiếu
 * bất kỳ thành phần nào → bỏ qua clause (escalate AI thay vì đoán sai).
 */
export const arcMidpointRule: LanguageRule = {
  id: 'arcMidpoint',
  priority: 60,
  languages: ['vi', 'en'],
  patterns: [ARC_MID, ARC_MID_EN],
  match(ctx) {
    const explicitCircle = resolveCircle(ctx.problem);
    const tri = TRI.exec(ctx.problem);
    const triEnM0 = TRI_EN.exec(ctx.problem);
    // Tam giác để suy circumcircle NGẦM khi đề KHÔNG nêu "(O)" (VN ưu tiên, EN fallback).
    const circumTri: string[] | null = tri
      ? [tri[1], tri[2], tri[3]]
      : triEnM0
        ? [triEnM0[1], triEnM0[2], triEnM0[3]]
        : null;
    // "(O)" tường minh thắng; else circumcircle ngầm của tam giác (tên synth).
    const circle = explicitCircle ?? (circumTri ? synthCircleName(ctx.problem) : undefined);
    if (!circle) return []; // không circle tường minh + không tam giác → escalate
    const usesCircum = !explicitCircle;

    const out: RuleMatch[] = [];
    // Khi dùng circumcircle ngầm, prepend drawCircle(through3) vào arcMidpoint ĐẦU
    // TIÊN dùng nó → circle emit TRƯỚC điểm (transpile resolve ref theo thứ tự).
    let circumEmitted = false;
    const withCircum = (ap: IntentT): IntentT[] => {
      if (usesCircum && !circumEmitted && circumTri) {
        circumEmitted = true;
        return [drawCircle(circle, 'through3', { points: circumTri }), ap];
      }
      return [ap];
    };
    // Circumcircle ngầm chỉ hợp lệ khi 2 đầu mút cung LÀ đỉnh tam giác.
    const arcOnCircum = (a: string, b: string): boolean =>
      !usesCircum || (!!circumTri && circumTri.includes(a) && circumTri.includes(b));

    // Đẩy 1 arcMidpoint (containment đã phân loại). endpoint-cung làm tham chiếu
    // containment ⇒ vô nghĩa → trả false (caller escalate). Trả true nếu emit OK.
    const pushArc = (
      c: { id: number }, name: string, a: string, b: string, ct: Containment,
    ): boolean => {
      if (ct.point === a || ct.point === b) return false; // tham chiếu = đầu mút cung → vô nghĩa
      out.push({
        ruleId: 'arcMidpoint',
        clauseIds: [c.id],
        intents: withCircum(addPoint(name, { kind: 'arcMidpoint', circle, a, b, ...containmentField(ct) })),
      });
      return true;
    };

    for (const c of ctx.clauses) {
      if (!ARC_MID.test(c.text)) continue;

      // Phân phối 2 cung tên 3-CHỮ "M và N … cung ADC và ABC" (C80): cung XYZ =
      // X→Z chứa Y. Chạy TRƯỚC DISTRIB_TWO_ARCS (2-chữ) vì 3-chữ là dạng đặc biệt.
      const twoArcs3 = DISTRIB_TWO_ARCS3.exec(c.text);
      if (twoArcs3) {
        const [, n1, n2, x1, y1, z1, x2, y2, z2] = twoArcs3;
        // mỗi cung: [name, a=X, b=Z, containing=Y]
        const triples: Array<[string, string, string, string]> = [
          [n1, x1, z1, y1],
          [n2, x2, z2, y2],
        ];
        const ok = triples.every(
          ([n, a, b, ct]) =>
            arcOnCircum(a, b) && new Set([a, b, ct]).size === 3 && n !== a && n !== b && n !== ct,
        );
        if (ok) {
          const mark = out.length;
          let good = true;
          for (const [n, a, b, ct] of triples) {
            good = pushArc(c, n, a, b, { rel: 'in', point: ct });
            if (!good) break;
          }
          if (!good) out.length = mark;
        }
        continue;
      }

      // Phân phối 2 cung "N và P … cung AM và cung MB" → zip (chạy TRƯỚC dạng đơn
      // vì ARC_PAIR chỉ bắt cung ĐẦU, bỏ sót điểm thứ hai).
      const twoArcs = DISTRIB_TWO_ARCS.exec(c.text);
      if (twoArcs) {
        const [, n1, n2, a1, b1, a2, b2] = twoArcs;
        const pairs: Array<[string, string, string]> = [
          [n1, a1, b1],
          [n2, a2, b2],
        ];
        const ok = pairs.every(
          ([n, a, b]) => arcOnCircum(a, b) && n !== a && n !== b,
        );
        if (ok) {
          for (const [n, a, b] of pairs) {
            out.push({
              ruleId: 'arcMidpoint',
              clauseIds: [c.id],
              intents: withCircum(addPoint(n, { kind: 'arcMidpoint', circle, a, b })),
            });
          }
        }
        continue;
      }

      const pairM = ARC_PAIR.exec(c.text);
      if (!pairM) continue;
      // "cung lớn <PAIR>" = cung đối (cung dài). Điểm chính giữa cung lớn = đối đỉnh
      // (antipode) của điểm chính giữa cung nhỏ → nằm CÙNG PHÍA dây với tâm O. Dùng
      // cơ chế `containing` sẵn có (sameSide) với tham chiếu thích hợp thay vì defer:
      //   - có "(không) chứa X" tường minh → user đã chỉ rõ cung, dùng containment đó
      //   - có tam giác → cung lớn chứa đỉnh thứ 3 → containing: <đỉnh thứ 3>
      //   - chỉ có dây (vao10:131) → containing: <tâm O> (tâm cùng phía dây với cung lớn)
      // (Kiểm trên match — KHÔNG quét cả clause: clause gộp phẩy có thể chứa "cung
      // lớn" ở định nghĩa khác, vd "M thuộc cung lớn AB, P là … cung AM".)
      const isMajor = !!pairM[1] && /lớn/u.test(pairM[1]);
      const pair = pairFromToken(pairM[2] + pairM[3]);
      if (pair.length !== 2) continue;
      const [a, b] = pair;
      if (!arcOnCircum(a, b)) continue; // circumcircle ngầm: cung phải là 2 đỉnh tam giác

      // --- Phân phối "X, Y lần lượt là … cung BC <containment1> và <containment2>" ---
      const dm = DISTRIB_VN.exec(c.text);
      if (dm) {
        const names = dm[1].split(/\s*,\s*/u).map((s) => s.replace(/['′]/gu, ''));
        const contains = parseContainmentsVN(dm[4]);
        // Zip 1-1: số tên phải = số mệnh đề containment, ≥2. Lệch → escalate (fail-safe).
        if (names.length >= 2 && names.length === contains.length) {
          const mark = out.length;
          let ok = true;
          for (let i = 0; i < names.length && ok; i++) ok = pushArc(c, names[i], a, b, contains[i]);
          if (!ok) out.length = mark; // 1 phần tử lỗi (endpoint cung) → bỏ TOÀN clause
        }
        continue; // clause phân phối: xử lý xong (hoặc escalate), không rơi xuống dạng đơn
      }

      // --- Dạng đơn: tên qua lời dẫn "Gọi/Lấy X là …" ưu tiên, fallback HOA trước cụm ---
      const before = NAME_BEFORE.exec(c.text);
      // Ưu tiên tên CỤC BỘ (ngay trước "chính giữa cung") hơn lời dẫn clause-wide:
      // clause gộp phẩy "I là tâm…, P là điểm chính giữa cung…" → extractPointName
      // bắt nhầm "I"; NAME_BEFORE bắt đúng "P".
      const name = (before ? before[1] : undefined) ?? extractPointName(c.text);
      if (!name) continue; // không trích được tên → bỏ qua

      // Containment: "(không) chứa X" tường minh (lấy mệnh đề đầu), else đỉnh thứ 3 tam giác.
      const conts = parseContainmentsVN(c.text);
      if (conts.length >= 1) {
        // User chỉ rõ cung qua "(không) chứa X" → containment thắng cả cờ lớn/nhỏ.
        pushArc(c, name, a, b, conts[0]);
      } else if (tri) {
        // Có tam giác: cung nhỏ KHÔNG chứa đỉnh thứ 3; cung lớn CHỨA đỉnh thứ 3.
        const third = [tri[1], tri[2], tri[3]].find((v) => v !== a && v !== b);
        if (third) pushArc(c, name, a, b, isMajor ? { rel: 'in', point: third } : { rel: 'not', point: third });
      } else if (isMajor && explicitCircle) {
        // Cung LỚN, chỉ có dây (không tam giác): điểm chính giữa cung lớn nằm CÙNG
        // PHÍA dây với tâm O → containing: <tâm>. Tâm = chữ cái circle (center point
        // giữ tên chữ cái, circle có thể rename → O_c). Cần circle TƯỜNG MINH để có
        // điểm tâm chọn được (vao10:131).
        pushArc(c, name, a, b, { rel: 'in', point: explicitCircle });
      } else {
        // Không "chứa" tường minh + không tam giác + cung nhỏ/không xác định → cung
        // KHÔNG mơ hồ (nửa đường tròn đường kính AB: điểm chính giữa cung = đỉnh duy
        // nhất). arcMidpoint không containment (notContaining/containing optional).
        out.push({
          ruleId: 'arcMidpoint',
          clauseIds: [c.id],
          intents: withCircum(addPoint(name, { kind: 'arcMidpoint', circle, a, b })),
        });
      }
    }

    // --- EN (issue #46 group B) ---------------------------------------------------
    // Tam giác EN để suy notContaining (đỉnh thứ 3) khi đề không nêu "not containing".
    const triEnVerts = triEnM0 ? [triEnM0[1], triEnM0[2], triEnM0[3]] : undefined;

    for (const c of ctx.clauses) {
      if (!ARC_MID_EN.test(c.text)) continue;
      // Vượt scope (mirror VN): "major arc" → cung đối, defer → escalate.
      if (MAJOR_ARC_EN.test(c.text)) continue;

      const pairM = ARC_PAIR_EN.exec(c.text);
      if (!pairM) continue;
      const pair = pairFromToken(pairM[1] + pairM[2]);
      if (pair.length !== 2) continue;
      const [a, b] = pair;
      if (!arcOnCircum(a, b)) continue; // circumcircle ngầm: cung phải là 2 đỉnh tam giác

      // Tên điểm: "M is/be the midpoint of arc" (HOA trước). Không có → bỏ qua.
      const before = NAME_BEFORE_EN.exec(c.text);
      const name = before ? before[1] : undefined;
      if (!name) continue;

      // Containment: "(not) containing X" tường minh (mệnh đề đầu), else đỉnh thứ 3 tam giác EN.
      const conts = parseContainmentsEN(c.text);
      if (conts.length >= 1) {
        pushArc(c, name, a, b, conts[0]);
      } else if (triEnVerts) {
        const third = triEnVerts.find((v) => v !== a && v !== b);
        if (third) pushArc(c, name, a, b, { rel: 'not', point: third });
      }
    }
    return out;
  },
};
