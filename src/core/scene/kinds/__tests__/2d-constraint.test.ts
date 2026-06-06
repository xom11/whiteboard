// src/core/scene/kinds/__tests__/2d-constraint.test.ts
import { constraintRefs2D, type Constraint2D } from '../2d-constraint';

describe('constraintRefs2D — kind mới', () => {
  it('arcMidpoint trả về circle + a + b + notContaining', () => {
    const c: Constraint2D = {
      kind: 'arcMidpoint', circle: 'kO', a: 'pA', b: 'pB', notContaining: 'pC',
    };
    expect(constraintRefs2D(c)).toEqual(['kO', 'pA', 'pB', 'pC']);
  });

  it('excenter trả về 3 vertices (opposite ⊂ vertices, không thêm)', () => {
    const c: Constraint2D = {
      kind: 'excenter', vertices: ['pA', 'pB', 'pC'], opposite: 'pA',
    };
    expect(constraintRefs2D(c)).toEqual(['pA', 'pB', 'pC']);
  });
});
