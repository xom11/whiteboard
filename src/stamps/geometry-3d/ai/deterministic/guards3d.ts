import type { State } from '../../../../core/scene';

// Khớp đầu khối: "hình chóp S.ABCD" → S + ABCD, "tứ diện ABCD" → ABCD, "lăng trụ ABC.A'B'C'" → ABC + A'B'C'.
// Mỗi nhóm capture lấy 1 phần, code dưới tách ký tự đơn lẻ.
const SOLID_HEAD =
  /(?:hình\s+chóp\s+([A-Z])\.([A-Z'′₀-₉0-9]+))|(?:tứ\s+diện(?:\s+đều)?\s+([A-Z'′]{4}))|(?:lăng\s+trụ\s+([A-Z]{3,})\.([A-Z'′]+))/gu;

// "Gọi M là…" / "Lấy điểm K…" / "Dựng điểm N…"
const GOI = /(?:Gọi|Lấy|Dựng)\s+(?:điểm\s+)?([A-Z])(?![\p{L}])/gu;

// "X là trung điểm…" / "X là chân…" — chỉ lấy tên ĐỘC LẬP (HOA, không đứng sau chữ)
const LA_NAMED = /(?<![A-Za-z\p{L}])([A-Z])\s+là\s+(?!hình\s+chóp|tứ\s+diện|lăng\s+trụ)/gu;

/** Tách các nhãn điểm từ chuỗi như "ABCD" hoặc "A'B'C'" (giữ prime/chỉ số để khớp label thật). */
function splitLabels(s: string): string[] {
  return [...s.matchAll(/[A-Z](?:['′]|[₀-₉0-9])?/gu)].map((m) => m[0]);
}

/**
 * Kiểm tra mọi tên điểm được nêu rõ trong đề có xuất hiện trong state (dưới dạng point3d).
 *
 * Thu thập tên kỳ vọng từ:
 * - Đầu khối: "hình chóp S.ABCD", "tứ diện ABCD", "lăng trụ ABC.A'B'C'"
 * - "Gọi/Lấy/Dựng (điểm)? X"
 * - "X là <construct>" (tên điểm phái sinh)
 *
 * Mỗi tên phải xuất hiện dưới dạng label của point3d trong state.
 */
export function allNamedEntities3DPresent(
  problem: string,
  state: State,
): { ok: boolean; missing: string[] } {
  const expected = new Set<string>();

  // Vét khối hình
  let m: RegExpExecArray | null;
  SOLID_HEAD.lastIndex = 0;
  while ((m = SOLID_HEAD.exec(problem)) !== null) {
    // hình chóp: m[1]=apex, m[2]=base labels
    if (m[1]) {
      expected.add(m[1]);
      for (const lbl of splitLabels(m[2] ?? '')) expected.add(lbl);
    }
    // tứ diện: m[3]=4 letters
    if (m[3]) {
      for (const lbl of splitLabels(m[3])) expected.add(lbl);
    }
    // lăng trụ: m[4]=base labels, m[5]=top labels
    if (m[4]) {
      for (const lbl of splitLabels(m[4])) expected.add(lbl);
      for (const lbl of splitLabels(m[5] ?? '')) expected.add(lbl);
    }
  }

  // "Gọi/Lấy/Dựng điểm X"
  const goiRe = new RegExp(GOI.source, 'gu');
  goiRe.lastIndex = 0;
  while ((m = goiRe.exec(problem)) !== null) {
    expected.add(m[1]);
  }

  // "X là …" (điểm phái sinh)
  const laRe = new RegExp(LA_NAMED.source, 'gu');
  laRe.lastIndex = 0;
  while ((m = laRe.exec(problem)) !== null) {
    expected.add(m[1]);
  }

  const labels = new Set(
    Object.values(state.objects)
      .filter((o) => o.kind === 'point3d')
      .map((o) => o.label),
  );

  const missing = [...expected].filter((n) => !labels.has(n));
  return { ok: missing.length === 0, missing };
}
