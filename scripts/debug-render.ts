// scripts/debug-render.ts
//
// Debug-only: load saved DSL từ tmp/eval-pdf/{id}.json, transpile lại, render SVG.
// Tránh tốn token gọi AI khi đang fix render path.
//
// Usage:
//   npx tsx scripts/debug-render.ts cau-05

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

async function main() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
  });
  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      appVersion: '5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
      platform: 'Linux',
    },
    configurable: false, writable: false,
  });
  (globalThis as any).HTMLElement = dom.window.HTMLElement;
  (globalThis as any).Element = dom.window.Element;
  (globalThis as any).Node = dom.window.Node;
  (globalThis as any).SVGElement = dom.window.SVGElement;
  (globalThis as any).XMLSerializer = dom.window.XMLSerializer;
  (globalThis as any).getComputedStyle = dom.window.getComputedStyle;
  (globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
  (globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
  (dom.window as any).matchMedia = () => ({
    matches: false, media: '', onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  });
  (globalThis as any).matchMedia = (dom.window as any).matchMedia;

  const JXG: any = (await import('jsxgraph')).default;
  if (JXG.JSXGraph) JXG.JSXGraph.rendererType = 'svg';
  if (JXG.Options?.board) JXG.Options.board.renderer = 'svg';

  // Wrap board.create to log
  const origInitBoard = JXG.JSXGraph.initBoard;
  JXG.JSXGraph.initBoard = function (...args: any[]) {
    const board: any = origInitBoard.apply(this, args);
    const origCreate = board.create.bind(board);
    let createCount = 0;
    let errCount = 0;
    board.create = function (type: string, parents: any, attrs: any) {
      try {
        const el = origCreate(type, parents, attrs);
        createCount++;
        if (createCount <= 5) console.log(`  [board.create] ${type} ${JSON.stringify(parents).slice(0, 60)}`);
        return el;
      } catch (e) {
        errCount++;
        console.log(`  [board.create FAIL] ${type} ${JSON.stringify(parents).slice(0, 60)}: ${e instanceof Error ? e.message : e}`);
        throw e;
      }
    };
    // expose
    (board as any).__stats = () => ({ createCount, errCount });
    setTimeout(() => {
      console.log(`  [board stats] created=${createCount} errors=${errCount}`);
    }, 100);
    return board;
  };

  const { transpile } = await import('../src/stamps/geometry-2d/dsl/transpile');
  const { serializeBoard } = await import('../src/stamps/geometry-2d/serialize');
  const { renderGeometrySvgFromState } = await import('../src/stamps/geometry-2d/render');

  const id = process.argv[2] ?? 'cau-05';
  const saved = JSON.parse(readFileSync(resolve(process.cwd(), `tmp/eval-pdf/${id}.json`), 'utf-8'));
  if (!saved.ok) {
    console.error('Saved run is not ok:', saved.reason ?? saved.message);
    process.exit(1);
  }
  console.log(`[debug] re-transpile DSL from ${id}.json`);
  console.log(`  points=${saved.dsl.points.length} shapes=${saved.dsl.shapes.length}`);
  const trans = transpile(saved.dsl);
  if (!trans.ok) {
    console.error('transpile fail:', trans.errors);
    process.exit(1);
  }
  console.log(`  state order=${trans.state.order.length} objects=${Object.keys(trans.state.objects).length}`);
  const view = (trans.state.meta as any).view;
  const jsonState = serializeBoard(trans.state, view);
  console.log(`  jsonState len=${jsonState.length}`);
  // Check deserialize roundtrip
  const { deserializeBoard } = await import('../src/stamps/geometry-2d/serialize');
  const round = deserializeBoard(jsonState);
  console.log(`  round-trip state order=${round.order.length} domain=${round.meta.domain}`);
  // Try createStore directly
  const { createStore } = await import('../src/core/scene');
  const store = createStore(round);
  console.log(`  store.getState order=${store.getState().order.length}`);
  const svg = await renderGeometrySvgFromState(jsonState);
  console.log(`  svg len=${svg.length}`);
  console.log(`  svg has <ellipse|<circle|<line|<path:`,
    /<ellipse|<circle|<line|<path/.test(svg));
  // Dedupe xmlns + write SVG
  const deduped = svg.replace(/(<svg[^>]*?xmlns="[^"]*")([^>]*?)\s+xmlns="[^"]*"/, '$1$2');
  const outSvg = resolve(process.cwd(), `tmp/eval-pdf/${id}.debug.svg`);
  writeFileSync(outSvg, deduped);
  console.log(`  wrote ${outSvg}`);
  const sharp = (await import('sharp')).default;
  const outPng = resolve(process.cwd(), `tmp/eval-pdf/${id}.debug.png`);
  await sharp(Buffer.from(deduped), { density: 200 }).resize({ width: 800, fit: 'inside' }).png().toFile(outPng);
  console.log(`  wrote ${outPng}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
