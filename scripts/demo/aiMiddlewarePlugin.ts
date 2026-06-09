// Vite dev plugin: expose POST /api/generate-figure (JSON) +
// /api/generate-figure/stream (SSE) that proxy to the whiteboard package's
// `handleGenerateFigure()` façade. Used by the demo harness to wire teacher
// prompt → AI → geometry stamp end-to-end without a real Next.js consumer.
//
// Design notes (re-usable for Next.js route / Cloudflare Worker / Bun):
//   - Provider/model selection lives in `getOptions` callback (lazy) — caller
//     can read env / config / per-request flags at REQUEST time, no restart.
//   - Mapping `GenerateResult` → user-facing JSON happens inside the package
//     (handleGenerateFigure). Transport layer stays I/O-only.
//   - To swap to Anthropic Claude, OpenAI, Gemini, ...: pass an `AIProvider`
//     instance through `getOptions().provider`. No middleware change needed.
//   - Streaming endpoint chỉ pass-through token count cho Ollama (NDJSON →
//     SSE). Final event là kết quả AiFigureUiResult đã transpile.

import type { Plugin } from 'vite';
import type { ServerResponse } from 'node:http';
import type { HandleGenerateFigureOptions } from '../../src/stamps/geometry-2d/ai/handleGenerateFigure';
import type { HandleGenerateFigureDeltaOptions } from '../../src/stamps/geometry-2d/ai/handleGenerateFigureDelta';

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
  /** Endpoint Ollama (cho streaming). Default http://localhost:11434. */
  ollamaBaseUrl?: string;
  /** Default Ollama model cho streaming endpoint. Default gemma3:4b. */
  ollamaDefaultModel?: string;
}

async function readJsonBody(req: import('node:http').IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function sse(res: ServerResponse, type: string, payload: unknown): void {
  res.write(`data: ${JSON.stringify({ type, ...(payload as object) })}\n\n`);
}

export function aiMiddlewarePlugin(options: AiMiddlewareOptions = {}): Plugin {
  return {
    name: 'whiteboard-demo-ai-middleware',
    configureServer(server) {
      // --- Non-streaming (JSON) endpoint --------------------------------
      server.middlewares.use('/api/generate-figure/stream', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        // SSE headers ASAP để client biết stream đã mở
        res.statusCode = 200;
        res.setHeader('content-type', 'text/event-stream');
        res.setHeader('cache-control', 'no-cache');
        res.setHeader('connection', 'keep-alive');

        try {
          const body = (await readJsonBody(req)) as { problem?: string };
          const problem = String(body?.problem ?? '');

          // === Mặc định: CHỈ deterministic (rule base), KHÔNG fallback LLM ===
          // Đang tối ưu rule base → muốn thấy đề nào rule chưa phủ ("không vẽ
          // được") thay vì để LLM che lấp gap. Bật lại LLM: WHITEBOARD_AI_FALLBACK_LLM=1.
          const llmFallback = ['1', 'true', 'yes'].includes(
            (process.env.WHITEBOARD_AI_FALLBACK_LLM ?? '').toLowerCase(),
          );
          if (!llmFallback) {
            const { handleGenerateFigure } = await import(
              '../../src/stamps/geometry-2d/ai/handleGenerateFigure'
            );
            const opts = { ...(options.getOptions?.() ?? {}), deterministicOnly: true };
            sse(res, 'progress', { tokens: 0 });
            const result = await handleGenerateFigure({ problem }, opts);
            sse(res, 'done', { result });
            res.end();
            // eslint-disable-next-line no-console
            console.log(
              `[ai-stream] deterministic-only → ${result.ok ? 'ok' : 'KHÔNG VẼ ĐƯỢC'} | ${problem.slice(0, 60)}`,
            );
            return;
          }

          // Provider != ollama → bypass Ollama streaming, fall back to
          // non-streaming handleGenerateFigure (Anthropic/ClaudeCli không
          // expose token-level streaming dễ qua subprocess/tool_use).
          const wantedProvider = (process.env.WHITEBOARD_AI_PROVIDER ?? 'claude-agent-sdk').toLowerCase();
          if (wantedProvider !== 'ollama') {
            const { handleGenerateFigure } = await import(
              '../../src/stamps/geometry-2d/ai/handleGenerateFigure'
            );
            const opts = options.getOptions ? options.getOptions() : {};
            sse(res, 'progress', { tokens: 0 });
            const result = await handleGenerateFigure({ problem }, opts);
            sse(res, 'done', { result });
            res.end();
            // eslint-disable-next-line no-console
            console.log(`[ai-stream] ${wantedProvider} (non-stream) → ${result.ok ? 'ok' : 'fail'}`);
            return;
          }

          const ollamaBaseUrl = options.ollamaBaseUrl ?? 'http://localhost:11434';
          const ollamaModel =
            options.getOptions?.().ollamaDefaultModel ??
            options.ollamaDefaultModel ??
            'gemma3:4b';

          // Build prompt + schema từ package (cùng module non-streaming dùng)
          const { buildSystemPrompt } = await import(
            '../../src/stamps/geometry-2d/ai/prompt'
          );
          const { envelopeJsonSchema, FigureEnvelopeZ, envelopeBuildDsl } = await import(
            '../../src/stamps/geometry-2d/ai/envelope'
          );
          const { transpile } = await import('../../src/stamps/geometry-2d/dsl');

          const systemPrompt = buildSystemPrompt();
          const schema = envelopeJsonSchema();

          const ollamaReq = await fetch(`${ollamaBaseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              model: ollamaModel,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: problem },
              ],
              format: schema,
              stream: true,
              options: { temperature: 0.2 },
            }),
            signal: AbortSignal.timeout(120_000),
          });

          if (!ollamaReq.ok || !ollamaReq.body) {
            sse(res, 'done', { result: { ok: false, message: `Ollama HTTP ${ollamaReq.status}` } });
            res.end();
            return;
          }

          const reader = ollamaReq.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let content = '';
          let tokens = 0;

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // NDJSON: parse từng line
            let nl;
            while ((nl = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, nl).trim();
              buffer = buffer.slice(nl + 1);
              if (!line) continue;
              try {
                const chunk = JSON.parse(line) as {
                  message?: { content?: string };
                  done?: boolean;
                  eval_count?: number;
                };
                if (chunk.message?.content) {
                  content += chunk.message.content;
                  // Estimate token count by content length / 4 (rough), or use eval_count
                  tokens = chunk.eval_count ?? Math.floor(content.length / 4);
                  sse(res, 'progress', { tokens });
                }
                if (chunk.done) {
                  tokens = chunk.eval_count ?? tokens;
                  sse(res, 'progress', { tokens });
                }
              } catch {
                // chunk JSON malformed → skip
              }
            }
          }

          // Parse final content
          let envelope: unknown;
          try {
            envelope = JSON.parse(content);
          } catch (e) {
            sse(res, 'done', {
              result: { ok: false, message: 'AI trả về JSON không hợp lệ' },
            });
            res.end();
            return;
          }

          const parsed = FigureEnvelopeZ.safeParse(envelope);
          if (!parsed.success) {
            sse(res, 'done', {
              result: { ok: false, message: 'AI trả về dữ liệu không hợp lệ.' },
            });
            res.end();
            return;
          }

          if (parsed.data.decision === 'refuse') {
            sse(res, 'done', { result: { ok: false, message: parsed.data.reason ?? 'AI từ chối' } });
            res.end();
            return;
          }

          const dsl = envelopeBuildDsl(parsed.data);
          const trans = transpile(dsl);
          if (!trans.ok) {
            sse(res, 'done', {
              result: {
                ok: false,
                message: 'AI tạo hình không hợp lệ. Vui lòng diễn đạt khác.',
              },
            });
            res.end();
            return;
          }
          sse(res, 'done', { result: { ok: true, state: trans.state } });
          res.end();
          // eslint-disable-next-line no-console
          console.log(`[ai-stream] ollama ${ollamaModel} → ok (${tokens} tok)`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          // eslint-disable-next-line no-console
          console.error('[ai-stream]', err);
          sse(res, 'done', { result: { ok: false, message } });
          res.end();
        }
      });

      // --- Non-streaming endpoint (existing) ---------------------------
      server.middlewares.use('/api/generate-figure', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        try {
          const body = (await readJsonBody(req)) as { problem?: string };
          const problem = String(body?.problem ?? '');

          const { handleGenerateFigure } = await import(
            '../../src/stamps/geometry-2d/ai/handleGenerateFigure'
          );

          const opts = options.getOptions ? options.getOptions() : {};

          const result = await handleGenerateFigure(
            { problem },
            {
              ...opts,
              onResult: (raw, attempt) => {
                const tag = raw.ok ? 'ok' : raw.reason;
                const provider = raw.ok ? raw.provider : raw.provider ?? '?';
                // eslint-disable-next-line no-console
                console.log(`[ai] attempt ${attempt} | ${provider} → ${tag}`);
                opts.onResult?.(raw, attempt);
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

      // --- Refine SSE endpoint ------------------------------------------
      server.middlewares.use('/api/generate-figure-refine/stream', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        // SSE headers ASAP để client biết stream đã mở
        res.statusCode = 200;
        res.setHeader('content-type', 'text/event-stream');
        res.setHeader('cache-control', 'no-cache');
        res.setHeader('connection', 'keep-alive');

        try {
          const body = (await readJsonBody(req)) as { problem?: string; currentDsl?: unknown };
          const problem = String(body?.problem ?? '');
          const currentDsl = body?.currentDsl;

          if (!problem || !currentDsl || typeof currentDsl !== 'object') {
            sse(res, 'done', {
              result: { ok: false, message: 'Thiếu problem hoặc currentDsl' },
            });
            res.end();
            return;
          }

          // Non-Ollama provider → fall back to non-streaming refine.
          const wantedProvider = (process.env.WHITEBOARD_AI_PROVIDER ?? 'claude-agent-sdk').toLowerCase();
          if (wantedProvider !== 'ollama') {
            const { handleGenerateFigureDelta } = await import(
              '../../src/stamps/geometry-2d/ai/handleGenerateFigureDelta'
            );
            const opts = options.getOptions ? options.getOptions() : {};
            sse(res, 'progress', { tokens: 0 });
            const result = await handleGenerateFigureDelta(
              { problem, currentDsl: currentDsl as never },
              opts,
            );
            sse(res, 'done', { result });
            res.end();
            // eslint-disable-next-line no-console
            console.log(`[ai-refine-stream] ${wantedProvider} (non-stream) → ${result.ok ? 'ok' : 'fail'}`);
            return;
          }

          const ollamaBaseUrl = options.ollamaBaseUrl ?? 'http://localhost:11434';
          const ollamaModel =
            options.getOptions?.().ollamaDefaultModel ??
            options.ollamaDefaultModel ??
            'gemma3:4b';

          const { buildRefineSystemPrompt } = await import(
            '../../src/stamps/geometry-2d/ai/refinePrompt'
          );
          const { refineEnvelopeJsonSchema, FigureRefineEnvelopeZ } = await import(
            '../../src/stamps/geometry-2d/ai/refineEnvelope'
          );
          const { transpile } = await import('../../src/stamps/geometry-2d/dsl');
          const { DslInput } = await import('../../src/stamps/geometry-2d/dsl');

          // Validate currentDsl shape
          const parsedDsl = DslInput.safeParse(currentDsl);
          if (!parsedDsl.success) {
            sse(res, 'done', {
              result: { ok: false, message: 'currentDsl không hợp lệ' },
            });
            res.end();
            return;
          }

          const currentDslT = parsedDsl.data;
          const systemPrompt = buildRefineSystemPrompt(currentDslT);
          const schema = refineEnvelopeJsonSchema();

          const ollamaReq = await fetch(`${ollamaBaseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              model: ollamaModel,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: problem },
              ],
              format: schema,
              stream: true,
              options: { temperature: 0.2 },
            }),
            signal: AbortSignal.timeout(120_000),
          });

          if (!ollamaReq.ok || !ollamaReq.body) {
            sse(res, 'done', { result: { ok: false, message: `Ollama HTTP ${ollamaReq.status}` } });
            res.end();
            return;
          }

          const reader = ollamaReq.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let content = '';
          let tokens = 0;

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // NDJSON: parse từng line
            let nl;
            while ((nl = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, nl).trim();
              buffer = buffer.slice(nl + 1);
              if (!line) continue;
              try {
                const chunk = JSON.parse(line) as {
                  message?: { content?: string };
                  done?: boolean;
                  eval_count?: number;
                };
                if (chunk.message?.content) {
                  content += chunk.message.content;
                  tokens = chunk.eval_count ?? Math.floor(content.length / 4);
                  sse(res, 'progress', { tokens });
                }
                if (chunk.done) {
                  tokens = chunk.eval_count ?? tokens;
                  sse(res, 'progress', { tokens });
                }
              } catch {
                // chunk JSON malformed → skip
              }
            }
          }

          // Parse final content
          let envelope: unknown;
          try {
            envelope = JSON.parse(content);
          } catch {
            sse(res, 'done', {
              result: { ok: false, message: 'AI trả về JSON không hợp lệ' },
            });
            res.end();
            return;
          }

          const parsed = FigureRefineEnvelopeZ.safeParse(envelope);
          if (!parsed.success) {
            sse(res, 'done', {
              result: { ok: false, message: 'AI trả về dữ liệu không hợp lệ.' },
            });
            res.end();
            return;
          }

          if (parsed.data.decision === 'refuse') {
            sse(res, 'done', { result: { ok: false, message: parsed.data.reason ?? 'AI từ chối' } });
            res.end();
            return;
          }

          // Merge delta (add) hoặc replace (replace)
          const figureRaw = parsed.data.figure as unknown;
          const figureParsed = DslInput.safeParse(figureRaw);
          if (!figureParsed.success) {
            sse(res, 'done', {
              result: { ok: false, message: 'AI trả về figure không hợp lệ.' },
            });
            res.end();
            return;
          }

          let dslToTranspile = figureParsed.data;
          if (parsed.data.decision === 'add') {
            dslToTranspile = {
              version: 1,
              points: [...currentDslT.points, ...figureParsed.data.points],
              shapes: [...currentDslT.shapes, ...figureParsed.data.shapes],
            };
          }

          const trans = transpile(dslToTranspile);
          if (!trans.ok) {
            sse(res, 'done', {
              result: {
                ok: false,
                message: 'AI tạo hình không hợp lệ. Vui lòng diễn đạt khác.',
              },
            });
            res.end();
            return;
          }
          sse(res, 'done', { result: { ok: true, state: trans.state } });
          res.end();
          // eslint-disable-next-line no-console
          console.log(
            `[ai-refine-stream] ollama ${ollamaModel} → ok (${tokens} tok, decision=${parsed.data.decision})`,
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          // eslint-disable-next-line no-console
          console.error('[ai-refine-stream]', err);
          sse(res, 'done', { result: { ok: false, message } });
          res.end();
        }
      });

      // --- Refine JSON endpoint -----------------------------------------
      server.middlewares.use('/api/generate-figure-refine', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        try {
          const body = (await readJsonBody(req)) as { problem?: string; currentDsl?: unknown };
          const problem = String(body?.problem ?? '');
          const currentDsl = body?.currentDsl;

          if (!problem || !currentDsl || typeof currentDsl !== 'object') {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ ok: false, message: 'Thiếu problem hoặc currentDsl' }));
            return;
          }

          const { handleGenerateFigureDelta } = await import(
            '../../src/stamps/geometry-2d/ai/handleGenerateFigureDelta'
          );
          const { DslInput } = await import('../../src/stamps/geometry-2d/dsl');

          const parsedDsl = DslInput.safeParse(currentDsl);
          if (!parsedDsl.success) {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ ok: false, message: 'currentDsl không hợp lệ' }));
            return;
          }

          const opts: HandleGenerateFigureDeltaOptions = options.getOptions
            ? options.getOptions()
            : {};

          const result = await handleGenerateFigureDelta(
            { problem, currentDsl: parsedDsl.data },
            {
              ...opts,
              onResult: (raw, attempt) => {
                const tag = raw.ok ? 'ok' : raw.reason;
                const provider = raw.ok ? raw.provider : raw.provider ?? '?';
                // eslint-disable-next-line no-console
                console.log(`[ai-refine] attempt ${attempt} | ${provider} → ${tag}`);
                opts.onResult?.(raw, attempt);
              },
            },
          );

          res.statusCode = 200;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          // eslint-disable-next-line no-console
          console.error('[demo-ai-refine-middleware]', err);
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ok: false, message }));
        }
      });
    },
  };
}
