import { addPointOnCurve, addIntersection, addTangent, numericalDerivative } from '../handlers';
import { EMPTY_GRAPH } from '../../serialize';

const idFactory = () => 'gen-id-' + Math.random().toString(36).slice(2, 6);

describe('handlers', () => {
  it('addPointOnCurve thêm point với functionId', () => {
    const g = addPointOnCurve(EMPTY_GRAPH, { x: 2, y: 4, functionId: 'f1' }, () => 'p1');
    expect(g.points).toHaveLength(1);
    expect(g.points[0]).toMatchObject({ id: 'p1', functionId: 'f1', x: 2 });
  });

  it('addPointOnCurve không-op nếu thiếu functionId', () => {
    const g = addPointOnCurve(EMPTY_GRAPH, { x: 2, y: 4 }, idFactory);
    expect(g.points).toHaveLength(0);
  });

  it('addIntersection thêm pair', () => {
    const g = addIntersection(EMPTY_GRAPH, 'f1', 'f2', () => 'i1');
    expect(g.intersections).toHaveLength(1);
  });

  it('addIntersection skip duplicate', () => {
    let g = addIntersection(EMPTY_GRAPH, 'f1', 'f2', () => 'i1');
    g = addIntersection(g, 'f2', 'f1', () => 'i2');
    expect(g.intersections).toHaveLength(1);
  });

  it('addIntersection skip same function', () => {
    const g = addIntersection(EMPTY_GRAPH, 'f1', 'f1', idFactory);
    expect(g.intersections).toHaveLength(0);
  });

  it('addTangent thêm tangent từ point', () => {
    const g = addTangent(EMPTY_GRAPH, 'p1', () => 't1');
    expect(g.tangents).toHaveLength(1);
  });

  it("numericalDerivative tính f'(x) = 2x cho x^2", () => {
    expect(numericalDerivative('x^2', {}, 3)).toBeCloseTo(6, 2);
  });
});
