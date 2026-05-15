import { restoreMissingMathStampFiles } from '../restoreMathStampFiles';
import type { StampType } from '../../stamps/shared/types';

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
