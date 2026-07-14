import { insertStampImage } from '../insertImage';

// Mock createStampFile (used internally) để test không phụ thuộc crypto.subtle / btoa.
jest.mock('../svgToStampFile', () => ({
  createStampFile: jest.fn(async (svg: string) => ({
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
      makeCustomData: () => ({ kind: 'test' }),
    });

    expect(api.addFiles).toHaveBeenCalledTimes(1);
    expect(api.updateScene).toHaveBeenCalledTimes(1);
    expect(api._state.elements).toHaveLength(1);
    const inserted = api._state.elements[0] as { customData: { kind: string } };
    expect(inserted.customData).toEqual({ kind: 'test' });
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

  it('re-edit GIỮ nguyên vị trí z (không nhảy lên đè note vẽ sau)', async () => {
    // Semantics chốt sau e2e 2026-07-14: sửa hình = edit-in-place (chuẩn
    // Excalidraw) — note GV vẽ đè lên hình phải TIẾP TỤC nằm trên sau khi
    // sửa. (v0.34.0 từng đổi sang bring-to-front do đọc ngược report — revert.)
    const api = makeApiStub([
      { id: 'el_below', type: 'freedraw' },
      { id: 'el_existing', type: 'image' },
      { id: 'note_above', type: 'freedraw' },
    ]);
    const result = await insertStampImage(api, {
      svgString: '<svg></svg>',
      makeCustomData: () => ({ kind: 'replaced' }),
      editingElementId: 'el_existing',
    });

    expect(result.elementId).toBe('el_existing');
    const ids = (api._state.elements as { id: string }[]).map((e) => e.id);
    expect(ids).toEqual(['el_below', 'el_existing', 'note_above']);
    const updated = api._state.elements[1] as { customData: { kind: string } };
    expect(updated.customData).toEqual({ kind: 'replaced' });
  });

  it('re-edit id không tồn tại → scene giữ nguyên, không chèn rác', async () => {
    const api = makeApiStub([{ id: 'el_other', type: 'image' }]);
    const result = await insertStampImage(api, {
      svgString: '<svg></svg>',
      makeCustomData: () => ({}),
      editingElementId: 'el_gone',
    });
    expect(result.elementId).toBe('el_gone');
    expect((api._state.elements as { id: string }[]).map((e) => e.id)).toEqual(['el_other']);
  });

  it('giữ size hiện tại của element khi re-edit (không reset về size SVG mới)', async () => {
    // User đã chèn rồi (có thể đã resize) → element 200×160. SVG mới render
    // natural 100×80 (cùng tỉ lệ). Re-edit KHÔNG được reset về 100×80.
    const api = makeApiStub([{ id: 'el_existing', type: 'image', width: 200, height: 160 }]);
    const result = await insertStampImage(api, {
      svgString: '<svg></svg>',
      makeCustomData: () => ({ kind: 'replaced' }),
      editingElementId: 'el_existing',
      preserveExistingSize: true,
    });
    const updated = api._state.elements[0] as { width: number; height: number };
    expect(updated.width).toBe(200);
    expect(updated.height).toBe(160);
    expect(result.width).toBe(200);
    expect(result.height).toBe(160);
  });

  it('giữ cạnh dài nhất + áp tỉ lệ mới khi re-edit đổi aspect', async () => {
    // Element cũ 300×100 (cạnh dài 300). SVG mới natural 100×80 (aspect 1.25).
    // Giữ cạnh dài 300 → scale 3 → 300×240.
    const api = makeApiStub([{ id: 'el_existing', type: 'image', width: 300, height: 100 }]);
    await insertStampImage(api, {
      svgString: '<svg></svg>',
      makeCustomData: () => ({}),
      editingElementId: 'el_existing',
      preserveExistingSize: true,
    });
    const updated = api._state.elements[0] as { width: number; height: number };
    expect(updated.width).toBe(300);
    expect(updated.height).toBe(240);
  });

  it('reset về size SVG mới khi re-edit KHÔNG preserveExistingSize (vd latex)', async () => {
    const api = makeApiStub([{ id: 'el_existing', type: 'image', width: 200, height: 160 }]);
    await insertStampImage(api, {
      svgString: '<svg></svg>',
      makeCustomData: () => ({}),
      editingElementId: 'el_existing',
    });
    const updated = api._state.elements[0] as { width: number; height: number };
    expect(updated.width).toBe(100);
    expect(updated.height).toBe(80);
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
