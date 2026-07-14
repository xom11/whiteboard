import { insertRasterizedPagesIntoScene } from '../insertPdfPages';
import type { RasterizedPage } from '../rasterize';

 
type FakeApi = any;

function makeFakeApi(): FakeApi {
  const api = {
     
    added: [] as any[],
     
    sceneElements: [] as any[],
     
    lastUpdate: null as any,
     
    addFiles(files: any[]) {
      api.added.push(...files);
    },
    getSceneElements() {
      return api.sceneElements;
    },
    getAppState() {
      return {
        scrollX: 0,
        scrollY: 0,
        width: 1000,
        height: 800,
        zoom: { value: 1 },
      };
    },
     
    updateScene(next: any) {
      api.lastUpdate = next;
      if (next.elements) api.sceneElements = next.elements;
    },
  };
  return api;
}

function makePage(pageNumber: number, width = 800, height = 1000): RasterizedPage {
  return {
    pageNumber,
    width,
    height,
    mimeType: 'image/jpeg',
    dataURL: `data:image/jpeg;base64,page${pageNumber}`,
  };
}

describe('insertRasterizedPagesIntoScene', () => {
  it('addFiles + thêm image element cho mỗi page', () => {
    const api = makeFakeApi();
    const pages = [makePage(1), makePage(2), makePage(3)];

    const result = insertRasterizedPagesIntoScene(api, pages, { scale: 2 });

    expect(api.added).toHaveLength(3);
    expect(api.added[0].mimeType).toBe('image/jpeg');
    expect(result.insertedElementIds).toHaveLength(3);
    expect(result.fileIds).toHaveLength(3);

    // Elements xuất hiện trong lastUpdate.elements
    expect(api.lastUpdate.elements).toHaveLength(3);
    expect(api.lastUpdate.elements[0].type).toBe('image');
    expect(api.lastUpdate.elements[0].fileId).toBe(api.added[0].id);
  });

  it('chia pixel cho scale → width/height scene units', () => {
    const api = makeFakeApi();
    const pages = [makePage(1, 800, 1000)];
    insertRasterizedPagesIntoScene(api, pages, { scale: 2 });
    const el = api.lastUpdate.elements[0];
    expect(el.width).toBe(400);
    expect(el.height).toBe(500);
  });

  it('xếp dọc các page cách PAGE_GAP=24', () => {
    const api = makeFakeApi();
    const pages = [makePage(1, 800, 1000), makePage(2, 800, 1000)];
    insertRasterizedPagesIntoScene(api, pages, { scale: 2 });
    const [a, b] = api.lastUpdate.elements;
    expect(b.y - (a.y + a.height)).toBe(24);
  });

  it('căn giữa các page theo trục dọc khi width khác nhau', () => {
    const api = makeFakeApi();
    const pages = [makePage(1, 400, 500), makePage(2, 800, 500)];
    insertRasterizedPagesIntoScene(api, pages, { scale: 2 });
    const [a, b] = api.lastUpdate.elements;
    // a.width = 200, b.width = 400, baseX căn theo max=400
    // a phải lệch sang phải 100 so với b
    expect(a.x - b.x).toBe(100);
  });

  it('trang PDF chèn DƯỚI ink/element cũ (tài liệu nền — không đè note GV)', () => {
    // Bug report thật (e2e 2026-07-14): GV đang note → import PDF → trang PDF
    // trắng đục đè MẤT chữ. Trang PDF = giấy nền, mực phải luôn nằm trên.
    const api = makeFakeApi();
    api.sceneElements = [
      { id: 'note1', type: 'freedraw' },
      { id: 'stamp1', type: 'image' },
    ];
    insertRasterizedPagesIntoScene(api, [makePage(1)], { scale: 2 });
    const ids = api.lastUpdate.elements.map((e: { id: string }) => e.id);
    expect(ids[0]).toMatch(/^pdf_/); // trang mới ở ĐÁY stack
    expect(ids.slice(1)).toEqual(['note1', 'stamp1']); // ink giữ nguyên thứ tự, trên PDF
  });

  it('trang PDF mới nằm TRÊN trang PDF cũ nhưng vẫn DƯỚI ink (giấy xếp chồng)', () => {
    const api = makeFakeApi();
    api.sceneElements = [
      { id: 'pdf_old_1', type: 'image' },
      { id: 'pdf_old_2', type: 'image' },
      { id: 'note1', type: 'freedraw' },
    ];
    insertRasterizedPagesIntoScene(api, [makePage(1)], { scale: 2 });
    const ids = api.lastUpdate.elements.map((e: { id: string }) => e.id);
    expect(ids[0]).toBe('pdf_old_1');
    expect(ids[1]).toBe('pdf_old_2');
    expect(ids[2]).toMatch(/^pdf_/); // trang mới ngay sau trang cũ cuối
    expect(ids[3]).toBe('note1'); // note vẫn trên cùng
  });

  it('empty pages → noop', () => {
    const api = makeFakeApi();
    const result = insertRasterizedPagesIntoScene(api, [], { scale: 2 });
    expect(result.insertedElementIds).toEqual([]);
    expect(api.added).toEqual([]);
    expect(api.lastUpdate).toBeNull();
  });

  it('throw nếu api null', () => {
    expect(() =>
       
      insertRasterizedPagesIntoScene(null as any, [makePage(1)], { scale: 2 }),
    ).toThrow(/API/);
  });

  it('respect origin override', () => {
    const api = makeFakeApi();
    insertRasterizedPagesIntoScene(api, [makePage(1, 400, 400)], {
      scale: 2,
      origin: { x: 500, y: 500 },
    });
    const el = api.lastUpdate.elements[0];
    // scene size = 200x200, page 1 center alignment: y = 500 - 100, x = 500 - 100
    expect(el.x).toBe(400);
    expect(el.y).toBe(400);
  });
});
