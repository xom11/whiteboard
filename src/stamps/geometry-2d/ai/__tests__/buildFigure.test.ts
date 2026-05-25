// src/stamps/geometry-2d/ai/__tests__/buildFigure.test.ts
import { generateFigure } from '../buildFigure';
import { fixture as equilateral } from '../../dsl/fixtures/triangle-equilateral';

// Mock provider — KHÔNG mock SDK trực tiếp vì nó được wrap trong provider.ts
const mockCallProvider = jest.fn();
jest.mock('../provider', () => ({
  callProvider: (args: unknown) => mockCallProvider(args),
}));

describe('generateFigure', () => {
  beforeEach(() => mockCallProvider.mockReset());

  it('happy path: build_figure with valid DSL → ok:true', async () => {
    mockCallProvider.mockResolvedValue({
      content: [{
        type: 'tool_use', id: 'tu1', name: 'build_figure',
        input: equilateral.dsl,
      }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 1500, output_tokens: 120, cache_read_input_tokens: 1400 },
    });
    const r = await generateFigure(equilateral.problem, { apiKey: 'sk-test' });
    if (!r.ok) throw new Error('expected ok: ' + JSON.stringify(r));
    expect(r.state.order).toEqual(['p1', 'p2', 'p3', 'poly1']);
    expect(r.dsl).toEqual(equilateral.dsl);
    expect(r.usage).toEqual({
      inputTokens: 1500, outputTokens: 120,
      cacheReadTokens: 1400, cacheCreationTokens: 0,
    });
  });

  it('refuse path: ok:false reason=refused with message', async () => {
    mockCallProvider.mockResolvedValue({
      content: [{
        type: 'tool_use', id: 'tu1', name: 'refuse',
        input: { reason: 'Đề thuộc lớp 11, ngoài phạm vi' },
      }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 100, output_tokens: 20 },
    });
    const r = await generateFigure('biến đổi affine', { apiKey: 'sk-test' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.reason).toBe('refused');
    expect(r.message).toBe('Đề thuộc lớp 11, ngoài phạm vi');
    expect(r.usage).toBeDefined();
  });

  it('empty problem → api_error', async () => {
    const r = await generateFigure('', { apiKey: 'sk-test' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.reason).toBe('api_error');
    expect(r.message).toContain('rỗng');
  });

  it('empty apiKey → api_error', async () => {
    const r = await generateFigure('Tam giác ABC', { apiKey: '' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.reason).toBe('api_error');
    expect(r.message).toContain('apiKey');
  });

  it('SDK throws → api_error preserves status', async () => {
    const err = Object.assign(new Error('Unauthorized'), { status: 401 });
    mockCallProvider.mockRejectedValue(err);
    const r = await generateFigure('Tam giác ABC', { apiKey: 'bad-key' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.reason).toBe('api_error');
    expect(r.message).toBe('Unauthorized');
    expect(r.status).toBe(401);
  });

  it('no tool_use in response → parse_error', async () => {
    mockCallProvider.mockResolvedValue({
      content: [{ type: 'text', text: 'Tôi không hiểu' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 5 },
    });
    const r = await generateFigure('xyzzy', { apiKey: 'sk-test' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.reason).toBe('parse_error');
  });

  it('unknown tool name → parse_error', async () => {
    mockCallProvider.mockResolvedValue({
      content: [{ type: 'tool_use', id: 'x', name: 'mystery', input: {} }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 50, output_tokens: 10 },
    });
    const r = await generateFigure('test', { apiKey: 'sk-test' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.reason).toBe('parse_error');
    expect(r.message).toContain('mystery');
  });

  it('build_figure with malformed DSL → transpile_error', async () => {
    mockCallProvider.mockResolvedValue({
      content: [{
        type: 'tool_use', id: 'tu1', name: 'build_figure',
        input: { version: 1, points: [{ name: 'A', kind: 'unknown' }], shapes: [] },
      }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 100, output_tokens: 30 },
    });
    const r = await generateFigure('test', { apiKey: 'sk-test' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.reason).toBe('transpile_error');
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.dsl).toEqual({ version: 1, points: [{ name: 'A', kind: 'unknown' }], shapes: [] });
  });

  it('default model = claude-opus-4-7', async () => {
    mockCallProvider.mockResolvedValue({
      content: [{
        type: 'tool_use', id: 'tu1', name: 'build_figure',
        input: equilateral.dsl,
      }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    await generateFigure(equilateral.problem, { apiKey: 'k' });
    const arg = mockCallProvider.mock.calls[0][0];
    expect(arg.model).toBe('claude-opus-4-7');
    expect(arg.maxTokens).toBe(8192);
  });

  it('enableCaching=true adds cache_control to system', async () => {
    mockCallProvider.mockResolvedValue({
      content: [{
        type: 'tool_use', id: 'tu1', name: 'build_figure',
        input: equilateral.dsl,
      }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    await generateFigure(equilateral.problem, { apiKey: 'k', enableCaching: true });
    const arg = mockCallProvider.mock.calls[0][0];
    expect(arg.system[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('enableCaching=false omits cache_control', async () => {
    mockCallProvider.mockResolvedValue({
      content: [{
        type: 'tool_use', id: 'tu1', name: 'build_figure',
        input: equilateral.dsl,
      }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    await generateFigure(equilateral.problem, { apiKey: 'k', enableCaching: false });
    const arg = mockCallProvider.mock.calls[0][0];
    expect(arg.system[0].cache_control).toBeUndefined();
  });

  it('forwards signal to callProvider', async () => {
    mockCallProvider.mockResolvedValue({
      content: [{
        type: 'tool_use', id: 'tu1', name: 'build_figure',
        input: equilateral.dsl,
      }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    const ctrl = new AbortController();
    await generateFigure(equilateral.problem, { apiKey: 'k', signal: ctrl.signal });
    const arg = mockCallProvider.mock.calls[0][0];
    expect(arg.signal).toBe(ctrl.signal);
  });
});
