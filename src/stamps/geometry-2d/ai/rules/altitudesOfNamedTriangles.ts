// src/stamps/geometry-2d/ai/rules/altitudesOfNamedTriangles.ts
//
// Đường cao nêu theo TAM GIÁC CHỨA NÓ (lớp 8, tam giác vuông đồng dạng):
//   "Gọi AH, HD lần lượt là các đường cao kẻ từ đỉnh A của tam giác ABC và đỉnh H
//    của tam giác HAB"   → H = chân ⊥ từ A xuống BC; D = chân ⊥ từ H xuống AB.
//
// Trước đây: cevian không đọc được (có "lần lượt là … kẻ từ đỉnh …"), còn triangle
// rule vẽ "tam giác HAB" với H là điểm TỰ DO — hình báo full mà H trùng đỉnh B.
// Chân đường cao là constraint tường minh ⇒ thay chỗ điểm tự do (builder upgrade).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, connect } from './_shared';

const PREFILTER = /đường\s*cao\s+(?:kẻ|hạ|vẽ)\s+từ\s+đỉnh/u;
const RE = /((?:[A-Z]{2}\s*(?:,|và)\s*)+[A-Z]{2})(?![A-Z])\s+(?:lần\s*lượt\s+|theo\s+thứ\s+tự\s+)?là\s+(?:các\s+)?đường\s*cao\s+(?:kẻ|hạ|vẽ)\s+từ\s+((?:(?:các\s+)?đỉnh\s+[A-Z]\s+của\s+tam\s*giác\s+[A-Z]{3}(?![A-Z])\s*(?:,|và)?\s*)+)/u;
const MANH = /đỉnh\s+([A-Z])\s+của\s+tam\s*giác\s+([A-Z]{3})(?![A-Z])/gu;

export const altitudesOfNamedTrianglesRule: LanguageRule = {
  id: 'altitudesOfNamedTriangles',
  priority: 66,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = RE.exec(c.text);
      if (!m) continue;
      const cap = m[1].split(/\s*,\s*|\s+và\s+/u).map((x) => x.trim());
      const manh = [...m[2].matchAll(MANH)];
      if (cap.length !== manh.length) continue;
      const intents: IntentT[] = [];
      let ok = true;
      cap.forEach((pf, i) => {
        const [V, F] = [pf[0], pf[1]];
        const [, dinh, tg] = manh[i];
        if (dinh !== V || !tg.includes(V) || tg.includes(F) || new Set(tg).size !== 3) { ok = false; return; }
        const day = tg.split('').filter((x) => x !== V).join('');
        intents.push(addPoint(F, { kind: 'perpFoot', from: V, onLine: day }), connect(V, F, 'segment'));
      });
      if (!ok) continue;
      out.push({ ruleId: 'altitudesOfNamedTriangles', clauseIds: [c.id], intents });
    }
    return out;
  },
};
