// src/core/scene/kinds/__tests__/point.test.ts
import '../point';
import { getKind } from '../../registry';
import { mkObj } from './helpers';

describe('kinds/point (2D)', () => {
  test('đã đăng ký với registry', () => {
    const def = getKind('point');
    expect(def.schemaVersion).toBe(1);
  });

  test('validate throw nếu thiếu constraint', () => {
    const def = getKind('point');
    expect(() => def.validate?.({} as never)).toThrow(/constraint/);
  });

  test('dependsOn free → []', () => {
    const def = getKind('point');
    expect(def.dependsOn({ constraint: { kind: 'free', x: 0, y: 0 } } as never))
      .toEqual([]);
  });

  test('dependsOn onLine → [lineId]', () => {
    const def = getKind('point');
    expect(def.dependsOn({ constraint: { kind: 'onLine', lineId: 'l1', t: 0.5 } } as never))
      .toEqual(['l1']);
  });

  test('dependsOn onCircle → [circleId]', () => {
    const def = getKind('point');
    expect(def.dependsOn({ constraint: { kind: 'onCircle', circleId: 'c1', theta: 0 } } as never))
      .toEqual(['c1']);
  });

  test('describe free → "Điểm <label>"', () => {
    const def = getKind('point');
    const obj = mkObj('point', 'A', { constraint: { kind: 'free', x: 1.5, y: 2.5 } });
    expect(def.describe(obj)).toBe('Điểm A');
  });

  test('dependsOn midpoint → [p1, p2]', () => {
    const def = getKind('point');
    expect(def.dependsOn({ constraint: { kind: 'midpoint', p1: 'A', p2: 'B' } } as never))
      .toEqual(['A', 'B']);
  });

  test('describe midpoint', () => {
    const def = getKind('point');
    const obj = mkObj('point', 'M', { constraint: { kind: 'midpoint', p1: 'A', p2: 'B' } });
    expect(def.describe(obj)).toMatch(/trung điểm AB/);
  });

  describe('constraint transformed', () => {
    const def = getKind('point');

    test('dependsOn translate → [source]', () => {
      expect(def.dependsOn({
        constraint: { kind: 'transformed', source: 'A', transform: { kind: 'translate', dx: 1, dy: 2 } },
      } as never)).toEqual(['A']);
    });

    test('dependsOn rotate → [source, center]', () => {
      expect(def.dependsOn({
        constraint: { kind: 'transformed', source: 'A', transform: { kind: 'rotate', angleRad: Math.PI / 2, center: 'O' } },
      } as never)).toEqual(['A', 'O']);
    });

    test('dependsOn reflectLine → [source, line]', () => {
      expect(def.dependsOn({
        constraint: { kind: 'transformed', source: 'A', transform: { kind: 'reflectLine', line: 'l1' } },
      } as never)).toEqual(['A', 'l1']);
    });

    test('dependsOn reflectPoint → [source, center]', () => {
      expect(def.dependsOn({
        constraint: { kind: 'transformed', source: 'A', transform: { kind: 'reflectPoint', center: 'O' } },
      } as never)).toEqual(['A', 'O']);
    });

    test('dependsOn dilate → [source, center]', () => {
      expect(def.dependsOn({
        constraint: { kind: 'transformed', source: 'A', transform: { kind: 'dilate', k: 2, center: 'O' } },
      } as never)).toEqual(['A', 'O']);
    });

    test('describe translate', () => {
      const obj = mkObj('point', "A'", {
        constraint: { kind: 'transformed', source: 'A', transform: { kind: 'translate', dx: 3, dy: 4 } },
      });
      expect(def.describe(obj)).toMatch(/A.*ảnh.*A.*tịnh tiến/);
    });

    test('describe rotate ghi rõ tâm + góc', () => {
      const obj = mkObj('point', "A'", {
        constraint: { kind: 'transformed', source: 'A', transform: { kind: 'rotate', angleRad: Math.PI, center: 'O' } },
      });
      expect(def.describe(obj)).toMatch(/180.*O|O.*180/);
    });
  });

  describe('constraint perpFoot', () => {
    const def = getKind('point');

    test('dependsOn perpFoot → [from, onLine]', () => {
      expect(def.dependsOn({
        constraint: { kind: 'perpFoot', from: 'A', onLine: 'l1' },
      } as never)).toEqual(['A', 'l1']);
    });

    test('describe perpFoot ghi đúng từ/đến', () => {
      const obj = mkObj('point', 'H', {
        constraint: { kind: 'perpFoot', from: 'A', onLine: 'l1' },
      });
      expect(def.describe(obj)).toMatch(/chân ⟂ từ A xuống l1/);
    });

    test('validate perpFoot throw khi thiếu from', () => {
      expect(() => def.validate?.({
        constraint: { kind: 'perpFoot', onLine: 'l1' },
      } as never)).toThrow(/perpFoot/);
    });

    test('validate perpFoot throw khi thiếu onLine', () => {
      expect(() => def.validate?.({
        constraint: { kind: 'perpFoot', from: 'A' },
      } as never)).toThrow(/perpFoot/);
    });
  });

  describe('constraint circumcenter', () => {
    const def = getKind('point');

    test('dependsOn → 3 vertices', () => {
      expect(def.dependsOn({
        constraint: { kind: 'circumcenter', vertices: ['A', 'B', 'C'] },
      } as never)).toEqual(['A', 'B', 'C']);
    });

    test('describe ghi rõ tâm ngoại tiếp', () => {
      const obj = mkObj('point', 'O', {
        constraint: { kind: 'circumcenter', vertices: ['A', 'B', 'C'] },
      });
      expect(def.describe(obj)).toMatch(/tâm ngoại tiếp.*ABC/);
    });

    test('validate throw khi vertices không phải tuple 3', () => {
      expect(() => def.validate?.({
        constraint: { kind: 'circumcenter', vertices: ['A', 'B'] },
      } as never)).toThrow(/circumcenter/);
    });

    test('validate throw khi vertex id rỗng', () => {
      expect(() => def.validate?.({
        constraint: { kind: 'circumcenter', vertices: ['A', '', 'C'] },
      } as never)).toThrow(/circumcenter/);
    });
  });

  describe('constraint incenter', () => {
    const def = getKind('point');

    test('dependsOn → 3 vertices', () => {
      expect(def.dependsOn({
        constraint: { kind: 'incenter', vertices: ['A', 'B', 'C'] },
      } as never)).toEqual(['A', 'B', 'C']);
    });

    test('describe ghi rõ tâm nội tiếp', () => {
      const obj = mkObj('point', 'I', {
        constraint: { kind: 'incenter', vertices: ['A', 'B', 'C'] },
      });
      expect(def.describe(obj)).toMatch(/tâm nội tiếp.*ABC/);
    });

    test('validate throw khi vertices không phải tuple 3', () => {
      expect(() => def.validate?.({
        constraint: { kind: 'incenter', vertices: ['A'] },
      } as never)).toThrow(/incenter/);
    });
  });

  describe('constraint centroid', () => {
    const def = getKind('point');

    test('dependsOn → 3 vertices', () => {
      expect(def.dependsOn({
        constraint: { kind: 'centroid', vertices: ['A', 'B', 'C'] },
      } as never)).toEqual(['A', 'B', 'C']);
    });

    test('describe ghi rõ trọng tâm', () => {
      const obj = mkObj('point', 'G', {
        constraint: { kind: 'centroid', vertices: ['A', 'B', 'C'] },
      });
      expect(def.describe(obj)).toMatch(/trọng tâm.*ABC/);
    });

    test('validate throw khi vertices không phải tuple 3', () => {
      expect(() => def.validate?.({
        constraint: { kind: 'centroid', vertices: ['A', 'B'] },
      } as never)).toThrow(/centroid/);
    });
  });

  describe('constraint orthocenter', () => {
    const def = getKind('point');

    test('dependsOn → 3 vertices', () => {
      expect(def.dependsOn({
        constraint: { kind: 'orthocenter', vertices: ['A', 'B', 'C'] },
      } as never)).toEqual(['A', 'B', 'C']);
    });

    test('describe ghi rõ trực tâm', () => {
      const obj = mkObj('point', 'H', {
        constraint: { kind: 'orthocenter', vertices: ['A', 'B', 'C'] },
      });
      expect(def.describe(obj)).toMatch(/trực tâm.*ABC/);
    });

    test('validate throw khi vertices không phải tuple 3', () => {
      expect(() => def.validate?.({
        constraint: { kind: 'orthocenter', vertices: ['A', 'B', 'C', 'D'] },
      } as never)).toThrow(/orthocenter/);
    });
  });
});

const pointDef = getKind('point')!;
const mkArcObj = (constraint: unknown) =>
  mkObj('point', 'M', { constraint } as { constraint: unknown });

describe('point arcMidpoint', () => {
  it('validate chấp nhận arcMidpoint đủ field', () => {
    expect(() => pointDef.validate!(mkArcObj({
      kind: 'arcMidpoint', circle: 'k', a: 'B', b: 'C', notContaining: 'A',
    }).attrs)).not.toThrow();
  });
  it('validate ném khi thiếu field', () => {
    expect(() => pointDef.validate!(mkArcObj({
      kind: 'arcMidpoint', circle: 'k', a: 'B',
    }).attrs)).toThrow();
  });
  it('describe ra mô tả tiếng Việt', () => {
    const s = { objects: { B: { label: 'B' }, C: { label: 'C' }, A: { label: 'A' } } } as never;
    expect(pointDef.describe!(mkArcObj({
      kind: 'arcMidpoint', circle: 'k', a: 'B', b: 'C', notContaining: 'A',
    }), s)).toBe('M = trung điểm cung BC (không chứa A)');
  });
  it('dependsOn trả về circle + a + b + notContaining', () => {
    expect(pointDef.dependsOn!(mkArcObj({
      kind: 'arcMidpoint', circle: 'k', a: 'B', b: 'C', notContaining: 'A',
    }).attrs)).toEqual(['k', 'B', 'C', 'A']);
  });
  it('validate chấp nhận biến thể containing', () => {
    expect(() => pointDef.validate!(mkArcObj({
      kind: 'arcMidpoint', circle: 'k', a: 'B', b: 'C', containing: 'A',
    }).attrs)).not.toThrow();
  });
  it('validate ném khi có cả notContaining lẫn containing', () => {
    expect(() => pointDef.validate!(mkArcObj({
      kind: 'arcMidpoint', circle: 'k', a: 'B', b: 'C', notContaining: 'A', containing: 'A',
    }).attrs)).toThrow();
  });
  it('validate KHÔNG ném khi thiếu cả notContaining lẫn containing (cung không mơ hồ)', () => {
    // Nửa đường tròn đường kính AB: điểm chính giữa cung duy nhất → containment optional.
    expect(() => pointDef.validate!(mkArcObj({
      kind: 'arcMidpoint', circle: 'k', a: 'B', b: 'C',
    }).attrs)).not.toThrow();
  });
  it('describe biến thể containing', () => {
    const s = { objects: { B: { label: 'B' }, C: { label: 'C' }, A: { label: 'A' } } } as never;
    expect(pointDef.describe!(mkArcObj({
      kind: 'arcMidpoint', circle: 'k', a: 'B', b: 'C', containing: 'A',
    }), s)).toBe('M = trung điểm cung BC (chứa A)');
  });
  it('dependsOn dùng containing khi không có notContaining', () => {
    expect(pointDef.dependsOn!(mkArcObj({
      kind: 'arcMidpoint', circle: 'k', a: 'B', b: 'C', containing: 'A',
    }).attrs)).toEqual(['k', 'B', 'C', 'A']);
  });
});

describe('point excenter', () => {
  it('validate chấp nhận excenter đủ field', () => {
    expect(() => pointDef.validate!(mkArcObj({
      kind: 'excenter', vertices: ['A', 'B', 'C'], opposite: 'A',
    }).attrs)).not.toThrow();
  });
  it('validate ném khi vertices không phải tuple 3', () => {
    expect(() => pointDef.validate!(mkArcObj({
      kind: 'excenter', vertices: ['A', 'B'], opposite: 'A',
    }).attrs)).toThrow();
  });
  it('describe ra mô tả tiếng Việt', () => {
    const s = { objects: { A: { label: 'A' }, B: { label: 'B' }, C: { label: 'C' } } } as never;
    expect(pointDef.describe!(mkArcObj({
      kind: 'excenter', vertices: ['A', 'B', 'C'], opposite: 'A',
    }), s)).toBe('M = tâm bàng tiếp ΔABC đối diện A');
  });
  it('validate ném khi opposite không thuộc vertices', () => {
    expect(() => pointDef.validate!(mkArcObj({
      kind: 'excenter', vertices: ['A', 'B', 'C'], opposite: 'D',
    }).attrs)).toThrow();
  });
  it('dependsOn trả về 3 vertices', () => {
    expect(pointDef.dependsOn!(mkArcObj({
      kind: 'excenter', vertices: ['A', 'B', 'C'], opposite: 'A',
    }).attrs)).toEqual(['A', 'B', 'C']);
  });
});

