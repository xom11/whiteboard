import { FigureRefineEnvelopeZ, refineEnvelopeJsonSchema } from '../refineEnvelope';

describe('FigureRefineEnvelopeZ', () => {
  const minimalFigure = { version: 1 as const, points: [{ name: 'X', kind: 'free' as const, x: 0, y: 0 }], shapes: [] };

  it('accepts decision=add with figure', () => {
    const r = FigureRefineEnvelopeZ.safeParse({ decision: 'add', figure: minimalFigure });
    expect(r.success).toBe(true);
  });

  it('accepts decision=replace with figure', () => {
    const r = FigureRefineEnvelopeZ.safeParse({ decision: 'replace', figure: minimalFigure });
    expect(r.success).toBe(true);
  });

  it('accepts decision=refuse with non-empty reason', () => {
    const r = FigureRefineEnvelopeZ.safeParse({ decision: 'refuse', reason: 'Ngoài phạm vi' });
    expect(r.success).toBe(true);
  });

  it('rejects decision=add without figure', () => {
    const r = FigureRefineEnvelopeZ.safeParse({ decision: 'add' });
    expect(r.success).toBe(false);
  });

  it('rejects decision=replace without figure', () => {
    const r = FigureRefineEnvelopeZ.safeParse({ decision: 'replace' });
    expect(r.success).toBe(false);
  });

  it('rejects decision=refuse with empty reason', () => {
    const r = FigureRefineEnvelopeZ.safeParse({ decision: 'refuse', reason: '' });
    expect(r.success).toBe(false);
  });

  it('rejects decision=refuse without reason', () => {
    const r = FigureRefineEnvelopeZ.safeParse({ decision: 'refuse' });
    expect(r.success).toBe(false);
  });

  it('rejects unknown decision', () => {
    const r = FigureRefineEnvelopeZ.safeParse({ decision: 'foo', figure: minimalFigure });
    expect(r.success).toBe(false);
  });
});

describe('refineEnvelopeJsonSchema', () => {
  it('returns valid JSON schema object with decision enum', () => {
    const schema = refineEnvelopeJsonSchema();
    expect(schema).toBeDefined();
    expect(typeof schema).toBe('object');
    const str = JSON.stringify(schema);
    expect(str).toContain('add');
    expect(str).toContain('replace');
    expect(str).toContain('refuse');
  });
});
