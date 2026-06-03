// src/stamps/geometry-2d/ai/__tests__/buildFigure.test.ts
//
// Test orchestrator generateFigure() qua mock AIProvider — provider-agnostic,
// không cần mock SDK riêng cho từng provider impl.

import { generateFigure } from '../buildFigure';
import type { AIProvider, ProviderOutput, ProviderRequest } from '../providers';
import { fixture as equilateral } from '../../dsl/fixtures/triangle-equilateral';

function mockProvider(outputs: ProviderOutput[]): AIProvider & { calls: ProviderRequest[] } {
  const calls: ProviderRequest[] = [];
  let i = 0;
  const provider: AIProvider & { calls: ProviderRequest[] } = {
    name: 'mock',
    defaultModel: 'mock-default',
    async call(req) {
      calls.push(req);
      const out = outputs[i] ?? outputs[outputs.length - 1];
      i++;
      return out;
    },
    calls,
  };
  return provider;
}

describe('generateFigure — envelope orchestrator', () => {
  it('happy path: decision=build → ok:true, state + dsl + usage', async () => {
    const provider = mockProvider([
      {
        kind: 'json',
        data: { decision: 'build', figure: equilateral.dsl },
        usage: { inputTokens: 1500, outputTokens: 120, cacheReadTokens: 1400, cacheCreationTokens: 0 },
      },
    ]);
    const r = await generateFigure(equilateral.problem, { provider });
    if (!r.ok) throw new Error('expected ok: ' + JSON.stringify(r));
    expect(r.state.order).toEqual(['p1', 'p2', 'p3', 'poly1']);
    expect(r.dsl).toEqual(equilateral.dsl);
    expect(r.usage).toEqual({ inputTokens: 1500, outputTokens: 120, cacheReadTokens: 1400, cacheCreationTokens: 0 });
    expect(r.provider).toBe('mock');
  });

  it('refuse path: decision=refuse → ok:false reason=refused', async () => {
    const provider = mockProvider([
      { kind: 'json', data: { decision: 'refuse', reason: 'Đề thuộc lớp 11, ngoài phạm vi' }, usage: { inputTokens: 100, outputTokens: 20 } },
    ]);
    const r = await generateFigure('biến đổi affine', { provider });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe('refused');
    expect(r.message).toBe('Đề thuộc lớp 11, ngoài phạm vi');
    expect(r.provider).toBe('mock');
  });

  it('empty problem → api_error', async () => {
    const r = await generateFigure('', { provider: mockProvider([{ kind: 'error', message: 'should not call' }]) });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe('api_error');
    expect(r.message).toContain('rỗng');
  });

  it('provider returns error → api_error preserves status', async () => {
    const provider = mockProvider([{ kind: 'error', message: 'Unauthorized', status: 401 }]);
    const r = await generateFigure('Tam giác ABC', { provider });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe('api_error');
    expect(r.message).toBe('Unauthorized');
    expect(r.status).toBe(401);
  });

  it('invalid envelope shape (missing decision) → parse_error', async () => {
    const provider = mockProvider([
      { kind: 'json', data: { figure: equilateral.dsl }, usage: { inputTokens: 50, outputTokens: 10 } },
    ]);
    const r = await generateFigure('test', { provider });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe('parse_error');
  });

  it('build với figure invalid DSL ref → parse_error (Zod fail)', async () => {
    const badDsl = {
      version: 1,
      points: [{ name: 'A', kind: 'midpoint', p1: 'ghost', p2: 'B' }],
      shapes: [],
    };
    const provider = mockProvider([
      { kind: 'json', data: { decision: 'build', figure: badDsl } },
    ]);
    const r = await generateFigure('test', { provider });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    // Zod chấp nhận shape midpoint nhưng transpile sẽ fail vì 'ghost' không tồn tại.
    expect(r.reason).toBe('transpile_error');
  });

  it('build với figure shape sai schema (kind không có) → parse_error', async () => {
    const badDsl = {
      version: 1,
      points: [{ name: 'A', kind: 'aliens', x: 0, y: 0 }],
      shapes: [],
    };
    const provider = mockProvider([{ kind: 'json', data: { decision: 'build', figure: badDsl } }]);
    const r = await generateFigure('test', { provider });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe('parse_error');
  });

  it('refuse với reason rỗng → parse_error (refine fail)', async () => {
    const provider = mockProvider([
      { kind: 'json', data: { decision: 'refuse', reason: '' } },
    ]);
    const r = await generateFigure('test', { provider });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe('parse_error');
  });

  it('passes systemPrompt + userPrompt + schema vào provider.call', async () => {
    const provider = mockProvider([
      { kind: 'json', data: { decision: 'build', figure: equilateral.dsl } },
    ]);
    await generateFigure('Đề test', { provider });
    expect(provider.calls).toHaveLength(1);
    const req = provider.calls[0];
    expect(req.systemPrompt.length).toBeGreaterThan(100);
    expect(req.userPrompt).toBe('Đề test');
    expect(req.schema).toBeDefined();
    expect((req.schema as { type?: string }).type).toBe('object');
  });

  it('model override → vào req.model', async () => {
    const provider = mockProvider([
      { kind: 'json', data: { decision: 'build', figure: equilateral.dsl } },
    ]);
    await generateFigure('test', { provider, model: 'custom-model' });
    expect(provider.calls[0].model).toBe('custom-model');
  });

  it('không truyền model → dùng provider.defaultModel', async () => {
    const provider = mockProvider([
      { kind: 'json', data: { decision: 'build', figure: equilateral.dsl } },
    ]);
    await generateFigure('test', { provider });
    expect(provider.calls[0].model).toBe('mock-default');
  });
});

describe('generateFigure — promptVariant', () => {
  test('default uses slim prompt', async () => {
    let captured = '';
    const provider: AIProvider = {
      name: 'mock',
      defaultModel: 'm',
      call: async (req: ProviderRequest) => {
        captured = req.systemPrompt;
        return { kind: 'error', message: 'mock' };
      },
    };
    await generateFigure('Cho tam giác ABC', { provider });
    expect(captured.length).toBeLessThan(8000);
  });

  test('promptVariant=full uses full prompt (21 fixtures)', async () => {
    let captured = '';
    const provider: AIProvider = {
      name: 'mock',
      defaultModel: 'm',
      call: async (req: ProviderRequest) => {
        captured = req.systemPrompt;
        return { kind: 'error', message: 'mock' };
      },
    };
    await generateFigure('Cho tam giác ABC', { provider, promptVariant: 'full' });
    expect(captured.length).toBeGreaterThan(20000);
  });
});
