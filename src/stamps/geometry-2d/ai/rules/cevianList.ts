// src/stamps/geometry-2d/ai/rules/cevianList.ts
//
// DANH SÁCH đường trung tuyến / phân giác (trong) / đường cao nối bằng "và" —
// dạng rất hay gặp ở đề lớp 7 mà `cevian` (chỉ tách danh sách bằng DẤU PHẨY)
// bỏ sót cặp thứ hai:
//
//   "Cho tam giác ABC cân tại A có hai đường trung tuyến BD và CE cắt nhau tại G"
//   "CP, BQ là các đường phân giác trong của tam giác ABC"  (dạng tên-trước)
//   "BD và CE là hai đường cao của tam giác ABC"
//
// → mỗi cặp (đỉnh + chân) = add-point chân (midpoint / angleBisectorFoot /
//   perpFoot trên cạnh đối diện) + connect đoạn đỉnh–chân. Cùng intent với
//   `cevian` nên cặp nào `cevian` đã phát thì dedup JSON, không mâu thuẫn.
//
// Thà thiếu còn hơn sai: đỉnh phải là đỉnh tam giác, chân KHÔNG trùng đỉnh, các
// đỉnh trong danh sách phải KHÁC nhau (hai trung tuyến cùng từ A là vô nghĩa), và
// "phân giác NGOÀI" bị loại (cần dựng khác).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

const TRI = /tam\s*giác(?:\s+(?:vuông|cân|đều|nhọn|tù))?\s+([A-Z])([A-Z])([A-Z])(?![A-Z])/u;

const PAIR = String.raw`[A-Z][A-Z](?![A-Z'′])`;
// Ít nhất 2 cặp, nối bằng "," hoặc "và". Dạng tên-sau BẮT BUỘC có "và" (danh sách
// chỉ-phẩy tên-sau là việc của `cevian`) — kiểm sau khi khớp.
const LIST = String.raw`(${PAIR}(?:\s*(?:,|và)\s*${PAIR})+)`;
const KIND = String.raw`(trung\s*tuyến|phân\s*giác(?:\s+trong)?|đường\s*cao)`;

// Tên-sau: "(hai|ba|các) (đường) trung tuyến BD và CE"
const FORWARD = new RegExp(
  String.raw`(?<![\p{L}])([Tt]rung\s*tuyến|[Pp]hân\s*giác(?:\s+trong)?|[Đđ]ường\s*cao)\s+` + LIST,
  'gu',
);
// Tên-trước: "CP, BQ là (các|hai) (đường) phân giác (trong)" — (?!\s+ngoài).
const REVERSE = new RegExp(
  String.raw`(?<![A-Z])` + LIST + String.raw`\s+(?:lần\s*lượt\s+)?là\s+(?:các\s+|hai\s+|ba\s+)?(?:đường\s*|tia\s+)?` +
    KIND + String.raw`(?!\s*ngoài)(?!\p{L})`,
  'gu',
);

// Hai loại khác nhau, phân phối: "AI và AM lần lượt là đường cao và đường trung tuyến"
const HON_HOP = new RegExp(
  String.raw`(?<![A-Z])([A-Z])([A-Z])\s*(?:,|và)\s*([A-Z])([A-Z])(?![A-Z'′])\s+(?:lần\s*lượt|theo\s+thứ\s+tự)\s+là\s+(?:các\s+)?(?:đường\s*|tia\s+)?` +
    KIND + String.raw`(?!\s*ngoài)\s*(?:,|và)\s*(?:đường\s*|tia\s+)?` + KIND + String.raw`(?!\s*ngoài)(?!\p{L})`,
  'gu',
);

type Kind = 'median' | 'bisector' | 'altitude';
function kindOf(word: string): Kind {
  if (/trung/iu.test(word)) return 'median';
  if (/phân/iu.test(word)) return 'bisector';
  return 'altitude';
}

export const cevianListRule: LanguageRule = {
  id: 'cevianList',
  // Ngang `cevian` (60): intent trùng thì dedup; chân mới thì first-wins không đụng.
  priority: 60,
  languages: ['vi'],
  patterns: [/(?:trung\s*tuyến|phân\s*giác|đường\s*cao)/iu],
  match(ctx) {
    const tm = TRI.exec(ctx.problem);
    if (!tm) return [];
    const tri = [tm[1], tm[2], tm[3]];
    const out: RuleMatch[] = [];
    const seenFoot = new Map<string, string>(); // foot → key (apex|kind)

    for (const c of ctx.clauses) {
      const hits: Array<{ kind: Kind; list: string; after: string; rev: boolean }> = [];
      for (const m of c.text.matchAll(FORWARD)) {
        const after = c.text.slice((m.index ?? 0) + m[0].length);
        hits.push({ kind: kindOf(m[1]), list: m[2], after, rev: false });
      }
      for (const m of c.text.matchAll(REVERSE)) hits.push({ kind: kindOf(m[2]), list: m[1], after: '', rev: true });
      for (const m of c.text.matchAll(HON_HOP)) {
        const [, a1, f1, a2, f2, k1, k2] = m;
        if (kindOf(k1) === kindOf(k2) || f1 === f2) continue;
        hits.push({ kind: kindOf(k1), list: a1 + f1, after: '', rev: true });
        hits.push({ kind: kindOf(k2), list: a2 + f2, after: '', rev: true });
      }

      for (const h of hits) {
        // Tên-sau chỉ-phẩy là việc của `cevian`; tên-trước thì `cevian` chỉ nhận đường cao.
        if (!h.rev && !/và/u.test(h.list)) continue;
        // "phân giác BD và CE ngoài"? hiếm; chặn "ngoài" ngay sau danh sách.
        if (h.kind === 'bisector' && /^\s*ngoài/u.test(h.after)) continue;
        const pairs = h.list.split(/\s*(?:,|và)\s*/u).map((s) => s.trim()).filter(Boolean);
        const apexes = pairs.map((p) => p[0]);
        if (new Set(apexes).size !== apexes.length) continue;
        const ok = pairs.every((p) => tri.includes(p[0]) && !tri.includes(p[1]));
        if (!ok) continue;
        const intents = [];
        let conflict = false;
        for (const p of pairs) {
          const [apex, foot] = [p[0], p[1]];
          const key = `${apex}|${h.kind}`;
          const prev = seenFoot.get(foot);
          if (prev && prev !== key) conflict = true;
          seenFoot.set(foot, key);
          const opp = tri.filter((v) => v !== apex).join('');
          const constraint =
            h.kind === 'median'
              ? { kind: 'midpoint', of: opp }
              : h.kind === 'bisector'
                ? { kind: 'angleBisectorFoot', from: apex, onLine: opp }
                : { kind: 'perpFoot', from: apex, onLine: opp };
          intents.push(addPoint(foot, constraint), connect(apex, foot, 'segment'));
        }
        if (conflict) return []; // một tên chân hai nghĩa → không đoán
        out.push({ ruleId: 'cevianList', clauseIds: [c.id], intents });
      }
    }
    return out;
  },
};
