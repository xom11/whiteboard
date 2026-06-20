// src/stamps/geometry-2d/ai/rules/reflection.ts
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, extractPointName } from './_shared';

// LƯU Ý: \b của JS dựa trên ASCII word-char nên KHÔNG khớp quanh ký tự Việt
// ("đ","ề"…). Mọi regex chứa ký tự Việt dùng cờ 'u' + tránh \b.

// Prefilter toàn đề: "đối xứng" (cho phép viết liền "đốixứng" hiếm gặp → giữ \s*).
const REFLECT = /đối\s*xứng/u;

// Dạng A: tên điểm ĐỨNG TRƯỚC.
//   "D đối xứng (với) H qua BC"
//   "D là (điểm) đối xứng (của|với) H qua (đường thẳng|cạnh|trục) <Z>"
//   "M' là điểm đối xứng của M qua AB"   (tên ẢNH CÓ PRIME)
// PRIME phải nằm TRONG group bắt tên (ảnh M') + group gốc (M') — nếu để
// (?:['′]?) non-capturing thì "M'" → "M", sinh phụ thuộc vòng M→M (d80:10).
// normalizePointName chuẩn hoá ′→' để đồng bộ naming layer.
const PT = `[A-Z](?:['′])?`;
// GLOBAL ('gu'): 1 clause có thể chứa NHIỀU "X là điểm đối xứng của Y qua Z"
// ("P là điểm đối xứng với M qua OO', Q là điểm đối xứng với N qua OO'" — httcd:26).
// matchAll emit từng phản xạ. Clause 1-phản-xạ → 1 match (như exec cũ → additive).
const NAME_BEFORE = new RegExp(
  `(${PT})\\s+(?:là\\s+)?(?:điểm\\s+)?đối\\s*xứng\\s+(?:của\\s+|với\\s+)?(?:điểm\\s+)?(${PT})\\s+qua\\s+(?:đường\\s*thẳng\\s+|cạnh\\s+|đoạn\\s+|trục\\s+|trung\\s*điểm\\s+|tâm\\s+|điểm\\s+)?([A-Za-z][A-Za-z′']?)`,
  'gu',
);

// Dạng phân phối: "P, Q lần lượt (là điểm)? đối xứng (của|với) (điểm)? A qua L1, L2"
//   → P = đối xứng A qua L1; Q = đối xứng A qua L2 (CÙNG gốc A, 2 trục/điểm).
const DISTRIB = new RegExp(
  `(${PT})\\s*,\\s*(${PT})\\s+lần\\s*lượt\\s+(?:là\\s+)?(?:điểm\\s+)?đối\\s*xứng\\s+(?:của\\s+|với\\s+)?(?:điểm\\s+)?(${PT})\\s+qua\\s+([A-Za-z]{1,2})(?:['′]?)\\s*(?:,|và)\\s*([A-Za-z]{1,2})(?:['′]?)`,
  'u',
);

// Synonym "lần lượt": "lần lượt" / "tương ứng" / "(theo) thứ tự".
const LL = `(?:lần\\s*lượt|tương\\s*ứng|(?:theo\\s+)?thứ\\s+tự)`;

// Dạng phân phối ĐA NGUỒN: "X, Y (lần lượt)? đối xứng (với|của) P, Q (lần lượt)? qua L1, L2"
//   → X = đối xứng P qua L1; Y = đối xứng Q qua L2 (zip 3 danh sách tên/nguồn/trục 1-1-1).
// "lần lượt" có thể đứng TRƯỚC "đối xứng" HOẶC sau danh sách nguồn (trước "qua").
// PHẢI có ≥2 NGUỒN (phân biệt DISTRIB 1-nguồn-2-trục — clause 1 nguồn rơi xuống đó).
const NAMES_BLOB = `(${PT}(?:\\s*(?:,|và)\\s*${PT})+)`;
const SRCS_BLOB = `(${PT}(?:\\s*(?:,|và)\\s*${PT})+)`;
const MIRRORS_BLOB = `([A-Za-z]{1,2}(?:['′]?)(?:\\s*(?:,|và)\\s*[A-Za-z]{1,2}(?:['′]?))+)`;
const DISTRIB_MULTI = new RegExp(
  `${NAMES_BLOB}\\s+(?:${LL}\\s+)?(?:là\\s+)?(?:các\\s+)?(?:điểm\\s+)?đối\\s*xứng\\s+(?:của\\s+|với\\s+)?(?:điểm\\s+)?${SRCS_BLOB}\\s+(?:${LL}\\s+)?qua\\s+${MIRRORS_BLOB}`,
  'u',
);

function splitList(blob: string): string[] {
  return blob
    .split(/\s*,\s*|\s+và\s+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Dạng B: KHÔNG có tên dẫn trước "đối xứng" (lấy tên từ lời dẫn "Gọi/Lấy …").
//   "Gọi D là điểm đối xứng của H qua BC"
//   "Lấy điểm đối xứng của H qua M"
const NAME_AFTER = new RegExp(
  `(?:điểm\\s+)?đối\\s*xứng\\s+(?:của\\s+|với\\s+)?(?:điểm\\s+)?(${PT})\\s+qua\\s+(?:đường\\s*thẳng\\s+|cạnh\\s+|đoạn\\s+|trục\\s+|trung\\s*điểm\\s+|tâm\\s+|điểm\\s+)?([A-Za-z][A-Za-z′']?)`,
  'u',
);

function normalizePointName(name: string): string {
  return name.replace(/['′]/gu, "'");
}

// === EN (issue #46 group B) ===
// "<Name> is/be the reflection of <Of> (over|across|in|about|through) (the)? (line|point|segment)? <Z>"
// Name đứng TRƯỚC (qua "is"/"be the" — gồm "Let D be the reflection..."). KHÔNG cờ 'i'.
// (?<![A-Za-z]) đảm bảo Name là nhãn đơn. Z phân loại bằng classifyThrough (reuse).
const REFLECT_EN =
  /(?<![A-Za-z])([A-Z])(?:['′]?)\s+(?:is|be)\s+the\s+reflection\s+of\s+([A-Z])(?:['′]?)\s+(?:over|across|in|about|through)\s+(?:the\s+)?(?:line\s+|point\s+|segment\s+)?([A-Za-z][A-Za-z′']?)/u;
const REFLECT_EN_PRE = /[Rr]eflection/u;

// Phân loại token Z (đã strip dấu phẩy/′):
//   "M"  → điểm (1 ký tự HOA)              → reflectPoint
//   "BC" → đường (cặp 2 ký tự HOA)         → reflectLine
//   "d"  → đường (tên đường, chữ thường)   → reflectLine
function classifyThrough(raw: string): { kind: 'point' | 'line'; value: string } | undefined {
  const z = raw.replace(/['′]/gu, '').trim();
  if (/^[A-Z]$/u.test(z)) return { kind: 'point', value: z };
  if (/^[A-Z][A-Z]$/u.test(z)) return { kind: 'line', value: z };
  // tên đường thẳng chữ thường (d, d1, a, xy…) → đường
  if (/^[a-z][A-Za-z0-9]*$/u.test(z)) return { kind: 'line', value: z };
  return undefined;
}

/**
 * Đối xứng (Cụm A reflection):
 *   "D đối xứng H qua BC"          → reflectLine  (qua ĐƯỜNG: cặp đỉnh BC / tên đường d)
 *   "Q đối xứng P qua M"           → reflectPoint (qua ĐIỂM: 1 ký tự HOA)
 *   "D là điểm đối xứng của H qua đường thẳng d" → reflectLine (through='d')
 *
 * name (điểm ảnh) = ký tự HOA đứng trước "đối xứng" (dạng A) hoặc lời dẫn
 * "Gọi/Lấy …" (dạng B). of = điểm gốc (X). through = Z, phân loại bằng
 * classifyThrough. Không trích đủ name / of / through hợp lệ → BỎ QUA clause
 * (đừng bịa tên) để pipeline escalate AI.
 */
export const reflectionRule: LanguageRule = {
  id: 'reflection',
  priority: 55,
  languages: ['vi', 'en'],
  patterns: [REFLECT, REFLECT_EN_PRE],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      if (!REFLECT.test(c.text) && !REFLECT_EN_PRE.test(c.text)) continue;

      // Phân phối ĐA NGUỒN "X,Y đối xứng P,Q qua L1,L2" — xử lý TRƯỚC nhất (≥2 nguồn).
      // zip name/source/mirror 1-1-1; số phần tử PHẢI bằng nhau (≥2) & mọi trục
      // phân loại hợp lệ, else bỏ qua → rơi xuống DISTRIB 1-nguồn.
      const dmm = DISTRIB_MULTI.exec(c.text);
      if (dmm) {
        const names = splitList(dmm[1]).map(normalizePointName);
        const srcs = splitList(dmm[2]).map(normalizePointName);
        const mirrors = splitList(dmm[3]);
        if (names.length >= 2 && names.length === srcs.length && names.length === mirrors.length) {
          const through = mirrors.map(classifyThrough);
          if (through.every((t): t is { kind: 'point' | 'line'; value: string } => !!t)) {
            out.push({
              ruleId: 'reflection',
              clauseIds: [c.id],
              intents: names.map((nm, i) =>
                addPoint(
                  nm,
                  through[i].kind === 'point'
                    ? { kind: 'reflectPoint', of: srcs[i], through: through[i].value }
                    : { kind: 'reflectLine', of: srcs[i], through: through[i].value },
                ),
              ),
            });
            continue;
          }
        }
      }

      // Phân phối "P, Q lần lượt đối xứng A qua L1, L2" — xử lý TRƯỚC (NAME_BEFORE
      // sẽ chỉ bắt được P). Cả 2 trục phân loại bằng classifyThrough.
      const dm = DISTRIB.exec(c.text);
      if (dm) {
        const [n1, n2, ofPt, raw1, raw2] = [
          normalizePointName(dm[1]),
          normalizePointName(dm[2]),
          normalizePointName(dm[3]),
          dm[4],
          dm[5],
        ];
        const t1 = classifyThrough(raw1);
        const t2 = classifyThrough(raw2);
        if (t1 && t2) {
          const mk = (nm: string, t: { kind: 'point' | 'line'; value: string }) =>
            t.kind === 'point'
              ? { kind: 'reflectPoint', of: ofPt, through: t.value }
              : { kind: 'reflectLine', of: ofPt, through: t.value };
          out.push({
            ruleId: 'reflection',
            clauseIds: [c.id],
            intents: [addPoint(n1, mk(n1, t1)), addPoint(n2, mk(n2, t2))],
          });
          continue;
        }
      }

      // NAME_BEFORE GLOBAL: emit MỌI "X là điểm đối xứng của Y qua Z" trong clause.
      NAME_BEFORE.lastIndex = 0;
      const befores = [...c.text.matchAll(NAME_BEFORE)];
      if (befores.length) {
        for (const b of befores) {
          const nm = normalizePointName(b[1]);
          const ofP = normalizePointName(b[2]);
          const thr = classifyThrough(b[3]);
          if (!thr) continue;
          out.push({
            ruleId: 'reflection',
            clauseIds: [c.id],
            intents: [
              addPoint(
                nm,
                thr.kind === 'point'
                  ? { kind: 'reflectPoint', of: ofP, through: thr.value }
                  : { kind: 'reflectLine', of: ofP, through: thr.value },
              ),
            ],
          });
        }
        continue;
      }

      let name: string | undefined;
      let of: string | undefined;
      let throughRaw: string | undefined;

      {
        const after = NAME_AFTER.exec(c.text);
        if (after) {
          // Không có tên đứng trước → lấy từ lời dẫn ("Gọi D là …").
          name = extractPointName(c.text);
          of = normalizePointName(after[1]);
          throughRaw = after[2];
        } else {
          // --- EN (issue #46 group B) — chỉ chạy khi cả 2 dạng VN fail. ---
          const en = REFLECT_EN.exec(c.text);
          if (en) {
            name = normalizePointName(en[1]);
            of = normalizePointName(en[2]);
            throughRaw = en[3];
          }
        }
      }

      if (!name || !of || !throughRaw) continue;

      const through = classifyThrough(throughRaw);
      if (!through) continue;

      const constraint =
        through.kind === 'point'
          ? { kind: 'reflectPoint', of, through: through.value }
          : { kind: 'reflectLine', of, through: through.value };

      out.push({
        ruleId: 'reflection',
        clauseIds: [c.id],
        intents: [addPoint(name, constraint)],
      });
    }
    return out;
  },
};
