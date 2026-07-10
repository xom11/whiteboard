// Đo thời gian handleGenerateFigure trên dataset đề vào-10.
// Rule engine là CPU thuần chạy đồng bộ → nếu p95 cao sẽ làm khựng UI trang
// landing. Đây là bước ĐO (spec 2026-07-10 §8.1), không phải bước tối ưu.
//
//   npm run perf:figure
import { readFileSync } from 'node:fs';
import { handleGenerateFigure } from '../src/stamps/geometry-2d/ai/handleGenerateFigure';

const FILE = 'docs/datasets/tong-hop-hinh-phang-vao10-2018-2019.txt';
const HEAD_RE = /^Câu\s+(\d+):/;

/** Cắt phần dựng hình (trước "Chứng minh"/"Tính"/"a)") — giống scripts/diag-all.ts. */
function introBeforeProof(text: string): string {
  const idx = text.search(/(Chứng minh|Chứng tỏ|CMR|C\/m|Tính|Gọi[^.]*\?|(?<![\p{L}])a\))/iu);
  return (idx >= 0 ? text.slice(0, idx) : text).trim();
}

function parseProblems(raw: string): string[] {
  const out: string[] = [];
  let cur: string | null = null;
  for (const line of raw.split('\n')) {
    if (HEAD_RE.test(line)) {
      if (cur !== null) out.push(cur);
      cur = line.replace(HEAD_RE, '').trim();
    } else if (cur !== null) {
      cur += '\n' + line;
    }
  }
  if (cur !== null) out.push(cur);
  return out;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

async function main() {
  const problems = parseProblems(readFileSync(FILE, 'utf8')).map(introBeforeProof);
  const timings: number[] = [];

  for (const problem of problems) {
    if (!problem) continue;
    const t0 = performance.now();
    await handleGenerateFigure({ problem });
    timings.push(performance.now() - t0);
  }

  timings.sort((a, b) => a - b);
  const fmt = (n: number) => n.toFixed(1).padStart(7);

  console.log(`\nĐo handleGenerateFigure trên ${timings.length} đề (${FILE})\n`);
  console.log(`  p50 ${fmt(quantile(timings, 0.5))} ms`);
  console.log(`  p95 ${fmt(quantile(timings, 0.95))} ms`);
  console.log(`  max ${fmt(timings[timings.length - 1])} ms`);
  console.log(`\nNgưỡng spec §8.1: p95 > 100ms ⇒ cân nhắc Web Worker ở Mức 2.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
