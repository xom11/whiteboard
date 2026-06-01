// Vite dev plugin: expose POST /api/generate-figure that proxies to the
// whiteboard package's `handleGenerateFigure()` façade. Used by the demo
// harness to wire teacher prompt → AI → geometry stamp end-to-end without a
// real Next.js consumer.
//
// Design notes (re-usable for Next.js route / Cloudflare Worker / Bun):
//   - Provider/model selection lives in `getOptions` callback (lazy) — caller
//     can read env / config / per-request flags at REQUEST time, no restart.
//   - Mapping `GenerateResult` → user-facing JSON happens inside the package
//     (handleGenerateFigure). Transport layer stays I/O-only.
//   - To swap to Anthropic Claude, OpenAI, Gemini, ...: pass an `AIProvider`
//     instance through `getOptions().provider`. No middleware change needed.

import type { Plugin } from 'vite';
import type { HandleGenerateFigureOptions } from '../../src/stamps/geometry-2d/ai/handleGenerateFigure';

export interface AiMiddlewareOptions {
  /**
   * Resolve generation options per-request. Return an `AIProvider` instance,
   * an API key, or rely on env (default).
   *
   *   getOptions: () => ({ apiKey: process.env.ANTHROPIC_API_KEY })
   *   getOptions: () => ({ provider: new MyGeminiProvider() })
   *   getOptions: () => ({ ollamaDefaultModel: 'gemma3:12b' })
   */
  getOptions?: () => HandleGenerateFigureOptions;
}

export function aiMiddlewarePlugin(options: AiMiddlewareOptions = {}): Plugin {
  return {
    name: 'whiteboard-demo-ai-middleware',
    configureServer(server) {
      server.middlewares.use('/api/generate-figure', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          const problem = String(body?.problem ?? '');

          const { handleGenerateFigure } = await import(
            '../../src/stamps/geometry-2d/ai/handleGenerateFigure'
          );

          const opts = options.getOptions ? options.getOptions() : {};

          const result = await handleGenerateFigure(
            { problem },
            {
              ...opts,
              onResult: (raw) => {
                // Tối thiểu: log provider + reason (hoặc 'ok') để dev quan sát.
                const tag = raw.ok ? 'ok' : raw.reason;
                const provider = raw.ok ? raw.provider : raw.provider ?? '?';
                // eslint-disable-next-line no-console
                console.log(`[ai] ${provider} → ${tag}`);
                opts.onResult?.(raw);
              },
            },
          );

          res.statusCode = 200;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          // eslint-disable-next-line no-console
          console.error('[demo-ai-middleware]', err);
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ok: false, message }));
        }
      });
    },
  };
}
