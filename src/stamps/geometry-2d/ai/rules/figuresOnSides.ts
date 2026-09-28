// src/stamps/geometry-2d/ai/rules/figuresOnSides.ts
//
// Hình vuông / tam giác đều / tam giác vuông cân DỰNG RA PHÍA NGOÀI trên cạnh của một
// đa giác đã có — dạng kinh điển lớp 8–10 và HSG:
//   "Cho hình bình hành ABCD. Vẽ về phía ngoài hình bình hành hai hình vuông ABEF và ADGH."
//   "Cho tam giác nhọn ABC. Vẽ ra phía ngoài các tam giác ABD và tam giác ACE vuông cân tại A."
//   "Về phía ngoài tam giác ABC dựng các tam giác đều ABM, ACN."
// Đỉnh mới = tổ hợp affine + phần quay 90° của hai đỉnh cạnh chung (constraint 'affine'
// với rot/awayFrom): kéo đa giác gốc, hình vẫn là hình vuông / tam giác đều, vẫn ở
// phía ngoài. Trước đây quad/triangle đặt các hình này theo HÌNH MẪU với hai đỉnh chung
// đã có ⇒ "hình vuông" không còn vuông, hình thứ hai trong danh sách mất hẳn.
//
// Chỉ nhận khi: đa giác gốc khai báo TRƯỚC, hai đỉnh chung là hai đỉnh KỀ nhau của nó,
// các đỉnh còn lại là điểm mới. "phía trong" ⇒ bỏ qua (không đoán).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, markShape } from './_shared';

const S3 = Math.sqrt(3) / 2;
const GOC =
  /(?:tam\s*giác|tứ\s+giác|[Hh]ình\s+(?:vuông|chữ\s+nhật|bình\s+hành|thoi|thang(?:\s+(?:cân|vuông))?))\s+(?:(?:nhọn|tù|vuông|cân|đều)\s+)?([A-Z]{3,4})(?![A-Z])/u;
const VUONG = /[Hh]ình\s+vuông\s+([A-Z]{4}(?:\s*(?:,|và)\s*[A-Z]{4}(?![A-Z]))*)(?![A-Z])/gu;
// "(các) tam giác (đều) ABD (và (tam giác)? ACE)* (đều | vuông cân tại A)"
const TAM_GIAC = new RegExp(
  String.raw`tam\s*giác\s+(đều\s+)?([A-Z]{3}(?:\s*(?:,|và)\s*(?:tam\s*giác\s+)?[A-Z]{3}(?![A-Z]))*)(?![A-Z])` +
    String.raw`(?:\s+(?:lần\s*lượt\s+)?(đều|vuông\s+cân\s+(?:lần\s*lượt\s+)?tại\s+([A-Z](?:\s*(?:,|và)\s*[A-Z])*)))?`,
  'gu',
);

export interface HinhTrenCanh {
  ten: string;
  intents: IntentT[];
}

/** Mọi hình dựng trên cạnh đa giác gốc tìm được trong đề (theo thứ tự text). */
export function hinhDungTrenCanh(problem: string): HinhTrenCanh[] {
  if (/phía\s+trong/u.test(problem)) return [];
  const g = GOC.exec(problem);
  if (!g) return [];
  const goc = [...g[1]];
  const sauGoc = problem.slice(g.index + g[0].length);
  const ke = (x: string, y: string) => {
    const i = goc.indexOf(x);
    const j = goc.indexOf(y);
    if (i < 0 || j < 0 || i === j) return false;
    return goc.length === 3 || Math.abs(i - j) === 1 || Math.abs(i - j) === goc.length - 1;
  };
  const khac = (x: string, y: string) => goc.find((v) => v !== x && v !== y)!;
  const out: HinhTrenCanh[] = [];

  // Điểm mới P = a·X + b·Y + J(r·(Y − X)), phía khác đỉnh T của đa giác gốc.
  const diem = (P: string, X: string, Y: string, a: number, b: number, r: number) =>
    addPoint(P, { kind: 'affine', points: [X, Y], weights: [a, b], rot: [-r, r], awayFrom: khac(X, Y) });

  for (const m of sauGoc.matchAll(VUONG)) {
    for (const ten of m[1].split(/\s*,\s*|\s+và\s+/u)) {
      const [X, Y, Z, W] = ten;
      if (!ke(X, Y) || goc.includes(Z) || goc.includes(W) || Z === W) continue;
      // Hình vuông XYZW: Z = Y + J(Y − X), W = X + J(Y − X).
      out.push({ ten, intents: [diem(Z, X, Y, 0, 1, 1), diem(W, X, Y, 1, 0, 1), markShape('quadrilateral', [X, Y, Z, W])] });
    }
  }
  for (const m of sauGoc.matchAll(TAM_GIAC)) {
    const ds = m[2].split(/\s*,\s*|\s+và\s+/u).map((t) => t.replace(/tam\s*giác\s+/u, '').trim());
    const deu = !!m[1] || m[3] === 'đều';
    const dinhVuong = m[4]?.split(/\s*,\s*|\s+và\s+/u);
    if (!deu && !dinhVuong) continue;
    ds.forEach((ten, i) => {
      const moi = [...ten].filter((v) => !goc.includes(v));
      const cu = [...ten].filter((v) => goc.includes(v));
      if (moi.length !== 1 || cu.length !== 2 || !ke(cu[0], cu[1])) return;
      const [X, Y] = cu;
      const N = moi[0];
      let it: IntentT | null = null;
      if (deu) it = diem(N, X, Y, 0.5, 0.5, S3);
      else {
        const V = dinhVuong!.length === ds.length ? dinhVuong![i] : dinhVuong![0];
        if (V === X) it = diem(N, X, Y, 1, 0, 1); // vuông cân tại X: N = X + J(Y − X)
        else if (V === Y) it = diem(N, Y, X, 1, 0, 1); // vuông cân tại Y: N = Y + J(X − Y)
        else if (V === N) it = diem(N, X, Y, 0.5, 0.5, 0.5); // huyền XY
      }
      if (it) out.push({ ten, intents: [it, markShape('triangle', [...ten])] });
    });
  }
  return out;
}

export const figuresOnSidesRule: LanguageRule = {
  id: 'figuresOnSides',
  priority: 99,
  languages: ['vi'],
  patterns: [/phía\s+ngoài|bên\s+ngoài/u],
  match(ctx) {
    if (!/phía\s+ngoài|bên\s+ngoài/u.test(ctx.problem)) return [];
    const hinh = hinhDungTrenCanh(ctx.problem);
    if (hinh.length === 0) return [];
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const intents = hinh
        .filter((h) => new RegExp(`(?<![A-Z])${h.ten}(?![A-Z])`, 'u').test(c.text))
        .flatMap((h) => h.intents);
      if (intents.length) out.push({ ruleId: 'figuresOnSides', clauseIds: [c.id], intents });
    }
    return out;
  },
};

/** Tên các hình mà figuresOnSides dựng (quad/triangle bỏ qua, không đặt hình mẫu). */
export function tenHinhTrenCanh(problem: string): Set<string> {
  if (!/phía\s+ngoài|bên\s+ngoài/u.test(problem)) return new Set();
  return new Set(hinhDungTrenCanh(problem).map((h) => h.ten));
}
