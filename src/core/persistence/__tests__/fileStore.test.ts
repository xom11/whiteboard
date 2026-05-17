import { readFiles, writeFiles, pruneFiles, clearAll } from '../fileStore';
import type { BinaryFiles } from '../../../types';

const mkFile = (overrides: Partial<{ dataURL: string; mimeType: string; created: number }> = {}) => ({
  dataURL: 'data:image/png;base64,AAA',
  mimeType: 'image/png',
  created: 1700000000000,
  ...overrides,
});

beforeEach(async () => {
  await clearAll('k1');
  await clearAll('k2');
});

describe('fileStore', () => {
  test('roundtrip readFiles/writeFiles', async () => {
    const files: BinaryFiles = {
      f1: mkFile() as never,
      f2: mkFile({ mimeType: 'image/jpeg' }) as never,
    };
    await writeFiles('k1', files);
    const got = await readFiles('k1');
    expect(Object.keys(got).sort()).toEqual(['f1', 'f2']);
    expect((got.f1 as { mimeType: string }).mimeType).toBe('image/png');
    expect((got.f2 as { mimeType: string }).mimeType).toBe('image/jpeg');
  });

  test('readFiles trên storageKey trống → {}', async () => {
    const got = await readFiles('empty');
    expect(got).toEqual({});
  });

  test('writeFiles skip id đã tồn tại', async () => {
    await writeFiles('k1', { f1: mkFile({ dataURL: 'AAA' }) as never });
    await writeFiles('k1', { f1: mkFile({ dataURL: 'BBB' }) as never });
    const got = await readFiles('k1');
    expect((got.f1 as { dataURL: string }).dataURL).toBe('AAA');
  });

  test('pruneFiles giữ keepIds, xoá phần còn lại', async () => {
    await writeFiles('k1', { f1: mkFile() as never, f2: mkFile() as never, f3: mkFile() as never });
    await pruneFiles('k1', new Set(['f2']));
    const got = await readFiles('k1');
    expect(Object.keys(got)).toEqual(['f2']);
  });

  test('clearAll xoá toàn bộ records của storageKey, không đụng key khác', async () => {
    await writeFiles('k1', { f1: mkFile() as never });
    await writeFiles('k2', { g1: mkFile() as never });
    await clearAll('k1');
    expect(await readFiles('k1')).toEqual({});
    const k2 = await readFiles('k2');
    expect(Object.keys(k2)).toEqual(['g1']);
  });

  test('invalid storageKey → throw ở mọi entry point', async () => {
    await expect(readFiles('bad:key')).rejects.toThrow(/Invalid storageKey/);
    await expect(writeFiles('bad:key', { f1: mkFile() as never })).rejects.toThrow(
      /Invalid storageKey/,
    );
    await expect(pruneFiles('bad:key', new Set())).rejects.toThrow(/Invalid storageKey/);
    await expect(clearAll('bad:key')).rejects.toThrow(/Invalid storageKey/);
  });

  test('storageKey "default" vẫn accept (backward compat)', async () => {
    await expect(writeFiles('default', { f1: mkFile() as never })).resolves.toBeUndefined();
    const got = await readFiles('default');
    expect(Object.keys(got)).toEqual(['f1']);
    await clearAll('default');
  });
});
