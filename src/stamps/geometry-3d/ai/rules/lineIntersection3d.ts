import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { addPoint3d, connect3d, splitVertexToken, residualHasGeometry, parseSolidHead3D } from './_shared';

// Giao điểm 2 đường ĐỒNG PHẲNG (constraint intersectionLines) + tâm hình bình hành đáy:
//   "O là tâm (của) (mặt) đáy" | "hình vuông ABCD tâm O" | "O là giao điểm (của) hai đường chéo"
//   "O là giao điểm của AC và BD" | "AC cắt BD tại O" | "AC và BD cắt nhau tại O"
//   "O = AC ∩ BD" | "AC ∩ BD = O"
// Hai đường chéo nhau thì intersectionLines trả trung điểm đoạn ⊥ chung — verify3d từ chối
// (không có giao điểm thật). Vẽ kèm 4 đoạn đầu-mút → giao điểm (đường chéo đáy, hoặc phần kéo dài
// khi giao nằm ngoài đoạn, vd AB ∩ CD của hình thang).
const P = "[A-Z](?:['′])?";
const NM = "([A-Z](?:['′]|\\d)?)";
const LINE = `(${P})(${P})`;

const RES: Array<{ re: RegExp; kind: 'center' | 'lines' }> = [
  { re: new RegExp(`(?<![\\p{L}'′])${NM}\\s+là\\s+tâm\\s+(?:của\\s+)?(?:mặt\\s+)?đáy(?:\\s+((?:${P}){4}))?`, 'u'), kind: 'center' },
  { re: new RegExp(`hình\\s+(?:vuông|chữ\\s+nhật|thoi|bình\\s+hành)\\s+(?:((?:${P}){4})\\s+)?(?:có\\s+)?tâm\\s+(?:là\\s+)?${NM}(?![\\p{L}'′\\d])`, 'u'), kind: 'center' },
  // "đáy ABCD là hình bình hành, tâm O" (tâm tách bằng dấu phẩy)
  { re: new RegExp(`đáy\\s+(?:((?:${P}){4})\\s+)?là\\s+hình\\s+(?:vuông|chữ\\s+nhật|thoi|bình\\s+hành)\\s*,\\s*(?:có\\s+)?tâm\\s+(?:là\\s+)?${NM}(?![\\p{L}'′\\d])`, 'u'), kind: 'center' },
  { re: new RegExp(`(?<![\\p{L}'′])${NM}\\s+là\\s+giao\\s+điểm\\s+(?:của\\s+)?hai\\s+đường\\s+chéo(?:\\s+(?:của\\s+)?(?:mặt\\s+)?(?:đáy|hình\\s+[a-zà-ỹ\\s]+?)?\\s*((?:${P}){4})?)?`, 'u'), kind: 'center' },
  { re: new RegExp(`(?<![\\p{L}'′])${NM}\\s+là\\s+giao\\s+điểm\\s+(?:của\\s+)?(?:(?:hai\\s+)?đường\\s+thẳng\\s+)?${LINE}\\s+(?:và|với)\\s+${LINE}(?![\\p{L}'′])`, 'u'), kind: 'lines' },
  { re: new RegExp(`(?<![\\p{L}'′])${LINE}\\s+(?:cắt|giao)\\s+${LINE}\\s+tại\\s+(?:điểm\\s+)?${NM}(?![\\p{L}'′\\d])`, 'u'), kind: 'lines' },
  { re: new RegExp(`(?<![\\p{L}'′])${LINE}\\s+và\\s+${LINE}\\s+cắt\\s+nhau\\s+tại\\s+(?:điểm\\s+)?${NM}(?![\\p{L}'′\\d])`, 'u'), kind: 'lines' },
  { re: new RegExp(`(?<![\\p{L}'′])${NM}\\s*=\\s*${LINE}\\s*∩\\s*${LINE}(?![\\p{L}'′])`, 'u'), kind: 'lines' },
  { re: new RegExp(`(?<![\\p{L}'′])${LINE}\\s*∩\\s*${LINE}\\s*=\\s*${NM}(?![\\p{L}'′\\d])`, 'u'), kind: 'lines' },
];

function emitLines(name: string, a1: string, b1: string, a2: string, b2: string): Intent3DT[] {
  return [
    addPoint3d(name, { kind: 'intersectionLines', a1, b1, a2, b2 }),
    connect3d(a1, name), connect3d(b1, name), connect3d(a2, name), connect3d(b2, name),
  ];
}

export const lineIntersection3dRule: LanguageRule3D = {
  id: 'lineIntersection3d',
  priority: 59,
  languages: ['vi'],
  patterns: [/tâm/u, /giao\s+điểm/u, /cắt/u, /∩/u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const head = parseSolidHead3D(ctx.problem);
    const out: RuleMatch3D[] = [];
    const done = new Set<string>();
    for (const c of ctx.clauses) {
      const intents: Intent3DT[] = [];
      const understood: string[] = [];
      for (const { re, kind } of RES) {
        const m = re.exec(c.text);
        if (!m) continue;
        const g = m.slice(1);
        let name: string, quad: string[] | null = null, ends: string[] | null = null;
        if (kind === 'center') {
          // nhóm: [name, quad?] hoặc [quad?, name] (mẫu "hình vuông ABCD tâm O")
          const isShapeFirst = /^(?:hình|đáy)/u.test(m[0]);
          name = isShapeFirst ? g[1] : g[0];
          const q = isShapeFirst ? g[0] : g[1];
          quad = q ? splitVertexToken(q) : head && head.baseLabels.length === 4 ? head.baseLabels : null;
          if (!quad || quad.length !== 4) continue;
        } else {
          const vals = g.filter((x) => x !== undefined);
          // "O = …" / "O là …" có tên TRƯỚC; "AC cắt BD tại O" có tên SAU
          const nameFirst = /^[A-Z](?:['′]|\d)?\s*(?:=|là)/u.test(m[0]);
          name = nameFirst ? vals[0] : vals[4];
          ends = nameFirst ? vals.slice(1, 5) : vals.slice(0, 4);
          if (new Set(ends).size !== 4 || ends.includes(name)) continue;
        }
        if (!name || done.has(name)) continue;
        done.add(name);
        understood.push(m[0]);
        if (quad) intents.push(...emitLines(name, quad[0], quad[2], quad[1], quad[3]));
        else if (ends) intents.push(...emitLines(name, ends[0], ends[1], ends[2], ends[3]));
      }
      if (intents.length) out.push({ ruleId: this.id, clauseIds: residualHasGeometry(c.text, understood) ? [] : [c.id], intents });
    }
    return out;
  },
};
