// src/core/scene/kinds/__tests__/parameter.test.ts
import { getKind } from '../../registry';
import '../parameter';

describe('kind parameter', () => {
  const def = getKind('parameter');

  it('type = "parameter"', () => {
    expect(def.type).toBe('parameter');
  });

  it('validate ok cho slider hợp lệ', () => {
    expect(() => def.validate?.({ value: 1, min: -5, max: 5, step: 0.1 })).not.toThrow();
  });

  it('validate throw khi min >= max', () => {
    expect(() => def.validate?.({ value: 0, min: 5, max: 5, step: 0.1 })).toThrow(/min/i);
  });

  it('validate throw khi value ngoài [min, max]', () => {
    expect(() => def.validate?.({ value: 10, min: -5, max: 5, step: 0.1 })).toThrow(/value/i);
  });

  it('validate throw khi step <= 0', () => {
    expect(() => def.validate?.({ value: 0, min: -5, max: 5, step: 0 })).toThrow(/step/i);
  });

  it('dependsOn → []', () => {
    expect(def.dependsOn({ value: 0, min: -5, max: 5, step: 0.1 })).toEqual([]);
  });

  it('render trả null (parameter không render lên board)', () => {
    const obj = { id: 'a', kind: 'parameter', label: 'a', visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { value: 1, min: -5, max: 5, step: 0.1 } };
    const ctx = { jxg: {}, resolveRef: () => null, defaults: {} };
    expect(def.render(obj as never, ctx as never)).toBe(null);
  });
});
