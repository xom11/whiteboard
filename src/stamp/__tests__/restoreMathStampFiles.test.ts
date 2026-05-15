import { restoreMissingMathStampFiles } from '../restoreMathStampFiles';
import type { StampType, StampRenderCtx } from '../registry/types';

// Mock stamp render đơn giản — trả về SVG khác theo isDark để đảm bảo
// fileId hash (= hashString(dataURL)) khác giữa light/dark.
function makeMockStamp(): {
  stamp: StampType;
  renderSpy: jest.Mock<Promise<string>, [unknown, StampRenderCtx?]>;
} {
  const renderSpy = jest.fn(async (_data: unknown, ctx?: StampRenderCtx) => {
    return ctx?.isDark
      ? '<svg width="50" height="50"><circle cx="25" cy="25" r="20" stroke="#e2e8f0"/></svg>'
      : '<svg width="50" height="50"><circle cx="25" cy="25" r="20" stroke="#0f172a"/></svg>';
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
  test('default (non-force): skip nếu fileId đã có trong api.getFiles', async () => {
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

  test('default (non-force): generate SVG cho fileId thiếu, giữ nguyên id', async () => {
    const { stamp, renderSpy } = makeMockStamp();
    const addFiles = jest.fn();
    const api = {
      getFiles: () => ({}),
      addFiles,
    };
    const elements = [
      { id: 'el1', type: 'image', fileId: 'origFile', customData: { kind: 'geometry' } },
    ];
    await restoreMissingMathStampFiles(api, elements, [stamp], { ctx: { isDark: false } });
    expect(renderSpy).toHaveBeenCalledWith(elements[0].customData, { isDark: false });
    expect(addFiles).toHaveBeenCalledTimes(1);
    const passed = addFiles.mock.calls[0][0];
    expect(passed[0].id).toBe('origFile');
  });

  test('forceRegenerate: tạo fileId MỚI cho mỗi stamp + updateScene patch element.fileId', async () => {
    const { stamp, renderSpy } = makeMockStamp();
    const addFiles = jest.fn();
    const updateScene = jest.fn();
    const initialElements = [
      { id: 'el1', type: 'image', fileId: 'oldId', customData: { kind: 'geometry' }, version: 5, versionNonce: 100 },
      { id: 'el2', type: 'rectangle' }, // non-image: phải giữ nguyên
    ];
    const api = {
      getFiles: () => ({ oldId: { id: 'oldId', dataURL: 'old' } }),
      getSceneElements: () => initialElements,
      addFiles,
      updateScene,
    };
    await restoreMissingMathStampFiles(api, initialElements, [stamp], {
      forceRegenerate: true,
      ctx: { isDark: true },
    });
    expect(renderSpy).toHaveBeenCalledWith(initialElements[0].customData, { isDark: true });
    expect(addFiles).toHaveBeenCalledTimes(1);
    const newFiles = addFiles.mock.calls[0][0];
    expect(newFiles).toHaveLength(1);
    expect(newFiles[0].id).not.toBe('oldId');
    expect(newFiles[0].dataURL).toContain('data:image/svg+xml;base64,');

    expect(updateScene).toHaveBeenCalledTimes(1);
    const updatedElements = updateScene.mock.calls[0][0].elements;
    expect(updatedElements).toHaveLength(2);
    // Image element fileId đã update sang fileId mới
    expect(updatedElements[0].fileId).toBe(newFiles[0].id);
    expect(updatedElements[0].version).toBe(6);
    expect(updatedElements[0].versionNonce).not.toBe(100);
    expect(updatedElements[0].updated).toEqual(expect.any(Number));
    // Non-image element giữ nguyên
    expect(updatedElements[1]).toEqual(initialElements[1]);
  });

  test('forceRegenerate light → dark → light: fileId quay về lần đầu (vì SVG hash deterministic)', async () => {
    const { stamp } = makeMockStamp();
    const addFiles = jest.fn();
    const updateScene = jest.fn();
    let currentElements: Array<{ id: string; type: string; fileId?: string; customData?: unknown }> = [
      { id: 'el1', type: 'image', fileId: 'startFile', customData: { kind: 'geometry' } },
    ];
    const api = {
      getFiles: () => ({}),
      getSceneElements: () => currentElements,
      addFiles,
      updateScene: jest.fn((patch) => {
        updateScene(patch);
        currentElements = patch.elements;
      }),
    };
    await restoreMissingMathStampFiles(api, currentElements, [stamp], {
      forceRegenerate: true,
      ctx: { isDark: false },
    });
    const lightFileId = currentElements[0].fileId;
    expect(lightFileId).toBeTruthy();
    expect(lightFileId).not.toBe('startFile');

    await restoreMissingMathStampFiles(api, currentElements, [stamp], {
      forceRegenerate: true,
      ctx: { isDark: true },
    });
    const darkFileId = currentElements[0].fileId;
    expect(darkFileId).not.toBe(lightFileId);

    await restoreMissingMathStampFiles(api, currentElements, [stamp], {
      forceRegenerate: true,
      ctx: { isDark: false },
    });
    const lightAgainFileId = currentElements[0].fileId;
    // Round-trip: cùng theme + cùng SVG content → fileId hash match
    expect(lightAgainFileId).toBe(lightFileId);
  });
});
