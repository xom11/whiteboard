import { Component, useRef } from 'react';
import { act, render } from '@testing-library/react';
import { useScenePersist } from './useScenePersist';
import { readFiles, clearAll } from '../core/persistence/fileStore';
import type { BinaryFiles, ExcalidrawElement } from '../types';

// Excalidraw thật không chạy được trong jsdom (canvas + font esm.sh). useScenePersist
// chỉ cần `hashElementsVersion` từ module này khi flush scene.
jest.mock('@excalidraw/excalidraw', () => ({
  hashElementsVersion: (els: readonly { id: string }[]) => els.map((e) => e.id).join('|'),
}));

// Stamp restore không liên quan raster PDF — mock để test khỏi kéo katex/jsxgraph.
jest.mock('../stamps/shared/restoreStampFiles', () => ({
  restoreMissingStampFiles: jest.fn(async () => undefined),
}));

const STORAGE_KEY = 'wb_room1';
const PDF_FILE_ID = 'pdf_file_1';

const pdfElement = {
  id: 'pdf_el_1',
  type: 'image',
  fileId: PDF_FILE_ID,
  isDeleted: false,
} as unknown as ExcalidrawElement;

const pdfFiles = (): BinaryFiles =>
  ({
    [PDF_FILE_ID]: {
      dataURL: 'data:image/png;base64,AAA',
      mimeType: 'image/png',
      created: 1700000000000,
    },
  }) as unknown as BinaryFiles;

interface FakeApi {
  getSceneElements: () => readonly ExcalidrawElement[];
  getFiles: () => Record<string, unknown>;
  addFiles: (files: { id: string }[]) => void;
  __setElements: (els: readonly ExcalidrawElement[]) => void;
  __destroy: () => void;
  __addedFileIds: string[];
}

function createFakeApi(elements: readonly ExcalidrawElement[]): FakeApi {
  let current = elements;
  const files: Record<string, unknown> = {};
  const addedFileIds: string[] = [];
  return {
    // Excalidraw: getSceneElements() = scene.getNonDeletedElements().
    getSceneElements: () => current,
    getFiles: () => files,
    addFiles: (list) => {
      for (const f of list) {
        files[f.id] = f;
        addedFileIds.push(f.id);
      }
    },
    __setElements: (els) => {
      current = els;
    },
    // Excalidraw `App` là class component: componentWillUnmount() gọi scene.destroy()
    // → getSceneElements() trả [] TRƯỚC khi cleanup useEffect của Whiteboard chạy.
    __destroy: () => {
      current = [];
    },
    __addedFileIds: addedFileIds,
  };
}

/** Đứng đúng vị trí Excalidraw trong cây React (class con của Whiteboard). */
class FakeExcalidraw extends Component<{ api: FakeApi }> {
  componentWillUnmount() {
    this.props.api.__destroy();
  }
  render() {
    return null;
  }
}

type Tick = ReturnType<typeof useScenePersist>['onSceneTick'];

function Harness({ api, tickRef }: { api: FakeApi; tickRef: { current: Tick | null } }) {
  const apiRef = useRef(api);
  apiRef.current = api;
  const { onSceneTick } = useScenePersist({
    storageKey: STORAGE_KEY,
    readOnly: false,
    api,
    apiRef,
    stamps: [],
  });
  tickRef.current = onSceneTick;
  return <FakeExcalidraw api={api} />;
}

// useScenePersist: FILE_THROTTLE_MS=1000, PRUNE_THROTTLE_MS=2000.
const AFTER_FILE_FLUSH = 1300;
const AFTER_PRUNE = 2300;

/** Chờ throttle bắn + fake-indexeddb commit tx (macrotask). */
async function wait(ms: number) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

/** Nhường vài vòng event loop cho IDB tx phát sinh từ unmount cleanup. */
const settleIdb = () => wait(200);

jest.setTimeout(20000);

beforeEach(async () => {
  window.localStorage.clear();
  await clearAll(STORAGE_KEY);
});

describe('useScenePersist — raster (PDF) persistence', () => {
  it('ghi raster PDF vào IDB sau throttle (control: đường ghi hoạt động)', async () => {
    const api = createFakeApi([pdfElement]);
    const tickRef: { current: Tick | null } = { current: null };
    render(<Harness api={api} tickRef={tickRef} />);

    act(() => tickRef.current?.([pdfElement], {}, pdfFiles()));
    await wait(AFTER_PRUNE);

    expect(Object.keys(await readFiles(STORAGE_KEY))).toEqual([PDF_FILE_ID]);
  });

  it('GIỮ raster PDF khi Whiteboard unmount (GV chuyển chế độ)', async () => {
    const api = createFakeApi([pdfElement]);
    const tickRef: { current: Tick | null } = { current: null };
    const { unmount } = render(<Harness api={api} tickRef={tickRef} />);

    // GV import PDF: Excalidraw onChange bắn element + file mới.
    act(() => tickRef.current?.([pdfElement], {}, pdfFiles()));

    // GV chuyển sang chia sẻ màn hình / gọi HS lên bảng → Whiteboard unmount
    // trong lúc file-throttle (1s) và prune-throttle (2s) còn pending.
    unmount();
    await settleIdb();

    expect(Object.keys(await readFiles(STORAGE_KEY))).toEqual([PDF_FILE_ID]);
  });

  it('GIỮ raster PDF đã persist từ phiên trước khi unmount', async () => {
    const api = createFakeApi([pdfElement]);
    const tickRef: { current: Tick | null } = { current: null };

    // Phiên 1: import PDF + để throttle chạy xong → file nằm trong IDB.
    const first = render(<Harness api={api} tickRef={tickRef} />);
    act(() => tickRef.current?.([pdfElement], {}, pdfFiles()));
    await wait(AFTER_FILE_FLUSH);
    expect(Object.keys(await readFiles(STORAGE_KEY))).toEqual([PDF_FILE_ID]);

    // Vẽ thêm 1 nét → prune-throttle pending, rồi GV chuyển chế độ.
    act(() => tickRef.current?.([pdfElement], {}, pdfFiles()));
    first.unmount();
    await settleIdb();

    expect(Object.keys(await readFiles(STORAGE_KEY))).toEqual([PDF_FILE_ID]);
  });

  it('quay lại bảng sau khi chuyển chế độ → nạp lại file PDF vào Excalidraw', async () => {
    const tickRef: { current: Tick | null } = { current: null };

    // Phiên 1: GV import PDF rồi chuyển sang chia sẻ màn hình.
    const api1 = createFakeApi([pdfElement]);
    const first = render(<Harness api={api1} tickRef={tickRef} />);
    act(() => tickRef.current?.([pdfElement], {}, pdfFiles()));
    first.unmount();
    await settleIdb();

    // Phiên 2: GV quay lại bảng → Excalidraw mount lại (api mới, files rỗng),
    // scene đọc từ localStorage nên element PDF vẫn còn nhưng thiếu binary file.
    const api2 = createFakeApi([pdfElement]);
    render(<Harness api={api2} tickRef={tickRef} />);
    await settleIdb();

    expect(api2.__addedFileIds).toContain(PDF_FILE_ID);
    expect(api2.getFiles()[PDF_FILE_ID]).toMatchObject({
      dataURL: 'data:image/png;base64,AAA',
      mimeType: 'image/png',
    });
  });

  it('prune vẫn dọn raster của element đã bị xoá khỏi scene', async () => {
    const api = createFakeApi([pdfElement]);
    const tickRef: { current: Tick | null } = { current: null };
    render(<Harness api={api} tickRef={tickRef} />);

    act(() => tickRef.current?.([pdfElement], {}, pdfFiles()));
    await wait(AFTER_FILE_FLUSH);
    expect(Object.keys(await readFiles(STORAGE_KEY))).toEqual([PDF_FILE_ID]);

    // GV xoá trang PDF: onChange trả element isDeleted, getSceneElements() rỗng
    // → prune phải thu hồi file.
    const deleted = { ...pdfElement, isDeleted: true } as unknown as ExcalidrawElement;
    api.__setElements([]);
    act(() => tickRef.current?.([deleted], {}, pdfFiles()));
    await wait(AFTER_PRUNE);

    expect(Object.keys(await readFiles(STORAGE_KEY))).toEqual([]);
  });
});
