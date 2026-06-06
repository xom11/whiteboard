// src/core/scene/kinds/__tests__/pointConstructions.test.ts
import { arcMidpoint, excenter } from '../pointConstructions';

describe('arcMidpoint', () => {
  // Đường tròn đơn vị tâm (0,0) R=1. A=(1,0), B=(0,1).
  // Cung AB không chứa C=(-1,0)/√2... lấy C = điểm góc 135° = (-0.707,0.707).
  // Trung điểm cung AB nhỏ (không chứa C) ở góc 45° = (0.707, 0.707).
  it('chọn cung KHÔNG chứa notContaining (cung nhỏ)', () => {
    const p = arcMidpoint([0, 0], 1, [1, 0], [0, 1], [-Math.SQRT1_2, Math.SQRT1_2]);
    expect(p[0]).toBeCloseTo(Math.SQRT1_2, 6);
    expect(p[1]).toBeCloseTo(Math.SQRT1_2, 6);
  });

  it('đảo phía notContaining → đảo cung (cung lớn)', () => {
    // notContaining giờ ở (0.707,0.707) (cùng cung 45°) → chọn cung đối diện (225°).
    const p = arcMidpoint([0, 0], 1, [1, 0], [0, 1], [Math.SQRT1_2, Math.SQRT1_2]);
    expect(p[0]).toBeCloseTo(-Math.SQRT1_2, 6);
    expect(p[1]).toBeCloseTo(-Math.SQRT1_2, 6);
  });

  it('AB là đường kính (chord midpoint = tâm): vẫn chọn theo phía', () => {
    // A=(1,0), B=(-1,0), đường kính nằm ngang. notContaining ở trên (y>0)
    // → trung điểm cung dưới (0,-1).
    const p = arcMidpoint([0, 0], 1, [1, 0], [-1, 0], [0, 1]);
    expect(p[0]).toBeCloseTo(0, 6);
    expect(p[1]).toBeCloseTo(-1, 6);
  });
});

describe('excenter', () => {
  // Tam giác vuông A=(0,0), B=(4,0), C=(0,3). a=|BC|=5, b=|CA|=3, c=|AB|=4.
  // Tâm bàng tiếp đối diện A: I_A = (-5A + 3B + 4C)/(-5+3+4)
  //   = ((-0 + 12 + 0)/2, (0 + 0 + 12)/2) = (6, 6).
  it('tâm bàng tiếp đối diện A của tam giác 3-4-5', () => {
    const p = excenter([[0, 0], [4, 0], [0, 3]], 0);
    expect(p[0]).toBeCloseTo(6, 6);
    expect(p[1]).toBeCloseTo(6, 6);
  });

  it('tâm bàng tiếp đối diện B', () => {
    // I_B = (5A - 3B + 4C)/(5-3+4) = ((0-12+0)/6,(0-0+12)/6) = (-2, 2).
    const p = excenter([[0, 0], [4, 0], [0, 3]], 1);
    expect(p[0]).toBeCloseTo(-2, 6);
    expect(p[1]).toBeCloseTo(2, 6);
  });
});
