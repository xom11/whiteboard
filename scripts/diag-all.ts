// scripts/diag-all.ts — probe hợp nhất cho cả 4 dataset.
//   npx tsx scripts/diag-all.ts            → in summary + ghi .work/escalations.json
// JSON: [{dataset, id, intro, ok, reason, detail, detIntents[], uncovered[]}]
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
        if (line.includes('Các bài từ')) continue;
        cur.text += '\n' + line;
      }
    }
    if (cur) out.push(cur);
    return out;
  };
}

function introBeforeNumbered(text: string): string {
  const idx = text.search(/\n\s*1[\.\)]/);
  let head = idx >= 0 ? text.slice(0, idx) : text;
  head = head.replace(/Chứng minh\s*:?\s*$/i, '').trim();
  return head;
}
/** Strip LaTeX inline ($...$) về text thuần cho dataset julielltv. Giữ ký hiệu
 *  hình học mà rule engine hiểu (∩, ⊥, song song, góc). */
function stripLatex(s: string): string {
  return s
    .replace(/\$/g, '')
    .replace(/\\cap/g, '∩')
    .replace(/\\perp/g, '⊥')
    .replace(/\\parallel/g, ' song song ')
    .replace(/\\(?:widehat|angle)/g, ' góc ')
    .replace(/\^\{?\\?circ\}?/g, '°')
    .replace(/\\[a-zA-Z]+/g, ' ') // các lệnh LaTeX còn lại → space
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function introBeforeProof(text: string): string {
  // cắt trước "Chứng minh" / "Tính" / "a)" / "CMR" đầu tiên (phần dựng hình)
  const idx = text.search(/(Chứng minh|Chứng tỏ|CMR|Tính|Gọi[^.]*\?|\n?\s*a\))/i);
  let head = idx >= 0 ? text.slice(0, idx) : text;
  return head.trim();
}

const DATASETS: DS[] = [
  {
    name: 'hinh9',
    file: 'docs/datasets/cac-chuyen-de-va-bai-tap-tong-hop-hinh-hoc-9.txt',
    parse: blockParse(/^Bài\s+(\d+)[\.:]/, (m) => m[1]),
    intro: introBeforeNumbered,
  },
  {
    name: 'd80',
    file: 'docs/datasets/80-bai-toan-hinh-hoc-lop-9.txt',
    parse: blockParse(/^Bài\s+(\d+)[\.:]/, (m) => m[1]),
    intro: introBeforeNumbered,
  },
  {
    name: 't02',
    file: 'docs/datasets/T02_problems.txt',
    parse: (raw: string) => {
      const headRe = /^(Ví dụ|Bài toán)\s+(\d+)/;
      const out: Bai[] = [];
      for (const line of raw.split('\n')) {
        const m = line.match(headRe);
        if (m)
          out.push({
            id: `${m[1] === 'Ví dụ' ? 'VD' : 'BT'}${m[2]}`,
            text: line.replace(headRe, '').replace(/^\s*[.):]?\s*(\([^)]*\)\.?)?\s*/, '').trim(),
          });
      }
      return out;
    },
    intro: introBeforeProof,
  },
  {
    name: 'phang',
    file: 'docs/datasets/mot-so-bai-tap-chon-loc-hinh-hoc-phang.txt',
    parse: blockParse(/^Câu\s+(\d+):/, (m) => m[1]),
    intro: introBeforeProof,
  },
  {
    name: 'vao10',
    file: 'docs/datasets/tuyen-tap-400-hinh-vao-10.txt',
    // extractor đã cắt intro sẵn; introBeforeProof chỉ là lưới an toàn
    parse: blockParse(/^Câu\s+(\d+):/, (m) => m[1]),
    intro: introBeforeProof,
  },
  {
    name: 'son123',
    file: 'docs/datasets/son_123_problems_cleaned.txt',
    parse: blockParse(/^Bài\s+(\d+):/, (m) => m[1]),
    intro: introBeforeProof,
  },
  {
    name: 'httcd',
    file: 'docs/datasets/hinh-hoc-9-chu-de.txt',
    // Trích bởi scripts/extract-httcd.mjs từ md markitdown ("Bài tập Hình học 9
    // theo chủ đề", toanmath). 255 bài dựng hình lớp 9 (lọc bài có đường tròn).
    parse: blockParse(/^Câu\s+(\d+):/, (m) => m[1]),
    intro: introBeforeProof,
  },
  {
    name: 'mohinh',
    file: 'docs/datasets/mo-hinh-hinh-hoc-vao10.txt',
    // Trích bởi scripts/extract-mohinh.mjs từ md markitdown ("Chuyên đề các mô hình
    // thường gặp ... ôn thi vào 10", toanmath). 39 bài mô hình hình học lớp 9.
    parse: blockParse(/^Câu\s+(\d+):/, (m) => m[1]),
    intro: introBeforeProof,
  },
  {
    name: 'chuyen2026',
    file: 'docs/datasets/hinh-phang-chuyen-2026.txt',
    // Trích bởi scripts/extract-chuyen2026.mjs từ md markitdown (toanmath, đề chuyên
    // 2026-2027 các tỉnh). intro = lead "Cho ..." (extractor đã cắt sub-question).
    parse: blockParse(/^Câu\s+(\d+):/, (m) => m[1]),
    intro: introBeforeProof,
  },
  {
    name: 'julielltv',
    file: 'docs/datasets/julielltv-hinh-hoc-phang.json',
    // JSON {problems:[{id, statement}]} — statement chứa LaTeX inline $...$.
    parse: (raw: string): Bai[] => {
      const data = JSON.parse(raw) as { problems: Array<{ id: number; statement: string }> };
      return data.problems.map((p) => ({ id: String(p.id), text: stripLatex(p.statement) }));
    },
    intro: introBeforeProof,
  },
  {
    name: 'toan8',
    file: 'docs/datasets/toan_8_hinh_drawing_useful.txt',
    parse: (raw: string) => {
      // "Bài N:" lặp lại theo nhiều cụm → đánh số tuần tự. Strip prefix nhiễu OCR
      // "[D B ...]" (nhãn hình) trước header.
      const out: Bai[] = [];
      let seq = 0;
      let cur: Bai | null = null;
      for (const line of raw.split('\n')) {
        const stripped = line.replace(/^\s*\[[^\]]*\]\s*/, '');
        const m = stripped.match(/^Bài\s+\d+[.:]?\s*(.*)$/);
        if (m) {
          if (cur) out.push(cur);
          cur = { id: String(++seq), text: m[1] };
        } else if (cur) cur.text += '\n' + stripped;
      }
      if (cur) out.push(cur);
      return out;
    },
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
