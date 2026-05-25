// src/stamps/geometry-2d/ai/__tests__/provider.test.ts
import { callProvider } from '../provider';

// Mock @anthropic-ai/sdk
const mockCreate = jest.fn();
const mockConstructor = jest.fn(() => ({
  messages: { create: mockCreate },
}));

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: function Anthropic(args: unknown) {
    return mockConstructor(args);
  },
}));

describe('callProvider', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockConstructor.mockClear();
  });

  it('constructs client with apiKey', async () => {
    mockCreate.mockResolvedValue({
      content: [], stop_reason: 'end_turn',
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    await callProvider({
      apiKey: 'sk-test',
      model: 'claude-opus-4-7',
      maxTokens: 100,
      system: [{ type: 'text', text: 'hi' }],
      tools: [],
      toolChoice: { type: 'any' },
      messages: [{ role: 'user', content: 'test' }],
    });
    expect(mockConstructor).toHaveBeenCalledWith({ apiKey: 'sk-test' });
  });

  it('passes through request args to messages.create', async () => {
    mockCreate.mockResolvedValue({
      content: [], stop_reason: 'end_turn',
      usage: { input_tokens: 0, output_tokens: 0 },
    });
    const sys = [{ type: 'text' as const, text: 'system', cache_control: { type: 'ephemeral' as const } }];
    await callProvider({
      apiKey: 'k',
      model: 'claude-opus-4-7',
      maxTokens: 4096,
      system: sys,
      tools: [{ name: 't', description: 'd', input_schema: {} }],
      toolChoice: { type: 'any' },
      messages: [{ role: 'user', content: 'Đề bài' }],
    });
    const [req] = mockCreate.mock.calls[0];
    expect(req.model).toBe('claude-opus-4-7');
    expect(req.max_tokens).toBe(4096);
    expect(req.system).toEqual(sys);
    expect(req.tool_choice).toEqual({ type: 'any' });
    expect(req.messages).toEqual([{ role: 'user', content: 'Đề bài' }]);
  });

  it('returns response shape unchanged', async () => {
    const resp = {
      content: [{ type: 'tool_use', id: 'tu1', name: 'build_figure', input: { hi: 1 } }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 80 },
    };
    mockCreate.mockResolvedValue(resp);
    const r = await callProvider({
      apiKey: 'k', model: 'm', maxTokens: 1, system: [], tools: [],
      toolChoice: { type: 'any' }, messages: [],
    });
    expect(r).toEqual(resp);
  });

  it('propagates AbortSignal via 2nd arg', async () => {
    mockCreate.mockResolvedValue({
      content: [], stop_reason: 'end_turn',
      usage: { input_tokens: 0, output_tokens: 0 },
    });
    const ctrl = new AbortController();
    await callProvider({
      apiKey: 'k', model: 'm', maxTokens: 1, system: [], tools: [],
      toolChoice: { type: 'any' }, messages: [],
      signal: ctrl.signal,
    });
    const [, opts] = mockCreate.mock.calls[0];
    expect(opts).toEqual({ signal: ctrl.signal });
  });
});
