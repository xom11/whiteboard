// scripts/pdf-dataset/check-completeness.ts
//
// KIỂM ĐỘ ĐẦY ĐỦ ở mức ĐIỂM (point-level), KHÁC diag-all (mức clause).
// Với mỗi đề: trích tập điểm KỲ VỌNG (nhãn HOA trong phần dựng hình) vs điểm
// ĐÃ VẼ (fig.dsl.points). Báo điểm THIẾU + thống kê gộp để lái việc vá rule.
//
//   npx tsx scripts/pdf-dataset/check-completeness.ts            → summary + .work/completeness.json
//   npx tsx scripts/pdf-dataset/check-completeness.ts <id>       → chi tiết 1 bài
//
// "Điểm kỳ vọng" = chữ HOA [A-Z] KHÔNG theo sau chữ thường (loại "Cho/Gọi/Trên"…
// mở câu). Heuristic — đủ tốt để chẩn đoán gap, KHÔNG phải metric production.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tryDeterministicFigure } from '../../src/stamps/geometry-2d/ai/deterministic/tryDeterministicFigure';
import { tryPartialFigure } from '../../src/stamps/geometry-2d/ai/deterministic/partialFigure';

const DATASET = 'docs/datasets/tong-hop-hinh-phang-vao10-2018-2019.txt';

function parse(raw: string): Array<{ id: number; text: string }> {
  const out: Array<{ id: number; text: string }> = [];
  let cur: { id: number; text: string } | null = null;
  for (const line of raw.split('\n')) {
    const m = line.match(/^Câu\s+(\d+):\s*(.*)$/);
    if (m) {
      if (cur) out.push(cur);
      cur = { id: parseInt(m[1], 10), text: m[2] };
    } else if (cur) cur.text += '\n' + line;
  }
  if (cur) out.push(cur);
  return out;
}

function intro(text: string): string {
  const idx = text.search(/(Chứng minh|Chứng tỏ|CMR|C\/m|Tính|Tìm|(?<![\p{L}])a\))/iu);
  return (idx >= 0 ? text.slice(0, idx) : text).trim();
}

// Chữ HOA = nhãn điểm khi KHÔNG theo sau chữ thường (latin/Việt) → loại "Cho",
// "Gọi", "Trên", "Đường"… (Đ không [A-Z]). Giữ prime/subscript để gộp về base.
const PT_RE = /([A-Z])(['′]?)(\d?)(?![a-zà-ỹ])/gu;
// Loại acronym/đơn-vị KHÔNG phải điểm (hiếm trong phần dựng hình).
const NOT_POINT = new Set(['R', 'S']); // R=bán kính; S=diện tích (sẽ whitelist lại nếu là điểm thật bên dưới)

function expectedPoints(introText: string): Set<string> {
  const pts = new Set<string>();
  for (const m of introText.matchAll(PT_RE)) {
    const base = m[1]; // gộp prime/subscript về chữ cái gốc (OCR thường rớt)
    pts.add(base);
  }
  // R/S CHỈ loại khi đi cùng dấu "=" số (bán kính/diện tích) — nếu xuất hiện như
  // điểm (vd "điểm S", "tại R") thì giữ. Heuristic thô: nếu "OA = 2R"/"= R" có mặt
  // và R không đứng sau "điểm/tại/gọi" → loại.
  for (const ng of NOT_POINT) {
    const asLen = new RegExp(`[=;]\\s*\\d*\\s*${ng}(?![A-Za-z])|\\b${ng}\\s*[);,]`).test(introText);
    const asPoint = new RegExp(`(?:điểm|tại|gọi|Gọi|là)\\s+${ng}(?![A-Za-z])`).test(introText);
    if (asLen && !asPoint) pts.delete(ng);
  }
  return pts;
}

function main() {
  const onlyId = process.argv[2] ? parseInt(process.argv[2], 10) : null;
  const problems = parse(readFileSync(DATASET, 'utf8'));
  const rows: Array<{ id: number; expected: string[]; drawn: string[]; missing: string[]; mode: string }> = [];
  const missHist: Record<string, number> = {};

  for (const p of problems) {
    if (onlyId && p.id !== onlyId) continue;
    const intr = intro(p.text);
    const exp = expectedPoints(intr);
    let drawnNames: string[] = [];
    let mode = 'none';
    try {
      const r = tryDeterministicFigure(intr);
      if (r.ok) {
        drawnNames = r.figure.dsl.points.map((pt: any) => pt.name);
        mode = 'full';
      } else {
        // partial: TRANSPILE phần dựng được → fig.dsl.points = điểm THỰC vẽ
        // (gồm cả đỉnh đa giác/tam giác, KHÁC detIntents chỉ có điểm phái sinh).
        const pf = tryPartialFigure(intr);
        if (pf) {
          drawnNames = pf.figure.dsl.points.map((pt: any) => pt.name);
          mode = 'partial';
        } else mode = 'none';
      }
    } catch {
      mode = 'throw';
    }
    const drawn = new Set(drawnNames.map((n) => n.replace(/['′\d_].*$/, '')).filter((n) => /^[A-Z]$/.test(n)));
    const missing = [...exp].filter((e) => !drawn.has(e)).sort();
    for (const m of missing) missHist[m] = (missHist[m] ?? 0) + 1;
    rows.push({ id: p.id, expected: [...exp].sort(), drawn: [...drawn].sort(), missing, mode });
  }

  if (onlyId) {
    const r = rows[0];
    console.log(`Câu ${r.id} [${r.mode}]`);
    console.log('  KỲ VỌNG :', r.expected.join(' '));
    console.log('  ĐÃ VẼ   :', r.drawn.join(' '));
    console.log('  THIẾU   :', r.missing.join(' ') || '(đủ)');
    return;
  }

  mkdirSync('.work', { recursive: true });
  writeFileSync('.work/completeness.json', JSON.stringify(rows, null, 2));

  const totExp = rows.reduce((s, r) => s + r.expected.length, 0);
  const totMiss = rows.reduce((s, r) => s + r.missing.length, 0);
  const full = rows.filter((r) => r.missing.length === 0).length;
  console.log(`Điểm: vẽ ${totExp - totMiss}/${totExp} (${Math.round((100 * (totExp - totMiss)) / totExp)}%) · ${full}/${rows.length} bài ĐỦ điểm`);
  // bài thiếu nhiều nhất (loại none)
  const worst = rows.filter((r) => r.mode !== 'none' && r.missing.length).sort((a, b) => b.missing.length - a.missing.length).slice(0, 20);
  console.log('\n20 bài (có hình) THIẾU nhiều điểm nhất:');
  for (const r of worst) console.log(`  C${r.id} [${r.mode}] thiếu ${r.missing.length}: ${r.missing.join(' ')}  (vẽ: ${r.drawn.join('')})`);
  console.log('\nwrote .work/completeness.json');
}

main();
