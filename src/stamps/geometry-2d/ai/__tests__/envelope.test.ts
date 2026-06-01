// src/stamps/geometry-2d/ai/__tests__/envelope.test.ts
import { FigureEnvelopeZ, envelopeJsonSchema, envelopeBuildDsl } from '../envelope';
import { fixture as eq } from '../../dsl/fixtures/triangle-equilateral';

describe('FigureEnvelopeZ', () => {
  it('build: figure đủ → ok', () => {
    const r = FigureEnvelopeZ.safeParse({ decision: 'build', figure: eq.dsl });
    expect(r.success).toBe(true);
  });

  it('refuse: reason không rỗng → ok', () => {
    const r = FigureEnvelopeZ.safeParse({ decision: 'refuse', reason: 'lý do' });
    expect(r.success).toBe(true);
  });

  it('build mà thiếu figure → fail (refine)', () => {
    const r = FigureEnvelopeZ.safeParse({ decision: 'build' });
    expect(r.success).toBe(false);
  });

  it('refuse mà thiếu reason → fail (refine)', () => {
    const r = FigureEnvelopeZ.safeParse({ decision: 'refuse' });
    expect(r.success).toBe(false);
  });

  it('refuse với reason rỗng → fail (refine)', () => {
    const r = FigureEnvelopeZ.safeParse({ decision: 'refuse', reason: '' });
    expect(r.success).toBe(false);
  });

  it('decision không hợp lệ → fail', () => {
    const r = FigureEnvelopeZ.safeParse({ decision: 'maybe', reason: 'x' });
    expect(r.success).toBe(false);
  });
});

describe('envelopeJsonSchema', () => {
  it('returns object schema với properties decision/figure/reason', () => {
    const s = envelopeJsonSchema();
    expect(s.type).toBe('object');
    const props = s.properties as Record<string, unknown>;
    expect(props.decision).toBeDefined();
    expect(props.figure).toBeDefined();
    expect(props.reason).toBeDefined();
  });

  it('no $ref (inline schema)', () => {
    const s = envelopeJsonSchema();
    const json = JSON.stringify(s);
    expect(json).not.toMatch(/\$ref/);
  });
});

describe('envelopeBuildDsl', () => {
  it('build envelope → DSL', () => {
    const env = { decision: 'build' as const, figure: eq.dsl };
    expect(envelopeBuildDsl(env)).toEqual(eq.dsl);
  });

  it('refuse envelope → throw', () => {
    expect(() => envelopeBuildDsl({ decision: 'refuse' as const, reason: 'x' })).toThrow();
  });
});
