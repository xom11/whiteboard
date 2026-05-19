/**
 * Parse chuỗi range trang dạng "1,3,5-10" → array số 1-based đã sort + dedupe.
 *
 * - Tokens cách nhau bằng dấu phẩy hoặc khoảng trắng.
 * - Token có gạch "-" → range inclusive (5-10 = [5,6,7,8,9,10]).
 * - Khoảng trắng quanh số bị bỏ qua.
 * - Empty / chỉ space → [].
 *
 * Throws `Error` với message tiếng Việt khi:
 *   - Token không phải số / không phải range hợp lệ.
 *   - Số <= 0 hoặc > totalPages.
 *   - Range đảo ngược (vd "10-5") — coi là lỗi user thay vì auto-reverse để
 *     tránh nuốt typo.
 */
export function parsePageRange(input: string, totalPages: number): number[] {
  if (!Number.isInteger(totalPages) || totalPages <= 0) {
    throw new Error('Số trang phải là số nguyên dương.');
  }
  const trimmed = input.trim();
  if (trimmed === '') return [];

  const tokens = trimmed
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const set = new Set<number>();

  for (const token of tokens) {
    if (token.includes('-')) {
      const parts = token.split('-');
      if (parts.length !== 2) {
        throw new Error(`Khoảng trang không hợp lệ: "${token}".`);
      }
      const start = parseStrictInt(parts[0]);
      const end = parseStrictInt(parts[1]);
      if (start === null || end === null) {
        throw new Error(`Khoảng trang không hợp lệ: "${token}".`);
      }
      if (start > end) {
        throw new Error(`Khoảng trang ngược: "${token}" (đầu > cuối).`);
      }
      if (start < 1 || end > totalPages) {
        throw new Error(
          `Khoảng trang vượt giới hạn: "${token}". PDF có ${totalPages} trang.`,
        );
      }
      for (let i = start; i <= end; i++) set.add(i);
    } else {
      const n = parseStrictInt(token);
      if (n === null) {
        throw new Error(`Số trang không hợp lệ: "${token}".`);
      }
      if (n < 1 || n > totalPages) {
        throw new Error(
          `Số trang vượt giới hạn: ${n}. PDF có ${totalPages} trang.`,
        );
      }
      set.add(n);
    }
  }

  return Array.from(set).sort((a, b) => a - b);
}

function parseStrictInt(s: string): number | null {
  if (!/^-?\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : null;
}
