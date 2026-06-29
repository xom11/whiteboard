// scripts/pdf-dataset/build-gallery.ts
//   npx tsx scripts/pdf-dataset/build-gallery.ts <figuresDir> <outHtml>
// Sinh trang review self-contained: 118 đề + hình render (base64) + lý do fail.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

interface Row { id: number; ok: boolean; reason?: string; points?: number; shapes?: number; text: string }

const figuresDir = process.argv[2];
const outHtml = process.argv[3];
const rows = JSON.parse(readFileSync(resolve(figuresDir, 'summary.json'), 'utf-8')) as Row[];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dataUri = (id: number): string | null => {
  const p = resolve(figuresDir, `cau-${String(id).padStart(3, '0')}.png`);
  if (!existsSync(p)) return null;
  return 'data:image/png;base64,' + readFileSync(p).toString('base64');
};

const ok = rows.filter((r) => r.ok);
const fail = rows.filter((r) => !r.ok);
const REASON_LABEL: Record<string, string> = {
  'transpile-fail': 'Transpile lỗi (ref/cascade)',
  'incomplete-coverage': 'Thiếu phủ clause',
  'no-match': 'Không rule nào khớp',
  'named-missing': 'Thiếu điểm có tên',
};
const reasonKey = (r?: string) => (r ?? '').split(':')[0];
const byReason: Record<string, Row[]> = {};
for (const r of fail) (byReason[reasonKey(r.reason)] ??= []).push(r);

const okCards = ok
  .map((r) => {
    const img = dataUri(r.id);
    return `<article class="card">
      <div class="card-fig">${img ? `<img loading="lazy" alt="Hình Câu ${r.id}" src="${img}">` : '<div class="nofig">—</div>'}</div>
      <div class="card-body">
        <div class="card-head"><span class="chip">Câu ${r.id}</span><span class="meta">${r.points ?? 0} điểm · ${r.shapes ?? 0} hình</span></div>
        <p class="stmt">${esc(r.text)}</p>
      </div>
    </article>`;
  })
  .join('\n');

const failSections = Object.entries(byReason)
  .sort((a, b) => b[1].length - a[1].length)
  .map(
    ([k, list]) => `<section class="fail-group">
      <h3><span class="dot dot-${k}"></span>${REASON_LABEL[k] ?? k} <span class="count">${list.length}</span></h3>
      <ul class="fail-list">
        ${list.map((r) => `<li><span class="chip chip-sm">Câu ${r.id}</span><span>${esc(r.text.slice(0, 160))}${r.text.length > 160 ? '…' : ''}</span></li>`).join('\n')}
      </ul>
    </section>`,
  )
  .join('\n');

const html = `<style>
  :root{
    --bg:#f6f7f9; --panel:#ffffff; --ink:#16203a; --muted:#5d6b86; --hair:#e4e8ef;
    --accent:#1d4ed8; --good:#15803d; --good-bg:#e8f3ec;
    --r-transpile:#b45309; --r-incomplete:#7c3aed; --r-nomatch:#64748b; --r-named:#be123c;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font-family:"Inter var",system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
    line-height:1.5;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1180px;margin:0 auto;padding:40px 24px 80px}
  header.top{border-bottom:1px solid var(--hair);padding-bottom:24px;margin-bottom:32px}
  .eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:600;margin:0 0 8px}
  h1{font-size:30px;line-height:1.2;margin:0 0 6px;text-wrap:balance;font-weight:680;letter-spacing:-.01em}
  .sub{color:var(--muted);margin:0;max-width:62ch}
  .stats{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
  .stat{background:var(--panel);border:1px solid var(--hair);border-radius:10px;padding:12px 16px;min-width:96px}
  .stat .n{font-size:24px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1}
  .stat .l{font-size:12px;color:var(--muted);margin-top:4px}
  .stat.good .n{color:var(--good)}
  h2.sec{font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);
    font-weight:600;margin:44px 0 18px;display:flex;align-items:center;gap:10px}
  h2.sec::after{content:"";flex:1;height:1px;background:var(--hair)}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}
  .card{background:var(--panel);border:1px solid var(--hair);border-radius:14px;overflow:hidden;
    display:flex;flex-direction:column;transition:box-shadow .15s,transform .15s}
  .card:hover{box-shadow:0 8px 28px rgba(22,32,58,.10);transform:translateY(-2px)}
  .card-fig{background:#fcfcfd;border-bottom:1px solid var(--hair);aspect-ratio:1/1;display:grid;place-items:center;padding:8px}
  .card-fig img{max-width:100%;max-height:100%;object-fit:contain}
  .nofig{color:var(--muted)}
  .card-body{padding:14px 16px 16px}
  .card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
  .chip{background:var(--good-bg);color:var(--good);font-weight:650;font-size:12px;
    padding:3px 9px;border-radius:999px;font-variant-numeric:tabular-nums}
  .chip-sm{background:#eef1f6;color:#3b4760;flex:none}
  .meta{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
  .stmt{font-size:13.5px;margin:0;color:#2a3450}
  .fail-group{margin-bottom:26px}
  .fail-group h3{font-size:15px;margin:0 0 12px;display:flex;align-items:center;gap:9px;font-weight:650}
  .count{margin-left:4px;font-size:13px;color:var(--muted);font-weight:600;font-variant-numeric:tabular-nums}
  .dot{width:10px;height:10px;border-radius:3px;display:inline-block}
  .dot-transpile-fail{background:var(--r-transpile)} .dot-incomplete-coverage{background:var(--r-incomplete)}
  .dot-no-match{background:var(--r-nomatch)} .dot-named-missing{background:var(--r-named)}
  .fail-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
  .fail-list li{display:flex;gap:11px;align-items:baseline;background:var(--panel);
    border:1px solid var(--hair);border-radius:10px;padding:10px 13px;font-size:13px;color:#2a3450}
</style>
<div class="wrap">
  <header class="top">
    <p class="eyebrow">Pipeline ảnh → OCR → vẽ hình 2D</p>
    <h1>Tổng hợp HHP ôn thi vào 10 (2018–2019) — review dựng hình</h1>
    <p class="sub">118 đề bài cắt từ PDF scan qua OCR (Tesseract + repairOcrSymbols), dựng hình bằng engine deterministic. Mỗi hình dưới đây tự sinh từ phần dựng hình của đề — đối chiếu với đề để kiểm tính đúng.</p>
    <div class="stats">
      <div class="stat good"><div class="n">${ok.length}</div><div class="l">Dựng được hình</div></div>
      <div class="stat"><div class="n">${rows.length}</div><div class="l">Tổng số đề</div></div>
      <div class="stat"><div class="n">${Math.round((100 * ok.length) / rows.length)}%</div><div class="l">Tỉ lệ full</div></div>
      <div class="stat"><div class="n">${fail.length}</div><div class="l">Chưa dựng</div></div>
    </div>
  </header>

  <h2 class="sec">Đã dựng hình (${ok.length})</h2>
  <div class="grid">
    ${okCards}
  </div>

  <h2 class="sec">Chưa dựng được (${fail.length}) — theo nguyên nhân</h2>
  ${failSections}
</div>`;

writeFileSync(outHtml, html, 'utf-8');
console.log(`gallery → ${outHtml} (${(html.length / 1024).toFixed(0)} KB, ${ok.length} hình nhúng)`);
