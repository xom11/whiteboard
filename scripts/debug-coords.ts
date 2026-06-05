// scripts/debug-coords.ts — Diagnostic: replay saved intents, build a JSXGraph
// board (real JXG via jsdom), dump each point's resolved coords + circle radii +
// the auto-fit bbox and any points it clips. Complements replay-intents.ts when
// debugging degenerate geometry / bbox framing.
//   npx tsx scripts/debug-coords.ts cau-08
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

async function main() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', { value: { appVersion: '5.0', userAgent: 'X', platform: 'L' }, configurable: false, writable: false });
  for (const k of ['HTMLElement', 'Element', 'Node', 'SVGElement', 'XMLSerializer', 'getComputedStyle']) (globalThis as any)[k] = (dom.window as any)[k];
  (globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
  (globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
  (dom.window as any).matchMedia = () => ({ matches: false, media: '', addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false });
  (globalThis as any).matchMedia = (dom.window as any).matchMedia;

  const JXG: any = (await import('jsxgraph')).default;
  if (JXG.JSXGraph) JXG.JSXGraph.rendererType = 'svg';
  if (JXG.Options?.board) JXG.Options.board.renderer = 'svg';

  const { normalizeIntents } = await import('../src/stamps/geometry-2d/ai/normalizeIntent');
  const { resolveCircleNameCollisions } = await import('../src/stamps/geometry-2d/ai/resolveCircleNames');
  const { intentsToDsl } = await import('../src/stamps/geometry-2d/ai/intentToDsl');
  const { transpile } = await import('../src/stamps/geometry-2d/dsl/transpile');
  const { createStore } = await import('../src/core/scene');
  const { JxgRenderer } = await import('../src/core/scene/render/JxgRenderer');

  const id = process.argv[2] ?? 'cau-08';
  const saved = JSON.parse(readFileSync(resolve(process.cwd(), `tmp/eval-pdf/${id}.json`), 'utf-8'));
  const problemsData = JSON.parse(readFileSync(resolve(process.cwd(), 'docs/superpowers/eval-pdf/problems.json'), 'utf-8'));
  const problem = problemsData.problems.find((p: any) => p.id === id);
  const normalized = normalizeIntents(saved.intents, problem.text);
  const processed = resolveCircleNameCollisions(normalized);
  const dsl = intentsToDsl(processed);
  console.log('DSL points:', JSON.stringify(dsl.points, null, 0));
  console.log('DSL shapes:', JSON.stringify(dsl.shapes.filter((s: any) => s.kind.startsWith('circle') || s.kind === 'incircle'), null, 0));
  const trans = transpile(dsl);
  if (!trans.ok) { console.error('transpile fail', trans.errors); process.exit(1); }

  const container = document.createElement('div');
  container.style.width = '600px'; container.style.height = '600px';
  document.body.appendChild(container);
  (container as any).getBoundingClientRect = () => ({ width: 600, height: 600, left: 0, top: 0, right: 600, bottom: 600 });
  const board = JXG.JSXGraph.initBoard(container, { boundingbox: [-12, 12, 12, -12], axis: false, grid: false, showNavigation: false, showCopyright: false });
  const store = createStore(trans.state);
  new JxgRenderer(store, board);

  console.log('\n=== POINT COORDS ===');
  for (const o of board.objectsList) {
    if (o?.elementClass === 1 && typeof o.X === 'function') {
      console.log(`  ${o.name || '(unnamed)'} = (${o.X().toFixed(3)}, ${o.Y().toFixed(3)})`);
    }
  }
  console.log('\n=== CIRCLES ===');
  for (const o of board.objectsList) {
    if (o?.elementClass === 3 && o.center?.X && typeof o.Radius === 'function') {
      console.log(`  center=(${o.center.X().toFixed(3)}, ${o.center.Y().toFixed(3)}) r=${o.Radius().toFixed(3)}`);
    }
  }

  // Compute the auto-fit bbox the same way render.ts does, flag clipped points.
  const { computeAutoFitBbox } = await import('../src/stamps/geometry-2d/autoFitBbox');
  const samples: [number, number][] = [];
  const named: { name: string; x: number; y: number }[] = [];
  for (const o of board.objectsList) {
    if (o?.elementClass === 1 && typeof o.X === 'function') {
      const x = o.X(), y = o.Y();
      if (Number.isFinite(x) && Number.isFinite(y)) { samples.push([x, y]); named.push({ name: o.name || '?', x, y }); }
    } else if (o?.elementClass === 3 && o.center?.X && typeof o.Radius === 'function') {
      const cx = o.center.X(), cy = o.center.Y(), r = o.Radius();
      if (Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(r)) samples.push([cx - r, cy], [cx + r, cy], [cx, cy - r], [cx, cy + r]);
    }
  }
  const circlesArr: { cx: number; cy: number; r: number }[] = [];
  for (const o of board.objectsList) {
    if (o?.elementClass === 3 && o.center?.X && typeof o.Radius === 'function') {
      const cx = o.center.X(), cy = o.center.Y(), r = o.Radius();
      if (Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(r)) circlesArr.push({ cx, cy, r });
    }
  }
  const bbox = computeAutoFitBbox(named.map((p) => [p.x, p.y] as [number, number]), circlesArr, 1);
  console.log('\n=== AUTOFIT BBOX [xmin,ymax,xmax,ymin] ===');
  console.log('  ', bbox ? bbox.map((v) => v.toFixed(2)).join(', ') : 'null');
  if (bbox) {
    const [xmin, ymax, xmax, ymin] = bbox;
    const clipped = named.filter((p) => p.x < xmin || p.x > xmax || p.y < ymin || p.y > ymax);
    console.log('  CLIPPED points:', clipped.map((p) => `${p.name}(${p.x.toFixed(1)},${p.y.toFixed(1)})`).join(' ') || 'none');
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
