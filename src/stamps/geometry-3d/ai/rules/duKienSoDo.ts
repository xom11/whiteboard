// Mệnh đề KHÔNG cần dựng thêm gì, chỉ cần được "nhận" để coverage đủ:
//  (1) CÂU HỎI đại lượng: "Thể tích khối chóp S.ABC là:", "Khoảng cách giữa AC và SD bằng bao nhiêu"
//      — cùng vai trò mệnh đề "Tính …" (coverage3d.PROOF_ONLY đã bỏ qua), chỉ khác cách hỏi.
//  (2) DỮ KIỆN SỐ ĐO trên khối đã dựng được (khoiDaDien): "SA = a√5", "AB = a, AD = 2a",
//      "SC tạo với đáy một góc 60°", "mặt phẳng (A'BC) tạo với đáy góc 60°".
//      Hình minh hoạ KHÔNG theo tỉ lệ (như SGK) — nhưng chỉ nhận số đo mà hình vẫn đúng loại:
//      góc nhọn giữa đường/mặt với đáy của khối có chân đường cao đã biết. KHÔNG nhận dữ kiện hình
//      dạng ("tam giác ASB vuông", "góc ASB = 60°") hay cạnh bên lăng trụ xiên tạo góc với đáy.
import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { khoiDaDienFromProblem, isRefused, parseKhoiHead } from './khoiDaDien';

const ROUND = /(?:hình|khối|mặt)\s*(?:nón|trụ|cầu)/iu;

const HOI = /^(?:khi\s+đó,?\s*)?(?:hãy\s+)?(?:tính\s+)?(?:thể\s+tích|diện\s+tích|khoảng\s+cách|bán\s+kính|chiều\s+cao|độ\s+dài|côsin|cosin|tỉ\s+số)(?![\p{L}])[^=]*?(?:bằng|là|bao\s+nhiêu[^.;]*|\?|:)\s*[?:.]*\s*$/iu;

const VAL = String.raw`\(?[0-9a-z√()/.,²³π\s]*?[0-9a-z)²³π]\)?(?:\s*(?:cm|dm|m)[²³]?)?`;
const DEG = String.raw`(\d{1,2}(?:[.,]\d+)?)\s*(?:°|độ)`;

function labelsOf(t: string): string[] {
  return [...t.matchAll(/[A-Z](?:')?(?![\p{Ll}])/gu)].map((m) => m[0]);
}

export const duKienSoDoRule: LanguageRule3D = {
  id: 'duKienSoDo',
  priority: 20,
  languages: ['vi'],
  patterns: [/./u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const claimed: number[] = [];
    // Chỉ khi đề có vật thể do rule khác vẽ (khối đa diện / nón / trụ / cầu).
    if (!parseKhoiHead(ctx.problem) && !ROUND.test(ctx.problem)) return [];
    // Nhãn trong câu hỏi phải đã được vẽ (không hỏi về điểm chưa ai vẽ).
    const knownFor = (cid: number): Set<string> => {
      const others = ctx.clauses.filter((o) => o.id !== cid).map((o) => o.text).join(' ').replace(/[’′]/gu, "'");
      const head = parseKhoiHead(ctx.problem);
      return new Set(head
        // khối đa diện: đỉnh khối + điểm được đặt tên ("Gọi M…", "M là…", tâm O do solidRule vẽ)
        ? [...head.base, ...(head.top ?? []), ...(head.apex ? [head.apex] : []),
          ...[...others.matchAll(/(?:Gọi|Lấy|Dựng)\s+(?:điểm\s+)?([A-Z]'?)(?![\p{L}])/gu)].map((m) => m[1]),
          ...[...others.matchAll(/(?<![\p{L}'])([A-Z]'?)\s+là\s/gu)].map((m) => m[1]),
          ...(() => { const k = khoiDaDienFromProblem(ctx.problem); return k && !isRefused(k) && k.center ? [k.center] : []; })()]
        : labelsOf(others));
    };
    const laCauHoi = (t: string, cid: number): boolean => {
      if (!HOI.test(t) || /=/u.test(t) || /thiết\s+diện/iu.test(t)) return false;
      const known = knownFor(cid);
      return labelsOf(t.replace(/[’′]/gu, "'")).every((l) => known.has(l));
    };
    // (1) câu hỏi đại lượng — không kèm giá trị cho trước
    for (const c of ctx.clauses) if (laCauHoi(c.text.trim(), c.id)) claimed.push(c.id);
    // (2) dữ kiện số đo — chỉ khi khối dựng được đúng
    const k = khoiDaDienFromProblem(ctx.problem);
    if (k && !isRefused(k)) {
      const s = k.spec;
      const verts = new Set([...s.baseLabels, ...(s.topLabels ?? []), ...(s.apex ? [s.apex] : [])]);
      const lateral = (a: string, b: string) => s.flavor !== 'pyramid' && s.flavor !== 'tetrahedron'
        && a.replace("'", '') === b.replace("'", '');
      const oblique = !!s.projOf;
      const L = String.raw`([A-Z]'?)([A-Z]'?)`;
      const PL = String.raw`(?:mặt\s+phẳng\s+)?(?:\(([A-Z'\s]{3,9})\)|(?:mặt\s+(?:phẳng\s+)?)?đáy)`;
      const item = [
        // độ dài: "SA = a√5", "cạnh bên SA = a", "AA' = 2a", "chiều cao bằng a", "cạnh bên có độ dài bằng 2a"
        new RegExp(String.raw`^(?:(?:cạnh\s+(?:bên|đáy)|đường\s+cao|chiều\s+cao(?:\s+h)?|độ\s+dài\s+cạnh\s+(?:bên|đáy))\s*)?(?:${L}\s*)?(?:=|bằng|có\s+độ\s+dài\s+(?:bằng\s+)?)\s*${VAL}$`, 'u'),
        new RegExp(String.raw`^${L}\s*=\s*${L}\s*=\s*${VAL}$`, 'u'),
        // góc đường–đáy/mặt: "SC tạo với đáy một góc 60°", "góc giữa SB và (ABCD) bằng 45°"
        new RegExp(String.raw`^(?:đường\s+thẳng\s+|cạnh\s+(?:bên\s+)?)?${L}\s+(?:tạo|hợp)\s+với\s+${PL}\s+(?:một\s+)?góc\s+(?:bằng\s+)?${DEG}$`, 'u'),
        new RegExp(String.raw`^góc\s+(?:giữa|tạo\s+bởi)\s+(?:đường\s+thẳng\s+|cạnh\s+(?:bên\s+)?)?${L}\s+và\s+${PL}\s+(?:bằng|là)\s+${DEG}$`, 'u'),
        // khoảng cách cho trước: "khoảng cách từ A đến mặt phẳng (A'BC) bằng (√6/3)a"
        new RegExp(String.raw`^khoảng\s+cách\s+từ\s+(?:điểm\s+)?([A-Z]'?)\s+đến\s+${PL}\s+bằng\s+${VAL}$`, 'u'),
        // góc mặt–đáy: "mặt phẳng (A'BC) tạo với đáy một góc 60°", "góc giữa (SBC) và đáy bằng 60°"
        new RegExp(String.raw`^(?:mặt\s+phẳng\s+|mặt\s+bên\s+)?\(([A-Z'\s]{3,9})\)\s+(?:tạo|hợp)\s+với\s+${PL}\s+(?:một\s+)?góc\s+(?:bằng\s+)?${DEG}$`, 'u'),
        new RegExp(String.raw`^góc\s+giữa\s+(?:hai\s+)?(?:mặt\s+phẳng\s+)?\(([A-Z'\s]{3,9})\)\s+và\s+${PL}\s+(?:bằng|là)\s+${DEG}$`, 'u'),
      ];
      for (const c of ctx.clauses) {
        if (claimed.includes(c.id)) continue;
        let t = c.text.trim().replace(/^(?:[Bb]iết(?:\s+rằng)?|[Cc]ho|[Vv]ới|[Kk]hi\s+đó)\s+/u, '').replace(/[.;:]\s*$/u, '');
        t = t.replace(/[’′]/gu, "'");
        const parts = t.split(/\s*(?:,|;|\bvà\b)\s*/u).filter(Boolean);
        if (!parts.length) continue;
        const ok = parts.every((part0) => {
          // chữ hoa đầu mệnh đề ("Cạnh bên", "Đường thẳng", "Mặt phẳng", "Góc") → thường; nhãn giữ nguyên
          const part = /^[A-ZĐ]\p{Ll}/u.test(part0) ? part0[0].toLowerCase() + part0.slice(1) : part0;
          if (laCauHoi(part, c.id)) return true; // đuôi câu hỏi "…, thể tích … bằng"
          for (const re of item) {
            const m = re.exec(part);
            if (!m) continue;
            if (!labelsOf(part.replace(/\([^)]*\)/gu, (x) => x)).every((l) => verts.has(l))) return false;
            const deg = /(\d{1,2}(?:[.,]\d+)?)\s*(?:°|độ)/u.exec(part);
            if (deg) {
              const v = Number(deg[1].replace(',', '.'));
              if (!(v > 0 && v < 90)) return false;
              // cạnh bên lăng trụ tạo góc với đáy: hình đứng ⟹ 90° (sai); xiên ⟹ đã có hình chiếu riêng
              const ln = /^(?:đường\s+thẳng\s+|cạnh\s+(?:bên\s+)?|góc\s+(?:giữa|tạo\s+bởi)\s+(?:đường\s+thẳng\s+|cạnh\s+(?:bên\s+)?)?)?([A-Z]'?)([A-Z]'?)/u.exec(part);
              if (ln && lateral(ln[1], ln[2])) return false;
              if (oblique) return false;
            }
            return true;
          }
          return false;
        });
        if (ok) claimed.push(c.id);
      }
    }
    // Phải còn ít nhất một mệnh đề dựng hình (không thì hình rỗng lại "đủ").
    if (claimed.length >= ctx.clauses.length) return [];
    return claimed.length ? [{ ruleId: this.id, clauseIds: claimed, intents: [] }] : [];
  },
};
