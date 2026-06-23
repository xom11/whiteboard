import { perpBasis } from '../_ringBasis';

const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: number[]) => Math.hypot(a[0], a[1], a[2]);

describe('perpBasis (vành ⊥ trục cho cone3d/cylinder3d)', () => {
  it('trục đứng → vành NGANG (cả 2 vector z=0) — backward-compat render cũ', () => {
    const [u, v] = perpBasis([0, 0, 2]);
    expect(u[2]).toBeCloseTo(0, 9);
    expect(v[2]).toBeCloseTo(0, 9);
    expect(len(u)).toBeCloseTo(1, 9);
    expect(len(v)).toBeCloseTo(1, 9);
    expect(dot(u, v)).toBeCloseTo(0, 9);
  });
  it('trục nghiêng → 2 vector ⊥ trục, đơn vị, ⊥ nhau (vành nằm trên mặt nghiêng)', () => {
    const axis = [1, 1, 1];
    const [u, v] = perpBasis(axis as [number, number, number]);
    expect(dot(u, axis)).toBeCloseTo(0, 9);
    expect(dot(v, axis)).toBeCloseTo(0, 9);
    expect(dot(u, v)).toBeCloseTo(0, 9);
    expect(len(u)).toBeCloseTo(1, 9);
    expect(len(v)).toBeCloseTo(1, 9);
  });
  it('trục suy biến (0) → fallback XY', () => {
    const [u, v] = perpBasis([0, 0, 0]);
    expect(u).toEqual([1, 0, 0]);
    expect(v).toEqual([0, 1, 0]);
  });
});
