// src/core/scene/kinds/__tests__/function2d.test.ts
import { getKind } from '../../registry';
import '../function2d';

describe('kind function2d', () => {
  const def = getKind('function2d');

  it('type = "function2d"', () => {
    expect(def.type).toBe('function2d');
  });

  it('validate ok cho expression hợp lệ', () => {
    expect(() => def.validate?.({
      expression: 'x^2', color: '#2563eb', visible: true,
    })).not.toThrow();
  });

  it('validate throw cho expression rỗng', () => {
    expect(() => def.validate?.({
      expression: '', color: '#2563eb', visible: true,
    })).toThrow(/expression/i);
  });

  it('validate throw cho domain không hợp lệ', () => {
    expect(() => def.validate?.({
      expression: 'x^2', color: '#000', visible: true,
      domain: { min: 5, max: 3 },
    })).toThrow(/domain|interval/i);
  });

  it('dependsOn → []', () => {
    expect(def.dependsOn({ expression: 'a*x', color: '#000', visible: true })).toEqual([]);
  });

  it('describe trả expression', () => {
    const obj = {
      id: 'f1', kind: 'function2d', label: 'f', visible: true, locked: false,
      layer: 'default', schemaVersion: 1,
      attrs: { expression: 'x^2', color: '#000', visible: true },
    };
    expect(def.describe(obj as never)).toContain('x^2');
  });
});
