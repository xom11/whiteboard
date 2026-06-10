// src/core/scene/kinds/__tests__/pointConstructions.test.ts
import { arcMidpoint, excenter, pointAtDistanceCoord } from '../pointConstructions';

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

  it('sameSide=true → cung CHỨA reference (cùng phía, = antipode)', () => {
    // reference ở (0.707,0.707) (cung 45°). sameSide=false → cung đối (225°).
    // sameSide=true → cung chứa reference (45°) = đối xứng qua tâm.
    const ref: [number, number] = [Math.SQRT1_2, Math.SQRT1_2];
    const opp = arcMidpoint([0, 0], 1, [1, 0], [0, 1], ref);
    const same = arcMidpoint([0, 0], 1, [1, 0], [0, 1], ref, true);
    expect(same[0]).toBeCloseTo(Math.SQRT1_2, 6);
    expect(same[1]).toBeCloseTo(Math.SQRT1_2, 6);
    // antipode của ứng viên notContaining qua tâm (0,0).
    expect(same[0]).toBeCloseTo(-opp[0], 6);
    expect(same[1]).toBeCloseTo(-opp[1], 6);
  });

  it('sameSide=true với đường kính: chọn cung cùng phía reference', () => {
    // A=(1,0), B=(-1,0). reference trên (y>0). sameSide=true → cung TRÊN (0,1).
    const p = arcMidpoint([0, 0], 1, [1, 0], [-1, 0], [0, 1], true);
    expect(p[0]).toBeCloseTo(0, 6);
    expect(p[1]).toBeCloseTo(1, 6);
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

  it('tâm bàng tiếp đối diện C', () => {
    // I_C = (5A + 3B - 4C)/(5+3-4) = ((0+12+0)/4, (0+0-12)/4) = (3, -3).
    const p = excenter([[0, 0], [4, 0], [0, 3]], 2);
    expect(p[0]).toBeCloseTo(3, 6);
    expect(p[1]).toBeCloseTo(-3, 6);
  });

  it('3 đỉnh thẳng hàng → fallback trả về điểm hữu hạn, không crash', () => {
    const p = excenter([[0, 0], [1, 0], [2, 0]], 0);
    expect(Number.isFinite(p[0])).toBe(true);
    expect(Number.isFinite(p[1])).toBe(true);
  });
});

describe('pointAtDistanceCoord', () => {
  it('C trên tia A→B kéo dài qua B, cách B khoảng d', () => {
    // A=(0,0), B=(3,0), d=2 → C=(5,0)
    const c = pointAtDistanceCoord([0, 0], [3, 0], 2);
    expect(c[0]).toBeCloseTo(5, 6);
    expect(c[1]).toBeCloseTo(0, 6);
  });

  it('đổi thứ tự from/through → kéo dài về phía kia', () => {
    // from=B=(3,0), through=A=(0,0), d=2 → C=(-2,0)
    const c = pointAtDistanceCoord([3, 0], [0, 0], 2);
    expect(c[0]).toBeCloseTo(-2, 6);
    expect(c[1]).toBeCloseTo(0, 6);
  });

  it('hướng chéo: A=(3,0) B=(0,3) d=3 → C = B + 3·unit(B-A)', () => {
    const c = pointAtDistanceCoord([3, 0], [0, 3], 3);
    expect(c[0]).toBeCloseTo(-3 / Math.SQRT2, 6);
    expect(c[1]).toBeCloseTo(3 + 3 / Math.SQRT2, 6);
  });

  it('from ≡ through (suy biến) → trả về điểm hữu hạn, không NaN', () => {
    const c = pointAtDistanceCoord([1, 1], [1, 1], 5);
    expect(Number.isFinite(c[0])).toBe(true);
    expect(Number.isFinite(c[1])).toBe(true);
  });
});
