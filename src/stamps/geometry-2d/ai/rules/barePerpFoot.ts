// src/stamps/geometry-2d/ai/rules/barePerpFoot.ts
//
// Chân vuông góc nêu TRƠN, không động từ "kẻ/vẽ/hạ" (đề lớp 7 hay viết tắt):
//
//   "Cho tam giác ABC cân tại A, M là trung điểm của BC. ME vuông góc với AB,
//    MF vuông góc với AC."
//
// → E = chân vuông góc từ M xuống AB, F = từ M xuống AC; nối ME, MF.
//
// Thà thiếu còn hơn sai: chỉ nhận khi MỆNH ĐỀ BẮT ĐẦU bằng cụm này (không phải
// "Chứng minh AB ⊥ CD" hay "tam giác có AB ⊥ AC"), điểm đầu (M) đã xuất hiện TRƯỚC
// mệnh đề, còn chân (E) CHƯA xuất hiện trước đó (đang được giới thiệu) và không
// nằm trên chính đường đích.
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, connect } from './_shared';

const MUC = String.raw`([A-Z])([A-Z])\s*(?:⊥|vuông\s*góc\s+với)\s*(?:cạnh\s+|đường\s*thẳng\s+)?([A-Z])([A-Z])(?![\p{L}\d'′])`;
const DAU = new RegExp(String.raw`^\s*` + MUC, 'u');
const TIEP = new RegExp(String.raw`^\s*(?:,|và|;)\s*` + MUC, 'u');

export const barePerpFootRule: LanguageRule = {
  id: 'barePerpFoot',
  priority: 61,
  languages: ['vi'],
  patterns: [/(?:⊥|vuông\s*góc\s+với)/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const idx = ctx.problem.indexOf(c.text);
      if (idx < 0) continue;
      const truoc = ctx.problem.slice(0, idx);
      // Chữ HOA đã xuất hiện trước (trong tên điểm / đoạn / tam giác: "ABC", "BC", "M").
      const daCo = new Set((truoc.match(/(?<![\p{Ll}])[A-Z]+(?![\p{Ll}])/gu) ?? []).join(''));
      const coTruoc = (p: string) => daCo.has(p);
      let rest = c.text;
      let m = DAU.exec(rest);
      const intents: IntentT[] = [];
      let ok = true;
      while (m) {
        const [whole, from, foot, l1, l2] = m;
        if (!coTruoc(from) || coTruoc(foot) || foot === l1 || foot === l2 || from === foot || !coTruoc(l1) || !coTruoc(l2)) {
          ok = false;
          break;
        }
        intents.push(addPoint(foot, { kind: 'perpFoot', from, onLine: `${l1}${l2}` }), connect(from, foot, 'segment'));
        rest = rest.slice(whole.length);
        m = TIEP.exec(rest);
      }
      if (!ok || intents.length === 0) continue;
      // phần còn lại chỉ được là chú thích "(E ∈ AB, F ∈ AC)" / "tại E"… hoặc rỗng
      if (!/^\s*(?:\([^)]*\))?\s*$/u.test(rest)) continue;
      out.push({ ruleId: 'barePerpFoot', clauseIds: [c.id], intents });
    }
    return out;
  },
};
