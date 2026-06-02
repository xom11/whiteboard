import { VisionEnvelopeZ, visionEnvelopeJsonSchema } from '../envelope';

describe('VisionEnvelope', () => {
  it('parse decision=extract với text valid', () => {
    const e = VisionEnvelopeZ.parse({ decision: 'extract', text: 'Cho tam giác ABC', confidence: 'high' });
    expect(e.decision).toBe('extract');
    expect(e.text).toBe('Cho tam giác ABC');
    expect(e.confidence).toBe('high');
  });

  it('parse decision=refuse với reason valid', () => {
    const e = VisionEnvelopeZ.parse({ decision: 'refuse', reason: 'Ảnh không phải đề toán' });
    expect(e.decision).toBe('refuse');
    expect(e.reason).toBe('Ảnh không phải đề toán');
  });

  it('throw khi extract thiếu text', () => {
    expect(() => VisionEnvelopeZ.parse({ decision: 'extract' })).toThrow();
  });

  it('throw khi extract text rỗng', () => {
    expect(() => VisionEnvelopeZ.parse({ decision: 'extract', text: '' })).toThrow();
  });

  it('throw khi refuse thiếu reason', () => {
    expect(() => VisionEnvelopeZ.parse({ decision: 'refuse' })).toThrow();
  });

  it('confidence default omitted (optional)', () => {
    const e = VisionEnvelopeZ.parse({ decision: 'extract', text: 'abc' });
    expect(e.confidence).toBeUndefined();
  });

  it('jsonSchema generator returns object schema', () => {
    const schema = visionEnvelopeJsonSchema();
    expect(typeof schema).toBe('object');
    expect((schema as { type?: string }).type).toBe('object');
  });
});
