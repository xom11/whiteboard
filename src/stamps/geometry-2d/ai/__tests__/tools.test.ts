// src/stamps/geometry-2d/ai/__tests__/tools.test.ts
import { BUILD_FIGURE_TOOL, REFUSE_TOOL, TOOLS } from '../tools';

describe('BUILD_FIGURE_TOOL', () => {
  it('has name and description', () => {
    expect(BUILD_FIGURE_TOOL.name).toBe('build_figure');
    expect(typeof BUILD_FIGURE_TOOL.description).toBe('string');
    expect(BUILD_FIGURE_TOOL.description.length).toBeGreaterThan(0);
  });

  it('input_schema is object with required fields', () => {
    const s = BUILD_FIGURE_TOOL.input_schema as Record<string, unknown>;
    expect(s.type).toBe('object');
    const required = s.required as string[];
    expect(required).toContain('version');
    expect(required).toContain('points');
  });

  it('input_schema contains no $ref (Anthropic prefers inline)', () => {
    const json = JSON.stringify(BUILD_FIGURE_TOOL.input_schema);
    expect(json).not.toMatch(/\$ref/);
  });

  it('input_schema snapshot stable', () => {
    expect(BUILD_FIGURE_TOOL.input_schema).toMatchSnapshot();
  });
});

describe('REFUSE_TOOL', () => {
  it('name = refuse, requires reason', () => {
    expect(REFUSE_TOOL.name).toBe('refuse');
    const s = REFUSE_TOOL.input_schema as Record<string, unknown>;
    expect((s.required as string[])).toContain('reason');
  });

  it('reason property is string', () => {
    const s = REFUSE_TOOL.input_schema as { properties: { reason: { type: string } } };
    expect(s.properties.reason.type).toBe('string');
  });
});

describe('TOOLS export', () => {
  it('is array of 2 tools', () => {
    expect(TOOLS).toHaveLength(2);
    expect(TOOLS.map((t) => t.name)).toEqual(['build_figure', 'refuse']);
  });
});
