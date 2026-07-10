import { insertGeometryStampIntoScene } from '../insertGeometryStamp';

jest.mock('../render', () => ({
  renderGeometrySvgFromState: jest.fn().mockResolvedValue('<svg width="10" height="10"/>'),
}));

const insertStampImage = jest.fn().mockResolvedValue({ fileId: 'f1' });
jest.mock('../../shared/insertImage', () => ({
  insertStampImage: (...args: unknown[]) => insertStampImage(...args),
}));

describe('insertGeometryStampIntoScene', () => {
  beforeEach(() => {
    insertStampImage.mockClear();
  });

  test('render SVG từ jsonState rồi gọi insertStampImage', async () => {
    const api = { addFiles: jest.fn(), updateScene: jest.fn(), getSceneElements: () => [] };
    await insertGeometryStampIntoScene(api, '{"objects":{}}');

    expect(insertStampImage).toHaveBeenCalledTimes(1);
    const [passedApi, opts] = insertStampImage.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(passedApi).toBe(api);
    expect(opts.svgString).toBe('<svg width="10" height="10"/>');
    expect(opts.editingElementId).toBeNull();
  });

  test('customData mang đúng kind + jsonState để re-edit được', async () => {
    const api = { addFiles: jest.fn(), updateScene: jest.fn(), getSceneElements: () => [] };
    await insertGeometryStampIntoScene(api, '{"objects":{}}');

    const [, opts] = insertStampImage.mock.calls[0] as [unknown, { makeCustomData: () => unknown }];
    expect(opts.makeCustomData()).toEqual({
      kind: 'geometry',
      version: 1,
      jsonState: '{"objects":{}}',
    });
  });
});
