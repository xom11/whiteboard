// Chặn dist chứa escape `\xHH` (0x80–0xFF). Lý do: xem `charset` trong tsup.config.ts —
// bộ minify SWC của Next làm rơi một `\` sau `\xHH` trong template literal, phá
// regex tiếng Việt của rule engine ở bản production của consumer.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
// Số `\` đứng trước là chẵn ⇒ `\x` là escape thật (không phải chữ "\x" đã escape).
const RE = /(?<!\\)(?:\\\\)*\\x[89a-fA-F][0-9a-fA-F]/g;

let loi = 0;
for (const f of readdirSync(DIST)) {
  if (!/\.(m?js)$/.test(f)) continue;
  const n = (readFileSync(join(DIST, f), 'utf8').match(RE) ?? []).length;
  if (n) {
    console.error(`✗ ${f}: ${n} escape \\xHH (0x80–0xFF)`);
    loi += n;
  }
}
if (loi) {
  console.error('dist còn escape \\xHH — kiểm `esbuildOptions.charset` trong tsup.config.ts');
  process.exit(1);
}
console.log('✓ dist không có escape \\xHH (0x80–0xFF)');
