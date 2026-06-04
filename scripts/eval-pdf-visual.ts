// scripts/eval-pdf-visual.ts
//
// Visual eval harness — đọc problems.json, cho mỗi bài:
//   1. Gọi generateFigureIntent (claude-cli provider, mặc định Sonnet 4.6).
//   2. serializeBoard(state) → jsonState.
//   3. renderGeometrySvgFromState(jsonState) → svgString.
//   4. sharp → PNG, ghi tmp/eval-pdf/{id}.png + {id}.svg + {id}.json (intents/dsl/meta).
//
// Usage:
//   npx tsx scripts/eval-pdf-visual.ts                   # tất cả problems
//   npx tsx scripts/eval-pdf-visual.ts cau-01            # 1 problem
//   npx tsx scripts/eval-pdf-visual.ts cau-01 cau-02     # nhiều problem
//
// Provider mặc định = claude-cli (spawn `claude -p`) → dùng OAuth Max subscription
// của user, không cần ANTHROPIC_API_KEY/CLAUDE_CODE_OAUTH_TOKEN.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

interface Problem {
  id: string;
  tier: number;
  text: string;
}

interface ProblemsFile {
  problems: Problem[];
}

async function main() {
  // ---- jsdom bootstrap (PHẢI trước mọi import của pipeline / jsxgraph) ----
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
  });
  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  // JSXGraph SVGRenderer dùng `navigator.appVersion.indexOf` + `navigator.userAgent.match`.
  // Node 26 built-in `navigator` không có `appVersion`. Phải defineProperty lock-in
  // (assign thường bị overwrite lại bởi Node sau khi pipeline import xong).
  const stubNav = {
    appVersion: '5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    platform: 'Linux',
  };
  Object.defineProperty(globalThis, 'navigator', {
    value: stubNav, configurable: false, writable: false, enumerable: true,
  });
  (globalThis as any).HTMLElement = dom.window.HTMLElement;
  (globalThis as any).Element = dom.window.Element;
  (globalThis as any).Node = dom.window.Node;
  (globalThis as any).SVGElement = dom.window.SVGElement;
  (globalThis as any).XMLSerializer = dom.window.XMLSerializer;
  (globalThis as any).getComputedStyle = dom.window.getComputedStyle;
  (globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
  (globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
  (dom.window as any).matchMedia = (q: string) => ({
    matches: false, media: q, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  });
  (globalThis as any).matchMedia = (dom.window as any).matchMedia;

  // Force JSXGraph dùng SVG renderer (jsdom không có canvas).
  // JSXGraph detect Env.isNode() ở module load → set rendererType='canvas'.
  // Phải override sau load + cả Options.board.renderer.
  const JXG: any = (await import('jsxgraph')).default;
  if (JXG.JSXGraph) JXG.JSXGraph.rendererType = 'svg';
  if (JXG.Options?.board) JXG.Options.board.renderer = 'svg';

  // ---- Pipeline imports (dynamic, sau jsdom setup) ----
  const { generateFigureIntent } = await import('../src/stamps/geometry-2d/ai');
  const { ClaudeCliProvider } = await import('../src/stamps/geometry-2d/ai/providers');
  const { serializeBoard } = await import('../src/stamps/geometry-2d/serialize');
  const { renderGeometrySvgFromState } = await import('../src/stamps/geometry-2d/render');
  const sharp = (await import('sharp')).default;

  const OUT_DIR = resolve(process.cwd(), 'tmp/eval-pdf');
  mkdirSync(OUT_DIR, { recursive: true });

  const problemsPath = resolve(process.cwd(), 'docs/superpowers/eval-pdf/problems.json');
  const data = JSON.parse(readFileSync(problemsPath, 'utf-8')) as ProblemsFile;

  const idsArg = process.argv.slice(2);
  const targets = idsArg.length > 0
    ? data.problems.filter((p) => idsArg.includes(p.id))
    : data.problems;

  if (targets.length === 0) {
    console.error(`Không match problem nào. Available: ${data.problems.map((p) => p.id).join(', ')}`);
    process.exit(1);
  }

  const provider = new ClaudeCliProvider({
    defaultModel: 'claude-sonnet-4-6',
  });

  async function runOne(p: Problem): Promise<void> {
    console.log(`\n=== ${p.id} (tier ${p.tier}) ===`);
    console.log(p.text.slice(0, 120) + (p.text.length > 120 ? '…' : ''));
    const t0 = Date.now();
    const r = await generateFigureIntent(p.text, { provider });
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  → ${elapsed}s, provider=${r.provider ?? 'unknown'}`);

    const baseFile = resolve(OUT_DIR, p.id);

    if (!r.ok) {
      console.log(`  ❌ FAIL: ${r.reason} — ${r.message}`);
      writeFileSync(`${baseFile}.json`, JSON.stringify({ ok: false, ...r }, null, 2));
      return;
    }

    console.log(`  intents=${r.intents.length} points=${r.dsl.points.length} shapes=${r.dsl.shapes.length}`);

    // Render SVG
    let svgString = '';
    let renderError: string | null = null;
    try {
      // serializeBoard cần view tách rời. state.meta.view đã có từ transpile.
      const view = (r.transpile.state.meta as any).view;
      const jsonState = serializeBoard(r.transpile.state, view);
      svgString = await renderGeometrySvgFromState(jsonState);
    } catch (e) {
      renderError = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
      console.log(`  ⚠️  render error: ${renderError}`);
    }

    writeFileSync(`${baseFile}.json`, JSON.stringify({
      ok: true,
      elapsedSec: parseFloat(elapsed),
      intents: r.intents,
      dsl: r.dsl,
      verify: r.verify,
      usage: r.usage,
      provider: r.provider,
      renderError,
    }, null, 2));

    if (svgString) {
      // jsdom serializer + renderJsxgOffscreen có thể double-add `xmlns` → sharp fail.
      // Strip duplicate, giữ cái đầu.
      const deduped = svgString.replace(
        /(<svg[^>]*?xmlns="[^"]*")([^>]*?)\s+xmlns="[^"]*"/,
        '$1$2',
      );
      writeFileSync(`${baseFile}.svg`, deduped);
      try {
        await sharp(Buffer.from(deduped), { density: 200 })
          .resize({ width: 800, fit: 'inside', withoutEnlargement: false })
          .png()
          .toFile(`${baseFile}.png`);
        console.log(`  ✅ ${baseFile}.png`);
      } catch (e) {
        console.log(`  ⚠️  sharp PNG fail: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  for (const p of targets) {
    try {
      await runOne(p);
    } catch (e) {
      console.error(`  💥 unexpected: ${e instanceof Error ? e.message : e}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
