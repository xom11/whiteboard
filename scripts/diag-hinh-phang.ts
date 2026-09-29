// scripts/diag-hinh-phang.ts — đo "dán đề → ra hình" trên bộ đề hình phẳng tổng hợp
// (docs/datasets/hinh-phang-tong-hop-2026-09.txt), ĐÚNG đường production:
// nguyên văn đề → tryDeterministicFigure → (miss) tryPartialFigure.
//
//   npx tsx scripts/diag-hinh-phang.ts [bo-de.txt] → tóm tắt + .work/<tên bộ đề>.json
//   npx tsx scripts/diag-hinh-phang.ts --gaps     → + xếp hạng mệnh đề chưa phủ
//
// Phân loại mỗi bài:
//   full    — vẽ đủ, không to-do
//   partial — vẽ được phần chắc chắn đúng + danh sách việc GV tự dựng nốt
//   miss    — không vẽ được gì
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tryDeterministicFigure } from '../src/stamps/geometry-2d/ai/deterministic/tryDeterministicFigure';
import { tryPartialFigure } from '../src/stamps/geometry-2d/ai/deterministic/partialFigure';

export interface BaiHinhPhang {
  so: number;
  tags: string[];
  text: string;
}

const HEAD = /^Bài\s+(\d+)\s+\[([^\]]+)\]:\s*/u;

export function docBoDe(raw: string): BaiHinhPhang[] {
  const out: BaiHinhPhang[] = [];
  let cur: BaiHinhPhang | null = null;
  for (const line of raw.split('\n')) {
    const m = HEAD.exec(line);
    if (m) {
      if (cur) out.push(cur);
      cur = { so: Number(m[1]), tags: m[2].split('|').map((t) => t.trim()), text: line.slice(m[0].length) };
    } else if (cur) {
      cur.text += '\n' + line;
    }
  }
  if (cur) out.push(cur);
  return out.map((b) => ({ ...b, text: b.text.trim() }));
}

export type KetQua = 'full' | 'partial' | 'miss';

export function chayBai(text: string): { kq: KetQua; reason: string | null; todo: string[] } {
  const det = tryDeterministicFigure(text);
  if (det.ok) return { kq: 'full', reason: null, todo: [] };
  const part = tryPartialFigure(text);
  if (part) {
    return {
      kq: 'partial',
      reason: det.reason,
      todo: [
        ...part.todo.uncovered.map((c) => `«${c.text.trim()}»`),
        ...part.todo.missingNamed.map((n) => `thiếu ${n}`),
        ...part.todo.pruned.map((n) => `bỏ ${n}`),
      ],
    };
  }
  return { kq: 'miss', reason: det.reason, todo: [] };
}

if (process.argv[1]?.endsWith('diag-hinh-phang.ts')) {
  const FILE = process.argv.slice(2).find((a) => a.endsWith('.txt')) ?? 'docs/datasets/hinh-phang-tong-hop-2026-09.txt';
  const TEN = FILE.replace(/^.*\//, '').replace(/-tong-hop-2026-09\.txt$|\.txt$/, '');
  const bo = docBoDe(readFileSync(FILE, 'utf8'));
  const rows = bo.map((b) => ({ ...b, ...chayBai(b.text) }));

  mkdirSync('.work', { recursive: true });
  writeFileSync(`.work/${TEN}.json`, JSON.stringify(rows, null, 2));

  const dem = (xs: typeof rows) => {
    const f = xs.filter((r) => r.kq === 'full').length;
    const p = xs.filter((r) => r.kq === 'partial').length;
    return `full ${f} · partial ${p} · miss ${xs.length - f - p} / ${xs.length}`;
  };
  console.log(`TỔNG: ${dem(rows)}`);
  const nhom = new Map<string, typeof rows>();
  for (const r of rows) for (const t of r.tags) nhom.set(t, [...(nhom.get(t) ?? []), r]);
  for (const [t, xs] of [...nhom].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${t.padEnd(18)} ${dem(xs)}`);
  }
  const lyDo: Record<string, number> = {};
  for (const r of rows) if (r.reason) lyDo[r.reason] = (lyDo[r.reason] ?? 0) + 1;
  console.log('lý do (det):', JSON.stringify(lyDo));

  if (process.argv.includes('--gaps')) {
    const gap = new Map<string, number>();
    for (const r of rows) for (const t of r.todo) {
      // Gom theo "dạng" thô: thay tên điểm bằng X để mệnh đề cùng cấu trúc dồn chung.
      const key = t.replace(/\b[A-Z]['′]?\d?\b/gu, 'X').replace(/\s+/g, ' ').slice(0, 90);
      gap.set(key, (gap.get(key) ?? 0) + 1);
    }
    console.log('\nGAP (xếp theo tần suất):');
    for (const [k, n] of [...gap].sort((a, b) => b[1] - a[1]).slice(0, 60)) console.log(String(n).padStart(3), k);
  }
}
