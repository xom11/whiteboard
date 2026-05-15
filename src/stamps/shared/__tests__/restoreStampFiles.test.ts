import { restoreMissingStampFiles as restoreMissingMathStampFiles, restoreMissingStampFiles } from '../restoreStampFiles';
import type { StampType, RestoredStampFile } from '../types';

function makeMockStamp(): {
  stamp: StampType;
  renderSpy: jest.Mock<Promise<string>, [unknown]>;
} {
  const renderSpy = jest.fn(async (_data: unknown) => {
    return '<svg width="50" height="50"><circle cx="25" cy="25" r="20" stroke="#0f172a"/></svg>';
  });
  const stamp: StampType = {
    kind: 'geometry',
    shortcutKey: 'g',
    toolbarLabel: 'G',
    toolbarTitle: 'Test',
    toolbarIcon: null,
    matchesCustomData: (d) => !!d && typeof d === 'object' && (d as { kind?: string }).kind === 'geometry',
    renderSvgFromCustomData: renderSpy,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Host: (() => null) as any,
  };
  return { stamp, renderSpy };
}

describe('restoreMissingStampFiles (registry-driven via restoreFileFromCustomData)', () => {
  it('lặp qua elements, gọi restoreFileFromCustomData của stamp khớp', async () => {
    const calls: string[] = [];
    const fakeStampA: StampType = {
      kind: 'a',
      shortcutKey: 'a',
      toolbarLabel: 'A',
      toolbarTitle: 'A',
      toolbarIcon: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Host: (() => null) as any,
      renderSvgFromCustomData: async () => '<svg/>',
      matchesCustomData: (d: unknown) =>
        Boolean(d) && (d as { kind?: string }).kind === 'a',
      restoreFileFromCustomData: async (el): Promise<RestoredStampFile> => {
        calls.push(`a:${(el as { id: string }).id}`);
        return {
          fileId: `file-${(el as { id: string }).id}`,
          dataURL: 'data:a',
          mimeType: 'image/svg+xml',
        };
      },
    };
    const fakeStampB: StampType = {
      kind: 'b',
      shortcutKey: 'b',
      toolbarLabel: 'B',
      toolbarTitle: 'B',
      toolbarIcon: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Host: (() => null) as any,
      renderSvgFromCustomData: async () => '<svg/>',
      matchesCustomData: (d: unknown) =>
        Boolean(d) && (d as { kind?: string }).kind === 'b',
      // No restoreFileFromCustomData — must skip
    };

    const elements = [
      { id: '1', customData: { kind: 'a' } },
      { id: '2', customData: { kind: 'b' } },
      { id: '3', customData: { kind: 'unknown' } },
    ];

    const addFiles = jest.fn();
    const api = { addFiles };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await restoreMissingStampFiles(api as never, elements as never, [fakeStampA, fakeStampB]);

    expect(calls).toEqual(['a:1']);
    expect(addFiles).toHaveBeenCalledTimes(1);
    expect(addFiles).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'file-1', dataURL: 'data:a' }),
    ]);
  });

  it('bỏ qua element không match stamp nào', async () => {
    const api = { addFiles: jest.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await restoreMissingStampFiles(api as never, [{ id: '1', customData: null }] as never, []);
    expect(api.addFiles).not.toHaveBeenCalled();
  });

  it('bỏ qua nếu stamp.restoreFileFromCustomData trả null', async () => {
    const fakeStamp: StampType = {
      kind: 'a',
      shortcutKey: 'a',
      toolbarLabel: 'A',
      toolbarTitle: 'A',
      toolbarIcon: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Host: (() => null) as any,
      renderSvgFromCustomData: async () => '<svg/>',
      matchesCustomData: (d: unknown) =>
        Boolean(d) && (d as { kind?: string }).kind === 'a',
      restoreFileFromCustomData: async () => null,
    };
    const api = { addFiles: jest.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await restoreMissingStampFiles(api as never, [{ id: '1', customData: { kind: 'a' } }] as never, [fakeStamp]);
    expect(api.addFiles).not.toHaveBeenCalled();
  });
});

describe('restoreMissingMathStampFiles', () => {
  test('skip nếu fileId đã có trong api.getFiles', async () => {
    const { stamp, renderSpy } = makeMockStamp();
    const addFiles = jest.fn();
    const api = {
      getFiles: () => ({ existingId: { id: 'existingId', dataURL: 'data:...' } }),
      addFiles,
    };
    const elements = [
      { id: 'el1', type: 'image', fileId: 'existingId', customData: { kind: 'geometry' } },
    ];
    await restoreMissingMathStampFiles(api, elements, [stamp]);
    expect(renderSpy).not.toHaveBeenCalled();
    expect(addFiles).not.toHaveBeenCalled();
  });

  test('generate SVG cho fileId thiếu, giữ nguyên id', async () => {
    const { stamp, renderSpy } = makeMockStamp();
    const addFiles = jest.fn();
    const api = {
      getFiles: () => ({}),
      addFiles,
    };
    const elements = [
      { id: 'el1', type: 'image', fileId: 'origFile', customData: { kind: 'geometry' } },
    ];
    await restoreMissingMathStampFiles(api, elements, [stamp]);
    expect(renderSpy).toHaveBeenCalledWith(elements[0].customData);
    expect(addFiles).toHaveBeenCalledTimes(1);
    const passed = addFiles.mock.calls[0][0];
    expect(passed[0].id).toBe('origFile');
    expect(passed[0].dataURL).toContain('data:image/svg+xml;base64,');
  });

  test('bỏ qua elements không phải image', async () => {
    const { stamp, renderSpy } = makeMockStamp();
    const addFiles = jest.fn();
    const api = {
      getFiles: () => ({}),
      addFiles,
    };
    const elements = [
      { id: 'el1', type: 'rectangle', fileId: 'shouldIgnore' },
      { id: 'el2', type: 'image' /* no fileId */ },
      { id: 'el3', type: 'image', fileId: 'img1', customData: { kind: 'unknown' } },
    ];
    await restoreMissingMathStampFiles(api, elements, [stamp]);
    expect(renderSpy).not.toHaveBeenCalled();
    expect(addFiles).not.toHaveBeenCalled();
  });
});
