// src/core/scene/expressions/__tests__/derivative.test.ts
import { numericalDerivative } from '../derivative';

describe('numericalDerivative', () => {
  it('d/dx x^2 tại x=1 → 2', () => {
    expect(numericalDerivative('x^2', {}, 1)).toBeCloseTo(2, 4);
  });

  it('d/dx x^3 tại x=2 → 12', () => {
    expect(numericalDerivative('x^3', {}, 2)).toBeCloseTo(12, 3);
  });

  it('d/dx a*x tại x=5 → a', () => {
    expect(numericalDerivative('a*x', { a: 3 }, 5)).toBeCloseTo(3, 4);
  });

  it('d/dx sin(x) tại x=0 → 1', () => {
    expect(numericalDerivative('sin(x)', {}, 0)).toBeCloseTo(1, 3);
  });

  it('NaN cho invalid expression', () => {
    expect(numericalDerivative('x +', {}, 0)).toBeNaN();
  });
});
