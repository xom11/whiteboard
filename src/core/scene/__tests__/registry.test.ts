// src/core/scene/__tests__/registry.test.ts
import { registerKind, getKind, listKinds, __clearRegistryForTests } from '../registry';
import type { KindDef } from '../types';

const mkDef = (type: string): KindDef => ({
  type,
  schemaVersion: 1,
  migrate: {},
  dependsOn: () => [],
  describe: () => '',
  render: () => null,
});

describe('registry', () => {
  beforeEach(() => __clearRegistryForTests());

  test('register + getKind trả về định nghĩa', () => {
    const def = mkDef('foo');
    registerKind(def);
    expect(getKind('foo')).toBe(def);
  });

  test('getKind throw nếu kind chưa đăng ký', () => {
    expect(() => getKind('missing')).toThrow(/missing/);
  });

  test('register lần thứ 2 cùng type ghi đè + cảnh báo', () => {
    const a = mkDef('foo');
    const b = mkDef('foo');
    registerKind(a);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    registerKind(b);
    expect(getKind('foo')).toBe(b);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('listKinds trả về tất cả đã đăng ký', () => {
    registerKind(mkDef('a'));
    registerKind(mkDef('b'));
    expect(listKinds().map(k => k.type).sort()).toEqual(['a', 'b']);
  });
});
