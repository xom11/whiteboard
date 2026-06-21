// scripts/diag-all-3d.ts — probe hợp nhất cho 3 dataset hình không gian 3D.
//   npx tsx scripts/diag-all-3d.ts   → in summary + ghi .work/escalations-3d.json
// JSON: [{dataset, id, intro, tier, reason, detail, detIntents[], uncovered[]}]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tryDeterministicFigure3d } from '../src/stamps/geometry-3d/ai/deterministic/tryDeterministicFigure3d';
import { tryPartial3d } from '../src/stamps/geometry-3d/ai/deterministic/runDeterministicIntents3d';
import { segmentClauses3D } from '../src/stamps/geometry-3d/ai/deterministic/coverage3d';

interface Bai { id: string; text: string }

// "Câu N:" hoặc "Câu N." blocks
function parseCau(raw: string): Bai[] {
  const out: Bai[] = [];
  let cur: Bai | null = null;
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^Câu\s+(\d+)\s*[:.]/u);
    if (m) {
      if (cur) out.push(cur);
      cur = { id: m[1], text: line.replace(/^Câu\s+\d+\s*[:.]/u, '').trim() };
    } else if (cur) {
      cur.text += ' ' + line.trim();
    }
  }
  if (cur) out.push(cur);
  return out;
}

// intro = phần dựng hình, trước câu hỏi con a)/b) hoặc "Chứng minh/Tính/Xác định thiết diện"
function intro3d(text: string): string {
  const cut = text.search(/\b(?:a\)|b\)|Chứng minh|Tính|Xác định thiết diện)/u);
  return (cut > 0 ? text.slice(0, cut) : text).trim();
}

const DATASETS = [
  { name: 'ss-thietdien', file: 'docs/datasets/hinh-khong-gian-11-songsong-thietdien.txt' },
  { name: 'vuonggoc',     file: 'docs/datasets/hinh-khong-gian-11-vuonggoc-khoangcach.txt' },
  { name: 'tron-xoay',   file: 'docs/datasets/hinh-khong-gian-12-khoi-tron-xoay.txt' },
];

interface Row {
  dataset: string;
  id: string;
  intro: string;
  tier: 'FULL' | 'PARTIAL' | 'NONE';
  reason: string | null;
  detail: string | null;
  detIntents: string[];
  uncovered: string[];
}

// intentKind: robust với mọi op (không crash trên op lạ)
function intentKind(i: any): string {
  if (i?.op === 'add-point-3d') return `add-point-3d/${i.constraint?.kind ?? '?'}`;
  if (i?.op === 'solid') return `solid/${i.flavor ?? '?'}`;
  if (typeof i?.op === 'string') return i.op;
  return 'unknown';
}

const rows: Row[] = [];

for (const ds of DATASETS) {
  let raw = '';
  try {
    raw = readFileSync(ds.file, 'utf8');
  } catch {
    console.warn('skip (not found):', ds.file);
    continue;
  }

  for (const b of parseCau(raw)) {
    const intro = intro3d(b.text);
    if (intro.length < 8) continue;

    const r = tryDeterministicFigure3d(intro);
    const part = tryPartial3d(intro);
    const geoCount = segmentClauses3D(intro).filter((c) => c.hasGeometry).length;

    let tier: Row['tier'];
    if (r.ok) {
      tier = 'FULL';
    } else if (part.detIntents.length > 0 && part.uncovered.length < geoCount) {
      tier = 'PARTIAL';
    } else {
      tier = 'NONE';
    }

    rows.push({
      dataset: ds.name,
      id: b.id,
      intro,
      tier,
      reason: r.ok ? null : r.reason,
      detail: r.ok ? null : (r.detail ?? null),
      detIntents: (r.ok ? r.intents : part.detIntents).map(intentKind),
      uncovered: r.ok ? [] : part.uncovered.map((c) => c.text),
    });
  }
}

mkdirSync('.work', { recursive: true });
writeFileSync('.work/escalations-3d.json', JSON.stringify(rows, null, 2));

for (const ds of DATASETS) {
  const sub = rows.filter((r) => r.dataset === ds.name);
  const full = sub.filter((r) => r.tier === 'FULL').length;
  const partial = sub.filter((r) => r.tier === 'PARTIAL').length;
  const none = sub.filter((r) => r.tier === 'NONE').length;
  console.log(`${ds.name}: FULL ${full} / PARTIAL ${partial} / NONE ${none} (total ${sub.length})`);
}

const totFull = rows.filter((r) => r.tier === 'FULL').length;
const totPartial = rows.filter((r) => r.tier === 'PARTIAL').length;
const totNone = rows.filter((r) => r.tier === 'NONE').length;
console.log(`TOTAL: FULL ${totFull} / PARTIAL ${totPartial} / NONE ${totNone} (${rows.length})`);
console.log('Wrote .work/escalations-3d.json');
