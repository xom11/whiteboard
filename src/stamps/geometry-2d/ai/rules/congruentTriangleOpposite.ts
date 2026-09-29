// src/stamps/geometry-2d/ai/rules/congruentTriangleOpposite.ts
//
// Vẽ tam giác bằng tam giác đã có, ở nửa mặt phẳng KHÔNG chứa đỉnh thứ ba:
//   "Trên nửa mặt phẳng bờ AC không chứa B vẽ tam giác ACD sao cho AD = BC; CD = AB"
// AD = BC, CD = AB và D khác phía B so với AC ⇔ ABCD là hình bình hành ⇔ D là giao
// của đường qua A song song BC và đường qua C song song AB — dựng chính xác.
// (Trước đây triangle vẽ ACD như tam giác tự do, bỏ qua hai điều kiện.)
// Chỉ nhận đúng cặp điều kiện chéo (XD = ZY, YD = XZ) và phải nói rõ "không chứa Z".
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect, drawLine } from './_shared';

const RE = new RegExp(
  String.raw`nửa\s+mặt\s+phẳng\s+bờ\s+([A-Z])([A-Z])\s+không\s+chứa\s+(?:điểm\s+)?([A-Z])(?![\p{L}\d'′])[^.]{0,20}?(?:vẽ|dựng|lấy)\s+tam\s*giác\s+([A-Z])([A-Z])([A-Z])(?![A-Z])` +
    String.raw`\s*,?\s*sao\s+cho\s+([A-Z]{2})\s*=\s*([A-Z]{2})\s*[;,]?\s*(?:và\s+)?([A-Z]{2})\s*=\s*([A-Z]{2})(?![\p{L}\d'′])`,
  'u',
);

const seg = (s: string) => [...s].sort().join('');

export const congruentTriangleOppositeRule: LanguageRule = {
  id: 'congruentTriangleOpposite',
  priority: 101, // trên triangle (100): D là điểm dựng, không phải đỉnh tự do
  languages: ['vi'],
  patterns: [/không\s+chứa[^.]{0,40}tam\s*giác[^.]{0,20}sao\s+cho/u],
  match(ctx) {
    // Quét toàn đề: "; CD = AB" bị tách thành mệnh đề riêng.
    {
      const m = RE.exec(ctx.problem);
      if (!m) return [];
      const c = ctx.clauses.find((k) => k.text.includes(`tam giác ${m[4]}${m[5]}${m[6]}`) || k.text.includes(m[0].slice(0, 30)));
      if (!c) return [];
      const ids = ctx.clauses.filter((k) => k.id === c.id || (k.id === c.id + 1 && /^\s*[A-Z]{2}\s*=\s*[A-Z]{2}\s*$/u.test(k.text))).map((k) => k.id);
      const [, x, y, z, t1, t2, t3, e1, e2, e3, e4] = m;
      const tri = [t1, t2, t3];
      if (!tri.includes(x) || !tri.includes(y)) return [];
      const d = tri.find((v) => v !== x && v !== y);
      if (!d || d === z || new Set([x, y, z]).size !== 3) return [];
      const eqs = new Set([`${seg(e1)}=${seg(e2)}`, `${seg(e2)}=${seg(e1)}`, `${seg(e3)}=${seg(e4)}`, `${seg(e4)}=${seg(e3)}`]);
      const can = [`${seg(x + d)}=${seg(z + y)}`, `${seg(y + d)}=${seg(x + z)}`];
      if (!can.every((k) => eqs.has(k))) return [];
      const l1 = `pg${x}${d}`;
      const l2 = `pg${y}${d}`;
      return [
        {
          ruleId: 'congruentTriangleOpposite',
          clauseIds: ids,
          intents: [
            drawLine(l1, 'parallelThrough', { through: x, to: z + y }),
            drawLine(l2, 'parallelThrough', { through: y, to: x + z }),
            addPoint(d, { kind: 'intersection', of: [l1, l2] }),
            connect(x, d, 'segment'),
            connect(y, d, 'segment'),
          ],
        },
      ] as RuleMatch[];
    }
  },
};
