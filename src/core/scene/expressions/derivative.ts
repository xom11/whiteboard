// src/core/scene/expressions/derivative.ts
import { compile } from './parser';

/**
 * Numerical derivative bằng central difference.
 * f'(x) ≈ (f(x + h) - f(x - h)) / (2h)
 */
export function numericalDerivative(
  expression: string,
  params: Record<string, number>,
  x: number,
  h = 1e-5,
): number {
  const fn = compile(expression, params);
  if (typeof fn !== 'function') return NaN;
  const yPlus = fn(x + h);
  const yMinus = fn(x - h);
  if (!Number.isFinite(yPlus) || !Number.isFinite(yMinus)) return NaN;
  return (yPlus - yMinus) / (2 * h);
}
