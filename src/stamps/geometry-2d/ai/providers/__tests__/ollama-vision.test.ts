import { OllamaProvider } from '../ollama';
import type { VisionRequest } from '../types';

const sampleReq: VisionRequest = {
  systemPrompt: 'sys',
  userPrompt: 'đọc',
  schema: { type: 'object' },
  images: [{ mediaType: 'image/png', base64: 'BASE64' }],
  model: 'gemma3:4b',
  maxTokens: 512,
};

function mockFetchOk(content: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      message: { role: 'assistant', content: JSON.stringify(content) },
      prompt_eval_count: 50,
      eval_count: 10,
      done: true,
      model: 'gemma3:4b',
    }),
  }) as unknown as typeof fetch;
}

describe('OllamaProvider.extractText', () => {
  it('exposes extractText method', () => {
    const p = new OllamaProvider();
    expect(typeof p.extractText).toBe('function');
  });

  it('sends POST /api/chat with images[] in messages[0]', async () => {
    const f = mockFetchOk({ decision: 'extract', text: 'abc', confidence: 'high' });
    const p = new OllamaProvider({ fetchImpl: f });
    await p.extractText!(sampleReq);

    const [url, init] = (f as jest.Mock).mock.calls[0];
    expect(url).toBe('http://localhost:11434/api/chat');
    const body = JSON.parse((init.body as string));
    expect(body.model).toBe('gemma3:4b');
    expect(body.messages[0]).toEqual({
      role: 'system',
      content: 'sys',
    });
    expect(body.messages[1]).toMatchObject({
      role: 'user',
      content: 'đọc',
      images: ['BASE64'],
    });
    expect(body.format).toEqual({ type: 'object' });
    expect(body.stream).toBe(false);
  });

  it('parses JSON response → kind=json with envelope data', async () => {
    const f = mockFetchOk({ decision: 'extract', text: 'tam giác', confidence: 'high' });
    const p = new OllamaProvider({ fetchImpl: f });
    const out = await p.extractText!(sampleReq);
    expect(out.kind).toBe('json');
    if (out.kind === 'json') {
      expect(out.data).toEqual({ decision: 'extract', text: 'tam giác', confidence: 'high' });
      expect(out.usage?.inputTokens).toBe(50);
    }
  });

  it('falls back to defaultModel khi req.model omitted', async () => {
    const f = mockFetchOk({ decision: 'extract', text: 'abc', confidence: 'high' });
    const p = new OllamaProvider({ fetchImpl: f, defaultModel: 'gemma3:12b' });
    const req = { ...sampleReq };
    delete (req as { model?: string }).model;
    await p.extractText!(req);
    const body = JSON.parse(((f as jest.Mock).mock.calls[0][1] as { body: string }).body);
    expect(body.model).toBe('gemma3:12b');
  });

  it('maps HTTP 5xx → kind=error', async () => {
    const f = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal',
      text: async () => 'server crash',
    }) as unknown as typeof fetch;
    const p = new OllamaProvider({ fetchImpl: f });
    const out = await p.extractText!(sampleReq);
    expect(out.kind).toBe('error');
    if (out.kind === 'error') expect(out.status).toBe(500);
  });

  it('maps fetch throw → kind=error', async () => {
    const f = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;
    const p = new OllamaProvider({ fetchImpl: f });
    const out = await p.extractText!(sampleReq);
    expect(out.kind).toBe('error');
    if (out.kind === 'error') expect(out.message).toContain('ECONNREFUSED');
  });
});
