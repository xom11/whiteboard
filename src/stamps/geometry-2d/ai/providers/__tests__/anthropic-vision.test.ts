import { AnthropicProvider } from '../anthropic';
import type { VisionRequest } from '../types';

// Mock @anthropic-ai/sdk constructor + messages.create
const messagesCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: messagesCreate },
  }));
});

const sampleVisionReq: VisionRequest = {
  systemPrompt: 'sys',
  userPrompt: 'đọc ảnh',
  schema: { type: 'object' },
  images: [{ mediaType: 'image/png', base64: 'BASE64DATA' }],
  model: 'claude-opus-4-7',
  maxTokens: 512,
};

describe('AnthropicProvider.extractText', () => {
  beforeEach(() => messagesCreate.mockReset());

  it('exposes extractText method', () => {
    const p = new AnthropicProvider({ apiKey: 'k' });
    expect(typeof p.extractText).toBe('function');
  });

  it('sends content with image source.base64 + text user prompt', async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'tool_use',
          name: 'extract_problem_envelope',
          input: { decision: 'extract', text: 'Cho ABC', confidence: 'high' },
        },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
      stop_reason: 'tool_use',
    });
    const p = new AnthropicProvider({ apiKey: 'k' });
    const out = await p.extractText!(sampleVisionReq);

    expect(out.kind).toBe('json');
    const callArgs = messagesCreate.mock.calls[0][0];
    const userContent = callArgs.messages[0].content;
    expect(Array.isArray(userContent)).toBe(true);
    expect(userContent[0]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: 'BASE64DATA' },
    });
    expect(userContent[1]).toEqual({ type: 'text', text: 'đọc ảnh' });
    expect(callArgs.tools[0].name).toBe('extract_problem_envelope');
    expect(callArgs.tool_choice).toEqual({ type: 'tool', name: 'extract_problem_envelope' });
  });

  it('maps tool_use response → kind=json with envelope data', async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'tool_use',
          name: 'extract_problem_envelope',
          input: { decision: 'extract', text: 'abc', confidence: 'high' },
        },
      ],
      usage: { input_tokens: 1, output_tokens: 1 },
      stop_reason: 'tool_use',
    });
    const p = new AnthropicProvider({ apiKey: 'k' });
    const out = await p.extractText!(sampleVisionReq);
    expect(out.kind).toBe('json');
    if (out.kind === 'json') {
      expect(out.data).toEqual({ decision: 'extract', text: 'abc', confidence: 'high' });
    }
  });

  it('maps API throw → kind=error', async () => {
    messagesCreate.mockRejectedValueOnce({ message: 'rate limit', status: 429 });
    const p = new AnthropicProvider({ apiKey: 'k' });
    const out = await p.extractText!(sampleVisionReq);
    expect(out.kind).toBe('error');
    if (out.kind === 'error') {
      expect(out.message).toContain('rate limit');
      expect(out.status).toBe(429);
    }
  });

  it('falls back to defaultModel khi req.model omitted', async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'tool_use',
          name: 'extract_problem_envelope',
          input: { decision: 'extract', text: 'abc', confidence: 'high' },
        },
      ],
      usage: { input_tokens: 1, output_tokens: 1 },
      stop_reason: 'tool_use',
    });
    const p = new AnthropicProvider({ apiKey: 'k' });
    const req = { ...sampleVisionReq };
    delete (req as { model?: string }).model;
    await p.extractText!(req);
    expect(messagesCreate.mock.calls[0][0].model).toBe('claude-opus-4-7');
  });
});
