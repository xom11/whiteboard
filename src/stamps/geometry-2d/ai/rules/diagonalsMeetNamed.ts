// src/stamps/geometry-2d/ai/rules/diagonalsMeetNamed.ts
//
// Giao điểm hai đường chéo của tứ giác ĐÃ đặt tên bằng loại hình (lớp 8):
//   "Cho hình bình hành ABCD, gọi O là giao điểm của hai đường chéo"
//   "Cho hình thoi ABCD có hai đường chéo cắt nhau tại O"
//   "hình thang cân ABCD …, E là giao điểm của hai đường thẳng chứa cạnh bên AD và BC"
//   "Gọi E là giao điểm của các đường thẳng AB và CD"
//
// quadDiagonals chỉ phủ dạng "ABCD là tứ giác … đường chéo AC và BD cắt nhau tại
// E"; đề lớp 8 thường KHÔNG nêu tên đường chéo ("hai đường chéo") ⇒ O không bao
// giờ được dựng và mọi thứ dựa trên O (trung điểm OB, …) transpile-fail. Đường
// chéo của tứ giác ABCD luôn là AC và BD (thứ tự đỉnh theo tên hình).
//
// GOTCHA \b: ký tự Việt → cờ 'u' + lookaround (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

const PREFILTER = /đường\s*chéo|giao\s*điểm\s+(?:của\s+)?(?:các\s+|hai\s+)?đường\s*thẳng/u;

// Tên tứ giác đầu tiên trong đề: "hình bình hành/chữ nhật/thoi/vuông/thang (cân|vuông) ABCD" | "tứ giác ABCD".
const QUAD = /(?:hình\s+(?:bình\s+hành|chữ\s+nhật|thoi|vuông|thang(?:\s+(?:cân|vuông))?)|tứ\s*giác(?:\s+(?:lồi|nội\s+tiếp))?)\s+([A-Z])([A-Z])([A-Z])([A-Z])(?![A-Z])/u;

const PT = "([A-Z])(?![A-Z'′])";
// "O là giao điểm (của) (hai|các) đường chéo"
const NAME_LA_GIAO_CHEO = new RegExp(String.raw`${PT}\s+là\s+giao\s*điểm\s+(?:của\s+)?(?:hai\s+|các\s+)?đường\s*chéo(?!\s+[A-Z]{2})`, 'u');
// "(hai|các) đường chéo (của …)? cắt nhau tại O" — KHÔNG nêu tên đường chéo.
const CHEO_CAT_NHAU = new RegExp(String.raw`(?:hai\s+|các\s+)đường\s*chéo(?:\s+của\s+(?:hình\s+\S+(?:\s+\S+)?\s+|tứ\s*giác\s+)?[A-Z]{4})?\s+cắt\s+nhau\s+(?:tại|ở)\s+(?:điểm\s+)?${PT}`, 'u');
// "E là giao điểm (của) (hai|các) đường thẳng (chứa (hai)? cạnh (bên)?)? AD và BC"
const GIAO_HAI_DUONG_THANG = new RegExp(
  String.raw`${PT}\s+là\s+giao\s*điểm\s+(?:của\s+)?(?:hai\s+|các\s+)?đường\s*thẳng\s+(?:chứa\s+(?:hai\s+)?cạnh(?:\s+bên)?\s+)?([A-Z]{2})(?![A-Z])\s+(?:và|,)\s+([A-Z]{2})(?![A-Z])`,
  'u',
);

export const diagonalsMeetNamedRule: LanguageRule = {
  id: 'diagonalsMeetNamed',
  // Như intersection generic (45): đỉnh tứ giác phải có trước (topo retry lo thứ tự).
  priority: 46,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    const q = QUAD.exec(ctx.problem);
    const labels = q ? [q[1], q[2], q[3], q[4]] : null;
    const quadOk = labels !== null && new Set(labels).size === 4;

    for (const c of ctx.clauses) {
      // Một mệnh đề có thể nêu cả giao đường chéo lẫn giao hai cạnh bên — gom cả hai.
      const intents = [];
      if (quadOk) {
        const m = NAME_LA_GIAO_CHEO.exec(c.text) ?? CHEO_CAT_NHAU.exec(c.text);
        if (m && !labels!.includes(m[1])) {
          const [a, b, cc, d] = labels!;
          intents.push(
            connect(a, cc, 'segment'),
            connect(b, d, 'segment'),
            addPoint(m[1], { kind: 'intersection', of: [a + cc, b + d] }),
          );
        }
      }
      const g = GIAO_HAI_DUONG_THANG.exec(c.text);
      if (g) {
        const [, name, l1, l2] = g;
        const ends = [l1[0], l1[1], l2[0], l2[1]];
        if (new Set(ends).size === 4 && !ends.includes(name)) {
          intents.push(
            addPoint(name, { kind: 'intersection', of: [l1, l2] }),
            // Kéo hai đường thẳng tới giao điểm (không biết đầu nào gần hơn ⇒ nối cả hai đầu).
            ...ends.map((p) => connect(name, p, 'segment')),
          );
        }
      }
      if (intents.length) out.push({ ruleId: 'diagonalsMeetNamed', clauseIds: [c.id], intents });
    }
    return out;
  },
};
