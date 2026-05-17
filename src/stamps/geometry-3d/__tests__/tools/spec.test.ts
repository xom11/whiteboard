import { TOOLS, TOOL_GROUPS } from '../../editor/tools/spec';
import type { ToolKey } from '../../editor/tools/spec';

test('every ToolKey appears in TOOLS exactly once', () => {
  const allKeys: ToolKey[] = [
    'move', 'point', 'pointOnObject', 'segment', 'line', 'ray', 'vector', 'polygon',
    'plane', 'pyramid', 'prism', 'tetrahedron', 'cube', 'sphere', 'cylinder', 'cone',
  ];
  const found = TOOLS.map((t) => t.key);
  expect(found.sort()).toEqual([...allKeys].sort());
  expect(new Set(found).size).toBe(found.length);
});

test('every tool has non-empty hintIdle', () => {
  for (const t of TOOLS) {
    expect(t.hintIdle.length).toBeGreaterThan(0);
  }
});

test('TOOL_GROUPS references known tool keys', () => {
  const known = new Set(TOOLS.map((t) => t.key));
  for (const [, keys] of Object.entries(TOOL_GROUPS)) {
    for (const k of keys) expect(known.has(k)).toBe(true);
  }
});
