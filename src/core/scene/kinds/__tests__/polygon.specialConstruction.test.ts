import '../polygon';
import { getKind } from '../../registry';

describe('Polygon — special construction variants', () => {
  const def = getKind('polygon');

  describe('validate', () => {
    it('square ok', () => {
      expect(() => def.validate!({ construction: { kind: 'square', p1: 'A', p2: 'B' } } as any)).not.toThrow();
    });
    it('square missing p1 throws', () => {
      expect(() => def.validate!({ construction: { kind: 'square', p1: '', p2: 'B' } } as any)).toThrow();
    });
    it('rectangle 3 IDs ok', () => {
      expect(() =>
        def.validate!({ construction: { kind: 'rectangle', p1: 'A', p2: 'B', p3: 'C' } } as any),
      ).not.toThrow();
    });
    it('rectangle missing p3 throws', () => {
      expect(() =>
        def.validate!({ construction: { kind: 'rectangle', p1: 'A', p2: 'B', p3: '' } } as any),
      ).toThrow();
    });
    it('rhombus ok', () => {
      expect(() =>
        def.validate!({ construction: { kind: 'rhombus', p1: 'A', p2: 'B', p3: 'C' } } as any),
      ).not.toThrow();
    });
    it('parallelogram ok', () => {
      expect(() =>
        def.validate!({ construction: { kind: 'parallelogram', p1: 'A', p2: 'B', p3: 'C' } } as any),
      ).not.toThrow();
    });
    it('isoTrapezoid ok', () => {
      expect(() =>
        def.validate!({ construction: { kind: 'isoTrapezoid', p1: 'A', p2: 'B', p3: 'C' } } as any),
      ).not.toThrow();
    });
    it('isoTriangle ok', () => {
      expect(() =>
        def.validate!({ construction: { kind: 'isoTriangle', base1: 'B', base2: 'C', apex: 'A' } } as any),
      ).not.toThrow();
    });
    it('isoTriangle missing apex throws', () => {
      expect(() =>
        def.validate!({ construction: { kind: 'isoTriangle', base1: 'B', base2: 'C', apex: '' } } as any),
      ).toThrow();
    });
    it('rightTriangle ok', () => {
      expect(() =>
        def.validate!({
          construction: { kind: 'rightTriangle', rightAngle: 'R', leg1End: 'P', leg2End: 'Q' },
        } as any),
      ).not.toThrow();
    });
  });

  describe('dependsOn', () => {
    it('square returns p1, p2', () => {
      expect(def.dependsOn!({ construction: { kind: 'square', p1: 'A', p2: 'B' } } as any)).toEqual(['A', 'B']);
    });
    it('rectangle returns p1, p2, p3', () => {
      expect(
        def.dependsOn!({ construction: { kind: 'rectangle', p1: 'A', p2: 'B', p3: 'C' } } as any),
      ).toEqual(['A', 'B', 'C']);
    });
    it('rhombus returns p1, p2, p3', () => {
      expect(
        def.dependsOn!({ construction: { kind: 'rhombus', p1: 'A', p2: 'B', p3: 'C' } } as any),
      ).toEqual(['A', 'B', 'C']);
    });
    it('parallelogram returns p1, p2, p3', () => {
      expect(
        def.dependsOn!({ construction: { kind: 'parallelogram', p1: 'A', p2: 'B', p3: 'C' } } as any),
      ).toEqual(['A', 'B', 'C']);
    });
    it('isoTrapezoid returns p1, p2, p3', () => {
      expect(
        def.dependsOn!({ construction: { kind: 'isoTrapezoid', p1: 'A', p2: 'B', p3: 'C' } } as any),
      ).toEqual(['A', 'B', 'C']);
    });
    it('isoTriangle returns base1, base2, apex', () => {
      expect(
        def.dependsOn!({ construction: { kind: 'isoTriangle', base1: 'B', base2: 'C', apex: 'A' } } as any),
      ).toEqual(['B', 'C', 'A']);
    });
    it('rightTriangle returns rightAngle, leg1End, leg2End', () => {
      expect(
        def.dependsOn!({
          construction: { kind: 'rightTriangle', rightAngle: 'R', leg1End: 'P', leg2End: 'Q' },
        } as any),
      ).toEqual(['R', 'P', 'Q']);
    });
  });

  describe('describe', () => {
    const stubState = {
      objects: {
        A: { label: 'A' },
        B: { label: 'B' },
        C: { label: 'C' },
        R: { label: 'R' },
        P: { label: 'P' },
        Q: { label: 'Q' },
      },
    } as any;
    it('square label', () => {
      const r = def.describe!(
        { label: 'sq1', attrs: { construction: { kind: 'square', p1: 'A', p2: 'B' } } } as any,
        stubState,
      );
      expect(r).toMatch(/Hình vuông/);
    });
    it('rectangle label', () => {
      const r = def.describe!(
        { label: 'r1', attrs: { construction: { kind: 'rectangle', p1: 'A', p2: 'B', p3: 'C' } } } as any,
        stubState,
      );
      expect(r).toMatch(/Hình chữ nhật/);
    });
    it('isoTriangle label', () => {
      const r = def.describe!(
        { label: 't1', attrs: { construction: { kind: 'isoTriangle', base1: 'B', base2: 'C', apex: 'A' } } } as any,
        stubState,
      );
      expect(r).toMatch(/Tam giác cân/);
    });
    it('rightTriangle label', () => {
      const r = def.describe!(
        {
          label: 't2',
          attrs: { construction: { kind: 'rightTriangle', rightAngle: 'R', leg1End: 'P', leg2End: 'Q' } },
        } as any,
        stubState,
      );
      expect(r).toMatch(/Tam giác vuông/);
    });
  });
});
