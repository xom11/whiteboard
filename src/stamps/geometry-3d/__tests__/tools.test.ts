import { TOOLS_3D, GROUP_LABELS_3D, type GeomTool3D } from '../editor/tools';

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
        'solidofrevolution',
      ]),
    );
    expect(keys).toEqual(expect.arrayContaining(['label']));
  });

  it('có 16 tools', () => {
    expect(TOOLS_3D.length).toBe(16);
  });
});
