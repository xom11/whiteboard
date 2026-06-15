// src/stamps/geometry-2d/ai/rules/radius.ts
//
// Bán kính của đường tròn — đầu mút nằm TRÊN đường tròn:
//   "Vẽ hai bán kính OA, OB"   → A,B onCircle(O) + đoạn OA, OB
//   "Kẻ bán kính OM"           → M onCircle(O) + đoạn OM
//
// Token "OX": chữ ĐẦU = tâm (O), chữ SAU = đầu mút trên đường tròn. Nhiều bán
// kính phải CÙNG tâm (cùng đường tròn). Đường tròn O phải đã được dựng bởi rule
// khác (circleRadius "(O;R)" / chord …) — onCircle tham chiếu nó. theta phân biệt
// để các đầu mút không trùng.
//
// GOTCHA \b: ký tự Việt → cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, connect } from './_shared';

const PREFILTER = /bán\s*kính\s+[A-Z]{2}/u;
// "Vẽ/Kẻ/Dựng (hai|ba|2|3|các)? bán kính OA(, OB)(, OC)?" — danh sách cặp HOA.
const DRAW_RADII = new RegExp(
  '(?:[Vv]ẽ|[Kk]ẻ|[Dd]ựng)\\s+(?:hai\\s+|ba\\s+|2\\s+|3\\s+|các\\s+)?bán\\s*kính\\s+' +
    '([A-Z]{2}(?:\\s*(?:,|và)\\s*[A-Z]{2})*)(?![A-Z])',
  'u',
);

const THETA0 = 0.9;
const THETA_STEP = 1.1;

export const radiusRule: LanguageRule = {
  id: 'radius',
  priority: 60,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = DRAW_RADII.exec(c.text);
      if (!m) continue;
      const pairs = m[1].split(/,|và/).map((s) => s.trim()).filter(Boolean);
      if (pairs.length === 0) continue;
      const center = pairs[0][0];
      // Mọi bán kính phải cùng tâm + đầu mút khác tâm + khác nhau.
      const ends = pairs.map((p) => p[1]);
      if (!pairs.every((p) => p[0] === center)) continue;
      if (ends.some((e) => e === center) || new Set(ends).size !== ends.length) continue;
      const intents: IntentT[] = [];
      ends.forEach((e, i) => {
        intents.push(addPoint(e, { kind: 'onCircle', circle: center, theta: THETA0 + i * THETA_STEP }));
        intents.push(connect(center, e, 'segment'));
      });
      out.push({ ruleId: 'radius', clauseIds: [c.id], intents });
    }
    return out;
  },
};
