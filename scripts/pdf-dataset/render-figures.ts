// scripts/pdf-dataset/render-figures.ts
//
// Dựng hình 2D từ đề bài (path DETERMINISTIC, không LLM) + render PNG để kiểm
// tra mắt. Vòng lặp: đề text → tryDeterministicFigure → render state → PNG.
//
//   npx tsx scripts/pdf-dataset/render-figures.ts <datasetFile> <outDir> [N|from-to|all]
//     N        : chỉ render Câu N
//     from-to  : range, vd 1-20
//     all      : tất cả (mặc định)
//
// Ghi <outDir>/cau-NNN.png cho bài render được + <outDir>/summary.json.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

interface Bai { id: number; text: string }

// Phần dựng hình = cắt trước "Chứng minh"/"Tính"/"a)" (giống diag-all).
function introBeforeProof(text: string): string {
  const idx = text.search(/(Chứng minh|Chứng tỏ|CMR|C\/m|Tính|Gọi[^.]*\?|(?<![\p{L}])a\))/iu);
  return (idx >= 0 ? text.slice(0, idx) : text).trim();
}

function parseDataset(raw: string): Bai[] {
  const out: Bai[] = [];
  let cur: Bai | null = null;
  for (const line of raw.split('\n')) {
    const m = line.match(/^Câu\s+(\d+):\s*(.*)$/);
    if (m) {
      if (cur) out.push(cur);
      cur = { id: parseInt(m[1], 10), text: m[2] };
    } else if (cur && line.trim()) cur.text += ' ' + line.trim();
  }
  if (cur) out.push(cur);
  return out;
}

async function main() {
  const datasetFile = process.argv[2];
  const outDir = process.argv[3];
  const sel = process.argv[4] ?? 'all';
  if (!datasetFile || !outDir) { console.error('usage: render-figures.ts <dataset> <outDir> [N|from-to|all]'); process.exit(1); }
  mkdirSync(outDir, { recursive: true });

  // ---- jsdom bootstrap (PHẢI trước import pipeline/jsxgraph) ----
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  const stubNav = { appVersion: '5.0 (X11; Linux x86_64) AppleWebKit/537.36', userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36', platform: 'Linux' };
  Object.defineProperty(globalThis, 'navigator', { value: stubNav, configurable: false, writable: false, enumerable: true });
  (globalThis as any).HTMLElement = dom.window.HTMLElement;
  (globalThis as any).Element = dom.window.Element;
  (globalThis as any).Node = dom.window.Node;
  (globalThis as any).SVGElement = dom.window.SVGElement;
  (globalThis as any).XMLSerializer = dom.window.XMLSerializer;
  (globalThis as any).getComputedStyle = dom.window.getComputedStyle;
  (globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
  (globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
  (dom.window as any).matchMedia = (q: string) => ({ matches: false, media: q, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false });
  (globalThis as any).matchMedia = (dom.window as any).matchMedia;

  const JXG: any = (await import('jsxgraph')).default;
  if (JXG.JSXGraph) JXG.JSXGraph.rendererType = 'svg';
  if (JXG.Options?.board) JXG.Options.board.renderer = 'svg';

  const { tryDeterministicFigure } = await import('../../src/stamps/geometry-2d/ai/deterministic/tryDeterministicFigure');
  const { tryPartialFigure } = await import('../../src/stamps/geometry-2d/ai/deterministic/partialFigure');
  const { serializeBoard } = await import('../../src/stamps/geometry-2d/serialize');
  const { renderGeometrySvgFromState } = await import('../../src/stamps/geometry-2d/render');
  const sharp = (await import('sharp')).default;

  const all = parseDataset(readFileSync(datasetFile, 'utf-8'));
  let targets = all;
  if (sel !== 'all') {
    const range = sel.match(/^(\d+)-(\d+)$/);
    if (range) targets = all.filter((b) => b.id >= +range[1] && b.id <= +range[2]);
    else targets = all.filter((b) => b.id === +sel);
  }

  const summary: Array<{ id: number; ok: boolean; mode?: 'full' | 'partial' | 'none'; reason?: string; points?: number; shapes?: number; uncovered?: number; text: string }> = [];
  for (const b of targets) {
    let r: any;
    const intro = introBeforeProof(b.text);
    try {
      r = tryDeterministicFigure(intro);
    } catch {
      r = { ok: false, reason: 'throw' };
    }
    // FULL trước; nếu miss → PARTIAL (vẽ phần dựng được, đã transpile+verify sạch).
    let fig: any = null;
    let mode: 'full' | 'partial' = 'full';
    if (r.ok) {
      fig = r.figure;
    } else {
      let p: any = null;
      try {
        p = tryPartialFigure(intro);
      } catch {
        p = null;
      }
      if (p) {
        fig = p.figure;
        mode = 'partial';
      }
    }
    if (!fig) {
      summary.push({ id: b.id, ok: false, mode: 'none', reason: r.reason, text: b.text });
      continue;
    }
    try {
      const view = (fig.transpile.state.meta as any).view;
      const jsonState = serializeBoard(fig.transpile.state, view);
      let svg = await renderGeometrySvgFromState(jsonState);
      svg = svg.replace(/(<svg[^>]*?xmlns="[^"]*")([^>]*?)\s+xmlns="[^"]*"/, '$1$2');
      const base = resolve(outDir, `cau-${String(b.id).padStart(3, '0')}`);
      // flatten nền TRONG SUỐT → TRẮNG: SVG không có rect nền → PNG alpha=0, khi
      // hiển thị (convert RGB / viewer) bị dồn thành ĐEN khó nhìn. Nền trắng khớp
      // theme sáng của editor + dễ quan sát trên compare/montage.
      await sharp(Buffer.from(svg), { density: 200 })
        .resize({ width: 700, fit: 'inside' })
        .flatten({ background: '#ffffff' })
        .png()
        .toFile(`${base}.png`);
      const uncovered = mode === 'partial' ? (fig.coverage?.uncovered?.length ?? 0) : 0;
      summary.push({ id: b.id, ok: true, mode, points: fig.dsl.points.length, shapes: fig.dsl.shapes.length, uncovered, text: b.text });
    } catch (e) {
      summary.push({ id: b.id, ok: false, mode, reason: 'render:' + (e instanceof Error ? e.message : String(e)), text: b.text });
    }
  }
  writeFileSync(resolve(outDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf-8');
  const full = summary.filter((s) => s.ok && s.mode === 'full').length;
  const partial = summary.filter((s) => s.ok && s.mode === 'partial').length;
  const none = summary.filter((s) => !s.ok).length;
  console.log(`render: FULL ${full} + PARTIAL ${partial} = ${full + partial}/${targets.length} có hình (none ${none}) → ${outDir}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
