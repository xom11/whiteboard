import { generateFigureDelta } from '../buildFigureDelta';
import type { AIProvider, ProviderOutput, ProviderRequest } from '../providers';
import type { DslInputT } from '../../dsl/schema';

function mockProvider(outputs: ProviderOutput[]): AIProvider & { calls: ProviderRequest[] } {
  const calls: ProviderRequest[] = [];
  let i = 0;
  return {
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
}

const triangleABC: DslInputT = {
  version: 1,
  points: [
    { name: 'A', kind: 'free', x: 0, y: 3 },
    { name: 'B', kind: 'free', x: -2, y: 0 },
    { name: 'C', kind: 'free', x: 3, y: 0 },
  ],
  shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
};

describe('generateFigureDelta — refine orchestrator', () => {
  it('decision=add: merges delta with currentDsl and transpiles', async () => {
    const provider = mockProvider([
      {
        kind: 'json',
        data: {
          decision: 'add',
          figure: {
            version: 1,
            points: [{ name: 'M', kind: 'midpoint', p1: 'B', p2: 'C' }],
            shapes: [{ name: 'AM', kind: 'segment', p1: 'A', p2: 'M' }],
          },
        },
        usage: { inputTokens: 800, outputTokens: 60 },
      },
    ]);
    const r = await generateFigureDelta(
      { problem: 'thêm trung điểm M của BC', currentDsl: triangleABC },
      { provider },
    );
    if (!r.ok) throw new Error('expected ok: ' + JSON.stringify(r));
    expect(r.mode).toBe('add');
    expect(r.mergedDsl.points).toHaveLength(4);
    expect(r.mergedDsl.shapes).toHaveLength(2);
    expect(r.state.order.length).toBe(6);
  });

  it('decision=replace: transpiles new figure alone (currentDsl ignored)', async () => {
    const newFigure: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 2 },
        { name: 'B', kind: 'free', x: -1.732, y: -1 },
        { name: 'C', kind: 'free', x: 1.732, y: -1 },
      ],
      shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
    };
    const provider = mockProvider([
      { kind: 'json', data: { decision: 'replace', figure: newFigure }, usage: { inputTokens: 800, outputTokens: 120 } },
    ]);
    const r = await generateFigureDelta(
      { problem: 'vẽ tam giác đều', currentDsl: triangleABC },
      { provider },
    );
    if (!r.ok) throw new Error('expected ok: ' + JSON.stringify(r));
    expect(r.mode).toBe('replace');
    expect(r.mergedDsl).toEqual(newFigure);
  });

  it('decision=refuse: returns ok:false reason=refused', async () => {
    const provider = mockProvider([
      { kind: 'json', data: { decision: 'refuse', reason: 'Yêu cầu tính toán' }, usage: { inputTokens: 100, outputTokens: 20 } },
    ]);
    const r = await generateFigureDelta(
      { problem: 'tính diện tích', currentDsl: triangleABC },
      { provider },
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe('refused');
    expect(r.message).toBe('Yêu cầu tính toán');
  });

  it('add with name collision: returns name_collision reason', async () => {
    const provider = mockProvider([
      {
        kind: 'json',
        data: {
          decision: 'add',
          figure: {
            version: 1,
            points: [{ name: 'A', kind: 'free', x: 99, y: 99 }],
            shapes: [],
          },
        },
        usage: { inputTokens: 200, outputTokens: 30 },
      },
    ]);
    const r = await generateFigureDelta(
      { problem: 'thêm điểm A khác', currentDsl: triangleABC },
      { provider, maxAttempts: 1 },
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe('name_collision');
    expect(r.collisions).toContain('A');
  });

  it('add with unresolved ref: returns unresolved_ref reason', async () => {
    const provider = mockProvider([
      {
        kind: 'json',
        data: {
          decision: 'add',
          figure: {
            version: 1,
            points: [{ name: 'M', kind: 'midpoint', p1: 'X', p2: 'Y' }],
            shapes: [],
          },
        },
        usage: { inputTokens: 200, outputTokens: 30 },
      },
    ]);
    const r = await generateFigureDelta(
      { problem: 'thêm trung điểm', currentDsl: triangleABC },
      { provider, maxAttempts: 1 },
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe('unresolved_ref');
    expect(r.refs.length).toBeGreaterThan(0);
  });

  it('empty problem → api_error', async () => {
    const r = await generateFigureDelta(
      { problem: '', currentDsl: triangleABC },
      { provider: mockProvider([{ kind: 'error', message: 'should not call' }]) },
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe('api_error');
  });

  it('provider error → api_error preserves status', async () => {
    const provider = mockProvider([{ kind: 'error', message: 'Unauthorized', status: 401 }]);
    const r = await generateFigureDelta({ problem: 'test', currentDsl: triangleABC }, { provider });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe('api_error');
    expect(r.status).toBe(401);
  });

  it('invalid envelope shape → parse_error', async () => {
    const provider = mockProvider([
      { kind: 'json', data: { decision: 'add' }, usage: { inputTokens: 50, outputTokens: 10 } },
    ]);
    const r = await generateFigureDelta({ problem: 'test', currentDsl: triangleABC }, { provider });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe('parse_error');
  });

  it('add with empty delta arrays → ok with no new entities', async () => {
    const provider = mockProvider([
      {
        kind: 'json',
        data: { decision: 'add', figure: { version: 1, points: [], shapes: [] } },
        usage: { inputTokens: 200, outputTokens: 20 },
      },
    ]);
    const r = await generateFigureDelta(
      { problem: 'không làm gì', currentDsl: triangleABC },
      { provider },
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.mode).toBe('add');
    expect(r.mergedDsl.points).toHaveLength(3);
  });

  it('passes refine system prompt to provider (contains currentDsl JSON)', async () => {
    const provider = mockProvider([
      {
        kind: 'json',
        data: {
          decision: 'add',
          figure: { version: 1, points: [], shapes: [] },
        },
        usage: { inputTokens: 100, outputTokens: 10 },
      },
    ]);
    await generateFigureDelta({ problem: 'test', currentDsl: triangleABC }, { provider });
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0].systemPrompt).toContain('"name": "A"');
    expect(provider.calls[0].userPrompt).toBe('test');
  });
});
