// scripts/pdf-dataset/build-gallery.ts
//   npx tsx scripts/pdf-dataset/build-gallery.ts <figuresDir> <outHtml>
// Trang review self-contained: 118 đề + hình render (FULL/PARTIAL, base64) + lý do none.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

interface Row {
  id: number; ok: boolean; mode?: 'full' | 'partial' | 'none';
  reason?: string; points?: number; shapes?: number; uncovered?: number; text: string;
}

const figuresDir = process.argv[2];
const outHtml = process.argv[3];
const rows = JSON.parse(readFileSync(resolve(figuresDir, 'summary.json'), 'utf-8')) as Row[];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dataUri = (id: number): string | null => {
  const p = resolve(figuresDir, `cau-${String(id).padStart(3, '0')}.png`);
  if (!existsSync(p)) return null;
  return 'data:image/png;base64,' + readFileSync(p).toString('base64');
};

const full = rows.filter((r) => r.ok && r.mode === 'full');
const partial = rows.filter((r) => r.ok && r.mode === 'partial');
const none = rows.filter((r) => !r.ok);
const drawn = [...full, ...partial]; // full trước

const REASON_LABEL: Record<string, string> = {
  'transpile-fail': 'Transpile lỗi (ref/cascade)',
  'incomplete-coverage': 'Thiếu phủ clause',
  'no-match': 'Không rule nào khớp',
  'named-missing': 'Thiếu điểm có tên',
  'render': 'Lỗi render',
  'throw': 'Pipeline throw',
};
const reasonKey = (r?: string) => (r ?? '').split(':')[0];
const byReason: Record<string, Row[]> = {};
for (const r of none) (byReason[reasonKey(r.reason)] ??= []).push(r);

const card = (r: Row): string => {
  const img = dataUri(r.id);
  const isFull = r.mode === 'full';
  const badge = isFull
    ? '<span class="chip full">đầy đủ</span>'
    : `<span class="chip partial">một phần${r.uncovered ? ` · thiếu ${r.uncovered}` : ''}</span>`;
  return `<article class="card${isFull ? '' : ' card-partial'}">
    <div class="card-fig">${img ? `<img loading="lazy" alt="Hình Câu ${r.id}" src="${img}">` : '<div class="nofig">—</div>'}</div>
    <div class="card-body">
      <div class="card-head"><span class="num">Câu ${r.id}</span>${badge}</div>
      <p class="stmt">${esc(r.text)}</p>
    </div>
  </article>`;
};

const failSections = Object.entries(byReason)
  .sort((a, b) => b[1].length - a[1].length)
  .map(
    ([k, list]) => `<section class="fail-group">
      <h3><span class="dot dot-${k}"></span>${REASON_LABEL[k] ?? k} <span class="count">${list.length}</span></h3>
      <ul class="fail-list">
        ${list.map((r) => `<li><span class="num num-sm">Câu ${r.id}</span><span>${esc(r.text.slice(0, 150))}${r.text.length > 150 ? '…' : ''}</span></li>`).join('\n')}
      </ul>
    </section>`,
  )
  .join('\n');

const html = `<style>
  :root{
    --bg:#f6f7f9; --panel:#ffffff; --ink:#16203a; --muted:#5d6b86; --hair:#e4e8ef;
    --accent:#1d4ed8; --full:#15803d; --full-bg:#e8f3ec; --partial:#b45309; --partial-bg:#fbf0e2;
    --r-transpile:#b45309; --r-incomplete:#7c3aed; --r-nomatch:#64748b; --r-named:#be123c; --r-render:#0891b2;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font-family:"Inter var",system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
    line-height:1.5;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1180px;margin:0 auto;padding:40px 24px 80px}
  header.top{border-bottom:1px solid var(--hair);padding-bottom:24px;margin-bottom:8px}
  .eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:600;margin:0 0 8px}
  h1{font-size:30px;line-height:1.2;margin:0 0 6px;text-wrap:balance;font-weight:680;letter-spacing:-.01em}
  .sub{color:var(--muted);margin:0;max-width:64ch}
  .stats{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
  .stat{background:var(--panel);border:1px solid var(--hair);border-radius:10px;padding:12px 16px;min-width:92px}
  .stat .n{font-size:24px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1}
  .stat .l{font-size:12px;color:var(--muted);margin-top:4px}
  .stat.full .n{color:var(--full)} .stat.partial .n{color:var(--partial)}
  .legend{font-size:12.5px;color:var(--muted);margin:14px 0 0}
  h2.sec{font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);
    font-weight:600;margin:40px 0 18px;display:flex;align-items:center;gap:10px}
  h2.sec::after{content:"";flex:1;height:1px;background:var(--hair)}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}
  .card{background:var(--panel);border:1px solid var(--hair);border-radius:14px;overflow:hidden;
    display:flex;flex-direction:column;transition:box-shadow .15s,transform .15s}
  .card-partial{border-color:#f0ddc4}
  .card:hover{box-shadow:0 8px 28px rgba(22,32,58,.10);transform:translateY(-2px)}
  .card-fig{background:#fcfcfd;border-bottom:1px solid var(--hair);aspect-ratio:1/1;display:grid;place-items:center;padding:8px}
  .card-fig img{max-width:100%;max-height:100%;object-fit:contain}
  .nofig{color:var(--muted)}
  .card-body{padding:13px 15px 15px}
  .card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
  .num{font-weight:650;font-size:13px;color:#3b4760;font-variant-numeric:tabular-nums}
  .chip{font-weight:650;font-size:11px;padding:3px 9px;border-radius:999px;white-space:nowrap}
  .chip.full{background:var(--full-bg);color:var(--full)}
  .chip.partial{background:var(--partial-bg);color:var(--partial)}
  .stmt{font-size:13px;margin:0;color:#2a3450}
  .fail-group{margin-bottom:24px}
  .fail-group h3{font-size:15px;margin:0 0 12px;display:flex;align-items:center;gap:9px;font-weight:650}
  .count{margin-left:4px;font-size:13px;color:var(--muted);font-weight:600;font-variant-numeric:tabular-nums}
  .dot{width:10px;height:10px;border-radius:3px;display:inline-block}
  .dot-transpile-fail{background:var(--r-transpile)} .dot-incomplete-coverage{background:var(--r-incomplete)}
  .dot-no-match{background:var(--r-nomatch)} .dot-named-missing{background:var(--r-named)} .dot-render{background:var(--r-render)}
  .fail-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
  .fail-list li{display:flex;gap:11px;align-items:baseline;background:var(--panel);
    border:1px solid var(--hair);border-radius:10px;padding:10px 13px;font-size:13px;color:#2a3450}
  .num-sm{flex:none}
</style>
<div class="wrap">
  <header class="top">
    <p class="eyebrow">Pipeline ảnh → OCR → vẽ hình 2D</p>
    <h1>Tổng hợp HHP ôn thi vào 10 (2018–2019) — review dựng hình</h1>
    <p class="sub">118 đề cắt từ PDF scan qua OCR (Tesseract + repairOcrSymbols), dựng bằng engine deterministic. <b>${drawn.length}/${rows.length}</b> đề render được hình (đầy đủ hoặc một phần) — đối chiếu với đề để kiểm tính đúng.</p>
    <div class="stats">
      <div class="stat full"><div class="n">${full.length}</div><div class="l">Đầy đủ</div></div>
      <div class="stat partial"><div class="n">${partial.length}</div><div class="l">Một phần</div></div>
      <div class="stat"><div class="n">${drawn.length}</div><div class="l">Có hình</div></div>
      <div class="stat"><div class="n">${none.length}</div><div class="l">Chưa vẽ được</div></div>
      <div class="stat"><div class="n">${Math.round((100 * drawn.length) / rows.length)}%</div><div class="l">Tỉ lệ có hình</div></div>
    </div>
    <p class="legend"><b style="color:var(--full)">Đầy đủ</b> = dựng trọn đề. <b style="color:var(--partial)">Một phần</b> = vẽ phần dựng được (đã transpile + verify sạch), bỏ clause chưa phủ rule.</p>
  </header>

  <h2 class="sec">Render được hình (${drawn.length}) — đầy đủ trước, một phần sau</h2>
  <div class="grid">
    ${drawn.map(card).join('\n')}
  </div>

  <h2 class="sec">Chưa vẽ được (${none.length}) — theo nguyên nhân</h2>
  ${failSections}
</div>`;

writeFileSync(outHtml, html, 'utf-8');
console.log(`gallery → ${outHtml} (${(html.length / 1024).toFixed(0)} KB, ${drawn.length} hình: ${full.length} full + ${partial.length} partial)`);
