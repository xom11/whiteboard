import { IntentZ, AddPointIntentZ } from '../intent';

describe('Intent schema — Tier 4+5 additions', () => {
  describe('draw-line op', () => {
    it('parses perpThrough', () => {
      const r = IntentZ.safeParse({
        op: 'draw-line', name: 'd', kind: 'perpThrough', through: 'M', to: 'AB',
      });
      expect(r.success).toBe(true);
    });
    it('parses parallelThrough', () => {
      const r = IntentZ.safeParse({
        op: 'draw-line', name: 'd', kind: 'parallelThrough', through: 'M', to: 'AB',
      });
      expect(r.success).toBe(true);
    });
    it('parses tangentAt', () => {
      const r = IntentZ.safeParse({
        op: 'draw-line', name: 't', kind: 'tangentAt', through: 'A', circle: 'O',
      });
      expect(r.success).toBe(true);
    });
    it('parses tangentFromExt which=both', () => {
      const r = IntentZ.safeParse({
        op: 'draw-line', name: 'AB', kind: 'tangentFromExt', from: 'A', circle: 'O', which: 'both',
      });
      expect(r.success).toBe(true);
    });
  });

  describe('mark-shape op', () => {
    it('parses triangle from existing labels', () => {
      const r = IntentZ.safeParse({
        op: 'mark-shape', shape: 'triangle', labels: ['A', 'B', 'H'],
      });
      expect(r.success).toBe(true);
    });
    it('parses quadrilateral', () => {
      const r = IntentZ.safeParse({
        op: 'mark-shape', shape: 'quadrilateral', labels: ['A', 'B', 'C', 'D'],
      });
      expect(r.success).toBe(true);
    });
  });

  describe('draw-circle new specs', () => {
    it('parses centerRadius', () => {
      const r = IntentZ.safeParse({
        op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 3,
      });
      expect(r.success).toBe(true);
    });
    it('parses inscribedIn', () => {
      const r = IntentZ.safeParse({
        op: 'draw-circle', name: 'I', spec: 'inscribedIn', triangle: ['A', 'B', 'C'],
      });
      expect(r.success).toBe(true);
    });
  });

  describe('add-point new constraints', () => {
    it('parses secondIntersection', () => {
      const r = IntentZ.safeParse({
        op: 'add-point', name: 'E', constraint: {
          kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'A',
        },
      });
      expect(r.success).toBe(true);
    });
    it('parses circleIntersection', () => {
      const r = IntentZ.safeParse({
        op: 'add-point', name: 'A', constraint: {
          kind: 'circleIntersection', c1: 'O', c2: "Op", which: 0,
        },
      });
      expect(r.success).toBe(true);
    });
    it('parses tangencyPoint', () => {
      const r = IntentZ.safeParse({
        op: 'add-point', name: 'D', constraint: {
          kind: 'tangencyPoint', circle: 'I', onLine: 'BC',
        },
      });
      expect(r.success).toBe(true);
    });
    it('parses tangentPoint', () => {
      const r = IntentZ.safeParse({
        op: 'add-point', name: 'B', constraint: {
          kind: 'tangentPoint', from: 'A', circle: 'O', which: 0,
        },
      });
      expect(r.success).toBe(true);
    });
    it('parses angleBisectorFoot', () => {
      const r = IntentZ.safeParse({
        op: 'add-point', name: 'D', constraint: {
          kind: 'angleBisectorFoot', from: 'A', onLine: 'BC',
        },
      });
      expect(r.success).toBe(true);
    });
  });
});

describe('add-point constraint Cụm A', () => {
  it('arcMidpoint', () => {
    expect(AddPointIntentZ.safeParse({
      op: 'add-point', name: 'M',
      constraint: { kind: 'arcMidpoint', circle: 'O', a: 'B', b: 'C', notContaining: 'A' },
    }).success).toBe(true);
  });
  it('reflectPoint', () => {
    expect(AddPointIntentZ.safeParse({
      op: 'add-point', name: 'Q', constraint: { kind: 'reflectPoint', of: 'P', through: 'M' },
    }).success).toBe(true);
  });
  it('reflectLine (through cho phép tên line nhiều ký tự)', () => {
    expect(AddPointIntentZ.safeParse({
      op: 'add-point', name: 'D', constraint: { kind: 'reflectLine', of: 'H', through: 'BC' },
    }).success).toBe(true);
  });
  it('excenter', () => {
    expect(AddPointIntentZ.safeParse({
      op: 'add-point', name: 'J', constraint: { kind: 'excenter', of: ['A', 'B', 'C'], opposite: 'A' },
    }).success).toBe(true);
  });
});
