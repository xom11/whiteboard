import { MAX_NESTED_DEPTH, safeParseScene, validateStorageKey } from '../validation';

describe('validateStorageKey', () => {
  test.each([
    ['default'],
    ['a-b_c-1'],
    ['A1'],
    ['a'],
    ['0'],
    ['_'],
    ['-'],
    ['a'.repeat(128)],
  ])('accept %p', (key) => {
    expect(validateStorageKey(key)).toBe(key);
  });

  test.each<[string, unknown]>([
    ['empty string', ''],
    ['contains colon', 'a:b'],
    ['contains space', 'a b'],
    ['contains slash', 'a/b'],
    ['contains dot', 'a.b'],
    ['unicode', 'á'],
    ['null', null],
    ['undefined', undefined],
    ['number', 123],
    ['object', {}],
    ['array', []],
    ['boolean', true],
    ['129 chars', 'a'.repeat(129)],
  ])('reject %s', (_label, value) => {
    expect(() => validateStorageKey(value)).toThrow(/Invalid storageKey/);
  });

  // Lưu ý: chuỗi "__proto__" gồm các ký tự `_` và chữ — pass regex.
  // Đây là OK vì storageKey chỉ ghép vào key prefix LocalStorage / IDB index,
  // KHÔNG dùng làm property accessor trên object. Prototype pollution defense
  // được handle riêng trong safeParseScene (reviver).
  test('"__proto__" pass — regex chỉ chặn special chars, không phải value semantics', () => {
    expect(validateStorageKey('__proto__')).toBe('__proto__');
  });
});

describe('safeParseScene', () => {
  test('parse object hợp lệ trả về data + whitelist top-level keys', () => {
    const raw = JSON.stringify({
      version: 1,
      elements: [{ id: 'a', type: 'rectangle' }],
      appState: { theme: 'light' },
      savedAt: 123,
      extra: 'should be dropped',
    });
    const got = safeParseScene(raw);
    expect(got).not.toBeNull();
    expect(got!.version).toBe(1);
    expect(got!.elements).toHaveLength(1);
    expect(got!.appState).toEqual({ theme: 'light' });
    expect(got!.savedAt).toBe(123);
    expect((got as Record<string, unknown>).extra).toBeUndefined();
  });

  test('strip __proto__ payload — Object.prototype không bị pollute', () => {
    const raw = '{"__proto__": {"polluted": 1}, "elements": [], "appState": {}}';
    const got = safeParseScene(raw);
    expect(got).not.toBeNull();
    // Object.prototype không có "polluted"
    expect((Object.prototype as unknown as { polluted?: number }).polluted).toBeUndefined();
    expect(({} as unknown as { polluted?: number }).polluted).toBeUndefined();
  });

  test('strip constructor / prototype nested', () => {
    const raw = JSON.stringify({
      elements: [],
      appState: {},
      version: 1,
      nested: { constructor: { evil: 1 }, prototype: { evil: 2 } },
    });
    const got = safeParseScene(raw);
    // nested không nằm whitelist nên bị drop hoàn toàn
    expect(got).not.toBeNull();
    expect((got as Record<string, unknown>).nested).toBeUndefined();
  });

  test('reject invalid JSON → null', () => {
    expect(safeParseScene('{{not json')).toBeNull();
    expect(safeParseScene('')).toBeNull();
    expect(safeParseScene('undefined')).toBeNull();
  });

  test('reject non-object top-level (array / number / string)', () => {
    expect(safeParseScene('[]')).toBeNull();
    expect(safeParseScene('42')).toBeNull();
    expect(safeParseScene('"x"')).toBeNull();
    expect(safeParseScene('null')).toBeNull();
  });

  test('reject missing/invalid elements', () => {
    expect(safeParseScene(JSON.stringify({ version: 1 }))).toBeNull();
    expect(safeParseScene(JSON.stringify({ version: 1, elements: 'nope' }))).toBeNull();
    expect(
      safeParseScene(JSON.stringify({ version: 1, elements: [{ noId: true }] })),
    ).toBeNull();
    expect(
      safeParseScene(JSON.stringify({ version: 1, elements: [{ id: 123, type: 'x' }] })),
    ).toBeNull();
    expect(
      safeParseScene(JSON.stringify({ version: 1, elements: [{ id: 'a', type: 1 }] })),
    ).toBeNull();
  });

  test('reject deep nesting (depth 100) → null', () => {
    // Tạo object lồng 100 cấp qua array (cấu trúc hợp lệ syntactically).
    let inner: unknown = 0;
    for (let i = 0; i < 100; i += 1) {
      inner = [inner];
    }
    const raw = JSON.stringify({ version: 1, elements: [], appState: { deep: inner } });
    expect(safeParseScene(raw)).toBeNull();
  });

  test('accept depth dưới MAX_NESTED_DEPTH', () => {
    let inner: unknown = 0;
    for (let i = 0; i < Math.max(1, MAX_NESTED_DEPTH - 10); i += 1) {
      inner = [inner];
    }
    const raw = JSON.stringify({ version: 1, elements: [], appState: { deep: inner } });
    expect(safeParseScene(raw)).not.toBeNull();
  });

  test('appState non-object → coerce thành {}', () => {
    const raw = JSON.stringify({ version: 1, elements: [], appState: 'nope' });
    const got = safeParseScene(raw);
    expect(got).not.toBeNull();
    expect(got!.appState).toEqual({});
  });
});
