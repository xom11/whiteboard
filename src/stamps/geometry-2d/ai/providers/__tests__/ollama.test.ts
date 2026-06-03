// src/stamps/geometry-2d/ai/providers/__tests__/ollama.test.ts
//
// Test OllamaProvider qua mock fetch. Không cần Ollama daemon chạy.

import { OllamaProvider } from '../ollama';

/**
 * Streaming-aware mock: serialize a single Ollama chat response as 1-line NDJSON
 * (done=true) so the new streaming reader path returns the same content.
 */
function makeFetchStream(
  body: {
    message?: { role?: string; content: string };
    prompt_eval_count?: number;
    eval_count?: number;
  },
): typeof fetch {
  const line = JSON.stringify({
    message: { content: body.message?.content ?? '' },
    done: true,
    prompt_eval_count: body.prompt_eval_count,
    eval_count: body.eval_count,
  }) + '\n';
  return (async () => {
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(line));
          controller.close();
        },
      }),
    } as unknown as Response;
  }) as unknown as typeof fetch;
}

function makeFetchHttpError(status: number, body = 'Internal Server Error'): typeof fetch {
  return (async () => {
    return {
      ok: false,
      status,
      statusText: body,
      async json() { return { error: body }; },
      async text() { return body; },
    } as unknown as Response;
  }) as unknown as typeof fetch;
}

function makeFetchThrow(message: string): typeof fetch {
  return (async () => {
    throw new Error(message);
  }) as unknown as typeof fetch;
}

describe('OllamaProvider', () => {
  it('default name + defaultModel', () => {
    const p = new OllamaProvider();
    expect(p.name).toBe('ollama');
    expect(p.defaultModel).toBe('gemma3:4b');
  });

  it('happy path: response.message.content JSON → kind:json + usage', async () => {
    const envelope = { decision: 'refuse', reason: 'demo' };
    const fetchImpl = makeFetchStream({
      message: { role: 'assistant', content: JSON.stringify(envelope) },
      prompt_eval_count: 350,
      eval_count: 42,
    });
    const provider = new OllamaProvider({ fetchImpl });
    const out = await provider.call({
      systemPrompt: 'sys', userPrompt: 'usr', schema: { type: 'object' },
      model: 'gemma3:4b', maxTokens: 1024,
    });
    expect(out.kind).toBe('json');
    if (out.kind !== 'json') throw new Error();
    expect(out.data).toEqual(envelope);
    expect(out.usage).toEqual({ inputTokens: 350, outputTokens: 42, cacheReadTokens: 0, cacheCreationTokens: 0 });
  });

  it('POST /api/chat với schema + model + messages', async () => {
    const captured: { url?: string; body?: any } = {};
    const fetchImpl = (async (url: string, init: RequestInit) => {
      captured.url = url;
      captured.body = JSON.parse(init.body as string);
      const line = JSON.stringify({
        message: { content: '{"decision":"refuse","reason":"x"}' },
        done: true,
        prompt_eval_count: 10,
        eval_count: 5,
      }) + '\n';
      return {
        ok: true, status: 200, statusText: 'OK',
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(line));
            controller.close();
          },
        }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const provider = new OllamaProvider({ baseUrl: 'http://127.0.0.1:9999', fetchImpl });
    await provider.call({
      systemPrompt: 'SYS', userPrompt: 'USR', schema: { type: 'object', x: 1 },
      model: 'gemma3:4b', maxTokens: 4096,
    });
    expect(captured.url).toBe('http://127.0.0.1:9999/api/chat');
    expect(captured.body.model).toBe('gemma3:4b');
    expect(captured.body.format).toEqual({ type: 'object', x: 1 });
    expect(captured.body.stream).toBe(true);
    expect(captured.body.messages).toEqual([
      { role: 'system', content: 'SYS' },
      { role: 'user', content: 'USR' },
    ]);
    expect(captured.body.options.num_predict).toBe(4096);
    expect(typeof captured.body.options.temperature).toBe('number');
  });

  it('trim trailing slash trong baseUrl', async () => {
    const captured: { url?: string } = {};
    const fetchImpl = (async (url: string) => {
      captured.url = url;
      const line = JSON.stringify({
        message: { content: '{"decision":"refuse","reason":"x"}' },
        done: true,
      }) + '\n';
      return {
        ok: true, status: 200, statusText: 'OK',
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(line));
            controller.close();
          },
        }),
      } as unknown as Response;
    }) as unknown as typeof fetch;
    const provider = new OllamaProvider({ baseUrl: 'http://localhost:11434/', fetchImpl });
    await provider.call({
      systemPrompt: 's', userPrompt: 'u', schema: {}, model: 'gemma3:4b', maxTokens: 1,
    });
    expect(captured.url).toBe('http://localhost:11434/api/chat');
  });

  it('network throw → kind:error', async () => {
    const provider = new OllamaProvider({ fetchImpl: makeFetchThrow('ECONNREFUSED') });
    const out = await provider.call({
      systemPrompt: 's', userPrompt: 'u', schema: {}, model: 'gemma3:4b', maxTokens: 1,
    });
    expect(out.kind).toBe('error');
    if (out.kind !== 'error') throw new Error();
    expect(out.message).toContain('ECONNREFUSED');
  });

  it('HTTP 500 → kind:error preserves status', async () => {
    const provider = new OllamaProvider({ fetchImpl: makeFetchHttpError(500, 'oops') });
    const out = await provider.call({
      systemPrompt: 's', userPrompt: 'u', schema: {}, model: 'gemma3:4b', maxTokens: 1,
    });
    expect(out.kind).toBe('error');
    if (out.kind !== 'error') throw new Error();
    expect(out.status).toBe(500);
    expect(out.message).toContain('500');
  });

  it('content rỗng → kind:error', async () => {
    const fetchImpl = makeFetchStream({
      message: { role: 'assistant', content: '' },
      prompt_eval_count: 0, eval_count: 0,
    });
    const provider = new OllamaProvider({ fetchImpl });
    const out = await provider.call({
      systemPrompt: 's', userPrompt: 'u', schema: {}, model: 'gemma3:4b', maxTokens: 1,
    });
    expect(out.kind).toBe('error');
    if (out.kind !== 'error') throw new Error();
    expect(out.message).toContain('rỗng');
  });

  it('content không phải JSON → kind:error', async () => {
    const fetchImpl = makeFetchStream({
      message: { role: 'assistant', content: 'not json {{{' },
      prompt_eval_count: 1, eval_count: 1,
    });
    const provider = new OllamaProvider({ fetchImpl });
    const out = await provider.call({
      systemPrompt: 's', userPrompt: 'u', schema: {}, model: 'gemma3:4b', maxTokens: 1,
    });
    expect(out.kind).toBe('error');
    if (out.kind !== 'error') throw new Error();
    expect(out.message).toContain('JSON');
  });

  it('custom defaultModel override', () => {
    const p = new OllamaProvider({ defaultModel: 'gemma3:1b' });
    expect(p.defaultModel).toBe('gemma3:1b');
  });
});

describe('OllamaProvider — onToken streaming', () => {
  test('emits onToken per NDJSON chunk', async () => {
    const chunks: string[] = [];
    const ndjson = [
      JSON.stringify({ message: { content: 'hel' }, done: false }),
      JSON.stringify({ message: { content: 'lo' }, done: false }),
      JSON.stringify({ message: { content: '' }, done: true, prompt_eval_count: 10, eval_count: 5 }),
    ].join('\n') + '\n';

    const fakeFetch = jest.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(ndjson));
          controller.close();
        },
      }),
    });

    const provider = new OllamaProvider({ fetchImpl: fakeFetch as never });
    await provider.call({
      systemPrompt: 's', userPrompt: 'u',
      schema: { type: 'object' } as never,
      model: 'gemma3:4b', maxTokens: 100,
      onToken: (c) => chunks.push(c),
    });

    expect(chunks).toEqual(['hel', 'lo']);
  });
});
