// __tests__/coverage3d.test.ts
import { countGeometryKeywords3D } from '../vocabulary3d';
import { segmentClauses3D, computeCoverage3D } from '../coverage3d';

describe('3D vocabulary', () => {
  it('counts 3D solid + plane keywords', () => {
    expect(countGeometryKeywords3D('Cho hình chóp S.ABCD có đáy là hình vuông')).toBeGreaterThanOrEqual(2);
    expect(countGeometryKeywords3D('tứ diện ABCD')).toBeGreaterThanOrEqual(1);
    expect(countGeometryKeywords3D('giao tuyến của hai mặt phẳng')).toBeGreaterThanOrEqual(2);
    expect(countGeometryKeywords3D('xin chào không liên quan')).toBe(0);
  });
});

describe('segmentClauses3D', () => {
  it('splits on . ; newline and leading verbs, flags geometry clauses', () => {
    const cs = segmentClauses3D('Cho hình chóp S.ABCD. Gọi M là trung điểm của BC. Chứng minh điều gì đó vô nghĩa.');
    expect(cs.length).toBeGreaterThanOrEqual(2);
    expect(cs.find((c) => /hình chóp/.test(c.text))?.hasGeometry).toBe(true);
    expect(cs.find((c) => /trung điểm/.test(c.text))?.hasGeometry).toBe(true);
  });
  it('does not split inside a plane name like (SBC)', () => {
    const cs = segmentClauses3D('Tìm giao tuyến của (S,B,C) và (DMN)');
    expect(cs.length).toBe(1);
  });
});

describe('computeCoverage3D', () => {
  it('complete only when every geometry clause is claimed', () => {
    const cs = segmentClauses3D('Cho hình chóp S.ABCD. Gọi M là trung điểm của BC.');
    const geo = cs.filter((c) => c.hasGeometry);
    expect(computeCoverage3D(cs, geo.map((c) => c.id)).complete).toBe(true);
    expect(computeCoverage3D(cs, [geo[0].id]).complete).toBe(false);
  });
});
