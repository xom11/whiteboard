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
  const idx = text.search(/(Chứng minh|Chứng tỏ|CMR|C\/m|Tính|Gọi[^.]*\?|\s+a\))/i);
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

  const summary: Array<{ id: number; ok: boolean; reason?: string; points?: number; shapes?: number; text: string }> = [];
  let okCount = 0;
  for (const b of targets) {
    let r: any;
    const intro = introBeforeProof(b.text);
    try {
      r = tryDeterministicFigure(intro);
    } catch (e) {
      summary.push({ id: b.id, ok: false, reason: 'throw:' + (e instanceof Error ? e.message : String(e)), text: b.text });
      continue;
    }
    if (!r.ok) {
      summary.push({ id: b.id, ok: false, reason: r.reason, text: b.text });
      continue;
    }
    const dsl = r.figure.dsl;
    try {
      const view = (r.figure.transpile.state.meta as any).view;
      const jsonState = serializeBoard(r.figure.transpile.state, view);
      let svg = await renderGeometrySvgFromState(jsonState);
      svg = svg.replace(/(<svg[^>]*?xmlns="[^"]*")([^>]*?)\s+xmlns="[^"]*"/, '$1$2');
      const base = resolve(outDir, `cau-${String(b.id).padStart(3, '0')}`);
      await sharp(Buffer.from(svg), { density: 200 }).resize({ width: 700, fit: 'inside' }).png().toFile(`${base}.png`);
      okCount++;
      summary.push({ id: b.id, ok: true, points: dsl.points.length, shapes: dsl.shapes.length, text: b.text });
    } catch (e) {
      summary.push({ id: b.id, ok: false, reason: 'render:' + (e instanceof Error ? e.message : String(e)), text: b.text });
    }
  }
  writeFileSync(resolve(outDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf-8');
  const reasons: Record<string, number> = {};
  for (const s of summary) if (!s.ok) reasons[s.reason!.split(':')[0]] = (reasons[s.reason!.split(':')[0]] ?? 0) + 1;
  console.log(`render OK ${okCount}/${targets.length} → ${outDir}`);
  console.log('fail reasons:', JSON.stringify(reasons));
}

main().catch((e) => { console.error(e); process.exit(1); });
