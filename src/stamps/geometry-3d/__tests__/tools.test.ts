import {
  TOOLS_3D,
  GROUP_LABELS_3D,
  GROUP_ORDER_3D,
  letterForGroup3D,
  groupForLetter3D,
  type GeomTool3D,
} from '../editor/tools';

describe('Geometry3D tools registry', () => {
  it('có move tool', () => {
    const move = TOOLS_3D.find((t) => t.key === 'move');
    expect(move).toBeDefined();
  });

  it('mỗi tool có key + label + group + stepsRequired', () => {
    for (const t of TOOLS_3D) {
      expect(typeof t.key).toBe('string');
      expect(typeof t.label).toBe('string');
      expect(typeof t.group).toBe('string');
      expect(typeof t.stepsRequired).toBe('number');
    }
  });

  it('keys là unique', () => {
    const keys = TOOLS_3D.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('mỗi group có label trong GROUP_LABELS_3D', () => {
    for (const t of TOOLS_3D) {
      expect(GROUP_LABELS_3D[t.group]).toBeDefined();
    }
  });

  it('covers primitives + solids + curved + label', () => {
    const keys: GeomTool3D[] = TOOLS_3D.map((t) => t.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'point',
        'segment',
        'line',
        'plane',
        'triangle',
        'polygon',
      ]),
    );
    expect(keys).toEqual(
      expect.arrayContaining([
        'tetrahedron',
        'parallelepiped',
        'prism',
        'pyramid',
      ]),
    );
    expect(keys).toEqual(
      expect.arrayContaining([
        'sphere',
        'cone',
        'cylinder',
      ]),
    );
    expect(keys).toEqual(expect.arrayContaining(['label']));
  });

  it('không expose solidofrevolution (removed Bug #8)', () => {
    const keys: string[] = TOOLS_3D.map((t) => t.key);
    expect(keys).not.toContain('solidofrevolution');
  });

  it('có 15 tools (sau khi remove solidofrevolution)', () => {
    expect(TOOLS_3D.length).toBe(15);
  });
});

describe('Geometry3D — chord helpers', () => {
  it('GROUP_ORDER_3D phủ hết key trong GROUP_LABELS_3D', () => {
    const labels = Object.keys(GROUP_LABELS_3D).sort();
    const order = [...GROUP_ORDER_3D].sort();
    expect(order).toEqual(labels);
  });

  it('letterForGroup3D trả về A, B, C... theo index', () => {
    expect(letterForGroup3D(GROUP_ORDER_3D[0])).toBe('A');
    expect(letterForGroup3D(GROUP_ORDER_3D[1])).toBe('B');
  });

  it('groupForLetter3D case-insensitive + out-of-range trả null', () => {
    expect(groupForLetter3D('a')).toBe(GROUP_ORDER_3D[0]);
    expect(groupForLetter3D('A')).toBe(GROUP_ORDER_3D[0]);
    expect(groupForLetter3D('z')).toBeNull();
    expect(groupForLetter3D('1')).toBeNull();
  });

  it('mọi tool có group trong GROUP_ORDER_3D', () => {
    for (const t of TOOLS_3D) {
      expect(GROUP_ORDER_3D).toContain(t.group);
    }
  });

  it('không group > 9 tool (vừa 1..9)', () => {
    const counts = new Map<string, number>();
    for (const t of TOOLS_3D) {
      counts.set(t.group, (counts.get(t.group) ?? 0) + 1);
    }
    for (const [, n] of counts) {
      expect(n).toBeLessThanOrEqual(9);
    }
  });
});
