// src/stamps/geometry-2d/ai/providers/__tests__/anthropic.test.ts
import { AnthropicProvider } from '../anthropic';

const mockCreate = jest.fn();
const mockConstructor = jest.fn(() => ({ messages: { create: mockCreate } }));

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: function Anthropic(args: unknown) {
    return mockConstructor(args);
  },
}));

describe('AnthropicProvider', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockConstructor.mockClear();
  });

  it('throws nếu thiếu apiKey', () => {
    expect(() => new AnthropicProvider({ apiKey: '' })).toThrow(/apiKey/);
  });

  it('constructs SDK client với apiKey', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', id: 'tu1', name: 'emit_figure_envelope', input: { decision: 'refuse', reason: 'x' } }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 10, output_tokens: 5 },
    });
    const provider = new AnthropicProvider({ apiKey: 'sk-test' });
    await provider.call({
      systemPrompt: 'sys',
      userPrompt: 'user',
      schema: { type: 'object' },
      model: 'claude-opus-4-7',
      maxTokens: 100,
    });
    expect(mockConstructor).toHaveBeenCalledWith({ apiKey: 'sk-test' });
  });

  it('happy path: tool_use envelope → kind:json + data + usage', async () => {
    const envelope = { decision: 'build', figure: { version: 1, points: [], shapes: [] } };
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', id: 'tu1', name: 'emit_figure_envelope', input: envelope }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 1500, output_tokens: 120, cache_read_input_tokens: 1400 },
    });
    const provider = new AnthropicProvider({ apiKey: 'sk-test' });
    const out = await provider.call({
      systemPrompt: 'sys', userPrompt: 'user', schema: { type: 'object' },
      model: 'claude-opus-4-7', maxTokens: 100,
    });
    expect(out.kind).toBe('json');
    if (out.kind !== 'json') throw new Error();
    expect(out.data).toEqual(envelope);
    expect(out.usage).toEqual({
      inputTokens: 1500, outputTokens: 120, cacheReadTokens: 1400, cacheCreationTokens: 0,
    });
  });

  it('tool_use với name khác → kind:error', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', id: 'x', name: 'mystery', input: {} }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 10, output_tokens: 5 },
    });
    const provider = new AnthropicProvider({ apiKey: 'sk-test' });
    const out = await provider.call({
      systemPrompt: 's', userPrompt: 'u', schema: {}, model: 'm', maxTokens: 1,
    });
    expect(out.kind).toBe('error');
    if (out.kind !== 'error') throw new Error();
    expect(out.message).toContain('mystery');
  });

  it('no tool_use → kind:error', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'hi' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 },
    });
    const provider = new AnthropicProvider({ apiKey: 'sk-test' });
    const out = await provider.call({
      systemPrompt: 's', userPrompt: 'u', schema: {}, model: 'm', maxTokens: 1,
    });
    expect(out.kind).toBe('error');
  });

  it('SDK throws với status → kind:error preserves status', async () => {
    const err = Object.assign(new Error('Unauthorized'), { status: 401 });
    mockCreate.mockRejectedValue(err);
    const provider = new AnthropicProvider({ apiKey: 'sk-test' });
    const out = await provider.call({
      systemPrompt: 's', userPrompt: 'u', schema: {}, model: 'm', maxTokens: 1,
    });
    expect(out.kind).toBe('error');
    if (out.kind !== 'error') throw new Error();
    expect(out.message).toBe('Unauthorized');
    expect(out.status).toBe(401);
  });

  it('passes system block + tool + tool_choice vào SDK', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', id: 'tu1', name: 'emit_figure_envelope', input: { decision: 'refuse', reason: 'x' } }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    const provider = new AnthropicProvider({ apiKey: 'sk-test' });
    await provider.call({
      systemPrompt: 'SYS',
      userPrompt: 'USR',
      schema: { type: 'object', x: 1 },
      model: 'claude-opus-4-7',
      maxTokens: 4096,
    });
    const [req] = mockCreate.mock.calls[0];
    expect(req.model).toBe('claude-opus-4-7');
    expect(req.max_tokens).toBe(4096);
    expect(req.messages).toEqual([{ role: 'user', content: 'USR' }]);
    expect(req.system[0].text).toBe('SYS');
    expect(req.system[0].cache_control).toEqual({ type: 'ephemeral' }); // default true
    expect(req.tools[0].name).toBe('emit_figure_envelope');
    expect(req.tools[0].input_schema).toEqual({ type: 'object', x: 1 });
    expect(req.tool_choice).toEqual({ type: 'tool', name: 'emit_figure_envelope' });
  });

  it('enableCaching: false → no cache_control', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', id: 'tu1', name: 'emit_figure_envelope', input: { decision: 'refuse', reason: 'x' } }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    const provider = new AnthropicProvider({ apiKey: 'sk-test', enableCaching: false });
    await provider.call({
      systemPrompt: 'SYS', userPrompt: 'U', schema: {}, model: 'm', maxTokens: 1,
    });
    const [req] = mockCreate.mock.calls[0];
    expect(req.system[0].cache_control).toBeUndefined();
  });

  it('AbortSignal → forward vào SDK 2nd arg', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', id: 'tu1', name: 'emit_figure_envelope', input: { decision: 'refuse', reason: 'x' } }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    const ctrl = new AbortController();
    const provider = new AnthropicProvider({ apiKey: 'sk-test' });
    await provider.call({
      systemPrompt: 's', userPrompt: 'u', schema: {}, model: 'm', maxTokens: 1, signal: ctrl.signal,
    });
    const [, opts] = mockCreate.mock.calls[0];
    expect(opts).toEqual({ signal: ctrl.signal });
  });

  it('defaultModel = claude-opus-4-7', () => {
    const provider = new AnthropicProvider({ apiKey: 'k' });
    expect(provider.name).toBe('anthropic');
    expect(provider.defaultModel).toBe('claude-opus-4-7');
  });
});
