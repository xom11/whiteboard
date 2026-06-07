// src/stamps/geometry-2d/ai/__tests__/intentEnvelope.test.ts
import { intentEnvelopeJsonSchema } from '../intentEnvelope';

describe('intentEnvelopeJsonSchema — Tier 4+5 coverage', () => {
  const json = JSON.stringify(intentEnvelopeJsonSchema());

  it('exposes draw-line op + kinds', () => {
    expect(json).toContain('draw-line');
    expect(json).toContain('perpThrough');
    expect(json).toContain('parallelThrough');
    expect(json).toContain('tangentAt');
    expect(json).toContain('tangentFromExt');
  });

  it('exposes mark-shape op', () => {
    expect(json).toContain('mark-shape');
  });

  it('exposes new circle specs', () => {
    expect(json).toContain('centerRadius');
    expect(json).toContain('inscribedIn');
  });

  it('exposes new add-point constraint kinds', () => {
    expect(json).toContain('secondIntersection');
    expect(json).toContain('circleIntersection');
    expect(json).toContain('tangencyPoint');
    expect(json).toContain('tangentPoint');
    expect(json).toContain('angleBisectorFoot');
    expect(json).toContain('externalAngleBisectorFoot');
  });
});
