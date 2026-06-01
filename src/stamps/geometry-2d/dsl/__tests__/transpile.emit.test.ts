// src/stamps/geometry-2d/dsl/__tests__/transpile.emit.test.ts
import { transpile } from '../transpile';

describe('transpile orchestrator', () => {
  it('happy path: anchor only triangle', () => {
    const r = transpile({
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 4, y: 0 },
        { name: 'C', kind: 'free', x: 2, y: 3.464 },
      ],
      shapes: [{ name: 'T', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
    });
    if (!r.ok) throw new Error('expected ok ' + JSON.stringify(r.errors));
    expect(r.state.order).toEqual(['p1', 'p2', 'p3', 'poly1']);
    expect(Object.keys(r.state.objects)).toHaveLength(4);
    expect(r.state.counter).toBe(4);
    expect(r.state.meta.domain).toBe('2d');
  });

  it('SCHEMA error: malformed input returns early', () => {
    const r = transpile({ version: 1, points: [{ kind: 'free', x: 0, y: 0 }] });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].code).toBe('SCHEMA');
  });

  it('collects validation errors from stages 2-4', () => {
    const r = transpile({
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'A', kind: 'free', x: 1, y: 1 }, // dup
        { name: 'M', kind: 'midpoint', p1: 'A', p2: 'Z' }, // unknown ref
      ],
      shapes: [],
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    const codes = r.errors.map((e) => e.code);
    expect(codes).toContain('DUPLICATE_NAME');
    expect(codes).toContain('UNKNOWN_REF');
  });

  it('emits state.order in DSL order', () => {
    const r = transpile({
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
      ],
      shapes: [{ name: 'AB', kind: 'segment', p1: 'A', p2: 'B' }],
    });
    if (!r.ok) throw new Error('expected ok');
    expect(r.state.order).toEqual(['p1', 'p2', 's1']);
  });
});
