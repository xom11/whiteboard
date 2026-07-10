import { insertGeometryStampIntoScene } from '../insertGeometryStamp';

// Mock render nhúng CHÍNH input vào output → nếu impl hardcode svgString mà
// không gọi render, assertion (2) sẽ đỏ. Test cũ so với hằng số nên vô nghĩa.
const mockRender = jest.fn(async (json: string) => `<svg data-json='${json}'/>`);
jest.mock('../render', () => ({
  renderGeometrySvgFromState: (json: string) => mockRender(json),
}));

const mockInsertStampImage = jest.fn().mockResolvedValue({ fileId: 'f1' });
jest.mock('../../shared/insertImage', () => ({
  insertStampImage: (...args: unknown[]) => mockInsertStampImage(...args),
}));

const JSON_STATE = '{"objects":{}}';

function fakeApi() {
  return { addFiles: jest.fn(), updateScene: jest.fn(), getSceneElements: () => [] };
}

describe('insertGeometryStampIntoScene', () => {
  beforeEach(() => {
    mockRender.mockClear();
    mockInsertStampImage.mockClear();
  });

  test('render được gọi với ĐÚNG jsonState, và output của nó chảy vào insertStampImage', async () => {
    const api = fakeApi();
    await insertGeometryStampIntoScene(api, JSON_STATE);

    // (1) render thực sự được gọi, với đúng jsonState
    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(mockRender).toHaveBeenCalledWith(JSON_STATE);

    // (2) svgString là OUTPUT của render, không phải hằng số hardcode
    expect(mockInsertStampImage).toHaveBeenCalledTimes(1);
    const [passedApi, opts] = mockInsertStampImage.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(passedApi).toBe(api);
    expect(opts.svgString).toBe(`<svg data-json='${JSON_STATE}'/>`);
    expect(opts.editingElementId).toBeNull();
  });

  test('customData mang đúng kind + jsonState để re-edit được', async () => {
    await insertGeometryStampIntoScene(fakeApi(), JSON_STATE);

    const [, opts] = mockInsertStampImage.mock.calls[0] as [
      unknown,
      { makeCustomData: () => unknown },
    ];
    expect(opts.makeCustomData()).toEqual({
      kind: 'geometry',
      version: 1,
      jsonState: JSON_STATE,
    });
  });
});
