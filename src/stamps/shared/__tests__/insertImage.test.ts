import { insertStampImage } from '../insertImage';

// Mock svgToImageElement để test không phụ thuộc crypto.subtle / btoa
jest.mock('../svgToImage', () => ({
  svgToImageElement: jest.fn(async (svg: string) => ({
    dataURL: 'data:image/svg+xml;base64,FAKE',
    fileId: 'file_' + svg.length,
    width: 100,
    height: 80,
    mimeType: 'image/svg+xml' as const,
  })),
}));

function makeApiStub(initialElements: { id: string; type: string }[] = []) {
  const state = { elements: initialElements as unknown[] };
  return {
    addFiles: jest.fn(),
    getSceneElements: jest.fn(() => state.elements),
    getAppState: jest.fn(() => ({
      scrollX: 0,
      scrollY: 0,
      width: 800,
      height: 600,
      zoom: { value: 1 },
    })),
    updateScene: jest.fn(({ elements }: { elements: unknown[] }) => {
      state.elements = elements;
    }),
    _state: state,
  };
}

describe('insertStampImage', () => {
  it('tạo element mới khi không có editingElementId', async () => {
    const api = makeApiStub();
    const result = await insertStampImage(api, {
      svgString: '<svg></svg>',
      makeCustomData: (w, h) => ({ kind: 'test', w, h }),
    });

    expect(api.addFiles).toHaveBeenCalledTimes(1);
    expect(api.updateScene).toHaveBeenCalledTimes(1);
    expect(api._state.elements).toHaveLength(1);
    const inserted = api._state.elements[0] as { customData: { kind: string; w: number; h: number } };
    expect(inserted.customData).toEqual({ kind: 'test', w: 100, h: 80 });
    expect(result.elementId).toMatch(/^stamp_/);
  });

  it('update element cũ khi có editingElementId, giữ id', async () => {
    const api = makeApiStub([{ id: 'el_existing', type: 'image' }]);
    const result = await insertStampImage(api, {
      svgString: '<svg></svg>',
      makeCustomData: () => ({ kind: 'replaced' }),
      editingElementId: 'el_existing',
    });

    expect(api._state.elements).toHaveLength(1);
    const updated = api._state.elements[0] as { id: string; customData: { kind: string } };
    expect(updated.id).toBe('el_existing');
    expect(updated.customData).toEqual({ kind: 'replaced' });
    expect(result.elementId).toBe('el_existing');
  });

  it('clear selectedElementIds và croppingElementId trong updateScene', async () => {
    const api = makeApiStub();
    await insertStampImage(api, {
      svgString: '<svg></svg>',
      makeCustomData: () => ({}),
    });
    const arg = (api.updateScene as jest.Mock).mock.calls[0][0];
    expect(arg.appState).toEqual({ selectedElementIds: {}, croppingElementId: null });
  });

  it('dùng position được truyền khi tạo mới', async () => {
    const api = makeApiStub();
    await insertStampImage(api, {
      svgString: '<svg></svg>',
      makeCustomData: () => ({}),
      position: { x: 42, y: 84 },
    });
    const inserted = api._state.elements[0] as { x: number; y: number };
    expect(inserted.x).toBe(42);
    expect(inserted.y).toBe(84);
  });
});
