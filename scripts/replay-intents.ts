// scripts/replay-intents.ts
//
// Replay saved intents qua normalizeIntents → intentToDsl → transpile → render.
// Dùng để verify fix mà không tốn token AI.
//
// Usage:
//   npx tsx scripts/replay-intents.ts cau-03

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
    value: { appVersion: '5.0', userAgent: 'X', platform: 'L' },
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

  const { normalizeIntents } = await import('../src/stamps/geometry-2d/ai/normalizeIntent');
  const { resolveCircleNameCollisions } = await import('../src/stamps/geometry-2d/ai/resolveCircleNames');
  const { intentsToDsl } = await import('../src/stamps/geometry-2d/ai/intentToDsl');
  const { transpile } = await import('../src/stamps/geometry-2d/dsl/transpile');
  const { serializeBoard } = await import('../src/stamps/geometry-2d/serialize');
  const { renderGeometrySvgFromState } = await import('../src/stamps/geometry-2d/render');
  const sharp = (await import('sharp')).default;

  const id = process.argv[2] ?? 'cau-03';
  const saved = JSON.parse(readFileSync(resolve(process.cwd(), `tmp/eval-pdf/${id}.json`), 'utf-8'));
  const problemsData = JSON.parse(readFileSync(resolve(process.cwd(), 'docs/superpowers/eval-pdf/problems.json'), 'utf-8'));
  const problem = problemsData.problems.find((p: any) => p.id === id);
  if (!problem) {
    console.error('problem not found:', id);
    process.exit(1);
  }
  const rawIntents = saved.intents;
  console.log(`[replay] ${id} — ${rawIntents.length} raw intents`);
  const normalized = normalizeIntents(rawIntents, problem.text);
  console.log(`  normalized=${normalized.length}`);
  // Show diff
  for (let i = 0; i < rawIntents.length; i++) {
    if (JSON.stringify(rawIntents[i]) !== JSON.stringify(normalized[i])) {
      console.log(`  diff[${i}]: ${JSON.stringify(rawIntents[i])} → ${JSON.stringify(normalized[i])}`);
    }
  }
  const processed = resolveCircleNameCollisions(normalized);
  if (processed.length !== normalized.length) {
    console.log(`  circle-collision processed: ${normalized.length} → ${processed.length} intents`);
  }
  let dsl;
  try {
    dsl = intentsToDsl(processed);
  } catch (e) {
    console.error(`  intentsToDsl fail: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
  console.log(`  dsl points=${dsl.points.length} shapes=${dsl.shapes.length}`);
  const trans = transpile(dsl);
  if (!trans.ok) {
    console.error('  transpile fail:', trans.errors);
    process.exit(1);
  }
  console.log(`  state order=${trans.state.order.length}`);
  const view = (trans.state.meta as any).view;
  const jsonState = serializeBoard(trans.state, view);
  const svg = await renderGeometrySvgFromState(jsonState);
  const deduped = svg.replace(/(<svg[^>]*?xmlns="[^"]*")([^>]*?)\s+xmlns="[^"]*"/, '$1$2');
  const outSvg = resolve(process.cwd(), `tmp/eval-pdf/${id}.svg`);
  const outPng = resolve(process.cwd(), `tmp/eval-pdf/${id}.png`);
  writeFileSync(outSvg, deduped);
  await sharp(Buffer.from(deduped), { density: 200 }).resize({ width: 800, fit: 'inside' }).png().toFile(outPng);
  console.log(`  wrote ${outPng} (${svg.length} svg bytes)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
