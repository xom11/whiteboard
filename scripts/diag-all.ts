// scripts/diag-all.ts — probe coverage cho dataset đề "vẽ hình 2D".
//   npx tsx scripts/diag-all.ts            → in summary + ghi .work/escalations.json
// JSON: [{dataset, id, intro, ok, reason, detail, detIntents[], uncovered[]}]
//
// Dataset HIỆN TẠI = đề cắt từ PDF scan "Tổng hợp HHP vào 10 2018-2019" qua
// pipeline OCR (Tesseract + repairOcrSymbols). Xem scripts/pdf-dataset/.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tryDeterministicFigure } from '../src/stamps/geometry-2d/ai/deterministic/tryDeterministicFigure';
import { tryPartialDeterministic } from '../src/stamps/geometry-2d/ai/deterministic/runDeterministicIntents';

interface Bai { id: string; text: string }
interface DS {
  name: string;
  file: string;
  parse: (raw: string) => Bai[];
  intro: (text: string) => string;
}

function blockParse(headRe: RegExp, idFmt: (m: RegExpMatchArray) => string) {
  return (raw: string): Bai[] => {
    const out: Bai[] = [];
    let cur: Bai | null = null;
    for (const line of raw.split('\n')) {
      const m = line.match(headRe);
      if (m) {
        if (cur) out.push(cur);
        cur = { id: idFmt(m), text: line.replace(headRe, '').trim() };
      } else if (cur) {
        cur.text += '\n' + line;
      }
    }
    if (cur) out.push(cur);
    return out;
  };
}

function introBeforeProof(text: string): string {
  // cắt trước "Chứng minh" / "Tính" / "a)" / "CMR" đầu tiên (phần dựng hình).
  // "a)" PHẢI là nhãn ý (lookbehind (?<![\p{L}]) — KHÔNG khớp "...Khoa)" trong tên
  // tác giả "(Nguyễn Dang Khoa)" ở đầu đề Chương 4, vốn cắt mất CẢ mệnh đề dựng hình).
  const idx = text.search(/(Chứng minh|Chứng tỏ|CMR|C\/m|Tính|Gọi[^.]*\?|(?<![\p{L}])a\))/iu);
  const head = idx >= 0 ? text.slice(0, idx) : text;
  return head.trim();
}

const DATASETS: DS[] = [
  {
    name: 'vao10_2018',
    file: 'docs/datasets/tong-hop-hinh-phang-vao10-2018-2019.txt',
    parse: blockParse(/^Câu\s+(\d+):/, (m) => m[1]),
    intro: introBeforeProof,
  },
];

interface Row {
  dataset: string;
  id: string;
  intro: string;
  ok: boolean;
  reason: string | null;
  detail: string | null;
  detIntents: string[];
  uncovered: string[];
}

function intentKind(i: any): string {
  return (
    i.op +
    (i.constraint ? `/${i.constraint.kind}` : i.shape ? `/${i.shape}:${i.variant}` : i.spec ? `/${i.spec}` : i.style ? `/${i.style}` : i.kind ? `/${i.kind}` : '')
  );
}

const rows: Row[] = [];
for (const ds of DATASETS) {
  let raw: string;
  try {
    raw = readFileSync(ds.file, 'utf8');
  } catch {
    continue;
  }
  for (const b of ds.parse(raw)) {
    const intro = ds.intro(b.text);
    if (!intro || intro.length < 8) continue;
    const r = tryDeterministicFigure(intro);
    const part = tryPartialDeterministic(intro);
    rows.push({
      dataset: ds.name,
      id: b.id,
      intro,
      ok: r.ok,
      reason: r.ok ? null : r.reason,
      detail: r.ok ? null : r.detail ?? null,
      detIntents: (r.ok ? r.figure.intents : part.detIntents).map(intentKind),
      uncovered: r.ok ? [] : part.uncovered.map((c: any) => c.text),
    });
  }
}

mkdirSync('.work', { recursive: true });
writeFileSync('.work/escalations.json', JSON.stringify(rows, null, 2));

// summary
const byDs: Record<string, { ok: number; total: number; reasons: Record<string, number> }> = {};
for (const r of rows) {
  byDs[r.dataset] ??= { ok: 0, total: 0, reasons: {} };
  byDs[r.dataset].total++;
  if (r.ok) byDs[r.dataset].ok++;
  else byDs[r.dataset].reasons[r.reason!] = (byDs[r.dataset].reasons[r.reason!] ?? 0) + 1;
}
for (const [name, s] of Object.entries(byDs)) {
  console.log(`${name}: ${s.ok}/${s.total} (${Math.round((100 * s.ok) / s.total)}%)  reasons=${JSON.stringify(s.reasons)}`);
}
console.log(`\nwrote .work/escalations.json (${rows.length} problems)`);
