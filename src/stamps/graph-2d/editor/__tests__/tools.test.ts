// src/stamps/graph-2d/editor/__tests__/tools.test.ts
import { TOOLS, GROUPS, type GraphTool } from '../tools';

describe('graph-2d tools', () => {
  it('exposes 12 tools', () => {
    expect(TOOLS.length).toBe(12);
  });
  it('all tools have group + label + title', () => {
    for (const t of TOOLS) {
      expect(t.key).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(t.hint).toBeTruthy();
      expect(t.group).toBeTruthy();
      expect(t.icon).toBeTruthy();
    }
  });
  it('default tool is move', () => {
    const first: GraphTool = TOOLS[0].key;
    expect(first).toBe('move');
  });
  it('groups defined', () => {
    expect(GROUPS).toEqual(expect.arrayContaining(['basic', 'function', 'analysis', 'draw']));
  });
});
