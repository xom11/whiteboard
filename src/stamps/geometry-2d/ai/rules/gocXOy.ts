// src/stamps/geometry-2d/ai/rules/gocXOy.ts
//
// Đề lớp 7 xuất phát từ MỘT GÓC có tên tia chữ thường:
//
//   "Cho góc xOy khác góc bẹt, Oz là tia phân giác của góc xOy."
//   "Cho góc nhọn xOy. Trên tia Ox lấy điểm A, trên tia Oy lấy điểm B sao cho OA = OB."
//   "Cho góc xOy = 60°. Trên tia phân giác của góc đó lấy điểm M, từ M hạ các đường
//    vuông góc MA, MB xuống Ox, Oy."
//   "Qua M vẽ đường thẳng vuông góc với Ox tại A, cắt Oy tại C."
//   "Điểm M nằm trong góc đó. Vẽ điểm N sao cho tia Ox là đường trung trực của MN."
//
// Các rule khác chỉ hiểu đoạn/cạnh 2 chữ HOA, nên "Ox" không ai đọc. Rule này dựng
// khung: đỉnh O, điểm mút tia mang ĐÚNG nhãn chữ thường ("x", "y" — như hình SGK),
// hai tia O→x, O→y với số đo góc đề cho (vuông 90°, nhọn 60°, tù 120°, "= α°"), rồi
// tự lo các mệnh đề nhắc tới tia chữ thường. Sau khi có điểm "O","x" thì tham chiếu
// "Ox" ở intent tự giải thành đường O–x (resolveSegmentRef tách 2 điểm đã biết).
//
// Thà thiếu còn hơn sai: mọi điểm dựng CHÍNH XÁC (phân giác đặt đúng θ/2, chân
// vuông góc = perpFoot, OA = OB = pointAtDistance, đối xứng = reflectLine). Mệnh đề
// không nhận ra thì KHÔNG claim → vẽ một phần.
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, connect, drawLine } from './_shared';

const GOC = /[Cc]ho\s+(?:một\s+)?góc\s+(?:(nhọn|vuông|tù)\s+)?([a-z])([A-Z])([a-z])(?![\p{L}\d'′])/u;
const SO_DO = /^\s*(?:\(\s*)?(?:=|bằng|có\s+số\s+đo(?:\s+bằng)?)\s*(\d{1,3})\s*(?:°|độ|o(?!\p{L}))/u;

const R = 8; // độ dài tia vẽ

interface Khung {
  o: string;
  tia: Map<string, number>; // tên tia (chữ thường) → góc (radian)
  theta: number;
  a: string;
  b: string;
}

function docKhung(problem: string): Khung | null {
  const m = GOC.exec(problem);
  if (!m) return null;
  const [, loai, a, o, b] = m;
  if (a === b) return null;
  let deg = loai === 'vuông' ? 90 : loai === 'tù' ? 120 : 60;
  const sd = SO_DO.exec(problem.slice((m.index ?? 0) + m[0].length));
  if (sd) {
    const v = Number(sd[1]);
    if (!(v > 0 && v < 180)) return null;
    if (loai === 'vuông' && v !== 90) return null;
    deg = v;
  }
  const theta = (deg * Math.PI) / 180;
  return { o, tia: new Map([[a, 0], [b, theta]]), theta, a, b };
}

const xy = (ang: number, r = R): [number, number] => [r * Math.cos(ang), r * Math.sin(ang)];

const P = String.raw`([A-Z])(?![\p{L}\d'′])`;

export const gocXOyRule: LanguageRule = {
  id: 'gocXOy',
  priority: 77,
  languages: ['vi'],
  patterns: [/góc\s+(?:(?:nhọn|vuông|tù)\s+)?[a-z][A-Z][a-z](?![\p{L}])/u],
  match(ctx) {
    const k = docKhung(ctx.problem);
    if (!k) return [];
    const { o } = k;
    const out: RuleMatch[] = [];
    const intents: IntentT[] = [
      addPoint(o, { kind: 'free', at: [0, 0] }),
      addPoint(k.a, { kind: 'free', at: xy(0) }),
      addPoint(k.b, { kind: 'free', at: xy(k.theta) }),
      connect(o, k.a, 'ray'),
      connect(o, k.b, 'ray'),
    ];
    const claimed = new Set<number>();
    // Mệnh đề KHÔNG có từ khoá hình ("Điểm M nằm trong góc đó") không vào ctx.clauses
    // nhưng vẫn phải dựng điểm → quét thêm toàn đề (id -1, không claim) SAU các mệnh đề.
    const doan = [...ctx.clauses, { id: -1, text: ctx.problem }];
    const known = new Set<string>([o]); // điểm HOA đã dựng
    const onRay: Record<string, string[]> = {};

    const TIA = String.raw`(?:tia\s+)?${o}([a-z])(?![\p{L}\d'′])`;
    const GOC_NAY = String.raw`(?:góc\s+)?(?:${k.a}${o}${k.b}|${k.b}${o}${k.a}|đó|trên|${o}(?![\p{L}]))`;

    // Tia phân giác có tên: "Oz là tia phân giác của góc xOy" / "Vẽ tia phân giác Oz của góc xOy".
    const PG_TEN = [
      new RegExp(String.raw`(?:[Tt]ia\s+)?${o}([a-z])\s+là\s+(?:tia\s+)?phân\s*giác\s+(?:của\s+)?${GOC_NAY}`, 'u'),
      new RegExp(String.raw`[Vv]ẽ\s+(?:tia\s+)?phân\s*giác\s+${o}([a-z])\s+(?:của\s+)?${GOC_NAY}`, 'u'),
      // "Cho góc xOy và tia phân giác Oz" (góc duy nhất của đề).
      new RegExp(String.raw`góc\s+(?:(?:nhọn|vuông|tù)\s+)?${k.a}${o}${k.b}\s+(?:và|có)\s+(?:tia\s+)?phân\s*giác\s+${o}([a-z])(?![\p{L}\d'′])`, 'u'),
    ];
    // Tia phân giác KHÔNG tên + lấy điểm trên đó: "Trên tia phân giác của góc đó lấy (một) điểm M".
    const PG_DIEM = new RegExp(
      String.raw`[Tt]rên\s+tia\s+phân\s*giác\s+(?:của\s+)?${GOC_NAY}\s+lấy\s+(?:một\s+)?(?:điểm\s+)?${P}`,
      'u',
    );
    const PG_DIEM2 = new RegExp(
      String.raw`${P}\s+(?:là\s+(?:một\s+)?(?:điểm\s+)?(?:bất\s+kì\s+|bất\s+kỳ\s+)?)?(?:thuộc|nằm\s+trên)\s+tia\s+phân\s*giác\s+(?:của\s+)?${GOC_NAY}`,
      'u',
    );
    for (const c of doan) {
      if (GOC.test(c.text)) claimed.add(c.id);
      for (const re of PG_TEN) {
        const m = re.exec(c.text);
        if (m && !k.tia.has(m[1])) {
          k.tia.set(m[1], k.theta / 2);
          intents.push(addPoint(m[1], { kind: 'free', at: xy(k.theta / 2) }), connect(o, m[1], 'ray'));
          claimed.add(c.id);
        } else if (m && k.tia.get(m[1]) === k.theta / 2) claimed.add(c.id);
      }
      for (const re of [PG_DIEM, PG_DIEM2]) {
        const m = re.exec(c.text);
        if (m && !known.has(m[1])) {
          intents.push(addPoint(m[1], { kind: 'free', at: xy(k.theta / 2, R * 0.55) }), connect(o, m[1], 'ray'));
          known.add(m[1]);
          claimed.add(c.id);
        }
      }
    }

    // Điểm nằm trong góc: "Điểm M nằm (bên) trong góc đó" / "Lấy điểm M nằm trong góc xOy".
    const TRONG = new RegExp(String.raw`(?:[Đđ]iểm\s+|[Ll]ấy\s+(?:một\s+)?(?:điểm\s+)?|[Cc]ho\s+(?:điểm\s+)?)${P}\s+(?:nằm\s+)?(?:ở\s+)?(?:bên\s+)?trong\s+${GOC_NAY}`, 'u');
    for (const c of doan) {
      const m = TRONG.exec(c.text);
      if (m && !known.has(m[1])) {
        intents.push(addPoint(m[1], { kind: 'free', at: xy(k.theta * 0.4, R * 0.5) }));
        known.add(m[1]);
        claimed.add(c.id);
      }
    }

    // Điểm trên tia (không tên-tia HOA): "M thuộc tia Oz", "Trên tia Ox lấy điểm A (, B)".
    const place = (ten: string, tia: string, sau?: { p1: string; p2: string }) => {
      if (known.has(ten) || !k.tia.has(tia)) return false;
      const list = (onRay[tia] ??= []);
      if (sau) {
        intents.push(
          addPoint(ten, {
            kind: 'pointAtDistance',
            from: o,
            through: tia,
            origin: 'from',
            distance: { kind: 'segmentLength', p1: sau.p1, p2: sau.p2 },
          }),
        );
      } else {
        const t = [0.35, 0.65, 0.85][list.length] ?? 0.9;
        intents.push(
          addPoint(ten, {
            kind: 'pointAtDistance',
            from: o,
            through: tia,
            origin: 'from',
            distance: { kind: 'literal', value: R * t },
          }),
        );
      }
      list.push(ten);
      known.add(ten);
      return true;
    };

    // Mệnh đề điều kiện "sao cho OA = OB (, OC = OD)" → ghép độ dài.
    const dieuKien = (text: string): Map<string, { p1: string; p2: string }> => {
      const res = new Map<string, { p1: string; p2: string }>();
      const sc = /sao\s+cho\s+(.+)$/u.exec(text);
      if (!sc) return res;
      for (const m of sc[1].matchAll(new RegExp(String.raw`${o}([A-Z])\s*=\s*${o}([A-Z])(?![\p{L}\d'′])`, 'gu'))) {
        res.set(m[2], { p1: o, p2: m[1] }); // vế phải đo theo vế trái
      }
      return res;
    };

    const TREN_TIA = new RegExp(
      String.raw`[Tt]rên\s+tia\s+${o}([a-z])\s+lấy\s+(?:các\s+|hai\s+|một\s+)?(?:điểm\s+)?([A-Z](?:\s*(?:,|và)\s*[A-Z])*)(?![\p{L}\d'′])`,
      'gu',
    );
    const TREN_CAC_TIA = new RegExp(
      String.raw`[Tt]rên\s+(?:các|hai)\s+tia\s+${o}([a-z])\s*(?:,|và)\s*${o}([a-z])\s+(?:lần\s*lượt\s+|theo\s+thứ\s+tự\s+)?lấy\s+(?:các\s+|hai\s+)?(?:điểm\s+)?([A-Z])\s*(?:,|và)\s*([A-Z])(?![\p{L}\d'′])`,
      'u',
    );
    const THUOC_TIA = new RegExp(
      String.raw`(?:[Gg]ọi\s+|[Ll]ấy\s+(?:điểm\s+)?|[Đđ]iểm\s+)?${P}\s+(?:là\s+(?:một\s+)?(?:điểm\s+)?(?:bất\s+kì\s+|bất\s+kỳ\s+)?)?(?:thuộc|nằm\s+trên|trên)\s+(?:tia\s+)?${o}([a-z])(?![\p{L}\d'′])`,
      'gu',
    );
    // Hai lượt: lượt 1 dựng điểm KHÔNG điều kiện, lượt 2 điểm đo theo điểm đã có.
    for (let pass = 0; pass < 2; pass++) {
      for (const c of doan) {
        const dk = dieuKien(c.text);
        const tryPlace = (ten: string, tia: string) => {
          const sau = dk.get(ten);
          if (pass === 0 && sau) return;
          if (pass === 1 && !sau) return;
          if (sau && !known.has(sau.p2)) return;
          if (place(ten, tia, sau)) claimed.add(c.id);
        };
        const cm = TREN_CAC_TIA.exec(c.text);
        if (cm) {
          tryPlace(cm[3], cm[1]);
          tryPlace(cm[4], cm[2]);
        }
        for (const m of c.text.matchAll(TREN_TIA)) {
          for (const ten of m[2].split(/\s*(?:,|và)\s*/u)) tryPlace(ten, m[1]);
        }
        for (const m of c.text.matchAll(THUOC_TIA)) tryPlace(m[1], m[2]);
        // Chỉ có "sao cho OA = OB" mà A, B đều đã đặt từ trước (không mới) → không đụng.
      }
    }

    // Chân vuông góc xuống tia: "MA ⊥ Ox", "MA vuông góc với Ox (tại A)",
    // "hạ các đường vuông góc MA, MB xuống (cạnh) Ox, Oy".
    const VG = String.raw`(?:⊥|vuông\s*góc(?:\s+với)?)`;
    const CHAN = new RegExp(String.raw`(?<![A-Z])([A-Z])([A-Z])(?![\p{L}\d'′])\s*${VG}\s*(?:với\s+)?(?:tia\s+|cạnh\s+)?${o}([a-z])(?![\p{L}\d'′])`, 'gu');
    const HA_CAC = new RegExp(
      String.raw`(?:hạ|kẻ|vẽ)\s+(?:các\s+)?(?:đường\s+)?vuông\s*góc\s+([A-Z])([A-Z])\s*(?:,|và)\s*([A-Z])([A-Z])\s+(?:lần\s*lượt\s+)?(?:xuống|đến|tới|lên)\s+(?:các\s+)?(?:cạnh\s+|tia\s+)?${o}([a-z])\s*(?:,|và)\s*${o}([a-z])(?![\p{L}\d'′])`,
      'gu',
    );
    // "Qua M vẽ đường thẳng (a)? vuông góc với Ox tại A, cắt Oy tại C"
    const QUA_VG = new RegExp(
      String.raw`[Qq]ua\s+(?:điểm\s+)?${P}\s+(?:vẽ|kẻ)\s+(?:đường\s+thẳng\s+)?(?:[a-z]\s+)?vuông\s*góc\s+(?:với\s+)?(?:tia\s+)?${o}([a-z])\s+tại\s+${P}\s*,?\s*(?:cắt\s+(?:tia\s+)?${o}([a-z])\s+(?:tại|ở)\s+${P})?`,
      'gu',
    );
    const VA_VG = new RegExp(
      String.raw`^\s*(?:,\s*)?và\s+(?:vẽ|kẻ)\s+(?:đường\s+thẳng\s+)?(?:[a-z]\s+)?vuông\s*góc\s+(?:với\s+)?(?:tia\s+)?${o}([a-z])\s+tại\s+${P}\s*,?\s*(?:cắt\s+(?:tia\s+)?${o}([a-z])\s+(?:tại|ở)\s+${P})?`,
      'u',
    );
    const chan = (from: string, foot: string, tia: string) => {
      if (!known.has(from) || known.has(foot) || !k.tia.has(tia) || from === foot) return false;
      intents.push(addPoint(foot, { kind: 'perpFoot', from, onLine: `${o}${tia}` }), connect(from, foot, 'segment'));
      known.add(foot);
      return true;
    };
    for (let pass = 0; pass < 2; pass++) {
      for (const c of doan) {
        for (const m of c.text.matchAll(HA_CAC)) {
          const ok1 = m[1] === m[3] && chan(m[1], m[2], m[5]);
          const ok2 = m[1] === m[3] && chan(m[3], m[4], m[6]);
          if (ok1 || ok2) claimed.add(c.id);
        }
        for (const m of c.text.matchAll(QUA_VG)) {
          const [, from, tia1, foot, tia2, cut] = m;
          if (chan(from, foot, tia1)) {
            claimed.add(c.id);
            if (tia2 && cut && k.tia.has(tia2) && !known.has(cut)) {
              intents.push(addPoint(cut, { kind: 'intersection', of: [`${from}${foot}`, `${o}${tia2}`] }), connect(foot, cut, 'segment'));
              known.add(cut);
            }
            // "… và vẽ đường thẳng b vuông góc với Oy tại B, cắt Ox tại D" — cùng điểm qua.
            const tiep = VA_VG.exec(c.text.slice((m.index ?? 0) + m[0].length));
            if (tiep && chan(from, tiep[2], tiep[1]) && tiep[3] && tiep[4] && k.tia.has(tiep[3]) && !known.has(tiep[4])) {
              intents.push(addPoint(tiep[4], { kind: 'intersection', of: [`${from}${tiep[2]}`, `${o}${tiep[3]}`] }), connect(tiep[2], tiep[4], 'segment'));
              known.add(tiep[4]);
            }
          }
        }
        for (const m of c.text.matchAll(CHAN)) if (chan(m[1], m[2], m[3])) claimed.add(c.id);
      }
    }

    // Song song với một tia, chân trên tia kia: "(Từ điểm M …) kẻ MA // Oy (A ∈ Ox)" /
    // "MA song song với Oy, cắt Ox tại A" → A = giao(đường qua M ∥ Oy, Ox).
    const SS = new RegExp(
      String.raw`(?<![A-Z])([A-Z])([A-Z])(?![\p{L}\d'′])\s*(?://|∥|song\s*song(?:\s+với)?)\s*(?:tia\s+)?${o}([a-z])(?![\p{L}\d'′])`,
      'gu',
    );
    for (let pass = 0; pass < 2; pass++) {
      for (const c of doan) {
        for (const m of c.text.matchAll(SS)) {
          const [, from, moi, tiaSS] = m;
          if (!known.has(from) || known.has(moi) || !k.tia.has(tiaSS)) continue;
          const chanTren =
            new RegExp(String.raw`${moi}\s*∈\s*(?:tia\s+)?${o}([a-z])(?![\p{L}\d'′])`, 'u').exec(c.text) ??
            new RegExp(String.raw`cắt\s+(?:tia\s+)?${o}([a-z])\s+(?:tại|ở)\s+${moi}(?![\p{L}\d'′])`, 'u').exec(c.text);
          const tiaKia = chanTren?.[1];
          if (!tiaKia || tiaKia === tiaSS || !k.tia.has(tiaKia)) continue;
          const line = `par${from}${moi}`;
          intents.push(
            drawLine(line, 'parallelThrough', { through: from, to: `${o}${tiaSS}` }),
            addPoint(moi, { kind: 'intersection', of: [line, `${o}${tiaKia}`] }),
            connect(from, moi, 'segment'),
          );
          known.add(moi);
          claimed.add(c.id);
        }
      }
    }

    // Đối xứng qua tia: "(tia) Ox là (đường) trung trực của (đoạn) MN" → N = đối xứng M qua Ox.
    const TRUC = new RegExp(String.raw`(?:tia\s+)?${o}([a-z])\s+là\s+(?:đường\s+)?trung\s*trực\s+(?:của\s+)?(?:đoạn\s+(?:thẳng\s+)?)?([A-Z])([A-Z])(?![\p{L}\d'′])`, 'gu');
    for (const c of doan) {
      for (const m of c.text.matchAll(TRUC)) {
        const [, tia, p, q] = m;
        if (!k.tia.has(tia)) continue;
        const [goc, moi] = known.has(p) && !known.has(q) ? [p, q] : known.has(q) && !known.has(p) ? [q, p] : ['', ''];
        if (!goc) continue;
        intents.push(addPoint(moi, { kind: 'reflectLine', of: goc, through: `${o}${tia}` }), connect(goc, moi, 'segment'));
        known.add(moi);
        claimed.add(c.id);
      }
    }

    // Giao với tia: "AB cắt (tia) Oz tại H".
    const CAT = new RegExp(String.raw`(?<![A-Z])([A-Z])([A-Z])(?![\p{L}\d'′])\s+cắt\s+${TIA}\s+(?:tại|ở)\s+(?:điểm\s+)?${P}`, 'gu');
    for (const c of doan) {
      for (const m of c.text.matchAll(CAT)) {
        const [, p, q, tia, ten] = m;
        if (!k.tia.has(tia) || known.has(ten) || ten === p || ten === q) continue;
        intents.push(addPoint(ten, { kind: 'intersection', of: [`${p}${q}`, `${o}${tia}`] }), connect(p, q, 'segment'));
        known.add(ten);
        claimed.add(c.id);
      }
    }

    // Tia phân giác (không tên) cắt đoạn nối hai điểm trên hai cạnh góc:
    // "Tia phân giác của góc xOy cắt AB tại C" (A ∈ Ox, B ∈ Oy) → C = chân phân giác
    // từ O xuống AB (góc AOB chính là góc xOy).
    const PG_CAT = new RegExp(
      String.raw`[Tt]ia\s+phân\s*giác\s+(?:của\s+)?${GOC_NAY}\s+cắt\s+(?:đoạn\s+(?:thẳng\s+)?)?([A-Z])([A-Z])(?![\p{L}\d'′])\s+(?:tại|ở)\s+(?:điểm\s+)?${P}`,
      'gu',
    );
    const tren = (ten: string, tia: string) => (onRay[tia] ?? []).includes(ten);
    for (const c of doan) {
      for (const m of c.text.matchAll(PG_CAT)) {
        const [, p, q, ten] = m;
        const ok = (tren(p, k.a) && tren(q, k.b)) || (tren(p, k.b) && tren(q, k.a));
        if (!ok || known.has(ten)) continue;
        intents.push(addPoint(ten, { kind: 'angleBisectorFoot', from: o, onLine: `${p}${q}` }), connect(o, ten, 'segment'), connect(p, q, 'segment'));
        known.add(ten);
        claimed.add(c.id);
      }
    }

    claimed.delete(-1);
    if (claimed.size === 0) return [];
    out.push({ ruleId: 'gocXOy', clauseIds: [...claimed], intents });
    return out;
  },
};
